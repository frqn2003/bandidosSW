import type { EstadoCierreCaja, ListarCierresQuery } from "@/contracts/caja";

export type CierreRow = {
  id: number;
  fecha: string;
  estado: EstadoCierreCaja;
  total_registrado: string;
  efectivo_registrado: string;
  efectivo_contado: string;
  diferencia: string;
  observaciones: string | null;
  cerrado_por: number;
  cerrado_nombre: string;
  cerrado_apellido: string;
  cerrado_at: Date;
  reabierto_por: number | null;
  reabierto_nombre: string | null;
  reabierto_apellido: string | null;
  reabierto_at: Date | null;
  motivo_reapertura: string | null;
};

/** Fila de `fn_caja_resumen` + `es_efectivo` de la forma de pago. */
export type MedioRow = {
  forma_pago_id: number;
  medio: string;
  es_efectivo: boolean;
  cantidad_comprobantes: string;
  subtotal: string;
};

/** Totales de pagos vigentes del día (mismos criterios que `fn_cierre_caja_validar`). */
export type TotalesRow = {
  total_general: string;
  cantidad_comprobantes: string;
  efectivo_registrado: string;
};

/** Línea de pago por medio (como `fn_caja_detalle`, con nombre y apellido separados). */
export type LineaPagoRow = {
  pago_id: number;
  comprobante: string | null;
  alumno_id: number;
  alumno_nombre: string;
  alumno_apellido: string;
  forma_pago_id: number;
  medio: string;
  monto: string;
  usuario_id: number;
  usuario_nombre: string;
  usuario_apellido: string;
  estado: "Vigente" | "Anulado";
  motivo_anulacion: string | null;
};

export type FiltrosCierres = ListarCierresQuery;
