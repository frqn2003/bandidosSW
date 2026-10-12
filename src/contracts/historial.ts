// src/contracts/historial.ts
//
// CONTRATO DE HISTORIAL DEL ALUMNO (HU-ALU-03): línea de tiempo y notas.
//
// Es la pestaña "Historial" de la ficha: una línea de tiempo de registros del sistema + notas
// de texto libre. No es una historia académica (sin evaluaciones). Distinto del historial de
// asistencia de HU-ASI-01 (`asistencia.ts`), que lista solo clases con su estado.
//
// Casi todo sale de la base: la vista `vw_historial_alumno` arma la línea de tiempo y
// `fn_historial_resumen` el resumen.
//
// Reglas de negocio del módulo (las aplica el back; el front no las duplica):
//  · Solo lectura, salvo agregar notas. Orden: fecha y hora del evento descendente.
//  · Quién accede: Mesa de Entrada y Gerente, a cualquier alumno; el Profesor solo a los alumnos
//    que atiende (`fn_profesor_atiende_alumno`). Las observaciones de la asistencia las ven
//    solo Mesa de Entrada, Gerente y Profesor. El historial de un alumno INACTIVO sigue siendo
//    accesible, en lectura.
//  · Tipos de evento: Reservado, Modificado (reprogramación), Cancelado (con motivo y marca de
//    cancelación tardía), Asistió, Ausente y Nota.
//  · Filtros combinables: rango de fechas (sobre la fecha y hora del evento), tipo, materia y
//    profesor. Las notas no tienen materia ni profesor: al filtrar por alguno de esos dos no
//    aparecen.
//  · Resumen: clases asistidas, ausencias, cancelaciones, % de asistencia = Asistió /
//    (Asistió + Ausente) con un decimal, y fecha de la última clase. Es del alumno completo
//    (`fn_historial_resumen`), no cambia con los filtros de la línea de tiempo.
//  · Notas: texto de hasta 500 caracteres. Las pueden agregar Mesa de Entrada, Gerente y el
//    Profesor (solo de los alumnos que atiende), y solo si el alumno está activo. No se editan
//    ni se borran: una corrección es una nota nueva. Cada nota queda en la bitácora
//    (auditoria, tabla 'nota_alumno').
//  · `usuarioId` y la fecha y hora de la nota los pone el back.

import { z } from "zod";


// ─── 1. Rutas ────────────────────────────────────────────────────────────
//   GET  rutaHistorial(alumnoId)  → línea de tiempo + resumen
//   POST rutaNotas(alumnoId)      → agregar una nota

export const rutaHistorial = (alumnoId: number) => `/api/alumnos/${alumnoId}/historial`;
export const rutaNotas = (alumnoId: number) => `/api/alumnos/${alumnoId}/notas`;


// ─── 2a. Request: filtros de la línea de tiempo ──────────────────────────

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

export const TIPOS_EVENTO = [
  "Reservado",
  "Modificado",
  "Cancelado",
  "Asistió",
  "Ausente",
  "Nota",
] as const;

export const listarHistorialAlumnoQuery = z
  .object({
    desde: z.string().regex(FECHA, "Formato: aaaa-mm-dd.").optional(),
    hasta: z.string().regex(FECHA, "Formato: aaaa-mm-dd.").optional(),
    tipo: z.enum(TIPOS_EVENTO).optional(),
    materiaId: z.coerce.number().int().positive().optional(),
    profesorId: z.coerce.number().int().positive().optional(),
  })
  .strict()
  .refine((v) => !v.desde || !v.hasta || v.hasta >= v.desde, {
    message: "La fecha hasta no puede ser anterior a la fecha desde.",
    path: ["hasta"],
  });


// ─── 2b. Request: nota ───────────────────────────────────────────────────

export const crearNotaBody = z
  .object({
    texto: z
      .string()
      .trim()
      .min(1, "Escribí la nota.")
      .max(500, "Máximo 500 caracteres."),
  })
  .strict();


// ─── 3. Tipos derivados ──────────────────────────────────────────────────

export type ListarHistorialAlumnoQuery = z.output<typeof listarHistorialAlumnoQuery>;
export type CrearNotaBody = z.input<typeof crearNotaBody>;
export type CrearNotaInput = z.output<typeof crearNotaBody>;


// ─── 4. Response ─────────────────────────────────────────────────────────

export type TipoEventoHistorial = (typeof TIPOS_EVENTO)[number];

/**
 * La vista entrega profesor y usuario como un solo texto "Apellido, Nombre":
 * por eso `nombreCompleto` y no `nombre`/`apellido` separados.
 */
export type PersonaHistorial = { id: number; nombreCompleto: string };

export type EventoHistorialResponse = {
  tipo: TipoEventoHistorial;
  /** Fecha y hora del evento en hora de Argentina, sin zona: "2026-10-11T14:30:00". */
  fechaHora: string;
  /** null en las notas. */
  materia: { id: number; nombre: string } | null;
  /** null en las notas. En 'Modificado' es el profesor nuevo. */
  profesor: PersonaHistorial | null;
  /**
   * Texto listo para mostrar. Reservado: "Clase 25/09/2026 10:00-11:00 · TUR-000123".
   * Modificado: "Reprogramado: … → …". Cancelado: "Motivo: … — … · Clase …". Asistió/Ausente: la clase.
   * Nota: el texto de la nota.
   */
  detalle: string;
  /**
   * Observaciones de la asistencia (Asistió/Ausente). null en el resto y cuando el rol no
   * puede verlas.
   */
  observaciones: string | null;
  /** true solo en Cancelado con menos de 24 h de anticipación. */
  cancelacionTardia: boolean;
  /** Quién canceló (solo en Cancelado). */
  responsableCancelacion: "Alumno" | "Profesor" | "Centro" | null;
  /** Usuario que registró el evento. */
  usuario: PersonaHistorial | null;
  /** null en las notas. */
  turnoId: number | null;
  /** "yyyy-mm-dd": día de la clase a la que se refiere el evento. null en las notas. */
  fechaClase: string | null;
  /** "HH:MM". null en las notas. */
  horaClase: string | null;
};

export type ResumenHistorialResponse = {
  clasesAsistidas: number;
  ausencias: number;
  cancelaciones: number;
  /** 0–100 con un decimal; null si no hay clases Asistió ni Ausente (se muestra "—"). */
  porcentajeAsistencia: number | null;
  /** "yyyy-mm-dd"; null si todavía no tuvo ninguna clase. */
  fechaUltimaClase: string | null;
};

export type HistorialAlumnoResponse = {
  /** Orden: fecha y hora descendente. */
  eventos: EventoHistorialResponse[];
  resumen: ResumenHistorialResponse;
  /** true si el alumno está inactivo: el front oculta "Agregar nota". */
  alumnoInactivo: boolean;
};

export type NotaResponse = {
  id: number;
  alumnoId: number;
  texto: string;
  registradoPor: { id: number; nombre: string; apellido: string };
  /** ISO 8601. */
  fechaCreacion: string;
};


// ─── 5. Errores de dominio ───────────────────────────────────────────────

export type ErrorHistorial =
  | "ACCESO_DENEGADO"            // 403, rol no habilitado (ej. el propio alumno)
  | "PROFESOR_NO_ATIENDE_ALUMNO" // 403, el Profesor solo accede a los alumnos que atiende
  | "ALUMNO_INACTIVO"            // 409, no se agregan notas a un alumno inactivo
  | "RANGO_INVALIDO"             // 422, hasta < desde
  | "NO_ENCONTRADO"              // 404, alumno inexistente
  | "DATOS_INVALIDOS";           // 422
