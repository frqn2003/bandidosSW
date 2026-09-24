import type { Pool, PoolClient } from "pg";
import { pool, query } from "@/lib/db/client";
import { BusinessRuleError, ValidationError } from "@/lib/http/errors";
import type {
  ProfesorConUsuarioRow,
  ProfesorMateriaRow,
  UsuarioCandidatoRow,
  FiltrosProfesor,
  CrearProfesorInputDto,
  EditarProfesorInputDto,
} from "./profesor.types";
import type { MateriaDictadaBody } from "@/contracts/profesor";

type Ejecutor = Pool | PoolClient;

const COLUMNAS_PROFESOR = `
  p.id,
  p.usuario_id,
  p.titulo_especialidad,
  p.telefono,
  p.estado,
  p.created_at,
  p.updated_at,
  u.nombre AS usuario_nombre,
  u.apellido AS usuario_apellido,
  u.dni AS usuario_dni,
  u.email AS usuario_email,
  u.academia_id,
  a.nombre AS academia_nombre
`;

const FROM_PROFESOR = `
  FROM profesor p
  JOIN usuario u ON u.id = p.usuario_id
  LEFT JOIN academia a ON a.id = u.academia_id
`;

/**
 * Busca profesores con filtros dinámicos y orden Apellido, Nombre A-Z (§Receta 2).
 */
export async function findAll(
  filtros: FiltrosProfesor = {},
  ejecutor: Ejecutor = pool,
): Promise<ProfesorConUsuarioRow[]> {
  const condiciones: string[] = [];
  const params: unknown[] = [];

  if (filtros.busqueda) {
    params.push(`%${filtros.busqueda.trim()}%`);
    condiciones.push(`(
      u.nombre ILIKE $${params.length}
      OR u.apellido ILIKE $${params.length}
      OR u.dni ILIKE $${params.length}
      OR COALESCE(p.titulo_especialidad, '') ILIKE $${params.length}
    )`);
  }

  if (filtros.estado) {
    params.push(filtros.estado);
    condiciones.push(`p.estado = $${params.length}`);
  }

  if (filtros.academiaId) {
    params.push(filtros.academiaId);
    condiciones.push(`u.academia_id = $${params.length}`);
  }

  if (filtros.materiaId) {
    params.push(filtros.materiaId);
    condiciones.push(`EXISTS (
      SELECT 1 FROM profesor_materia pm
      WHERE pm.profesor_id = p.id AND pm.materia_id = $${params.length}
    )`);
  }

  if (filtros.diaSemana) {
    params.push(filtros.diaSemana);
    condiciones.push(`EXISTS (
      SELECT 1 FROM agenda_profesional ap
      JOIN agenda_semanal ags ON ags.id = ap.agenda_semanal_id
      WHERE ap.profesor_id = p.id
        AND ags.dia_semana = $${params.length}
        AND ap.estado = 'activo'
    )`);
  }

  if (filtros.usuarioId) {
    params.push(filtros.usuarioId);
    condiciones.push(`p.usuario_id = $${params.length}`);
  }

  const where = condiciones.length > 0 ? `WHERE ${condiciones.join(" AND ")}` : "";
  const sql = `
    SELECT ${COLUMNAS_PROFESOR}
    ${FROM_PROFESOR}
    ${where}
    ORDER BY u.apellido ASC, u.nombre ASC, p.id ASC
  `;

  if ("query" in ejecutor && ejecutor !== pool) {
    const { rows } = await ejecutor.query<ProfesorConUsuarioRow>(sql, params);
    return rows;
  }
  return query<ProfesorConUsuarioRow>(sql, params);
}

/**
 * Busca un profesor por su ID primario.
 */
export async function findById(
  id: number,
  ejecutor: Ejecutor = pool,
): Promise<ProfesorConUsuarioRow | null> {
  const sql = `
    SELECT ${COLUMNAS_PROFESOR}
    ${FROM_PROFESOR}
    WHERE p.id = $1
  `;

  if ("query" in ejecutor && ejecutor !== pool) {
    const { rows } = await ejecutor.query<ProfesorConUsuarioRow>(sql, [id]);
    return rows[0] ?? null;
  }
  const filas = await query<ProfesorConUsuarioRow>(sql, [id]);
  return filas[0] ?? null;
}

/**
 * Obtiene las materias dictadas por uno o más profesores sin N+1 (Receta 15).
 */
