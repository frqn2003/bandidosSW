import type { Pool, PoolClient } from "pg";
import { pool, query } from "@/lib/db/client";
import type {
  AlumnoRow,
  FiltrosAlumno,
  CrearAlumnoInputDto,
  EditarAlumnoInputDto,
} from "./alumno.types";

type Ejecutor = Pool | PoolClient;

/**
 * Lista explícita de columnas. NUNCA `SELECT *`.
 */
const COLUMNAS = `
  id, legajo, nombre, apellido, dni, fecha_nacimiento,
  telefono, email, nivel_educativo, responsable_nombre,
  responsable_dni, responsable_telefono, estado,
  created_at, updated_at
`;

/**
 * Busca alumnos aplicando filtros dinámicos y orden Apellido, Nombre A-Z.
 */
export async function findAll(
  filtros: FiltrosAlumno = {},
  ejecutor: Ejecutor = pool,
): Promise<AlumnoRow[]> {
  const condiciones: string[] = [];
  const params: unknown[] = [];

  if (filtros.busqueda) {
    params.push(`%${filtros.busqueda.trim()}%`);
    const p = `$${params.length}`;
    condiciones.push(
      `(legajo ILIKE ${p} OR nombre ILIKE ${p} OR apellido ILIKE ${p} OR dni ILIKE ${p})`,
    );
  }

  if (filtros.nivelEducativo) {
    params.push(filtros.nivelEducativo);
    condiciones.push(`nivel_educativo = $${params.length}`);
  }

  if (filtros.estado) {
    params.push(filtros.estado);
    condiciones.push(`estado = $${params.length}`);
  }

  const where = condiciones.length > 0 ? `WHERE ${condiciones.join(" AND ")}` : "";
  const sql = `SELECT ${COLUMNAS} FROM alumno ${where} ORDER BY apellido ASC, nombre ASC`;

  if ("query" in ejecutor && ejecutor !== pool) {
    const { rows } = await ejecutor.query<AlumnoRow>(sql, params);
    return rows;
  }
  return query<AlumnoRow>(sql, params);
}

/**
 * Busca un alumno por su ID primario.
 */
export async function findById(
  id: number,
  ejecutor: Ejecutor = pool,
): Promise<AlumnoRow | null> {
  const sql = `SELECT ${COLUMNAS} FROM alumno WHERE id = $1`;
  if ("query" in ejecutor && ejecutor !== pool) {
    const { rows } = await ejecutor.query<AlumnoRow>(sql, [id]);
    return rows[0] ?? null;
  }
  const filas = await query<AlumnoRow>(sql, [id]);
  return filas[0] ?? null;
}

/**
 * Busca un alumno activo con el mismo DNI (excluyendo opcionalmente un ID en caso de edición).
 */
export async function findByDniActivo(
  dni: string,
  excluirId?: number,
  ejecutor: Ejecutor = pool,
): Promise<AlumnoRow | null> {
  const params: unknown[] = [dni.trim(), excluirId ?? null];
  const sql = `
    SELECT ${COLUMNAS}
    FROM alumno
    WHERE dni = $1
      AND estado = 'activo'
      AND ($2::int IS NULL OR id <> $2)
    LIMIT 1
  `;

  if ("query" in ejecutor && ejecutor !== pool) {
    const { rows } = await ejecutor.query<AlumnoRow>(sql, params);
    return rows[0] ?? null;
  }
  const filas = await query<AlumnoRow>(sql, params);
  return filas[0] ?? null;
}

/**
 * Busca coincidencias de posible duplicado por nombre, apellido y fecha de nacimiento.
 */
