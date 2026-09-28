// src/contracts/turno.ts
//
// CONTRATO DE TURNO (HU-TUR-01 / HU-TUR-02).
//
// Reglas de negocio del módulo:
//  · Buscador: busca por código de turno, legajo, DNI, nombre o apellido del alumno.
//  · Precedencia de filtros:
//    - Si se especifica `estado`, se filtra estrictamente por ese estado.
//    - Si `verCancelados=true` (y sin `estado`), se devuelven turnos 'Reservado' y 'Cancelado'.
//    - Por defecto (`verCancelados` ausente o false), se devuelven solo turnos 'Reservado'.
//  · Modificación de turno (HU-TUR-02): solo para turnos en estado 'Reservado' con inicio futuro.
//    Permite cambiar profesor (filtrado por la materia), fecha, horario y observaciones.
//    Alumno y materia son fijos e inmutables.
//    Máximo de modificaciones: hasta 2 por turno (controlado por parámetro del sistema).
//  · Cancelación con motivo (HU-TUR-02): requiere motivoCancelacionId y detalle si aplica.
//    Calcula automáticamente si es 'cancelacionTardia' (< 24 horas de anticipación).
//  · Acciones calculadas por el back (`puedeModificar`, `puedeCancelar`):
//    Evita duplicar en el frontend las reglas de estado, fecha, hora, anticipación mínima y tope de modificaciones.

import { z } from "zod";
import { booleanQuery, RUTA_MOTIVOS_CANCELACION } from "./catalogo";

export { booleanQuery, RUTA_MOTIVOS_CANCELACION };


// ─── 1. Rutas ────────────────────────────────────────────────────────────
//   GET    RUTA               → listar turnos (Reservados por defecto)
//   POST   RUTA               → reservar
//   GET    rutaTurno(id)      → detalle
//   PUT    rutaTurno(id)      → modificar (profesor, fecha, hora, observaciones)
//   POST   rutaCancelar(id)   → cancelar con motivo (estado = 'Cancelado')

export const RUTA = "/api/turnos";
export const rutaTurno = (id: number) => `${RUTA}/${id}`;
export const rutaCancelar = (id: number) => `${RUTA}/${id}/cancelar`;


// ─── 2a. Request: filtros del listado ────────────────────────────────────

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

export const listarTurnosQuery = z
  .object({
    busqueda: z.string().trim().optional(), // código de turno, legajo, DNI, nombre o apellido del alumno
    alumnoId: z.coerce.number().int().positive().optional(),
    profesorId: z.coerce.number().int().positive().optional(),
    materiaId: z.coerce.number().int().positive().optional(),
    estado: z.enum(["Reservado", "Cancelado"]).optional(),
    verCancelados: booleanQuery.optional(),
    desde: z.string().regex(FECHA, "Formato: aaaa-mm-dd.").optional(),
    hasta: z.string().regex(FECHA, "Formato: aaaa-mm-dd.").optional(),
  })
  .strict();


// ─── 2b. Request: reserva, edición y cancelación ──────────────────────────

const emptyToNull = (val: unknown) =>
  typeof val === "string" && val.trim() === "" ? null : val;

export const crearTurnoBody = z
  .object({
    alumnoId: z.number().int().positive({ message: "Debe indicar el alumno." }),
    profesorId: z.number().int().positive({ message: "Debe indicar el profesor." }),
    materiaId: z.number().int().positive({ message: "Debe indicar la materia." }),
    fecha: z.string().regex(FECHA, "La fecha debe tener formato aaaa-mm-dd."),
    horaInicio: z.string().regex(HORA, "La hora debe tener formato HH:MM."),
    observaciones: z.preprocess(
      emptyToNull,
      z.string().trim().max(250, "Máximo 250 caracteres.").nullable().optional().default(null)
    ),
  })
  .strict();

/**
 * Edición de turno (HU-TUR-02):
 * Permite cambiar profesor (dentro de la misma materia), fecha, horario y observaciones.
 * Alumno y materia no se modifican.
 */
export const editarTurnoBody = z
  .object({
    profesorId: z.number().int().positive().optional(),
    fecha: z.string().regex(FECHA, "La fecha debe tener formato aaaa-mm-dd."),
    horaInicio: z.string().regex(HORA, "La hora debe tener formato HH:MM."),
    observaciones: z.preprocess(
      emptyToNull,
      z.string().trim().max(250, "Máximo 250 caracteres.").nullable().optional().default(null)
    ),
  })
  .strict();

/**
 * Cancelación con motivo (HU-TUR-02):
 * Requiere seleccionar un motivo de cancelación activo y detalle si el motivo lo exige.
 */
