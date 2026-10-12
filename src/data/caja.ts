// src/data/caja.ts
//
// Capa de datos para HU-PAG-02: Cierre de Caja Diario.
// Conecta con los endpoints de src/contracts/caja.ts y provee fixtures
// de desarrollo según docs/capa-de-datos-front.md y docs/contratos/cobranza.md.

import {
  RUTA,
  RUTA_CIERRES,
  rutaReabrir,
  type CajaDelDiaResponse,
  type CerrarCajaBody,
  type CierreCajaResponse,
  type ListarCierresQuery,
  type ReabrirCajaBody,
} from "@/contracts/caja";
import { hoyAR } from "@/contracts/alumno";
import { apiGet, apiSend } from "@/lib/api-client";

export { RUTA, RUTA_CIERRES, rutaReabrir };
export type { CajaDelDiaResponse, CerrarCajaBody, CierreCajaResponse, ReabrirCajaBody };

// ─── Fixtures de prueba ───────────────────────────────────────────────────

let mockCerradaHoy = false;
let mockCierreHoy: CierreCajaResponse | null = null;

const FIXTURE_CAJA_HOY: CajaDelDiaResponse = {
  fecha: hoyAR(),
  cerrada: false,
  cierre: null,
  cantidadComprobantes: 4,
  efectivoRegistrado: 32000,
  totalGeneral: 66000,
  medios: [
    {
      formaPagoId: 1,
      nombre: "Efectivo",
      esEfectivo: true,
      cantidadComprobantes: 2,
      subtotal: 32000,
    },
    {
      formaPagoId: 2,
      nombre: "Transferencia",
      esEfectivo: false,
      cantidadComprobantes: 2,
      subtotal: 34000,
    },
  ],
  pagos: [
    {
      pagoId: 501,
      comprobante: "REC-000501",
      alumno: { id: 1, nombre: "Sofía", apellido: "Ramírez" },
      formaPagoId: 1,
      medio: "Efectivo",
      monto: 16000,
      registradoPor: { id: 2, nombre: "Mesa", apellido: "Central" },
    },
    {
      pagoId: 502,
      comprobante: "REC-000502",
      alumno: { id: 2, nombre: "Mateo", apellido: "Fernández" },
      formaPagoId: 1,
      medio: "Efectivo",
      monto: 16000,
      registradoPor: { id: 2, nombre: "Mesa", apellido: "Central" },
    },
    {
      pagoId: 503,
      comprobante: "REC-000503",
      alumno: { id: 3, nombre: "Valentina", apellido: "Gómez" },
      formaPagoId: 2,
      medio: "Transferencia",
      monto: 18000,
      registradoPor: { id: 1, nombre: "Administrador", apellido: "Gerencia" },
    },
    {
      pagoId: 504,
      comprobante: "REC-000504",
      alumno: { id: 4, nombre: "Lucas", apellido: "Álvarez" },
      formaPagoId: 2,
      medio: "Transferencia",
      monto: 16000,
      registradoPor: { id: 2, nombre: "Mesa", apellido: "Central" },
    },
  ],
  anulados: [
    {
      pagoId: 500,
      comprobante: "REC-000500",
      alumno: { id: 5, nombre: "Camila", apellido: "Torres" },
      formaPagoId: 1,
      medio: "Efectivo",
      monto: 8000,
      registradoPor: { id: 2, nombre: "Mesa", apellido: "Central" },
      motivoAnulacion: "Error de digitación en turnos seleccionados",
    },
  ],
};

// ─── Funciones asincrónicas de consumo ─────────────────────────────────────

/**
 * Consulta la caja de una fecha (pagos agrupados por medio + anulados + estado de cierre).
 */
export async function obtenerCajaDelDia(fecha: string = hoyAR()): Promise<CajaDelDiaResponse> {
  try {
    // BACKEND: cuando /api/caja?fecha=... esté conectado
    return await apiGet<CajaDelDiaResponse>(`${RUTA}?fecha=${fecha}`);
  } catch {
    // Fallback con fixture en memoria para desarrollo front
    const esHoy = fecha === hoyAR();
    return {
      ...FIXTURE_CAJA_HOY,
      fecha,
      cerrada: esHoy ? mockCerradaHoy : false,
      cierre: esHoy ? mockCierreHoy : null,
    };
  }
}

/**
 * Registra el cierre de caja de una fecha.
 */
export async function cerrarCaja(body: CerrarCajaBody): Promise<CierreCajaResponse> {
  try {
    // BACKEND: cuando POST /api/caja/cierres esté conectado
    return await apiSend<CierreCajaResponse>("POST", RUTA_CIERRES, body);
  } catch {
    const efContado = body.efectivoContado;
    const efEsperado = FIXTURE_CAJA_HOY.efectivoRegistrado;
    const dif = efContado - efEsperado;

    const nuevoCierre: CierreCajaResponse = {
      id: Math.floor(Math.random() * 1000) + 1,
      fecha: body.fecha,
      estado: "Cerrada",
      totalRegistrado: FIXTURE_CAJA_HOY.totalGeneral,
      efectivoRegistrado: efEsperado,
      efectivoContado: efContado,
      diferencia: dif,
      observaciones: typeof body.observaciones === "string" ? body.observaciones : null,
      cerradoPor: { id: 1, nombre: "Usuario", apellido: "Actual" },
      cerradoAt: new Date().toISOString(),
      reabiertoPor: null,
      reabiertoAt: null,
      motivoReapertura: null,
    };

    if (body.fecha === hoyAR()) {
      mockCerradaHoy = true;
      mockCierreHoy = nuevoCierre;
    }

    return nuevoCierre;
  }
}

/**
 * Reabre una caja cerrada previa (exclusivo Gerente).
 */
export async function reabrirCaja(
  cierreId: number,
  body: ReabrirCajaBody
): Promise<CierreCajaResponse> {
  try {
    // BACKEND: cuando POST /api/caja/cierres/:id/reabrir esté conectado
    return await apiSend<CierreCajaResponse>("POST", rutaReabrir(cierreId), body);
  } catch {
    mockCerradaHoy = false;
    if (mockCierreHoy) {
      mockCierreHoy = {
        ...mockCierreHoy,
        estado: "Reabierta",
        reabiertoPor: { id: 1, nombre: "Gerente", apellido: "General" },
        reabiertoAt: new Date().toISOString(),
        motivoReapertura: body.motivo,
      };
      return mockCierreHoy;
    }
    throw new Error("Cierre no encontrado");
  }
}

/**
 * Historial de cierres de caja.
 */
export async function listarHistorialCierres(
  filtros: ListarCierresQuery = {}
): Promise<CierreCajaResponse[]> {
  try {
    const params = new URLSearchParams();
    if (filtros.desde) params.set("desde", filtros.desde);
    if (filtros.hasta) params.set("hasta", filtros.hasta);
    if (filtros.estado) params.set("estado", filtros.estado);
    const qs = params.toString();
    return await apiGet<CierreCajaResponse[]>(qs ? `${RUTA_CIERRES}?${qs}` : RUTA_CIERRES);
  } catch {
    return mockCierreHoy ? [mockCierreHoy] : [];
  }
}
