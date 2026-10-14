import type {
  ClaveTarjeta,
  IndicadorTarjetaResponse,
  IndicadoresResponse,
  MapaCalorResponse,
} from "@/contracts/indicadores";
import type {
  FiltrosIndicadores,
  MapaCalorRow,
  RankingMateriaDemandaRow,
  RankingMateriaIngresosRow,
  RankingProfesorRow,
  TarjetaDireccionRow,
  TurnosPorSemanaRow,
} from "./indicadores.types";

const numOrNull = (v: string | null) => (v === null ? null : Number(v));

/** "2026-09-15" → "Semana del 15/09". */
function etiquetaSemana(fecha: string): string {
  const [, m, d] = fecha.slice(0, 10).split("-");
  return `Semana del ${d}/${m}`;
}

/** Mismo cálculo que `fn_indicadores_direccion`: igual duración, inmediatamente antes. */
function periodoAnterior(desde: string, hasta: string): { desde: string; hasta: string } {
  const unDia = 86_400_000;
  const d1 = Date.parse(`${desde}T00:00:00Z`);
  const dias = Math.round((Date.parse(`${hasta}T00:00:00Z`) - d1) / unDia) + 1;
  const antHasta = d1 - unDia;
  const antDesde = antHasta - (dias - 1) * unDia;
  const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  return { desde: iso(antDesde), hasta: iso(antHasta) };
}

function tarjetaToApi(t: TarjetaDireccionRow): IndicadorTarjetaResponse {
  return {
    clave: t.clave as ClaveTarjeta,
    etiqueta: t.etiqueta,
    unidad: t.unidad as IndicadorTarjetaResponse["unidad"],
    valor: numOrNull(t.valor),
    valorAnterior: numOrNull(t.valor_anterior),
    variacionPorcentual: numOrNull(t.variacion_porcentual),
    mejora: t.mejora,
    menorEsMejor: t.menor_es_mejor,
  };
}

/**
 * Los campos planos de HU-IND-01 salen de las mismas tarjetas (período actual):
 * una sola fuente de verdad, con el filtro de nivel aplicado.
 */
export function toIndicadoresResponse(
  filtros: FiltrosIndicadores,
  tarjetasRows: TarjetaDireccionRow[],
  semanas: TurnosPorSemanaRow[],
  demanda: RankingMateriaDemandaRow[],
  ingresos: RankingMateriaIngresosRow[],
  profesores: RankingProfesorRow[],
): IndicadoresResponse {
  const tarjetas = tarjetasRows.map(tarjetaToApi);
  const valor = (clave: ClaveTarjeta) => tarjetas.find((t) => t.clave === clave)?.valor ?? null;

  const turnosGenerados = valor("turnos_generados") ?? 0;
  const ingresosCobrados = valor("ingresos_cobrados") ?? 0;

  return {
    periodo: { desde: filtros.desde, hasta: filtros.hasta },
    periodoAnterior: periodoAnterior(filtros.desde, filtros.hasta),
    tarjetas,
    rankingProfesores: profesores.map((p) => ({
      profesorId: p.profesor_id,
      profesor: p.profesor,
      clasesDictadas: Number(p.clases_dictadas),
      horasDictadas: Number(p.horas_dictadas),
    })),
    turnosGenerados,
    porcentajeCancelaciones: valor("porcentaje_cancelaciones"),
    porcentajeOcupacion: valor("porcentaje_ocupacion"),
    alumnosActivos: valor("alumnos_activos") ?? 0,
    altasAlumnos: valor("altas_alumnos") ?? 0,
    ingresosCobrados,
    turnosPorSemana: semanas.map((s) => ({
      fechaInicio: s.semana_inicio.slice(0, 10),
      etiquetaSemana: etiquetaSemana(s.semana_inicio),
      cantidad: Number(s.turnos),
    })),
    rankingMateriasMasPedidas: demanda.map((r) => ({
      materiaId: r.materia_id,
      materiaNombre: r.materia,
      turnos: Number(r.turnos),
      horasDictadas: Number(r.horas_dictadas),
    })),
    rankingMateriasMayorIngreso: ingresos.map((r) => ({
      materiaId: r.materia_id,
      materiaNombre: r.materia,
      ingresos: Number(r.ingresos),
      turnos: Number(r.turnos),
    })),
    sinDatos: turnosGenerados === 0 && ingresosCobrados === 0,
  };
}

export function toMapaCalorResponse(
  filtros: { desde: string; hasta: string },
  rows: MapaCalorRow[],
): MapaCalorResponse {
  const celdas = rows.map((r) => ({
    materiaId: r.materia_id,
    materiaNombre: r.materia,
    franjaHora: Number(r.franja_hora),
    franja: r.franja,
    turnos: Number(r.turnos),
  }));
  return {
    periodo: { desde: filtros.desde, hasta: filtros.hasta },
    celdas,
    maxTurnos: celdas.reduce((max, c) => Math.max(max, c.turnos), 0),
  };
}
