import type { Pool, PoolClient } from "pg";
import { pool, query } from "@/lib/db/client";
import type {
  UsuarioRow,
  FiltrosUsuario,
  CrearUsuarioInputDto,
  EditarUsuarioInputDto,
} from "./usuario.types";

type Ejecutor = Pool | PoolClient;

export const COLUMNAS_USUARIO = `
  u.id,
  u.rol_id,
  u.academia_id,
  u.nombre,
  u.apellido,
  u.dni,
  u.email,
  u.estado,
  u.auth_id,
  u.intentos_fallidos,
  u.bloqueado_hasta,
  u.fecha_creacion,
  u.cambiar_contraseña,
  u.telefono,
  u.motivo_baja_id,
  u.detalle_motivo_baja,
  u.fecha_baja,
  u.debe_cambiar_password,
  r.nombre AS rol_nombre,
  a.nombre AS academia_nombre,
  mb.nombre AS motivo_baja_nombre
`;

export const FROM_USUARIO = `
  FROM usuario u
  JOIN rol r ON r.id = u.rol_id
  LEFT JOIN academia a ON a.id = u.academia_id
  LEFT JOIN motivo_baja mb ON mb.id = u.motivo_baja_id
`;

/**
 * Consulta listado de usuarios con filtros combinables y orden alfabético Apellido, Nombre (A-Z).
 * Resuelve la búsqueda parcial sin distinguir mayúsculas/minúsculas ni acentos (§Receta 2).
 */
export async function findAll(
  filtros: FiltrosUsuario = {},
  ejecutor: Ejecutor = pool,
): Promise<UsuarioRow[]> {
  const condiciones: string[] = [];
  const params: unknown[] = [];

  // 1. Buscador por Nombre, Apellido o DNI (insensible a acentos y mayúsculas/minúsculas)
  if (filtros.busqueda && filtros.busqueda.trim() !== "") {
    params.push(`%${filtros.busqueda.trim()}%`);
    const pIndex = params.length;
    condiciones.push(`(
      unaccent(u.nombre) ILIKE unaccent($${pIndex})
      OR unaccent(u.apellido) ILIKE unaccent($${pIndex})
      OR u.dni ILIKE $${pIndex}
    )`);
  }

  // 2. Filtro de Estado:
  // Por defecto muestra solo activos.
  // Si viene filtros.estado explícito ('activo' o 'inactivo'), filtra por ese estado.
  // Si viene verInactivos=true y no hay filtros.estado, incluye activos e inactivos (no agrega condición).
  if (filtros.estado) {
    params.push(filtros.estado);
    condiciones.push(`u.estado = $${params.length}`);
  } else if (!filtros.verInactivos) {
    condiciones.push(`u.estado = 'activo'`);
  }

  // 3. Filtro por Rol
  if (filtros.rolId) {
    params.push(filtros.rolId);
    condiciones.push(`u.rol_id = $${params.length}`);
  }

  // 4. Filtro por Academia
  if (filtros.academiaId) {
    params.push(filtros.academiaId);
    condiciones.push(`u.academia_id = $${params.length}`);
  }

  const where = condiciones.length > 0 ? `WHERE ${condiciones.join(" AND ")}` : "";
  const sql = `
    SELECT ${COLUMNAS_USUARIO}
    ${FROM_USUARIO}
    ${where}
    ORDER BY u.apellido ASC, u.nombre ASC, u.id ASC
  `;

  if ("query" in ejecutor && ejecutor !== pool) {
    const { rows } = await ejecutor.query<UsuarioRow>(sql, params);
    return rows;
  }
  return query<UsuarioRow>(sql, params);
}

/**
 * Busca un usuario por ID devolviendo toda su información enriquecida.
 */
export async function findById(
  id: number,
  ejecutor: Ejecutor = pool,
): Promise<UsuarioRow | null> {
  const sql = `
    SELECT ${COLUMNAS_USUARIO}
    ${FROM_USUARIO}
    WHERE u.id = $1
    LIMIT 1
  `;
  const params = [id];

  if ("query" in ejecutor && ejecutor !== pool) {
    const { rows } = await ejecutor.query<UsuarioRow>(sql, params);
    return rows[0] ?? null;
  }
  const filas = await query<UsuarioRow>(sql, params);
  return filas[0] ?? null;
}

/**
 * Busca si existe un usuario ACTIVO con ese DNI o Email (insensible a mayúsculas/minúsculas).
 * Opcionalmente excluye un id para validar durante la edición.
 */
