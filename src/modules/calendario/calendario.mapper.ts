import type {
  HuecoResponse,
  TurnoCalendarioResponse,
  AgendaDiaResponse,
  BloqueHorarioResponse,
  DiaResumenMesResponse,
  BloqueoCalendarioResponse,
  OcupacionDiaResponse,
} from "@/contracts/calendario";
import type {
  HuecoRow,
  TurnoCalendarioRow,
  BloqueHorarioRow,
  ProfesorInfoRow,
  TurnosPorDiaRow,
  BloqueoCalendarioRow,
  OcupacionRow,
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

export function calcularAccionesTurno(
  row: TurnoCalendarioRow,
  esProfesor: boolean,
  ahora: Date = new Date(),
): { puedeModificar: boolean; puedeCancelar: boolean } {
  if (esProfesor) {
    return { puedeModificar: false, puedeCancelar: false };
  }
  // Solo un turno Reservado se modifica o cancela: Asistió/Ausente ya tienen asistencia.
  if (row.estado !== "Reservado" || row.pagado) {
    return { puedeModificar: false, puedeCancelar: false };
  }

  const [hh, mm] = row.hora_inicio.slice(0, 5).split(":").map(Number);
  const [y, m, d] = row.fecha.slice(0, 10).split("-").map(Number);
  const fechaTurno = new Date(y, m - 1, d, hh, mm, 0);

  if (fechaTurno.getTime() <= ahora.getTime()) {
    return { puedeModificar: false, puedeCancelar: false };
  }

  const diffHoras = (fechaTurno.getTime() - ahora.getTime()) / (1000 * 60 * 60);
  if (row.cantidad_modificaciones >= 2 || diffHoras < 2) {
    return { puedeModificar: false, puedeCancelar: true };
  }

  return { puedeModificar: true, puedeCancelar: true };
}

export function turnoCalendarioToApi(
  row: TurnoCalendarioRow,
  esProfesor = false,
): TurnoCalendarioResponse {
  const { puedeModificar, puedeCancelar } = calcularAccionesTurno(row, esProfesor);
  return {
    id: row.id,
    codigo: row.codigo ?? `TUR-${String(row.id).padStart(6, "0")}`,
    fecha: row.fecha.slice(0, 10),
    alumno: {
      id: row.alumno_id,
      nombre: row.alumno_nombre,
      apellido: row.alumno_apellido,
    },
    profesor: {
      id: row.profesor_id,
      nombre: row.profesor_nombre,
      apellido: row.profesor_apellido,
    },
    materia: {
      id: row.materia_id,
      nombre: row.materia_nombre,
    },
    horaInicio: hhmm(row.hora_inicio),
    horaFin: hhmm(row.hora_fin),
    estado: row.estado,
    puedeModificar,
    puedeCancelar,
    cantidadModificaciones: row.cantidad_modificaciones,
    cancelacionTardia: row.cancelacion_tardia,
    pagado: row.pagado,
  };
}

export function bloqueHorarioToApi(row: BloqueHorarioRow): BloqueHorarioResponse {
  return {
    profesorId: row.profesor_id,
    diaSemana: row.dia_semana,
    horaInicio: hhmm(row.hora_inicio),
    horaFin: hhmm(row.hora_fin),
  };
}

export function diaResumenMesToApi(row: TurnosPorDiaRow): DiaResumenMesResponse {
  return {
    fecha: row.fecha.slice(0, 10),
    cantidadTurnos: row.cantidad_turnos,
  };
}

export function agendaToApi(
  profesor: ProfesorInfoRow | null,
  profesores: ProfesorInfoRow[],
  fecha: string,
  bloques: BloqueHorarioRow[],
  turnos: TurnoCalendarioRow[],
  huecos: HuecoRow[],
  esProfesor = false,
  bloqueos: BloqueoCalendarioRow[] = [],
): AgendaDiaResponse {
  return {
    profesor: profesor
      ? {
          id: profesor.id,
          nombre: profesor.nombre,
          apellido: profesor.apellido,
        }
      : null,
    profesores: profesores.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      apellido: p.apellido,
    })),
    fecha: fecha.slice(0, 10),
    bloques: bloques.map(bloqueHorarioToApi),
    turnos: turnos.map((t) => turnoCalendarioToApi(t, esProfesor)),
    huecos: huecos.map(huecoToApi),
    bloqueos: bloqueos.map(bloqueoCalendarioToApi),
  };
}

export function bloqueoCalendarioToApi(row: BloqueoCalendarioRow): BloqueoCalendarioResponse {
  return {
    id: row.id,
    fechaDesde: row.fecha_desde.slice(0, 10),
    fechaHasta: row.fecha_hasta.slice(0, 10),
    profesorId: row.profesor_id,
    motivo: row.motivo,
  };
}

export function ocupacionToApi(row: OcupacionRow): OcupacionDiaResponse {
  return {
    profesor: { id: row.profesor_id, nombre: row.profesor_nombre, apellido: row.profesor_apellido },
    fecha: row.fecha.slice(0, 10),
    horasDisponibles: Number(row.horas_disponibles),
    horasReservadas: Number(row.horas_reservadas),
    porcentajeOcupacion: row.porcentaje_ocupacion === null ? null : Number(row.porcentaje_ocupacion),
    semaforo: row.semaforo,
    bloqueado: Boolean(row.bloqueado),
  };
}

export function agendaDiaToApi(
  profesor: ProfesorInfoRow,
  fecha: string,
  bloques: BloqueHorarioRow[],
  turnos: TurnoCalendarioRow[],
  huecos: HuecoRow[],
  esProfesor = false,
): AgendaDiaResponse {
  return agendaToApi(profesor, [profesor], fecha, bloques, turnos, huecos, esProfesor);
}
