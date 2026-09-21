// src/contracts/agenda.ts
//
// CONTRATO DE HORARIO DE ATENCIÓN (tablas `agenda` + `agenda_semanal`).
//
// Una academia tiene exactamente una agenda (`agenda.academia_id` es UNIQUE) y
// esa agenda tiene N franjas semanales: "lunes de 08:00 a 13:00". Es el horario
// del centro, no el de cada profesor — la disponibilidad del profesor vive en
// src/contracts/disponibilidad.ts y tiene que caer DENTRO de estas franjas.
//
// La agenda no se crea ni se borra desde el front: nace con la academia. Lo que
// el ABM toca son las franjas.

import { z } from "zod";


// ─── 1. Rutas ────────────────────────────────────────────────────────────
//   GET    RUTA                        → la agenda de una academia, con sus franjas
//   POST   RUTA_FRANJAS                → crear franja
//   PUT    rutaFranja(id)              → editar franja
//   POST   rutaInactivarFranja(id)     → baja lógica de la franja

export const RUTA = "/api/agenda";
export const RUTA_FRANJAS = "/api/agenda/franjas";
export const rutaFranja = (id: number) => `${RUTA_FRANJAS}/${id}`;
export const rutaInactivarFranja = (id: number) => `${RUTA_FRANJAS}/${id}/inactivar`;


// ─── 2a. Request: la agenda de una academia ──────────────────────────────
// `academiaId` es obligatorio: no existe "la agenda" a secas, siempre es la de
// una sede. `incluirInactivas` sirve a la pantalla de edición, que necesita ver
// las franjas dadas de baja; el resto de las pantallas solo quiere las activas.

export const verAgendaQuery = z
  .object({
    academiaId: z.coerce.number().int().positive(),
    // Ojo: NO es z.coerce.boolean() — Boolean("false") es true y el filtro
    // haría lo contrario de lo que dice la URL.
    incluirInactivas: z
      .enum(["true", "false"])
      .transform((v) => v === "true")
      .optional(),
  })
  .strict();


// ─── 2b. Request: alta y edición de franjas ──────────────────────────────
// `diaSemana` es ISO 1..6 (lunes a sábado): el domingo no se atiende, por eso
// el máximo es 6 y no 7.
// Las horas viajan como "HH:MM" en 24h, que es lo que produce un <input
// type="time">. El back las manda a una columna `time`.

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

const camposFranja = z
  .object({
    agendaId: z.number().int().positive(),
    diaSemana: z.number().int().min(1).max(6),
    horaInicio: z.string().regex(HORA, "La hora debe tener formato HH:MM."),
    horaFin: z.string().regex(HORA, "La hora debe tener formato HH:MM."),
  })
  .strict()
  // Se puede validar acá porque los dos valores están en el mismo body: el
  // front no necesita ir al servidor para saber que 13:00–08:00 está mal.
  // La superposición con otra franja NO se puede validar acá (hace falta la
  // base) → la valida el EXCLUDE de Postgres y vuelve como FRANJA_SUPERPUESTA.
  .refine((v) => v.horaFin > v.horaInicio, {
    message: "La hora de fin tiene que ser posterior a la de inicio.",
    path: ["horaFin"],
  });

export const crearFranjaBody = camposFranja;
export const editarFranjaBody = camposFranja;


// ─── 3. Tipos derivados ──────────────────────────────────────────────────

export type CrearFranjaBody = z.input<typeof crearFranjaBody>;
export type CrearFranjaInput = z.output<typeof crearFranjaBody>;
export type EditarFranjaBody = z.input<typeof editarFranjaBody>;
export type EditarFranjaInput = z.output<typeof editarFranjaBody>;
export type VerAgendaQuery = z.output<typeof verAgendaQuery>;


// ─── 4. Response ─────────────────────────────────────────────────────────
// Las horas vuelven como "HH:MM" (no "HH:MM:SS"): pg devuelve `time` como
// "08:00:00" y el mapper recorta los segundos, para que el valor entre derecho
// en un <input type="time">.

export type EstadoAgenda = "activo" | "inactivo";

/** 1 = lunes … 6 = sábado (ISO). */
export type DiaSemana = 1 | 2 | 3 | 4 | 5 | 6;

export type FranjaSemanalResponse = {
  id: number;
  agendaId: number;
  diaSemana: DiaSemana;
  /** "HH:MM" */
  horaInicio: string;
  /** "HH:MM" */
  horaFin: string;
  estado: EstadoAgenda;
};

export type AgendaResponse = {
  id: number;
  academia: { id: number; nombre: string };
  nombre: string;
  estado: EstadoAgenda;
  /** Ordenadas por (diaSemana, horaInicio). */
  franjas: FranjaSemanalResponse[];
};


// ─── 5. Errores de dominio ───────────────────────────────────────────────

export type ErrorAgenda =
  | "FRANJA_SUPERPUESTA"         // 409, ex_agenda_semanal_sin_superposicion
  | "RANGO_HORARIO_INVALIDO"     // 422, horaFin <= horaInicio
  | "FRANJA_CON_DISPONIBILIDAD"  // 409, al inactivar: hay bloques de profesor adentro
  | "REFERENCIA_INVALIDA"        // 422, academiaId o agendaId inexistente
  | "NO_ENCONTRADO"              // 404
  | "DATOS_INVALIDOS";           // 422
