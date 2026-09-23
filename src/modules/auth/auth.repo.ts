import { query } from "@/lib/db/client";
import type { UsuarioSesionRow, TipoEventoSesion } from "./auth.types";

/**
 * Repositorio de autenticación (HU-SIS-01).
 *
 * Solo SQL. Las reglas de negocio (bloqueo, intentos, etc.) viven en auth.service.ts.
 * Regla dura: valores de usuario nunca concatenados al SQL — siempre $n.
 */

/** Alias del tipo del campo con tilde en la BD. */
const COLUMNAS_USUARIO_SESION = `
  u.id,
  u.nombre,
  u.apellido,
  u.email,
  u.estado,
  u.intentos_fallidos,
  u.bloqueado_hasta,
  u."cambiar_contraseña"      AS cambiar_contrasena,
  u.rol_id,
  r.nombre                    AS rol_nombre,
  u.academia_id,
  a.nombre                    AS academia_nombre
`;

const FROM_USUARIO_SESION = `
  FROM usuario u
  JOIN rol r ON r.id = u.rol_id
  LEFT JOIN academia a ON a.id = u.academia_id
`;

/**
 * Busca un usuario activo o inactivo por email (se necesitan los dos estados
 * para el mensaje genérico: un usuario inactivo recibe el mismo error que uno
 * con contraseña incorrecta, no "la cuenta está deshabilitada").
 */
export async function buscarPorEmail(
  email: string,
): Promise<UsuarioSesionRow | null> {
  const sql = `
    SELECT ${COLUMNAS_USUARIO_SESION}
    ${FROM_USUARIO_SESION}
    WHERE u.email = $1
    LIMIT 1
  `;
  const filas = await query<UsuarioSesionRow>(sql, [email.trim().toLowerCase()]);
  return filas[0] ?? null;
}

/**
 * Busca un usuario por su ID (para GET /sesion tras leer la cookie).
 */
export async function buscarPorId(
  id: number,
): Promise<UsuarioSesionRow | null> {
  const sql = `
    SELECT ${COLUMNAS_USUARIO_SESION}
    ${FROM_USUARIO_SESION}
    WHERE u.id = $1
    LIMIT 1
  `;
  const filas = await query<UsuarioSesionRow>(sql, [id]);
  return filas[0] ?? null;
}

/**
 * Incrementa intentos_fallidos en 1.
 * El CHECK ck_usuario_intentos_fallidos (0..5) está en la BD; al llegar a 5
 * el service ya habrá seteado bloqueado_hasta ANTES de llamar a sumarIntentoFallido,
 * por lo que usamos una sola operación atómica aquí.
 *
 * Lógica de bloqueo: si intentos_fallidos + 1 >= 5, también setea bloqueado_hasta.
 */
export async function sumarIntentoFallido(id: number): Promise<void> {
  // Incrementa y, si llega a 5, bloquea 15 minutos. Todo en un UPDATE.
  await query(
    `
    UPDATE usuario
    SET intentos_fallidos = LEAST(intentos_fallidos + 1, 5),
        bloqueado_hasta   = CASE
                              WHEN intentos_fallidos + 1 >= 5
                              THEN now() + interval '15 minutes'
                              ELSE bloqueado_hasta
                            END
    WHERE id = $1
    `,
    [id],
  );
}

/**
 * Resetea intentos_fallidos a 0 y borra el bloqueo, tras un login exitoso.
 */
export async function limpiarIntentos(id: number): Promise<void> {
  await query(
    `
    UPDATE usuario
    SET intentos_fallidos = 0,
        bloqueado_hasta   = NULL
    WHERE id = $1
    `,
    [id],
  );
}

/**
 * Devuelve la fecha del último evento "login" ANTERIOR al actual.
 * Se llama ANTES de registrar el login nuevo; si se llamara después, el usuario
 * vería siempre "última conexión: ahora mismo".
 */
export async function ultimoLogin(usuarioId: number): Promise<Date | null> {
  const sql = `
    SELECT fecha_hora
    FROM auditoria_sesion
    WHERE usuario_id = $1
      AND evento = 'login'
    ORDER BY fecha_hora DESC
    LIMIT 1
  `;
  const filas = await query<{ fecha_hora: Date }>(sql, [usuarioId]);
  return filas[0]?.fecha_hora ?? null;
}

/**
 * Inserta un evento en auditoria_sesion.
 *
 * La tabla tiene un trigger que bloquea DELETE y UPDATE, así que la bitácora
 * es inmutable una vez escrita.
 *
 * BACKEND: columna usuario_id es nullable porque el trigger lo exige para
 * accesos de usuarios no identificados; acá siempre tenemos el id.
 */
export async function registrarEvento(
  usuarioId: number | null,
  evento: TipoEventoSesion,
  ip: string | null = null,
  detalle?: Record<string, unknown>,
): Promise<void> {
  await query(
    `
    INSERT INTO auditoria_sesion (usuario_id, evento, ip_origen, detalle)
    VALUES ($1, $2::tipo_evento_sesion, $3, $4)
    `,
    [usuarioId, evento, ip, detalle ? JSON.stringify(detalle) : null],
  );
}

/**
 * Marca debe_cambiar_contrasena = false tras el cambio exitoso.
 * Columna: "cambiar_contraseña" boolean en la BD (nombre con tilde).
 */
export async function marcarContrasenaActualizada(id: number): Promise<void> {
  await query(
    `UPDATE usuario SET "cambiar_contraseña" = false WHERE id = $1`,
    [id],
  );
}
