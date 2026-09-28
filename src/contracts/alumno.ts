// src/contracts/alumno.ts
//
// CONTRATO DE ALUMNO (HU-ALU-01 / HU-ALU-02).
//
// Reglas de negocio del módulo:
//  · Menor de 18 (calculado según hora argentina) ⇒ los tres datos del responsable son obligatorios.
//  · Mayor de 18 ⇒ regla "todo o nada": o los tres datos del responsable son nulos, o los tres se completan.
//  · Posible duplicado (mismo nombre + apellido + fecha de nacimiento): aviso de UX.
//  · Ficha completa (HU-ALU-02): institución de origen, observaciones generales y materias de interés.
//    Al editar, el backend valida que solo las materias de interés *nuevas* estén activas (las ya asignadas
//    se pueden conservar aunque queden inactivas en el catálogo).
//  · Baja lógica (HU-ALU-02):
//    - Bloqueo duro si el alumno tiene turnos futuros reservados: `ALUMNO_CON_TURNOS_FUTUROS`
//      (devuelve `{ cantidadTurnosFuturos: number }` en el campo `datos` del error).
//    - Si el alumno tiene deuda pendiente (clases pasadas no abonadas), `deudaPendiente` es true.
//      Al inactivar, si no se envió `confirmarConDeuda: true`, se devuelve `ALUMNO_CON_DEUDA` para advertir.
//  · Reactivación (HU-ALU-02): vuelve el estado a 'activo' revalidando DNI único.
//  · Listado (Precedencia de filtros):
//    - Si se especifica `estado`, filtra por ese estado.
//    - Si `verInactivos=true` (y sin `estado`), devuelve activos e inactivos.
//    - Por defecto (`verInactivos` ausente o false), devuelve ÚNICAMENTE activos.

import { z } from "zod";
import { booleanQuery } from "./catalogo";

export { booleanQuery };

/** Fecha de hoy en huso horario de Argentina (America/Argentina/Buenos_Aires). */
export const hoyAR = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());


// ─── 1. Rutas ────────────────────────────────────────────────────────────
//   GET    RUTA                     → listar alumnos (activos por defecto)
//   POST   RUTA                     → crear alumno
//   GET    rutaAlumno(id)           → detalle / ficha completa
//   PUT    rutaAlumno(id)           → editar ficha
//   POST   rutaInactivar(id)        → baja lógica
//   POST   rutaReactivar(id)        → reactivación lógica (estado = 'activo')
//   GET    RUTA_POSIBLES_DUPLICADOS → advertencia antes de confirmar alta

export const RUTA = "/api/alumnos";
export const rutaAlumno = (id: number) => `${RUTA}/${id}`;
export const rutaInactivar = (id: number) => `${RUTA}/${id}/inactivar`;
export const rutaReactivar = (id: number) => `${RUTA}/${id}/reactivar`;
export const RUTA_POSIBLES_DUPLICADOS = "/api/alumnos/posibles-duplicados";


// ─── 2a. Request: filtros del listado ────────────────────────────────────

export const listarAlumnosQuery = z
  .object({
    busqueda: z.string().trim().optional(), // legajo, nombre, apellido o dni
    nivelEducativo: z.enum(["Primario", "Secundario", "Universitario"]).optional(),
    materiaInteresId: z.coerce.number().int().positive().optional(),
    estado: z.enum(["activo", "inactivo"]).optional(),
    verInactivos: booleanQuery.optional(),
  })
  .strict();


// ─── 2b. Request: aviso de posible duplicado ─────────────────────────────

