import { query } from "@/lib/db/client";
import type { ProfesorRow, RendicionDetalleRow, RendicionPendienteRow } from "./rendicion.types";

type Periodo = { profesorId: number; desde: string; hasta: string; materiaId?: number };

/** Primer y último día del mes en curso, en hora de Argentina. */
export async function mesEnCurso(): Promise<{ desde: string; hasta: string }> {
  const filas = await query<{ desde: string; hasta: string }>(
    `WITH h AS (SELECT (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date AS d)
     SELECT date_trunc('month', d)::date::text AS desde,
            (date_trunc('month', d) + interval '1 month - 1 day')::date::text AS hasta
     FROM h`,
  );
  return filas[0];
}

export async function obtenerProfesor(profesorId: number): Promise<ProfesorRow | null> {
  const filas = await query<ProfesorRow>(
    `SELECT p.id, u.nombre, u.apellido
     FROM profesor p JOIN usuario u ON u.id = p.usuario_id
     WHERE p.id = $1`,
    [profesorId],
  );
  return filas[0] ?? null;
}

export async function profesorDeUsuario(usuarioId: number): Promise<ProfesorRow | null> {
  const filas = await query<ProfesorRow>(
    `SELECT p.id, u.nombre, u.apellido
     FROM profesor p JOIN usuario u ON u.id = p.usuario_id
     WHERE p.usuario_id = $1 AND p.estado = 'activo'`,
    [usuarioId],
  );
  return filas[0] ?? null;
}

export async function existeMateria(materiaId: number): Promise<boolean> {
  const filas = await query(`SELECT 1 FROM materia WHERE id = $1`, [materiaId]);
  return filas.length > 0;
}

/** Clases cobradas con pago vigente en el período (`fn_rendicion_detalle`). */
export async function detalle(p: Periodo): Promise<RendicionDetalleRow[]> {
  return query<RendicionDetalleRow>(
    `SELECT
       d.turno_id,
       d.fecha_clase::text AS fecha_clase,
       d.alumno_id,
       al.nombre AS alumno_nombre,
       al.apellido AS alumno_apellido,
       d.materia_id,
       d.materia,
       d.importe_cobrado::text AS importe_cobrado,
       d.medio_pago,
       d.comprobante,
       d.fecha_pago::text AS fecha_pago,
       d.estado_clase::text AS estado_clase
     FROM fn_rendicion_detalle($1, $2::date, $3::date, $4::int) d
     JOIN alumno al ON al.id = d.alumno_id
     ORDER BY d.materia, d.fecha_clase, d.turno_id`,
    [p.profesorId, p.desde, p.hasta, p.materiaId ?? null],
  );
}

/** Clases pendientes de cobro del período, informativas (`fn_rendicion_pendientes`). */
export async function pendientes(p: Periodo): Promise<RendicionPendienteRow[]> {
  return query<RendicionPendienteRow>(
    `SELECT
       d.turno_id,
       d.fecha_clase::text AS fecha_clase,
       d.alumno_id,
       al.nombre AS alumno_nombre,
       al.apellido AS alumno_apellido,
       d.materia_id,
       d.materia,
       d.importe_pendiente::text AS importe_pendiente,
       d.estado_clase::text AS estado_clase
     FROM fn_rendicion_pendientes($1, $2::date, $3::date, $4::int) d
     JOIN alumno al ON al.id = d.alumno_id
     ORDER BY d.materia, d.fecha_clase, d.turno_id`,
    [p.profesorId, p.desde, p.hasta, p.materiaId ?? null],
  );
}