export async function buscarDuplicadoActivo(
  dni: string,
  email: string,
  excluirId?: number,
  ejecutor: Ejecutor = pool,
): Promise<{ id: number; dni: string; email: string } | null> {
  const sql = `
    SELECT u.id, u.dni, u.email
    FROM usuario u
    WHERE u.estado = 'activo'
      AND ($1::int IS NULL OR u.id <> $1)
      AND (u.dni = $2 OR lower(u.email) = lower($3))
    LIMIT 1
  `;
  const params = [excluirId ?? null, dni.trim(), email.trim()];

  if ("query" in ejecutor && ejecutor !== pool) {
    const { rows } = await ejecutor.query<{ id: number; dni: string; email: string }>(sql, params);
    return rows[0] ?? null;
  }
  const filas = await query<{ id: number; dni: string; email: string }>(sql, params);
  return filas[0] ?? null;
}

/**
 * Obtiene un rol por ID para validar existencia y reglas asociadas (ej. 'Profesor').
 */
export async function buscarRol(
  rolId: number,
  ejecutor: Ejecutor = pool,
): Promise<{ id: number; nombre: string } | null> {
  const sql = "SELECT id, nombre FROM rol WHERE id = $1 LIMIT 1";
  const params = [rolId];

  if ("query" in ejecutor && ejecutor !== pool) {
    const { rows } = await ejecutor.query<{ id: number; nombre: string }>(sql, params);
    return rows[0] ?? null;
  }
  const filas = await query<{ id: number; nombre: string }>(sql, params);
  return filas[0] ?? null;
}

/**
 * Obtiene una academia por ID para validar existencia.
 */
export async function buscarAcademia(
  academiaId: number,
  ejecutor: Ejecutor = pool,
): Promise<{ id: number; nombre: string; estado: string } | null> {
  const sql = "SELECT id, nombre, estado FROM academia WHERE id = $1 LIMIT 1";
  const params = [academiaId];

  if ("query" in ejecutor && ejecutor !== pool) {
    const { rows } = await ejecutor.query<{ id: number; nombre: string; estado: string }>(sql, params);
    return rows[0] ?? null;
  }
  const filas = await query<{ id: number; nombre: string; estado: string }>(sql, params);
  return filas[0] ?? null;
}

/**
 * Obtiene un motivo de baja por ID para validar reglas (estado activo y requiere_detalle).
 */
export async function buscarMotivoBaja(
  motivoBajaId: number,
  ejecutor: Ejecutor = pool,
): Promise<{ id: number; nombre: string; requiere_detalle: boolean; estado: string } | null> {
  const sql = "SELECT id, nombre, requiere_detalle, estado FROM motivo_baja WHERE id = $1 LIMIT 1";
  const params = [motivoBajaId];

  if ("query" in ejecutor && ejecutor !== pool) {
    const { rows } = await ejecutor.query<{ id: number; nombre: string; requiere_detalle: boolean; estado: string }>(sql, params);
    return rows[0] ?? null;
  }
  const filas = await query<{ id: number; nombre: string; requiere_detalle: boolean; estado: string }>(sql, params);
  return filas[0] ?? null;
}

/**
 * Cuenta la cantidad de usuarios activos con rol 'Gerente', excluyendo opcionalmente un ID.
 */
export async function contarGerentesActivos(
  excluirId?: number,
  ejecutor: Ejecutor = pool,
): Promise<number> {
  const sql = `
    SELECT count(*)::text AS total
    FROM usuario u
    JOIN rol r ON r.id = u.rol_id
    WHERE lower(r.nombre) = 'gerente'
      AND u.estado = 'activo'
      AND ($1::int IS NULL OR u.id <> $1)
  `;
  const params = [excluirId ?? null];

  let rawTotal = "0";
  if ("query" in ejecutor && ejecutor !== pool) {
    const { rows } = await ejecutor.query<{ total: string }>(sql, params);
    rawTotal = rows[0]?.total ?? "0";
  } else {
    const filas = await query<{ total: string }>(sql, params);
    rawTotal = filas[0]?.total ?? "0";
  }
  return Number(rawTotal);
}

/**
 * Cuenta los turnos futuros reservados de un profesor vinculado a este usuario.
 */
export async function contarTurnosFuturosProfesor(
  usuarioId: number,
  ejecutor: Ejecutor = pool,
): Promise<number> {
  const sql = `
    SELECT count(*)::text AS total
    FROM turno t
    JOIN profesor p ON p.id = t.profesor_id
    WHERE p.usuario_id = $1
      AND t.estado <> 'Cancelado'
      AND (t.fecha + t.hora_inicio) >= (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')
  `;
  const params = [usuarioId];

  let rawTotal = "0";
  if ("query" in ejecutor && ejecutor !== pool) {
    const { rows } = await ejecutor.query<{ total: string }>(sql, params);
    rawTotal = rows[0]?.total ?? "0";
  } else {
    const filas = await query<{ total: string }>(sql, params);
    rawTotal = filas[0]?.total ?? "0";
  }
  return Number(rawTotal);
}

