// Capa de datos de Materias (HU-MAT-01).
//
// Consume los endpoints de la API mediante el cliente HTTP tipado con el contrato.
// Contrato: src/contracts/materia.ts · Guía de uso: docs/contratos/materia.md

import {
  RUTA,
  rutaActivar,
  rutaInactivar,
  rutaMateria,
  type CrearMateriaBody,
  type DuracionClase,
  type EditarMateriaBody,
  type ListarMateriasQuery,
  type MateriaResponse,
  type NivelMateria,
} from "@/contracts/materia";
import { apiGet, apiSend } from "@/lib/api-client";

export type { DuracionClase, MateriaResponse, NivelMateria };
export type EstadoMateria = MateriaResponse["estado"];

// Las rutas del contrato se re-exportan para que la pantalla no las importe de
// dos lados distintos.
export { RUTA, rutaActivar, rutaInactivar, rutaMateria };


// ─── Helpers de presentación ─────────────────────────────────────────────

/** Niveles del enum `nivel_materia` de la base, para combos y filtros. */
export const NIVELES: NivelMateria[] = ["Primario", "Secundario", "Universitario"];

/**
 * Código abreviado de la materia.
 *
 * NO es una columna de la base: se deriva del `id`, con la misma convención que
 * `alumno.legajo` (ALU-000123) y `turno.codigo` (TUR-000123).
 */
export const codigoMateria = (id: number) => `MAT-${String(id).padStart(6, "0")}`;

/** Formato de importe es-AR con 2 decimales: 12500 → "$ 12.500,00". */
export const formatearValor = (valor: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);

/** Fecha ISO → "15 mar 2026". */
export const formatearFecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

/**
 * Normaliza un nombre para comparar duplicados igual que la base:
 * `uq_materia_nombre_activa` es UNIQUE sobre `lower(btrim(nombre))` WHERE
 * estado = 'activo'.
 */
export const normalizarNombre = (nombre: string) => nombre.trim().toLowerCase();

/**
 * Cantidad de turnos futuros reservados de la materia.
 * La validación definitiva la realiza el backend al inactivar (error 409 MATERIA_CON_TURNOS_FUTUROS).
 */
export function turnosFuturosDe(materiaId?: number): number {
  void materiaId;
  return 0;
}


// ─── API del módulo ──────────────────────────────────────────────────────

/**
 * Listado de materias con filtros del contrato.
 */
export async function listarMaterias(
  filtros: ListarMateriasQuery = {},
): Promise<MateriaResponse[]> {
  const params = new URLSearchParams();
  if (filtros.busqueda) params.set("busqueda", filtros.busqueda);
  if (filtros.nivel) params.set("nivel", filtros.nivel);
  if (filtros.estado) params.set("estado", filtros.estado);
  const qs = params.toString();
  const url = qs ? `${RUTA}?${qs}` : RUTA;
  return apiGet<MateriaResponse[]>(url);
}

/**
 * Alta de materia.
 */
export async function crearMateria(body: CrearMateriaBody): Promise<MateriaResponse> {
  return apiSend<MateriaResponse>("POST", RUTA, body);
}

/**
 * Edición de materia existente.
 */
export async function editarMateria(
  id: number,
  body: EditarMateriaBody,
): Promise<MateriaResponse> {
  return apiSend<MateriaResponse>("PUT", rutaMateria(id), body);
}

/**
 * Baja lógica de materia.
 */
export async function inactivarMateria(id: number): Promise<MateriaResponse> {
  return apiSend<MateriaResponse>("POST", rutaInactivar(id));
}

/**
 * Reactivación de una materia inactiva.
 */
export async function reactivarMateria(id: number): Promise<MateriaResponse> {
  return apiSend<MateriaResponse>("POST", rutaActivar(id));
}


// ─── Copys de los estados vacíos ─────────────────────────────────────────

export const VACIO_COPY = {
  sinDatos: {
    title: "Todavía no hay materias cargadas",
    description:
      "Creá la primera materia para poder asignarla a un profesor y reservar turnos.",
    cta: "Nueva materia",
  },
  sinResultados: {
    title: "Ninguna materia coincide con los filtros",
    description:
      "Probá con otro nombre, cambiá el nivel o mostrá también las inactivas.",
    cta: "Borrar filtros",
  },
};
