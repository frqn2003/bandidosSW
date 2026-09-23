import type { TurnoResponse } from "@/contracts/turno";
import type { TurnoDetalleRow } from "./turno.types";

const hhmm = (t: string) => t.slice(0, 5);

export function toApi(row: TurnoDetalleRow): TurnoResponse {
  return {
    id: row.id,
    codigo: row.codigo ?? `TUR-${String(row.id).padStart(6, "0")}`,
    alumno: {
      id: row.alumno_id,
      legajo: row.alumno_legajo ?? `ALU-${String(row.alumno_id).padStart(6, "0")}`,
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
      nivel: row.materia_nivel,
      duracionClaseMinutos: row.duracion_clase_minutos,
    },
    fecha: row.fecha.slice(0, 10),
    horaInicio: hhmm(row.hora_inicio),
    horaFin: hhmm(row.hora_fin),
    valorClaseCongelado: Number(row.valor_clase_congelado),
    estado: row.estado,
    observaciones: row.observaciones,
    registradoPor: {
      id: row.usuario_id,
      nombre: row.usuario_nombre,
      apellido: row.usuario_apellido,
    },
    fechaCreacion: row.created_at.toISOString(),
  };
}

export function toApiList(rows: TurnoDetalleRow[]): TurnoResponse[] {
  return rows.map(toApi);
}
