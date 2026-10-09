/**
 * Verificación de contraseña contra Supabase Auth (HU-SIS-04).
 *
 * POR QUÉ SUPABASE AUTH Y NO UNA COLUMNA `password_hash`
 *   La base ya se comprometió con Supabase Auth y no es una lectura mía:
 *     · `usuario.auth_id uuid UNIQUE` → FK a `auth.users(id)`
 *     · el trigger `handle_new_user()` crea la fila de `usuario` cuando alguien
 *       se registra en `auth.users`
 *     · el COMMENT de `usuario.bloqueado_hasta` dice textual: "si es futuro, el
 *       login se rechaza ANTES DE INVOCAR SUPABASE AUTH"
 *   O sea que `usuario` NO tiene ni va a tener contraseña. Agregarle una
 *   columna sería un segundo lugar donde vive la misma credencial.
 *
 * POR QUÉ POR REST Y NO CON @supabase/supabase-js
 *   De todo el SDK necesitamos dos llamadas. La API de GoTrue (el servicio de
 *   auth de Supabase) es HTTP plano, así que `fetch` alcanza y el proyecto no
 *   suma dos dependencias ni un cliente con su propio manejo de sesión que
 *   competiría con nuestra cookie.
 *
 * QUÉ **NO** HACE ESTE ARCHIVO
 *   No cuenta intentos, no bloquea, no escribe bitácora, no toca la cookie.
 *   Solo responde una pregunta: ¿esta contraseña es la de este email?
 *   Todo lo demás es regla de negocio y vive en auth.service.ts.
 */

import { pool } from "@/lib/db/client";

/** Access token + refresh token de un login exitoso. */
export type TokensGoTrue = {
  accessToken: string;
  refreshToken: string;
  /** UUID del usuario en `auth.users` — se cruza con `usuario.auth_id`. */
  authId: string;
};

export type ResultadoVerificacion =
  | { ok: true; tokens: TokensGoTrue }
  /**
   * Credenciales rechazadas por Supabase.
   *
   * A propósito NO distingue "el email no existe" de "la contraseña está mal":
   * el criterio de aceptación pide un mensaje genérico, y GoTrue tampoco lo
   * distingue (devuelve el mismo `invalid_grant` para los dos).
   */
  | { ok: false; motivo: "credenciales" }
  /**
   * Supabase no contestó, o contestó algo que no entendemos. Distinto de
   * "credenciales": esto NO cuenta como intento fallido del usuario. Si el
   * servicio de auth está caído, nadie tiene por qué quedar bloqueado.
   */
  | { ok: false; motivo: "servicio" };

type ConfigGoTrue = { url: string; anonKey: string };

/**
 * Lee la configuración del entorno.
 *
 * Falla con un mensaje que dice exactamente qué poner y de dónde sacarlo. El
 * error anterior de este proyecto (401 en todos los endpoints porque el DNI del
 * .env.local no matcheaba) enseñó que un problema de configuración disfrazado
 * de error de permisos cuesta una tarde.
 */
function sanitizarUrlSupabase(raw: string): string {
  return raw
    .trim()
    .replace(/\/rest\/v1\/?$/, "")
    .replace(/\/auth\/v1\/?$/, "")
    .replace(/\/+$/, "");
}

function leerConfig(): ConfigGoTrue {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Falta configurar Supabase Auth para el login (HU-SIS-04).\n" +
        "Agregá a .env.local:\n" +
        "  SUPABASE_URL=https://<REF>.supabase.co\n" +
        "  SUPABASE_ANON_KEY=<anon public key>\n" +
        "Los dos salen de: Supabase → Project Settings → API.\n" +
        "La anon key es pública (va en clientes web); la que NO se usa acá es la service_role.",
    );
  }

  return { url: sanitizarUrlSupabase(url), anonKey };
}

/** Aborta la llamada si GoTrue no contesta: sin esto el login cuelga el request. */
const TIMEOUT_MS = 8_000;

/**
 * ¿Es esta la contraseña de este email?
 *
 * Devuelve los tokens si sí. No lanza por credenciales inválidas — eso es un
 * resultado esperado del flujo, no una excepción.
 */
