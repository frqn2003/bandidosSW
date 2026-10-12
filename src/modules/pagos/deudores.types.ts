// src/modules/pagos/deudores.types.ts
//
// Tipos e interfaces de dominio para HU-PAG-02:
// "Estado de Cuenta, Listado de Deudores, Cierre de Caja y Rendición por Profesor".
//
// Basados estrictamente en las reglas de negocio y los diagramas de flujo:
//  · Diagrama 1: Listado de deudores y estado de cuenta (AccountStatementModal)
//  · Diagrama 2: Cierre de caja diario (DailyCashRegister)
//  · Diagrama 3: Rendición por profesor (ProfessorRendition)
//  · Diagrama 4: Anulación de pagos (PaymentAnnulment)

import type { PagoResponse } from "@/contracts/pago";
import type { FormaPagoResponse } from "@/contracts/catalogo";
import type { NombreRol } from "@/contracts/rol";

// ─── Pestañas del módulo HU-PAG-02 ──────────────────────────────────────────

export type DeudoresTab = "deudores" | "cierre-caja" | "rendicion-profesor";

// ─── 1. Diagrama 1: Listado de Deudores y Estado de Cuenta ─────────────────

export type RangoAntiguedad = "0-30" | "31-60" | ">60";

export interface DeudorAlumnoItem {
  id: number; // alumno.id
  legajo: string;
  nombre: string;
  apellido: string;
  dni: string;
  montoAdeudado: number;
  antiguedadDias: number;
  antiguedadRango: RangoAntiguedad;
  materiasAdeudadas: { id: number; nombre: string }[];
  profesoresAsociados: { id: number; nombre: string; apellido: string }[];
  clasesAdeudadasCount: number;
}

export interface FiltrosDeudores {
  busqueda?: string; // Nombre, Apellido, DNI o Legajo
  antiguedad?: "todas" | RangoAntiguedad;
  materiaId?: number;
  profesorId?: number;
}

export type TipoMovimientoEstadoCuenta = "cargo" | "pago";

export interface MovimientoEstadoCuenta {
  id: number;
  fecha: string; // "yyyy-mm-dd"
  hora: string; // "HH:MM"
  tipo: TipoMovimientoEstadoCuenta;
  concepto: string; // Ej: "Clase de Matemática - Prof. Gómez" o "Pago comprobante REC-000123"
  monto: number; // Positivo: cargo a pagar; Negativo: crédito/abono
  saldoAcumulado: number;
  comprobante: string | null; // N° REC si es pago
  anulado: boolean; // Si fue cancelado/anulado, se tacha y no suma al saldo
  motivoAnulacion?: string | null;
}

export interface EstadoCuentaAlumnoResponse {
  alumno: {
    id: number;
    legajo: string;
    nombre: string;
    apellido: string;
    dni: string;
  };
  saldoActual: number;
  movimientos: MovimientoEstadoCuenta[];
}

// ─── 2. Diagrama 2: Cierre de Caja Diario ───────────────────────────────────

export type EstadoCaja = "abierta" | "cerrada";

export interface PagoCajaItem {
  pagoId: number;
  comprobante: string;
  alumnoNombre: string;
  alumnoLegajo: string;
  monto: number;
  formaPagoNombre: string;
  nroOperacion: string | null;
  hora: string;
  registradoPor: string;
  anulado: boolean;
  motivoAnulacion?: string | null;
}

export interface GrupoMedioPagoCaja {
  formaPagoNombre: "Efectivo" | "Transferencia" | string;
  cantidadComprobantes: number;
  subtotal: number;
  pagos: PagoCajaItem[];
}

export interface CierreCajaRegistro {
  id: number;
  fecha: string; // "yyyy-mm-dd"
  estado: EstadoCaja;
  totalEfectivoEsperado: number;
  totalTransferenciaEsperado: number;
  totalGeneralEsperado: number;
  efectivoContado: number | null;
  diferencia: number | null; // efectivoContado - totalEfectivoEsperado
  observaciones: string | null; // Obligatorio si diferencia != 0 (máx 250 car.)
  cerradoPor?: { id: number; nombre: string; apellido: string } | null;
  fechaCierre?: string | null;
  reabiertoPor?: { id: number; nombre: string; apellido: string } | null;
  fechaReapertura?: string | null;
  motivoReapertura?: string | null;
}

export interface CajaDiariaResponse {
  fecha: string; // "yyyy-mm-dd"
  estado: EstadoCaja;
  cierreInfo: CierreCajaRegistro | null;
  gruposMediosPago: GrupoMedioPagoCaja[];
  totalGeneral: number;
  pagosAnulados: PagoCajaItem[];
}

export interface CerrarCajaBody {
  fecha: string;
  efectivoContado: number;
  observaciones?: string | null;
}

export interface ReabrirCajaBody {
  fecha: string;
  motivo: string; // Obligatorio para Gerente
}

// ─── 3. Diagrama 3: Rendición por Profesor ──────────────────────────────────

export interface FiltrosRendicionProfesor {
  profesorId?: number; // Obligatorio si es Gerente
  periodoDesde: string; // "yyyy-mm-dd", defecto mes en curso
  periodoHasta: string; // "yyyy-mm-dd", máx 12 meses
  materiaId?: number; // Opcional
}

export interface ClaseRendidaItem {
  turnoId: number;
  fecha: string; // "yyyy-mm-dd"
  alumnoNombre: string;
  alumnoLegajo: string;
  materiaId: number;
  materiaNombre: string;
  importeCobrado: number;
  medioPago: string;
  comprobante: string;
}

export interface ClaseDictadaPendienteItem {
  turnoId: number;
  fecha: string; // "yyyy-mm-dd"
  alumnoNombre: string;
  alumnoLegajo: string;
  materiaId: number;
  materiaNombre: string;
  importePendiente: number;
}

export interface SubtotalMateriaRendicion {
  materiaId: number;
  materiaNombre: string;
  cantidadClases: number;
  subtotal: number;
}

export interface RendicionProfesorResponse {
  profesor: {
    id: number;
    nombre: string;
    apellido: string;
  };
  periodo: {
    desde: string;
    hasta: string;
  };
  clasesCobradas: ClaseRendidaItem[];
  subtotalesPorMateria: SubtotalMateriaRendicion[];
  totalRendido: number;
  clasesPendientesCobro: ClaseDictadaPendienteItem[]; // Informativo inferior, no suma al total
}

// ─── 4. Diagrama 4: Anulación de Pagos ───────────────────────────────────────

export interface AnularPagoBody {
  pagoId: number;
  motivo: string; // Obligatorio
}

export interface AnularPagoResult {
  pagoId: number;
  comprobante: string;
  estado: "Anulado";
  fechaAnulacion: string;
  motivo: string;
  anuladoPor: string;
}
