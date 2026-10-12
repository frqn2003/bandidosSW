// src/contracts/caja.ts
//
// CONTRATO DE CAJA (HU-PAG-02): cierre de caja diario por medio de pago.
//
// Reglas de negocio del módulo (las aplica el back; el front no las duplica):
//  · Acceden Gerente y Mesa de Entrada. Solo el Gerente reabre una caja, con motivo.
//  · La fecha por defecto es hoy; no puede ser futura.
//  · La caja del día lista los pagos VIGENTES agrupados por medio de pago (Efectivo,
//    Transferencia) con cantidad de comprobantes, subtotal y total general. Los pagos
//    ANULADOS van aparte (`anulados`) y no suman.
//  · Un pago con más de un medio aparece una vez por medio (cada línea con el monto de ese medio).
//  · Cerrar caja: el back calcula `totalRegistrado`, `efectivoRegistrado` y
//    `diferencia = efectivoContado - efectivoRegistrado`. El front puede mostrar la
//    diferencia en vivo con `efectivoRegistrado` de la caja del día, pero el valor que vale
//    es el de la respuesta.
//  · `observaciones` (máx. 250) es obligatoria solo si la diferencia es distinta de 0.
//  · Una caja cerrada queda en modo lectura: no admite registrar ni anular pagos de esa
//    fecha (`CAJA_CERRADA` en pago.ts). Tras una reapertura se puede volver a cerrar.
//  · Cada cierre y reapertura queda en la bitácora (auditoria, tabla 'cierre_caja').
//  · `usuarioId` sale de la sesión, nunca del body.

import { z } from "zod";


// ─── 1. Rutas ────────────────────────────────────────────────────────────
//   GET  RUTA                  → caja de una fecha (resumen por medio + detalle)
//   POST RUTA_CIERRES          → cerrar la caja
//   GET  RUTA_CIERRES          → historial de cierres (fecha descendente)
//   POST rutaReabrir(id)       → reabrir una caja cerrada (solo Gerente)

export const RUTA = "/api/caja";
export const RUTA_CIERRES = "/api/caja/cierres";
export const rutaReabrir = (id: number) => `${RUTA_CIERRES}/${id}/reabrir`;


// ─── 2a. Request: caja del día e historial ───────────────────────────────

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Sin `fecha` el back usa hoy (huso de Argentina). Una fecha futura → FECHA_FUTURA. */
export const cajaDelDiaQuery = z
  .object({
    fecha: z.string().regex(FECHA, "Formato: aaaa-mm-dd.").optional(),
  })
  .strict();

export const listarCierresQuery = z
  .object({
    desde: z.string().regex(FECHA, "Formato: aaaa-mm-dd.").optional(),
    hasta: z.string().regex(FECHA, "Formato: aaaa-mm-dd.").optional(),
    estado: z.enum(["Cerrada", "Reabierta"]).optional(),
  })
  .strict();


// ─── 2b. Request: cierre y reapertura ────────────────────────────────────

const emptyToNull = (val: unknown) =>
  typeof val === "string" && val.trim() === "" ? null : val;

export const cerrarCajaBody = z
  .object({
    fecha: z.string().regex(FECHA, "La fecha debe tener formato aaaa-mm-dd."),
    /** En pesos, hasta 2 decimales. */
    efectivoContado: z
      .number({ message: "Indicá el efectivo contado." })
      .min(0, "No puede ser negativo.")
      .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, {
        message: "Máximo 2 decimales.",
      }),
    /** Obligatoria si la diferencia es distinta de 0 (lo valida el back: OBSERVACIONES_REQUERIDAS). */
    observaciones: z.preprocess(
      emptyToNull,
      z.string().trim().max(250, "Máximo 250 caracteres.").nullable().optional().default(null),
    ),
  })
  .strict();

export const reabrirCajaBody = z
  .object({
    motivo: z
      .string()
      .trim()
      .min(1, "Indicá el motivo de la reapertura.")
      .max(250, "Máximo 250 caracteres."),
  })
  .strict();


