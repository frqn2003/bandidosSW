/**
 * Tipos internos del módulo auth (HU-SIS-01).
 *
 * Son las formas de las filas que devuelve la BD, NO los tipos del contrato.
 * El mapper convierte estas filas al SesionResponse del contrato.
 */

/** Fila del SELECT principal: usuario JOIN rol LEFT JOIN academia. */
export type UsuarioSesionRow = {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  estado: string;
  intentos_fallidos: number;
  bloqueado_hasta: Date | null;
  /** columna: cambiar_contraseña boolean DEFAULT true */
  cambiar_contrasena: boolean;
  rol_id: number;
  rol_nombre: string;
  academia_id: number | null;
  academia_nombre: string | null;
};

/** Tipos válidos de evento en auditoria_sesion (enum tipo_evento_sesion de la BD). */
export type TipoEventoSesion =
  | "login"
  | "logout"
  | "login_fallido"
  | "bloqueado"
  | "acceso_denegado";
