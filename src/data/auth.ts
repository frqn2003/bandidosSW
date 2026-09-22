// Capa de datos de Autenticación (HU-SIS-01) — front hardcodeado.
//
// La pantalla NO ve las cuentas demo: habla con las funciones de abajo, que ya
// tienen la firma final (async, tipos del contrato, errores del contrato). El
// día que el back publique `/api/auth/*`, el cuerpo de cada función pasa a una
// línea de `apiGet`/`apiSend` y las pantallas no se tocan.
//
// Patrón y checklist: docs/capa-de-datos-front.md
// Contrato: src/contracts/auth.ts · Guía de uso: docs/contratos/auth.md
//
// ⚠️ ESTO NO ES UN CONTROL DE SEGURIDAD. Es una simulación de interfaz: las
// contraseñas están en el código y cualquiera las lee desde las devtools. Quien
// autentica de verdad es el back (Supabase Auth vía `src/lib/auth/gotrue.ts`) y
// quien autoriza es `requireSession()` en cada endpoint. Esta capa existe para
// poder diseñar y probar las pantallas mientras esas rutas no existen.

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
import { ApiError } from "@/lib/api-client";

export type { SesionResponse, UsuarioSesion };

// Las rutas del contrato se re-exportan para que las pantallas no las importen
// de dos lados distintos.
export { RUTA_LOGIN, RUTA_LOGOUT, RUTA_SESION, RUTA_CAMBIAR_CONTRASENA, RUTA_RECUPERAR };


// ─── Fixture: lo único que desaparece el día del back ────────────────────

type CuentaDemo = {
  password: string;
  debeCambiarContrasena: boolean;
  ultimaConexion: string | null;
  usuario: UsuarioSesion;
};

/**
 * Cuentas de prueba, una por rol.
 *
 * BACKEND: las reemplaza `POST /api/auth/login` → Supabase Auth valida la
 * contraseña contra `auth.users` y la tabla `usuario` aporta perfil, rol y
 * academia (JOIN con `rol` y `academia`). Las contraseñas NO están en la base.
 */
const CUENTAS: CuentaDemo[] = [
  {
    password: "Demo1234",
    debeCambiarContrasena: false,
    // BACKEND: último evento `login` de `auditoria_sesion`, leído ANTES de
    // registrar el login nuevo.
    ultimaConexion: "2026-09-21T18:42:00.000Z",
    usuario: {
      id: 1,
      nombre: "Ana",
      apellido: "Gómez",
      email: "gerente@demo",
      rol: { id: 1, nombre: "Gerente" },
      academia: { id: 1, nombre: "Sede Centro" },
    },
  },
  {
    password: "Demo1234",
    debeCambiarContrasena: false,
    ultimaConexion: "2026-09-22T09:15:00.000Z",
    usuario: {
      id: 2,
      nombre: "Sofía",
      apellido: "Ledesma",
      email: "mesa@demo",
      rol: { id: 3, nombre: "Mesa de Entrada" },
      academia: { id: 1, nombre: "Sede Centro" },
    },
  },
  {
    password: "Demo1234",
    debeCambiarContrasena: false,
    ultimaConexion: null,
    usuario: {
      id: 3,
      nombre: "Roberto",
      apellido: "Peralta",
      email: "profe@demo",
      rol: { id: 2, nombre: "Profesor" },
      academia: { id: 1, nombre: "Sede Centro" },
    },
  },
  {
    // Primer ingreso: entra con la temporal y el sistema lo obliga a cambiarla.
    password: "Temporal1",
    debeCambiarContrasena: true,
    ultimaConexion: null,
    usuario: {
      id: 4,
      nombre: "Nicolás",
      apellido: "Ferrer",
      email: "nuevo@demo",
      rol: { id: 3, nombre: "Mesa de Entrada" },
      academia: { id: 1, nombre: "Sede Centro" },
    },
  },
];

