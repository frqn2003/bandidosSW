import { query } from "@/lib/db/client";
import type { MapaCalorQuery } from "@/contracts/indicadores";
import type {
  FiltrosIndicadores,
  MapaCalorRow,
  RankingMateriaDemandaRow,
  RankingMateriaIngresosRow,
  RankingProfesorRow,
  TarjetaDireccionRow,
  TurnosPorSemanaRow,
} from "./indicadores.types";

/**
 * Todo el cálculo vive en la base (db/migrations/07_ind03_tablero_direccion.sql):
 * misma definición de deuda que HU-PAG-02, ingresos sin pagos anulados,
 * ocupación con `fn_ocupacion` y el filtro `nivel` en todas las cifras.
 * Las funciones reciben (desde, hasta, materia, profesor, nivel).
 */
const params = (f: FiltrosIndicadores) => [
  f.desde,
  f.hasta,
  f.materiaId ?? null,
  f.profesorId ?? null,
  f.nivel ?? null,
];

const ARGS = `$1::date, $2::date, $3::int, $4::int, $5::nivel_materia`;

/** Las 8 tarjetas con su comparación contra el período anterior. */
export async function tarjetas(f: FiltrosIndicadores): Promise<TarjetaDireccionRow[]> {
  return query<TarjetaDireccionRow>(
    `SELECT clave, etiqueta, unidad,
            valor::text AS valor,
            valor_anterior::text AS valor_anterior,
            variacion_porcentual::text AS variacion_porcentual,
            mejora, menor_es_mejor
     FROM fn_indicadores_direccion(${ARGS})`,
    params(f),
  );
}

/** Turnos generados por semana (incluye cancelados y semanas en 0). */
export async function turnosPorSemana(f: FiltrosIndicadores): Promise<TurnosPorSemanaRow[]> {
  return query<TurnosPorSemanaRow>(
    `SELECT semana_inicio::text AS semana_inicio, turnos::text AS turnos
     FROM fn_ind_turnos_por_semana(${ARGS})`,
    params(f),
  );
}

export async function topMateriasDemanda(f: FiltrosIndicadores): Promise<RankingMateriaDemandaRow[]> {
  return query<RankingMateriaDemandaRow>(
    `SELECT materia_id, materia, turnos::text AS turnos, horas_dictadas::text AS horas_dictadas
     FROM fn_ind_top_materias_demanda(${ARGS})`,
    params(f),
  );
}

export async function topMateriasIngresos(f: FiltrosIndicadores): Promise<RankingMateriaIngresosRow[]> {
  return query<RankingMateriaIngresosRow>(
    `SELECT materia_id, materia, ingresos::text AS ingresos, turnos::text AS turnos
     FROM fn_ind_top_materias_ingresos(${ARGS})`,
    params(f),
  );
}

/** Top 5 profesores por clases dictadas ('Asistió'). */
export async function topProfesores(f: FiltrosIndicadores): Promise<RankingProfesorRow[]> {
  return query<RankingProfesorRow>(
    `SELECT profesor_id, profesor,
            clases_dictadas::text AS clases_dictadas,
            horas_dictadas::text AS horas_dictadas
     FROM fn_ind_top_profesores(${ARGS})`,
    params(f),
  );
}

/** Celdas con demanda (turnos no cancelados) por materia y franja de una hora. */
export async function mapaCalor(f: MapaCalorQuery): Promise<MapaCalorRow[]> {
  return query<MapaCalorRow>(
    `SELECT materia_id, materia, franja_hora, franja, turnos::text AS turnos
     FROM fn_ind_mapa_calor(${ARGS}, $6::time, $7::time)`,
    [...params(f), f.horaDesde ?? null, f.horaHasta ?? null],
  );
}

export async function existeProfesor(profesorId: number): Promise<boolean> {
  const filas = await query(`SELECT 1 FROM profesor WHERE id = $1`, [profesorId]);
  return filas.length > 0;
}

export async function existeMateria(materiaId: number): Promise<boolean> {
  const filas = await query(`SELECT 1 FROM materia WHERE id = $1`, [materiaId]);
  return filas.length > 0;
}
