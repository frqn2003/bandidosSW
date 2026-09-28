import type {
  HuecoResponse,
  TurnoCalendarioResponse,
  AgendaDiaResponse,
} from "@/contracts/calendario";
import type {
  HuecoRow,
  TurnoCalendarioRow,
  BloqueHorarioRow,
  ProfesorInfoRow,
} from "./calendario.types";

const hhmm = (t: string) => t.slice(0, 5);

function aMinutos(h: string): number {
  const [hh, mm] = h.slice(0, 5).split(":").map(Number);
  return hh * 60 + mm;
}

export function minutosEntre(inicio: string, fin: string): number {
  return aMinutos(fin) - aMinutos(inicio);
}

export function huecoToApi(row: HuecoRow): HuecoResponse {
  return {
    agendaProfesionalId: row.agenda_profesional_id,
    profesor: {
      id: row.profesor_id,
      nombre: row.profesor_nombre,
      apellido: row.profesor_apellido,
    },
    fecha: row.fecha.slice(0, 10),
    horaInicio: hhmm(row.hueco_inicio),
    horaFin: hhmm(row.hueco_fin),
    duracionMinutos: minutosEntre(row.hueco_inicio, row.hueco_fin),
  };
}

export function turnoCalendarioToApi(row: TurnoCalendarioRow): TurnoCalendarioResponse {
  return {
    id: row.id,
    codigo: row.codigo ?? `TUR-${String(row.id).padStart(6, "0")}`,
    alumno: {
      id: row.alumno_id,
      nombre: row.alumno_nombre,
      apellido: row.alumno_apellido,
    },
    materia: {
      id: row.materia_id,
      nombre: row.materia_nombre,
    },
    horaInicio: hhmm(row.hora_inicio),
    horaFin: hhmm(row.hora_fin),
    estado: row.estado,
  };
}

export function bloqueHorarioToApi(row: BloqueHorarioRow): { horaInicio: string; horaFin: string } {
  return {
    horaInicio: hhmm(row.hora_inicio),
    horaFin: hhmm(row.hora_fin),
  };
}

export function agendaDiaToApi(
  profesor: ProfesorInfoRow,
  fecha: string,
  bloques: BloqueHorarioRow[],
  turnos: TurnoCalendarioRow[],
  huecos: HuecoRow[],
): AgendaDiaResponse {
  return {
    profesor: {
      id: profesor.id,
      nombre: profesor.nombre,
      apellido: profesor.apellido,
    },
    fecha: fecha.slice(0, 10),
    bloques: bloques.map(bloqueHorarioToApi),
    turnos: turnos.map(turnoCalendarioToApi),
    huecos: huecos.map(huecoToApi),
  };
}
