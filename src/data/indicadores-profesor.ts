// src/data/indicadores-profesor.ts
//
// Capa de datos para Indicadores de Actividad del Profesor (HU-IND-02).
// Conecta el frontend con el endpoint oficial GET /api/indicadores/profesor.
// Solo lectura. Sin información financiera o de pagos.
// Contrato: src/contracts/indicadores-profesor.ts · Guía: docs/contratos/indicadores-profesor.md

import {
  RUTA,
  type IndicadoresProfesorQuery,
  type IndicadoresProfesorResponse,
} from "@/contracts/indicadores-profesor";
import { rangoMenorA12Meses } from "@/contracts/indicadores";
import { apiGet, ApiError } from "@/lib/api-client";

export { RUTA };
export type { IndicadoresProfesorQuery, IndicadoresProfesorResponse };

/**
 * Indicadores de actividad para el período y la materia indicados.
 * El Profesor omite `profesorId`: el back usa el de la sesión. El Gerente lo manda.
 */
export async function consultarIndicadoresProfesor(
  filtros: Partial<IndicadoresProfesorQuery>
): Promise<IndicadoresProfesorResponse> {
  const { desde, hasta, materiaId, profesorId } = filtros;

  // Validación previa de consistencia temporal (el back la repite)
  if (desde && hasta && hasta < desde) {
    throw new ApiError(
      "RANGO_INVALIDO",
      "La fecha de fin no puede ser anterior a la de inicio.",
      "hasta",
      422
    );
  }

  if (desde && hasta && !rangoMenorA12Meses(desde, hasta)) {
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
  return apiGet<IndicadoresProfesorResponse>(qs ? `${RUTA}?${qs}` : RUTA);
}
