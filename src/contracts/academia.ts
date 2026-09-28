// src/contracts/academia.ts
//
// CONTRATO DE ACADEMIA (sede física de la institución).
//
// Mismo formato que src/contracts/usuario.ts, que es la plantilla de referencia:
//   1. Rutas · 2. Request · 3. Tipos · 4. Response · 5. Errores.
//
// Lo que NO está acá, a propósito:
//  · `usuarioId` de quien opera → sale de la sesión, nunca del body.
//  · el horario de atención (agenda / agenda_semanal) → contrato propio,
//    src/contracts/agenda.ts. Una academia tiene exactamente una agenda, pero
//    son dos pantallas distintas.

import { z } from "zod";


// ─── 1. Rutas ────────────────────────────────────────────────────────────
//   GET    RUTA                 → listar (acepta los filtros de abajo)
//   POST   RUTA                 → crear
//   GET    rutaAcademia(id)     → detalle
//   PUT    rutaAcademia(id)     → editar
//   POST   rutaInactivar(id)    → baja lógica (estado = 'inactivo')

export const RUTA = "/api/academias";
export const rutaAcademia = (id: number) => `${RUTA}/${id}`;
export const rutaInactivar = (id: number) => `${RUTA}/${id}/inactivar`;


// ─── 2a. Request: filtros del listado ────────────────────────────────────

export const listarAcademiasQuery = z
  .object({
    busqueda: z.string().trim().optional(),          // nombre o dirección
    estado: z.enum(["activo", "inactivo"]).optional(),
  })
  .strict();


// ─── 2b. Request: alta y edición ─────────────────────────────────────────
// `direccion` es NOT NULL en la base: acá es obligatoria, no opcional.
// `telefono` es nullable: el front manda null cuando el campo queda vacío
// (nunca "", que entraría a la base como un teléfono de cero caracteres).

const camposAcademia = z
  .object({
    nombre: z.string().trim().min(1).max(100),
    direccion: z.string().trim().min(1).max(255),
    telefono: z.string().trim().max(30).nullable().default(null),
  })
  .strict();

export const crearAcademiaBody = camposAcademia;
export const editarAcademiaBody = camposAcademia;


// ─── 3. Tipos derivados ──────────────────────────────────────────────────

export type CrearAcademiaBody = z.input<typeof crearAcademiaBody>;
export type CrearAcademiaInput = z.output<typeof crearAcademiaBody>;
export type EditarAcademiaBody = z.input<typeof editarAcademiaBody>;
export type EditarAcademiaInput = z.output<typeof editarAcademiaBody>;
export type ListarAcademiasQuery = z.output<typeof listarAcademiasQuery>;


// ─── 4. Response ─────────────────────────────────────────────────────────

export type EstadoAcademia = "activo" | "inactivo";

export type AcademiaResponse = {
  id: number;
  nombre: string;
  direccion: string;
  telefono: string | null;
  estado: EstadoAcademia;
  /** ISO 8601. */
  fechaCreacion: string;
  /** ISO 8601. */
  fechaActualizacion: string;
};

/** Lo que devuelve el combo de academias (`<select>` de usuarios y profesores). */
export type AcademiaOpcion = Pick<AcademiaResponse, "id" | "nombre">;


// ─── 5. Errores de dominio ───────────────────────────────────────────────
// Shape: { "error": { "codigo": "NOMBRE_DUPLICADO", "mensaje": "...", "campo": "nombre" } }

export type ErrorAcademia =
  | "NOMBRE_DUPLICADO"           // 409, uq_academia_nombre_activa (case-insensitive)
  | "ACADEMIA_CON_USUARIOS"      // 409, al inactivar: tiene usuarios activos
  | "ACADEMIA_CON_TURNOS_FUTUROS"// 409, al inactivar: turnos reservados por venir
  | "NO_ENCONTRADO"              // 404
  | "DATOS_INVALIDOS";           // 422
