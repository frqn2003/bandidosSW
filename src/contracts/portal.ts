// src/contracts/portal.ts
//
// CONTRATO DEL PORTAL DEL ALUMNO (HU-POR-01): reservar un turno y consultar "Mis turnos".
//
// El portal tiene endpoints PROPIOS (no reutiliza /api/turnos ni los catálogos de gestión):
// el alumno no puede ver datos de pagos (`valorClaseCongelado`, precios de materia) ni de
// otros alumnos. El alumno sale siempre de la SESIÓN: no viaja en ninguna request.
//
// Reglas de negocio del módulo (las aplica el back; el front no las duplica):
//  · Acceso: solo el rol Alumno con una ficha de alumno ACTIVA asociada
//    (`fn_alumno_de_usuario`). Una cuenta sin ficha activa → CUENTA_SIN_FICHA.
//    Un alumno inactivo no puede iniciar sesión (se inactiva su cuenta al inactivar la ficha;
//    el login falla con el error genérico de `auth.ts`).
//  · El menú del Alumno es "Reservar turno", "Mis turnos" y "Cerrar sesión". Cualquier otro
//    módulo (URL a mano o endpoint de gestión) → ACCESO_DENEGADO y queda registrado como
//    `acceso_denegado` en la bitácora de sesiones (auditoria_sesion).
//  · Reservar: mismas validaciones que HU-TUR-01 (`turno.ts`): materia, profesor, fecha,
//    horario libre con cupo, no superposición, anticipación mínima, fecha no bloqueada.
//    El turno queda con `origen = 'Portal del Alumno'` y el usuario de la sesión como
//    registrante (lo fija el trigger `fn_turno_validar_portal`); la reserva queda en la bitácora
//    de cambios (auditoria, tabla 'turno').
//  · Límite de turnos futuros: como máximo `max_turnos_futuros_alumno` (5 por defecto,
//    parámetro configurable por el Gerente) turnos 'Reservado' con inicio futuro. Al superarlo
//    → LIMITE_TURNOS_FUTUROS (mensaje en rojo).
//  · Mis turnos: por defecto los turnos 'Reservado' con inicio futuro, en orden ascendente.
//    Con `verHistorial = true` se suman los pasados y los cancelados, y la lista completa va en
//    orden de fecha y hora DESCENDENTE. Sin datos de pagos.
//  · Horarios libres: se piden a `RUTA_HUECOS` de `calendario.ts` (no trae precios), que el back
//    habilita también para el rol Alumno.
//  · Opcionales no incluidos acá: cancelar turno propio, historial de asistencia, pagos y saldo,
//    email de confirmación.
//
// "Habilitar acceso al portal" (Mesa de Entrada / Gerente, desde la ficha) vive en `alumno.ts`.

import { z } from "zod";
import { booleanQuery } from "./catalogo";
import { crearTurnoBody, type ErrorTurno, type EstadoTurno, type NivelMateria } from "./turno";

export { RUTA_HUECOS } from "./calendario";


// ─── 1. Rutas ────────────────────────────────────────────────────────────
//   GET  RUTA_TURNOS      → Mis turnos
//   POST RUTA_TURNOS      → reservar un turno (para el alumno de la sesión)
//   GET  RUTA_MATERIAS    → materias que se pueden reservar (combo)
//   GET  RUTA_PROFESORES  → profesores que dictan una materia (combo)

export const RUTA_TURNOS = "/api/portal/turnos";
export const RUTA_MATERIAS = "/api/portal/materias";
export const RUTA_PROFESORES = "/api/portal/profesores";


// ─── 2a. Request: Mis turnos y combos ────────────────────────────────────

export const misTurnosQuery = z
  .object({
    /** false (por defecto): próximos Reservados. true: suma pasados y cancelados. */
    verHistorial: booleanQuery.optional().default("false"),
  })
  .strict();

export const profesoresPortalQuery = z
  .object({
    materiaId: z.coerce.number().int().positive({ message: "Debe indicar la materia." }),
  })
  .strict();


// ─── 2b. Request: reservar ───────────────────────────────────────────────
// Los mismos campos y reglas que `crearTurnoBody` (HU-TUR-01), sin `alumnoId`: es el propio.

export const reservarTurnoPortalBody = crearTurnoBody.omit({ alumnoId: true }).strict();


// ─── 3. Tipos derivados ──────────────────────────────────────────────────

export type MisTurnosQuery = z.output<typeof misTurnosQuery>;
export type ProfesoresPortalQuery = z.output<typeof profesoresPortalQuery>;
export type ReservarTurnoPortalBody = z.input<typeof reservarTurnoPortalBody>;
export type ReservarTurnoPortalInput = z.output<typeof reservarTurnoPortalBody>;


// ─── 4. Response ─────────────────────────────────────────────────────────

/** Un turno del alumno. Sin precios ni datos de pago. */
export type TurnoPortalResponse = {
  id: number;
  /** Generado por la base: "TUR-000123". */
  codigo: string;
  /** "yyyy-mm-dd" */
  fecha: string;
  /** "HH:MM" */
  horaInicio: string;
  /** "HH:MM" — calculada por el back con la duración de la materia. */
  horaFin: string;
  materia: { id: number; nombre: string };
  profesor: { id: number; nombre: string; apellido: string };
  /** Colores de estado del calendario: Reservado, Asistió (verde), Ausente (naranja), Cancelado. */
  estado: EstadoTurno;
  observaciones: string | null;
  /** ISO 8601. */
  fechaCreacion: string;
};

export type MisTurnosResponse = {
  turnos: TurnoPortalResponse[];
  /** Turnos 'Reservado' con inicio futuro (los que cuentan para el límite). */
  turnosFuturosReservados: number;
  /** Valor actual de `max_turnos_futuros_alumno`. */
  limiteTurnosFuturos: number;
};

export type MateriaPortalResponse = {
  id: number;
  nombre: string;
  nivel: NivelMateria;
  duracionClaseMinutos: number;
};

export type ProfesorPortalResponse = {
  id: number;
  nombre: string;
  apellido: string;
};

/** Datos extra que acompañan al error LIMITE_TURNOS_FUTUROS. */
export type DatosLimiteTurnos = { limite: number };


// ─── 5. Errores de dominio ───────────────────────────────────────────────
// Los de la reserva son los mismos de HU-TUR-01 (ver `ErrorTurno`).

export type ErrorReservaPortal = Extract<
  ErrorTurno,
  | "SIN_CUPO"
  | "ALUMNO_CON_TURNO_SUPERPUESTO"
  | "FUERA_DE_DISPONIBILIDAD"
  | "ANTICIPACION_INSUFICIENTE"
  | "FECHA_BLOQUEADA"
  | "PROFESOR_NO_DICTA_MATERIA"
  | "PRECIO_NO_DEFINIDO"
  | "MATERIA_INACTIVA"
  | "PROFESOR_INACTIVO"
  | "REFERENCIA_INVALIDA"
>;

export type ErrorPortal =
  | ErrorReservaPortal
  | "LIMITE_TURNOS_FUTUROS" // 409, ya tiene el máximo de turnos futuros; trae `datos.limite`
  | "CUENTA_SIN_FICHA"      // 403, la cuenta no está asociada a una ficha de alumno activa
  | "ACCESO_DENEGADO"       // 403, módulo o endpoint que no es del portal (queda en la bitácora de sesiones)
  | "NO_AUTENTICADO"        // 401, sin sesión o expirada
  | "DATOS_INVALIDOS";      // 422
