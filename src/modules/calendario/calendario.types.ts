import type {
  HuecosQuery,
  AgendaQuery,
  AgendaDiaQuery,
  CalendarioMesQuery,
} from "@/contracts/calendario";

export type HuecoRow = {
  agenda_profesional_id: number;
  profesor_id: number;
  profesor_nombre: string;
  profesor_apellido: string;
  fecha: string;
  hueco_inicio: string;
  hueco_fin: string;
};

export type TurnoCalendarioRow = {
  id: number;
  codigo: string | null;
  alumno_id: number;
  alumno_nombre: string;
  alumno_apellido: string;
  profesor_id: number;
  profesor_nombre: string;
  profesor_apellido: string;
  materia_id: number;
  materia_nombre: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado: "Reservado" | "Cancelado";
  cantidad_modificaciones: number;
  cancelacion_tardia: boolean;
  pagado: boolean;
};

export type BloqueHorarioRow = {
  profesor_id?: number;
  dia_semana?: number;
  hora_inicio: string;
  hora_fin: string;
};

export type ProfesorInfoRow = {
  id: number;
  nombre: string;
  apellido: string;
};

export type TurnosPorDiaRow = {
  fecha: string;
  cantidad_turnos: number;
};

export type FiltrosHuecos = HuecosQuery;
export type FiltrosAgenda = AgendaQuery;
export type FiltrosAgendaDia = AgendaDiaQuery;
export type FiltrosCalendarioMes = CalendarioMesQuery;
