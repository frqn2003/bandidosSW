import type { EstadoTurno } from "@/contracts/turno";
import type {
  CalendarioOcupacionQuery,
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
  /** HU-CAL-03: los turnos pasados llegan como 'Asistió' o 'Ausente'. */
  estado: EstadoTurno;
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

export type BloqueoCalendarioRow = {
  id: number;
  fecha_desde: string;
  fecha_hasta: string;
  profesor_id: number | null;
  motivo: string;
};

export type OcupacionRow = {
  profesor_id: number;
  profesor_nombre: string;
  profesor_apellido: string;
  fecha: string;
  horas_disponibles: string;
  horas_reservadas: string;
  porcentaje_ocupacion: string | null;
  semaforo: "verde" | "amarillo" | "rojo" | null;
  bloqueado: boolean;
};

export type FiltrosHuecos = HuecosQuery;
export type FiltrosOcupacion = CalendarioOcupacionQuery;
export type FiltrosAgenda = AgendaQuery;
export type FiltrosAgendaDia = AgendaDiaQuery;
export type FiltrosCalendarioMes = CalendarioMesQuery;
