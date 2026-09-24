import type {
  HuecosQuery,
  AgendaDiaQuery,
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
  materia_id: number;
  materia_nombre: string;
  hora_inicio: string;
  hora_fin: string;
  estado: "Reservado" | "Cancelado";
};

export type BloqueHorarioRow = {
  hora_inicio: string;
  hora_fin: string;
};

export type ProfesorInfoRow = {
  id: number;
  nombre: string;
  apellido: string;
};

export type FiltrosHuecos = HuecosQuery;
export type FiltrosAgendaDia = AgendaDiaQuery;
