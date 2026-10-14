import type { Pool, PoolClient } from "pg";
import { pool, query } from "@/lib/db/client";
import type { EventoRow, FiltrosHistorial, NotaRow, ResumenRow } from "./historial.types";

type Ejecutor = Pool | PoolClient;

/** Fuera de transacción usa `query()`, que reintenta si el pooler cortó la conexión. */
async function run<T extends Record<string, unknown>>(
  ejecutor: Ejecutor,
  sql: string,
  params: unknown[],
): Promise<T[]> {
  if (ejecutor === pool) return query<T>(sql, params);
  const { rows } = await ejecutor.query(sql, params);
  return rows as T[];
}

/**
 * Línea de tiempo (`vw_historial_alumno`), fecha y hora descendente. Los
 * filtros de materia y profesor dejan afuera las notas (no tienen ninguno de los dos).
 */
export async function eventos(alumnoId: number, f: FiltrosHistorial): Promise<EventoRow[]> {
  const params: unknown[] = [alumnoId];
  const condiciones = ["h.alumno_id = $1"];

  if (f.desde) {
    params.push(f.desde);
    condiciones.push(`h.fecha_hora::date >= $${params.length}::date`);
  }
  if (f.hasta) {
    params.push(f.hasta);
    condiciones.push(`h.fecha_hora::date <= $${params.length}::date`);
  }
  if (f.tipo) {
    params.push(f.tipo);
    condiciones.push(`h.tipo = $${params.length}`);
  }
  if (f.materiaId !== undefined) {
    params.push(f.materiaId);
    condiciones.push(`h.materia_id = $${params.length}`);
  }
  if (f.profesorId !== undefined) {
    params.push(f.profesorId);
    condiciones.push(`h.profesor_id = $${params.length}`);
  }

  return query<EventoRow>(
    `SELECT
       h.tipo,
       to_char(h.fecha_hora, 'YYYY-MM-DD"T"HH24:MI:SS') AS fecha_hora,
       h.materia_id,
       h.materia,
       h.profesor_id,
       h.profesor,
       h.detalle,
       h.observaciones,
       h.cancelacion_tardia,
       h.responsable,
       h.usuario_id,
       h.usuario,
       h.turno_id,
       h.fecha_clase::text AS fecha_clase,
       to_char(h.hora_clase, 'HH24:MI') AS hora_clase
     FROM vw_historial_alumno h
     WHERE ${condiciones.join(" AND ")}
     ORDER BY h.fecha_hora DESC, h.orden_evento DESC`,
    params,
  );
}

/** Resumen del alumno completo (no depende de los filtros). */
export async function resumen(alumnoId: number): Promise<ResumenRow> {
  const filas = await query<ResumenRow>(
    `SELECT clases_asistidas::text AS clases_asistidas,
            ausencias::text AS ausencias,
            cancelaciones::text AS cancelaciones,
            porcentaje_asistencia::text AS porcentaje_asistencia,
            fecha_ultima_clase::text AS fecha_ultima_clase
     FROM fn_historial_resumen($1)`,
    [alumnoId],
  );
  return filas[0];
}

export async function estadoAlumno(alumnoId: number, ejecutor: Ejecutor = pool): Promise<string | null> {
  const filas = await run<{ estado: string }>(ejecutor, `SELECT estado FROM alumno WHERE id = $1`, [alumnoId]);
  return filas[0]?.estado ?? null;
}

export async function profesorDeUsuario(usuarioId: number, ejecutor: Ejecutor = pool): Promise<number | null> {
  const filas = await run<{ id: number }>(
    ejecutor,
    `SELECT id FROM profesor WHERE usuario_id = $1 AND estado = 'activo'`,
    [usuarioId],
  );
  return filas[0]?.id ?? null;
}

export async function profesorAtiendeAlumno(
  profesorId: number,
  alumnoId: number,
  ejecutor: Ejecutor = pool,
): Promise<boolean> {
  const filas = await run<{ atiende: boolean }>(
    ejecutor,
    `SELECT fn_profesor_atiende_alumno($1, $2) AS atiende`,
    [profesorId, alumnoId],
  );
  return Boolean(filas[0]?.atiende);
}

/**
 * Alta de nota. `usuario_id` y `created_at` los fija `fn_nota_alumno_validar`
 * desde `app.usuario_id`; la bitácora la escribe `trg_auditoria_nota_alumno`.
 */
export async function insertNota(
  alumnoId: number,
  texto: string,
  usuarioId: number,
  client: PoolClient,
): Promise<NotaRow> {
  const { rows } = await client.query<{ id: number }>(
    `INSERT INTO nota_alumno (alumno_id, texto, usuario_id) VALUES ($1, $2, $3) RETURNING id`,
    [alumnoId, texto, usuarioId],
  );
  const filas = await run<NotaRow>(
    client,
    `SELECT n.id, n.alumno_id, n.texto, n.usuario_id,
            u.nombre AS usuario_nombre, u.apellido AS usuario_apellido, n.created_at
     FROM nota_alumno n JOIN usuario u ON u.id = n.usuario_id
     WHERE n.id = $1`,
    [rows[0].id],
  );
  return filas[0];
}
