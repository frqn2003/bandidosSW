import type {
  IndicadoresResponse,
  TurnosPorSemanaItem,
  RankingMateriaDemandaItem,
  RankingMateriaIngresosItem,
  IndicadorTarjetaResponse,
  RankingProfesorItem,
  ClaveTarjeta,
  MapaCalorResponse,
  MapaCalorCeldaResponse,
} from "@/contracts/indicadores";
import type {
  FiltrosIndicadores,
  MetricasTurnosRow,
  AlumnosMetricasRow,
  TurnosPorSemanaRow,
  RankingMateriaDemandaRow,
  RankingMateriaIngresosRow,
  TarjetaDireccionRow,
  RankingProfesorRow,
  MapaCalorRow,
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

function calcularPeriodoAnterior(desde: string, hasta: string): { desde: string; hasta: string } {
  const d1 = new Date(`${desde}T00:00:00Z`);
  const d2 = new Date(`${hasta}T00:00:00Z`);
  const dias = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const antHasta = new Date(d1);
  antHasta.setUTCDate(antHasta.getUTCDate() - 1);
  const antDesde = new Date(antHasta);
  antDesde.setUTCDate(antDesde.getUTCDate() - (dias - 1));

  return {
    desde: antDesde.toISOString().slice(0, 10),
    hasta: antHasta.toISOString().slice(0, 10),
  };
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
  tarjetasRows: TarjetaDireccionRow[] = [],
  rankingProfesoresRows: RankingProfesorRow[] = [],
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

  const tarjetas: IndicadorTarjetaResponse[] = tarjetasRows.map((t) => ({
    clave: t.clave as ClaveTarjeta,
    etiqueta: t.etiqueta,
    unidad: t.unidad as "cantidad" | "porcentaje" | "pesos",
    valor: t.valor !== null ? Number(t.valor) : null,
    valorAnterior: t.valor_anterior !== null ? Number(t.valor_anterior) : null,
    variacionPorcentual: t.variacion_porcentual !== null ? Number(t.variacion_porcentual) : null,
    mejora: t.mejora,
    menorEsMejor: t.menor_es_mejor,
  }));

  const rankingProfesores: RankingProfesorItem[] = rankingProfesoresRows.map((p) => ({
    profesorId: Number(p.profesor_id),
    profesor: p.profesor,
    clasesDictadas: Number(p.clases_dictadas || 0),
    horasDictadas: round2(Number(p.horas_dictadas || 0)),
  }));

  const ingresosCobrados = round2(ingresosNum);
  const sinDatos = turnosGenerados === 0 && ingresosCobrados === 0;

  return {
    periodo: {
      desde: filtros.desde,
      hasta: filtros.hasta,
    },
    periodoAnterior: calcularPeriodoAnterior(filtros.desde, filtros.hasta),
    tarjetas,
    rankingProfesores,
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

export function toMapaCalorResponse(
  filtros: { desde: string; hasta: string },
  rows: MapaCalorRow[],
): MapaCalorResponse {
  const celdas: MapaCalorCeldaResponse[] = rows.map((r) => ({
    materiaId: Number(r.materia_id),
    materiaNombre: r.materia,
    franjaHora: Number(r.franja_hora),
    franja: r.franja,
    turnos: Number(r.turnos || 0),
  }));

  const maxTurnos = celdas.reduce((max, c) => Math.max(max, c.turnos), 0);

  return {
    periodo: { desde: filtros.desde, hasta: filtros.hasta },
    celdas,
    maxTurnos,
  };
}