export const posiblesDuplicadosQuery = z
  .object({
    nombre: z.string().trim().min(1),
    apellido: z.string().trim().min(1),
    fechaNacimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .strict();


// ─── 2c. Request: alta, edición y baja ───────────────────────────────────

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const TELEFONO = /^\d{10,11}$/;
const DOCUMENTO = /^\d{7,8}$/;

/** Años cumplidos a la fecha de hoy en huso horario de Argentina. */
function edad(fechaNacimiento: string): number {
  const [anioNac, mesNac, diaNac] = fechaNacimiento.split("-").map(Number);
  const [anioHoy, mesHoy, diaHoy] = hoyAR().split("-").map(Number);
  let anios = anioHoy - anioNac;
  if (mesHoy < mesNac || (mesHoy === mesNac && diaHoy < diaNac)) anios--;
  return anios;
}

const emptyToNull = (val: unknown) =>
  typeof val === "string" && val.trim() === "" ? null : val;

const camposAlumno = z
  .object({
    nombre: z.string().trim().min(1).max(50),
    apellido: z.string().trim().min(1).max(50),
    dni: z.string().trim().regex(DOCUMENTO, "El DNI debe tener 7 u 8 dígitos."),
    fechaNacimiento: z
      .string()
      .regex(FECHA, "La fecha debe tener formato aaaa-mm-dd.")
      .refine((v) => v <= hoyAR(), {
        message: "La fecha de nacimiento no puede ser futura.",
      }),
    telefono: z
      .string()
      .trim()
      .regex(TELEFONO, "El teléfono debe tener 10 u 11 dígitos, sin guiones."),
    email: z.preprocess(
      emptyToNull,
      z.string().trim().max(120).email("Email inválido.").nullable().optional().default(null)
    ),
    nivelEducativo: z.enum(["Primario", "Secundario", "Universitario"]),
    responsableNombre: z.preprocess(
      emptyToNull,
      z.string().trim().max(100).nullable().optional().default(null)
    ),
    responsableDni: z.preprocess(
      emptyToNull,
      z.string().trim().regex(DOCUMENTO, "El DNI del responsable debe tener 7 u 8 dígitos.").nullable().optional().default(null)
    ),
    responsableTelefono: z.preprocess(
      emptyToNull,
      z.string().trim().regex(TELEFONO, "El teléfono del responsable debe tener 10 u 11 dígitos.").nullable().optional().default(null)
    ),
    institucionOrigen: z.preprocess(
      emptyToNull,
      z.string().trim().max(100, "La institución no puede superar 100 caracteres.").nullable().optional().default(null)
    ),
    observacionesGenerales: z.preprocess(
      emptyToNull,
      z.string().trim().max(250, "Las observaciones no pueden superar 250 caracteres.").nullable().optional().default(null)
    ),
    materiasInteresIds: z
      .array(z.number().int().positive())
      .optional()
      .default([]),
  })
  .strict()
  .superRefine((v, ctx) => {
    const esMenor = edad(v.fechaNacimiento) < 18;
    const resp = [
      ["responsableNombre", v.responsableNombre],
      ["responsableDni", v.responsableDni],
      ["responsableTelefono", v.responsableTelefono],
    ] as const;

    if (esMenor) {
      // Menor de 18: los tres datos son obligatorios
      for (const [campo, valor] of resp) {
        if (!valor) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [campo],
            message: "Dato obligatorio para un alumno menor de 18 años.",
          });
        }
      }
    } else {
      // Mayor de 18: regla "todo o nada"
      const completados = resp.filter(([, val]) => Boolean(val)).length;
      if (completados > 0 && completados < 3) {
        for (const [campo, valor] of resp) {
          if (!valor) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: [campo],
              message: "Si se cargan datos del responsable, deben completarse nombre, DNI y teléfono.",
            });
          }
        }
      }
    }
  });

export const crearAlumnoBody = camposAlumno;
export const editarAlumnoBody = camposAlumno;

/** Body opcional para confirmar la baja lógica aun cuando el alumno posee deuda pendiente. */
export const inactivarAlumnoBody = z
  .object({
    confirmarConDeuda: z.boolean().optional().default(false),
  })
  .strict();

export const reactivarAlumnoBody = z.object({}).strict();


// ─── 3. Tipos derivados ──────────────────────────────────────────────────

export type CrearAlumnoBody = z.input<typeof crearAlumnoBody>;
export type CrearAlumnoInput = z.output<typeof crearAlumnoBody>;
export type EditarAlumnoBody = z.input<typeof editarAlumnoBody>;
export type EditarAlumnoInput = z.output<typeof editarAlumnoBody>;
export type InactivarAlumnoBody = z.input<typeof inactivarAlumnoBody>;
export type InactivarAlumnoInput = z.output<typeof inactivarAlumnoBody>;
export type ListarAlumnosQuery = z.output<typeof listarAlumnosQuery>;
export type PosiblesDuplicadosQuery = z.output<typeof posiblesDuplicadosQuery>;


// ─── 4. Response ─────────────────────────────────────────────────────────

export type NivelEducativo = "Primario" | "Secundario" | "Universitario";
export type EstadoAlumno = "activo" | "inactivo";

export type AlumnoResponse = {
  id: number;
  /** Generado por la base: "ALU-000123". */
  legajo: string;
  nombre: string;
  apellido: string;
  dni: string;
  /** "yyyy-mm-dd" */
  fechaNacimiento: string;
  telefono: string;
  email: string | null;
  nivelEducativo: NivelEducativo;
  responsable: { nombre: string; dni: string; telefono: string } | null;
  estado: EstadoAlumno;
  /** Ficha ampliada (HU-ALU-02) */
  institucionOrigen: string | null;
  observacionesGenerales: string | null;
  materiasInteres: { id: number; nombre: string }[];
  /** Indica si posee clases dictadas impagas (HU-ALU-02: advertencia previa a la baja). */
  deudaPendiente: boolean;
  /** ISO 8601. */
  fechaCreacion: string;
  /** ISO 8601. */
  fechaActualizacion: string;
};

/** Lo que devuelve el combo de alumnos (alta de turno). */
export type AlumnoOpcion = Pick<AlumnoResponse, "id" | "legajo" | "nombre" | "apellido">;


// ─── 5. Errores de dominio ───────────────────────────────────────────────

export type ErrorAlumno =
  | "DNI_DUPLICADO"              // 409, uq_alumno_dni_activo
  | "RESPONSABLE_REQUERIDO"      // 422, menor de 18 sin datos completos del responsable
  | "FECHA_NACIMIENTO_INVALIDA"  // 422, futura
  | "ALUMNO_CON_TURNOS_FUTUROS"  // 409, al inactivar si tiene reservas futuras (datos: { cantidadTurnosFuturos })
  | "ALUMNO_CON_DEUDA"           // 409, al inactivar con deuda si no envió confirmarConDeuda: true
  | "MATERIA_INTERES_INACTIVA"   // 422, al intentar agregar una nueva materia dada de baja
  | "ALUMNO_YA_INACTIVO"         // 409
  | "ALUMNO_YA_ACTIVO"           // 409
  | "NO_ENCONTRADO"              // 404
  | "DATOS_INVALIDOS";           // 422
