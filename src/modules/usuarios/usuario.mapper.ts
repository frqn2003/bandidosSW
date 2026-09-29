import type { UsuarioResponse } from "@/contracts/usuario";
import type { UsuarioRow } from "./usuario.types";

/**
 * Traduce una fila de la base de datos (snake_case) al shape exacto de `UsuarioResponse` (camelCase)
 * acordado en el contrato `src/contracts/usuario.ts`.
 *
 * Reglas de mapeo:
 *   · `auth_id` e `intentos_fallidos` NO se exponen al cliente (son internos de auth).
 *   · Timestamps de PostgreSQL (`Date`) se convierten a strings en formato ISO 8601.
 *   · Objetos anidados (`rol`, `academia`, `motivoBaja`) se arman con sus relaciones.
 */
export function toApi(row: UsuarioRow): UsuarioResponse {
  return {
    id: row.id,
    nombre: row.nombre,
    apellido: row.apellido,
    dni: row.dni,
    email: row.email,
    telefono: row.telefono ?? null,
    rol: {
      id: row.rol_id,
      nombre: row.rol_nombre,
    },
    academia: row.academia_id
      ? {
          id: row.academia_id,
          nombre: row.academia_nombre ?? "",
        }
      : null,
    estado: row.estado,
    bloqueadoHasta: row.bloqueado_hasta ? new Date(row.bloqueado_hasta).toISOString() : null,
    fechaCreacion: new Date(row.fecha_creacion).toISOString(),
    motivoBaja: row.motivo_baja_id
      ? {
          id: row.motivo_baja_id,
          nombre: row.motivo_baja_nombre ?? "",
        }
      : null,
    detalleMotivoBaja: row.detalle_motivo_baja ?? null,
    fechaBaja: row.fecha_baja ? new Date(row.fecha_baja).toISOString() : null,
    debeCambiarPassword: Boolean(row.debe_cambiar_password ?? row.cambiar_contraseña),
  };
}
