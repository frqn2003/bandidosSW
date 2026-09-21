// src/contracts/turno.ts
//
// CONTRATO DE TURNO (reserva de clase).
//
// Lo que el front NO manda, aunque esté en la tabla:
//  · `horaFin` → la calcula el back con `materia.duracion_clase_minutos`. Si la
//    mandara el front, dos pantallas podrían calcular distinto.
//  · `valorClaseCongelado` → sale de `precio_clase` (profesor + materia) al
//    momento de reservar. Un precio que viaja en el body es un precio que se
//    puede editar desde el navegador.
//  · `usuarioId` (quién registró) → sale de la sesión.
//  · `codigo` (TUR-000123) → lo genera la base.
//
// Reglas que valida el back y el front solo muestra (ninguna se puede expresar
// en zod porque necesitan la base): cupo del profesor, superposición del alumno,
// anticipación mínima de 2 horas y que el horario caiga en la disponibilidad.

import { z } from "zod";


// ─── 1. Rutas ────────────────────────────────────────────────────────────
//   GET    RUTA               → listar (acepta los filtros de abajo)
//   POST   RUTA               → reservar
//   GET    rutaTurno(id)      → detalle
//   PUT    rutaTurno(id)      → reprogramar (fecha/hora/observaciones)
//   POST   rutaCancelar(id)   → cancelar (estado = 'Cancelado'; NO se borra)

export const RUTA = "/api/turnos";
export const rutaTurno = (id: number) => `${RUTA}/${id}`;
export const rutaCancelar = (id: number) => `${RUTA}/${id}/cancelar`;


// ─── 2a. Request: filtros del listado ────────────────────────────────────
// `desde`/`hasta` son fechas "yyyy-mm-dd" inclusive. La pantalla de agenda
// manda las dos con el mismo valor para ver un día.

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

export const listarTurnosQuery = z
  .object({
    busqueda: z.string().trim().optional(),          // código, legajo o apellido del alumno
    alumnoId: z.coerce.number().int().positive().optional(),
    profesorId: z.coerce.number().int().positive().optional(),
    materiaId: z.coerce.number().int().positive().optional(),
    estado: z.enum(["Reservado", "Cancelado"]).optional(),
    desde: z.string().regex(FECHA).optional(),
    hasta: z.string().regex(FECHA).optional(),
  })
  .strict();


// ─── 2b. Request: reserva y reprogramación ───────────────────────────────

export const crearTurnoBody = z
  .object({
    alumnoId: z.number().int().positive(),
    profesorId: z.number().int().positive(),
    materiaId: z.number().int().positive(),
    fecha: z.string().regex(FECHA, "La fecha debe tener formato aaaa-mm-dd."),
    horaInicio: z.string().regex(HORA, "La hora debe tener formato HH:MM."),
    observaciones: z.string().trim().max(250).nullable().default(null),
  })
  .strict();

// Reprogramar no cambia alumno, profesor ni materia: eso sería otro turno (se
// cancela y se reserva de nuevo, y la auditoría queda con las dos filas).
export const editarTurnoBody = z
  .object({
    fecha: z.string().regex(FECHA, "La fecha debe tener formato aaaa-mm-dd."),
    horaInicio: z.string().regex(HORA, "La hora debe tener formato HH:MM."),
    observaciones: z.string().trim().max(250).nullable().default(null),
  })
  .strict();

// Cancelar no lleva body: el motivo, si hace falta, va por observaciones antes
// de cancelar. Se declara el schema vacío para que el back lo parsee igual.
export const cancelarTurnoBody = z.object({}).strict();


// ─── 3. Tipos derivados ──────────────────────────────────────────────────

export type CrearTurnoBody = z.input<typeof crearTurnoBody>;
export type CrearTurnoInput = z.output<typeof crearTurnoBody>;
export type EditarTurnoBody = z.input<typeof editarTurnoBody>;
export type EditarTurnoInput = z.output<typeof editarTurnoBody>;
export type ListarTurnosQuery = z.output<typeof listarTurnosQuery>;


// ─── 4. Response ─────────────────────────────────────────────────────────

export type EstadoTurno = "Reservado" | "Cancelado";
export type NivelMateria = "Primario" | "Secundario" | "Universitario";

export type TurnoResponse = {
  id: number;
  /** Generado por la base: "TUR-000123". */
  codigo: string;
  alumno: { id: number; legajo: string; nombre: string; apellido: string };
  profesor: { id: number; nombre: string; apellido: string };
  materia: { id: number; nombre: string; nivel: NivelMateria; duracionClaseMinutos: number };
  /** "yyyy-mm-dd" */
  fecha: string;
  /** "HH:MM" */
  horaInicio: string;
  /** "HH:MM" — la calculó el back con la duración de la materia. */
  horaFin: string;
  /** number, no string: el mapper convierte el numeric de pg. */
  valorClaseCongelado: number;
  estado: EstadoTurno;
  observaciones: string | null;
  /** Quién registró el turno (usuario.id de la sesión que lo creó). */
  registradoPor: { id: number; nombre: string; apellido: string };
  /** ISO 8601. */
  fechaCreacion: string;
};


// ─── 5. Errores de dominio ───────────────────────────────────────────────
// `SIN_CUPO` y `ALUMNO_CON_TURNO_SUPERPUESTO` son los dos que el front tiene
// que mostrar sí o sí: los puede recibir aunque la pantalla mostrara el hueco
// como libre (otro operador reservó primero).

export type ErrorTurno =
  | "SIN_CUPO"                      // 409, se llenó el cupo del profesor en esa franja
  | "ALUMNO_CON_TURNO_SUPERPUESTO"  // 409, ex_turno_alumno_sin_superposicion
  | "FUERA_DE_DISPONIBILIDAD"       // 422, el horario no cae en un bloque del profesor
  | "ANTICIPACION_INSUFICIENTE"     // 422, faltan menos de 2 horas
  | "PROFESOR_NO_DICTA_MATERIA"     // 422, no hay profesor_materia para ese par
  | "PRECIO_NO_DEFINIDO"            // 422, no hay precio_clase vigente para ese par
  | "ALUMNO_INACTIVO"               // 422
  | "PROFESOR_INACTIVO"             // 422
  | "MATERIA_INACTIVA"              // 422
  | "TURNO_YA_CANCELADO"            // 409, al cancelar o reprogramar
  | "TURNO_PASADO"                  // 409, no se toca un turno que ya ocurrió
  | "REFERENCIA_INVALIDA"           // 422, alumnoId, profesorId o materiaId inexistente
  | "NO_ENCONTRADO"                 // 404
  | "DATOS_INVALIDOS";              // 422
