import { query } from "@/lib/db/client";
import type {
  FiltrosIndicadores,
  MetricasTurnosRow,
  HorasDisponibilidadRow,
  AlumnosMetricasRow,
  IngresosRow,
  TurnosPorSemanaRow,
  RankingMateriaDemandaRow,
  RankingMateriaIngresosRow,
} from "./indicadores.types";

/**
 * Métricas agregadas de turnos en el período (generados, cancelados, horas de turnos no cancelados).
 * Aplica filtros de materia y profesor si se especifican.
 */
export async function obtenerMetricasTurnos(
  filtros: FiltrosIndicadores,
): Promise<MetricasTurnosRow> {
  const sql = `
    SELECT
      count(*)::int AS turnos_generados,
      count(*) FILTER (WHERE estado = 'Cancelado')::int AS turnos_cancelados,
      COALESCE(
        SUM(EXTRACT(EPOCH FROM (hora_fin - hora_inicio)) / 3600.0) FILTER (WHERE estado <> 'Cancelado'),
        0
      )::numeric(10,2)::text AS horas_turnos
    FROM turno
    WHERE fecha >= $1 AND fecha <= $2
      AND ($3::int IS NULL OR profesor_id = $3)
      AND ($4::int IS NULL OR materia_id = $4)
  `;

  const rows = await query<MetricasTurnosRow>(sql, [
    filtros.desde,
    filtros.hasta,
    filtros.profesorId ?? null,
    filtros.materiaId ?? null,
  ]);

  return (
    rows[0] ?? {
      turnos_generados: 0,
      turnos_cancelados: 0,
      horas_turnos: "0",
    }
  );
}

/**
 * Calcula las horas de disponibilidad ofertada por los profesores en el período.
 * Genera la serie de días del rango y la cruza con agenda_semanal y agenda_profesional activas.
 */
export async function obtenerHorasDisponibilidad(
  filtros: FiltrosIndicadores,
): Promise<number> {
  const sql = `
    WITH fechas AS (
      SELECT (generate_series($1::timestamp, $2::timestamp, '1 day'::interval))::date AS fecha
    ), franjas AS (
      SELECT ap.profesor_id, ap.hora_inicio, ap.hora_fin
      FROM agenda_profesional ap
      JOIN agenda_semanal ags ON ags.id = ap.agenda_semanal_id
      JOIN fechas d ON (EXTRACT(isodow FROM d.fecha))::smallint = ags.dia_semana
      WHERE ap.estado = 'activo' AND ags.estado = 'activo'
        AND ($3::int IS NULL OR ap.profesor_id = $3)
        AND ($4::int IS NULL OR ap.profesor_id IN (
          SELECT pm.profesor_id FROM profesor_materia pm WHERE pm.materia_id = $4
        ))
    )
    SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (hora_fin - hora_inicio)) / 3600.0), 0)::numeric(10,2)::text AS horas_disponibles
    FROM franjas
  `;

  const rows = await query<HorasDisponibilidadRow>(sql, [
    filtros.desde,
    filtros.hasta,
    filtros.profesorId ?? null,
    filtros.materiaId ?? null,
  ]);

  return Number(rows[0]?.horas_disponibles || 0);
}

/**
 * Métricas globales del centro de alumnos (activos totales a la fecha y altas en el período).
 * Regla de negocio: los filtros de materia y profesor NO aplican a estas métricas.
 */
export async function obtenerMetricasAlumnos(
  filtros: FiltrosIndicadores,
): Promise<AlumnosMetricasRow> {
  const sql = `
    SELECT
      (SELECT count(*)::int FROM alumno WHERE estado = 'activo') AS alumnos_activos,
      (
        SELECT count(*)::int
        FROM alumno
        WHERE (created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date >= $1
          AND (created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date <= $2
      ) AS altas_alumnos
  `;

  const rows = await query<AlumnosMetricasRow>(sql, [filtros.desde, filtros.hasta]);
  return rows[0] ?? { alumnos_activos: 0, altas_alumnos: 0 };
}

/**
 * Suma de ingresos cobrados en el período.
 * Si se especifica materia o profesor, calcula sobre los turnos imputados en los pagos del período.
 */