// ─── 3. Tipos derivados ──────────────────────────────────────────────────

export type CajaDelDiaQuery = z.output<typeof cajaDelDiaQuery>;
export type ListarCierresQuery = z.output<typeof listarCierresQuery>;
export type CerrarCajaBody = z.input<typeof cerrarCajaBody>;
export type CerrarCajaInput = z.output<typeof cerrarCajaBody>;
export type ReabrirCajaBody = z.input<typeof reabrirCajaBody>;
export type ReabrirCajaInput = z.output<typeof reabrirCajaBody>;


// ─── 4. Response ─────────────────────────────────────────────────────────

export type EstadoCierreCaja = "Cerrada" | "Reabierta";

type UsuarioResumen = { id: number; nombre: string; apellido: string };

export type CierreCajaResponse = {
  id: number;
  /** "yyyy-mm-dd" */
  fecha: string;
  estado: EstadoCierreCaja;
  totalRegistrado: number;
  efectivoRegistrado: number;
  efectivoContado: number;
  /** contado - registrado. */
  diferencia: number;
  observaciones: string | null;
  cerradoPor: UsuarioResumen;
  /** ISO 8601 */
  cerradoAt: string;
  /** Solo si `estado = 'Reabierta'`. */
  reabiertoPor: UsuarioResumen | null;
  reabiertoAt: string | null;
  motivoReapertura: string | null;
};

export type CajaMedioResponse = {
  formaPagoId: number;
  /** "Efectivo", "Transferencia". */
  nombre: string;
  esEfectivo: boolean;
  cantidadComprobantes: number;
  subtotal: number;
};

/** Una línea de pago de la caja (un pago con dos medios genera dos líneas). */
export type PagoCajaResponse = {
  pagoId: number;
  /** "REC-000123" */
  comprobante: string;
  alumno: { id: number; nombre: string; apellido: string };
  formaPagoId: number;
  /** Medio de pago de esta línea. */
  medio: string;
  /** Monto de esta línea (del medio). */
  monto: number;
  registradoPor: UsuarioResumen;
};

export type PagoAnuladoCajaResponse = PagoCajaResponse & {
  motivoAnulacion: string | null;
};

export type CajaDelDiaResponse = {
  /** "yyyy-mm-dd" */
  fecha: string;
  /** true si hay un cierre 'Cerrada' para esa fecha (modo lectura). */
  cerrada: boolean;
  /** Último cierre de la fecha (Cerrada o Reabierta); null si nunca se cerró. */
  cierre: CierreCajaResponse | null;
  /** Subtotales por medio, solo pagos vigentes. */
  medios: CajaMedioResponse[];
  /** Total general en pesos, solo pagos vigentes. */
  totalGeneral: number;
  /** Cantidad de comprobantes vigentes del día. */
  cantidadComprobantes: number;
  /** Efectivo que el sistema espera encontrar; base del cálculo de la diferencia. */
  efectivoRegistrado: number;
  /** Pagos vigentes, agrupables por `medio`. */
  pagos: PagoCajaResponse[];
  /** Pagos anulados: se listan aparte, en rojo; no suman. */
  anulados: PagoAnuladoCajaResponse[];
};


// ─── 5. Errores de dominio ───────────────────────────────────────────────

export type ErrorCaja =
  | "ACCESO_DENEGADO"           // 403, Profesor; o Mesa de Entrada intentando reabrir
  | "FECHA_FUTURA"              // 422, caja de una fecha posterior a hoy
  | "CAJA_YA_CERRADA"           // 409, esa fecha ya tiene un cierre 'Cerrada'
  | "CAJA_YA_REABIERTA"         // 409, el cierre ya fue reabierto
  | "OBSERVACIONES_REQUERIDAS"  // 422, diferencia distinta de 0 sin observaciones
  | "MOTIVO_REAPERTURA_REQUERIDO" // 422
  | "RANGO_INVALIDO"            // 422, hasta < desde
  | "NO_ENCONTRADO"             // 404, cierre inexistente
  | "DATOS_INVALIDOS";          // 422
