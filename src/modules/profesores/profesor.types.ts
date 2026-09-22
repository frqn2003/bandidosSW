import type { Row, NivelMateria } from "@/lib/db/schema.types";
import type {
  CrearProfesorInput,
  EditarProfesorInput,
  ListarProfesoresQuery,
} from "@/contracts/profesor";

/** Fila base de la tabla `profesor`. */
export type ProfesorRow = Row<"profesor">;

/** Fila extendida con los datos del usuario vinculado y su academia. */
export type ProfesorConUsuarioRow = ProfesorRow & {
  usuario_nombre: string;
  usuario_apellido: string;
  usuario_dni: string;
  usuario_email: string;
  academia_id: number | null;
  academia_nombre: string | null;
};

/** Fila de la relación profesor_materia con los datos de la materia y su precio. */
export type ProfesorMateriaRow = {
  id: number; // profesor_materia.id
  profesor_id: number;
  materia_id: number;
  materia_nombre: string;
  materia_nivel: NivelMateria;
  duracion_clase_minutos: number;
  capacidad_maxima: number;
  precio: string; // numeric de pg llega como string
};

/** Usuario con rol Profesor elegible para crear ficha. */
export type UsuarioCandidatoRow = {
  id: number;
  nombre: string;
  apellido: string;
  dni: string;
  email: string;
  academia_id: number | null;
  academia_nombre: string | null;
};

/** Filtros del listado de profesores. */
export type FiltrosProfesor = ListarProfesoresQuery;

/** Inputs validados para crear y editar. */
export type CrearProfesorInputDto = CrearProfesorInput;
export type EditarProfesorInputDto = EditarProfesorInput;
