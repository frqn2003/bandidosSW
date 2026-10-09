// src/contracts/usuario.ts
//
// CONTRATO DE USUARIO (HU-SIS-00 / HU-SIS-01).
//
// Reglas de negocio del módulo:
//  · Alta de usuario: el sistema genera una contraseña temporal alfanumérica de al menos 8 caracteres,
//    la envía al email registrado y obliga al usuario a cambiarla en su primer login (`debe_cambiar_password = true`).
//    El body no recibe contraseña.
//  · En caso de que el proveedor de email falle, se devuelve `ERROR_ENVIO_EMAIL`.
//  · Teléfono opcional (10 u 11 dígitos numéricos).
//  · Baja lógica con motivo obligatorio: exige `motivoBajaId` y `detalleMotivoBaja` si el motivo lo requiere ("Otro").
//  · Reactivación lógica: reactiva usuarios inactivos (`POST /api/usuarios/:id/reactivar`).
//  · Reglas duras:
//    - Ningún usuario puede desactivar su propia cuenta (`AUTOBAJA_NO_PERMITIDA`).
//    - No se puede desactivar al último Gerente activo del sistema (`ULTIMO_GERENTE_ACTIVO`).
//  · Orden del listado: ordenado alfabéticamente por Apellido y luego por Nombre (ascendente A-Z).
//  · Por defecto muestra solo usuarios activos; `verInactivos=true` incluye inactivos.

import { z } from "zod";
import { booleanQuery, RUTA_MOTIVOS_BAJA } from "./catalogo";

export { booleanQuery, RUTA_MOTIVOS_BAJA };


// ─── 1. Rutas ────────────────────────────────────────────────────────────
//   GET    RUTA                  → listar (orden Apellido, Nombre A-Z)
//   POST   RUTA                  → crear (genera password temporal y envía email)
//   GET    rutaUsuario(id)       → detalle
//   PUT    rutaUsuario(id)       → editar
//   POST   rutaInactivar(id)     → baja lógica (requiere motivo de baja)
//   POST   rutaReactivar(id)     → reactivación lógica (estado = 'activo')
//   POST   rutaDesbloquear(id)   → limpia intentos_fallidos y bloqueado_hasta

export const RUTA = "/api/usuarios";
export const rutaUsuario = (id: number) => `${RUTA}/${id}`;
export const rutaInactivar = (id: number) => `${RUTA}/${id}/inactivar`;
export const rutaReactivar = (id: number) => `${RUTA}/${id}/reactivar`;
export const rutaDesbloquear = (id: number) => `${RUTA}/${id}/desbloquear`;


// ─── 2a. Request: filtros del listado ────────────────────────────────────

export const listarUsuariosQuery = z
  .object({
    busqueda: z.string().trim().optional(), // nombre, apellido o DNI (coincidencia parcial)
    estado: z.enum(["activo", "inactivo"]).optional(),
    rolId: z.coerce.number().int().positive().optional(),
    academiaId: z.coerce.number().int().positive().optional(),
    verInactivos: booleanQuery.optional(),
  })
  .strict();


// ─── 2b. Request: alta y edición ─────────────────────────────────────────

const TELEFONO = /^\d{10,11}$/;

const emptyToNull = (val: unknown) =>
  typeof val === "string" && val.trim() === "" ? null : val;

const camposUsuario = z
  .object({
    nombre: z.string().trim().min(1, "El nombre es obligatorio.").max(50, "Máximo 50 caracteres."),
    apellido: z.string().trim().min(1, "El apellido es obligatorio.").max(50, "Máximo 50 caracteres."),
    dni: z.string().trim().regex(/^\d{7,8}$/, "El DNI debe tener 7 u 8 dígitos."),
    email: z.string().trim().max(120, "Máximo 120 caracteres.").email("Formato de email inválido."),
    telefono: z.preprocess(
      emptyToNull,
      z.string().trim().regex(TELEFONO, "El teléfono debe tener 10 u 11 dígitos numéricos.").nullable().optional().default(null)
    ),
    rolId: z.number().int().positive({ message: "Debe seleccionar un rol." }),
    // Nullable en la base, obligatorio para rol Profesor
    academiaId: z.number().int().positive().nullable().optional().default(null),
  })
  .strict();

