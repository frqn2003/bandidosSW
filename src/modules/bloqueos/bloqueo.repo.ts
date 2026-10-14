import type { Pool, PoolClient } from "pg";
import { pool, query } from "@/lib/db/client";
import type { BloqueoRow, FiltrosBloqueo, TurnoAfectadoRow } from "./bloqueo.types";

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

const SELECT_BLOQUEO = `
  SELECT
    b.id,
    b.fecha_desde::text AS fecha_desde,
    b.fecha_hasta::text AS fecha_hasta,
    b.profesor_id,
    up.nombre AS profesor_nombre,
    up.apellido AS profesor_apellido,
    b.motivo,
    b.estado,
    b.usuario_id,
    ur.nombre AS usuario_nombre,
    ur.apellido AS usuario_apellido,
    b.created_at,
    b.fecha_baja,
    b.usuario_baja_id,
    ub.nombre AS baja_nombre,
    ub.apellido AS baja_apellido
  FROM bloqueo_fecha b
  LEFT JOIN profesor p ON p.id = b.profesor_id
  LEFT JOIN usuario up ON up.id = p.usuario_id
  JOIN usuario ur ON ur.id = b.usuario_id
  LEFT JOIN usuario ub ON ub.id = b.usuario_baja_id
`;

/**
 * Listado. Sin `estado`, solo los vigentes. `profesorId` incluye también los de
 * "Todos" (profesor_id NULL). `desde`/`hasta`: bloqueos que se superponen.
 */
export async function findAll(
  filtros: FiltrosBloqueo,
  ejecutor: Ejecutor = pool,
): Promise<BloqueoRow[]> {
  const params: unknown[] = [filtros.estado ?? "activo"];
  const condiciones = ["b.estado = $1::estado_activo_inactivo"];

  if (filtros.profesorId !== undefined) {
    params.push(filtros.profesorId);
    condiciones.push(`(b.profesor_id IS NULL OR b.profesor_id = $${params.length})`);
  }
  if (filtros.desde) {
    params.push(filtros.desde);
    condiciones.push(`b.fecha_hasta >= $${params.length}::date`);
  }
  if (filtros.hasta) {
    params.push(filtros.hasta);
    condiciones.push(`b.fecha_desde <= $${params.length}::date`);
  }

  return run<BloqueoRow>(
    ejecutor,
    `${SELECT_BLOQUEO}
     WHERE ${condiciones.join(" AND ")}
     ORDER BY b.fecha_desde ASC, b.fecha_hasta ASC, b.id ASC`,
    params,
  );
}

export async function findById(id: number, ejecutor: Ejecutor = pool): Promise<BloqueoRow | null> {
  const filas = await run<BloqueoRow>(ejecutor, `${SELECT_BLOQUEO} WHERE b.id = $1`, [id]);
  return filas[0] ?? null;
}

/** Lock antes de dar de baja: dos bajas simultáneas no pasan las dos el chequeo. */
export async function bloquear(
  id: number,
  client: PoolClient,
): Promise<{ estado: string } | null> {
  const { rows } = await client.query<{ estado: string }>(
    "SELECT estado FROM bloqueo_fecha WHERE id = $1 FOR UPDATE",
    [id],
  );
  return rows[0] ?? null;
}

export async function estadoProfesor(
  profesorId: number,
  ejecutor: Ejecutor = pool,
): Promise<string | null> {
  const filas = await run<{ estado: string }>(
    ejecutor,
    "SELECT estado FROM profesor WHERE id = $1",
    [profesorId],
  );
  return filas[0]?.estado ?? null;
}

/**
 * Alta. `estado`, `usuario_id` y `created_at` los fija `fn_bloqueo_fecha_validar`
 * desde `app.usuario_id`; igual se manda `usuario_id` porque la columna es NOT NULL.
 */
export async function insert(
  data: { fechaDesde: string; fechaHasta: string; profesorId: number | null; motivo: string },
  usuarioId: number,
  client: PoolClient,
): Promise<number> {
  const { rows } = await client.query<{ id: number }>(
    `INSERT INTO bloqueo_fecha (fecha_desde, fecha_hasta, profesor_id, motivo, usuario_id)
     VALUES ($1::date, $2::date, $3, $4, $5)
     RETURNING id`,
    [data.fechaDesde, data.fechaHasta, data.profesorId, data.motivo, usuarioId],
  );
  return rows[0].id;
}

/** Baja lógica: único UPDATE que admite el trigger. Fecha y usuario de baja los pone él. */
export async function darDeBaja(id: number, client: PoolClient): Promise<void> {
  await client.query(
    `UPDATE bloqueo_fecha
     SET estado = 'inactivo', fecha_baja = now(), usuario_baja_id = fn_usuario_id_actual()
     WHERE id = $1`,
    [id],
  );
}

/**
 * Turnos 'Reservado' dentro del rango (mismo criterio que `fn_turnos_en_bloqueo`),
 * con nombre y apellido por separado como pide el contrato. No se modifican.
 */
export async function turnosAfectados(
  fechaDesde: string,
  fechaHasta: string,
  profesorId: number | null,
  ejecutor: Ejecutor = pool,
): Promise<TurnoAfectadoRow[]> {
  return run<TurnoAfectadoRow>(
    ejecutor,
    `SELECT
       t.id,
       t.codigo,
       t.fecha::text AS fecha,
       t.hora_inicio::text AS hora_inicio,
       t.hora_fin::text AS hora_fin,
       al.id AS alumno_id,
       al.legajo AS alumno_legajo,
       al.nombre AS alumno_nombre,
       al.apellido AS alumno_apellido,
       t.profesor_id,
       u.nombre AS profesor_nombre,
       u.apellido AS profesor_apellido,
       m.id AS materia_id,
       m.nombre AS materia_nombre
     FROM turno t
     JOIN alumno al ON al.id = t.alumno_id
     JOIN profesor p ON p.id = t.profesor_id
     JOIN usuario u ON u.id = p.usuario_id
     JOIN materia m ON m.id = t.materia_id
     WHERE t.estado = 'Reservado'
       AND t.fecha BETWEEN $1::date AND $2::date
       AND ($3::int IS NULL OR t.profesor_id = $3::int)
     ORDER BY t.fecha ASC, t.hora_inicio ASC, t.profesor_id ASC`,
    [fechaDesde, fechaHasta, profesorId],
  );
}