export async function findPosiblesDuplicados(
  nombre: string,
  apellido: string,
  fechaNacimiento: string,
  ejecutor: Ejecutor = pool,
): Promise<AlumnoRow[]> {
  const params: unknown[] = [nombre.trim(), apellido.trim(), fechaNacimiento];
  const sql = `
    SELECT ${COLUMNAS}
    FROM alumno
    WHERE LOWER(BTRIM(nombre)) = LOWER(BTRIM($1))
      AND LOWER(BTRIM(apellido)) = LOWER(BTRIM($2))
      AND fecha_nacimiento = $3::date
    ORDER BY apellido ASC, nombre ASC
  `;

  if ("query" in ejecutor && ejecutor !== pool) {
    const { rows } = await ejecutor.query<AlumnoRow>(sql, params);
    return rows;
  }
  return query<AlumnoRow>(sql, params);
}

/**
 * Inserta un nuevo alumno dentro de una transacción.
 */
export async function insert(
  data: CrearAlumnoInputDto,
  client: PoolClient,
): Promise<AlumnoRow> {
  const sql = `
    INSERT INTO alumno (
      nombre,
      apellido,
      dni,
      fecha_nacimiento,
      telefono,
      email,
      nivel_educativo,
      responsable_nombre,
      responsable_dni,
      responsable_telefono,
      estado
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'activo')
    RETURNING ${COLUMNAS}
  `;

  const { rows } = await client.query<AlumnoRow>(sql, [
    data.nombre.trim(),
    data.apellido.trim(),
    data.dni.trim(),
    data.fechaNacimiento,
    data.telefono.trim(),
    data.email?.trim() ? data.email.trim() : null,
    data.nivelEducativo,
    data.responsableNombre ? data.responsableNombre.trim() : null,
    data.responsableDni ? data.responsableDni.trim() : null,
    data.responsableTelefono ? data.responsableTelefono.trim() : null,
  ]);

  return rows[0];
}

/**
 * Actualiza los datos de un alumno existente.
 */
export async function update(
  id: number,
  data: EditarAlumnoInputDto,
  client: PoolClient,
): Promise<AlumnoRow | null> {
  const sql = `
    UPDATE alumno
    SET nombre = $1,
        apellido = $2,
        dni = $3,
        fecha_nacimiento = $4,
        telefono = $5,
        email = $6,
        nivel_educativo = $7,
        responsable_nombre = $8,
        responsable_dni = $9,
        responsable_telefono = $10,
        updated_at = now()
    WHERE id = $11
    RETURNING ${COLUMNAS}
  `;

  const { rows } = await client.query<AlumnoRow>(sql, [
    data.nombre.trim(),
    data.apellido.trim(),
    data.dni.trim(),
    data.fechaNacimiento,
    data.telefono.trim(),
    data.email?.trim() ? data.email.trim() : null,
    data.nivelEducativo,
    data.responsableNombre ? data.responsableNombre.trim() : null,
    data.responsableDni ? data.responsableDni.trim() : null,
    data.responsableTelefono ? data.responsableTelefono.trim() : null,
    id,
  ]);

  return rows[0] ?? null;
}

/**
 * Realiza la baja lógica cambiando el estado a 'inactivo'.
 */
export async function inactivar(
  id: number,
  client: PoolClient,
): Promise<AlumnoRow | null> {
  const sql = `
    UPDATE alumno
    SET estado = 'inactivo',
        updated_at = now()
    WHERE id = $1
    RETURNING ${COLUMNAS}
  `;

  const { rows } = await client.query<AlumnoRow>(sql, [id]);
  return rows[0] ?? null;
}

/**
 * Cuenta turnos futuros reservados asociados a este alumno.
 */
export async function contarTurnosFuturos(
  alumnoId: number,
  ejecutor: Ejecutor = pool,
): Promise<number> {
  const sql = `
    SELECT count(*)::text AS total
    FROM turno
    WHERE alumno_id = $1
      AND fecha >= CURRENT_DATE
      AND estado = 'Reservado'
  `;

  if ("query" in ejecutor && ejecutor !== pool) {
    const { rows } = await ejecutor.query<{ total: string }>(sql, [alumnoId]);
    return Number(rows[0]?.total ?? 0);
  }
  const filas = await query<{ total: string }>(sql, [alumnoId]);
  return Number(filas[0]?.total ?? 0);
}
