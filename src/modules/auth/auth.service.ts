import type { SesionResponse, LoginInput, CambiarContrasenaInput, RecuperarInput } from "@/contracts/auth";
import { verificarCredenciales } from "@/lib/auth/gotrue";
import { escribirCookie, leerCookie } from "@/lib/auth/cookie";
import { destroySession, getSession } from "@/lib/auth/session";
import {
  CredencialesInvalidasError,
  CuentaBloqueadaError,
  ServicioAuthNoDisponibleError,
  UnauthorizedError,
  ValidationError,
} from "@/lib/http/errors";
import * as repo from "./auth.repo";
import { toApi } from "./auth.mapper";

/**
 * Service de autenticación (HU-SIS-01).
 *
 * Reglas de dominio:
 *  · El service no sabe de status codes ni de Request/Response (regla 6 del manual).
 *    La IP se lee en el handler y se pasa como dato simple (string | null).
 *  · verificarCredenciales() (GoTrue) es la única que sabe la contraseña; este
 *    service no la toca ni la guarda.
 */

// ─── Login ───────────────────────────────────────────────────────────────────

/**
 * Criterios cubiertos:
 *  · Credenciales incorrectas → CREDENCIALES_INVALIDAS (genérico, sin campo).
 *  · 5 intentos fallidos → CUENTA_BLOQUEADA (423) con bloqueadoHasta para el contador.
 *  · Supabase caído → AUTH_NO_DISPONIBLE (503); no suma intento.
 *  · Bitácora: login, login_fallido, bloqueado.
 *  · ultimaConexion se lee ANTES del nuevo login (si se lee después sale "ahora").
 *  · debeCambiarContrasena viene de la columna "cambiar_contraseña" de la BD.
 */
export async function login(
  input: LoginInput,
  ip: string | null = null,
): Promise<SesionResponse> {
  const usuario = await repo.buscarPorEmail(input.email);

  // ── Cuenta bloqueada ──────────────────────────────────────────────────────
  // Se evalúa ANTES de llamar a GoTrue: reintentar no sirve hasta que pase el
  // tiempo, y un bloqueo no tiene que consumir un round-trip al proveedor de auth.
  if (usuario?.bloqueado_hasta && usuario.bloqueado_hasta > new Date()) {
    // BACKEND: registrar el intento en bitácora aunque ya esté bloqueado.
    await repo.registrarEvento(usuario.id, "bloqueado", ip);
    throw new CuentaBloqueadaError(usuario.bloqueado_hasta);
  }

  // ── Verificar contraseña contra Supabase Auth (GoTrue) ────────────────────
  const resultado = await verificarCredenciales(input.email, input.password);

  // Servicio caído ≠ credenciales incorrectas. Una caída de Supabase NO debe
  // sumar intento: si contara, bloquearía a todos durante 15 minutos.
  if (!resultado.ok && resultado.motivo === "servicio") {
    throw new ServicioAuthNoDisponibleError();
  }

  // Error genérico: mismo código para email inexistente, contraseña incorrecta
  // y usuario inactivo. Sin `campo` porque marcarlo diría cuál estaba bien.
  if (!resultado.ok || !usuario || usuario.estado !== "activo") {
    if (usuario) {
      // Registrar intento fallido y sumar contador (puede disparar el bloqueo)
      await repo.sumarIntentoFallido(usuario.id);
      await repo.registrarEvento(usuario.id, "login_fallido", ip);
    } else {
      // Registrar intento fallido con usuario null si el email no existe
      await repo.registrarEvento(null, "login_fallido", ip, {
        email: input.email.trim().toLowerCase(),
      });
    }
    throw new CredencialesInvalidasError();
  }

  // ── Login exitoso ─────────────────────────────────────────────────────────
  // Leer ultimaConexion ANTES de registrar el nuevo login.
  const ultimaConexion = await repo.ultimoLogin(usuario.id);

  await repo.limpiarIntentos(usuario.id);
  await repo.registrarEvento(usuario.id, "login", ip);
  await escribirCookie(usuario.id, resultado.tokens.accessToken);

  return toApi(usuario, ultimaConexion);
}

// ─── Logout ──────────────────────────────────────────────────────────────────

/**
 * Invalida el token en Supabase y borra la cookie.
 * El criterio pide "invalidando el token de acceso activo": borrar solo la cookie
 * deja el token vivo hasta que expire.
 *
 * Registra el evento en bitácora (best-effort: si falla no se aborta el logout).
 */
export async function logout(ip: string | null = null): Promise<void> {
  // Leer el usuario ANTES de destruir la sesión para poder registrar el evento.
  const cookie = await leerCookie();
  const usuarioId = cookie?.uid ?? null;

  await destroySession();

  if (usuarioId) {
    try {
      await repo.registrarEvento(usuarioId, "logout", ip);
    } catch {
      // Best-effort: la sesión ya está cerrada; una falla de bitácora no debe
      // bloquear al usuario ni devolver un error.
      console.warn("[auth] no se pudo registrar el evento de logout en la bitácora.");
    }
  }
}

// ─── Sesión actual ────────────────────────────────────────────────────────────

/**
 * Devuelve la sesión completa (con datos del contrato) o null si no hay.
 *
 * GET /api/auth/sesion no usa withRoute (que tira 401) porque el 401 acá es
 * una respuesta válida ("no hay nadie logueado"), no un error. El route llama
 * a esta función y devuelve 401 si recibe null.
 */
