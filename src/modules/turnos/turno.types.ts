import type {
  CrearTurnoInput,
  EditarTurnoInput,
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
