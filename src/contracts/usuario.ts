// src/contracts/usuario.ts
//
// CONTRATO DE USUARIO (HU-SIS-01) — y plantilla de referencia para los demás.
//
// Qué es un contrato: el acuerdo entre front y back sobre UN módulo. Lo importan
// las dos mitades, y se escribe ANTES de que exista la pantalla o el service.
//
// Tiene 5 partes, siempre en este orden:
//   1. Rutas     → las URLs del módulo. El front nunca las tipea a mano.
//   2. Request   → qué manda el front (filtros del listado, body de alta/edición).
//   3. Tipos     → los `type` que salen de los schemas de zod, para front y service.
//   4. Response  → qué devuelve la API. El mapper del back tiene que dar esto.
//   5. Errores   → los códigos que el front puede recibir y manejar.
//
// Va: ruta, request, response, errores. NO va: SQL, reglas de negocio, componentes.
// Tiene que leerse entero en dos minutos.
//
// Lo que NO está acá, a propósito:
//  · `usuarioId` de quien opera → sale de la sesión, nunca del body.
//  · contraseña, bloqueo y recuperación → los maneja Supabase Auth; esta API solo
//    persiste perfil/rol/academia y expone el desbloqueo administrativo.
//  · `intentos_fallidos` y `auth_id` → datos internos del login, no viajan al front.

import { z } from "zod";


// ─── 1. Rutas ────────────────────────────────────────────────────────────
// Las URLs viven acá y en ningún otro lado: si mañana el módulo pasa a
// /api/personal, se cambia esta constante y no se rompe ninguna pantalla.
// Una constante para la colección y una función por cada ruta que lleva id.
//
//   GET    RUTA                  → listar (acepta los filtros de abajo)
//   POST   RUTA                  → crear
//   GET    rutaUsuario(id)       → detalle
//   PUT    rutaUsuario(id)       → editar
//   POST   rutaInactivar(id)     → baja lógica (estado = 'inactivo')
//   POST   rutaDesbloquear(id)   → limpia intentos_fallidos y bloqueado_hasta

export const RUTA = "/api/usuarios";
export const rutaUsuario = (id: number) => `${RUTA}/${id}`;
export const rutaInactivar = (id: number) => `${RUTA}/${id}/inactivar`;
export const rutaDesbloquear = (id: number) => `${RUTA}/${id}/desbloquear`;


// ─── 2a. Request: filtros del listado ────────────────────────────────────
// Lo que viaja en la query string (?estado=activo&rolId=2). Es el espejo exacto
// de los controles de filtro de la pantalla: si no está acá, el back lo ignora.
//
// `z.coerce` porque la query string siempre llega como texto: convierte "2" → 2.
// `.optional()` en todo: un filtro vacío es no filtrar.
// `.strict()` rechaza claves que no estén declaradas, así un filtro mal escrito
// falla fuerte en vez de ignorarse en silencio.

export const listarUsuariosQuery = z
  .object({
    busqueda: z.string().trim().optional(),        // nombre, apellido, dni o email
    estado: z.enum(["activo", "inactivo"]).optional(),
    rolId: z.coerce.number().int().positive().optional(),
    academiaId: z.coerce.number().int().positive().optional(),
  })
  .strict();


// ─── 2b. Request: alta y edición ─────────────────────────────────────────
// El body del formulario, en camelCase (los nombres de la base se traducen en el
// mapper del back, no acá). Las validaciones que se pueden expresar con zod van
// en el schema: el front las usa para validar antes de enviar y el back las
// vuelve a correr con `parseBody` — misma regla, un solo lugar.
//
// `camposUsuario` es la base común; alta y edición se derivan de ella para que no
// se puedan desincronizar. El alta agrega `password`, la edición no (la
// contraseña se cambia por Supabase Auth, no por este ABM).

