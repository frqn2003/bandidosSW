// src/contracts/calendario.ts
//
// CONTRATO DE CALENDARIO — huecos disponibles (HU-CAL-01).
//
// Solo lectura: no hay POST/PUT acá. Es la vista `vw_huecos_disponibles`, que
// para cada profesor y cada bloque de `agenda_profesional` proyecta los
// próximos 60 días y descuenta los turnos no cancelados. Reservar sobre un
// hueco es un POST a /api/turnos (src/contracts/turno.ts).
//
// Un hueco es informativo, no una reserva: entre que la pantalla lo muestra y
// el operador confirma, otro puede haber tomado el cupo. Por eso el alta de
// turno igual puede devolver SIN_CUPO, y el front tiene que manejarlo.

import { z } from "zod";


// ─── 1. Rutas ────────────────────────────────────────────────────────────
//   GET  RUTA_HUECOS  → huecos libres en un rango de fechas
//   GET  RUTA_AGENDA  → la agenda de un día: turnos reservados + huecos

export const RUTA_HUECOS = "/api/calendario/huecos";
export const RUTA_AGENDA = "/api/calendario/agenda";


// ─── 2a. Request: huecos ─────────────────────────────────────────────────
// `desde`/`hasta` son obligatorios e inclusive. La vista proyecta 60 días: un
// rango más largo se rechaza con RANGO_DEMASIADO_AMPLIO en vez de devolver
// silenciosamente menos de lo pedido.
// `duracionMinutos` filtra los huecos que no alcanzan para la clase: lo manda
// la pantalla de reserva con la duración de la materia elegida.

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

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
  });


// ─── 2b. Request: agenda de un día ───────────────────────────────────────

export const agendaDiaQuery = z
  .object({
    profesorId: z.coerce.number().int().positive(),
    fecha: z.string().regex(FECHA, "La fecha debe tener formato aaaa-mm-dd."),
  })
  .strict();


// ─── 3. Tipos derivados ──────────────────────────────────────────────────

export type HuecosQuery = z.output<typeof huecosQuery>;
export type AgendaDiaQuery = z.output<typeof agendaDiaQuery>;


// ─── 4. Response ─────────────────────────────────────────────────────────
// Los nombres salen de las columnas de la vista (`hueco_inicio`, `hueco_fin`)
// traducidos a camelCase en el mapper, más el profesor resuelto para que la
// grilla no tenga que cruzar contra otro endpoint.

export type HuecoResponse = {
  /** agenda_profesional.id — el bloque del que salió el hueco. */
  agendaProfesionalId: number;
  profesor: { id: number; nombre: string; apellido: string };
  /** "yyyy-mm-dd" */
  fecha: string;
  /** "HH:MM" */
  horaInicio: string;
  /** "HH:MM" */
  horaFin: string;
  /** Minutos del hueco: el front descarta los que no alcanzan para la materia. */
  duracionMinutos: number;
};

/** Un turno tal como lo pinta la grilla del calendario. El detalle completo
 *  está en TurnoResponse (src/contracts/turno.ts); acá va lo mínimo. */
export type TurnoCalendarioResponse = {
  id: number;
  codigo: string;
  alumno: { id: number; nombre: string; apellido: string };
  materia: { id: number; nombre: string };
  /** "HH:MM" */
  horaInicio: string;
  /** "HH:MM" */
  horaFin: string;
  estado: "Reservado" | "Cancelado";
};

export type AgendaDiaResponse = {
  profesor: { id: number; nombre: string; apellido: string };
  /** "yyyy-mm-dd" */
  fecha: string;
  /** Bloques de disponibilidad del profesor ese día (los límites de la grilla). */
  bloques: { horaInicio: string; horaFin: string }[];
  turnos: TurnoCalendarioResponse[];
  huecos: HuecoResponse[];
};


// ─── 5. Errores de dominio ───────────────────────────────────────────────

export type ErrorCalendario =
  | "RANGO_INVALIDO"         // 422, hasta < desde
  | "RANGO_DEMASIADO_AMPLIO" // 422, la vista proyecta 60 días
  | "REFERENCIA_INVALIDA"    // 422, profesorId o materiaId inexistente
  | "DATOS_INVALIDOS";       // 422
