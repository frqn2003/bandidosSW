// src/modules/calendario/useCalendar.ts
//
// Hook de estado y lógica de negocio para el Calendario de Turnos (HU-CAL-02).
// Maneja:
//  · Vistas (Día, Semana predeterminada, Mes).
//  · Navegación temporal (Hoy, Anterior, Siguiente, Salto a fecha específica).
//  · Filtros combinables (Profesor, Materia, Ver cancelados, Solo con cupo).
//  · Simulación de tiempo real (polling silencioso cada 30s + contador "actualizado hace X s").
//  · Selección de turno y apertura de panel lateral de detalle.
//  · Reprogramación de turnos (Drag & Drop) con flujo de confirmación.
//  · Cancelación y modificación de turnos respetando reglas de negocio.

"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import type {
  TurnoCalendario,
  ProfesorCalendario,
  MateriaCalendario,
  VistaCalendario,
  FiltrosCalendario,
  DiaResumenMes,
  ColumnaProfesorDia,
  ReprogramarTurnoData,
} from "./types";
import {
  MOCK_PROFESORES,
  MOCK_MATERIAS,
  MOCK_TURNOS_INICIALES,
} from "./mock-data";

export interface UseCalendarOptions {
  vistaInicial?: VistaCalendario;
  fechaInicial?: string; // "yyyy-mm-dd"
  profesorIdInicial?: number;
  materiaIdInicial?: number;
}

