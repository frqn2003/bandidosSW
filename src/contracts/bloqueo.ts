// src/contracts/bloqueo.ts
//
// CONTRATO DE BLOQUEO DE FECHAS (HU-CAL-03): feriados, licencias y cierres.
//
// Reglas de negocio del módulo (las aplica el back; el front no las duplica):
//  · Solo el Gerente carga o da de baja bloqueos.
//  · `profesorId = null` significa "Todos" (bloquea a todos los profesores). Si se indica,
//    el profesor tiene que existir y estar activo.
//  · Un bloqueo NO se edita: se da de baja y se carga uno nuevo.
//  · La baja es lógica (`estado = 'inactivo'`, con fecha y usuario de baja). No hay DELETE.
//  · Una fecha bloqueada no admite reservas ni modificaciones hacia ella (error
//    `FECHA_BLOQUEADA` en el contrato de turno).
//  · Al cargar un bloqueo, los turnos 'Reservado' que caen dentro del rango NO se tocan:
//    la respuesta los lista (`turnosAfectados`) para que el Gerente los reprograme o cancele.
//  · Cada alta y baja queda en la bitácora (auditoria, tabla 'bloqueo_fecha').
//  · `usuarioId` sale de la sesión, nunca del body.

import { z } from "zod";


// ─── 1. Rutas ────────────────────────────────────────────────────────────
//   GET  RUTA            → listar bloqueos (vigentes por defecto)
//   POST RUTA            → cargar bloqueo (devuelve el bloqueo + turnos afectados)
//   POST rutaBaja(id)    → baja lógica

export const RUTA = "/api/bloqueos";
export const rutaBaja = (id: number) => `${RUTA}/${id}/baja`;


// ─── 2a. Request: filtros del listado ────────────────────────────────────

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Sin `estado` se devuelven solo los vigentes ('activo'). */
export const listarBloqueosQuery = z
  .object({
    estado: z.enum(["activo", "inactivo"]).optional(),
    /** Incluye los bloqueos de ese profesor y los de "Todos". */
    profesorId: z.coerce.number().int().positive().optional(),
    /** Bloqueos que se superponen con el rango [desde, hasta]. */
    desde: z.string().regex(FECHA, "Formato: aaaa-mm-dd.").optional(),
    hasta: z.string().regex(FECHA, "Formato: aaaa-mm-dd.").optional(),
  })
  .strict();


// ─── 2b. Request: alta ───────────────────────────────────────────────────

export const crearBloqueoBody = z
  .object({
    fechaDesde: z.string().regex(FECHA, "La fecha debe tener formato aaaa-mm-dd."),
    fechaHasta: z.string().regex(FECHA, "La fecha debe tener formato aaaa-mm-dd."),
    /** Obligatorio: un id de profesor activo o `null` para "Todos". */
    profesorId: z
      .number()
      .int()
      .positive({ message: "Debe indicar un profesor o 'Todos'." })
      .nullable(),
    motivo: z
      .string()
      .trim()
      .min(1, "Indicá el motivo.")
      .max(100, "Máximo 100 caracteres."),
  })
  .strict()
  .refine((v) => v.fechaHasta >= v.fechaDesde, {
    path: ["fechaHasta"],
    message: "La fecha hasta no puede ser anterior a la fecha desde.",
  });


// ─── 3. Tipos derivados ──────────────────────────────────────────────────

export type ListarBloqueosQuery = z.output<typeof listarBloqueosQuery>;
export type CrearBloqueoBody = z.input<typeof crearBloqueoBody>;
export type CrearBloqueoInput = z.output<typeof crearBloqueoBody>;


// ─── 4. Response ─────────────────────────────────────────────────────────

export type EstadoBloqueo = "activo" | "inactivo";

export type BloqueoResponse = {
  id: number;
  /** "yyyy-mm-dd" */
  fechaDesde: string;
  /** "yyyy-mm-dd" */
  fechaHasta: string;
  /** null = "Todos". */
  profesor: { id: number; nombre: string; apellido: string } | null;
  motivo: string;
  estado: EstadoBloqueo;
  registradoPor: { id: number; nombre: string; apellido: string };
  /** ISO 8601. */
  fechaCreacion: string;
  /** null mientras esté activo. ISO 8601. */
  fechaBaja: string | null;
  bajaPor: { id: number; nombre: string; apellido: string } | null;
};

/** Turno 'Reservado' que cae dentro del rango bloqueado. Se lista, no se modifica. */
export type TurnoAfectadoResponse = {
  id: number;
  codigo: string;
  /** "yyyy-mm-dd" */
  fecha: string;
  /** "HH:MM" */
  horaInicio: string;
  /** "HH:MM" */
  horaFin: string;
  alumno: { id: number; legajo: string; nombre: string; apellido: string };
  profesor: { id: number; nombre: string; apellido: string };
  materia: { id: number; nombre: string };
};

/** Respuesta del alta: el bloqueo creado + lo que hay que reprogramar o cancelar. */
export type CrearBloqueoResponse = {
  bloqueo: BloqueoResponse;
  turnosAfectados: TurnoAfectadoResponse[];
};


// ─── 5. Errores de dominio ───────────────────────────────────────────────

export type ErrorBloqueo =
  | "SIN_PERMISO"               // 403, solo el Gerente
  | "RANGO_INVALIDO"            // 422, fechaHasta < fechaDesde
  | "PROFESOR_INACTIVO"         // 422
  | "REFERENCIA_INVALIDA"       // 422, profesorId inexistente
  | "BLOQUEO_YA_DADO_DE_BAJA"   // 409
  | "NO_ENCONTRADO"             // 404
  | "DATOS_INVALIDOS";          // 422