export const crearUsuarioBody = camposUsuario;
export const editarUsuarioBody = camposUsuario;

/** Body requerido para la baja lógica obligatoria con motivo (HU-SIS-00). */
export const inactivarUsuarioBody = z
  .object({
    motivoBajaId: z.number().int().positive({
      message: "Debe seleccionar un motivo de baja.",
    }),
    detalleMotivoBaja: z.preprocess(
      emptyToNull,
      z.string().trim().max(200, "El detalle no puede superar 200 caracteres.").nullable().optional().default(null)
    ),
  })
  .strict();

export const reactivarUsuarioBody = z.object({}).strict();


// ─── 3. Tipos derivados ──────────────────────────────────────────────────

export type CrearUsuarioBody = z.input<typeof crearUsuarioBody>;
export type CrearUsuarioInput = z.output<typeof crearUsuarioBody>;
export type EditarUsuarioBody = z.input<typeof editarUsuarioBody>;
export type EditarUsuarioInput = z.output<typeof editarUsuarioBody>;
export type InactivarUsuarioBody = z.input<typeof inactivarUsuarioBody>;
export type InactivarUsuarioInput = z.output<typeof inactivarUsuarioBody>;
export type ListarUsuariosQuery = z.output<typeof listarUsuariosQuery>;


// ─── 4. Response ─────────────────────────────────────────────────────────

export type EstadoUsuario = "activo" | "inactivo";

export type UsuarioResponse = {
  id: number;
  nombre: string;
  apellido: string;
  dni: string;
  email: string;
  telefono: string | null;
  rol: { id: number; nombre: string };
  academia: { id: number; nombre: string } | null;
  estado: EstadoUsuario;
  /** ISO 8601. No null ⇒ la cuenta está bloqueada hasta esa fecha. */
  bloqueadoHasta: string | null;
  /** ISO 8601. */
  fechaCreacion: string;
  /** Motivo de baja registrado si el usuario está inactivo. */
  motivoBaja?: { id: number; nombre: string } | null;
  detalleMotivoBaja?: string | null;
  fechaBaja?: string | null;
  debeCambiarPassword?: boolean;
  passwordTemporal?: string;
};


// ─── 5. Errores de dominio ───────────────────────────────────────────────

export type ErrorUsuario =
  | "DNI_DUPLICADO"               // 409
  | "EMAIL_DUPLICADO"             // 409
  | "ACADEMIA_REQUERIDA"          // 422, rol Profesor sin academia asignada
  | "REFERENCIA_INVALIDA"         // 422, rolId o academiaId inexistente
  | "PROFESOR_CON_TURNOS_FUTUROS" // 409, al inactivar
  | "AUTOBAJA_NO_PERMITIDA"       // 409, nadie se inactiva a sí mismo
  | "ULTIMO_GERENTE_ACTIVO"       // 409, no se puede desactivar al último Gerente activo
  | "MOTIVO_BAJA_REQUERIDO"       // 422, baja sin motivo
  | "DETALLE_MOTIVO_BAJA_REQUERIDO" // 422, motivo 'Otro' exige detalle
  | "MOTIVO_BAJA_INACTIVO"        // 422
  | "USUARIO_YA_INACTIVO"         // 409
  | "USUARIO_YA_ACTIVO"           // 409
  | "ERROR_ENVIO_EMAIL"           // 500, falla en el envío de la contraseña temporal
  | "AUTH_NO_DISPONIBLE"          // 503, proveedor de autenticación caído
  | "NO_ENCONTRADO"               // 404
  | "DATOS_INVALIDOS";            // 422
