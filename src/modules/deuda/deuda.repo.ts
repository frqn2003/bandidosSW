import { query } from "@/lib/db/client";
import type { AlumnoCuentaRow, DeudorRow, FiltrosDeudores, MovimientoRow } from "./deuda.types";

/** `antiguedad` del contrato → rango de días de `fn_deudores`. */
const RANGOS: Record<NonNullable<FiltrosDeudores["antiguedad"]>, [number, number | null]> = {
  "0-30": [0, 30],
  "31-60": [31, 60],
  "mas-60": [61, null],
};

/**
 * Deudores con deuda > 0, por monto descendente. La definición de clase
 * adeudada, el semáforo y el total general los resuelve `fn_deudores`.
 */
export async function deudores(filtros: FiltrosDeudores): Promise<DeudorRow[]> {
  const [diasMin, diasMax] = filtros.antiguedad ? RANGOS[filtros.antiguedad] : [null, null];
  return query<DeudorRow>(
    `SELECT
       d.alumno_id,
       d.legajo,
       d.apellido,
       d.nombre,
       d.dni,
       d.clases_adeudadas::text AS clases_adeudadas,
       d.monto_adeudado::text AS monto_adeudado,
       d.fecha_mas_antigua::text AS fecha_mas_antigua,
       d.dias_antiguedad,
       d.semaforo,
       d.total_general::text AS total_general
     FROM fn_deudores($1::int, $2::int, $3::int, $4::int, $5::text) d`,
    [
      filtros.materiaId ?? null,
      filtros.profesorId ?? null,
      diasMin,
      diasMax,
      filtros.busqueda ?? null,
    ],
  );
}

export async function obtenerAlumno(alumnoId: number): Promise<AlumnoCuentaRow | null> {
  const filas = await query<AlumnoCuentaRow>(
    `SELECT id, legajo, nombre, apellido, dni FROM alumno WHERE id = $1`,
    [alumnoId],
  );
  return filas[0] ?? null;
}

/** Movimientos en orden cronológico con saldo acumulado (`fn_estado_cuenta`). */
export async function estadoCuenta(alumnoId: number): Promise<MovimientoRow[]> {
  return query<MovimientoRow>(
    `SELECT
       e.fecha::text AS fecha,
       e.hora::text AS hora,
       e.tipo,
       e.referencia_id,
       e.referencia,
       e.detalle,
       e.estado,
       e.cargo::text AS cargo,
       e.credito::text AS credito,
       e.afecta_saldo,
       e.saldo_acumulado::text AS saldo_acumulado
     FROM fn_estado_cuenta($1) e`,
    [alumnoId],
  );
}