export async function sesionActual(): Promise<SesionResponse | null> {
  const session = await getSession();
  if (!session) return null;

  // Traer la fila completa con rol, academia y debeCambiarContrasena.
  const usuario = await repo.buscarPorId(session.usuarioId);
  if (!usuario || usuario.estado !== "activo") return null;

  const ultimaConexion = await repo.ultimoLogin(usuario.id);
  return toApi(usuario, ultimaConexion);
}

// ─── Bitácora: Acceso denegado ───────────────────────────────────────────────

/**
 * Registra un intento de acceso a un módulo o recurso no permitido para el rol.
 */
export async function registrarAccesoDenegado(
  usuarioId: number,
  ip: string | null = null,
  detalle?: Record<string, unknown>,
): Promise<void> {
  await repo.registrarEvento(usuarioId, "acceso_denegado", ip, detalle);
}

// ─── Cambio de contraseña ─────────────────────────────────────────────────────

/**
 * Cambio obligatorio del primer ingreso (contraseña temporal).
 *
 * El schema `cambiarContrasenaBody` ya validó:
 *  · nueva >= 8 chars, una mayúscula, una minúscula, un número
 *  · nueva !== actual (campo-nivel en el schema)
 *  · nueva === repetirNueva
 *
 * Este service verifica la contraseña actual contra GoTrue (para que alguien
 * que robe la sesión no pueda cambiarla sin saber la actual) y luego le pide
 * a Supabase Auth que actualice la contraseña.
 *
 * BACKEND: el endpoint de cambio de contraseña de GoTrue es:
 *   PUT /auth/v1/user  { "password": nueva }
 *   Authorization: Bearer <accessToken>
 */
export async function cambiarContrasena(
  input: CambiarContrasenaInput,
): Promise<SesionResponse> {
  const session = await getSession();
  if (!session) {
    throw new UnauthorizedError("Tu sesión no está activa. Volvé a iniciar sesión.");
  }

  if (input.nueva === input.actual) {
    throw new ValidationError(
      "CONTRASENA_REUSADA",
      "La contraseña nueva tiene que ser distinta de la actual.",
      "nueva",
    );
  }

  // 1. Verificar la contraseña actual contra GoTrue.
  const verificacion = await verificarCredenciales(session.email, input.actual);
  if (!verificacion.ok) {
    if (verificacion.motivo === "servicio") throw new ServicioAuthNoDisponibleError();
    throw new CredencialesInvalidasError();
  }

  // 2. Actualizar la contraseña en Supabase Auth.
  await actualizarContrasenaEnGoTrue(verificacion.tokens.accessToken, input.nueva);

  // 3. Marcar que ya no necesita cambiar la contraseña.
  await repo.marcarContrasenaActualizada(session.usuarioId);

  // 4. Devolver la sesión actualizada (debeCambiarContrasena ahora es false).
  const usuario = await repo.buscarPorId(session.usuarioId);
  if (!usuario) {
    throw new UnauthorizedError("Usuario no encontrado.");
  }
  const ultimaConexion = await repo.ultimoLogin(usuario.id);
  return toApi(usuario, ultimaConexion);
}

function sanitizarUrlSupabase(raw: string): string {
  return raw
    .trim()
    .replace(/\/rest\/v1\/?$/, "")
    .replace(/\/auth\/v1\/?$/, "")
    .replace(/\/+$/, "");
}

/**
 * Llama al endpoint de actualización de usuario de GoTrue.
 *
 * BACKEND: PUT /auth/v1/user con Authorization: Bearer <accessToken>
 */
async function actualizarContrasenaEnGoTrue(
  accessToken: string,
  nuevaContrasena: string,
): Promise<void> {
  const urlRaw = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!urlRaw || !anonKey) {
    throw new ServicioAuthNoDisponibleError();
  }

  const url = sanitizarUrlSupabase(urlRaw);

  let res: { ok: boolean; status: number; json: () => Promise<unknown> };
  try {
    res = await fetch(`${url}/auth/v1/user`, {
      method: "PUT",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password: nuevaContrasena }),
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
  } catch {
    throw new ServicioAuthNoDisponibleError();
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    // GoTrue devuelve 422 si la nueva contraseña es igual a la actual
    if (res.status === 422 && body?.message?.includes("same")) {
      throw new ValidationError(
        "CONTRASENA_REUSADA",
        "La contraseña nueva tiene que ser distinta de la actual.",
        "nueva",
      );
    }
    throw new ServicioAuthNoDisponibleError();
  }
}

// ─── Recuperación de contraseña ───────────────────────────────────────────────

/**
 * Solicita el enlace de recuperación.
 *
 * SIEMPRE responde 204, exista o no la cuenta: si respondiera distinto sería
 * un detector de emails registrados.
 *
 * El enlace de un solo uso con validez de 1 hora lo genera y manda Supabase Auth.
 * BACKEND: POST /auth/v1/recover  { "email": email }
 */
export async function recuperar(input: RecuperarInput): Promise<void> {
  const urlRaw = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!urlRaw || !anonKey) {
    // Silencioso: no revelamos que el servicio está caído para que no se use
    // como indicador de existencia de cuenta.
    return;
  }

  const url = sanitizarUrlSupabase(urlRaw);

  try {
    await fetch(`${url}/auth/v1/recover`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: input.email.trim().toLowerCase() }),
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
  } catch {
    // Silencioso por el mismo motivo.
  }
  // Siempre se retorna sin error: la respuesta al cliente es siempre 204.
}
