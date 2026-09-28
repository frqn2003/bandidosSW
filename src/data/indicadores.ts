// src/data/indicadores.ts
//
// Capa de datos de Indicadores y Tableros (HU-IND-01).
// Consume o simula los endpoints de la API mediante el cliente HTTP tipado con el contrato.
// Contrato: src/contracts/indicadores.ts · Guía de uso: docs/contratos/indicadores.md
//
// Diseñado siguiendo docs/capa-de-datos-front.md:
// - Los componentes y hooks consumen estas funciones asincrónicas.
// - Cada llamada incluye el comentario // BACKEND: con el endpoint y formato de query params.
// - Permite actualizar los filtros de materias y profesores desde la base de datos real.

import {
  RUTA,
  type IndicadoresQuery,
  type IndicadoresResponse,
  type ErrorIndicadores,
} from "@/contracts/indicadores";
import { apiGet, ApiError } from "@/lib/api-client";
import { listarMaterias } from "@/data/materias";
import { listarProfesores } from "@/data/profesores";
import type { OpcionCatalogo } from "@/modules/indicadores/types";
import {
  MOCK_TURNOS,
  MOCK_DISPONIBILIDAD,
  MOCK_ALUMNOS,
  MOCK_PAGOS,
  CATALOGO_MATERIAS_MOCK,
  CATALOGO_PROFESORES_MOCK,
} from "@/modules/indicadores/mock-data";

export { RUTA };
export type { IndicadoresQuery, IndicadoresResponse, ErrorIndicadores };

const DEMORA_MS = 250;
const demorar = () => new Promise((r) => setTimeout(r, DEMORA_MS));

/**
 * Consulta los indicadores analíticos de gestión para el período y filtros seleccionados.
 *
 * BACKEND: cuando el endpoint esté listo, reemplaza la lógica en memoria por:
 * return apiGet<IndicadoresResponse>(`${RUTA}?${new URLSearchParams(sp)}`);
 */
export async function consultarIndicadores(
  filtros: IndicadoresQuery
): Promise<IndicadoresResponse> {
  const { desde, hasta, materiaId, profesorId } = filtros;

  // Validación de contrato (misma que ejecutará el backend con Zod)
  if (hasta < desde) {
    throw new ApiError(
      "RANGO_INVALIDO",
      "La fecha de fin no puede ser anterior a la de inicio.",
      "hasta",
      422
    );
  }

  const d1 = new Date(`${desde}T00:00:00Z`);
  const d2 = new Date(`${hasta}T00:00:00Z`);
  const diffDias = (d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDias > 366) {
    throw new ApiError(
      "RANGO_MAXIMO_EXCEDIDO",
      "El período seleccionado no puede superar los 12 meses.",
      "hasta",
      422
    );
  }

  // Intento de conexión al backend real si existe la ruta activa
  try {
    const params = new URLSearchParams();
    if (desde) params.set("desde", desde);
    if (hasta) params.set("hasta", hasta);
    if (materiaId) params.set("materiaId", String(materiaId));
    if (profesorId) params.set("profesorId", String(profesorId));

    // BACKEND: endpoint real GET /api/indicadores
    return await apiGet<IndicadoresResponse>(`${RUTA}?${params.toString()}`);
  } catch {
    // Fallback reactivo con el motor de cálculo analítico sobre el fixture
    await demorar();
    return calcularMetricasEnMemoria(filtros);
  }
}

/**
 * Carga el catálogo de materias activas para el select de filtros.
 * Se actualiza desde la API real de materias.
 *
 * BACKEND: GET /api/materias?estado=activo
 */
export async function obtenerMateriasFiltro(): Promise<OpcionCatalogo[]> {
  try {
    // BACKEND: consume listarMaterias() de src/data/materias.ts
    const materias = await listarMaterias({ estado: "activo" });
    if (materias && materias.length > 0) {
      return materias.map((m) => ({ id: m.id, nombre: m.nombre }));
    }
  } catch {
    // Fallback a catálogo inicial
  }
  return CATALOGO_MATERIAS_MOCK;
}

/**
 * Carga el catálogo de profesores activos para el select de filtros.
 * Si se especifica una materia, filtra los docentes que dictan dicha materia.
 *
 * BACKEND: GET /api/profesores?estado=activo&materiaId=...
 */
export async function obtenerProfesoresFiltro(materiaId?: number): Promise<OpcionCatalogo[]> {
  try {
    // BACKEND: consume listarProfesores() de src/data/profesores.ts
    const profesores = await listarProfesores({
      estado: "activo",
      materiaId: materiaId || undefined,
    });
    if (profesores && profesores.length > 0) {
      return profesores.map((p) => ({
        id: p.id,
        nombre: `${p.usuario.nombre} ${p.usuario.apellido}`,
      }));
    }
  } catch {
    // Fallback a catálogo inicial
  }
  return CATALOGO_PROFESORES_MOCK;
}

/**
 * Motor de cálculo analítico de respaldo mientras el backend finaliza el servicio SQL.
 */
