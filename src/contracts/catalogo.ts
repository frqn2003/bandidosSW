// src/contracts/catalogo.ts
//
// CONTRATOS DE CATÁLOGOS DEL SISTEMA — tablas maestras y parámetros (Iteración 2).
//
// Define las rutas y tipos canónicos de:
//  · Formas de Pago (HU-PAG-01) — Seed: Efectivo (requiere_nro_operacion = false), Transferencia (true)
//  · Motivos de Baja de Usuario (HU-SIS-00) — Seed: Retiro, Renuncia, Enfermedad (false), Otro (requiere_detalle = true)
//  · Motivos de Cancelación de Turno (HU-TUR-02) — Seed: Ausencia profesor, Pedido alumno, Error carga (false), Otro (requiere_detalle = true)
//  · Parámetros del Sistema — Seed: horas_anticipacion_turno (2), max_modificaciones_turno (2), horas_cancelacion_tardia (24)

import { z } from "zod";

/** Parsea "true" | "false" desde query strings sin el bug de Boolean("false") === true. */
export const booleanQuery = z
  .enum(["true", "false"])
  .transform((v) => v === "true");


// ─── 1. Rutas ────────────────────────────────────────────────────────────
export const RUTA_FORMAS_PAGO = "/api/formas-pago";
export const RUTA_MOTIVOS_BAJA = "/api/motivos-baja";
export const RUTA_MOTIVOS_CANCELACION = "/api/motivos-cancelacion";
export const RUTA_PARAMETROS = "/api/parametros";
export const rutaParametro = (clave: string) => `${RUTA_PARAMETROS}/${clave}`;


// ─── 2. Request ──────────────────────────────────────────────────────────
export const listarFormasPagoQuery = z
  .object({
    soloActivas: booleanQuery.optional().default("true"),
  })
  .strict();

export const listarMotivosBajaQuery = z
  .object({
    soloActivos: booleanQuery.optional().default("true"),
  })
  .strict();

export const listarMotivosCancelacionQuery = z
  .object({
    soloActivos: booleanQuery.optional().default("true"),
  })
  .strict();

export const listarParametrosQuery = z.object({}).strict();


// ─── 3. Tipos derivados ──────────────────────────────────────────────────
export type ListarFormasPagoQuery = z.output<typeof listarFormasPagoQuery>;
export type ListarMotivosBajaQuery = z.output<typeof listarMotivosBajaQuery>;
export type ListarMotivosCancelacionQuery = z.output<typeof listarMotivosCancelacionQuery>;
export type ListarParametrosQuery = z.output<typeof listarParametrosQuery>;


// ─── 4. Response ─────────────────────────────────────────────────────────

export type EstadoCatalogo = "activo" | "inactivo";

export type FormaPagoResponse = {
  id: number;
  nombre: string;
  requiereNroOperacion: boolean;
  estado: EstadoCatalogo;
};

export type MotivoBajaResponse = {
  id: number;
  nombre: string;
  requiereDetalle: boolean;
  estado: EstadoCatalogo;
};

export type MotivoCancelacionResponse = {
  id: number;
  nombre: string;
  requiereDetalle: boolean;
  estado: EstadoCatalogo;
};

export type ParametroResponse = {
  id: number;
  clave: string;
  valor: number;
  unidad: string | null;
  descripcion: string | null;
};


// ─── 5. Errores de dominio ───────────────────────────────────────────────
export type ErrorCatalogo =
  | "NO_ENCONTRADO"  // 404, parámetro no encontrado por clave
  | "DATOS_INVALIDOS"; // 422
