import type { ListarHistorialAlumnoQuery } from "@/contracts/historial";

/** Fila de `vw_historial_alumno` (fecha_hora ya en hora de Argentina). */
export type EventoRow = {
  tipo: string;
  fecha_hora: string;
  materia_id: number | null;
  materia: string | null;
  profesor_id: number | null;
  profesor: string | null;
  detalle: string;
  observaciones: string | null;
  cancelacion_tardia: boolean;
  responsable: string | null;
  usuario_id: number | null;
  usuario: string | null;
  turno_id: number | null;
  fecha_clase: string | null;
  hora_clase: string | null;
};

/** Fila de `fn_historial_resumen`. */
export type ResumenRow = {
  clases_asistidas: string;
  ausencias: string;
  cancelaciones: string;
  porcentaje_asistencia: string | null;
  fecha_ultima_clase: string | null;
};

export type NotaRow = {
  id: number;
  alumno_id: number;
  texto: string;
  usuario_id: number;
  usuario_nombre: string;
  usuario_apellido: string;
  created_at: Date;
};

export type FiltrosHistorial = ListarHistorialAlumnoQuery;