function calcularMetricasEnMemoria(filtros: IndicadoresQuery): IndicadoresResponse {
  const { desde, hasta, materiaId, profesorId } = filtros;

  const turnosFiltrados = MOCK_TURNOS.filter((t) => {
    const enRango = t.fecha >= desde && t.fecha <= hasta;
    if (!enRango) return false;
    if (materiaId && t.materiaId !== materiaId) return false;
    if (profesorId && t.profesorId !== profesorId) return false;
    return true;
  });

  const dispFiltrada = MOCK_DISPONIBILIDAD.filter((d) => {
    const enRango = d.fecha >= desde && d.fecha <= hasta;
    if (!enRango) return false;
    if (profesorId && d.profesorId !== profesorId) return false;
    return true;
  });

  const pagosFiltrados = MOCK_PAGOS.filter((p) => {
    const enRango = p.fechaPago >= desde && p.fechaPago <= hasta;
    if (!enRango) return false;
    if (materiaId && p.materiaId !== materiaId) return false;
    if (profesorId && p.profesorId !== profesorId) return false;
    return true;
  });

  const turnosGenerados = turnosFiltrados.length;
  const turnosCancelados = turnosFiltrados.filter((t) => t.estado === "Cancelado").length;
  const porcentajeCancelaciones =
    turnosGenerados > 0
      ? Number(((turnosCancelados / turnosGenerados) * 100).toFixed(2))
      : null;

  const horasNoCanceladas = turnosFiltrados
    .filter((t) => t.estado !== "Cancelado")
    .reduce((sum, t) => sum + t.duracionHoras, 0);

  const horasDisponibles = dispFiltrada.reduce((sum, d) => sum + d.horasDisponibles, 0);
  const porcentajeOcupacion =
    horasDisponibles > 0
      ? Number(((horasNoCanceladas / horasDisponibles) * 100).toFixed(2))
      : null;

  // Globales (no afectadas por filtros de materia o profesor)
  const alumnosActivos = MOCK_ALUMNOS.filter((a) => a.estado === "activo").length;
  const altasAlumnos = MOCK_ALUMNOS.filter(
    (a) => a.fechaAlta >= desde && a.fechaAlta <= hasta
  ).length;

  const ingresosCobrados = pagosFiltrados.reduce((sum, p) => sum + p.monto, 0);

  // Semanas
  const semanasMap = new Map<string, number>();
  turnosFiltrados.forEach((t) => {
    const d = new Date(`${t.fecha}T00:00:00`);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const lunes = new Date(d.setDate(diff));
    const y = lunes.getFullYear();
    const m = String(lunes.getMonth() + 1).padStart(2, "0");
    const dia = String(lunes.getDate()).padStart(2, "0");
    const inicioSemana = `${y}-${m}-${dia}`;
    semanasMap.set(inicioSemana, (semanasMap.get(inicioSemana) || 0) + 1);
  });

  const turnosPorSemana = Array.from(semanasMap.entries())
    .map(([fechaInicio, cantidad]) => {
      const [, m, d] = fechaInicio.split("-");
      return {
        fechaInicio,
        etiquetaSemana: `Semana del ${d}/${m}`,
        cantidad,
      };
    })
    .sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio));

  // Top 5 Demanda
  const demandaMap = new Map<number, { nombre: string; turnos: number; horas: number }>();
  turnosFiltrados.forEach((t) => {
    const actual = demandaMap.get(t.materiaId) || { nombre: t.materiaNombre, turnos: 0, horas: 0 };
    demandaMap.set(t.materiaId, {
      nombre: t.materiaNombre,
      turnos: actual.turnos + 1,
      horas: actual.horas + (t.estado !== "Cancelado" ? t.duracionHoras : 0),
    });
  });

  const rankingMateriasMasPedidas = Array.from(demandaMap.entries())
    .map(([materiaId, data]) => ({
      materiaId,
      materiaNombre: data.nombre,
      turnos: data.turnos,
      horasDictadas: Number(data.horas.toFixed(1)),
    }))
    .sort((a, b) => b.turnos - a.turnos || b.horasDictadas - a.horasDictadas)
    .slice(0, 5);

  // Top 5 Ingresos
  const ingresosMap = new Map<number, { nombre: string; ingresos: number; turnos: number }>();
  pagosFiltrados.forEach((p) => {
    const materiaNombre =
      CATALOGO_MATERIAS_MOCK.find((m) => m.id === p.materiaId)?.nombre ?? `Materia ${p.materiaId}`;
    const actual = ingresosMap.get(p.materiaId) || { nombre: materiaNombre, ingresos: 0, turnos: 0 };
    ingresosMap.set(p.materiaId, {
      nombre: materiaNombre,
      ingresos: actual.ingresos + p.monto,
      turnos: actual.turnos + 1,
    });
  });

  const rankingMateriasMayorIngreso = Array.from(ingresosMap.entries())
    .map(([materiaId, data]) => ({
      materiaId,
      materiaNombre: data.nombre,
      ingresos: data.ingresos,
      turnos: data.turnos,
    }))
    .sort((a, b) => b.ingresos - a.ingresos)
    .slice(0, 5);

  const sinDatos = turnosGenerados === 0 && ingresosCobrados === 0;

  return {
    periodo: { desde, hasta },
    turnosGenerados,
    porcentajeCancelaciones,
    porcentajeOcupacion,
    alumnosActivos,
    altasAlumnos,
    ingresosCobrados,
    turnosPorSemana,
    rankingMateriasMasPedidas,
    rankingMateriasMayorIngreso,
    sinDatos,
  };
}
