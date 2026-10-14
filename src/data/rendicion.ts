// src/data/rendicion.ts
//
// Capa de datos para HU-PAG-02: Rendición por Profesor.
//
// Consume el endpoint de la API mediante el cliente HTTP tipado con el contrato.
// Contrato: src/contracts/rendicion.ts · Guía de uso: docs/contratos/cobranza.md

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

/**
 * Rendición de clases cobradas de un profesor, agrupadas por materia, con las
 * pendientes de cobro aparte. El Profesor puede omitir `profesorId` (usa el suyo).
 */
export async function obtenerRendicion(filtros: RendicionQuery): Promise<RendicionResponse> {
  const params = new URLSearchParams();
  if (filtros.profesorId) params.set("profesorId", String(filtros.profesorId));
  if (filtros.desde) params.set("desde", filtros.desde);
  if (filtros.hasta) params.set("hasta", filtros.hasta);
  if (filtros.materiaId) params.set("materiaId", String(filtros.materiaId));

  const qs = params.toString();
  return apiGet<RendicionResponse>(qs ? `${RUTA}?${qs}` : RUTA);
}
