import type { MapaCalorQuery, MapaCalorResponse } from "@/contracts/indicadores";
import { ValidationError } from "@/lib/http/errors";
import type { FiltrosIndicadores, IndicadoresResult } from "./indicadores.types";
import * as repo from "./indicadores.repo";
import * as mapper from "./indicadores.mapper";

/**
 * Validaciones comunes del tablero y del mapa de calor. El rol (solo Gerente)
 * lo controla la ruta.
 */
async function validarFiltros(f: {
  desde: string;
  hasta: string;
  profesorId?: number;
  materiaId?: number;
}): Promise<void> {
  // El zod del contrato acepta hasta 366 días; esto replica el límite exacto
  // de `fn_validar_periodo` (hasta <= desde + 12 meses) para no caer en su excepción.
  const [y, m, d] = f.desde.split("-").map(Number);
  if (Date.parse(`${f.hasta}T00:00:00Z`) > Date.UTC(y, m - 1 + 12, d)) {
    throw new ValidationError(
      "RANGO_MAXIMO_EXCEDIDO",
      "El período seleccionado no puede superar los 12 meses.",
      "hasta",
    );
  }
  if (f.profesorId !== undefined && !(await repo.existeProfesor(f.profesorId))) {
    throw new ValidationError("REFERENCIA_INVALIDA", "El profesor no existe.", "profesorId");
  }
  if (f.materiaId !== undefined && !(await repo.existeMateria(f.materiaId))) {
    throw new ValidationError("REFERENCIA_INVALIDA", "La materia no existe.", "materiaId");
  }
}

/**
 * Tablero de dirección (HU-IND-01 + HU-IND-03). Todas las cifras salen de las
 * funciones de la base, en paralelo.
 */
export async function obtenerIndicadores(filtros: FiltrosIndicadores): Promise<IndicadoresResult> {
  await validarFiltros(filtros);

  const [tarjetas, semanas, demanda, ingresos, profesores] = await Promise.all([
    repo.tarjetas(filtros),
    repo.turnosPorSemana(filtros),
    repo.topMateriasDemanda(filtros),
    repo.topMateriasIngresos(filtros),
    repo.topProfesores(filtros),
  ]);

  return mapper.toIndicadoresResponse(filtros, tarjetas, semanas, demanda, ingresos, profesores);
}

/** HU-IND-03: mapa de calor de demanda por materia y franja horaria. */
export async function obtenerMapaCalor(filtros: MapaCalorQuery): Promise<MapaCalorResponse> {
  await validarFiltros(filtros);
  const rows = await repo.mapaCalor(filtros);
  return mapper.toMapaCalorResponse(filtros, rows);
}
