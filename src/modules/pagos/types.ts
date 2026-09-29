// src/modules/pagos/types.ts
//
// Tipos e interfaces para el módulo de Gestión de Pagos (HU-PAG-01).
// Basados estrictamente en los contratos oficiales:
//  · src/contracts/pago.ts
//  · src/contracts/catalogo.ts
//  · src/contracts/alumno.ts

import type {
  ClasePendientePagoResponse,
  PagoResponse,
  PagoFormaPagoResponse,
  PagoTurnoItemResponse,
  CrearPagoBody,
  PagoFormaPagoItem,
  ErrorPago,
} from "@/contracts/pago";
import type { FormaPagoResponse } from "@/contracts/catalogo";

// Re-exportar tipos canónicos del contrato
export type {
  ClasePendientePagoResponse,
  PagoResponse,
  PagoFormaPagoResponse,
  PagoTurnoItemResponse,
  CrearPagoBody,
  PagoFormaPagoItem,
  ErrorPago,
  FormaPagoResponse,
};

// Alias de interfaz requeridos por la HU
export type PendingClass = ClasePendientePagoResponse;
export type PaymentReceipt = PagoResponse;
export type PaymentMethod = FormaPagoResponse;

/**
 * Resumen de alumno para el buscador y tarjeta informativa de deuda.
 */
export interface StudentPaymentSummary {
  id: number;
  legajo: string;
  nombre: string;
  apellido: string;
  dni: string;
  totalDeudaPendiente: number;
  clasesPendientesCount: number;
}

/**
 * Pestañas principales de navegación en Pagos.
 */
export type PaymentsTab = "registrar" | "historial";

/**
 * Estado del formulario de registro de pago en el front.
 */
export interface PaymentFormState {
  alumnoId: number | null;
  turnoIds: number[];
  formasPago: {
    formaPagoId: number;
    nombre: string;
    nroOperacion: string;
    requiereNroOperacion: boolean;
  }[];
  fechaPago: string;
  observaciones: string;
}
