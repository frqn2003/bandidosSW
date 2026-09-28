import type {
  AgendaResponse,
  FranjaSemanalResponse,
  DiaSemana,
} from "@/contracts/agenda";
import type { AgendaRow, FranjaRow } from "./agenda.types";

const hhmm = (t: string) => t.slice(0, 5);

export function franjaToApi(row: FranjaRow): FranjaSemanalResponse {
  return {
    id: row.id,
    agendaId: row.agenda_id,
    diaSemana: row.dia_semana as DiaSemana,
    horaInicio: hhmm(row.hora_inicio),
    horaFin: hhmm(row.hora_fin),
    estado: row.estado,
  };
}

export function toApi(row: AgendaRow, franjas: FranjaSemanalResponse[]): AgendaResponse {
  return {
    id: row.id,
    academia: { id: row.academia_id, nombre: row.academia_nombre },
    nombre: row.nombre,
    estado: row.estado,
    franjas,
  };
}