export async function findMateriasDeProfesores(
  profesorIds: number[],
  ejecutor: Ejecutor = pool,
): Promise<Map<number, ProfesorMateriaRow[]>> {
  const mapa = new Map<number, ProfesorMateriaRow[]>();
  if (profesorIds.length === 0) return mapa;

  const sql = `
    SELECT
      pm.id,
      pm.profesor_id,
      pm.materia_id,
      m.nombre AS materia_nombre,
      m.nivel AS materia_nivel,
      m.duracion_clase_minutos,
      pm.capacidad_maxima,
      COALESCE(pc.precio, 0)::text AS precio
    FROM profesor_materia pm
    JOIN materia m ON m.id = pm.materia_id
    LEFT JOIN LATERAL (
      SELECT precio
      FROM precio_clase
      WHERE profesor_materia_id = pm.id
      ORDER BY id DESC
      LIMIT 1
    ) pc ON true
    WHERE pm.profesor_id = ANY($1::int[])
    ORDER BY m.nombre ASC
  `;

  let rows: ProfesorMateriaRow[];
  if ("query" in ejecutor && ejecutor !== pool) {
    const res = await ejecutor.query<ProfesorMateriaRow>(sql, [profesorIds]);
    rows = res.rows;
  } else {
    rows = await query<ProfesorMateriaRow>(sql, [profesorIds]);
  }

  for (const id of profesorIds) {
    mapa.set(id, []);
  }
  for (const row of rows) {
    mapa.get(row.profesor_id)?.push(row);
  }

  return mapa;
}

/**
 * Consulta datos del usuario para validar antes de crear/asignar ficha.
 */
export async function buscarUsuario(
  usuarioId: number,
  ejecutor: Ejecutor = pool,
): Promise<{
  id: number;
  nombre: string;
  apellido: string;
  dni: string;
  email: string;
  estado: string;
  academia_id: number | null;
  rol_nombre: string;
} | null> {
  const sql = `
    SELECT u.id, u.nombre, u.apellido, u.dni, u.email, u.estado, u.academia_id, r.nombre AS rol_nombre
    FROM usuario u
    JOIN rol r ON r.id = u.rol_id
    WHERE u.id = $1
  `;

  if ("query" in ejecutor && ejecutor !== pool) {
    const { rows } = await ejecutor.query<{
      id: number;
      nombre: string;
      apellido: string;
      dni: string;
      email: string;
      estado: string;
      academia_id: number | null;
      rol_nombre: string;
    }>(sql, [usuarioId]);
    return rows[0] ?? null;
  }
  const filas = await query<{
    id: number;
    nombre: string;
    apellido: string;
    dni: string;
    email: string;
    estado: string;
    academia_id: number | null;
    rol_nombre: string;
  }>(sql, [usuarioId]);
  return filas[0] ?? null;
}

/**
 * Comprueba si ya existe una ficha de profesor para un usuario_id.
 */
export async function existeFichaDe(
  usuarioId: number,
  ejecutor: Ejecutor = pool,
): Promise<boolean> {
  const sql = `SELECT 1 FROM profesor WHERE usuario_id = $1 LIMIT 1`;
  if ("query" in ejecutor && ejecutor !== pool) {
    const { rows } = await ejecutor.query(sql, [usuarioId]);
    return rows.length > 0;
  }
  const filas = await query(sql, [usuarioId]);
  return filas.length > 0;
}

/**
 * Lista usuarios con rol "Profesor" activos y con academia que no tienen ficha de profesor aún.
 */
export async function findCandidatos(
  ejecutor: Ejecutor = pool,
): Promise<UsuarioCandidatoRow[]> {
  const sql = `
    SELECT
      u.id,
      u.nombre,
      u.apellido,
      u.dni,
      u.email,
      u.academia_id,
      a.nombre AS academia_nombre
    FROM usuario u
    JOIN rol r ON r.id = u.rol_id
    LEFT JOIN academia a ON a.id = u.academia_id
    WHERE LOWER(r.nombre) = 'profesor'
      AND u.estado = 'activo'
      AND u.academia_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM profesor p WHERE p.usuario_id = u.id
      )
    ORDER BY u.apellido ASC, u.nombre ASC
  `;

  if ("query" in ejecutor && ejecutor !== pool) {
    const { rows } = await ejecutor.query<UsuarioCandidatoRow>(sql);
    return rows;
  }
  return query<UsuarioCandidatoRow>(sql);
}

/**
 * ¿Hay un usuario ACTIVO con ese DNI o ese email? (alta rápida de candidato).
 * La base todavía no tiene los UNIQUE parciales de dni/email: este chequeo es
 * la única barrera, así que se corre dentro de la transacción del alta.
 */
