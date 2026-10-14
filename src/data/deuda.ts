// src/data/deuda.ts
//
// Capa de datos para HU-PAG-02: Listado de Deudores y Estado de Cuenta.
//
// Consume los endpoints de la API mediante el cliente HTTP tipado con el contrato.
// Contrato: src/contracts/deuda.ts · Guía de uso: docs/contratos/cobranza.md

import {
  RUTA_DEUDORES,
  rutaEstadoCuenta,
  type DeudoresResponse,
  type EstadoCuentaResponse,
  type ListarDeudoresQuery,
} from "@/contracts/deuda";
import { apiGet } from "@/lib/api-client";

export { RUTA_DEUDORES, rutaEstadoCuenta };
export type { DeudoresResponse, EstadoCuentaResponse, ListarDeudoresQuery };

/**
 * Listado de deudores (deuda > 0, monto descendente) y total general de los
 * filtros aplicados. El semáforo de antigüedad viene calculado por el back.
 */
export async function listarDeudores(
  filtros: ListarDeudoresQuery = {}
): Promise<DeudoresResponse> {
  const params = new URLSearchParams();
  if (filtros.busqueda) params.set("busqueda", filtros.busqueda);
  if (filtros.antiguedad) params.set("antiguedad", filtros.antiguedad);
  if (filtros.materiaId) params.set("materiaId", String(filtros.materiaId));
  if (filtros.profesorId) params.set("profesorId", String(filtros.profesorId));

  const qs = params.toString();
  return apiGet<DeudoresResponse>(qs ? `${RUTA_DEUDORES}?${qs}` : RUTA_DEUDORES);
}

/** Estado de cuenta del alumno (modo LECTURA): movimientos cronológicos y saldo. */
export async function obtenerEstadoCuenta(
  alumnoId: number
): Promise<EstadoCuentaResponse> {
  return apiGet<EstadoCuentaResponse>(rutaEstadoCuenta(alumnoId));
}
