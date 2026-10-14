/** Fila de `fn_indicadores_profesor` (bigint y numeric llegan como texto). */
export type IndicadoresRow = {
  hay_datos: boolean;
  clases_dictadas: string;
  alumnos_atendidos: string;
  horas_dictadas: string;
  porcentaje_asistencia: string | null;
  porcentaje_cancelaciones: string | null;
  porcentaje_ocupacion: string | null;
  total_turnos: string;
  turnos_ausentes: string;
  turnos_cancelados: string;
  horas_reservadas: string;
  horas_disponibles: string;
};

export type SemanaRow = { semana_inicio: string; semana_fin: string; clases: string };

export type MateriaClasesRow = { materia_id: number; materia: string; clases: string };

export type AusenciasRow = { alumno_id: number; alumno: string; ausencias: string };

export type ProfesorRow = { id: number; nombre: string; apellido: string; estado: string };

export type MateriaRow = { id: number; nombre: string };

export type Periodo = { profesorId: number; desde: string; hasta: string; materiaId?: number };
