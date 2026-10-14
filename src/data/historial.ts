// src/data/historial.ts
//
// Capa de datos de Historial del Alumno: Línea de Tiempo y Notas (HU-ALU-03).
//
// Consume los endpoints de la API mediante el cliente HTTP tipado con el contrato.
// Contrato: src/contracts/historial.ts · Guía de uso: docs/contratos/historial.md
//
// El back toma el usuario de la sesión: rol, acceso del Profesor y quién
// registra la nota no se mandan desde acá.

import {
  rutaHistorial,
  rutaNotas,
  type HistorialAlumnoResponse,
  type EventoHistorialResponse,
  type ResumenHistorialResponse,
  type NotaResponse,
  type ListarHistorialAlumnoQuery,
  type CrearNotaBody,
  type TipoEventoHistorial,
} from "@/contracts/historial";
import { apiGet, apiSend } from "@/lib/api-client";

export type HistoryEvent = EventoHistorialResponse;

export {
  rutaHistorial,
  rutaNotas,
  type HistorialAlumnoResponse,
  type EventoHistorialResponse,
  type ResumenHistorialResponse,
  type NotaResponse,
  type ListarHistorialAlumnoQuery,
  type CrearNotaBody,
  type TipoEventoHistorial,
};

/** Línea de tiempo (fecha y hora descendente) + resumen del alumno, en modo LECTURA. */
export async function obtenerHistorialAlumno(
  alumnoId: number,
  query: ListarHistorialAlumnoQuery = {},
): Promise<HistorialAlumnoResponse> {
  const params = new URLSearchParams();
  if (query.desde) params.set("desde", query.desde);
  if (query.hasta) params.set("hasta", query.hasta);
  if (query.tipo) params.set("tipo", query.tipo);
  if (query.materiaId) params.set("materiaId", String(query.materiaId));
  if (query.profesorId) params.set("profesorId", String(query.profesorId));
  const qs = params.toString();
  const url = rutaHistorial(alumnoId);
  return apiGet<HistorialAlumnoResponse>(qs ? `${url}?${qs}` : url);
}

/** Agrega una nota (máx. 500). No se edita ni se borra: una corrección es una nota nueva. */
export async function agregarNotaAlumno(
  alumnoId: number,
  body: CrearNotaBody,
): Promise<NotaResponse> {
  return apiSend<NotaResponse>("POST", rutaNotas(alumnoId), body);
}