export const cancelarTurnoBody = z
  .object({
    motivoCancelacionId: z.number().int().positive({
      message: "Debe seleccionar un motivo de cancelación.",
    }),
    detalleCancelacion: z.preprocess(
      emptyToNull,
      z.string().trim().max(200, "El detalle no puede superar los 200 caracteres.").nullable().optional().default(null)
    ),
  })
  .strict();


// ─── 3. Tipos derivados ──────────────────────────────────────────────────

export type CrearTurnoBody = z.input<typeof crearTurnoBody>;
export type CrearTurnoInput = z.output<typeof crearTurnoBody>;
export type EditarTurnoBody = z.input<typeof editarTurnoBody>;
export type EditarTurnoInput = z.output<typeof editarTurnoBody>;
export type CancelarTurnoBody = z.input<typeof cancelarTurnoBody>;
export type CancelarTurnoInput = z.output<typeof cancelarTurnoBody>;
export type ListarTurnosQuery = z.output<typeof listarTurnosQuery>;


// ─── 4. Response ─────────────────────────────────────────────────────────

export type EstadoTurno = "Reservado" | "Cancelado";
export type NivelMateria = "Primario" | "Secundario" | "Universitario";

export type TurnoResponse = {
  id: number;
  /** Generado por la base: "TUR-000123". */
  codigo: string;
  alumno: { id: number; legajo: string; nombre: string; apellido: string; dni?: string };
  profesor: { id: number; nombre: string; apellido: string };
  materia: { id: number; nombre: string; nivel: NivelMateria; duracionClaseMinutos: number };
  /** "yyyy-mm-dd" */
  fecha: string;
  /** "HH:MM" */
  horaInicio: string;
  /** "HH:MM" — calculada con la duración de la materia. */
  horaFin: string;
  /** number, valor congelado al reservar. */
  valorClaseCongelado: number;
  estado: EstadoTurno;
  observaciones: string | null;
  /** Contador de modificaciones realizadas (máximo 2 según parámetro del sistema). */
  cantidadModificaciones: number;
  /** Flags calculados por el backend para habilitar/deshabilitar botones en frontend. */
  puedeModificar: boolean;
  puedeCancelar: boolean;
  motivoDeshabilitado?: string | null;
  /** Datos de cancelación si el estado es 'Cancelado'. */
  motivoCancelacion?: { id: number; nombre: string } | null;
  detalleCancelacion?: string | null;
  fechaCancelacion?: string | null;
  /** true si se canceló con menos de 24hs de anticipación. */
  cancelacionTardia?: boolean;
  /** true si el turno ya fue cobrado en un pago. */
  pagado?: boolean;
  /** Quién registró el turno (usuario que operaba en la sesión). */
  registradoPor: { id: number; nombre: string; apellido: string };
  /** ISO 8601. */
  fechaCreacion: string;
};


// ─── 5. Errores de dominio ───────────────────────────────────────────────

export type ErrorTurno =
  | "SIN_CUPO"                      // 409, cupo completo del profesor en esa franja
  | "ALUMNO_CON_TURNO_SUPERPUESTO"  // 409, el alumno ya tiene clase en ese horario
  | "FUERA_DE_DISPONIBILIDAD"       // 422, fuera de agenda del profesor
  | "ANTICIPACION_INSUFICIENTE"     // 422, menos de 2 horas de anticipación
  | "PROFESOR_NO_DICTA_MATERIA"     // 422, profesor_materia inexistente o inactivo
  | "PRECIO_NO_DEFINIDO"            // 422, falta precio_clase
  | "MAX_MODIFICACIONES_ALCANZADO"  // 409, superó el límite de 2 modificaciones
  | "TURNO_YA_CANCELADO"            // 409, no se puede modificar ni reactivar
  | "TURNO_YA_PAGADO"               // 409, no se modifica ni cancela un turno abonado
  | "TURNO_PASADO"                  // 409, no se modifica ni cancela un turno que ya inició
  | "MOTIVO_CANCELACION_REQUERIDO"  // 422, falta motivo al cancelar
  | "DETALLE_CANCELACION_REQUERIDO" // 422, si el motivo exige detalle
  | "MOTIVO_CANCELACION_INACTIVO"   // 422
  | "ALUMNO_INACTIVO"               // 422
  | "PROFESOR_INACTIVO"             // 422
  | "MATERIA_INACTIVA"              // 422
  | "REFERENCIA_INVALIDA"           // 422, id inexistente
  | "NO_ENCONTRADO"                 // 404
  | "DATOS_INVALIDOS";              // 422