/**
 * Las credenciales que la pantalla de login muestra en el panel de ayuda.
 *
 * Ese panel se renderiza **solo fuera de producción** (ver `src/app/page.tsx`):
 * si quedara visible el día que el login sea real, sería una lista de usuarios
 * y contraseñas a la vista de cualquiera.
 */
export const CREDENCIALES_DEMO = CUENTAS.map((c) => ({
  email: c.usuario.email,
  password: c.password,
  rol: c.usuario.rol.nombre,
  nota: c.debeCambiarContrasena ? "primer ingreso" : null,
}));

/** Intentos fallidos y bloqueo — en la base son `usuario.intentos_fallidos` y `usuario.bloqueado_hasta`. */
const INTENTOS_MAXIMOS = 5;
const MINUTOS_BLOQUEO = 15;
const intentosPorEmail = new Map<string, number>();
const bloqueoPorEmail = new Map<string, number>();

const DEMORA_MS = 400;
const demorar = () => new Promise((r) => setTimeout(r, DEMORA_MS));

/** `?demo=auth-caido` fuerza el 503 de Supabase, para poder verlo sin romper nada. */
const authCaido = () =>
  typeof window !== "undefined" && window.location.search.includes("demo=auth-caido");


// ─── Sesión guardada (lo que el back resuelve con una cookie firmada) ────
//
// BACKEND: la sesión real viaja en una cookie httpOnly firmada que el
// navegador manda sola (`src/lib/auth/cookie.ts`). Acá se guarda en
// localStorage porque el front no tiene servidor: es lo que permite que la
// sesión sobreviva a un F5 mientras se diseña. Al conectar el back, este
// bloque entero se borra — no hay que reemplazarlo por nada.

const CLAVE_SESION = "centro-academico:sesion";

function leerGuardada(): SesionResponse | null {
  if (typeof window === "undefined") return null;
  try {
    const crudo = window.localStorage.getItem(CLAVE_SESION);
    return crudo ? (JSON.parse(crudo) as SesionResponse) : null;
  } catch {
    // localStorage puede fallar (modo privado, storage bloqueado): sin sesión.
    return null;
  }
}

function guardar(sesion: SesionResponse | null): void {
  if (typeof window === "undefined") return;
  try {
    if (sesion) window.localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
    else window.localStorage.removeItem(CLAVE_SESION);
  } catch {
    // Si no se puede guardar, la sesión vive solo en memoria: no es motivo
    // para tirar abajo el login.
  }
}


// ─── API del módulo (firma final: no cambia cuando entra el back) ────────

/**
 * Inicio de sesión.
 * BACKEND: `return apiSend<SesionResponse>("POST", RUTA_LOGIN, body)`.
 */
export async function login(body: LoginBody): Promise<SesionResponse> {
  await demorar();
  const email = body.email.trim().toLowerCase();

  // El servicio caído NO cuenta como intento fallido: si contara, una caída de
  // Supabase bloquearía a todo el mundo por 15 minutos.
  if (authCaido()) {
    throw new ApiError(
      "AUTH_NO_DISPONIBLE",
      "No se pudo validar el inicio de sesión en este momento. Intentá de nuevo en unos segundos.",
      undefined,
      503,
    );
  }

  const bloqueadoHasta = bloqueoPorEmail.get(email);
  if (bloqueadoHasta && bloqueadoHasta > Date.now()) {
    throw errorBloqueada(bloqueadoHasta);
  }

  const cuenta = CUENTAS.find((c) => c.usuario.email === email);
  // Mismo error para email inexistente y contraseña incorrecta: decir cuál de
  // los dos falló confirma si esa cuenta existe en el centro.
  if (!cuenta || cuenta.password !== body.password) {
    if (cuenta) {
      const intentos = (intentosPorEmail.get(email) ?? 0) + 1;
      intentosPorEmail.set(email, intentos);
      if (intentos >= INTENTOS_MAXIMOS) {
        const hasta = Date.now() + MINUTOS_BLOQUEO * 60_000;
        bloqueoPorEmail.set(email, hasta);
        intentosPorEmail.delete(email);
        // BACKEND: acá el service registra el evento `bloqueado` en auditoria_sesion.
        throw errorBloqueada(hasta);
      }
      // BACKEND: evento `login_fallido` en auditoria_sesion.
    }
    throw new ApiError("CREDENCIALES_INVALIDAS", "Credenciales inválidas.", undefined, 401);
  }

  intentosPorEmail.delete(email);
  bloqueoPorEmail.delete(email);

  // BACKEND: evento `login` en auditoria_sesion (usuario, fecha y hora), y la
  // cookie firmada la escribe el server con `escribirCookie`.
  const sesion: SesionResponse = {
    usuario: cuenta.usuario,
    debeCambiarContrasena: cuenta.debeCambiarContrasena,
    ultimaConexion: cuenta.ultimaConexion,
  };
  guardar(sesion);
  return sesion;
}

