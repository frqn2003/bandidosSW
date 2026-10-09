import type { Pool, PoolClient } from "pg";
import { pool, query } from "@/lib/db/client";
import type {
  ClasePendientePagoRow,
  PagoRow,
  PagoFormaPagoRow,
  PagoTurnoRow,
  FormaPagoValidacionRow,
  FiltrosListarPagos,
} from "./pago.types";

type Ejecutor = Pool | PoolClient;

/**
 * Consulta las clases pendientes de cobro de un alumno:
 * turnos cuya fecha y hora de inicio ya transcurrieron en Argentina,
 * que no están Cancelados y que no han sido pagados.
 */
export async function listarClasesPendientes(
  alumnoId?: number,
  ejecutor: Ejecutor = pool,
): Promise<ClasePendientePagoRow[]> {
  const params: unknown[] = [];
  let where = `WHERE t.estado <> 'Cancelado'
    AND t.pagado = false
    AND (t.fecha + t.hora_inicio) <= (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')`;

  if (alumnoId !== undefined) {
    params.push(alumnoId);
    where += ` AND t.alumno_id = $1`;
  }

  const sql = `
    SELECT
      t.id,
      t.codigo,
      t.alumno_id,
      a.legajo AS alumno_legajo,
      a.nombre AS alumno_nombre,
      a.apellido AS alumno_apellido,
      a.dni AS alumno_dni,
      t.fecha::text AS fecha,
      t.hora_inicio::text AS hora_inicio,
      t.hora_fin::text AS hora_fin,
      t.materia_id,
      m.nombre AS materia_nombre,
      t.profesor_id,
      u.nombre AS profesor_nombre,
      u.apellido AS profesor_apellido,
      t.valor_clase_congelado::text AS valor_clase_congelado,
      t.pagado,
      t.estado
    FROM turno t
    JOIN alumno a ON a.id = t.alumno_id
    JOIN materia m ON m.id = t.materia_id
    JOIN profesor p ON p.id = t.profesor_id
    JOIN usuario u ON u.id = p.usuario_id
    ${where}
    ORDER BY t.fecha ASC, t.hora_inicio ASC
  `;

  if ("query" in ejecutor && ejecutor !== pool) {
    const { rows } = await ejecutor.query<ClasePendientePagoRow>(sql, params);
    return rows;
  }
  return query<ClasePendientePagoRow>(sql, params);
}

/**
 * Consulta el estado de un alumno.
 */
export async function obtenerAlumno(
  alumnoId: number,
  ejecutor: Ejecutor = pool,
): Promise<{ id: number; estado: string; legajo: string | null; nombre: string; apellido: string } | null> {
  const sql = `
    SELECT id, estado, legajo, nombre, apellido
    FROM alumno
    WHERE id = $1
  `;

  type AlumnoInfo = { id: number; estado: string; legajo: string | null; nombre: string; apellido: string };

  if ("query" in ejecutor && ejecutor !== pool) {
    const { rows } = await ejecutor.query<AlumnoInfo>(sql, [alumnoId]);
    return rows[0] ?? null;
  }
  const filas = await query<AlumnoInfo>(sql, [alumnoId]);
  return filas[0] ?? null;
}

/**
 * Bloquea y obtiene los turnos solicitados para cobro dentro de una transacción.
 */
export async function obtenerTurnosParaCobro(
  turnoIds: number[],
  client: PoolClient,
): Promise<ClasePendientePagoRow[]> {
  const sql = `
    SELECT
      t.id,
      t.codigo,
      t.alumno_id,
      t.fecha::text AS fecha,
      t.hora_inicio::text AS hora_inicio,
      t.hora_fin::text AS hora_fin,
      t.materia_id,
      m.nombre AS materia_nombre,
      t.profesor_id,
      u.nombre AS profesor_nombre,
      u.apellido AS profesor_apellido,
      t.valor_clase_congelado::text AS valor_clase_congelado,
      t.pagado,
      t.estado
    FROM turno t
    JOIN materia m ON m.id = t.materia_id
    JOIN profesor p ON p.id = t.profesor_id
    JOIN usuario u ON u.id = p.usuario_id
    WHERE t.id = ANY($1)
    FOR UPDATE
  `;

  const { rows } = await client.query<ClasePendientePagoRow>(sql, [turnoIds]);
  return rows;
}

