// src/contracts/auditoria.ts
//
// CONTRATO DE AUDITORÍA — solo lectura (tablas `auditoria` y `auditoria_sesion`).
//
// Son dos bitácoras distintas y por eso son dos endpoints:
//  · `auditoria`        → cambios de filas (INSERT/UPDATE/DELETE) sobre materia,
//                         profesor, profesor_materia, agenda_profesional, alumno
//                         y turno. Las escribe el trigger fn_auditoria().
//  · `auditoria_sesion` → login / logout / login_fallido / bloqueado /
//                         acceso_denegado. No es un cambio de fila.
//
// Nadie escribe acá desde la API: no hay POST, PUT ni DELETE. Una bitácora que
// se puede editar no es una bitácora.
//
// Único módulo paginado: las otras respuestas son arrays porque son listados
// acotados; esta tabla crece para siempre y el front nunca la pide entera.

import { z } from "zod";


// ─── 1. Rutas ────────────────────────────────────────────────────────────
//   GET  RUTA           → bitácora de cambios
//   GET  RUTA_SESIONES  → bitácora de accesos

export const RUTA = "/api/auditoria";
export const RUTA_SESIONES = "/api/auditoria/sesiones";


// ─── 2a. Request: filtros de la bitácora de cambios ──────────────────────
// `tabla` + `registroId` juntos son "la historia de este registro", que es el
// uso más común: se entra desde el detalle de un alumno o de un turno.

const FECHA_HORA = /^\d{4}-\d{2}-\d{2}(T.*)?$/;

const paginado = {
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(100).default(50),
};

export const listarAuditoriaQuery = z
  .object({
    tabla: z
      .enum(["materia", "profesor", "profesor_materia", "agenda_profesional", "alumno", "turno"])
      .optional(),
    operacion: z.enum(["INSERT", "UPDATE", "DELETE"]).optional(),
    registroId: z.coerce.number().int().positive().optional(),
    usuarioId: z.coerce.number().int().positive().optional(),
    desde: z.string().regex(FECHA_HORA).optional(),
    hasta: z.string().regex(FECHA_HORA).optional(),
    ...paginado,
  })
  .strict();


// ─── 2b. Request: filtros de la bitácora de accesos ──────────────────────

export const listarSesionesQuery = z
  .object({
    usuarioId: z.coerce.number().int().positive().optional(),
    evento: z
      .enum(["login", "logout", "login_fallido", "bloqueado", "acceso_denegado"])
      .optional(),
    desde: z.string().regex(FECHA_HORA).optional(),
    hasta: z.string().regex(FECHA_HORA).optional(),
    ...paginado,
  })
  .strict();


// ─── 3. Tipos derivados ──────────────────────────────────────────────────

export type ListarAuditoriaQuery = z.output<typeof listarAuditoriaQuery>;
export type ListarSesionesQuery = z.output<typeof listarSesionesQuery>;


// ─── 4. Response ─────────────────────────────────────────────────────────
// `valoresAnteriores` / `valoresNuevos` son los snapshots jsonb tal cual los
// guardó el trigger: llegan con los nombres de COLUMNA (snake_case), no
// traducidos. Es la única excepción a la regla de camelCase, y es a propósito:
// son el contenido de la fila, no un shape del contrato. La pantalla los
// muestra como pares clave/valor.
//
// Cuál es null lo define la operación (ck_auditoria_valores):
//   INSERT → anteriores null · UPDATE → los dos · DELETE → nuevos null.

export type TablaAuditada =
  | "materia"
  | "profesor"
  | "profesor_materia"
  | "agenda_profesional"
  | "alumno"
  | "turno";

export type OperacionAuditoria = "INSERT" | "UPDATE" | "DELETE";

export type EventoSesion =
  | "login"
  | "logout"
  | "login_fallido"
  | "bloqueado"
  | "acceso_denegado";

export type AuditoriaResponse = {
  id: number;
  tabla: TablaAuditada;
  operacion: OperacionAuditoria;
  registroId: number;
  /** null cuando el cambio no tuvo usuario de sesión o el usuario se borró. */
  usuario: { id: number; nombre: string; apellido: string } | null;
  /** ISO 8601. */
  fechaHora: string;
  valoresAnteriores: Record<string, unknown> | null;
  valoresNuevos: Record<string, unknown> | null;
};

export type AuditoriaSesionResponse = {
  id: number;
  usuario: { id: number; nombre: string; apellido: string } | null;
  evento: EventoSesion;
  /** ISO 8601. */
  fechaHora: string;
  ipOrigen: string | null;
  detalle: Record<string, unknown> | null;
};

/** Envoltorio paginado. `total` es el count sin paginar: lo necesita el paginador. */
export type Pagina<T> = {
  items: T[];
  total: number;
  pagina: number;
  porPagina: number;
};


// ─── 5. Errores de dominio ───────────────────────────────────────────────

export type ErrorAuditoria =
  | "RANGO_INVALIDO"   // 422, hasta < desde
  | "DATOS_INVALIDOS"; // 422