/**
 * Inserta un nuevo usuario dentro de la transacción.
 */
export async function insert(
  data: CrearUsuarioInputDto & { authId: string },
  client: PoolClient,
): Promise<UsuarioRow> {
  const sql = `
    INSERT INTO usuario (
      rol_id,
      academia_id,
      nombre,
      apellido,
      dni,
      email,
      telefono,
      estado,
      auth_id,
      debe_cambiar_password,
      "cambiar_contraseña"
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, 'activo', $8, true, true)
    RETURNING id
  `;
  const params = [
    data.rolId,
    data.academiaId ?? null,
    data.nombre.trim(),
    data.apellido.trim(),
    data.dni.trim(),
    data.email.trim().toLowerCase(),
    data.telefono ? data.telefono.trim() : null,
    data.authId,
  ];

  const { rows } = await client.query<{ id: number }>(sql, params);
  const nuevoId = rows[0].id;

  const row = await findById(nuevoId, client);
  if (!row) {
    throw new Error(`Error al recuperar el usuario id ${nuevoId} recién insertado.`);
  }
  return row;
}

/**
 * Actualiza los datos de un usuario dentro de la transacción (§Receta 8).
 */
export async function update(
  id: number,
  data: EditarUsuarioInputDto,
  client: PoolClient,
): Promise<UsuarioRow> {
  const nuevoTelefono = data.telefono ? data.telefono.trim() : null;

  // Si el usuario tiene ficha de profesor, actualizamos el teléfono en la ficha del profesor
  // primero para cumplir con la regla del trigger `trg_usuario_telefono_manda_profesor`.
  if (nuevoTelefono) {
    await client.query(
      `UPDATE profesor
       SET telefono = $1
       WHERE usuario_id = $2 AND telefono IS DISTINCT FROM $1`,
      [nuevoTelefono, id],
    );
  }

  const sql = `
    UPDATE usuario
    SET
      nombre = $2,
      apellido = $3,
      dni = $4,
      email = $5,
      telefono = $6,
      rol_id = $7,
      academia_id = $8
    WHERE id = $1
    RETURNING id
  `;
  const params = [
    id,
    data.nombre.trim(),
    data.apellido.trim(),
    data.dni.trim(),
    data.email.trim().toLowerCase(),
    nuevoTelefono,
    data.rolId,
    data.academiaId ?? null,
  ];

  await client.query(sql, params);

  const row = await findById(id, client);
  if (!row) {
    throw new Error(`Error al recuperar el usuario id ${id} actualizado.`);
  }
  return row;
}

/**
 * Ejecuta la baja lógica de un usuario registrando motivo, detalle y fecha de baja (§Receta 9).
 */
export async function inactivar(
  id: number,
  motivoBajaId: number,
  detalleMotivoBaja: string | null,
  client: PoolClient,
): Promise<UsuarioRow> {
  const sql = `
    UPDATE usuario
    SET
      estado = 'inactivo',
      motivo_baja_id = $2,
      detalle_motivo_baja = $3,
      fecha_baja = (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')
    WHERE id = $1
    RETURNING id
  `;
  const params = [id, motivoBajaId, detalleMotivoBaja];

  await client.query(sql, params);

  const row = await findById(id, client);
  if (!row) {
    throw new Error(`Error al recuperar el usuario id ${id} tras inactivar.`);
  }
  return row;
}

/**
 * Reactiva lógicamente a un usuario, restableciendo el estado a 'activo' y limpiando datos de baja.
 */
export async function reactivar(
  id: number,
  client: PoolClient,
): Promise<UsuarioRow> {
  const sql = `
    UPDATE usuario
    SET
      estado = 'activo',
      motivo_baja_id = NULL,
      detalle_motivo_baja = NULL,
      fecha_baja = NULL
    WHERE id = $1
    RETURNING id
  `;
  const params = [id];

  await client.query(sql, params);

  const row = await findById(id, client);
  if (!row) {
    throw new Error(`Error al recuperar el usuario id ${id} tras reactivar.`);
  }
  return row;
}

/**
 * Desbloquea a un usuario reseteando los intentos fallidos acumulados y la marca temporal de bloqueo.
 */
export async function desbloquear(
  id: number,
  client: PoolClient,
): Promise<UsuarioRow> {
  const sql = `
    UPDATE usuario
    SET
      intentos_fallidos = 0,
      bloqueado_hasta = NULL
    WHERE id = $1
    RETURNING id
  `;
  const params = [id];

  await client.query(sql, params);

  const row = await findById(id, client);
  if (!row) {
    throw new Error(`Error al recuperar el usuario id ${id} tras desbloquear.`);
  }
  return row;
}
