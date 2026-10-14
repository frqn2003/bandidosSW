import { query } from "@/lib/db/client";
import type {
  AusenciasRow,
  IndicadoresRow,
  MateriaClasesRow,
  MateriaRow,
  Periodo,
  ProfesorRow,
  SemanaRow,
} from "./indicadores-profesor.types";

const params = (p: Periodo) => [p.profesorId, p.desde, p.hasta, p.materiaId ?? null];

export async function obtenerProfesor(profesorId: number): Promise<ProfesorRow | null> {
  const filas = await query<ProfesorRow>(
    `SELECT p.id, u.nombre, u.apellido, p.estado
     FROM profesor p JOIN usuario u ON u.id = p.usuario_id
     WHERE p.id = $1`,
    [profesorId],
  );
  return filas[0] ?? null;
}

export async function profesorDeUsuario(usuarioId: number): Promise<ProfesorRow | null> {
  const filas = await query<ProfesorRow>(
    `SELECT p.id, u.nombre, u.apellido, p.estado
     FROM profesor p JOIN usuario u ON u.id = p.usuario_id
     WHERE p.usuario_id = $1 AND p.estado = 'activo'`,
    [usuarioId],
  );
  return filas[0] ?? null;
}

/** Materias activas que el profesor dicta (combo del filtro). */
export async function materiasDictadas(profesorId: number): Promise<MateriaRow[]> {
  return query<MateriaRow>(
    `SELECT m.id, m.nombre
     FROM profesor_materia pm JOIN materia m ON m.id = pm.materia_id
     WHERE pm.profesor_id = $1 AND m.estado = 'activo'
     ORDER BY m.nombre`,
    [profesorId],
  );
}

export async function dictaMateria(profesorId: number, materiaId: number): Promise<boolean> {
  const filas = await query(
    `SELECT 1 FROM profesor_materia WHERE profesor_id = $1 AND materia_id = $2`,
    [profesorId, materiaId],
  );
  return filas.length > 0;
}

/** Tarjetas y base de cálculo (`fn_indicadores_profesor`). */
export async function indicadores(p: Periodo): Promise<IndicadoresRow> {
  const filas = await query<IndicadoresRow>(
    `SELECT
       i.hay_datos,
       i.clases_dictadas::text AS clases_dictadas,
       i.alumnos_atendidos::text AS alumnos_atendidos,
       i.horas_dictadas::text AS horas_dictadas,
       i.porcentaje_asistencia::text AS porcentaje_asistencia,
       i.porcentaje_cancelaciones::text AS porcentaje_cancelaciones,
       i.porcentaje_ocupacion::text AS porcentaje_ocupacion,
       i.total_turnos::text AS total_turnos,
       i.turnos_ausentes::text AS turnos_ausentes,
       i.turnos_cancelados::text AS turnos_cancelados,
       i.horas_reservadas::text AS horas_reservadas,
       i.horas_disponibles::text AS horas_disponibles
     FROM fn_indicadores_profesor($1, $2::date, $3::date, $4::int) i`,
    params(p),
  );
  return filas[0];
}

/** Clases dictadas por semana, con las semanas en 0 (`fn_profesor_clases_por_semana`). */
export async function clasesPorSemana(p: Periodo): Promise<SemanaRow[]> {
  return query<SemanaRow>(
    `SELECT s.semana_inicio::text AS semana_inicio, s.semana_fin::text AS semana_fin,
            s.clases::text AS clases
     FROM fn_profesor_clases_por_semana($1, $2::date, $3::date, $4::int) s`,
    params(p),
  );
}

/** Distribución de clases dictadas por materia (`fn_profesor_clases_por_materia`). */
export async function clasesPorMateria(p: Periodo): Promise<MateriaClasesRow[]> {
  return query<MateriaClasesRow>(
    `SELECT m.materia_id, m.materia, m.clases::text AS clases
     FROM fn_profesor_clases_por_materia($1, $2::date, $3::date, $4::int) m`,
    params(p),
  );
}

/** Top 5 de alumnos con más ausencias (`fn_profesor_top_ausencias`). */
export async function topAusencias(p: Periodo): Promise<AusenciasRow[]> {
  return query<AusenciasRow>(
    `SELECT a.alumno_id, a.alumno, a.ausencias::text AS ausencias
     FROM fn_profesor_top_ausencias($1, $2::date, $3::date, $4::int) a`,
    params(p),
  );
}
