// src/data/indicadores.ts
//
// Capa de datos de Indicadores y Tableros (HU-IND-01).
// Conecta el frontend con la API respetando los contratos y tipos canónicos.
// Contrato: src/contracts/indicadores.ts

import {
  RUTA,
  type IndicadoresQuery,
  type IndicadoresResponse,
  type ErrorIndicadores,
} from "@/contracts/indicadores";
import { apiGet, ApiError } from "@/lib/api-client";
import { listarMaterias } from "@/data/materias";
import { listarProfesores } from "@/data/profesores";
import type { OpcionCatalogo } from "@/modules/indicadores/types";

export { RUTA };
export type { IndicadoresQuery, IndicadoresResponse, ErrorIndicadores };

/**
 * Consulta los indicadores analíticos de gestión para el período y filtros seleccionados.
 * Conectado al endpoint GET /api/indicadores.
 */
export async function consultarIndicadores(
  filtros: IndicadoresQuery
): Promise<IndicadoresResponse> {
  const { desde, hasta, materiaId, profesorId } = filtros;

  // Validación previa de contrato
  if (hasta < desde) {
    throw new ApiError(
      "RANGO_INVALIDO",
      "La fecha de fin no puede ser anterior a la de inicio.",
      "hasta",
      422
    );
  }

  const d1 = new Date(`${desde}T00:00:00Z`);
  const d2 = new Date(`${hasta}T00:00:00Z`);
  const diffDias = (d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDias > 366) {
    throw new ApiError(
      "RANGO_MAXIMO_EXCEDIDO",
      "El período seleccionado no puede superar los 12 meses.",
      "hasta",
      422
    );
  }

  const params = new URLSearchParams();
  if (desde) params.set("desde", desde);
  if (hasta) params.set("hasta", hasta);
  if (materiaId) params.set("materiaId", String(materiaId));
  if (profesorId) params.set("profesorId", String(profesorId));

  const qs = params.toString();
  const url = qs ? `${RUTA}?${qs}` : RUTA;
  return apiGet<IndicadoresResponse>(url);
}

/**
 * Carga el catálogo de materias activas para el select de filtros.
 */
export async function obtenerMateriasFiltro(): Promise<OpcionCatalogo[]> {
  try {
    const materias = await listarMaterias({ estado: "activo" });
    if (materias && materias.length > 0) {
      return materias.map((m) => ({ id: m.id, nombre: m.nombre }));
    }
  } catch {
    // Si falla la API devuelve catálogo vacío
  }
  return [];
}

/**
 * Carga el catálogo de profesores activos para el select de filtros.
 * Si se especifica materiaId, filtra docentes que dictan dicha materia.
 */
export async function obtenerProfesoresFiltro(materiaId?: number): Promise<OpcionCatalogo[]> {
  try {
    const profesores = await listarProfesores({
      estado: "activo",
      materiaId: materiaId || undefined,
    });
    if (profesores && profesores.length > 0) {
      return profesores.map((p) => ({
        id: p.id,
        nombre: `${p.usuario.nombre} ${p.usuario.apellido}`,
      }));
    }
  } catch {
    // Si falla la API devuelve catálogo vacío
  }
  return [];
}
