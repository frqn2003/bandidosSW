import type { SesionResponse } from "@/contracts/auth";
import type { UsuarioSesionRow } from "./auth.types";

/**
 * Mapper auth (HU-SIS-01).
 *
 * Convierte la fila de la BD al SesionResponse del contrato.
 * Campos internos (intentos_fallidos, bloqueado_hasta, auth_id) nunca salen.
 *
 * ultimaConexion se lee ANTES de registrar el login nuevo (ver auth.service),
 * por eso llega como parámetro y no se consulta acá.
 */
export function toApi(
  row: UsuarioSesionRow,
  ultimaConexion: Date | null,
): SesionResponse {
  return {
    usuario: {
      id: row.id,
      nombre: row.nombre,
      apellido: row.apellido,
      email: row.email,
      rol: {
        id: row.rol_id,
        // NombreRol es la unión cerrada del contrato; la BD ya tiene esos nombres.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        nombre: row.rol_nombre as any,
      },
      academia: row.academia_id
        ? { id: row.academia_id, nombre: row.academia_nombre! }
        : null,
    },
    debeCambiarContrasena: row.cambiar_contrasena,
    ultimaConexion: ultimaConexion?.toISOString() ?? null,
  };
}
