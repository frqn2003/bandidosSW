// src/modules/indicadores/useDashboardMetrics.ts
//
// Custom hook para el cálculo y consulta dinámica de métricas de gestión (HU-IND-01).
// Diseñado siguiendo docs/capa-de-datos-front.md:
// - Consume src/data/indicadores.ts con firmas asincrónicas y tipos del contrato.
// - Conecta los selects de filtros con los catálogos reales de materias y profesores.
// - Maneja estados de carga (cargando) y errores de contrato (ApiError).
// - Manejo de casos borde (denominador en 0 devuelve null -> "—").

"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import type {
  IndicadoresResponse,
  DashboardFiltersState,
  KPICardData,
  OpcionCatalogo,
} from "./types";
import {
  consultarIndicadores,
  obtenerMateriasFiltro,
  obtenerProfesoresFiltro,
} from "@/data/indicadores";
import { ApiError } from "@/lib/api-client";

/**
 * Obtiene el primer y último día del mes en curso en formato "yyyy-mm-dd".
 */
export function getMesEnCursoAR(): { primerDia: string; ultimoDia: string } {
  const hoy = new Date();
  const y = hoy.getFullYear();
  const m = hoy.getMonth() + 1;
  const primerDia = `${y}-${String(m).padStart(2, "0")}-01`;
  const ultimoDiaNum = new Date(y, m, 0).getDate();
  const ultimoDia = `${y}-${String(m).padStart(2, "0")}-${String(ultimoDiaNum).padStart(2, "0")}`;
  return { primerDia, ultimoDia };
}

/**
 * Valida que el rango de fechas no supere los 366 días (~12 meses).
 */
export function validarRango12Meses(desde: string, hasta: string): boolean {
  if (!desde || !hasta) return false;
  const d1 = new Date(`${desde}T00:00:00Z`);
  const d2 = new Date(`${hasta}T00:00:00Z`);
  const diffDias = (d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24);
  return diffDias >= 0 && diffDias <= 366;
}

