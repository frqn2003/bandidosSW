import type {
  IndicadoresResponse,
  TurnosPorSemanaItem,
  RankingMateriaDemandaItem,
  RankingMateriaIngresosItem,
} from "@/contracts/indicadores";
import type {
  FiltrosIndicadores,
  MetricasTurnosRow,
  AlumnosMetricasRow,
  TurnosPorSemanaRow,
  RankingMateriaDemandaRow,
  RankingMateriaIngresosRow,
} from "./indicadores.types";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function formatearEtiquetaSemana(fechaInicioStr: string): string {
  const partes = fechaInicioStr.slice(0, 10).split("-");
  if (partes.length === 3) {
    return `Semana del ${partes[2]}/${partes[1]}`;
  }
  return `Semana del ${fechaInicioStr}`;
}

export function toIndicadoresResponse(
  filtros: FiltrosIndicadores,
  metricasTurnos: MetricasTurnosRow,
  horasDisponiblesNum: number,
  metricasAlumnos: AlumnosMetricasRow,
  ingresosNum: number,
  turnosPorSemanaRows: TurnosPorSemanaRow[],
  rankingDemandaRows: RankingMateriaDemandaRow[],
  rankingIngresosRows: RankingMateriaIngresosRow[],
): IndicadoresResponse {
  const turnosGenerados = Number(metricasTurnos.turnos_generados || 0);
  const turnosCancelados = Number(metricasTurnos.turnos_cancelados || 0);
  const horasTurnos = Number(metricasTurnos.horas_turnos || 0);

  const porcentajeCancelaciones =
    turnosGenerados > 0 ? round2((turnosCancelados / turnosGenerados) * 100) : null;

  const porcentajeOcupacion =
    horasDisponiblesNum > 0 ? round2((horasTurnos / horasDisponiblesNum) * 100) : null;

  const turnosPorSemana: TurnosPorSemanaItem[] = turnosPorSemanaRows.map((r) => {
    const fechaInicio = typeof r.fecha_inicio === "string" ? r.fecha_inicio.slice(0, 10) : "";
    return {
      fechaInicio,
      etiquetaSemana: formatearEtiquetaSemana(fechaInicio),
      cantidad: Number(r.cantidad || 0),
    };
  });

  const rankingMateriasMasPedidas: RankingMateriaDemandaItem[] = rankingDemandaRows.map((r) => ({
    materiaId: Number(r.materia_id),
    materiaNombre: r.materia_nombre,
    turnos: Number(r.turnos || 0),
    horasDictadas: round2(Number(r.horas_dictadas || 0)),
  }));

  const rankingMateriasMayorIngreso: RankingMateriaIngresosItem[] = rankingIngresosRows.map((r) => ({
    materiaId: Number(r.materia_id),
    materiaNombre: r.materia_nombre,
    ingresos: round2(Number(r.ingresos || 0)),
    turnos: Number(r.turnos || 0),
  }));

  const ingresosCobrados = round2(ingresosNum);
  const sinDatos = turnosGenerados === 0 && ingresosCobrados === 0;

  return {
    periodo: {
      desde: filtros.desde,
      hasta: filtros.hasta,
    },
    turnosGenerados,
    porcentajeCancelaciones,
    porcentajeOcupacion,
    alumnosActivos: Number(metricasAlumnos.alumnos_activos || 0),
    altasAlumnos: Number(metricasAlumnos.altas_alumnos || 0),
    ingresosCobrados,
    turnosPorSemana,
    rankingMateriasMasPedidas,
    rankingMateriasMayorIngreso,
    sinDatos,
  };
}
