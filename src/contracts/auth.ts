// src/contracts/auth.ts
//
// CONTRATO DE AUTENTICACIÓN (HU-SIS-01): login, logout, sesión actual, cambio
// de contraseña y recuperación.
//
// Lo importan las DOS mitades. Va: ruta, request, response, errores.
//
// Particularidades de este módulo, que no son las de un ABM:
//
//  · **La contraseña no viaja nunca en un response.** Tampoco vive en la tabla
//    `usuario`: la valida Supabase Auth (GoTrue) contra `auth.users`, y
//    `usuario.auth_id` es el vínculo entre las dos.
//
//  · **El error de credenciales es genérico a propósito.** No distingue "el
//    email no existe" de "la contraseña está mal", y tampoco lleva `campo`:
//    marcar en rojo el input de la contraseña equivaldría a confirmar que el
//    email era correcto. Un usuario con `estado = 'inactivo'` recibe el mismo
//    error genérico, por el mismo motivo.
//
//  · **El conteo de intentos y el bloqueo son del back.** El front no cuenta
//    nada: recibe CUENTA_BLOQUEADA con la fecha de desbloqueo y muestra el
//    contador. Las columnas son `usuario.intentos_fallidos` (CHECK 0..5) y
//    `usuario.bloqueado_hasta`.
//
//  · **La bitácora la escribe el back.** Cada login exitoso, fallido, bloqueo,
//    logout y acceso denegado va a `auditoria_sesion`. El front no la registra
//    ni la consulta (eso es otra HU: src/contracts/auditoria.ts).
//
// Los códigos de error de este contrato NO son nuevos: ya están implementados
// en src/lib/http/errors.ts (CredencialesInvalidasError, CuentaBloqueadaError,
// ServicioAuthNoDisponibleError). Acá se declaran para que el front los pueda
// manejar con el tipo cerrado.

import { z } from "zod";
import type { NombreRol } from "@/contracts/rol";


// ─── 1. Rutas ────────────────────────────────────────────────────────────
//   POST  RUTA_LOGIN                → iniciar sesión
//   POST  RUTA_LOGOUT               → cerrar sesión (invalida el token)
//   GET   RUTA_SESION               → la sesión actual (401 si no hay)
//   POST  RUTA_CAMBIAR_CONTRASENA   → cambio obligatorio del primer ingreso
//   POST  RUTA_RECUPERAR            → pedir el enlace de recuperación

export const RUTA = "/api/auth";
export const RUTA_LOGIN = `${RUTA}/login`;
export const RUTA_LOGOUT = `${RUTA}/logout`;
export const RUTA_SESION = `${RUTA}/sesion`;
export const RUTA_CAMBIAR_CONTRASENA = `${RUTA}/cambiar-contrasena`;
export const RUTA_RECUPERAR = `${RUTA}/recuperar`;

/**
 * Minutos de inactividad antes de que la sesión expire.
 *
 * Está acá y no en cada pantalla porque los dos lados tienen que usar el mismo
 * número: el back corta la sesión y el front avisa antes de que el usuario
 * pierda lo que estaba haciendo. La autoridad sigue siendo el back — cuando
 * expira, cualquier endpoint devuelve NO_AUTENTICADO.
 */
export const MINUTOS_INACTIVIDAD = 30;


// ─── 2a. Request: login ──────────────────────────────────────────────────
// Ojo con lo que NO se valida acá: la política de contraseña (largo, mayúscula,
// número) NO va en el login. Si el formulario rechazara una contraseña corta
// antes de enviarla, le estaría diciendo a cualquiera cuál es la política; y
// además dejaría afuera a las cuentas viejas. Al iniciar sesión solo importa
// que el campo no esté vacío: si la contraseña no sirve, lo dice el back.

export const loginBody = z
  .object({
    email: z.string().trim().max(120).email("Ingresá un email válido."),
    password: z.string().min(1, "Ingresá tu contraseña."),
  })
  .strict();


// ─── 2b. Request: cambio de contraseña ───────────────────────────────────
// La política del criterio de aceptación, en un solo lugar: la usa el
// formulario para tildar los requisitos en vivo y el back para validarla de
// nuevo con `parseBody`.

export const contrasenaSegura = z
  .string()
  .min(8, "Tiene que tener al menos 8 caracteres.")
  .max(72, "Máximo 72 caracteres.")
  .regex(/[A-ZÁÉÍÓÚÜÑ]/, "Tiene que tener al menos una mayúscula.")
  .regex(/[a-záéíóúüñ]/, "Tiene que tener al menos una minúscula.")
  .regex(/\d/, "Tiene que tener al menos un número.");

