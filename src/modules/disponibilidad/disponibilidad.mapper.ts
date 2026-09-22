import type {
  BloqueDisponibilidadResponse,
  DiaSemana,
} from "@/contracts/disponibilidad";
import type { BloqueRow } from "./disponibilidad.types";

const hhmm = (t: string) => t.slice(0, 5); // Recorta "09:00:00" → "09:00"

/**
 * Traduce una fila cruda de bloque con su JOIN a la respuesta de la API.
 */
export function toApi(row: BloqueRow): BloqueDisponibilidadResponse {
  return {
    id: row.id,
    profesor: {
      id: row.profesor_id,
      nombre: row.profesor_nombre,
      apellido: row.profesor_apellido,
    },
    agendaSemanalId: row.agenda_semanal_id,
    diaSemana: Number(row.dia_semana) as DiaSemana,
    horaInicio: hhmm(row.hora_inicio),
    horaFin: hhmm(row.hora_fin),
    franjaAtencion: {
      horaInicio: hhmm(row.franja_hora_inicio),
      horaFin: hhmm(row.franja_hora_fin),
    },
    estado: row.estado,
  };
}

export function toApiList(rows: BloqueRow[]): BloqueDisponibilidadResponse[] {
  return rows.map(toApi);
}