export function useDashboardMetrics() {
  const { primerDia, ultimoDia } = useMemo(() => getMesEnCursoAR(), []);

  // Catálogos dinámicos para los selects de filtro
  const [materias, setMaterias] = useState<OpcionCatalogo[]>([]);
  const [profesores, setProfesores] = useState<OpcionCatalogo[]>([]);

  // Estado de los inputs de filtro
  const [filtros, setFiltros] = useState<DashboardFiltersState>({
    desde: primerDia,
    hasta: ultimoDia,
    materiaId: "Todas",
    profesorId: "Todos",
  });

  const [errorApi, setErrorApi] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  // Validación de fechas calculada como estado derivado (evita cascading renders en efectos)
  const errorFechas = useMemo(() => {
    if (!filtros.desde || !filtros.hasta) {
      return "Debe seleccionar una fecha de inicio y una fecha de fin.";
    }
    if (filtros.hasta < filtros.desde) {
      return "La fecha de fin no puede ser anterior a la de inicio.";
    }
    if (!validarRango12Meses(filtros.desde, filtros.hasta)) {
      return "El período seleccionado no puede superar los 12 meses (máximo 366 días).";
    }
    return null;
  }, [filtros.desde, filtros.hasta]);

  const errorValidacion = errorFechas || errorApi;

  // Estado de las métricas obtenidas
  const [metricas, setMetricas] = useState<IndicadoresResponse>({
    periodo: { desde: primerDia, hasta: ultimoDia },
    turnosGenerados: 0,
    porcentajeCancelaciones: null,
    porcentajeOcupacion: null,
    alumnosActivos: 0,
    altasAlumnos: 0,
    ingresosCobrados: 0,
    turnosPorSemana: [],
    rankingMateriasMasPedidas: [],
    rankingMateriasMayorIngreso: [],
    sinDatos: false,
  });

  // 1. Cargar catálogos iniciales de materias y profesores desde la capa de datos
  useEffect(() => {
    let activo = true;
    async function cargarCatalogos() {
      // BACKEND: se alimenta de GET /api/materias y GET /api/profesores
      const [mats, profs] = await Promise.all([
        obtenerMateriasFiltro(),
        obtenerProfesoresFiltro(),
      ]);
      if (activo) {
        setMaterias(mats);
        setProfesores(profs);
      }
    }
    cargarCatalogos();
    return () => {
      activo = false;
    };
  }, []);

  // 2. Si se selecciona una materia, filtrar dinámicamente los profesores que la dictan
  useEffect(() => {
    let activo = true;
    async function actualizarProfesoresPorMateria() {
      // BACKEND: GET /api/profesores?materiaId=...
      const profs = await obtenerProfesoresFiltro(
        filtros.materiaId !== "Todas" ? filtros.materiaId : undefined
      );
      if (activo) {
        setProfesores(profs);
      }
    }
    actualizarProfesoresPorMateria();
    return () => {
      activo = false;
    };
  }, [filtros.materiaId]);

  // 3. Ejecutar consulta de indicadores AUTOMÁTICAMENTE ante cualquier cambio de filtro válido
  useEffect(() => {
    if (errorFechas) return;
    let activo = true;

    // Debounce para evitar ráfagas de consultas mientras el usuario interactúa
    const timer = setTimeout(async () => {
      setCargando(true);
      setErrorApi(null);
      try {
        // BACKEND: GET /api/indicadores?desde=...&hasta=...
        const resultado = await consultarIndicadores({
          desde: filtros.desde,
          hasta: filtros.hasta,
          materiaId: filtros.materiaId !== "Todas" ? filtros.materiaId : undefined,
          profesorId: filtros.profesorId !== "Todos" ? filtros.profesorId : undefined,
        });
        if (activo) {
          setMetricas(resultado);
        }
      } catch (err) {
        if (activo) {
          if (err instanceof ApiError) {
            setErrorApi(err.message);
          } else {
            setErrorApi("No se pudieron cargar los indicadores del período.");
          }
        }
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }, 200);

    return () => {
      activo = false;
      clearTimeout(timer);
    };
  }, [filtros.desde, filtros.hasta, filtros.materiaId, filtros.profesorId, errorFechas]);

  /**
   * Actualiza el valor de un filtro individual con reseteo de error previo
   * y reseteo de profesor si cambia la materia.
   */
  const setFiltro = useCallback(
    <K extends keyof DashboardFiltersState>(campo: K, valor: DashboardFiltersState[K]) => {
      setFiltros((prev) => {
        if (campo === "materiaId") {
          return {
            ...prev,
            materiaId: valor as number | "Todas",
            profesorId: "Todos",
          };
        }
        return { ...prev, [campo]: valor };
      });
      setErrorApi(null);
    },
    []
  );

  /**
   * Validador manual de filtros para compatibilidad o reintentos.
   */
  const aplicarFiltros = useCallback(() => {
    setErrorApi(null);
    return !errorFechas;
  }, [errorFechas]);

  /**
   * Restablece los filtros al mes en curso sin filtros de materia ni profesor.
   */
  const limpiarFiltros = useCallback(() => {
    const { primerDia: p, ultimoDia: u } = getMesEnCursoAR();
    setFiltros({
      desde: p,
      hasta: u,
      materiaId: "Todas",
      profesorId: "Todos",
    });
    setErrorApi(null);
  }, []);

  /**
   * Tarjetas estructuradas con fórmulas matemáticas y tooltips explicativos.
   */
  const kpiCards: KPICardData[] = useMemo(() => {
    const formateadorMoneda = new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    });

    return [
      {
        id: "turnosGenerados",
        titulo: "Turnos generados",
        valorFormateado: metricas.turnosGenerados.toLocaleString("es-AR"),
        subtitulo: "En el período seleccionado",
        formula: "Total de turnos creados (incluye cancelados)",
        explicacion:
          "Suma la totalidad de clases programadas en el período seleccionado, independientemente de si se realizaron o cancelaron.",
        icono: "calendar_month",
        colorAcento: "primary",
      },
      {
        id: "porcentajeCancelaciones",
        titulo: "% de cancelaciones",
        valorFormateado:
          metricas.porcentajeCancelaciones !== null
            ? `${metricas.porcentajeCancelaciones.toFixed(1)}%`
            : "—",
        subtitulo:
          metricas.turnosGenerados === 0
            ? "Sin turnos registrados"
            : undefined,
        formula: "(Turnos Cancelados / Turnos Generados) × 100",
        explicacion:
          "Proporción de turnos que no llegaron a dictarse por cancelación sobre el total generado en el período. Si no hay turnos, se muestra '—'.",
        icono: "event_busy",
        colorAcento: "warning",
      },
      {
        id: "porcentajeOcupacion",
        titulo: "% de ocupación",
        valorFormateado:
          metricas.porcentajeOcupacion !== null
            ? `${metricas.porcentajeOcupacion.toFixed(1)}%`
            : "—",
        subtitulo: "Sobre horas disponibles",
        formula: "(Horas de turnos no cancelados / Horas ofertadas en agendas) × 100",
        explicacion:
          "Mide el aprovechamiento real de la capacidad horaria ofertada por los profesores. Si no hay disponibilidad registrada en las agendas, muestra '—'.",
        icono: "trending_up",
        colorAcento: "info",
      },
      {
        id: "alumnosActivos",
        titulo: "Alumnos activos",
        valorFormateado: metricas.alumnosActivos.toLocaleString("es-AR"),
        subtitulo: `+${metricas.altasAlumnos} altas en el período`,
        formula: "Total alumnos con estado 'activo' a la fecha",
        explicacion:
          "Métrica global del centro académico a la fecha actual. No varía con los filtros de Materia o Profesor.",
        icono: "school",
        colorAcento: "success",
        esGlobal: true,
      },
      {
        id: "ingresosCobrados",
        titulo: "Ingresos cobrados",
        valorFormateado: formateadorMoneda.format(metricas.ingresosCobrados),
        subtitulo: "Cobros registrados",
        formula: "Suma de todos los pagos de clases registrados en el período",
        explicacion:
          "Monto total en pesos percibido efectivamente por el centro académico durante el rango de fechas seleccionado.",
        icono: "payments",
        colorAcento: "success",
      },
    ];
  }, [metricas]);

  /**
   * Simulación de exportación a PDF.
   */
  const exportarPDF = useCallback(() => {
    // BACKEND: invocar generador o endpoint de PDF de reportes cuando exista
    window.print();
  }, []);

  return {
    // Filtros y estados
    filtros,
    filtrosAplicados: filtros,
    cargando,
    errorValidacion,
    setFiltro,
    aplicarFiltros,
    limpiarFiltros,

    // Catálogos dinámicos
    materias,
    profesores,

    // Datos analíticos calculados
    metricas,
    kpiCards,

    // Acciones
    exportarPDF,
  };
}
