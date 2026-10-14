// src/data/caja.ts
//
// Capa de datos para HU-PAG-02: Cierre de Caja Diario.
//
// Consume los endpoints de la API mediante el cliente HTTP tipado con el contrato.
// Contrato: src/contracts/caja.ts · Guía de uso: docs/contratos/cobranza.md

import {
  RUTA,
  RUTA_CIERRES,
  rutaReabrir,
  type CajaDelDiaResponse,
  type CerrarCajaBody,
  type CierreCajaResponse,
  type ListarCierresQuery,
  type ReabrirCajaBody,
} from "@/contracts/caja";
import { hoyAR } from "@/contracts/alumno";
import { apiGet, apiSend } from "@/lib/api-client";

export { RUTA, RUTA_CIERRES, rutaReabrir };
export type { CajaDelDiaResponse, CerrarCajaBody, CierreCajaResponse, ReabrirCajaBody };

/** Caja de una fecha: pagos vigentes por medio, anulados aparte y estado del cierre. */
export async function obtenerCajaDelDia(fecha: string = hoyAR()): Promise<CajaDelDiaResponse> {
  return apiGet<CajaDelDiaResponse>(`${RUTA}?fecha=${fecha}`);
}

/** Cierra la caja de una fecha. Totales y diferencia los calcula el back. */
export async function cerrarCaja(body: CerrarCajaBody): Promise<CierreCajaResponse> {
  return apiSend<CierreCajaResponse>("POST", RUTA_CIERRES, body);
}

/** Reabre una caja cerrada (solo Gerente, con motivo). */
export async function reabrirCaja(
  cierreId: number,
  body: ReabrirCajaBody
): Promise<CierreCajaResponse> {
  return apiSend<CierreCajaResponse>("POST", rutaReabrir(cierreId), body);
}

/** Historial de cierres de caja, fecha descendente. */
export async function listarHistorialCierres(
  filtros: ListarCierresQuery = {}
): Promise<CierreCajaResponse[]> {
  const params = new URLSearchParams();
  if (filtros.desde) params.set("desde", filtros.desde);
  if (filtros.hasta) params.set("hasta", filtros.hasta);
  if (filtros.estado) params.set("estado", filtros.estado);
  const qs = params.toString();
  return apiGet<CierreCajaResponse[]>(qs ? `${RUTA_CIERRES}?${qs}` : RUTA_CIERRES);
}
