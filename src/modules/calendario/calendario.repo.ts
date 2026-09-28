import type { Pool, PoolClient } from "pg";
import { pool, query } from "@/lib/db/client";
import type {
  HuecoRow,
  TurnoCalendarioRow,
  BloqueHorarioRow,
  ProfesorInfoRow,
  FiltrosHuecos,
} from "./calendario.types";

type Ejecutor = Pool | PoolClient;

/**
 * Consulta los huecos disponibles proyectados desde la vista vw_huecos_disponibles.
 */
export async function huecos(
  filtros: FiltrosHuecos,
  ejecutor: Ejecutor = pool,
): Promise<HuecoRow[]> {
  const condiciones: string[] = [];
  const params: unknown[] = [];

  params.push(filtros.desde);
  condiciones.push(`vw.fecha >= $${params.length}::date`);

  params.push(filtros.hasta);
  condiciones.push(`vw.fecha <= $${params.length}::date`);

  if (filtros.profesorId !== undefined) {
    params.push(filtros.profesorId);
    condiciones.push(`vw.profesor_id = $${params.length}`);
  }

  if (filtros.materiaId !== undefined) {
    params.push(filtros.materiaId);
    condiciones.push(`EXISTS (
      SELECT 1 FROM profesor_materia pm
      WHERE pm.profesor_id = vw.profesor_id AND pm.materia_id = $${params.length}
    )`);
  }

  const where = `WHERE ${condiciones.join(" AND ")}`;
  const sql = `
    SELECT
      vw.agenda_profesional_id,
      vw.profesor_id,
      u.nombre AS profesor_nombre,
      u.apellido AS profesor_apellido,
      vw.fecha::text AS fecha,
      vw.hueco_inicio::text AS hueco_inicio,
      vw.hueco_fin::text AS hueco_fin
    FROM vw_huecos_disponibles vw
    JOIN profesor p ON p.id = vw.profesor_id
    JOIN usuario u ON u.id = p.usuario_id
    ${where}
    ORDER BY vw.fecha ASC, vw.hueco_inicio ASC, vw.profesor_id ASC
  `;

  if ("query" in ejecutor && ejecutor !== pool) {
    const { rows } = await ejecutor.query<HuecoRow>(sql, params);
    return rows;
  }
  return query<HuecoRow>(sql, params);
}

/**
 * Obtiene los turnos de un profesor para una fecha específica.
 */
export async function turnosDelDia(
  profesorId: number,
  fecha: string,
  ejecutor: Ejecutor = pool,
): Promise<TurnoCalendarioRow[]> {
  const sql = `
    SELECT
      t.id,
      t.codigo,
      t.alumno_id,
      a.nombre AS alumno_nombre,
      a.apellido AS alumno_apellido,
      t.materia_id,
      m.nombre AS materia_nombre,
      t.hora_inicio::text AS hora_inicio,
      t.hora_fin::text AS hora_fin,
      t.estado
    FROM turno t
    JOIN alumno a ON a.id = t.alumno_id
    JOIN materia m ON m.id = t.materia_id
    WHERE t.profesor_id = $1 AND t.fecha = $2::date
    ORDER BY t.hora_inicio ASC
  `;

  const params = [profesorId, fecha];
  if ("query" in ejecutor && ejecutor !== pool) {
    const { rows } = await ejecutor.query<TurnoCalendarioRow>(sql, params);
    return rows;
  }
  return query<TurnoCalendarioRow>(sql, params);
}

/**
 * Consulta los bloques activos de disponibilidad del profesor para un día de la semana (ISO 1..7).
 */
export async function bloquesDelDia(
  profesorId: number,
  diaSemana: number,
  ejecutor: Ejecutor = pool,
): Promise<BloqueHorarioRow[]> {
  const sql = `
    SELECT
      ap.hora_inicio::text AS hora_inicio,
      ap.hora_fin::text AS hora_fin
    FROM agenda_profesional ap
    JOIN agenda_semanal ags ON ags.id = ap.agenda_semanal_id
    WHERE ap.profesor_id = $1
      AND ags.dia_semana = $2
      AND ap.estado = 'activo'
      AND ags.estado = 'activo'
    ORDER BY ap.hora_inicio ASC
  `;

  const params = [profesorId, diaSemana];
  if ("query" in ejecutor && ejecutor !== pool) {
    const { rows } = await ejecutor.query<BloqueHorarioRow>(sql, params);
    return rows;
  }
  return query<BloqueHorarioRow>(sql, params);
}

/**
 * Obtiene el profesor por su ID.
 */
export async function obtenerProfesor(
  profesorId: number,
  ejecutor: Ejecutor = pool,
): Promise<ProfesorInfoRow | null> {
  const sql = `
    SELECT
      p.id,
      u.nombre,
      u.apellido
    FROM profesor p
    JOIN usuario u ON u.id = p.usuario_id
    WHERE p.id = $1
  `;

  if ("query" in ejecutor && ejecutor !== pool) {
    const { rows } = await ejecutor.query<ProfesorInfoRow>(sql, [profesorId]);
    return rows[0] ?? null;
  }
  const filas = await query<ProfesorInfoRow>(sql, [profesorId]);
  return filas[0] ?? null;
}

/**
 * Obtiene el profesor asociado a un usuario_id.
 */
export async function obtenerProfesorPorUsuarioId(
  usuarioId: number,
  ejecutor: Ejecutor = pool,
): Promise<ProfesorInfoRow | null> {
  const sql = `
    SELECT
      p.id,
      u.nombre,
      u.apellido
    FROM profesor p
    JOIN usuario u ON u.id = p.usuario_id
    WHERE p.usuario_id = $1
  `;

  if ("query" in ejecutor && ejecutor !== pool) {
    const { rows } = await ejecutor.query<ProfesorInfoRow>(sql, [usuarioId]);
    return rows[0] ?? null;
  }
  const filas = await query<ProfesorInfoRow>(sql, [usuarioId]);
  return filas[0] ?? null;
}

/**
 * Comprueba si existe una materia por su ID.
 */
export async function existeMateria(
  materiaId: number,
  ejecutor: Ejecutor = pool,
): Promise<boolean> {
  const sql = `SELECT 1 FROM materia WHERE id = $1`;
  if ("query" in ejecutor && ejecutor !== pool) {
    const { rows } = await ejecutor.query(sql, [materiaId]);
    return rows.length > 0;
  }
  const filas = await query(sql, [materiaId]);
  return filas.length > 0;
}

/**
 * Obtiene el día de la semana ISO (1=Lunes .. 7=Domingo) para una fecha.
 */
export async function obtenerDiaSemanaIso(
  fecha: string,
  ejecutor: Ejecutor = pool,
): Promise<number> {
  const sql = `SELECT EXTRACT(isodow FROM $1::date)::int AS dia_semana`;
  if ("query" in ejecutor && ejecutor !== pool) {
    const { rows } = await ejecutor.query<{ dia_semana: number }>(sql, [fecha]);
    return rows[0]?.dia_semana ?? 1;
  }
  const filas = await query<{ dia_semana: number }>(sql, [fecha]);
  return filas[0]?.dia_semana ?? 1;
}
