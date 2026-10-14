import type { Pool, PoolClient } from "pg";
import { pool, query } from "@/lib/db/client";
import type {
  CierreRow,
  FiltrosCierres,
  LineaPagoRow,
  MedioRow,
  TotalesRow,
} from "./caja.types";

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

/** Hoy en hora de Argentina ("yyyy-mm-dd"). */
export async function hoy(ejecutor: Ejecutor = pool): Promise<string> {
  const filas = await run<{ hoy: string }>(
    ejecutor,
    `SELECT ((now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date)::text AS hoy`,
    [],
  );
  return filas[0].hoy;
}

const SELECT_CIERRE = `
  SELECT
    c.id,
    c.fecha::text AS fecha,
    c.estado,
    c.total_registrado::text AS total_registrado,
    c.efectivo_registrado::text AS efectivo_registrado,
    c.efectivo_contado::text AS efectivo_contado,
    c.diferencia::text AS diferencia,
    c.observaciones,
    c.cerrado_por,
    uc.nombre AS cerrado_nombre,
    uc.apellido AS cerrado_apellido,
    c.cerrado_at,
    c.reabierto_por,
    ur.nombre AS reabierto_nombre,
    ur.apellido AS reabierto_apellido,
    c.reabierto_at,
    c.motivo_reapertura
  FROM cierre_caja c
  JOIN usuario uc ON uc.id = c.cerrado_por
  LEFT JOIN usuario ur ON ur.id = c.reabierto_por
`;

export async function findCierreById(id: number, ejecutor: Ejecutor = pool): Promise<CierreRow | null> {
  const filas = await run<CierreRow>(ejecutor, `${SELECT_CIERRE} WHERE c.id = $1`, [id]);
  return filas[0] ?? null;
}

/** Último cierre de la fecha (Cerrada o Reabierta). */
export async function ultimoCierre(fecha: string, ejecutor: Ejecutor = pool): Promise<CierreRow | null> {
  const filas = await run<CierreRow>(
    ejecutor,
    `${SELECT_CIERRE} WHERE c.fecha = $1::date ORDER BY c.cerrado_at DESC, c.id DESC LIMIT 1`,
    [fecha],
  );
  return filas[0] ?? null;
}

/** Historial de cierres, fecha descendente. */
export async function findCierres(filtros: FiltrosCierres, ejecutor: Ejecutor = pool): Promise<CierreRow[]> {
  const params: unknown[] = [];
  const condiciones: string[] = [];

  if (filtros.desde) {
    params.push(filtros.desde);
    condiciones.push(`c.fecha >= $${params.length}::date`);
  }
  if (filtros.hasta) {
    params.push(filtros.hasta);
    condiciones.push(`c.fecha <= $${params.length}::date`);
  }
  if (filtros.estado) {
    params.push(filtros.estado);
    condiciones.push(`c.estado = $${params.length}::estado_cierre_caja`);
  }

  const where = condiciones.length > 0 ? `WHERE ${condiciones.join(" AND ")}` : "";
  return run<CierreRow>(
    ejecutor,
    `${SELECT_CIERRE} ${where} ORDER BY c.fecha DESC, c.cerrado_at DESC, c.id DESC`,
    params,
  );
}

export async function cajaCerrada(fecha: string, ejecutor: Ejecutor = pool): Promise<boolean> {
  const filas = await run<{ cerrada: boolean }>(
    ejecutor,
    `SELECT fn_caja_cerrada($1::date) AS cerrada`,
    [fecha],
  );
  return Boolean(filas[0]?.cerrada);
}

/** Subtotales por medio, solo vigentes (`fn_caja_resumen`). */
export async function medios(fecha: string, ejecutor: Ejecutor = pool): Promise<MedioRow[]> {
  return run<MedioRow>(
    ejecutor,
    `SELECT
       r.forma_pago_id,
       r.medio,
       fp.es_efectivo,
       r.cantidad_comprobantes::text AS cantidad_comprobantes,
       r.subtotal::text AS subtotal
     FROM fn_caja_resumen($1::date) r
     JOIN forma_pago fp ON fp.id = r.forma_pago_id
     ORDER BY r.medio`,
    [fecha],
  );
}