export function useCalendar(options: UseCalendarOptions = {}) {
  // ─── 1. Estado principal ────────────────────────────────────────────────
  const [vista, setVista] = useState<VistaCalendario>(options.vistaInicial ?? "semana");
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>(
    options.fechaInicial ?? "2026-09-28" // Lunes 28 de septiembre 2026 (según wireframes)
  );

  const [filtros, setFiltros] = useState<FiltrosCalendario>({
    profesorId: options.profesorIdInicial,
    materiaId: options.materiaIdInicial,
    verCancelados: false, // Ocultos por defecto (requisito HU-CAL-02)
    soloConCupo: false,
  });

  const [turnos, setTurnos] = useState<TurnoCalendario[]>(MOCK_TURNOS_INICIALES);
  const [profesores] = useState<ProfesorCalendario[]>(MOCK_PROFESORES);
  const [materias] = useState<MateriaCalendario[]>(MOCK_MATERIAS);

  const [turnoSeleccionado, setTurnoSeleccionado] = useState<TurnoCalendario | null>(null);
  const [reprogramacionPendiente, setReprogramacionPendiente] = useState<ReprogramarTurnoData | null>(null);

  // ─── 2. Simulación de Tiempo Real (Polling 30s + contador de segundos) ──
  const [segundosActualizado, setSegundosActualizado] = useState<number>(3);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Incremento de contador de segundos transcurridos
  useEffect(() => {
    const timer = setInterval(() => {
      setSegundosActualizado((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Polling silencioso cada 30 segundos (simula actualización de datos en segundo plano)
  useEffect(() => {
    const pollInterval = setInterval(() => {
      setIsRefreshing(true);
      // Simula sincronización silenciosa con backend
      setTimeout(() => {
        setSegundosActualizado(0);
        setIsRefreshing(false);
      }, 300);
    }, 30000);

    return () => clearInterval(pollInterval);
  }, []);

  const refrescarManualmente = useCallback(() => {
    setIsRefreshing(true);
    setTimeout(() => {
      setSegundosActualizado(0);
      setIsRefreshing(false);
    }, 200);
  }, []);

  // ─── 3. Setters de filtros ──────────────────────────────────────────────
  const setProfesorFiltro = useCallback((profesorId?: number) => {
    setFiltros((prev) => ({ ...prev, profesorId }));
  }, []);

  const setMateriaFiltro = useCallback((materiaId?: number) => {
    setFiltros((prev) => ({ ...prev, materiaId }));
  }, []);

  const toggleVerCancelados = useCallback(() => {
    setFiltros((prev) => ({ ...prev, verCancelados: !prev.verCancelados }));
  }, []);

  const toggleSoloConCupo = useCallback(() => {
    setFiltros((prev) => ({ ...prev, soloConCupo: !prev.soloConCupo }));
  }, []);

  // ─── 4. Filtrado de Turnos ──────────────────────────────────────────────
  const turnosFiltrados = useMemo(() => {
    return turnos.filter((t) => {
      // Filtro Profesor
      if (filtros.profesorId !== undefined && t.profesor.id !== filtros.profesorId) {
        return false;
      }
      // Filtro Materia
      if (filtros.materiaId !== undefined && t.materia.id !== filtros.materiaId) {
        return false;
      }
      // Filtro Cancelados: Ocultos salvo que verCancelados esté activo
      if (!filtros.verCancelados && t.estado === "Cancelado") {
        return false;
      }
      return true;
    });
  }, [turnos, filtros]);

  // ─── 5. Helpers de Fechas y Rangos ──────────────────────────────────────
  // Lunes de la semana que contiene `fechaSeleccionada`
  const fechaLunesSemana = useMemo(() => {
    const d = new Date(`${fechaSeleccionada}T00:00:00`);
    const day = d.getDay(); // 0 es domingo
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split("T")[0];
  }, [fechaSeleccionada]);

  // Lista de 6 días de la semana (Lunes a Sábado, el domingo no se dictan clases)
  const diasSemana = useMemo(() => {
    const lista: { fecha: string; nombreDia: string; numeroDia: number; esHoy: boolean }[] = [];
    const base = new Date(`${fechaLunesSemana}T00:00:00`);
    const nombres = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];

    for (let i = 0; i < 6; i++) {
      const current = new Date(base);
      current.setDate(base.getDate() + i);
      const iso = current.toISOString().split("T")[0];
      lista.push({
        fecha: iso,
        nombreDia: nombres[i],
        numeroDia: current.getDate(),
        esHoy: iso === "2026-09-28", // Fecha de referencia de la app
      });
    }
    return lista;
  }, [fechaLunesSemana]);

  // ─── 6. Turnos por Día y Columnas por Profesor (para DayView) ───────────
  const columnasDia = useMemo((): ColumnaProfesorDia[] => {
    const turnosDelDia = turnosFiltrados.filter((t) => t.fecha === fechaSeleccionada);
    
    // Profesores a mostrar (todos o el seleccionado)
    const profesoresVisibles = filtros.profesorId
      ? profesores.filter((p) => p.id === filtros.profesorId)
      : profesores;

    return profesoresVisibles.map((prof) => {
      const turnosProf = turnosDelDia.filter((t) => t.profesor.id === prof.id);
      return {
        profesor: prof,
        turnos: turnosProf,
        turnosCount: turnosProf.length,
        franjasLibres: [
          { horaInicio: "09:00", horaFin: "10:00" },
          { horaInicio: "10:00", horaFin: "11:00" },
          { horaInicio: "11:00", horaFin: "12:00" },
          { horaInicio: "12:00", horaFin: "13:00" },
          { horaInicio: "14:00", horaFin: "15:00" },
          { horaInicio: "15:00", horaFin: "16:00" },
        ].filter(
          (franja) => !turnosProf.some((t) => t.horaInicio === franja.horaInicio && t.estado === "Reservado")
        ),
      };
    });
  }, [turnosFiltrados, fechaSeleccionada, filtros.profesorId, profesores]);

  // ─── 7. Resumen Mensual (para MonthView) ─────────────────────────────────
  const diasMes = useMemo((): DiaResumenMes[] => {
    const [yearStr, monthStr] = fechaSeleccionada.split("-");
    const anio = parseInt(yearStr, 10);
    const mesIndex = parseInt(monthStr, 10) - 1; // 0-indexed

    const primerDia = new Date(anio, mesIndex, 1);
    const ultimoDia = new Date(anio, mesIndex + 1, 0);
    const totalDias = ultimoDia.getDate();

    // Días de relleno previo para que la grilla empiece en Lunes
    const primerDiaSemana = primerDia.getDay(); // 0 domingo, 1 lunes...
    const offsetInicio = primerDiaSemana === 0 ? 6 : primerDiaSemana - 1;

    const lista: DiaResumenMes[] = [];

    // Helper reactivo que calcula el resumen de un día a partir de turnosFiltrados
    const obtenerResumenDia = (iso: string, numeroDia: number, esMesActual: boolean): DiaResumenMes => {
      const turnosEnFecha = turnosFiltrados.filter((t) => t.fecha === iso);
      const uniqueMateriasMap = new Map<number, { materiaId: number; color: string; nombre: string }>();

      turnosEnFecha.forEach((t) => {
        if (!uniqueMateriasMap.has(t.materia.id)) {
          const mat = materias.find((m) => m.id === t.materia.id);
          uniqueMateriasMap.set(t.materia.id, {
            materiaId: t.materia.id,
            color: mat?.color ?? "#2563eb",
            nombre: t.materia.nombre,
          });
        }
      });

      return {
        fecha: iso,
        numeroDia,
        esMesActual,
        esHoy: iso === "2026-09-28",
        cantidadTurnos: turnosEnFecha.length,
        materiasConTurnos: Array.from(uniqueMateriasMap.values()),
      };
    };

    // Relleno días mes anterior (ej. 31 de agosto)
    const ultimoDiaMesAnterior = new Date(anio, mesIndex, 0).getDate();
    for (let i = offsetInicio - 1; i >= 0; i--) {
      const num = ultimoDiaMesAnterior - i;
      const mAnt = mesIndex === 0 ? 12 : mesIndex;
      const yAnt = mesIndex === 0 ? anio - 1 : anio;
      const iso = `${yAnt}-${String(mAnt).padStart(2, "0")}-${String(num).padStart(2, "0")}`;
      lista.push(obtenerResumenDia(iso, num, false));
    }

    // Días del mes corriente
    for (let dia = 1; dia <= totalDias; dia++) {
      const iso = `${anio}-${String(mesIndex + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
      lista.push(obtenerResumenDia(iso, dia, true));
    }

    // Relleno días mes siguiente para completar la cuadrícula de 35 o 42 celdas
    const resto = lista.length % 7;
    if (resto > 0) {
      const faltan = 7 - resto;
      const mSig = mesIndex === 11 ? 1 : mesIndex + 2;
      const ySig = mesIndex === 11 ? anio + 1 : anio;
      for (let s = 1; s <= faltan; s++) {
        const iso = `${ySig}-${String(mSig).padStart(2, "0")}-${String(s).padStart(2, "0")}`;
        lista.push(obtenerResumenDia(iso, s, false));
      }
    }

    return lista;
  }, [fechaSeleccionada, turnosFiltrados, materias]);

  // ─── 8. Navegación temporal ─────────────────────────────────────────────
  const irAHoy = useCallback(() => {
    setFechaSeleccionada("2026-09-28");
  }, []);

  const anterior = useCallback(() => {
    const d = new Date(`${fechaSeleccionada}T00:00:00`);
    if (vista === "dia") {
      d.setDate(d.getDate() - 1);
      // Saltear domingo al ir hacia atrás
      if (d.getDay() === 0) d.setDate(d.getDate() - 1);
    } else if (vista === "semana") {
      d.setDate(d.getDate() - 7);
    } else if (vista === "mes") {
      d.setMonth(d.getMonth() - 1);
    }
    setFechaSeleccionada(d.toISOString().split("T")[0]);
  }, [fechaSeleccionada, vista]);

  const siguiente = useCallback(() => {
    const d = new Date(`${fechaSeleccionada}T00:00:00`);
    if (vista === "dia") {
      d.setDate(d.getDate() + 1);
      // Saltear domingo al ir hacia adelante
      if (d.getDay() === 0) d.setDate(d.getDate() + 1);
    } else if (vista === "semana") {
      d.setDate(d.getDate() + 7);
    } else if (vista === "mes") {
      d.setMonth(d.getMonth() + 1);
    }
    setFechaSeleccionada(d.toISOString().split("T")[0]);
  }, [fechaSeleccionada, vista]);

  const cambiarVista = useCallback((nuevaVista: VistaCalendario) => {
    setVista(nuevaVista);
  }, []);

  const seleccionarFecha = useCallback((fecha: string) => {
    setFechaSeleccionada(fecha);
  }, []);

  // ─── 9. Título formateado de la cabecera ─────────────────────────────────
  const tituloPeriodo = useMemo(() => {
    const [y, m, d] = fechaSeleccionada.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);

    if (vista === "dia") {
      const diasSemanaNombres = [
        "Domingo",
        "Lunes",
        "Martes",
        "Miércoles",
        "Jueves",
        "Viernes",
        "Sábado",
      ];
      const mesesNombres = [
        "enero", "febrero", "marzo", "abril", "mayo", "junio",
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
      ];
      return `${diasSemanaNombres[dateObj.getDay()]} ${d} de ${mesesNombres[m - 1]}`;
    }

    if (vista === "semana") {
      const lunes = new Date(`${fechaLunesSemana}T00:00:00`);
      const sabado = new Date(lunes);
      sabado.setDate(lunes.getDate() + 5);

      const mesesCortos = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
      const mesLunes = mesesCortos[lunes.getMonth()];
      const mesSabado = mesesCortos[sabado.getMonth()];

      if (lunes.getMonth() === sabado.getMonth()) {
        return `${lunes.getDate()} – ${sabado.getDate()} ${mesLunes} ${sabado.getFullYear()}`;
      }
      return `${lunes.getDate()} ${mesLunes} – ${sabado.getDate()} ${mesSabado} ${sabado.getFullYear()}`;
    }

    // Mes
    const mesesCompletos = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    return `${mesesCompletos[m - 1]} ${y}`;
  }, [vista, fechaSeleccionada, fechaLunesSemana]);

  // ─── 10. Acciones sobre Turnos (Selección, Reprogramar, Cancelar) ────────
  const seleccionarTurno = useCallback((turno: TurnoCalendario) => {
    setTurnoSeleccionado(turno);
  }, []);

  const cerrarDetalle = useCallback(() => {
    setTurnoSeleccionado(null);
  }, []);

  /**
   * Disparado al soltar un turno en Drag and Drop en una nueva fecha/hora/profesor.
   * Abre el modal de confirmación con los campos modificados antes de aplicar el cambio.
   */
  const iniciarReprogramacion = useCallback(
    (
      turnoId: number,
      nuevaFecha: string,
      nuevaHoraInicio: string,
      nuevoProfesorId: number
    ) => {
      const turnoActual = turnos.find((t) => t.id === turnoId);
      const nuevoProf = profesores.find((p) => p.id === nuevoProfesorId);
      if (!turnoActual || !nuevoProf) return;

      // Calcula hora fin sumando la duración de la materia
      const [h, min] = nuevaHoraInicio.split(":").map(Number);
      const duracion = turnoActual.materia.duracionClaseMinutos ?? 60;
      const minFin = h * 60 + min + duracion;
      const hFin = String(Math.floor(minFin / 60)).padStart(2, "0");
      const mFin = String(minFin % 60).padStart(2, "0");
      const nuevaHoraFin = `${hFin}:${mFin}`;

      setReprogramacionPendiente({
        turno: turnoActual,
        fechaNueva: nuevaFecha,
        horaInicioNueva: nuevaHoraInicio,
        horaFinNueva: nuevaHoraFin,
        profesorNuevo: {
          id: nuevoProf.id,
          nombre: nuevoProf.nombre,
          apellido: nuevoProf.apellido,
        },
        fechaAnterior: turnoActual.fecha,
        horaInicioAnterior: turnoActual.horaInicio,
        profesorAnterior: {
          id: turnoActual.profesor.id,
          nombre: turnoActual.profesor.nombre,
          apellido: turnoActual.profesor.apellido,
        },
      });
    },
    [turnos, profesores]
  );

  const confirmarReprogramacion = useCallback(() => {
    if (!reprogramacionPendiente) return;
    const { turno, fechaNueva, horaInicioNueva, horaFinNueva, profesorNuevo } =
      reprogramacionPendiente;

    setTurnos((prev) =>
      prev.map((t) => {
        if (t.id !== turno.id) return t;
        return {
          ...t,
          fecha: fechaNueva,
          horaInicio: horaInicioNueva,
          horaFin: horaFinNueva,
          profesor: {
            id: profesorNuevo.id,
            nombre: profesorNuevo.nombre,
            apellido: profesorNuevo.apellido,
          },
          cantidadModificaciones: (t.cantidadModificaciones ?? 0) + 1,
        };
      })
    );

    // Si el turno modificado estaba abierto en el detalle, se actualiza
    setTurnoSeleccionado((prev) => {
      if (prev?.id === turno.id) {
        return {
          ...prev,
          fecha: fechaNueva,
          horaInicio: horaInicioNueva,
          horaFin: horaFinNueva,
          profesor: profesorNuevo,
          cantidadModificaciones: (prev.cantidadModificaciones ?? 0) + 1,
        };
      }
      return prev;
    });

    setReprogramacionPendiente(null);
  }, [reprogramacionPendiente]);

  const cancelarReprogramacion = useCallback(() => {
    setReprogramacionPendiente(null);
  }, []);

  const cancelarTurno = useCallback((turnoId: number, motivo?: string) => {
    setTurnos((prev) =>
      prev.map((t) => {
        if (t.id !== turnoId) return t;
        return {
          ...t,
          estado: "Cancelado",
          puedeModificar: false,
          puedeCancelar: false,
          observaciones: motivo ?? t.observaciones,
        };
      })
    );
    setTurnoSeleccionado((prev) => {
      if (prev?.id === turnoId) {
        return {
          ...prev,
          estado: "Cancelado",
          puedeModificar: false,
          puedeCancelar: false,
          observaciones: motivo ?? prev.observaciones,
        };
      }
      return prev;
    });
  }, []);

  return {
    // Estado y filtros
    vista,
    fechaSeleccionada,
    filtros,
    tituloPeriodo,
    segundosActualizado,
    isRefreshing,

    // Colecciones y datos
    profesores,
    materias,
    turnos: turnosFiltrados,
    totalTurnosFiltrados: turnosFiltrados.length,

    // Vistas derivadas
    diasSemana,
    columnasDia,
    diasMes,

    // Selección y paneles
    turnoSeleccionado,
    reprogramacionPendiente,

    // Navegación
    cambiarVista,
    seleccionarFecha,
    irAHoy,
    anterior,
    siguiente,
    refrescarManualmente,

    // Modificadores de filtro
    setProfesorFiltro,
    setMateriaFiltro,
    toggleVerCancelados,
    toggleSoloConCupo,

    // Acciones de turno
    seleccionarTurno,
    cerrarDetalle,
    iniciarReprogramacion,
    confirmarReprogramacion,
    cancelarReprogramacion,
    cancelarTurno,
  };
}