/**
 * Consulta información de validación de formas de pago por sus IDs.
 */
export async function obtenerFormasPago(
  ids: number[],
  ejecutor: Ejecutor = pool,
): Promise<FormaPagoValidacionRow[]> {
  const sql = `
    SELECT id, nombre, requiere_nro_operacion, estado
    FROM forma_pago
    WHERE id = ANY($1)
  `;

  if ("query" in ejecutor && ejecutor !== pool) {
    const { rows } = await ejecutor.query<FormaPagoValidacionRow>(sql, [ids]);
    return rows;
  }
  return query<FormaPagoValidacionRow>(sql, [ids]);
}

/**
 * Inserta la cabecera del pago y genera el comprobante correlativo "REC-000123".
 */
export async function insertarPago(
  data: {
    alumnoId: number;
    monto: number;
    fechaPago: string;
    observaciones: string | null;
    usuarioId: number;
  },
  client: PoolClient,
): Promise<{ id: number; comprobante: string }> {
  const insertSql = `
    INSERT INTO pago (alumno_id, monto, fecha_pago, observaciones, usuario_id)
    VALUES ($1, $2, $3::date, $4, $5)
    RETURNING id, comprobante
  `;

  const { rows: inserted } = await client.query<{ id: number; comprobante: string }>(insertSql, [
    data.alumnoId,
    data.monto,
    data.fechaPago,
    data.observaciones,
    data.usuarioId,
  ]);

  return inserted[0];
}

/**
 * Inserta las clases abonadas en pago_turno (el trigger de BD actualiza turno.pagado = true).
 */
export async function insertarPagoTurnos(
  pagoId: number,
  turnos: { turnoId: number; importe: number }[],
  client: PoolClient,
): Promise<void> {
  for (const item of turnos) {
    await client.query(
      `INSERT INTO pago_turno (pago_id, turno_id, importe) VALUES ($1, $2, $3)`,
      [pagoId, item.turnoId, item.importe],
    );
  }
}

/**
 * Inserta las formas de pago utilizadas en pago_forma_pago.
 */
export async function insertarPagoFormasPago(
  pagoId: number,
  formas: { formaPagoId: number; nroOperacion: string | null }[],
  client: PoolClient,
): Promise<void> {
  for (const item of formas) {
    await client.query(
      `INSERT INTO pago_forma_pago (pago_id, forma_pago_id, nro_operacion) VALUES ($1, $2, $3)`,
      [pagoId, item.formaPagoId, item.nroOperacion],
    );
  }
}

/**
 * Obtiene la cabecera completa de un pago por su ID.
 */
export async function obtenerPagoPorId(
  id: number,
  ejecutor: Ejecutor = pool,
): Promise<PagoRow | null> {
  const sql = `
    SELECT
      p.id,
      p.comprobante,
      p.alumno_id,
      a.legajo AS alumno_legajo,
      a.nombre AS alumno_nombre,
      a.apellido AS alumno_apellido,
      a.dni AS alumno_dni,
      p.monto::text AS monto,
      p.fecha_pago::text AS fecha_pago,
      p.observaciones,
      p.usuario_id,
      u.nombre AS usuario_nombre,
      u.apellido AS usuario_apellido,
      p.created_at
    FROM pago p
    JOIN alumno a ON a.id = p.alumno_id
    JOIN usuario u ON u.id = p.usuario_id
    WHERE p.id = $1
  `;

  if ("query" in ejecutor && ejecutor !== pool) {
    const { rows } = await ejecutor.query<PagoRow>(sql, [id]);
    return rows[0] ?? null;
  }
  const filas = await query<PagoRow>(sql, [id]);
  return filas[0] ?? null;
}

/**
 * Obtiene las formas de pago asociadas a uno o más pagos.
 */
