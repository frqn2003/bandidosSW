import type { BloqueoResponse, TurnoAfectadoResponse } from "@/contracts/bloqueo";
import type { BloqueoRow, TurnoAfectadoRow } from "./bloqueo.types";

const hhmm = (t: string) => t.slice(0, 5);
const iso = (d: Date | string) => (d instanceof Date ? d : new Date(d)).toISOString();

export function toApi(row: BloqueoRow): BloqueoResponse {
  return {
    id: row.id,
    fechaDesde: row.fecha_desde.slice(0, 10),
    fechaHasta: row.fecha_hasta.slice(0, 10),
    profesor:
      row.profesor_id !== null
        ? {
            id: row.profesor_id,
            nombre: row.profesor_nombre ?? "",
            apellido: row.profesor_apellido ?? "",
          }
        : null,
    motivo: row.motivo,
    estado: row.estado,
    registradoPor: {
      id: row.usuario_id,
      nombre: row.usuario_nombre,
      apellido: row.usuario_apellido,
    },
    fechaCreacion: iso(row.created_at),
    fechaBaja: row.fecha_baja ? iso(row.fecha_baja) : null,
    bajaPor:
      row.usuario_baja_id !== null
        ? {
            id: row.usuario_baja_id,
            nombre: row.baja_nombre ?? "",
            apellido: row.baja_apellido ?? "",
          }
        : null,
  };
}

export function turnoAfectadoToApi(row: TurnoAfectadoRow): TurnoAfectadoResponse {
  return {
    id: row.id,
    codigo: row.codigo,
    fecha: row.fecha.slice(0, 10),
    horaInicio: hhmm(row.hora_inicio),
    horaFin: hhmm(row.hora_fin),
    alumno: {
      id: row.alumno_id,
      legajo: row.alumno_legajo,
      nombre: row.alumno_nombre,
      apellido: row.alumno_apellido,
    },
    profesor: { id: row.profesor_id, nombre: row.profesor_nombre, apellido: row.profesor_apellido },
    materia: { id: row.materia_id, nombre: row.materia_nombre },
  };
}
