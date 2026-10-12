// src/contracts/asistencia.ts
//
// CONTRATO DE ASISTENCIA (HU-ASI-01): registro de asistencia por clase e
// historial de asistencia del alumno.
//
// Reglas de negocio del módulo (las aplica el back; el front no las duplica):
//  · "Mis clases del día": turnos del Profesor logueado para una fecha, no cancelados,
//    ordenados por hora de inicio ascendente. Incluye los ya registrados (Asistió/Ausente)
//    para poder corregirlos dentro del plazo.
//  · Registrar: solo sobre turnos 'Reservado' propios, desde `minutos_antes_asistencia`
//    (15) antes del inicio hasta el fin de la jornada. Un turno tiene una sola asistencia.
//    Al guardar, el turno pasa a 'Asistió' (presente) o 'Ausente'.
//  · `temaTrabajado` es obligatorio si `presente = true`.
//  · Corregir: el Profesor, hasta `horas_correccion_asistencia` (24 h) después de
//    registrar; pasado el plazo solo el Gerente, con `motivoCorreccion` obligatorio.
//  · Fecha/hora de registro y usuario responsable: los pone el back, no son editables.
//  · Historial del alumno: solo lectura. Mesa de Entrada y Gerente ven cualquier alumno;
//    el Profesor solo los que atiende. Sin borrado físico; cada alta/corrección queda
//    en la bitácora (auditoria, tabla 'asistencia').
//  · Porcentaje de asistencia = Asistió / (Asistió + Ausente), 1 decimal; las
//    canceladas no cuentan. Se calcula sobre los mismos filtros del listado.
//  · `usuarioId` sale de la sesión, nunca del body.

import { z } from "zod";


// ─── 1. Rutas ────────────────────────────────────────────────────────────
//   GET  RUTA_CLASES_DEL_DIA          → mis clases del día (Profesor logueado)
//   POST RUTA                         → registrar asistencia de un turno
//   PUT  rutaAsistencia(id)           → corregir una asistencia
//   GET  rutaHistorialAlumno(id)      → historial de asistencia + % (solo lectura)

export const RUTA = "/api/asistencia";
export const RUTA_CLASES_DEL_DIA = "/api/asistencia/clases-del-dia";
export const rutaAsistencia = (id: number) => `${RUTA}/${id}`;
export const rutaHistorialAlumno = (alumnoId: number) =>
  `/api/alumnos/${alumnoId}/historial-asistencia`;


// ─── 2a. Request: filtros ────────────────────────────────────────────────

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Sin `fecha` el back usa el día de hoy (hora de Argentina). */
export const listarClasesDelDiaQuery = z
  .object({
    fecha: z.string().regex(FECHA, "Formato: aaaa-mm-dd.").optional(),
  })
  .strict();

/** Filtros combinables del historial. Orden fijo: fecha descendente. */
export const listarHistorialQuery = z
  .object({
    desde: z.string().regex(FECHA, "Formato: aaaa-mm-dd.").optional(),
    hasta: z.string().regex(FECHA, "Formato: aaaa-mm-dd.").optional(),
    materiaId: z.coerce.number().int().positive().optional(),
    profesorId: z.coerce.number().int().positive().optional(),
    estado: z.enum(["Asistió", "Ausente", "Cancelado"]).optional(),
  })
  .strict();


// ─── 2b. Request: registro y corrección ──────────────────────────────────

const emptyToNull = (val: unknown) =>
  typeof val === "string" && val.trim() === "" ? null : val;

const temaTrabajado = z.preprocess(
  emptyToNull,
  z.string().trim().max(250, "Máximo 250 caracteres.").nullable().optional().default(null),
);

const observaciones = z.preprocess(
  emptyToNull,
  z.string().trim().max(500, "Máximo 500 caracteres.").nullable().optional().default(null),
);

const TEMA_REQUERIDO = "Indicá el tema trabajado.";

export const registrarAsistenciaBody = z
  .object({
    turnoId: z.number().int().positive({ message: "Debe indicar el turno." }),
    presente: z.boolean(),
    temaTrabajado,
    observaciones,
  })
  .strict()
  .refine((v) => !v.presente || !!v.temaTrabajado, {
    path: ["temaTrabajado"],
    message: TEMA_REQUERIDO,
  });

/**
 * Corrección. `motivoCorreccion` solo se exige (lo valida el back) cuando corrige
 * el Gerente fuera del plazo; el Profesor dentro del plazo no lo manda.
 */
export const corregirAsistenciaBody = z
  .object({
    presente: z.boolean(),
    temaTrabajado,
    observaciones,
    motivoCorreccion: z.preprocess(
      emptyToNull,
      z.string().trim().max(250, "Máximo 250 caracteres.").nullable().optional().default(null),
    ),
  })
  .strict()
  .refine((v) => !v.presente || !!v.temaTrabajado, {
    path: ["temaTrabajado"],
    message: TEMA_REQUERIDO,
  });


