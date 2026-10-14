import type { Pool, PoolClient } from "pg";
import { pool, query } from "@/lib/db/client";
import type {
  ClaseRow,
  FiltrosClasesDelDia,
  FiltrosHistorial,
  HistorialRow,
  ResumenRow,
} from "./asistencia.types";

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
 * Turno + asistencia + flags de ventana/plazo.
 *
 * La ventana replica `fn_asistencia_validar`: desde `minutos_antes_asistencia`
 * antes del inicio hasta el fin de la jornada (máximo `hora_fin` del horario de
 * atención de ese día de la semana, o el fin del turno si es más tarde). Todo en
 * hora de Argentina. Si falta un parámetro, `fn_parametro` levanta excepción: es
 * a propósito, sin parámetros la regla no se puede evaluar.
 */
const SELECT_CLASE = `
  WITH params AS (
    SELECT fn_parametro('minutos_antes_asistencia')    AS minutos_antes,
           fn_parametro('horas_correccion_asistencia') AS horas_correccion,
           (now() AT TIME ZONE 'America/Argentina/Buenos_Aires') AS ahora
  )
  SELECT
    t.id AS turno_id,
    t.codigo,
    t.profesor_id,
    up.nombre AS profesor_nombre,
    up.apellido AS profesor_apellido,
    al.id AS alumno_id,
    al.legajo AS alumno_legajo,
    al.nombre AS alumno_nombre,
    al.apellido AS alumno_apellido,
    m.id AS materia_id,
    m.nombre AS materia_nombre,
    t.fecha::text AS fecha,
    t.hora_inicio::text AS hora_inicio,
    t.hora_fin::text AS hora_fin,
    t.estado,
    pa.ahora < v.desde AS antes_de_ventana,
    pa.ahora > v.hasta AS despues_de_ventana,
    to_char(v.desde, 'HH24:MI') AS ventana_desde,
    CASE WHEN a.id IS NULL THEN NULL
         ELSE now() <= a.registrado_at + make_interval(hours => pa.horas_correccion)
    END AS dentro_plazo,
    pa.horas_correccion,
    pa.minutos_antes,
    a.id AS a_id,
    a.turno_id AS a_turno_id,
    a.presente AS a_presente,
    a.tema_trabajado AS a_tema_trabajado,
    a.observaciones AS a_observaciones,
    a.usuario_id AS a_usuario_id,
    ua.nombre AS a_usuario_nombre,
    ua.apellido AS a_usuario_apellido,
    a.registrado_at AS a_registrado_at,
    a.modificado_at AS a_modificado_at,
    a.modificado_por AS a_modificado_por,
    um.nombre AS a_modificado_por_nombre,
    um.apellido AS a_modificado_por_apellido,
    a.motivo_correccion AS a_motivo_correccion
  FROM turno t
  CROSS JOIN params pa
  JOIN alumno al ON al.id = t.alumno_id
  JOIN materia m ON m.id = t.materia_id
  JOIN profesor p ON p.id = t.profesor_id
  JOIN usuario up ON up.id = p.usuario_id
  LEFT JOIN asistencia a ON a.turno_id = t.id
  LEFT JOIN usuario ua ON ua.id = a.usuario_id
  LEFT JOIN usuario um ON um.id = a.modificado_por
  CROSS JOIN LATERAL (
    SELECT (t.fecha + t.hora_inicio) - make_interval(mins => pa.minutos_antes) AS desde,
           t.fecha + GREATEST(
             COALESCE((
               SELECT max(ags.hora_fin)
               FROM agenda_semanal ags
               WHERE ags.dia_semana = EXTRACT(isodow FROM t.fecha)::smallint
                 AND ags.estado = 'activo'
             ), t.hora_fin),
             t.hora_fin
           ) AS hasta
  ) v
`;

