// src/data/asistencia.ts
//
// Capa de datos de Asistencia (HU-ASI-01).
//
// Consume los endpoints de la API mediante el cliente HTTP tipado con el contrato.
// Contrato: src/contracts/asistencia.ts · Guía de uso: docs/contratos/asistencia.md
//
// El back toma el usuario de la sesión: el Profesor ve y registra solo sus
// turnos sin mandar su id; los flags puedeRegistrar/puedeCorregir ya vienen
// calculados.

import {
  RUTA,
  RUTA_CLASES_DEL_DIA,
  rutaAsistencia,
  rutaHistorialAlumno,
  type ClaseDelDiaResponse,
  type AsistenciaResponse,
  type HistorialAsistenciaResponse,
  type HistorialAsistenciaItem,
  type ResumenAsistencia,
  type RegistrarAsistenciaBody,
  type CorregirAsistenciaBody,
  type ListarClasesDelDiaQuery,
  type ListarHistorialQuery,
  type ErrorAsistencia,
} from "@/contracts/asistencia";
import { apiGet, apiSend } from "@/lib/api-client";
import { listarProfesores } from "@/data/profesores";

export {
  RUTA,
  RUTA_CLASES_DEL_DIA,
  rutaAsistencia,
  rutaHistorialAlumno,
  type ClaseDelDiaResponse,
  type AsistenciaResponse,
  type HistorialAsistenciaResponse,
  type HistorialAsistenciaItem,
  type ResumenAsistencia,
  type RegistrarAsistenciaBody,
  type CorregirAsistenciaBody,
  type ListarClasesDelDiaQuery,
  type ListarHistorialQuery,
  type ErrorAsistencia,
};

export type ProfesorOpcion = { id: number; nombre: string; apellido: string };

/**
 * Clases del día, ordenadas por hora de inicio ascendente.
 * Profesor: las suyas (el back usa la sesión). Gerente / Mesa de Entrada: todas,
 * o las de `profesorId`.
 */
export async function listarClasesDelDia(
  query: ListarClasesDelDiaQuery = {},
): Promise<ClaseDelDiaResponse[]> {
  const params = new URLSearchParams();
  if (query.fecha) params.set("fecha", query.fecha);
  if (query.profesorId) params.set("profesorId", String(query.profesorId));
  const qs = params.toString();
  return apiGet<ClaseDelDiaResponse[]>(qs ? `${RUTA_CLASES_DEL_DIA}?${qs}` : RUTA_CLASES_DEL_DIA);
}

/** Registra Presente o Ausente sobre un turno Reservado propio. */
export async function registrarAsistencia(
  body: RegistrarAsistenciaBody,
): Promise<AsistenciaResponse> {
  return apiSend<AsistenciaResponse>("POST", RUTA, body);
}

/** Corrige una asistencia (Profesor dentro del plazo; Gerente pasado el plazo, con motivo). */
export async function corregirAsistencia(
  asistenciaId: number,
  body: CorregirAsistenciaBody,
): Promise<AsistenciaResponse> {
  return apiSend<AsistenciaResponse>("PUT", rutaAsistencia(asistenciaId), body);
}

/** Historial de asistencia del alumno (modo LECTURA) con su resumen. */
export async function obtenerHistorialAlumno(
  alumnoId: number,
  query: ListarHistorialQuery = {},
): Promise<HistorialAsistenciaResponse> {
  const params = new URLSearchParams();
  if (query.desde) params.set("desde", query.desde);
  if (query.hasta) params.set("hasta", query.hasta);
  if (query.materiaId) params.set("materiaId", String(query.materiaId));
  if (query.profesorId) params.set("profesorId", String(query.profesorId));
  if (query.estado) params.set("estado", query.estado);
  const qs = params.toString();
  const url = rutaHistorialAlumno(alumnoId);
  return apiGet<HistorialAsistenciaResponse>(qs ? `${url}?${qs}` : url);
}

/** Profesores activos para el filtro de Gerente / Mesa de Entrada (id = profesor.id). */
export async function listarProfesoresAsistencia(): Promise<ProfesorOpcion[]> {
  const profesores = await listarProfesores({ estado: "activo" });
  return profesores
    .map((p) => ({ id: p.id, nombre: p.usuario.nombre, apellido: p.usuario.apellido }))
    .sort((a, b) => a.apellido.localeCompare(b.apellido) || a.nombre.localeCompare(b.nombre));
}
