// src/contracts/pago.ts
//
// CONTRATO DE PAGO DE CLASES (HU-PAG-01).
//
// Reglas de negocio del módulo:
//  · Solo acceden los roles Mesa de Entrada y Gerente (Profesor no tiene acceso → ACCESO_DENEGADO).
//  · Solo se cobran turnos YA dictados (fecha + hora_inicio <= ahora en huso horario argentino)
//    de alumnos activos, que no estén en estado "Cancelado" y que no hayan sido pagados.
//  · Monto autocalculado: el front NO envía el monto en el body; el backend calcula la suma de
//    `valor_clase_congelado` de cada turno seleccionado en una transacción.
//  · Admite uno o más medios de pago (Efectivo, Transferencia). Si la forma de pago lo requiere
//    (`requiere_nro_operacion = true`), `nroOperacion` es obligatorio (alfanumérico máx. 30).
//  · Número de comprobante único ("REC-000123") y `usuario_id` (quién cobra) los fija el back.
//  · Al confirmar el pago, los turnos pasan automáticamente a `pagado = true` (trigger de BD).
//  · Historial de pagos: ordenado por fecha de pago descendente (fecha_pago DESC, created_at DESC).
//
// HU-PAG-02 (anulación):
//  · Un pago registrado no se modifica: solo se anula (POST rutaAnular). Lo hacen Gerente y
//    Mesa de Entrada, con motivo obligatorio (máx. 250). No se anula un pago de una fecha con
//    caja cerrada (`CAJA_CERRADA`); tampoco se registran pagos en una fecha con caja cerrada.
//  · El pago pasa a 'Anulado' (con fecha, usuario y motivo), conserva su comprobante REC (no se
//    reutiliza) y las clases vuelven a quedar impagas (la deuda vuelve al estado anterior).
//  · Cada anulación queda en la bitácora (auditoria, tabla 'pago').

import { z } from "zod";
import { RUTA_FORMAS_PAGO } from "./catalogo";

export { RUTA_FORMAS_PAGO };

/** Fecha de hoy en huso horario de Argentina (America/Argentina/Buenos_Aires) en formato YYYY-MM-DD. */
export const hoyAR = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());


// ─── 1. Rutas ────────────────────────────────────────────────────────────
//   GET  RUTA                     → historial de pagos (orden fecha descendente)
//   POST RUTA                     → registrar pago de clases seleccionadas
//   GET  rutaPago(id)             → detalle del comprobante de pago
//   GET  RUTA_CLASES_PENDIENTES   → turnos pasados impagos de un alumno
//   POST rutaAnular(id)           → anular un pago vigente (HU-PAG-02)

export const RUTA = "/api/pagos";
export const rutaPago = (id: number) => `${RUTA}/${id}`;
export const RUTA_CLASES_PENDIENTES = "/api/pagos/clases-pendientes";
export const rutaAnular = (id: number) => `${RUTA}/${id}/anular`;


// ─── 2a. Request: filtros de historial ───────────────────────────────────

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

export const listarPagosQuery = z
  .object({
    busqueda: z.string().trim().optional(), // comprobante o apellido/nombre del alumno
    alumnoId: z.coerce.number().int().positive().optional(),
    desde: z.string().regex(FECHA, "Formato esperado: aaaa-mm-dd.").optional(),
    hasta: z.string().regex(FECHA, "Formato esperado: aaaa-mm-dd.").optional(),
    /** Sin `estado` se devuelven vigentes y anulados (el historial distingue los anulados). */
    estado: z.enum(["Vigente", "Anulado"]).optional(),
  })
  .strict();


// ─── 2b. Request: consulta de clases pendientes ──────────────────────────

export const clasesPendientesQuery = z
  .object({
    alumnoId: z.coerce.number().int().positive({
      message: "Debe indicar el alumno para consultar sus clases adeudadas.",
    }).optional(),
  })
  .strict();


// ─── 2c. Request: registro de pago ───────────────────────────────────────

export const pagoFormaPagoItemSchema = z
  .object({
    formaPagoId: z.number().int().positive({
      message: "Debe indicar una forma de pago válida.",
    }),
    nroOperacion: z.preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? null : v),
      z
        .string()
        .trim()
        .max(30, "El N° de operación no puede superar 30 caracteres.")
        .regex(/^[A-Za-z0-9]+$/, "El N° de operación debe ser alfanumérico sin espacios ni símbolos.")
        .nullable()
        .optional()
        .default(null)
    ),
  })
  .strict();

export const crearPagoBody = z
  .object({
    alumnoId: z.number().int().positive({
      message: "Debe indicar el alumno asociado al pago.",
    }),
    turnoIds: z
      .array(z.number().int().positive())
      .min(1, "Debe seleccionar al menos una clase para cobrar."),
    formasPago: z
      .array(pagoFormaPagoItemSchema)
      .min(1, "Debe indicar al menos una forma de pago."),
    fechaPago: z
      .string()
      .regex(FECHA, "La fecha debe tener formato aaaa-mm-dd.")
      .refine((v) => v <= hoyAR(), {
        message: "La fecha de pago no puede ser futura.",
      })
      .optional()
      .default(() => hoyAR()),
    observaciones: z.preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? null : v),
      z.string().trim().max(200, "Las observaciones no pueden superar 200 caracteres.").nullable().optional().default(null)
    ),
  })
  .strict();

