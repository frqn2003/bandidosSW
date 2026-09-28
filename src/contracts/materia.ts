// src/contracts/materia.ts
//
// CONTRATO DE MATERIA — catálogo global (no depende de la academia).
//
// Ojo con el precio: `valor_clase` es el valor de referencia de la materia, y
// cambiarlo rige solo hacia adelante. El precio que se cobra por un turno sale
// de `precio_clase` (profesor + materia) y el turno guarda una copia congelada
// al reservar → ver src/contracts/profesor.ts y src/contracts/turno.ts.

import { z } from "zod";


// ─── 1. Rutas ────────────────────────────────────────────────────────────
//   GET    RUTA                → listar (acepta los filtros de abajo)
//   POST   RUTA                → crear
//   GET    rutaMateria(id)     → detalle
//   PUT    rutaMateria(id)     → editar
//   POST   rutaInactivar(id)   → baja lógica (estado = 'inactivo')
//   POST   rutaActivar(id)     → reactivación (estado = 'activo')

export const RUTA = "/api/materias";
export const rutaMateria = (id: number) => `${RUTA}/${id}`;
export const rutaInactivar = (id: number) => `${RUTA}/${id}/inactivar`;
export const rutaActivar = (id: number) => `${RUTA}/${id}/activar`;


// ─── 2a. Request: filtros del listado ────────────────────────────────────

export const listarMateriasQuery = z
  .object({
    busqueda: z.string().trim().optional(),          // nombre o descripción
    nivel: z.enum(["Primario", "Secundario", "Universitario"]).optional(),
    estado: z.enum(["activo", "inactivo"]).optional(),
  })
  .strict();


// ─── 2b. Request: alta y edición ─────────────────────────────────────────
// `duracionClaseMinutos` es una lista cerrada en la base (CHECK IN 30/45/60/
// 90/120): acá es un enum numérico, así el <select> del front y el CHECK de la
// base no se pueden desincronizar.
// `valorClase` viaja como number con 2 decimales. En la base es numeric(12,2),
// y pg lo devuelve como STRING: el mapper del back tiene que hacer Number(...).

export const DURACIONES_CLASE = [30, 45, 60, 90, 120] as const;

const camposMateria = z
  .object({
    nombre: z.string().trim().min(1).max(80),
    nivel: z.enum(["Primario", "Secundario", "Universitario"]),
    descripcion: z.string().trim().max(250).nullable().default(null),
    duracionClaseMinutos: z.union([
      z.literal(30), z.literal(45), z.literal(60), z.literal(90), z.literal(120),
    ]),
    valorClase: z.number().positive().max(9_999_999_999.99).multipleOf(0.01),
  })
  .strict();

export const crearMateriaBody = camposMateria;
export const editarMateriaBody = camposMateria;


// ─── 3. Tipos derivados ──────────────────────────────────────────────────

export type CrearMateriaBody = z.input<typeof crearMateriaBody>;
export type CrearMateriaInput = z.output<typeof crearMateriaBody>;
export type EditarMateriaBody = z.input<typeof editarMateriaBody>;
export type EditarMateriaInput = z.output<typeof editarMateriaBody>;
export type ListarMateriasQuery = z.output<typeof listarMateriasQuery>;


// ─── 4. Response ─────────────────────────────────────────────────────────

export type NivelMateria = "Primario" | "Secundario" | "Universitario";
export type EstadoMateria = "activo" | "inactivo";
export type DuracionClase = (typeof DURACIONES_CLASE)[number];

export type MateriaResponse = {
  id: number;
  nombre: string;
  nivel: NivelMateria;
  descripcion: string | null;
  duracionClaseMinutos: DuracionClase;
  /** number, no string: el mapper convierte el numeric de pg. */
  valorClase: number;
  estado: EstadoMateria;
  /** ISO 8601. */
  fechaCreacion: string;
  /** ISO 8601. */
  fechaActualizacion: string;
};

/** Lo que devuelve el combo de materias. Lleva la duración porque la pantalla
 *  de turnos calcula la hora de fin con ella antes de enviar. */
export type MateriaOpcion = Pick<
  MateriaResponse,
  "id" | "nombre" | "nivel" | "duracionClaseMinutos"
>;


// ─── 5. Errores de dominio ───────────────────────────────────────────────

export type ErrorMateria =
  | "NOMBRE_DUPLICADO"           // 409, uq_materia_nombre_activa
  | "MATERIA_CON_TURNOS_FUTUROS" // 409, al inactivar
  | "MATERIA_ASIGNADA"           // 409, al inactivar: hay profesores que la dictan
  | "MATERIA_INACTIVA"           // 409, al editar una materia inactiva
  | "NO_ENCONTRADO"              // 404
  | "DATOS_INVALIDOS";           // 422
