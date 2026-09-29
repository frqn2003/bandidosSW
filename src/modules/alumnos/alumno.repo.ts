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
  institucion_origen, observaciones_generales,
  created_at, updated_at
`;

/**
 * Busca alumnos aplicando filtros dinámicos y orden Apellido, Nombre A-Z.
 * Precedencia de filtros de estado (según contrato HU-ALU-02):
 *  - Si se especifica `estado`, filtra por dicho estado.
 *  - Si `verInactivos=true` (y sin `estado`), devuelve activos e inactivos.
 *  - Por defecto (`verInactivos` ausente o false), devuelve ÚNICAMENTE activos.
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

  if (filtros.materiaInteresId) {
    params.push(filtros.materiaInteresId);
    condiciones.push(
      `EXISTS (SELECT 1 FROM alumno_materia_interes ami WHERE ami.alumno_id = alumno.id AND ami.materia_id = $${params.length})`,
    );
  }

  if (filtros.estado) {
    params.push(filtros.estado);
    condiciones.push(`estado = $${params.length}`);
  } else if (!filtros.verInactivos) {
    condiciones.push(`estado = 'activo'`);
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
 * Busca un alumno activo con el mismo DNI (excluyendo opcionalmente un ID en caso de edición/reactivación).
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
      institucion_origen,
      observaciones_generales,
      estado
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'activo')
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
    data.institucionOrigen?.trim() ? data.institucionOrigen.trim() : null,
    data.observacionesGenerales?.trim() ? data.observacionesGenerales.trim() : null,
  ]);

  return rows[0];
}

/**
 * Actualiza los datos de la ficha completa de un alumno.
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
        institucion_origen = $11,
        observaciones_generales = $12,
        updated_at = now()
    WHERE id = $13
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
    data.institucionOrigen?.trim() ? data.institucionOrigen.trim() : null,
    data.observacionesGenerales?.trim() ? data.observacionesGenerales.trim() : null,
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
 * Reactiva un alumno cambiando el estado a 'activo'.
 */
export async function reactivar(
  id: number,
  client: PoolClient,
): Promise<AlumnoRow | null> {
  const sql = `
    UPDATE alumno
    SET estado = 'activo',
        updated_at = now()
    WHERE id = $1
    RETURNING ${COLUMNAS}
  `;

  const { rows } = await client.query<AlumnoRow>(sql, [id]);
  return rows[0] ?? null;
}

/**
 * Obtiene los IDs de las materias de interés asignadas a un alumno.
 */
export async function obtenerMateriasInteresIdsDeAlumno(
  alumnoId: number,
  ejecutor: Ejecutor = pool,
): Promise<number[]> {
  const sql = `SELECT materia_id FROM alumno_materia_interes WHERE alumno_id = $1`;
  if ("query" in ejecutor && ejecutor !== pool) {
    const { rows } = await ejecutor.query<{ materia_id: number }>(sql, [alumnoId]);
    return rows.map((r) => r.materia_id);
  }
  const filas = await query<{ materia_id: number }>(sql, [alumnoId]);
  return filas.map((r) => r.materia_id);
}

/**
 * Obtiene las materias de interés detalladas (id y nombre) de un alumno.
 */
export async function materiasInteresDeAlumno(
  alumnoId: number,
  ejecutor: Ejecutor = pool,
): Promise<{ id: number; nombre: string }[]> {
  const sql = `
    SELECT m.id, m.nombre
    FROM alumno_materia_interes ami
    JOIN materia m ON m.id = ami.materia_id
    WHERE ami.alumno_id = $1
    ORDER BY m.nombre ASC
  `;
  if ("query" in ejecutor && ejecutor !== pool) {
    const { rows } = await ejecutor.query<{ id: number; nombre: string }>(sql, [alumnoId]);
    return rows;
  }
  return query<{ id: number; nombre: string }>(sql, [alumnoId]);
}

/**
 * Obtiene las materias de interés de múltiples alumnos sin N+1 (Receta 15).
 */
export async function materiasInteresDe(
  alumnoIds: number[],
  ejecutor: Ejecutor = pool,
): Promise<Map<number, { id: number; nombre: string }[]>> {
  const mapa = new Map<number, { id: number; nombre: string }[]>();
  if (alumnoIds.length === 0) return mapa;

  const sql = `
    SELECT ami.alumno_id, m.id, m.nombre
    FROM alumno_materia_interes ami
    JOIN materia m ON m.id = ami.materia_id
    WHERE ami.alumno_id = ANY($1::int[])
    ORDER BY m.nombre ASC
  `;

  let filas: { alumno_id: number; id: number; nombre: string }[];
  if ("query" in ejecutor && ejecutor !== pool) {
    const { rows } = await ejecutor.query<{ alumno_id: number; id: number; nombre: string }>(
      sql,
      [alumnoIds],
    );
    filas = rows;
  } else {
    filas = await query<{ alumno_id: number; id: number; nombre: string }>(sql, [alumnoIds]);
  }

  for (const fila of filas) {
    const actuales = mapa.get(fila.alumno_id) ?? [];
    actuales.push({ id: fila.id, nombre: fila.nombre });
    mapa.set(fila.alumno_id, actuales);
  }
  return mapa;
}

/**
 * Reemplaza completamente las materias de interés de un alumno (Receta 6).
 */
export async function reemplazarMateriasInteres(
  alumnoId: number,
  materiasIds: number[],
  client: PoolClient,
): Promise<void> {
  await client.query("DELETE FROM alumno_materia_interes WHERE alumno_id = $1", [alumnoId]);

  if (materiasIds.length === 0) return;

  await client.query(
    `INSERT INTO alumno_materia_interes (alumno_id, materia_id)
     SELECT $1, unnest($2::int[])`,
    [alumnoId, materiasIds],
  );
}

/**
 * Consulta materias por IDs para chequear cuáles existen y cuáles están activas.
 */
export async function consultarMateriasPorIds(
  materiaIds: number[],
  ejecutor: Ejecutor = pool,
): Promise<{ id: number; estado: string }[]> {
  if (materiaIds.length === 0) return [];
  const sql = `SELECT id, estado FROM materia WHERE id = ANY($1::int[])`;
  if ("query" in ejecutor && ejecutor !== pool) {
    const { rows } = await ejecutor.query<{ id: number; estado: string }>(sql, [materiaIds]);
    return rows;
  }
  return query<{ id: number; estado: string }>(sql, [materiaIds]);
}

/**
 * Cuenta turnos futuros reservados asociados a este alumno.
 * Se consideran futuros los turnos con fecha posterior a hoy, o de hoy con hora_inicio posterior a la hora actual.
 */
export async function contarTurnosFuturos(
  alumnoId: number,
  ejecutor: Ejecutor = pool,
): Promise<number> {
  const sql = `
    SELECT count(*)::text AS total
    FROM turno
    WHERE alumno_id = $1
      AND estado = 'Reservado'
      AND (
        fecha > (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
        OR (
          fecha = (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
          AND hora_inicio > (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::time
        )
      )
  `;

  if ("query" in ejecutor && ejecutor !== pool) {
    const { rows } = await ejecutor.query<{ total: string }>(sql, [alumnoId]);
    return Number(rows[0]?.total ?? 0);
  }
  const filas = await query<{ total: string }>(sql, [alumnoId]);
  return Number(filas[0]?.total ?? 0);
}

/**
 * Comprueba si un alumno tiene clases pasadas impagas (deuda pendiente).
 */
export async function tieneDeudaPendiente(
  alumnoId: number,
  ejecutor: Ejecutor = pool,
): Promise<boolean> {
  const sql = `
    SELECT EXISTS (
      SELECT 1 FROM turno
      WHERE alumno_id = $1
        AND pagado = false
        AND estado <> 'Cancelado'
        AND (
          fecha < (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
          OR (
            fecha = (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
            AND hora_inicio <= (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::time
          )
        )
    ) AS tiene_deuda
  `;

  if ("query" in ejecutor && ejecutor !== pool) {
    const { rows } = await ejecutor.query<{ tiene_deuda: boolean }>(sql, [alumnoId]);
    return Boolean(rows[0]?.tiene_deuda);
  }
  const filas = await query<{ tiene_deuda: boolean }>(sql, [alumnoId]);
  return Boolean(filas[0]?.tiene_deuda);
}

/**
 * Determina qué alumnos de una lista poseen deuda pendiente sin N+1 (Receta 15).
 */
export async function deudaPendienteDe(
  alumnoIds: number[],
  ejecutor: Ejecutor = pool,
): Promise<Set<number>> {
  const resultado = new Set<number>();
  if (alumnoIds.length === 0) return resultado;

  const sql = `
    SELECT DISTINCT alumno_id
    FROM turno
    WHERE alumno_id = ANY($1::int[])
      AND pagado = false
      AND estado <> 'Cancelado'
      AND (
        fecha < (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
        OR (
          fecha = (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
          AND hora_inicio <= (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::time
        )
      )
  `;

  let filas: { alumno_id: number }[];
  if ("query" in ejecutor && ejecutor !== pool) {
    const { rows } = await ejecutor.query<{ alumno_id: number }>(sql, [alumnoIds]);
    filas = rows;
  } else {
    filas = await query<{ alumno_id: number }>(sql, [alumnoIds]);
  }

  for (const fila of filas) {
    resultado.add(fila.alumno_id);
  }
  return resultado;
}
