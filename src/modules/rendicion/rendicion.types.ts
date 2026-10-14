/** Fila de `fn_rendicion_detalle` + nombre y apellido del alumno por separado. */
export type RendicionDetalleRow = {
  turno_id: number;
  fecha_clase: string;
  alumno_id: number;
  alumno_nombre: string;
  alumno_apellido: string;
  materia_id: number;
  materia: string;
  importe_cobrado: string;
  medio_pago: string;
  comprobante: string | null;
  fecha_pago: string;
  estado_clase: string;
};

/** Fila de `fn_rendicion_pendientes` + nombre y apellido del alumno por separado. */
export type RendicionPendienteRow = {
  turno_id: number;
  fecha_clase: string;
  alumno_id: number;
  alumno_nombre: string;
  alumno_apellido: string;
  materia_id: number;
  materia: string;
  importe_pendiente: string;
  estado_clase: string;
};

export type ProfesorRow = { id: number; nombre: string; apellido: string };