/**
 * Sesión actual, o null si no hay.
 * BACKEND: `apiGet<SesionResponse>(RUTA_SESION)` — y un 401 (NO_AUTENTICADO)
 * se traduce a `null`, que es lo que espera el provider.
 */
export async function sesionActual(): Promise<SesionResponse | null> {
  await demorar();
  return leerGuardada();
}

/**
 * Cierre de sesión.
 * BACKEND: `apiSend("POST", RUTA_LOGOUT)` — invalida el token en Supabase y
 * borra la cookie; el evento `logout` va a auditoria_sesion.
 */
export async function logout(): Promise<void> {
  await demorar();
  guardar(null);
}

/**
 * Cambio de contraseña del primer ingreso.
 * BACKEND: `apiSend<SesionResponse>("POST", RUTA_CAMBIAR_CONTRASENA, body)`.
 */
export async function cambiarContrasena(
  body: CambiarContrasenaBody,
): Promise<SesionResponse> {
  await demorar();
  const guardada = leerGuardada();
  if (!guardada) {
    throw new ApiError("NO_AUTENTICADO", "Tu sesión expiró. Volvé a ingresar.", undefined, 401);
  }

  const cuenta = CUENTAS.find((c) => c.usuario.email === guardada.usuario.email);
  if (!cuenta || cuenta.password !== body.actual) {
    // La contraseña actual no coincide: mismo error genérico del login.
    throw new ApiError("CREDENCIALES_INVALIDAS", "Credenciales inválidas.", "actual", 401);
  }
  if (body.nueva === body.actual) {
    throw new ApiError(
      "CONTRASENA_REUSADA",
      "La contraseña nueva tiene que ser distinta de la actual.",
      "nueva",
      422,
    );
  }

  cuenta.password = body.nueva;
  cuenta.debeCambiarContrasena = false;

  const sesion: SesionResponse = { ...guardada, debeCambiarContrasena: false };
  guardar(sesion);
  return sesion;
}

/**
 * Pedido de enlace de recuperación.
 *
 * Devuelve siempre sin error, exista o no la cuenta: si fallara con
 * "no encontrado", la pantalla sería un detector de emails registrados.
 *
 * BACKEND: `apiSend("POST", RUTA_RECUPERAR, body)` → Supabase Auth manda el
 * mail con el enlace de un solo uso y validez de 1 hora. El front nunca sabe
 * si se envió.
 */
export async function recuperarContrasena(body: RecuperarBody): Promise<void> {
  await demorar();
  void body;
}

function errorBloqueada(hastaMs: number): ApiError {
  const minutos = Math.max(1, Math.ceil((hastaMs - Date.now()) / 60_000));
  return new ApiError(
    "CUENTA_BLOQUEADA",
    `La cuenta está bloqueada por intentos fallidos. Volvé a intentar en ${minutos} ` +
      `${minutos === 1 ? "minuto" : "minutos"}.`,
    undefined,
    423,
    { bloqueadoHasta: new Date(hastaMs).toISOString() },
  );
}
