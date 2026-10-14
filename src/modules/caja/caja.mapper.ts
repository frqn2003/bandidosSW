import type {
  CajaDelDiaResponse,
  CierreCajaResponse,
  PagoAnuladoCajaResponse,
  PagoCajaResponse,
} from "@/contracts/caja";
import type { CierreRow, LineaPagoRow, MedioRow, TotalesRow } from "./caja.types";

const iso = (d: Date | string) => (d instanceof Date ? d : new Date(d)).toISOString();

export function cierreToApi(row: CierreRow): CierreCajaResponse {
  return {
    id: row.id,
    fecha: row.fecha.slice(0, 10),
    estado: row.estado,
    totalRegistrado: Number(row.total_registrado),
    efectivoRegistrado: Number(row.efectivo_registrado),
    efectivoContado: Number(row.efectivo_contado),
    diferencia: Number(row.diferencia),
    observaciones: row.observaciones,
    cerradoPor: { id: row.cerrado_por, nombre: row.cerrado_nombre, apellido: row.cerrado_apellido },
    cerradoAt: iso(row.cerrado_at),
    reabiertoPor:
      row.reabierto_por !== null
        ? {
            id: row.reabierto_por,
            nombre: row.reabierto_nombre ?? "",
            apellido: row.reabierto_apellido ?? "",
          }
        : null,
    reabiertoAt: row.reabierto_at ? iso(row.reabierto_at) : null,
    motivoReapertura: row.motivo_reapertura,
  };
}

function lineaToApi(row: LineaPagoRow): PagoCajaResponse {
  return {
    pagoId: row.pago_id,
    comprobante: row.comprobante ?? `REC-${String(row.pago_id).padStart(6, "0")}`,
    alumno: { id: row.alumno_id, nombre: row.alumno_nombre, apellido: row.alumno_apellido },
    formaPagoId: row.forma_pago_id,
    medio: row.medio,
    monto: Number(row.monto),
    registradoPor: { id: row.usuario_id, nombre: row.usuario_nombre, apellido: row.usuario_apellido },
  };
}

export function cajaDelDiaToApi(
  fecha: string,
  cerrada: boolean,
  cierre: CierreRow | null,
  medios: MedioRow[],
  totales: TotalesRow,
  lineas: LineaPagoRow[],
): CajaDelDiaResponse {
  return {
    fecha,
    cerrada,
    cierre: cierre ? cierreToApi(cierre) : null,
    medios: medios.map((m) => ({
      formaPagoId: m.forma_pago_id,
      nombre: m.medio,
      esEfectivo: Boolean(m.es_efectivo),
      cantidadComprobantes: Number(m.cantidad_comprobantes),
      subtotal: Number(m.subtotal),
    })),
    totalGeneral: Number(totales.total_general),
    cantidadComprobantes: Number(totales.cantidad_comprobantes),
    efectivoRegistrado: Number(totales.efectivo_registrado),
    pagos: lineas.filter((l) => l.estado === "Vigente").map(lineaToApi),
    anulados: lineas
      .filter((l) => l.estado === "Anulado")
      .map((l): PagoAnuladoCajaResponse => ({ ...lineaToApi(l), motivoAnulacion: l.motivo_anulacion })),
  };
}