export async function obtenerIngresosCobrados(
  filtros: FiltrosIndicadores,
): Promise<number> {
  if (filtros.profesorId || filtros.materiaId) {
    const sql = `
      SELECT COALESCE(SUM(pt.importe), 0)::numeric(12,2)::text AS ingresos
      FROM pago_turno pt
      JOIN pago p ON p.id = pt.pago_id
      JOIN turno t ON t.id = pt.turno_id
      WHERE p.fecha_pago >= $1 AND p.fecha_pago <= $2
        AND ($3::int IS NULL OR t.profesor_id = $3)
        AND ($4::int IS NULL OR t.materia_id = $4)
    `;

    const rows = await query<IngresosRow>(sql, [
      filtros.desde,
      filtros.hasta,
      filtros.profesorId ?? null,
      filtros.materiaId ?? null,
    ]);

    return Number(rows[0]?.ingresos || 0);
  }

  const sql = `
    SELECT COALESCE(SUM(monto), 0)::numeric(12,2)::text AS ingresos
    FROM pago
    WHERE fecha_pago >= $1 AND fecha_pago <= $2
  `;

  const rows = await query<IngresosRow>(sql, [filtros.desde, filtros.hasta]);
  return Number(rows[0]?.ingresos || 0);
}

/**
 * Cantidad de turnos agrupados por semana (para el gráfico de barras).
 */
export async function obtenerTurnosPorSemana(
  filtros: FiltrosIndicadores,
): Promise<TurnosPorSemanaRow[]> {
  const sql = `
    SELECT
      (date_trunc('week', fecha))::date::text AS fecha_inicio,
      count(*)::int AS cantidad
    FROM turno
    WHERE fecha >= $1 AND fecha <= $2
      AND ($3::int IS NULL OR profesor_id = $3)
      AND ($4::int IS NULL OR materia_id = $4)
    GROUP BY fecha_inicio
    ORDER BY fecha_inicio ASC
  `;

  return query<TurnosPorSemanaRow>(sql, [
    filtros.desde,
    filtros.hasta,
    filtros.profesorId ?? null,
    filtros.materiaId ?? null,
  ]);
}

/**
 * Top 5 de materias más pedidas / con más horas dictadas en el período (turnos no cancelados).
 */
export async function obtenerRankingMateriasMasPedidas(
  filtros: FiltrosIndicadores,
): Promise<RankingMateriaDemandaRow[]> {
  const sql = `
    SELECT
      m.id AS materia_id,
      m.nombre AS materia_nombre,
      count(t.id)::int AS turnos,
      COALESCE(
        SUM(EXTRACT(EPOCH FROM (t.hora_fin - t.hora_inicio)) / 3600.0),
        0
      )::numeric(10,2)::text AS horas_dictadas
    FROM materia m
    JOIN turno t ON t.materia_id = m.id
    WHERE t.fecha >= $1 AND t.fecha <= $2
      AND t.estado <> 'Cancelado'
      AND ($3::int IS NULL OR t.profesor_id = $3)
      AND ($4::int IS NULL OR t.materia_id = $4)
    GROUP BY m.id, m.nombre
    ORDER BY turnos DESC, horas_dictadas DESC
    LIMIT 5
  `;

  return query<RankingMateriaDemandaRow>(sql, [
    filtros.desde,
    filtros.hasta,
    filtros.profesorId ?? null,
    filtros.materiaId ?? null,
  ]);
}

/**
 * Top 5 de materias que más ingresos generaron a través de pagos en el período.
 */
export async function obtenerRankingMateriasMayorIngreso(
  filtros: FiltrosIndicadores,
): Promise<RankingMateriaIngresosRow[]> {
  const sql = `
    SELECT
      m.id AS materia_id,
      m.nombre AS materia_nombre,
      COALESCE(SUM(pt.importe), 0)::numeric(12,2)::text AS ingresos,
      count(DISTINCT t.id)::int AS turnos
    FROM materia m
    JOIN turno t ON t.materia_id = m.id
    JOIN pago_turno pt ON pt.turno_id = t.id
    JOIN pago p ON p.id = pt.pago_id
    WHERE p.fecha_pago >= $1 AND p.fecha_pago <= $2
      AND ($3::int IS NULL OR t.profesor_id = $3)
      AND ($4::int IS NULL OR t.materia_id = $4)
    GROUP BY m.id, m.nombre
    ORDER BY ingresos DESC, turnos DESC
    LIMIT 5
  `;

  return query<RankingMateriaIngresosRow>(sql, [
    filtros.desde,
    filtros.hasta,
    filtros.profesorId ?? null,
    filtros.materiaId ?? null,
  ]);
}
