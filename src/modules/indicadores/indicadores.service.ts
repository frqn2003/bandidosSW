import type { FiltrosIndicadores, IndicadoresResult } from "./indicadores.types";
import * as repo from "./indicadores.repo";
import * as mapper from "./indicadores.mapper";

/**
 * Consulta y consolida todos los indicadores de gestión del centro académico para el rol Gerente (HU-IND-01).
 * Todas las consultas analíticas se ejecutan en paralelo para máxima performance.
 */
export async function obtenerIndicadores(
  filtros: FiltrosIndicadores,
): Promise<IndicadoresResult> {
  const [
    metricasTurnos,
    horasDisponibles,
    metricasAlumnos,
    ingresos,
    turnosPorSemana,
    rankingDemanda,
    rankingIngresos,
  ] = await Promise.all([
    repo.obtenerMetricasTurnos(filtros),
    repo.obtenerHorasDisponibilidad(filtros),
    repo.obtenerMetricasAlumnos(filtros),
    repo.obtenerIngresosCobrados(filtros),
    repo.obtenerTurnosPorSemana(filtros),
    repo.obtenerRankingMateriasMasPedidas(filtros),
    repo.obtenerRankingMateriasMayorIngreso(filtros),
  ]);

  return mapper.toIndicadoresResponse(
    filtros,
    metricasTurnos,
    horasDisponibles,
    metricasAlumnos,
    ingresos,
    turnosPorSemana,
    rankingDemanda,
    rankingIngresos,
  );
}
