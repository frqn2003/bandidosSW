import type { IndicadoresQuery, IndicadoresResponse } from "@/contracts/indicadores";

export type FiltrosIndicadores = IndicadoresQuery;
export type IndicadoresResult = IndicadoresResponse;

export type MetricasTurnosRow = {
  turnos_generados: number;
  turnos_cancelados: number;
  horas_turnos: string;
};

export type HorasDisponibilidadRow = {
  horas_disponibles: string;
};

export type AlumnosMetricasRow = {
  alumnos_activos: number;
  altas_alumnos: number;
};

export type IngresosRow = {
  ingresos: string;
};

export type TurnosPorSemanaRow = {
  fecha_inicio: string;
  cantidad: number;
};

export type RankingMateriaDemandaRow = {
  materia_id: number;
  materia_nombre: string;
  turnos: number;
  horas_dictadas: string;
};

export type RankingMateriaIngresosRow = {
  materia_id: number;
  materia_nombre: string;
  ingresos: string;
  turnos: number;
};
