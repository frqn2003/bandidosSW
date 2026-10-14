import type { IndicadoresProfesorResponse } from "@/contracts/indicadores-profesor";
import type {
  AusenciasRow,
  IndicadoresRow,
  MateriaClasesRow,
  MateriaRow,
  ProfesorRow,
  SemanaRow,
} from "./indicadores-profesor.types";

const numOrNull = (v: string | null) => (v === null ? null : Number(v));

/** "2026-09-15" → "Semana del 15/09". */
const etiquetaSemana = (fecha: string) => {
  const [, m, d] = fecha.slice(0, 10).split("-");
  return `Semana del ${d}/${m}`;
};

export function toApi(
  periodo: { desde: string; hasta: string },
  profesor: ProfesorRow,
  materias: MateriaRow[],
  ind: IndicadoresRow,
  semanas: SemanaRow[],
  porMateria: MateriaClasesRow[],
  ausencias: AusenciasRow[],
): IndicadoresProfesorResponse {
  return {
    periodo,
    profesor: { id: profesor.id, nombre: profesor.nombre, apellido: profesor.apellido },
    sinDatos: !ind.hay_datos,
    materiasDictadas: materias.map((m) => ({ id: m.id, nombre: m.nombre })),

    clasesDictadas: Number(ind.clases_dictadas),
    alumnosAtendidos: Number(ind.alumnos_atendidos),
    horasDictadas: Number(ind.horas_dictadas),
    porcentajeAsistencia: numOrNull(ind.porcentaje_asistencia),
    porcentajeCancelaciones: numOrNull(ind.porcentaje_cancelaciones),
    porcentajeOcupacion: numOrNull(ind.porcentaje_ocupacion),

    totalTurnos: Number(ind.total_turnos),
    turnosAusentes: Number(ind.turnos_ausentes),
    turnosCancelados: Number(ind.turnos_cancelados),
    horasReservadas: Number(ind.horas_reservadas),
    horasDisponibles: Number(ind.horas_disponibles),

    clasesPorSemana: semanas.map((s) => ({
      fechaInicio: s.semana_inicio.slice(0, 10),
      fechaFin: s.semana_fin.slice(0, 10),
      etiquetaSemana: etiquetaSemana(s.semana_inicio),
      cantidad: Number(s.clases),
    })),
    clasesPorMateria: porMateria.map((m) => ({
      materiaId: m.materia_id,
      materiaNombre: m.materia,
      clases: Number(m.clases),
    })),
    alumnosConMasAusencias: ausencias.map((a) => ({
      alumnoId: a.alumno_id,
      alumno: a.alumno,
      ausencias: Number(a.ausencias),
    })),
  };
}