/** Turnos no cancelados de una fecha (hoy en hora AR si no viene). Orden: hora de inicio. */
export async function findClasesDelDia(
  filtros: FiltrosClasesDelDia,
  ejecutor: Ejecutor = pool,
): Promise<ClaseRow[]> {
  const params: unknown[] = [filtros.fecha ?? null];
  const condiciones = [
    `t.fecha = COALESCE($1::date, (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date)`,
    `t.estado <> 'Cancelado'`,
  ];

  if (filtros.profesorId !== undefined) {
    params.push(filtros.profesorId);
    condiciones.push(`t.profesor_id = $${params.length}`);
  }

  return run<ClaseRow>(
    ejecutor,
    `${SELECT_CLASE}
     WHERE ${condiciones.join(" AND ")}
     ORDER BY t.hora_inicio ASC, up.apellido ASC, up.nombre ASC, t.id ASC`,
    params,
  );
}

export async function findClaseByTurnoId(
  turnoId: number,
  ejecutor: Ejecutor = pool,
): Promise<ClaseRow | null> {
  const filas = await run<ClaseRow>(ejecutor, `${SELECT_CLASE} WHERE t.id = $1`, [turnoId]);
  return filas[0] ?? null;
}

export async function findClaseByAsistenciaId(
  asistenciaId: number,
  ejecutor: Ejecutor = pool,
): Promise<ClaseRow | null> {
  const filas = await run<ClaseRow>(ejecutor, `${SELECT_CLASE} WHERE a.id = $1`, [asistenciaId]);
  return filas[0] ?? null;
}

/** Lock del turno: serializa dos registros simultáneos sobre la misma clase. */
export async function bloquearTurno(turnoId: number, client: PoolClient): Promise<boolean> {
  const { rows } = await client.query("SELECT id FROM turno WHERE id = $1 FOR UPDATE", [turnoId]);
  return rows.length > 0;
}

/** Lock de la asistencia (y su turno) antes de corregir. Devuelve el turno_id. */
export async function bloquearAsistencia(
  asistenciaId: number,
  client: PoolClient,
): Promise<number | null> {
  const { rows } = await client.query<{ turno_id: number }>(
    "SELECT turno_id FROM asistencia WHERE id = $1 FOR UPDATE",
    [asistenciaId],
  );
  return rows[0]?.turno_id ?? null;
}

/**
 * Alta. `usuario_id`, `registrado_at` y los campos de corrección los vuelve a
 * fijar el trigger `fn_asistencia_validar` desde `app.usuario_id`; el estado del
 * turno lo cambia `fn_asistencia_sincronizar_turno`.
 */