const camposUsuario = z
  .object({
    nombre: z.string().trim().min(1).max(80),
    apellido: z.string().trim().min(1).max(80),
    dni: z.string().trim().regex(/^\d{7,8}$/, "El DNI debe tener 7 u 8 dígitos."),
    email: z.string().trim().max(120).email(),
    rolId: z.number().int().positive(),
    // Nullable en la base, pero obligatorio para el rol Profesor: un profesor
    // pertenece a una única academia. Zod no puede validarlo (solo recibe el id
    // del rol, no su nombre), así que lo valida el back → ACADEMIA_REQUERIDA.
    academiaId: z.number().int().positive().nullable().default(null),
  })
  .strict();

export const crearUsuarioBody = camposUsuario.extend({
  // Va a Supabase Auth, no a la tabla `usuario`.
  password: z.string().min(8).max(72),
});

export const editarUsuarioBody = camposUsuario;


// ─── 3. Tipos derivados ──────────────────────────────────────────────────
// Los dos lados usan el mismo schema, pero en momentos distintos:
//   `...Body`  = z.input  → ANTES de validar. Lo usa el FRONT para tipar el
//                           objeto que arma (los campos con default son opcionales).
//   `...Input` = z.output → DESPUÉS de validar. Lo recibe el SERVICE, con los
//                           defaults ya aplicados (acá `academiaId` ya es null,
//                           nunca undefined).

export type CrearUsuarioBody = z.input<typeof crearUsuarioBody>;
export type CrearUsuarioInput = z.output<typeof crearUsuarioBody>;
export type EditarUsuarioBody = z.input<typeof editarUsuarioBody>;
export type EditarUsuarioInput = z.output<typeof editarUsuarioBody>;
export type ListarUsuariosQuery = z.output<typeof listarUsuariosQuery>;


// ─── 4. Response ─────────────────────────────────────────────────────────
// Lo que devuelven TODOS los endpoints de este módulo (el listado devuelve un
// array de esto). Es lo que el front pinta en pantalla y lo que el mapper del
// back está obligado a construir: si falta un campo, el mapper no compila.
//
// Reglas del shape:
//  · camelCase, nunca los nombres de columna de la base.
//  · las FK se devuelven resueltas ({ id, nombre }), no como `rolId` pelado: la
//    tabla necesita el nombre y el <select> necesita el id.
//  · las fechas viajan como string ISO 8601 (JSON no tiene tipo fecha).
//  · `null` para "no tiene valor"; los campos nunca se omiten.

export type EstadoUsuario = "activo" | "inactivo";

export type UsuarioResponse = {
  id: number;
  nombre: string;
  apellido: string;
  dni: string;
  email: string;
  rol: { id: number; nombre: string };
  academia: { id: number; nombre: string } | null;
  estado: EstadoUsuario;
  /** ISO 8601. No null ⇒ la cuenta está bloqueada hasta esa fecha. */
  bloqueadoHasta: string | null;
  /** ISO 8601. */
  fechaCreacion: string;
};


// ─── 5. Errores de dominio ───────────────────────────────────────────────
// La lista cerrada de códigos que este módulo puede devolver. El back los lanza
// (ConflictError / ValidationError / NotFoundError, ver src/lib/http/errors.ts) y
// el front decide qué mostrar en cada caso; el resto cae en el mensaje genérico.
//
// Llegan siempre con el mismo shape:
//   { "error": { "codigo": "DNI_DUPLICADO", "mensaje": "...", "campo": "dni" } }
//
// `campo` coincide con el nombre del campo del body, así el front marca el input
// en rojo sin mirar el código. Código nuevo = se agrega ACÁ primero, después se
// lanza en el service.

export type ErrorUsuario =
  | "DNI_DUPLICADO"              // 409
  | "EMAIL_DUPLICADO"            // 409
  | "ACADEMIA_REQUERIDA"         // 422, rol Profesor sin academia
  | "REFERENCIA_INVALIDA"        // 422, rolId o academiaId inexistente
  | "PROFESOR_CON_TURNOS_FUTUROS"// 409, al inactivar
  | "AUTOBAJA_NO_PERMITIDA"      // 409, nadie se inactiva a sí mismo
  | "AUTH_NO_DISPONIBLE"         // 503, Supabase Auth caído en el alta
  | "NO_ENCONTRADO"              // 404
  | "DATOS_INVALIDOS";           // 422