// ─── 3. Tipos derivados ──────────────────────────────────────────────────

export type ListarClasesDelDiaQuery = z.output<typeof listarClasesDelDiaQuery>;
export type ListarHistorialQuery = z.output<typeof listarHistorialQuery>;
export type RegistrarAsistenciaBody = z.input<typeof registrarAsistenciaBody>;
export type RegistrarAsistenciaInput = z.output<typeof registrarAsistenciaBody>;
export type CorregirAsistenciaBody = z.input<typeof corregirAsistenciaBody>;
export type CorregirAsistenciaInput = z.output<typeof corregirAsistenciaBody>;


// ─── 4. Response ─────────────────────────────────────────────────────────

/** Estados que puede tener una clase en este módulo (verde = Asistió, naranja = Ausente). */
export type EstadoClase = "Reservado" | "Asistió" | "Ausente" | "Cancelado";

export type AsistenciaResponse = {
  id: number;
  turnoId: number;
  presente: boolean;
  temaTrabajado: string | null;
  observaciones: string | null;
  /** Quién registró. */
  registradoPor: { id: number; nombre: string; apellido: string };
  /** ISO 8601. El front lo muestra como dd/mm/aaaa hh:mm. */
  registradoAt: string;
  /** null si nunca se corrigió. */
  modificadoAt: string | null;
  modificadoPor: { id: number; nombre: string; apellido: string } | null;
  /** Solo si corrigió el Gerente fuera del plazo. */
  motivoCorreccion: string | null;
};

/** Una fila de "Mis clases del día". */
export type ClaseDelDiaResponse = {
  turnoId: number;
  /** "TUR-000123". */
  codigo: string;
  alumno: { id: number; legajo: string; nombre: string; apellido: string };
  materia: { id: number; nombre: string };
  /** "yyyy-mm-dd" */
  fecha: string;
  /** "HH:MM" */
  horaInicio: string;
  /** "HH:MM" */
  horaFin: string;
  estado: EstadoClase;
  /** null mientras el turno está 'Reservado' sin registrar. */
  asistencia: AsistenciaResponse | null;
  /** Flags calculados por el back (ventana horaria, estado y plazo de corrección). */
  puedeRegistrar: boolean;
  puedeCorregir: boolean;
  /** Por qué están deshabilitados los botones, para el tooltip. */
  motivoDeshabilitado: string | null;
};

export type EstadoHistorial = "Asistió" | "Ausente" | "Cancelado";

/** Una fila del historial dentro de la ficha del alumno. */
export type HistorialAsistenciaItem = {
  turnoId: number;
  codigo: string;
  /** "yyyy-mm-dd" */
  fecha: string;
  /** "HH:MM" */
  horaInicio: string;
  materia: { id: number; nombre: string };
  profesor: { id: number; nombre: string; apellido: string };
  estado: EstadoHistorial;
  /** null si estuvo ausente o canceló. */
  temaTrabajado: string | null;
};

export type ResumenAsistencia = {
  clasesAsistio: number;
  clasesAusente: number;
  clasesCanceladas: number;
  /** 0–100 con un decimal; null si no hay clases Asistió ni Ausente. */
  porcentajeAsistencia: number | null;
};

export type HistorialAsistenciaResponse = {
  /** Fecha descendente. */
  items: HistorialAsistenciaItem[];
  resumen: ResumenAsistencia;
};


// ─── 5. Errores de dominio ───────────────────────────────────────────────

export type ErrorAsistencia =
  | "TURNO_AJENO"                   // 403, el Profesor registra/corrige solo sus turnos
  | "SIN_PERMISO"                   // 403, rol no habilitado (o profesor consultando un alumno que no atiende)
  | "TURNO_NO_RESERVADO"            // 409, solo se registra sobre turnos 'Reservado'
  | "ASISTENCIA_YA_REGISTRADA"      // 409, el turno ya tiene asistencia: se corrige, no se re-registra
  | "FUERA_DE_VENTANA_HORARIA"      // 422, antes de 15 min previos al inicio o pasado el fin de jornada
  | "PLAZO_CORRECCION_VENCIDO"      // 409, el Profesor pasó las 24 h: solo el Gerente
  | "MOTIVO_CORRECCION_REQUERIDO"   // 422, el Gerente corrige fuera de plazo sin motivo
  | "TEMA_REQUERIDO"                // 422, presente sin tema trabajado
  | "RANGO_INVALIDO"                // 422, hasta < desde
  | "NO_ENCONTRADO"                 // 404, turno, asistencia o alumno inexistente
  | "DATOS_INVALIDOS";              // 422