export async function buscarUsuarioActivoDuplicado(
  dni: string,
  email: string,
  ejecutor: Ejecutor = pool,
): Promise<{ dni: string; email: string } | null> {
  const sql = `
    SELECT dni, email
    FROM usuario
    WHERE estado = 'activo' AND (dni = $1 OR lower(email) = lower($2))
    LIMIT 1
  `;
  const params = [dni, email];
  if ("query" in ejecutor && ejecutor !== pool) {
    const { rows } = await ejecutor.query<{ dni: string; email: string }>(sql, params);
    return rows[0] ?? null;
  }
  const filas = await query<{ dni: string; email: string }>(sql, params);
  return filas[0] ?? null;
}

/**
 * Inserta el usuario con rol Profesor y lo devuelve con la forma de candidato.
 * `rol_id` 2 = Profesor y `academia_id` 1 fijos hasta la HU de usuarios/academias.
 */
export async function insertUsuarioProfesor(
  datos: { nombre: string; apellido: string; dni: string; email: string; authId: string },
  client: PoolClient,
): Promise<UsuarioCandidatoRow> {
  const sql = `
    WITH nuevo AS (
      INSERT INTO usuario (rol_id, academia_id, nombre, apellido, dni, email, estado, auth_id, "cambiar_contraseña")
      VALUES (2, 1, $1, $2, $3, $4, 'activo', $5, true)
      RETURNING id, nombre, apellido, dni, email, academia_id
    )
    SELECT n.id, n.nombre, n.apellido, n.dni, n.email, n.academia_id, a.nombre AS academia_nombre
    FROM nuevo n
    LEFT JOIN academia a ON a.id = n.academia_id
  `;
  const { rows } = await client.query<UsuarioCandidatoRow>(sql, [
    datos.nombre,
    datos.apellido,
    datos.dni,
    datos.email,
    datos.authId,
  ]);
  return rows[0];
}

/**
 * Cuenta turnos futuros reservados para un profesor.
 */
export async function contarTurnosFuturos(
  profesorId: number,
  ejecutor: Ejecutor = pool,
): Promise<number> {
  const sql = `
    SELECT count(*)::text AS total
    FROM turno
    WHERE profesor_id = $1
      AND fecha >= CURRENT_DATE
      AND estado = 'Reservado'
  `;

  if ("query" in ejecutor && ejecutor !== pool) {
    const { rows } = await ejecutor.query<{ total: string }>(sql, [profesorId]);
    return Number(rows[0]?.total ?? 0);
  }
  const filas = await query<{ total: string }>(sql, [profesorId]);
  return Number(filas[0]?.total ?? 0);
}

/**
 * Cuenta turnos futuros reservados de un profesor para una materia específica.
 */
export async function contarTurnosFuturosMateria(
  profesorId: number,
  materiaId: number,
  ejecutor: Ejecutor = pool,
): Promise<number> {
  const sql = `
    SELECT count(*)::text AS total
    FROM turno
    WHERE profesor_id = $1
      AND materia_id = $2
      AND fecha >= CURRENT_DATE
      AND estado = 'Reservado'
  `;

  if ("query" in ejecutor && ejecutor !== pool) {
    const { rows } = await ejecutor.query<{ total: string }>(sql, [profesorId, materiaId]);
    return Number(rows[0]?.total ?? 0);
  }
  const filas = await query<{ total: string }>(sql, [profesorId, materiaId]);
  return Number(filas[0]?.total ?? 0);
}

/**
 * Cuenta bloques horarios semanales activos de un profesor.
 */
export async function contarBloquesActivos(
  profesorId: number,
  ejecutor: Ejecutor = pool,
): Promise<number> {
  const sql = `
    SELECT count(*)::text AS total
    FROM agenda_profesional
    WHERE profesor_id = $1
      AND estado = 'activo'
  `;

  if ("query" in ejecutor && ejecutor !== pool) {
    const { rows } = await ejecutor.query<{ total: string }>(sql, [profesorId]);
    return Number(rows[0]?.total ?? 0);
  }
  const filas = await query<{ total: string }>(sql, [profesorId]);
  return Number(filas[0]?.total ?? 0);
}

/**
 * Inserta la fila de profesor en la BD.
 */
export async function insert(
  data: CrearProfesorInputDto,
  client: PoolClient,
): Promise<ProfesorConUsuarioRow> {
  const sql = `
    INSERT INTO profesor (
      usuario_id,
      titulo_especialidad,
      telefono,
      estado
    )
    VALUES ($1, $2, $3, 'activo')
    RETURNING id
  `;

  const { rows } = await client.query<{ id: number }>(sql, [
    data.usuarioId,
    data.tituloEspecialidad ? data.tituloEspecialidad.trim() : null,
    data.telefono.trim(),
  ]);

  const inserted = await findById(rows[0].id, client);
  if (!inserted) {
    throw new Error("No se pudo recuperar el profesor recién creado.");
  }
  return inserted;
}

