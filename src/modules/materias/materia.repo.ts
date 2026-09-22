import type { Pool, PoolClient } from "pg";
import { pool, query } from "@/lib/db/client";
import type { MateriaRow, FiltrosMateria, MateriaInput } from "./materia.types";

type Ejecutor = Pool | PoolClient;

/**
 * Lista explícita de columnas. NUNCA `SELECT *` (§4.2 del manual).
 */
const COLUMNAS = `
  id, nombre, nivel, descripcion, duracion_clase_minutos,
  valor_clase, estado, created_at, updated_at
`;

/**
 * Busca materias aplicando filtros dinámicos y seguros (§7.1, Receta 2).
 */
export async function findAll(
  filtros: FiltrosMateria = {},
  ejecutor: Ejecutor = pool,
): Promise<MateriaRow[]> {
  const condiciones: string[] = [];
  const params: unknown[] = [];

  if (filtros.busqueda) {
    params.push(`%${filtros.busqueda.trim()}%`);
    condiciones.push(
      `(nombre ILIKE $${params.length} OR COALESCE(descripcion, '') ILIKE $${params.length})`,
    );
  }

  if (filtros.nivel) {
    params.push(filtros.nivel);
    condiciones.push(`nivel = $${params.length}`);
  }

  if (filtros.estado) {
    params.push(filtros.estado);
    condiciones.push(`estado = $${params.length}`);
  }

  const where = condiciones.length > 0 ? `WHERE ${condiciones.join(" AND ")}` : "";

  const sql = `SELECT ${COLUMNAS} FROM materia ${where} ORDER BY nombre ASC`;

  if ("query" in ejecutor && ejecutor !== pool) {
    const { rows } = await ejecutor.query<MateriaRow>(sql, params);
    return rows;
  }
  return query<MateriaRow>(sql, params);
}

/**
 * Busca una materia por su ID primario.
 */
export async function findById(
  id: number,
  ejecutor: Ejecutor = pool,
): Promise<MateriaRow | null> {
  const sql = `SELECT ${COLUMNAS} FROM materia WHERE id = $1`;
  if ("query" in ejecutor && ejecutor !== pool) {
    const { rows } = await ejecutor.query<MateriaRow>(sql, [id]);
    return rows[0] ?? null;
  }
  const filas = await query<MateriaRow>(sql, [id]);
  return filas[0] ?? null;
}

/**
 * Chequea si ya existe una materia activa con ese nombre (normalizado en minúsculas y sin espacios).
 * Soporta excluir un ID para edición (§Receta 8, §8.5).
 */
export async function findActivoByNombre(
  nombre: string,
  excluirId?: number,
  ejecutor: Ejecutor = pool,
): Promise<MateriaRow | null> {
  const params: unknown[] = [nombre.trim(), excluirId ?? null];
  const sql = `
    SELECT ${COLUMNAS}
    FROM materia
    WHERE LOWER(BTRIM(nombre)) = LOWER(BTRIM($1))
      AND estado = 'activo'
      AND ($2::int IS NULL OR id <> $2)
    LIMIT 1
  `;

  if ("query" in ejecutor && ejecutor !== pool) {
    const { rows } = await ejecutor.query<MateriaRow>(sql, params);
    return rows[0] ?? null;
  }
  const filas = await query<MateriaRow>(sql, params);
  return filas[0] ?? null;
}

/**
 * Inserta una nueva materia dentro de una transacción (§3.6, Receta 5).
 */
export async function insert(
  data: MateriaInput,
  client: PoolClient,
): Promise<MateriaRow> {
  const sql = `
    INSERT INTO materia (
      nombre,
      nivel,
      descripcion,
      duracion_clase_minutos,
      valor_clase,
      estado
    )
    VALUES ($1, $2, $3, $4, $5, 'activo')
    RETURNING ${COLUMNAS}
  `;

  const { rows } = await client.query<MateriaRow>(sql, [
    data.nombre.trim(),
    data.nivel,
    data.descripcion ? data.descripcion.trim() : null,
    data.duracionClaseMinutos,
    data.valorClase,
  ]);

  return rows[0];
}

/**
 * Actualiza los datos de una materia existente (§Receta 8).
 */
export async function update(
  id: number,
  data: MateriaInput,
  client: PoolClient,
): Promise<MateriaRow | null> {
  const sql = `
    UPDATE materia
    SET nombre = $1,
        nivel = $2,
        descripcion = $3,
        duracion_clase_minutos = $4,
        valor_clase = $5,
        updated_at = now()
    WHERE id = $6
    RETURNING ${COLUMNAS}
  `;

  const { rows } = await client.query<MateriaRow>(sql, [
    data.nombre.trim(),
    data.nivel,
    data.descripcion ? data.descripcion.trim() : null,
    data.duracionClaseMinutos,
    data.valorClase,
    id,
  ]);

  return rows[0] ?? null;
}

/**
 * Realiza la baja lógica cambiando el estado a 'inactivo' (§Receta 9).
 */
export async function inactivar(
  id: number,
  client: PoolClient,
): Promise<MateriaRow | null> {
  const sql = `
    UPDATE materia
    SET estado = 'inactivo',
        updated_at = now()
    WHERE id = $1
    RETURNING ${COLUMNAS}
  `;

  const { rows } = await client.query<MateriaRow>(sql, [id]);
  return rows[0] ?? null;
}

/**
 * Reactiva una materia cambiando su estado a 'activo'.
 */
export async function activar(
  id: number,
  client: PoolClient,
): Promise<MateriaRow | null> {
  const sql = `
    UPDATE materia
    SET estado = 'activo',
        updated_at = now()
    WHERE id = $1
    RETURNING ${COLUMNAS}
  `;

  const { rows } = await client.query<MateriaRow>(sql, [id]);
  return rows[0] ?? null;
}

/**
 * Cuenta turnos futuros reservados asociados a esta materia.
 */
export async function contarTurnosFuturos(
  materiaId: number,
  ejecutor: Ejecutor = pool,
): Promise<number> {
  const sql = `
    SELECT count(*)::text AS total
    FROM turno
    WHERE materia_id = $1
      AND fecha >= CURRENT_DATE
      AND estado = 'Reservado'
  `;

  if ("query" in ejecutor && ejecutor !== pool) {
    const { rows } = await ejecutor.query<{ total: string }>(sql, [materiaId]);
    return Number(rows[0]?.total ?? 0);
  }
  const filas = await query<{ total: string }>(sql, [materiaId]);
  return Number(filas[0]?.total ?? 0);
}

/**
 * Cuenta asignaciones de profesores a esta materia.
 */
export async function contarProfesoresAsignados(
  materiaId: number,
  ejecutor: Ejecutor = pool,
): Promise<number> {
  const sql = `
    SELECT count(*)::text AS total
    FROM profesor_materia
    WHERE materia_id = $1
  `;

  if ("query" in ejecutor && ejecutor !== pool) {
    const { rows } = await ejecutor.query<{ total: string }>(sql, [materiaId]);
    return Number(rows[0]?.total ?? 0);
  }
  const filas = await query<{ total: string }>(sql, [materiaId]);
  return Number(filas[0]?.total ?? 0);
}
