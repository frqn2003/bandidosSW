import type { Row } from "@/lib/db/schema.types";
import type {
  CrearMateriaInput,
  EditarMateriaInput,
  ListarMateriasQuery,
} from "@/contracts/materia";

/** Fila cruda de la tabla `materia` devuelta por el driver de Postgres. */
export type MateriaRow = Row<"materia">;

/** Filtros del listado de materias. */
export type FiltrosMateria = ListarMateriasQuery;

/** Datos para insertar o actualizar una materia (validados por el schema). */
export type MateriaInput = CrearMateriaInput;
export type EditarMateriaInputDto = EditarMateriaInput;
