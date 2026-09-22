import type {
  ProfesorResponse,
  MateriaDictadaResponse,
  ProfesorOpcion,
} from "@/contracts/profesor";
import type {
  ProfesorConUsuarioRow,
  ProfesorMateriaRow,
  UsuarioCandidatoRow,
} from "./profesor.types";

/**
 * Traduce una fila de profesor_materia al contrato de la API.
 * Nota: `id` es el de `profesor_materia.id`, no el de la materia.
 */
export function materiaToApi(row: ProfesorMateriaRow): MateriaDictadaResponse {
  return {
    id: row.id,
    materia: {
      id: row.materia_id,
      nombre: row.materia_nombre,
      nivel: row.materia_nivel,
      duracionClaseMinutos: row.duracion_clase_minutos,
    },
    capacidadMaxima: row.capacidad_maxima,
    precio: Number(row.precio),
  };
}

/**
 * Traduce la fila del profesor con su usuario y materias a ProfesorResponse.
 */
export function toApi(
  row: ProfesorConUsuarioRow,
  materias: MateriaDictadaResponse[],
): ProfesorResponse {
  return {
    id: row.id,
    usuario: {
      id: row.usuario_id,
      nombre: row.usuario_nombre,
      apellido: row.usuario_apellido,
      dni: row.usuario_dni,
      email: row.usuario_email,
    },
    academia: row.academia_id
      ? { id: row.academia_id, nombre: row.academia_nombre ?? "" }
      : null,
    tituloEspecialidad: row.titulo_especialidad ?? null,
    telefono: row.telefono,
    materias,
    estado: row.estado,
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

/**
 * Opciones para select/combobox (nombre y apellido).
 */
export function toOpcion(row: ProfesorConUsuarioRow): ProfesorOpcion {
  return {
    id: row.id,
    nombre: row.usuario_nombre,
    apellido: row.usuario_apellido,
  };
}

/**
 * Traduce un usuario candidato a opción de combo.
 */
export function toCandidatoApi(row: UsuarioCandidatoRow) {
  return {
    id: row.id,
    nombre: row.nombre,
    apellido: row.apellido,
    dni: row.dni,
    email: row.email,
    academia: row.academia_id
      ? { id: row.academia_id, nombre: row.academia_nombre ?? "" }
      : null,
  };
}
