import type {
  MateriaPortalResponse,
  ProfesorPortalResponse,
  TurnoPortalResponse,
} from "@/contracts/portal";
import type { MateriaPortalRow, ProfesorPortalRow, TurnoPortalRow } from "./portal.types";

const hhmm = (t: string) => t.slice(0, 5);

export function turnoToApi(r: TurnoPortalRow): TurnoPortalResponse {
  return {
    id: r.id,
    codigo: r.codigo,
    fecha: r.fecha.slice(0, 10),
    horaInicio: hhmm(r.hora_inicio),
    horaFin: hhmm(r.hora_fin),
    materia: { id: r.materia_id, nombre: r.materia_nombre },
    profesor: { id: r.profesor_id, nombre: r.profesor_nombre, apellido: r.profesor_apellido },
    estado: r.estado,
    observaciones: r.observaciones,
    fechaCreacion: (r.created_at instanceof Date ? r.created_at : new Date(r.created_at)).toISOString(),
  };
}

export function materiaToApi(r: MateriaPortalRow): MateriaPortalResponse {
  return {
    id: r.id,
    nombre: r.nombre,
    nivel: r.nivel,
    duracionClaseMinutos: Number(r.duracion_clase_minutos),
  };
}

export function profesorToApi(r: ProfesorPortalRow): ProfesorPortalResponse {
  return { id: r.id, nombre: r.nombre, apellido: r.apellido };
}
