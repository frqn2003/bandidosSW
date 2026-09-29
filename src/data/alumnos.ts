// Capa de datos de Alumnos (HU-ALU-01 / HU-ALU-02).
//
// Consume los endpoints de la API mediante el cliente HTTP tipado con el contrato.
// Contrato: src/contracts/alumno.ts · Guía de uso: docs/contratos/alumno.md

import {
  RUTA,
  RUTA_POSIBLES_DUPLICADOS,
  rutaAlumno,
  rutaInactivar,
  rutaReactivar,
  type AlumnoResponse,
  type CrearAlumnoBody,
  type EditarAlumnoBody,
  type InactivarAlumnoBody,
  type ListarAlumnosQuery,
  type NivelEducativo,
  type PosiblesDuplicadosQuery,
  type ErrorAlumno,
} from "@/contracts/alumno";
import { apiGet, apiGetOpcional, apiSend } from "@/lib/api-client";
import { edadEnAnios } from "@/funciones/formato";

export type {
  AlumnoResponse,
  NivelEducativo,
  CrearAlumnoBody,
  EditarAlumnoBody,
  InactivarAlumnoBody,
  ListarAlumnosQuery,
  PosiblesDuplicadosQuery,
  ErrorAlumno,
};
export type EstadoAlumno = AlumnoResponse["estado"];

// Las rutas del contrato se re-exportan para que la pantalla no las importe de
// dos lados distintos.
export { RUTA, RUTA_POSIBLES_DUPLICADOS, rutaAlumno, rutaInactivar, rutaReactivar };


// ─── Helpers de dominio ──────────────────────────────────────────────────

/** Niveles del enum `nivel_materia`, que `alumno.nivel_educativo` reutiliza. */
export const NIVELES_EDUCATIVOS: NivelEducativo[] = [
  "Primario",
  "Secundario",
  "Universitario",
];

/** Un alumno es menor si no cumplió 18: define si el responsable es obligatorio. */
export const esMenorDeEdad = (fechaNacimiento: string) =>
  edadEnAnios(fechaNacimiento) < 18;

/** "Acosta, Julieta" — el orden con el que se lista y se ordena. */
export const nombreCompleto = (a: Pick<AlumnoResponse, "nombre" | "apellido">) =>
  `${a.apellido}, ${a.nombre}`;


// ─── API del módulo ──────────────────────────────────────────────────────

/**
 * Listado de alumnos con filtros del contrato.
 */
export async function listarAlumnos(
  filtros: ListarAlumnosQuery = {},
): Promise<AlumnoResponse[]> {
  const params = new URLSearchParams();
  if (filtros.busqueda) params.set("busqueda", filtros.busqueda);
  if (filtros.nivelEducativo) params.set("nivelEducativo", filtros.nivelEducativo);
  if (filtros.materiaInteresId) params.set("materiaInteresId", String(filtros.materiaInteresId));
  if (filtros.estado) params.set("estado", filtros.estado);
  if (filtros.verInactivos !== undefined) {
    params.set("verInactivos", String(filtros.verInactivos));
  }
  const qs = params.toString();
  const url = qs ? `${RUTA}?${qs}` : RUTA;
  return apiGet<AlumnoResponse[]>(url);
}

/**
 * Detalle de un alumno.
 */
export async function verAlumno(id: number): Promise<AlumnoResponse> {
  return apiGet<AlumnoResponse>(rutaAlumno(id));
}

/**
 * Alta de alumno.
 */
export async function crearAlumno(body: CrearAlumnoBody): Promise<AlumnoResponse> {
  return apiSend<AlumnoResponse>("POST", RUTA, body);
}

/**
 * Edición de alumno.
 */
export async function editarAlumno(
  id: number,
  body: EditarAlumnoBody,
): Promise<AlumnoResponse> {
  return apiSend<AlumnoResponse>("PUT", rutaAlumno(id), body);
}

/**
 * Baja lógica de alumno con soporte para confirmar con deuda.
 */
export async function inactivarAlumno(
  id: number,
  options: { confirmarConDeuda?: boolean } = {},
): Promise<AlumnoResponse> {
  const body: InactivarAlumnoBody = {
    confirmarConDeuda: Boolean(options.confirmarConDeuda),
  };
  return apiSend<AlumnoResponse>("POST", rutaInactivar(id), body);
}

/**
 * Reactivación lógica de un alumno inactivo (revalida unicidad de DNI).
 */
export async function reactivarAlumno(id: number): Promise<AlumnoResponse> {
  return apiSend<AlumnoResponse>("POST", rutaReactivar(id), {});
}

/**
 * Posibles duplicados: mismo nombre + apellido + fecha de nacimiento.
 *
 * Devuelve un array con las coincidencias encontradas o array vacío.
 */
export async function posiblesDuplicados(
  criterio: PosiblesDuplicadosQuery,
): Promise<AlumnoResponse[]> {
  const params = new URLSearchParams({
    nombre: criterio.nombre,
    apellido: criterio.apellido,
    fechaNacimiento: criterio.fechaNacimiento,
  });
  return apiGetOpcional<AlumnoResponse[]>(
    `${RUTA_POSIBLES_DUPLICADOS}?${params.toString()}`,
    [],
  );
}


// ─── Copys de los estados vacíos ─────────────────────────────────────────

export const VACIO_COPY = {
  sinDatos: {
    title: "Todavía no hay alumnos registrados",
    description:
      "Registrá el primer alumno para poder empezar a reservarle clases de apoyo.",
    cta: "Nuevo alumno",
  },
  sinResultados: {
    title: "Ningún alumno coincide con la búsqueda",
    description:
      "Probá con otro nombre, apellido, DNI o legajo, o mostrá también los inactivos.",
    cta: "Borrar búsqueda",
  },
};
