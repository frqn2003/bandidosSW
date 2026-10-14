// src/data/rendicion.ts
//
// Capa de datos para HU-PAG-02: Rendición por Profesor.
// Conecta con el endpoint GET /api/rendicion del contrato src/contracts/rendicion.ts
// y provee fixtures según docs/capa-de-datos-front.md y docs/contratos/cobranza.md.

import {
  RUTA,
  type RendicionQuery,
  type RendicionResponse,
} from "@/contracts/rendicion";
import { hoyAR } from "@/contracts/alumno";
import { apiGet } from "@/lib/api-client";

export { RUTA };
export type { RendicionQuery, RendicionResponse };

// ─── Helpers de fecha por defecto ─────────────────────────────────────────

export function getRangoMesActual(): { desde: string; hasta: string } {
  const hoy = hoyAR();
  const [anio, mes] = hoy.split("-");
  const desde = `${anio}-${mes}-01`;
  const ultimoDia = new Date(Number(anio), Number(mes), 0).getDate();
  const hasta = `${anio}-${mes}-${String(ultimoDia).padStart(2, "0")}`;
  return { desde, hasta };
}

// ─── Fixture de desarrollo front ──────────────────────────────────────────

const FIXTURE_RENDICION: RendicionResponse = {
  profesor: {
    id: 1,
    nombre: "Martín",
    apellido: "Gómez",
  },
  desde: getRangoMesActual().desde,
  hasta: getRangoMesActual().hasta,
  totalRendido: 48000,
  totalPendiente: 16000,
  materias: [
    {
      materia: { id: 1, nombre: "Matemática Discreta" },
      clases: 3,
      subtotal: 24000,
      items: [
        {
          turnoId: 101,
          fechaClase: "2026-10-02",
          alumno: { id: 1, nombre: "Sofía", apellido: "Ramírez" },
          importeCobrado: 8000,
          medioPago: "Efectivo",
          comprobante: "REC-000501",
          fechaPago: "2026-10-02",
          estadoClase: "Asistió",
        },
        {
          turnoId: 102,
          fechaClase: "2026-10-05",
          alumno: { id: 2, nombre: "Mateo", apellido: "Fernández" },
          importeCobrado: 8000,
          medioPago: "Transferencia",
          comprobante: "REC-000503",
          fechaPago: "2026-10-05",
          estadoClase: "Asistió",
        },
        {
          turnoId: 103,
          fechaClase: "2026-10-08",
          alumno: { id: 3, nombre: "Valentina", apellido: "Gómez" },
          importeCobrado: 8000,
          medioPago: "Efectivo",
          comprobante: "REC-000502",
          fechaPago: "2026-10-08",
          estadoClase: "Asistió",
        },
      ],
    },
    {
      materia: { id: 2, nombre: "Álgebra Lineal" },
      clases: 3,
      subtotal: 24000,
      items: [
        {
          turnoId: 104,
          fechaClase: "2026-10-03",
          alumno: { id: 4, nombre: "Lucas", apellido: "Álvarez" },
          importeCobrado: 8000,
          medioPago: "Transferencia",
          comprobante: "REC-000504",
          fechaPago: "2026-10-03",
          estadoClase: "Asistió",
        },
        {
          turnoId: 105,
          fechaClase: "2026-10-06",
          alumno: { id: 5, nombre: "Camila", apellido: "Torres" },
          importeCobrado: 8000,
          medioPago: "Transferencia",
          comprobante: "REC-000505",
          fechaPago: "2026-10-06",
          estadoClase: "Asistió",
        },
        {
          turnoId: 106,
          fechaClase: "2026-10-09",
          alumno: { id: 1, nombre: "Sofía", apellido: "Ramírez" },
          importeCobrado: 8000,
          medioPago: "Efectivo",
          comprobante: "REC-000506",
          fechaPago: "2026-10-09",
          estadoClase: "Ausente",
        },
      ],
    },
  ],
  pendientes: [
    {
      turnoId: 107,
      fechaClase: "2026-10-10",
      alumno: { id: 2, nombre: "Mateo", apellido: "Fernández" },
      materia: { id: 1, nombre: "Matemática Discreta" },
      importePendiente: 8000,
      estadoClase: "Asistió",
    },
    {
      turnoId: 108,
      fechaClase: "2026-10-11",
      alumno: { id: 4, nombre: "Lucas", apellido: "Álvarez" },
      materia: { id: 2, nombre: "Álgebra Lineal" },
      importePendiente: 8000,
      estadoClase: "Asistió",
    },
  ],
};

// ─── Funciones asincrónicas de consumo ─────────────────────────────────────

/**
 * Consulta la rendición de clases dictadas y cobradas de un profesor.
 */
export async function obtenerRendicion(filtros: RendicionQuery): Promise<RendicionResponse> {
  const params = new URLSearchParams();
  if (filtros.profesorId) params.set("profesorId", String(filtros.profesorId));
  if (filtros.desde) params.set("desde", filtros.desde);
  if (filtros.hasta) params.set("hasta", filtros.hasta);
  if (filtros.materiaId) params.set("materiaId", String(filtros.materiaId));

  const qs = params.toString();
  const url = qs ? `${RUTA}?${qs}` : RUTA;

  try {
    // BACKEND: cuando GET /api/rendicion esté conectado
    return await apiGet<RendicionResponse>(url);
  } catch {
    // Fallback con fixture en memoria
    let materias = FIXTURE_RENDICION.materias;
    let pendientes = FIXTURE_RENDICION.pendientes;

    if (filtros.materiaId) {
      materias = materias.filter((m) => m.materia.id === filtros.materiaId);
      pendientes = pendientes.filter((p) => p.materia.id === filtros.materiaId);
    }

    const totalRendido = materias.reduce((acc, m) => acc + m.subtotal, 0);
    const totalPendiente = pendientes.reduce((acc, p) => acc + p.importePendiente, 0);

    return {
      ...FIXTURE_RENDICION,
      desde: filtros.desde ?? FIXTURE_RENDICION.desde,
      hasta: filtros.hasta ?? FIXTURE_RENDICION.hasta,
      materias,
      totalRendido,
      pendientes,
      totalPendiente,
    };
  }
}
