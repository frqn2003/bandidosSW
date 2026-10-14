import type {
  EstadoClase,
  EstadoHistorial,
  ListarClasesDelDiaQuery,
  ListarHistorialQuery,
} from "@/contracts/asistencia";

/** Fila de `asistencia` con los nombres de quién registró y quién corrigió. */
export type AsistenciaRow = {
  id: number;
  turno_id: number;
  presente: boolean;
  tema_trabajado: string | null;
  observaciones: string | null;
  usuario_id: number;
  usuario_nombre: string;
  usuario_apellido: string;
  registrado_at: Date;
  modificado_at: Date | null;
  modificado_por: number | null;
  modificado_por_nombre: string | null;
  modificado_por_apellido: string | null;
  motivo_correccion: string | null;
};

/**
 * Turno + su asistencia (si tiene) + los datos que calcula la base para los
 * flags: ventana de registro y plazo de corrección. Se calculan en SQL con las
 * mismas expresiones que `fn_asistencia_validar`, para que el botón habilitado
 * y el trigger nunca discrepen (zona horaria, fin de jornada, parámetros).
 */
export type ClaseRow = {
  turno_id: number;
  codigo: string;
  profesor_id: number;
  profesor_nombre: string;
  profesor_apellido: string;
  alumno_id: number;
  alumno_legajo: string;
  alumno_nombre: string;
  alumno_apellido: string;
  materia_id: number;
  materia_nombre: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado: EstadoClase;
  /** true si ahora (hora AR) está antes de la ventana. */
  antes_de_ventana: boolean;
  /** true si ahora (hora AR) pasó el fin de la jornada. */
  despues_de_ventana: boolean;
  /** "HH:MM" en que se habilita el registro. */
  ventana_desde: string;
  /** true si la asistencia sigue dentro de `horas_correccion_asistencia`. null sin asistencia. */
  dentro_plazo: boolean | null;
  horas_correccion: number;
  minutos_antes: number;
} & PrefijarAsistencia;

/** Columnas de la asistencia con prefijo `a_` (todas null si no hay registro). */
type PrefijarAsistencia = {
  [K in keyof AsistenciaRow as `a_${K}`]: AsistenciaRow[K] | null;
};

export type HistorialRow = {
  turno_id: number;
  codigo: string;
  fecha: string;
  hora_inicio: string;
  materia_id: number;
  materia_nombre: string;
  profesor_id: number;
  profesor_nombre: string;
  profesor_apellido: string;
  estado: EstadoHistorial;
  tema_trabajado: string | null;
};

export type ResumenRow = {
  clases_asistio: string;
  clases_ausente: string;
  clases_canceladas: string;
  porcentaje_asistencia: string | null;
};

export type FiltrosClasesDelDia = ListarClasesDelDiaQuery;
export type FiltrosHistorial = ListarHistorialQuery;