export async function verificarCredenciales(
  email: string,
  password: string,
): Promise<ResultadoVerificacion> {
  const { url, anonKey } = leerConfig();

  let respuesta: Response;
  try {
    respuesta = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (e) {
    console.error("[auth] no se pudo contactar a Supabase Auth:", e);
    return { ok: false, motivo: "servicio" };
  }

  // 400 con invalid_grant es el rechazo normal de GoTrue.
  // 429 es rate limit del propio Supabase: tampoco es culpa del usuario.
  if (respuesta.status === 400) {
    return { ok: false, motivo: "credenciales" };
  }
  if (!respuesta.ok) {
    console.error(
      `[auth] Supabase Auth respondió ${respuesta.status}. ` +
        "Revisá SUPABASE_URL / SUPABASE_ANON_KEY y que el usuario exista en Authentication → Users.",
    );
    return { ok: false, motivo: "servicio" };
  }

  let datos: unknown;
  try {
    datos = await respuesta.json();
  } catch {
    return { ok: false, motivo: "servicio" };
  }

  const tokens = leerTokens(datos);
  if (!tokens) {
    console.error("[auth] Supabase Auth respondió 200 pero sin los tokens esperados.");
    return { ok: false, motivo: "servicio" };
  }

  return { ok: true, tokens };
}

/** Valida la forma de la respuesta antes de confiar en ella. */
function leerTokens(datos: unknown): TokensGoTrue | null {
  if (typeof datos !== "object" || datos === null) return null;

  const d = datos as {
    access_token?: unknown;
    refresh_token?: unknown;
    user?: { id?: unknown };
  };

  if (
    typeof d.access_token !== "string" ||
    typeof d.refresh_token !== "string" ||
    typeof d.user?.id !== "string"
  ) {
    return null;
  }

  return {
    accessToken: d.access_token,
    refreshToken: d.refresh_token,
    authId: d.user.id,
  };
}

/**
 * Invalida el access token del lado de Supabase (criterio de cierre de sesión).
 *
 * "Cierra sesión de forma explícita, invalidando el token de acceso activo" —
 * borrar la cookie no invalida nada: el token seguiría sirviendo para pegarle a
 * la API de Supabase hasta que expire. Esto lo revoca en el servidor.
 *
 * No lanza: si falla, la cookie se borra igual. Una sesión que no se puede
 * cerrar es peor que un token que sobrevive una hora.
 */
export async function invalidarToken(accessToken: string): Promise<boolean> {
  let config: ConfigGoTrue;
  try {
    config = leerConfig();
  } catch {
    return false;
  }

  try {
    const respuesta = await fetch(`${config.url}/auth/v1/logout`, {
      method: "POST",
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${accessToken}`,
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    return respuesta.ok;
  } catch (e) {
    console.warn("[auth] no se pudo invalidar el token en Supabase. La cookie se borra igual.", e);
    return false;
  }
}


// ─── API de administración (alta de usuarios desde el back) ──────────────
//
// Por qué la API de ADMIN y no `signUp`:
//   · signUp es auto-registro: con confirmación de email activa el usuario no
//     entra hasta confirmar, tiene límite de mails por hora y, si el email ya
//     existe, devuelve un usuario FALSO con un id al azar (anti-enumeración).
//     Guardaríamos un `auth_id` que no apunta a nadie.
//   · /auth/v1/admin/users crea la cuenta ya confirmada y devuelve el id real.
//
// Usa la SERVICE ROLE KEY: salta todas las políticas de Supabase, así que vive
// SOLO en el servidor (.env.local, nunca con prefijo NEXT_PUBLIC_).

export type ResultadoAltaAuth =
  | { ok: true; authId: string }
  /** El email ya tiene cuenta en Supabase Auth. */
  | { ok: false; motivo: "email_existente" }
  /** Supabase no respondió, respondió algo inesperado o falta la configuración. */
  | { ok: false; motivo: "servicio" };

function leerConfigAdmin(): { url: string; serviceKey: string } | null {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return null;
  }
  return { url: sanitizarUrlSupabase(url), serviceKey };
}

/**
 * Crea la cuenta en `auth.users` ya confirmada (sin mail de confirmación).
 * Devuelve el UUID que va a `usuario.auth_id`.
 */
export async function crearUsuarioAuth(
  email: string,
  password: string,
  metadata: Record<string, unknown> = {},
): Promise<ResultadoAltaAuth> {
  const config = leerConfigAdmin();

  // 1. Intento vía API admin de Supabase si existe SUPABASE_SERVICE_ROLE_KEY
  if (config) {
    let respuesta: Response | null = null;
    try {
      respuesta = await fetch(`${config.url}/auth/v1/admin/users`, {
        method: "POST",
        headers: {
          apikey: config.serviceKey,
          Authorization: `Bearer ${config.serviceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, email_confirm: true, user_metadata: metadata }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: "no-store",
      });
    } catch (e) {
      console.warn("[auth] no se pudo contactar a Supabase Auth (admin), usando fallback directo en BD:", e);
    }

    if (respuesta) {
      let datos: { id?: unknown; code?: unknown; error_code?: unknown; msg?: unknown } = {};
      try {
        datos = await respuesta.json();
      } catch {
        // sin body
      }

      if (respuesta.ok && typeof datos.id === "string") {
        return { ok: true, authId: datos.id };
      }

      const codigo = String(datos.error_code ?? datos.code ?? "");
      const yaExiste =
        codigo === "email_exists" || /already (been )?registered/i.test(String(datos.msg ?? ""));
      if (respuesta.status === 422 && yaExiste) {
        return { ok: false, motivo: "email_existente" };
      }

      console.warn(
        `[auth] Supabase Auth (admin) respondió ${respuesta.status} ${codigo}. Usando fallback directo en BD.`,
      );
    }
  }

  // 2. Fallback directo a la base de datos (PostgreSQL `auth.users`)
  try {
    const yaExiste = await pool.query<{ id: string }>(
      "SELECT id FROM auth.users WHERE email = $1",
      [email.trim().toLowerCase()],
    );
    if (yaExiste.rows.length > 0) {
      return { ok: false, motivo: "email_existente" };
    }

    const insertSql = `
      INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change,
        phone_change,
        phone_change_token,
        reauthentication_token
      ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        $1,
        crypt($2, gen_salt('bf', 10)),
        now(),
        '{"provider":"email","providers":["email"]}',
        $3,
        now(),
        now(),
        '', '', '', '', '', '', ''
      ) RETURNING id;
    `;
    const res = await pool.query<{ id: string }>(insertSql, [
      email.trim().toLowerCase(),
      password,
      JSON.stringify({ ...metadata, email_verified: true }),
    ]);

    if (res.rows[0]?.id) {
      return { ok: true, authId: res.rows[0].id };
    }
    return { ok: false, motivo: "servicio" };
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (e.code === "23505") {
      return { ok: false, motivo: "email_existente" };
    }
    console.error("[auth] Falló la inserción en auth.users:", e);
    return { ok: false, motivo: "servicio" };
  }
}

/**
 * Borra la cuenta de `auth.users`. Es la compensación cuando el INSERT en
 * `usuario` falla después de crear la cuenta: sin esto queda un usuario de Auth
 * huérfano y el email no se puede volver a usar. No lanza.
 */
export async function eliminarUsuarioAuth(authId: string): Promise<boolean> {
  const config = leerConfigAdmin();
  if (config) {
    try {
      const respuesta = await fetch(`${config.url}/auth/v1/admin/users/${encodeURIComponent(authId)}`, {
        method: "DELETE",
        headers: { apikey: config.serviceKey, Authorization: `Bearer ${config.serviceKey}` },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: "no-store",
      });
      if (respuesta.ok) return true;
    } catch {
      // continua con fallback
    }
  }

  try {
    await pool.query("DELETE FROM auth.users WHERE id = $1", [authId]);
    return true;
  } catch (e) {
    console.error(`[auth] no se pudo borrar el usuario huérfano ${authId} de auth.users:`, e);
    return false;
  }
}