export async function obtenerPagoFormasPago(
  pagoIds: number[],
  ejecutor: Ejecutor = pool,
): Promise<PagoFormaPagoRow[]> {
  if (pagoIds.length === 0) return [];

  const sql = `
    SELECT
      pfp.id,
      pfp.pago_id,
      pfp.forma_pago_id,
      fp.nombre AS forma_pago_nombre,
      pfp.nro_operacion
    FROM pago_forma_pago pfp
    JOIN forma_pago fp ON fp.id = pfp.forma_pago_id
    WHERE pfp.pago_id = ANY($1)
    ORDER BY pfp.id ASC
  `;

  if ("query" in ejecutor && ejecutor !== pool) {
    const { rows } = await ejecutor.query<PagoFormaPagoRow>(sql, [pagoIds]);
    return rows;
  }
  return query<PagoFormaPagoRow>(sql, [pagoIds]);
}

/**
 * Obtiene el detalle de turnos asociados a uno o más pagos.
 */
export async function obtenerPagoTurnos(
  pagoIds: number[],
  ejecutor: Ejecutor = pool,
): Promise<PagoTurnoRow[]> {
  if (pagoIds.length === 0) return [];

  const sql = `
    SELECT
      pt.pago_id,
      pt.turno_id,
      t.codigo,
      t.fecha::text AS fecha,
      t.hora_inicio::text AS hora_inicio,
      t.hora_fin::text AS hora_fin,
      m.nombre AS materia_nombre,
      up.nombre AS profesor_nombre,
      up.apellido AS profesor_apellido,
      pt.importe::text AS importe
    FROM pago_turno pt
    JOIN turno t ON t.id = pt.turno_id
    JOIN materia m ON m.id = t.materia_id
    JOIN profesor p ON p.id = t.profesor_id
    JOIN usuario up ON up.id = p.usuario_id
    WHERE pt.pago_id = ANY($1)
    ORDER BY t.fecha ASC, t.hora_inicio ASC
  `;

  if ("query" in ejecutor && ejecutor !== pool) {
    const { rows } = await ejecutor.query<PagoTurnoRow>(sql, [pagoIds]);
    return rows;
  }
  return query<PagoTurnoRow>(sql, [pagoIds]);
}

/**
 * Lista el historial de pagos aplicando filtros opcionales de búsqueda, alumno y fechas.
 * Orden predeterminado: fecha_pago DESC, created_at DESC.
 */
export async function listarPagos(
  filtros: FiltrosListarPagos,
  ejecutor: Ejecutor = pool,
): Promise<PagoRow[]> {
  const condiciones: string[] = [];
  const params: unknown[] = [];

  if (filtros.busqueda) {
    params.push(`%${filtros.busqueda}%`);
    condiciones.push(`(
      p.comprobante ILIKE $${params.length}
      OR a.nombre ILIKE $${params.length}
      OR a.apellido ILIKE $${params.length}
      OR a.dni ILIKE $${params.length}
      OR a.legajo ILIKE $${params.length}
    )`);
  }

  if (filtros.alumnoId !== undefined) {
    params.push(filtros.alumnoId);
    condiciones.push(`p.alumno_id = $${params.length}`);
  }

  if (filtros.desde) {
    params.push(filtros.desde);
    condiciones.push(`p.fecha_pago >= $${params.length}::date`);
  }

  if (filtros.hasta) {
    params.push(filtros.hasta);
    condiciones.push(`p.fecha_pago <= $${params.length}::date`);
  }

  const where = condiciones.length > 0 ? `WHERE ${condiciones.join(" AND ")}` : "";
  const sql = `
    SELECT
      p.id,
      p.comprobante,
      p.alumno_id,
      a.legajo AS alumno_legajo,
      a.nombre AS alumno_nombre,
      a.apellido AS alumno_apellido,
      a.dni AS alumno_dni,
      p.monto::text AS monto,
      p.fecha_pago::text AS fecha_pago,
      p.observaciones,
      p.usuario_id,
      u.nombre AS usuario_nombre,
      u.apellido AS usuario_apellido,
      p.created_at
    FROM pago p
    JOIN alumno a ON a.id = p.alumno_id
    JOIN usuario u ON u.id = p.usuario_id
    ${where}
    ORDER BY p.fecha_pago DESC, p.created_at DESC
  `;

  if ("query" in ejecutor && ejecutor !== pool) {
    const { rows } = await ejecutor.query<PagoRow>(sql, params);
    return rows;
  }
  return query<PagoRow>(sql, params);
}
