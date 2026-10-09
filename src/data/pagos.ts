// Capa de datos de Gestión de Pagos (HU-PAG-01).
// Consume los endpoints de la API mediante el cliente HTTP tipado con el contrato.
// Contratos: src/contracts/pago.ts · src/contracts/catalogo.ts

import {
  RUTA,
  RUTA_CLASES_PENDIENTES,
  RUTA_FORMAS_PAGO,
  rutaPago,
  type ClasePendientePagoResponse,
  type CrearPagoBody,
  type ListarPagosQuery,
  type PagoResponse,
} from "@/contracts/pago";
import type { FormaPagoResponse } from "@/contracts/catalogo";
import { apiGet, apiGetOpcional, apiSend } from "@/lib/api-client";

export type {
  ClasePendientePagoResponse,
  CrearPagoBody,
  FormaPagoResponse,
  ListarPagosQuery,
  PagoResponse,
};

export { RUTA, RUTA_CLASES_PENDIENTES, RUTA_FORMAS_PAGO, rutaPago };

/** Formato de moneda ARS para importes en la interfaz. */
export const formatearImporte = (valor: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);

/** Listado de pagos registrados (historial). */
export async function listarPagos(filtros: ListarPagosQuery = {}): Promise<PagoResponse[]> {
  const params = new URLSearchParams();
  if (filtros.busqueda) params.set("busqueda", filtros.busqueda);
  if (filtros.alumnoId) params.set("alumnoId", String(filtros.alumnoId));
  if (filtros.desde) params.set("desde", filtros.desde);
  if (filtros.hasta) params.set("hasta", filtros.hasta);
  const qs = params.toString();
  const url = qs ? `${RUTA}?${qs}` : RUTA;
  return apiGet<PagoResponse[]>(url);
}

/** Detalle de un comprobante de pago por ID. */
export async function verPago(id: number): Promise<PagoResponse> {
  return apiGet<PagoResponse>(rutaPago(id));
}

/** Registro de un nuevo pago de clases seleccionadas. */
export async function registrarPago(body: CrearPagoBody): Promise<PagoResponse> {
  return apiSend<PagoResponse>("POST", RUTA, body);
}

/** Clases dictadas pendientes de cobro (de un alumno o de todos si no se indica). */
export async function listarClasesPendientes(alumnoId?: number): Promise<ClasePendientePagoResponse[]> {
  const url = alumnoId !== undefined
    ? `${RUTA_CLASES_PENDIENTES}?alumnoId=${alumnoId}`
    : RUTA_CLASES_PENDIENTES;
  return apiGet<ClasePendientePagoResponse[]>(url);
}

/** Catálogo de formas de pago activas. */
export async function listarFormasPago(): Promise<FormaPagoResponse[]> {
  return apiGetOpcional<FormaPagoResponse[]>(`${RUTA_FORMAS_PAGO}?soloActivas=true`, []);
}