/**
 * Actualiza la información de la ficha de profesor.
 */
export async function update(
  id: number,
  data: EditarProfesorInputDto,
  client: PoolClient,
): Promise<ProfesorConUsuarioRow | null> {
  const sql = `
    UPDATE profesor
    SET titulo_especialidad = $1,
        telefono = $2,
        updated_at = now()
    WHERE id = $3
  `;

  await client.query(sql, [
    data.tituloEspecialidad ? data.tituloEspecialidad.trim() : null,
    data.telefono.trim(),
    id,
  ]);

  return findById(id, client);
}

/**
 * Baja lógica del profesor.
 */
export async function inactivar(
  id: number,
  client: PoolClient,
): Promise<ProfesorConUsuarioRow | null> {
  const sql = `
    UPDATE profesor
    SET estado = 'inactivo',
        updated_at = now()
    WHERE id = $1
  `;
  await client.query(sql, [id]);
  return findById(id, client);
}

/**
 * Reemplaza la lista completa de materias dictadas por el profesor (§Receta 6/8).
 * Valida que no se quiten materias con turnos futuros asignados.
 */
export async function reemplazarMaterias(
  profesorId: number,
  materiasInput: MateriaDictadaBody[],
  client: PoolClient,
): Promise<ProfesorMateriaRow[]> {
  // 1. Verificar que todas las materias a asignar existan y estén activas
  const materiaIds = materiasInput.map((m) => m.materiaId);
  const { rows: materiasDb } = await client.query<{ id: number; estado: string }>(
    `SELECT id, estado FROM materia WHERE id = ANY($1::int[])`,
    [materiaIds],
  );

  const materiasDbMap = new Map(materiasDb.map((m) => [m.id, m.estado]));
  for (const mid of materiaIds) {
    const estado = materiasDbMap.get(mid);
    if (!estado) {
      throw new ValidationError("REFERENCIA_INVALIDA", `La materia id ${mid} no existe.`, "materias");
    }
    if (estado !== "activo") {
      throw new ValidationError(
        "MATERIA_INACTIVA",
        `La materia id ${mid} está inactiva y no puede asignarse.`,
        "materias",
      );
    }
  }

  // 2. Obtener asignaciones actuales
  const { rows: actuales } = await client.query<{ id: number; materia_id: number }>(
    `SELECT id, materia_id FROM profesor_materia WHERE profesor_id = $1`,
    [profesorId],
  );

  const nuevasIds = new Set(materiaIds);

  // 3. Chequear si alguna materia a remover tiene turnos futuros
  for (const act of actuales) {
    if (!nuevasIds.has(act.materia_id)) {
      const turnosFuturos = await contarTurnosFuturosMateria(profesorId, act.materia_id, client);
      if (turnosFuturos > 0) {
        throw new BusinessRuleError(
          "MATERIA_CON_TURNOS_FUTUROS",
          `No se puede quitar una materia que tiene ${turnosFuturos} turno(s) futuro(s) reservado(s).`,
        );
      }
      // Eliminar precio_clase y profesor_materia
      await client.query(`DELETE FROM precio_clase WHERE profesor_materia_id = $1`, [act.id]);
      await client.query(`DELETE FROM profesor_materia WHERE id = $1`, [act.id]);
    }
  }

  // 4. Insertar o actualizar materias solicitadas
  for (const item of materiasInput) {
    const existente = actuales.find((a) => a.materia_id === item.materiaId);
    let profesorMateriaId: number;

    if (existente) {
      profesorMateriaId = existente.id;
      await client.query(
        `UPDATE profesor_materia SET capacidad_maxima = $1 WHERE id = $2`,
        [item.capacidadMaxima, profesorMateriaId],
      );
    } else {
      const { rows: pmRows } = await client.query<{ id: number }>(
        `INSERT INTO profesor_materia (profesor_id, materia_id, capacidad_maxima)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [profesorId, item.materiaId, item.capacidadMaxima],
      );
      profesorMateriaId = pmRows[0].id;
    }

    // Insertar nuevo registro de precio vigente
    await client.query(
      `INSERT INTO precio_clase (profesor_materia_id, precio) VALUES ($1, $2)`,
      [profesorMateriaId, item.precio],
    );
  }

  // 5. Devolver materias actualizadas
  const map = await findMateriasDeProfesores([profesorId], client);
  return map.get(profesorId) ?? [];
}
