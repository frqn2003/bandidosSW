// src/contracts/calendario.ts
//
// CONTRATO DE CALENDARIO (HU-CAL-01 / HU-CAL-02).
//
// Funcionalidades:
//  · Vista Mensual (HU-CAL-02): resumen de cantidad de turnos por día para el mes seleccionado.
//  · Vista Semana / Día (HU-CAL-02): grilla con turnos y huecos. Admite consulta por día (`fecha`)
//    o rango semanal (`desde` / `hasta`) para evitar múltiples llamadas en la vista Semana.
//  · Filtros combinables: `profesorId` y `materiaId` (ambos opcionales). Si no se filtran,
//    se muestran todos los turnos de los profesores activos.
//  · Agrupación por columnas en vista Día: cada bloque trae `profesorId` y la respuesta incluye
//    el listado de profesores para armar las columnas.
//  · `verCancelados`: booleanQuery (false por defecto).
//  · Huecos proyectados: límite máximo de 60 días (acorde a la vista `vw_huecos_disponibles`).
//  · Actualización en tiempo real (30 s): implementada vía polling en la capa de frontend.

import { z } from "zod";
import { booleanQuery } from "./catalogo";

export { booleanQuery };


// ─── 1. Rutas ────────────────────────────────────────────────────────────
//   GET  RUTA_HUECOS  → huecos libres proyectados en un rango de fechas (máx. 60 días)
//   GET  RUTA_AGENDA  → turnos y bloques de un día o rango semanal
//   GET  RUTA_MES     → resumen de turnos por día en la vista mensual

export const RUTA_HUECOS = "/api/calendario/huecos";
export const RUTA_AGENDA = "/api/calendario/agenda";
export const RUTA_MES = "/api/calendario/mes";


// ─── 2a. Request: huecos ─────────────────────────────────────────────────

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Valida que el rango de huecos no supere los 60 días de la vista vw_huecos_disponibles. */
function validarRangoHuecos(desde: string, hasta: string): boolean {
  const d1 = new Date(`${desde}T00:00:00Z`);
  const d2 = new Date(`${hasta}T00:00:00Z`);
  const diffDias = (d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24);
  return diffDias >= 0 && diffDias <= 60;
}

export const huecosQuery = z
  .object({
    profesorId: z.coerce.number().int().positive().optional(),
    materiaId: z.coerce.number().int().positive().optional(),
    desde: z.string().regex(FECHA, "La fecha debe tener formato aaaa-mm-dd."),
    hasta: z.string().regex(FECHA, "La fecha debe tener formato aaaa-mm-dd."),
    duracionMinutos: z.coerce.number().int().positive().max(240).optional(),
  })
  .strict()
  .refine((v) => v.hasta >= v.desde, {
    message: "La fecha de fin no puede ser anterior a la de inicio.",
    path: ["hasta"],
  })
  .refine((v) => validarRangoHuecos(v.desde, v.hasta), {
    message: "El rango de consulta de huecos no puede superar los 60 días.",
    path: ["hasta"],
  });


// ─── 2b. Request: agenda (día o rango semanal) ───────────────────────────

export const agendaQuery = z
  .object({
    profesorId: z.coerce.number().int().positive().optional(),
    materiaId: z.coerce.number().int().positive().optional(),
    fecha: z.string().regex(FECHA, "Formato: aaaa-mm-dd.").optional(),
    desde: z.string().regex(FECHA, "Formato: aaaa-mm-dd.").optional(),
    hasta: z.string().regex(FECHA, "Formato: aaaa-mm-dd.").optional(),
    verCancelados: booleanQuery.optional().default("false"),
  })
  .strict()
  .refine((v) => Boolean(v.fecha || (v.desde && v.hasta)), {
    message: "Debe indicar una 'fecha' puntual o un rango 'desde' y 'hasta'.",
  });

export const agendaDiaQuery = agendaQuery;


// ─── 2c. Request: resumen mensual ────────────────────────────────────────

export const calendarioMesQuery = z
  .object({
    anio: z.coerce.number().int().min(2020).max(2050),
    mes: z.coerce.number().int().min(1).max(12),
    profesorId: z.coerce.number().int().positive().optional(),
    materiaId: z.coerce.number().int().positive().optional(),
    verCancelados: booleanQuery.optional().default("false"),
  })
  .strict();


// ─── 3. Tipos derivados ──────────────────────────────────────────────────

export type HuecosQuery = z.output<typeof huecosQuery>;
export type AgendaQuery = z.output<typeof agendaQuery>;
export type AgendaDiaQuery = z.output<typeof agendaDiaQuery>;
export type CalendarioMesQuery = z.output<typeof calendarioMesQuery>;


// ─── 4. Response ─────────────────────────────────────────────────────────

export type HuecoResponse = {
  /** agenda_profesional.id */
  agendaProfesionalId: number;
  profesor: { id: number; nombre: string; apellido: string };
  /** "yyyy-mm-dd" */
  fecha: string;
  /** "HH:MM" */
  horaInicio: string;
  /** "HH:MM" */
  horaFin: string;
  duracionMinutos: number;
};

/** Un turno tal como lo pinta la grilla del calendario. */
export type TurnoCalendarioResponse = {
  id: number;
  codigo: string;
  /** "yyyy-mm-dd" */
  fecha?: string;
  alumno: { id: number; nombre: string; apellido: string };
  profesor: { id: number; nombre: string; apellido: string };
  materia: { id: number; nombre: string };
  /** "HH:MM" */
  horaInicio: string;
  /** "HH:MM" */
  horaFin: string;
  estado: "Reservado" | "Cancelado";
  puedeModificar?: boolean;
  puedeCancelar?: boolean;
  cantidadModificaciones?: number;
  cancelacionTardia?: boolean;
  pagado?: boolean;
  /** 9º campo del panel lateral de detalle (brief HU-CAL-02). */
  observaciones?: string | null;
};

export type BloqueHorarioResponse = {
  profesorId?: number;
  diaSemana?: number;
  horaInicio: string;
  horaFin: string;
};

export type AgendaDiaResponse = {
  profesor?: { id: number; nombre: string; apellido: string } | null;
  /** Lista de profesores incluidos para armar las columnas de la vista Día. */
  profesores?: { id: number; nombre: string; apellido: string }[];
  /** "yyyy-mm-dd" */
  fecha: string;
  /** Bloques de disponibilidad con profesorId asociado. */
  bloques: BloqueHorarioResponse[];
  turnos: TurnoCalendarioResponse[];
  huecos: HuecoResponse[];
};

export type DiaResumenMesResponse = {
  /** "yyyy-mm-dd" */
  fecha: string;
  cantidadTurnos: number;
};

export type CalendarioMesResponse = {
  anio: number;
  mes: number;
  dias: DiaResumenMesResponse[];
};


// ─── 5. Errores de dominio ───────────────────────────────────────────────

export type ErrorCalendario =
  | "RANGO_INVALIDO"         // 422, hasta < desde
  | "RANGO_DEMASIADO_AMPLIO" // 422, rango mayor a 60 días para huecos
  | "REFERENCIA_INVALIDA"    // 422, profesorId o materiaId inexistente
  | "ACCESO_DENEGADO"        // 403, profesor intentando ver agenda de otro
  | "DATOS_INVALIDOS";       // 422