export const cambiarContrasenaBody = z
  .object({
    actual: z.string().min(1, "Ingresá tu contraseña actual."),
    nueva: contrasenaSegura,
    // La confirmación viaja en el body a propósito: así la regla "las dos
    // tienen que coincidir" se escribe UNA vez y la corren las dos mitades. Es
    // el mismo secreto que ya va en `nueva`, por la misma conexión.
    repetirNueva: z.string().min(1, "Repetí la contraseña nueva."),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.nueva !== v.repetirNueva) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["repetirNueva"],
        message: "Las contraseñas no coinciden.",
      });
    }
    if (v.actual && v.nueva === v.actual) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["nueva"],
        message: "La contraseña nueva tiene que ser distinta de la actual.",
      });
    }
  });


// ─── 2c. Request: recuperación ───────────────────────────────────────────

export const recuperarBody = z
  .object({
    email: z.string().trim().max(120).email("Ingresá un email válido."),
  })
  .strict();


// ─── 3. Tipos derivados ──────────────────────────────────────────────────

export type LoginBody = z.input<typeof loginBody>;
export type LoginInput = z.output<typeof loginBody>;
export type CambiarContrasenaBody = z.input<typeof cambiarContrasenaBody>;
export type CambiarContrasenaInput = z.output<typeof cambiarContrasenaBody>;
export type RecuperarBody = z.input<typeof recuperarBody>;
export type RecuperarInput = z.output<typeof recuperarBody>;


// ─── 4. Response ─────────────────────────────────────────────────────────
// Lo mismo devuelven POST /login, GET /sesion y POST /cambiar-contrasena: el
// front tiene un solo shape de sesión y no le importa de cuál de los tres vino.
//
// POST /logout y POST /recuperar no devuelven cuerpo (204). `recuperar`
// contesta 204 SIEMPRE, exista o no la cuenta: si contestara distinto sería un
// detector de emails registrados.

/** El rol decide qué módulos ve el usuario; por eso es la unión cerrada. */
export type UsuarioSesion = {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  rol: { id: number; nombre: NombreRol };
  /** Nullable en la base; un Profesor siempre tiene una. */
  academia: { id: number; nombre: string } | null;
};

export type SesionResponse = {
  usuario: UsuarioSesion;
  /**
   * Primer ingreso con contraseña temporal: hay que cambiarla antes de seguir.
   *
   * PENDIENTE DBA/BACK: hoy **no existe** la columna que respalda este campo —
   * `usuario` no tiene `debe_cambiar_contrasena` ni equivalente (ver
   * docs/esquema-bd-front.md). La DBA está al tanto; lo más probable es que
   * salga del `user_metadata` de Supabase Auth. Cuando se defina, se actualiza
   * este contrato PRIMERO y después las dos mitades.
   */
  debeCambiarContrasena: boolean;
  /**
   * ISO 8601. Último inicio de sesión ANTERIOR a este (null la primera vez).
   * BACKEND: sale del último evento `login` de `auditoria_sesion` del usuario.
   */
  ultimaConexion: string | null;
};

/** Datos extra que acompañan al error CUENTA_BLOQUEADA. */
export type DatosCuentaBloqueada = {
  /** ISO 8601 — hasta cuándo está bloqueada. El front arma el contador. */
  bloqueadoHasta: string;
};


// ─── 5. Errores de dominio ───────────────────────────────────────────────
// Llegan con el shape de siempre:
//   { "error": { "codigo": "CUENTA_BLOQUEADA", "mensaje": "…", "datos": { … } } }
//
// CREDENCIALES_INVALIDAS es el único que el front NO debe enriquecer: se
// muestra tal cual y sin marcar ningún campo.

export type ErrorAuth =
  | "CREDENCIALES_INVALIDAS" // 401, genérico: email inexistente, contraseña incorrecta o cuenta inactiva
  | "CUENTA_BLOQUEADA"       // 423, 5 intentos fallidos; trae `datos.bloqueadoHasta`
  | "AUTH_NO_DISPONIBLE"     // 503, Supabase Auth no responde. NO cuenta como intento fallido
  | "NO_AUTENTICADO"         // 401, no hay sesión o expiró por inactividad
  | "CONTRASENA_INSEGURA"    // 422, no cumple la política
  | "CONTRASENA_REUSADA"     // 422, la nueva es igual a la actual
  | "DATOS_INVALIDOS";       // 422
