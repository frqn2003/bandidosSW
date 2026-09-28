// src/contracts/disponibilidad.ts
//
// CONTRATO DE DISPONIBILIDAD DEL PROFESOR (tabla `agenda_profesional`).
//
// Son los bloques horarios semanales en los que un profesor atiende: "los lunes
// de 09:00 a 12:00". Cada bloque cuelga de una franja del horario de atención
// de la academia (`agenda_semanal`) y tiene que caer DENTRO de ella — de ahí
// `agendaSemanalId` en el body: el día de la semana no se elige acá, lo aporta
// la franja.
//
// Las horas son múltiplos de 30 minutos (CHECK ck_agenda_profesional_30min):
// el <select> del front ofrece :00 y :30, nada más.

import { z } from "zod";


// ─── 1. Rutas ────────────────────────────────────────────────────────────
//   GET    RUTA                 → listar bloques (filtrado por profesor)
//   POST   RUTA                 → crear bloque
//   PUT    rutaBloque(id)       → editar bloque
//   POST   rutaInactivar(id)    → baja lógica del bloque

export const RUTA = "/api/disponibilidad";
export const rutaBloque = (id: number) => `${RUTA}/${id}`;
export const rutaInactivar = (id: number) => `${RUTA}/${id}/inactivar`;


// ─── 2a. Request: filtros del listado ────────────────────────────────────
// `profesorId` es obligatorio: la pantalla siempre muestra la semana de UN
// profesor. Sin ese filtro el listado sería la agenda entera de la academia,
// que es otra pantalla (el calendario).

export const listarDisponibilidadQuery = z
  .object({
    profesorId: z.coerce.number().int().positive(),
    diaSemana: z.coerce.number().int().min(1).max(6).optional(),
    estado: z.enum(["activo", "inactivo"]).optional(),
  })
  .strict();


// ─── 2b. Request: alta y edición ─────────────────────────────────────────
// Media hora exacta: "09:00" o "09:30", nunca "09:15". El regex lo valida en
// los dos lados y evita el viaje al servidor.

const HORA_30 = /^([01]\d|2[0-3]):(00|30)$/;

const camposBloque = z
  .object({
    profesorId: z.number().int().positive(),
    /** Franja del horario de atención (define la academia y el día de la semana). */
    agendaSemanalId: z.number().int().positive(),
    horaInicio: z.string().regex(HORA_30, "La hora debe ser HH:00 o HH:30."),
    horaFin: z.string().regex(HORA_30, "La hora debe ser HH:00 o HH:30."),
  })
  .strict()
  .refine((v) => v.horaFin > v.horaInicio, {
    message: "La hora de fin tiene que ser posterior a la de inicio.",
    path: ["horaFin"],
  });

export const crearBloqueBody = camposBloque;
export const editarBloqueBody = camposBloque;


// ─── 3. Tipos derivados ──────────────────────────────────────────────────

export type CrearBloqueBody = z.input<typeof crearBloqueBody>;
export type CrearBloqueInput = z.output<typeof crearBloqueBody>;
export type EditarBloqueBody = z.input<typeof editarBloqueBody>;
export type EditarBloqueInput = z.output<typeof editarBloqueBody>;
export type ListarDisponibilidadQuery = z.output<typeof listarDisponibilidadQuery>;


// ─── 4. Response ─────────────────────────────────────────────────────────
// `diaSemana` no está en `agenda_profesional`: sale del JOIN con
// `agenda_semanal`. Viaja igual porque la grilla semanal del front necesita la
// columna del día sin pedir otra cosa.

export type EstadoDisponibilidad = "activo" | "inactivo";

/** 1 = lunes … 6 = sábado (ISO). */
export type DiaSemana = 1 | 2 | 3 | 4 | 5 | 6;

export type BloqueDisponibilidadResponse = {
  id: number;
  profesor: { id: number; nombre: string; apellido: string };
  agendaSemanalId: number;
  diaSemana: DiaSemana;
  /** "HH:MM" */
  horaInicio: string;
  /** "HH:MM" */
  horaFin: string;
  /** Horario de atención de la academia ese día, para dibujar los límites de la grilla. */
  franjaAtencion: { horaInicio: string; horaFin: string };
  estado: EstadoDisponibilidad;
};


// ─── 5. Errores de dominio ───────────────────────────────────────────────

export type ErrorDisponibilidad =
  | "BLOQUE_SUPERPUESTO"         // 409, ex_agenda_profesional_sin_superposicion
  | "FUERA_DE_HORARIO_ATENCION"  // 422, trg_agenda_profesional_validar_rango
  | "PROFESOR_DE_OTRA_ACADEMIA"  // 422, la franja es de otra academia
  | "RANGO_HORARIO_INVALIDO"     // 422, horaFin <= horaInicio
  | "HORA_NO_PERMITIDA"          // 422, no es múltiplo de 30 minutos
  | "BLOQUE_CON_TURNOS_FUTUROS"  // 409, al inactivar o achicar el bloque
  | "PROFESOR_INACTIVO"          // 422
  | "REFERENCIA_INVALIDA"        // 422, profesorId o agendaSemanalId inexistente
  | "NO_ENCONTRADO"              // 404
  | "DATOS_INVALIDOS";           // 422
