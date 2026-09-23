// Capa de datos de Autenticación (HU-SIS-01).
//
// Consume los endpoints de la API (/api/auth/*) mediante el cliente HTTP tipado.
// Contrato: src/contracts/auth.ts · Guía de uso: docs/contratos/auth.md

import {
  RUTA_CAMBIAR_CONTRASENA,
  RUTA_LOGIN,
  RUTA_LOGOUT,
  RUTA_RECUPERAR,
  RUTA_SESION,
  type CambiarContrasenaBody,
  type LoginBody,
  type RecuperarBody,
  type SesionResponse,
  type UsuarioSesion,
} from "@/contracts/auth";
import { apiGet, apiSend, ApiError } from "@/lib/api-client";

export type { SesionResponse, UsuarioSesion };

// Las rutas del contrato se re-exportan para que las pantallas no las importen
// de dos lados distintos.
export { RUTA_LOGIN, RUTA_LOGOUT, RUTA_SESION, RUTA_CAMBIAR_CONTRASENA, RUTA_RECUPERAR };

/**
 * Credenciales de prueba (vacío al conectar contra backend/base de datos real).
 */
export const CREDENCIALES_DEMO: {
  email: string;
  password: string;
  rol: string;
  nota: string | null;
}[] = [];

// ─── API del módulo ──────────────────────────────────────────────────────────

/**
 * Inicio de sesión contra /api/auth/login.
 */
export async function login(body: LoginBody): Promise<SesionResponse> {
  return apiSend<SesionResponse>("POST", RUTA_LOGIN, body);
}

/**
 * Sesión actual desde /api/auth/sesion, o null si no hay sesión activa.
 */
export async function sesionActual(): Promise<SesionResponse | null> {
  try {
    return await apiGet<SesionResponse>(RUTA_SESION);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      return null;
    }
    throw err;
  }
}

/**
 * Cierre de sesión contra /api/auth/logout.
 * Invalida el token en Supabase y borra la cookie httpOnly.
 */
export async function logout(): Promise<void> {
  await apiSend("POST", RUTA_LOGOUT);
}

/**
 * Cambio de contraseña obligatorio del primer ingreso contra /api/auth/cambiar-contrasena.
 */
export async function cambiarContrasena(
  body: CambiarContrasenaBody,
): Promise<SesionResponse> {
  return apiSend<SesionResponse>("POST", RUTA_CAMBIAR_CONTRASENA, body);
}

/**
 * Pedido de enlace de recuperación de contraseña contra /api/auth/recuperar.
 */
export async function recuperarContrasena(body: RecuperarBody): Promise<void> {
  await apiSend("POST", RUTA_RECUPERAR, body);
}
