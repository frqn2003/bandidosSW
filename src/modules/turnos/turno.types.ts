import type {
  CrearTurnoInput,
  EditarTurnoInput,
  CancelarTurnoInput,
  ListarTurnosQuery,
  EstadoTurno,
  NivelMateria,
} from "@/contracts/turno";

export type TurnoDetalleRow = {
  id: number;
  codigo: string | null;
  alumno_id: number;
  alumno_legajo: string | null;
  alumno_nombre: string;
  alumno_apellido: string;
  alumno_dni: string;
  profesor_id: number;
  profesor_nombre: string;
  profesor_apellido: string;
  materia_id: number;
  materia_nombre: string;
  materia_nivel: NivelMateria;
  duracion_clase_minutos: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  valor_clase_congelado: string;
  estado: EstadoTurno;
  observaciones: string | null;
  cantidad_modificaciones: number;
  motivo_cancelacion_id: number | null;
  motivo_cancelacion_nombre: string | null;
  detalle_cancelacion: string | null;
  fecha_cancelacion: Date | string | null;
  cancelacion_tardia: boolean;
  pagado: boolean;
  usuario_id: number;
  usuario_nombre: string;
  usuario_apellido: string;
  created_at: Date;
};

export type ProfesorMateriaInfo = {
  id: number;
  profesor_id: number;
  materia_id: number;
  duracion_clase_minutos: number;
  capacidad_maxima: number;
};

export type FiltrosTurno = ListarTurnosQuery;
export type CrearTurnoInputDto = CrearTurnoInput;
export type EditarTurnoInputDto = EditarTurnoInput;
export type CancelarTurnoInputDto = CancelarTurnoInput;