export async function insert(
  data: {
    turnoId: number;
    presente: boolean;
    temaTrabajado: string | null;
    observaciones: string | null;
  },
  usuarioId: number,
  client: PoolClient,
): Promise<number> {
  const { rows } = await client.query<{ id: number }>(
    `INSERT INTO asistencia (turno_id, presente, tema_trabajado, observaciones, usuario_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [data.turnoId, data.presente, data.temaTrabajado, data.observaciones, usuarioId],
  );
  return rows[0].id;
}

/**
 * Corrección. `modificado_at`/`modificado_por` los pone el trigger; si corrige
 * el Profesor, el trigger conserva el `motivo_correccion` anterior.
 */
export async function update(
  id: number,
  data: {
    presente: boolean;
    temaTrabajado: string | null;
    observaciones: string | null;
    motivoCorreccion: string | null;
  },
  client: PoolClient,
): Promise<void> {
  await client.query(
    `UPDATE asistencia
     SET presente = $2,
         tema_trabajado = $3,
         observaciones = $4,
         motivo_correccion = $5
     WHERE id = $1`,
    [id, data.presente, data.temaTrabajado, data.observaciones, data.motivoCorreccion],
  );
}

export async function obtenerProfesorPorUsuarioId(
  usuarioId: number,
  ejecutor: Ejecutor = pool,
): Promise<{ id: number; estado: string } | null> {
  const filas = await run<{ id: number; estado: string }>(
    ejecutor,
    "SELECT id, estado FROM profesor WHERE usuario_id = $1",
    [usuarioId],
  );
  return filas[0] ?? null;
}

export async function existeAlumno(alumnoId: number, ejecutor: Ejecutor = pool): Promise<boolean> {
  const filas = await run(ejecutor, "SELECT 1 FROM alumno WHERE id = $1", [alumnoId]);
  return filas.length > 0;
}

export async function profesorAtiendeAlumno(
  profesorId: number,
  alumnoId: number,
  ejecutor: Ejecutor = pool,
): Promise<boolean> {
  const filas = await run<{ atiende: boolean }>(
    ejecutor,
    "SELECT fn_profesor_atiende_alumno($1, $2) AS atiende",
    [profesorId, alumnoId],
  );
  return Boolean(filas[0]?.atiende);
}

/** WHERE común del historial y su resumen (alias `h` = vw_historial_asistencia). */
function whereHistorial(alumnoId: number, filtros: FiltrosHistorial) {
  const params: unknown[] = [alumnoId];
  const condiciones = ["h.alumno_id = $1"];

  if (filtros.desde) {
    params.push(filtros.desde);
    condiciones.push(`h.fecha >= $${params.length}::date`);
  }
  if (filtros.hasta) {
    params.push(filtros.hasta);
    condiciones.push(`h.fecha <= $${params.length}::date`);
  }
  if (filtros.materiaId !== undefined) {
    params.push(filtros.materiaId);
    condiciones.push(`h.materia_id = $${params.length}`);
  }
  if (filtros.profesorId !== undefined) {
    params.push(filtros.profesorId);
    condiciones.push(`h.profesor_id = $${params.length}`);
  }
  if (filtros.estado) {
    params.push(filtros.estado);
    condiciones.push(`h.estado = $${params.length}::estado_turno`);
  }

  return { where: condiciones.join(" AND "), params };
}

/** Historial (vw_historial_asistencia). Orden fijo: fecha y hora descendente. */
export async function findHistorial(
  alumnoId: number,
  filtros: FiltrosHistorial,
  ejecutor: Ejecutor = pool,
): Promise<HistorialRow[]> {
  const { where, params } = whereHistorial(alumnoId, filtros);

  return run<HistorialRow>(
    ejecutor,
    `SELECT
       h.turno_id,
       h.codigo,
       h.fecha::text AS fecha,
       h.hora_inicio::text AS hora_inicio,
       h.materia_id,
       h.materia AS materia_nombre,
       h.profesor_id,
       u.nombre AS profesor_nombre,
       u.apellido AS profesor_apellido,
       h.estado,
       h.tema_trabajado
     FROM vw_historial_asistencia h
     JOIN profesor p ON p.id = h.profesor_id
     JOIN usuario u ON u.id = p.usuario_id
     WHERE ${where}
     ORDER BY h.fecha DESC, h.hora_inicio DESC, h.turno_id DESC`,
    params,
  );
}

/**
 * Resumen con los MISMOS filtros del listado, estado incluido (igual que el
 * front). Misma fórmula que `fn_asistencia_resumen`, que no recibe el estado:
 * % = Asistió / (Asistió + Ausente), 1 decimal; las canceladas no cuentan.
 */
export async function resumen(
  alumnoId: number,
  filtros: FiltrosHistorial,
  ejecutor: Ejecutor = pool,
): Promise<ResumenRow> {
  const { where, params } = whereHistorial(alumnoId, filtros);

  const filas = await run<ResumenRow>(
    ejecutor,
    `SELECT s.a::text AS clases_asistio,
            s.b::text AS clases_ausente,
            s.c::text AS clases_canceladas,
            CASE WHEN s.a + s.b = 0 THEN NULL
                 ELSE round(100.0 * s.a / (s.a + s.b), 1)
            END::text AS porcentaje_asistencia
     FROM (
       SELECT count(*) FILTER (WHERE h.estado = 'Asistió')   AS a,
              count(*) FILTER (WHERE h.estado = 'Ausente')   AS b,
              count(*) FILTER (WHERE h.estado = 'Cancelado') AS c
       FROM vw_historial_asistencia h
       WHERE ${where}
     ) s`,
    params,
  );
  return filas[0];
}
