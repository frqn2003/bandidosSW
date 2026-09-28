import type { Row } from "@/lib/db/schema.types";
import type {
  CrearUsuarioInput,
  EditarUsuarioInput,
  InactivarUsuarioInput,
  ListarUsuariosQuery,
} from "@/contracts/usuario";

/** Fila base de la tabla `usuario` en Postgres. */
export type UsuarioBaseRow = Row<"usuario">;

/** Fila extendida con los datos del rol, academia y motivo de baja vinculados. */
export type UsuarioRow = UsuarioBaseRow & {
  rol_nombre: string;
  academia_nombre: string | null;
  motivo_baja_nombre: string | null;
};

/** Filtros para consultar el listado de usuarios. */
export type FiltrosUsuario = ListarUsuariosQuery;

/** DTOs de entrada validados por zod para las operaciones de negocio. */
export type CrearUsuarioInputDto = CrearUsuarioInput;
export type EditarUsuarioInputDto = EditarUsuarioInput;
export type InactivarUsuarioInputDto = InactivarUsuarioInput;
