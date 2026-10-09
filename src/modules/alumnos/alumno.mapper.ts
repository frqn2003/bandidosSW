import type { AlumnoResponse } from "@/contracts/alumno";
import type { AlumnoRow } from "./alumno.types";

function formatearFechaNacimiento(val: string | Date): string {
  if (typeof val === "string") {
    return val.slice(0, 10);
  }
  const year = val.getFullYear();
  const month = String(val.getMonth() + 1).padStart(2, "0");
  const day = String(val.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function toApi(
  row: AlumnoRow,
  materiasInteres: { id: number; nombre: string }[] = [],
  deudaPendiente: boolean = false,
  turnosFuturos: { id: string; turnoId?: number; fecha?: string; fechaHora: string; materia: string; estado: "Reservado" | "Confirmado" }[] = [],
): AlumnoResponse {
  const responsable = row.responsable_nombre
    ? {
      nombre: row.responsable_nombre,
      dni: row.responsable_dni ?? "",
      telefono: row.responsable_telefono ?? "",
    }
    : null;

  const legajo = row.legajo || `ALU-${String(row.id).padStart(6, "0")}`;

  return {
    id: row.id,
    legajo,
    nombre: row.nombre,
    apellido: row.apellido,
    dni: row.dni,
    fechaNacimiento: formatearFechaNacimiento(row.fecha_nacimiento),
    telefono: row.telefono,
    email: row.email ?? null,
    nivelEducativo: row.nivel_educativo,
    responsable,
    estado: row.estado,
    institucionOrigen: row.institucion_origen ?? null,
    observacionesGenerales: row.observaciones_generales ?? null,
    materiasInteres,
    deudaPendiente,
    cantidadTurnosFuturos: turnosFuturos.length,
    turnosFuturos,
    fechaCreacion:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
    fechaActualizacion:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : String(row.updated_at),
  };
}

export function toApiList(
  rows: AlumnoRow[],
  materiasMapa: Map<number, { id: number; nombre: string }[]> = new Map(),
  deudasSet: Set<number> = new Set(),
  turnosFuturosMapa: Map<number, { id: string; turnoId?: number; fecha?: string; fechaHora: string; materia: string; estado: "Reservado" | "Confirmado" }[]> = new Map(),
): AlumnoResponse[] {
  return rows.map((r) =>
    toApi(
      r,
      materiasMapa.get(r.id) ?? [],
      deudasSet.has(r.id),
      turnosFuturosMapa.get(r.id) ?? [],
    ),
  );
}
