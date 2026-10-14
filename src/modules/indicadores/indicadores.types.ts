import type { IndicadoresQuery, IndicadoresResponse } from "@/contracts/indicadores";

export type FiltrosIndicadores = IndicadoresQuery;
export type IndicadoresResult = IndicadoresResponse;

/** Fila de `fn_indicadores_direccion` (numeric llega como texto). */
export type TarjetaDireccionRow = {
  clave: string;
  etiqueta: string;
  unidad: string;
  valor: string | null;
  valor_anterior: string | null;
  variacion_porcentual: string | null;
  mejora: boolean | null;
  menor_es_mejor: boolean;
};

/** Fila de `fn_ind_turnos_por_semana`. */
export type TurnosPorSemanaRow = {
  semana_inicio: string;
  turnos: string;
};

/** Fila de `fn_ind_top_materias_demanda`. */
export type RankingMateriaDemandaRow = {
  materia_id: number;
  materia: string;
  turnos: string;
  horas_dictadas: string;
};

/** Fila de `fn_ind_top_materias_ingresos`. */
export type RankingMateriaIngresosRow = {
  materia_id: number;
  materia: string;
  ingresos: string;
  turnos: string;
};

/** Fila de `fn_ind_top_profesores`. */
export type RankingProfesorRow = {
  profesor_id: number;
  profesor: string;
  clases_dictadas: string;
  horas_dictadas: string;
};

/** Fila de `fn_ind_mapa_calor`. */
export type MapaCalorRow = {
  materia_id: number;
  materia: string;
  franja_hora: number;
  franja: string;
  turnos: string;
};