/**
 * Total general, cantidad de comprobantes y efectivo registrado de los pagos
 * vigentes. Mismas cuentas que hace `fn_cierre_caja_validar` al cerrar.
 */
export async function totales(fecha: string, ejecutor: Ejecutor = pool): Promise<TotalesRow> {
  const filas = await run<TotalesRow>(
    ejecutor,
    `SELECT
       (SELECT COALESCE(sum(p.monto), 0) FROM pago p
         WHERE p.fecha_pago = $1::date AND p.estado = 'Vigente')::text AS total_general,
       (SELECT count(*) FROM pago p
         WHERE p.fecha_pago = $1::date AND p.estado = 'Vigente')::text AS cantidad_comprobantes,
       (SELECT COALESCE(sum(vm.monto_medio), 0) FROM vw_pago_medio vm
         WHERE vm.fecha_pago = $1::date AND vm.estado = 'Vigente' AND vm.es_efectivo)::text
         AS efectivo_registrado`,
    [fecha],
  );
  return filas[0];
}

/** Una línea por pago y medio (vigentes y anulados), como `fn_caja_detalle`. */
export async function lineas(fecha: string, ejecutor: Ejecutor = pool): Promise<LineaPagoRow[]> {
  return run<LineaPagoRow>(
    ejecutor,
    `SELECT
       vm.pago_id,
       vm.comprobante,
       vm.alumno_id,
       al.nombre AS alumno_nombre,
       al.apellido AS alumno_apellido,
       vm.forma_pago_id,
       vm.medio,
       vm.monto_medio::text AS monto,
       vm.usuario_id,
       us.nombre AS usuario_nombre,
       us.apellido AS usuario_apellido,
       vm.estado,
       pg.motivo_anulacion
     FROM vw_pago_medio vm
     JOIN pago pg ON pg.id = vm.pago_id
     JOIN alumno al ON al.id = vm.alumno_id
     JOIN usuario us ON us.id = vm.usuario_id
     WHERE vm.fecha_pago = $1::date
     ORDER BY vm.medio, vm.comprobante`,
    [fecha],
  );
}

/**
 * Cierre. Totales, diferencia, estado y usuario los calcula y fija
 * `fn_cierre_caja_validar`; los valores que se mandan son solo para las NOT NULL.
 */
export async function insertCierre(
  data: { fecha: string; efectivoContado: number; observaciones: string | null },
  usuarioId: number,
  client: PoolClient,
): Promise<number> {
  const { rows } = await client.query<{ id: number }>(
    `INSERT INTO cierre_caja
       (fecha, total_registrado, efectivo_registrado, efectivo_contado, diferencia, observaciones, cerrado_por)
     VALUES ($1::date, 0, 0, $2, 0, $3, $4)
     RETURNING id`,
    [data.fecha, data.efectivoContado, data.observaciones, usuarioId],
  );
  return rows[0].id;
}

export async function bloquearCierre(
  id: number,
  client: PoolClient,
): Promise<{ estado: string } | null> {
  const { rows } = await client.query<{ estado: string }>(
    `SELECT estado FROM cierre_caja WHERE id = $1 FOR UPDATE`,
    [id],
  );
  return rows[0] ?? null;
}

/** Reapertura: único UPDATE que admite el trigger. Usuario y fecha los pone él. */
export async function reabrir(id: number, motivo: string, client: PoolClient): Promise<void> {
  await client.query(
    `UPDATE cierre_caja SET estado = 'Reabierta', motivo_reapertura = $2 WHERE id = $1`,
    [id, motivo],
  );
}
