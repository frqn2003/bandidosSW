import type {
  EstadoAgenda,
  VerAgendaQuery,
  CrearFranjaInput,
  EditarFranjaInput,
} from "@/contracts/agenda";

export type FranjaRow = {
  id: number;
  agenda_id: number;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  estado: EstadoAgenda;
};

export type AgendaRow = {
  id: number;
  academia_id: number;
  academia_nombre: string;
  nombre: string;
  estado: EstadoAgenda;
};

export type FiltrosVerAgenda = VerAgendaQuery;
export type CrearFranjaInputDto = CrearFranjaInput;
export type EditarFranjaInputDto = EditarFranjaInput;
