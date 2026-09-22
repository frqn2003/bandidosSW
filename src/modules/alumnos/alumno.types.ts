import type { Row } from "@/lib/db/schema.types";
import type {
  CrearAlumnoInput,
  EditarAlumnoInput,
  ListarAlumnosQuery,
} from "@/contracts/alumno";

/** Fila cruda de la tabla `alumno` devuelta por el driver de Postgres. */
export type AlumnoRow = Row<"alumno">;

/** Filtros del listado de alumnos. */
export type FiltrosAlumno = ListarAlumnosQuery;

/** Datos para insertar o actualizar un alumno (validados por el schema). */
export type CrearAlumnoInputDto = CrearAlumnoInput;
export type EditarAlumnoInputDto = EditarAlumnoInput;
