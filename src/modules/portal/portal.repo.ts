import { query } from "@/lib/db/client";
import type { MateriaPortalRow, ProfesorPortalRow, TurnoPortalRow } from "./portal.types";

const AHORA_AR = `(now() AT TIME ZONE 'America/Argentina/Buenos_Aires')`;

/** Ficha de alumno ACTIVA de la cuenta (`fn_alumno_de_usuario`). */
export async function alumnoDeUsuario(
  usuarioId: number,
): Promise<{ id: number; nivel_educativo: string | null } | null> {
  const filas = await query<{ id: number; nivel_educativo: string | null }>(
    `SELECT a.id, a.nivel_educativo
     FROM alumno a
     WHERE a.id = fn_alumno_de_usuario($1)`,
    [usuarioId],
  );
  return filas[0] ?? null;
}

export async function limiteTurnosFuturos(): Promise<number> {
  const filas = await query<{ valor: number }>(
    `SELECT fn_parametro('max_turnos_futuros_alumno') AS valor`,
  );
  return Number(filas[0].valor);
}

/** Turnos 'Reservado' con inicio futuro (los que cuentan para el límite). */
export async function contarFuturosReservados(alumnoId: number): Promise<number> {
  const filas = await query<{ n: string }>(
    `SELECT count(*)::text AS n FROM turno t
     WHERE t.alumno_id = $1 AND t.estado = 'Reservado'
       AND (t.fecha + t.hora_inicio) > ${AHORA_AR}`,
    [alumnoId],
  );
  return Number(filas[0].n);
}

/**
 * Mis turnos. Sin historial: 'Reservado' futuros, ascendente. Con historial:
 * todos (pasados y cancelados), fecha y hora descendente.
 */
export async function misTurnos(alumnoId: number, verHistorial: boolean): Promise<TurnoPortalRow[]> {
  const filtro = verHistorial
    ? ""
    : `AND t.estado = 'Reservado' AND (t.fecha + t.hora_inicio) > ${AHORA_AR}`;
  const orden = verHistorial ? "DESC" : "ASC";
  return query<TurnoPortalRow>(
    `SELECT
       t.id,
       t.codigo,
       t.fecha::text AS fecha,
       t.hora_inicio::text AS hora_inicio,
       t.hora_fin::text AS hora_fin,
       m.id AS materia_id,
       m.nombre AS materia_nombre,
       p.id AS profesor_id,
       u.nombre AS profesor_nombre,
       u.apellido AS profesor_apellido,
       t.estado,
       t.observaciones,
       t.created_at
     FROM turno t
     JOIN materia m ON m.id = t.materia_id
     JOIN profesor p ON p.id = t.profesor_id
     JOIN usuario u ON u.id = p.usuario_id
     WHERE t.alumno_id = $1 ${filtro}
     ORDER BY t.fecha ${orden}, t.hora_inicio ${orden}, t.id ${orden}`,
    [alumnoId],
  );
}

/**
 * Materias reservables: activas, del nivel educativo del alumno (HU-TUR-01 no
 * deja reservar otro nivel) y con al menos un profesor activo que las dicte.
 */
export async function materias(nivel: string | null): Promise<MateriaPortalRow[]> {
  return query<MateriaPortalRow>(
    `SELECT m.id, m.nombre, m.nivel, m.duracion_clase_minutos
     FROM materia m
     WHERE m.estado = 'activo'
       AND ($1::text IS NULL OR m.nivel::text = $1::text)
       AND EXISTS (
         SELECT 1 FROM profesor_materia pm
         JOIN profesor p ON p.id = pm.profesor_id AND p.estado = 'activo'
         WHERE pm.materia_id = m.id)
     ORDER BY m.nombre`,
    [nivel],
  );
}

/** Profesores activos que dictan la materia. */
export async function profesores(materiaId: number): Promise<ProfesorPortalRow[]> {
  return query<ProfesorPortalRow>(
    `SELECT p.id, u.nombre, u.apellido
     FROM profesor_materia pm
     JOIN profesor p ON p.id = pm.profesor_id AND p.estado = 'activo'
     JOIN usuario u ON u.id = p.usuario_id AND u.estado = 'activo'
     WHERE pm.materia_id = $1
     ORDER BY u.apellido, u.nombre`,
    [materiaId],
  );
}

export async function turnoPortalPorId(id: number): Promise<TurnoPortalRow | null> {
  const filas = await query<TurnoPortalRow>(
    `SELECT t.id, t.codigo, t.fecha::text AS fecha, t.hora_inicio::text AS hora_inicio,
            t.hora_fin::text AS hora_fin, m.id AS materia_id, m.nombre AS materia_nombre,
            p.id AS profesor_id, u.nombre AS profesor_nombre, u.apellido AS profesor_apellido,
            t.estado, t.observaciones, t.created_at
     FROM turno t
     JOIN materia m ON m.id = t.materia_id
     JOIN profesor p ON p.id = t.profesor_id
     JOIN usuario u ON u.id = p.usuario_id
     WHERE t.id = $1`,
    [id],
  );
  return filas[0] ?? null;
}