// ─── 2d. Request: anulación (HU-PAG-02) ──────────────────────────────────

export const anularPagoBody = z
  .object({
    motivo: z
      .string()
      .trim()
      .min(1, "Indicá el motivo de la anulación.")
      .max(250, "Máximo 250 caracteres."),
  })
  .strict();


// ─── 3. Tipos derivados ──────────────────────────────────────────────────

export type ListarPagosQuery = z.output<typeof listarPagosQuery>;
export type ClasesPendientesQuery = z.output<typeof clasesPendientesQuery>;
export type PagoFormaPagoItem = z.infer<typeof pagoFormaPagoItemSchema>;
export type CrearPagoBody = z.input<typeof crearPagoBody>;
export type CrearPagoInput = z.output<typeof crearPagoBody>;
export type AnularPagoBody = z.input<typeof anularPagoBody>;
export type AnularPagoInput = z.output<typeof anularPagoBody>;


// ─── 4. Response ─────────────────────────────────────────────────────────

export type ClasePendientePagoResponse = {
  id: number; // turno_id
  codigo: string;
  alumnoId?: number;
  alumno?: {
    id: number;
    legajo: string;
    nombre: string;
    apellido: string;
    dni: string;
  };
  /** "yyyy-mm-dd" */
  fecha: string;
  /** "HH:MM" */
  horaInicio: string;
  /** "HH:MM" */
  horaFin: string;
  materia: { id: number; nombre: string };
  profesor: { id: number; nombre: string; apellido: string };
  /** Importe congelado del turno. */
  importe: number;
  pagado: boolean;
};

export type PagoFormaPagoResponse = {
  id: number;
  formaPagoId: number;
  nombre: string;
  nroOperacion: string | null;
};

export type PagoTurnoItemResponse = {
  turnoId: number;
  codigo: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  materiaNombre: string;
  profesorNombre: string;
  importe: number;
};

export type EstadoPago = "Vigente" | "Anulado";

export type PagoResponse = {
  id: number;
  /** Número único de comprobante: "REC-000123" */
  comprobante: string;
  alumno: {
    id: number;
    legajo: string;
    nombre: string;
    apellido: string;
    dni: string;
  };
  monto: number;
  /** "yyyy-mm-dd" */
  fechaPago: string;
  observaciones: string | null;
  formasPago: PagoFormaPagoResponse[];
  clases: PagoTurnoItemResponse[];
  registradoPor: { id: number; nombre: string; apellido: string };
  /** ISO 8601 */
  fechaCreacion: string;
  /** HU-PAG-02. Ausente = 'Vigente'. Un pago anulado no suma a caja, rendición ni saldo. */
  estado?: EstadoPago;
  /** Solo si `estado = 'Anulado'`. ISO 8601. */
  anuladoAt?: string | null;
  anuladoPor?: { id: number; nombre: string; apellido: string } | null;
  motivoAnulacion?: string | null;
};


// ─── 5. Errores de dominio ───────────────────────────────────────────────

export type ErrorPago =
  | "ALUMNO_INACTIVO"           // 422, alumno inexistente o inactivo
  | "ALUMNO_NO_ENCONTRADO"      // 404
  | "SIN_CLASES_SELECCIONADAS"  // 422, turnoIds vacío
  | "TURNO_NO_PERTENECE_ALUMNO" // 422, turno de otro alumno
  | "TURNO_CANCELADO"           // 409, turno cancelado no se cobra
  | "TURNO_NO_TRANSCURRIDO"     // 422, clase con inicio futuro (aún no dictada)
  | "TURNO_YA_PAGADO"           // 409, ya fue abonado previamente
  | "FORMA_PAGO_INACTIVA"       // 422
  | "FORMA_PAGO_REQUERIDA"      // 422, falta medio de pago
  | "NRO_OPERACION_REQUERIDO"   // 422, obligatorio en transferencia según la forma de pago
  | "FECHA_PAGO_FUTURA"         // 422, fecha posterior a la fecha actual en Argentina
  | "CAJA_CERRADA"              // 409, la caja de esa fecha está cerrada: no se registran ni anulan pagos (HU-PAG-02)
  | "PAGO_YA_ANULADO"           // 409, el pago ya estaba anulado (HU-PAG-02)
  | "MOTIVO_ANULACION_REQUERIDO" // 422, falta el motivo al anular (HU-PAG-02)
  | "ACCESO_DENEGADO"           // 403, rol no autorizado (ej: Profesor)
  | "NO_ENCONTRADO"             // 404
  | "DATOS_INVALIDOS";          // 422
