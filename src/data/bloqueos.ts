// src/data/bloqueos.ts
//
// Capa de datos de Bloqueo de fechas (HU-CAL-03): feriados, licencias y cierres.
//
// Consume los endpoints de la API mediante el cliente HTTP tipado con el contrato.
// Contrato: src/contracts/bloqueo.ts · Guía de uso: docs/contratos/bloqueo.md

import {
  RUTA,
  rutaBaja,
  type BloqueoResponse,
  type CrearBloqueoBody,
  type CrearBloqueoResponse,
  type EstadoBloqueo,
  type ErrorBloqueo,
  type ListarBloqueosQuery,
  type TurnoAfectadoResponse,
} from "@/contracts/bloqueo";
import { apiGet, apiSend } from "@/lib/api-client";

export { RUTA, rutaBaja };
export type {
  BloqueoResponse,
  CrearBloqueoBody,
  CrearBloqueoResponse,
  EstadoBloqueo,
  ErrorBloqueo,
  ListarBloqueosQuery,
  TurnoAfectadoResponse,
};

/** Bloqueos (vigentes si no se indica `estado`), ordenados por fecha desde. */
export async function listarBloqueos(filtros: ListarBloqueosQuery = {}): Promise<BloqueoResponse[]> {
  const params = new URLSearchParams();
  if (filtros.estado) params.set("estado", filtros.estado);
  if (filtros.profesorId) params.set("profesorId", String(filtros.profesorId));
  if (filtros.desde) params.set("desde", filtros.desde);
  if (filtros.hasta) params.set("hasta", filtros.hasta);
  const qs = params.toString();
  return apiGet<BloqueoResponse[]>(qs ? `${RUTA}?${qs}` : RUTA);
}

/**
 * Carga un bloqueo (solo Gerente). `profesorId = null` = "Todos".
 * Devuelve los turnos 'Reservado' del rango: NO se modificaron, hay que
 * reprogramarlos o cancelarlos con los endpoints de turno.
 */
export async function crearBloqueo(body: CrearBloqueoBody): Promise<CrearBloqueoResponse> {
  return apiSend<CrearBloqueoResponse>("POST", RUTA, body);
}

/** Baja lógica (solo Gerente). */
export async function darDeBajaBloqueo(id: number): Promise<BloqueoResponse> {
  return apiSend<BloqueoResponse>("POST", rutaBaja(id));
}
