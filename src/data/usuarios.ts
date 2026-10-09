// src/data/usuarios.ts
//
// Capa de datos de Usuarios del Sistema (HU-SIS-00 / HU-SIS-01).
// Conecta el frontend con la API respetando los contratos y tipos canónicos.
// Contrato: src/contracts/usuario.ts

import {
  RUTA,
  rutaUsuario,
  rutaInactivar,
  rutaReactivar,
  rutaDesbloquear,
  type CrearUsuarioBody,
  type EditarUsuarioBody,
  type InactivarUsuarioBody,
  type ListarUsuariosQuery,
  type UsuarioResponse,
  type EstadoUsuario,
  type ErrorUsuario,
} from "@/contracts/usuario";
import { RUTA as RUTA_ROLES, type RolResponse, type NombreRol } from "@/contracts/rol";
import {
  RUTA_MOTIVOS_BAJA,
  type MotivoBajaResponse,
} from "@/contracts/catalogo";
import { apiGet, apiGetOpcional, apiSend } from "@/lib/api-client";

export type {
  CrearUsuarioBody,
  EditarUsuarioBody,
  InactivarUsuarioBody,
  ListarUsuariosQuery,
  UsuarioResponse,
  EstadoUsuario,
  ErrorUsuario,
  RolResponse,
  NombreRol,
  MotivoBajaResponse,
};

export { RUTA, rutaUsuario, rutaInactivar, rutaReactivar, rutaDesbloquear };

/**
 * Listado de usuarios con filtros combinables (búsqueda, rol, estado, verInactivos).
 */
export async function listarUsuarios(
  filtros: ListarUsuariosQuery = {},
): Promise<UsuarioResponse[]> {
  const params = new URLSearchParams();
  if (filtros.busqueda) params.set("busqueda", filtros.busqueda);
  if (filtros.estado) params.set("estado", filtros.estado);
  if (filtros.rolId) params.set("rolId", String(filtros.rolId));
  if (filtros.academiaId) params.set("academiaId", String(filtros.academiaId));
  if (filtros.verInactivos !== undefined) {
    params.set("verInactivos", String(filtros.verInactivos));
  }

  const qs = params.toString();
  const url = qs ? `${RUTA}?${qs}` : RUTA;
  return apiGet<UsuarioResponse[]>(url);
}

/**
 * Obtiene el detalle de un usuario por su ID.
 */
export async function obtenerUsuario(id: number): Promise<UsuarioResponse> {
  return apiGet<UsuarioResponse>(rutaUsuario(id));
}

/**
 * Alta de un nuevo usuario en el sistema.
 * El backend genera la contraseña temporal alfanumérica y la envía por email.
 */
export async function crearUsuario(body: CrearUsuarioBody): Promise<UsuarioResponse> {
  return apiSend<UsuarioResponse>("POST", RUTA, body);
}

/**
 * Modificación de un usuario existente.
 */
export async function editarUsuario(
  id: number,
  body: EditarUsuarioBody,
): Promise<UsuarioResponse> {
  return apiSend<UsuarioResponse>("PUT", rutaUsuario(id), body);
}

/**
 * Baja lógica obligatoria de usuario con motivo.
 */
export async function inactivarUsuario(
  id: number,
  body: InactivarUsuarioBody,
): Promise<UsuarioResponse> {
  return apiSend<UsuarioResponse>("POST", rutaInactivar(id), body);
}

/**
 * Reactivación lógica de un usuario inactivo.
 */
export async function reactivarUsuario(id: number): Promise<UsuarioResponse> {
  return apiSend<UsuarioResponse>("POST", rutaReactivar(id));
}

/**
 * Desbloquea a un usuario limpiando sus intentos fallidos y bloqueo temporal.
 */
export async function desbloquearUsuario(id: number): Promise<UsuarioResponse> {
  return apiSend<UsuarioResponse>("POST", rutaDesbloquear(id));
}

/**
 * Catálogo de roles de solo lectura para poblar combos.
 */
export async function listarRoles(): Promise<RolResponse[]> {
  return apiGet<RolResponse[]>(RUTA_ROLES);
}

/**
 * Catálogo de motivos de baja activos para el modal de baja lógica.
 */
export async function listarMotivosBaja(): Promise<MotivoBajaResponse[]> {
  return apiGet<MotivoBajaResponse[]>(`${RUTA_MOTIVOS_BAJA}?soloActivos=true`);
}
