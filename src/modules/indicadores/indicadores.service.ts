import type { FiltrosIndicadores, IndicadoresResult } from "./indicadores.types";
import type { MapaCalorQuery, MapaCalorResponse } from "@/contracts/indicadores";
import * as repo from "./indicadores.repo";
import * as mapper from "./indicadores.mapper";

/**
 * Consulta y consolida todos los indicadores de dirección del centro académico para el rol Gerente (HU-IND-01 / HU-IND-03).
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
    tarjetas,
    rankingProfesores,
  ] = await Promise.all([
    repo.obtenerMetricasTurnos(filtros),
    repo.obtenerHorasDisponibilidad(filtros),
    repo.obtenerMetricasAlumnos(filtros),
    repo.obtenerIngresosCobrados(filtros),
    repo.obtenerTurnosPorSemana(filtros),
    repo.obtenerRankingMateriasMasPedidas(filtros),
    repo.obtenerRankingMateriasMayorIngreso(filtros),
    repo.obtenerTarjetasDireccion(filtros).catch((err) => {
      console.warn("[indicadores] error al obtener tarjetas:", err);
      return [];
    }),
    repo.obtenerRankingProfesores(filtros).catch((err) => {
      console.warn("[indicadores] error al obtener ranking profesores:", err);
      return [];
    }),
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
    tarjetas,
    rankingProfesores,
  );
}

/**
 * HU-IND-03: Consulta el mapa de calor de demanda por materia y franja horaria.
 */
export async function obtenerMapaCalor(
  filtros: MapaCalorQuery,
): Promise<MapaCalorResponse> {
  const rows = await repo.obtenerMapaCalor(filtros);
  return mapper.toMapaCalorResponse(filtros, rows);
}

