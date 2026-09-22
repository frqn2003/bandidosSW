import type {
  CrearBloqueInput,
  EditarBloqueInput,
  ListarDisponibilidadQuery,
  EstadoDisponibilidad,
  DiaSemana,
} from "@/contracts/disponibilidad";

/** Fila con el bloque horario completo tras el JOIN con profesor y agenda_semanal. */
export type BloqueRow = {
  id: number;
  profesor_id: number;
  profesor_nombre: string;
  profesor_apellido: string;
  agenda_semanal_id: number;
  dia_semana: DiaSemana;
  hora_inicio: string;
  hora_fin: string;
  franja_hora_inicio: string;
  franja_hora_fin: string;
  estado: EstadoDisponibilidad;
};

/** Datos de la franja del horario de atención de la academia. */
export type FranjaAtencionRow = {
  id: number;
  agenda_id: number;
  academia_id: number;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  estado: string;
};

export type FiltrosDisponibilidad = ListarDisponibilidadQuery;
export type CrearBloqueInputDto = CrearBloqueInput;
export type EditarBloqueInputDto = EditarBloqueInput;
