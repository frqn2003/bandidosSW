import type { Pool, PoolClient } from "pg";
import { pool, query } from "@/lib/db/client";
import type {
  TurnoDetalleRow,
  ProfesorMateriaInfo,
  FiltrosTurno,
  CrearTurnoInputDto,
} from "./turno.types";

type Ejecutor = Pool | PoolClient;

const COLUMNAS_TURNO = `
  t.id,
  t.codigo,
  t.alumno_id,
  a.legajo AS alumno_legajo,
  a.nombre AS alumno_nombre,
  a.apellido AS alumno_apellido,
  t.profesor_id,
  up.nombre AS profesor_nombre,
  up.apellido AS profesor_apellido,
  t.materia_id,
  m.nombre AS materia_nombre,
  m.nivel AS materia_nivel,
  m.duracion_clase_minutos,
  t.fecha::text AS fecha,
  t.hora_inicio::text AS hora_inicio,
  t.hora_fin::text AS hora_fin,
  t.valor_clase_congelado::text AS valor_clase_congelado,
  t.estado,
  t.observaciones,
  t.usuario_id,
  ur.nombre AS usuario_nombre,
  ur.apellido AS usuario_apellido,
  t.created_at
`;

const FROM_TURNO = `
  FROM turno t
  JOIN alumno a ON a.id = t.alumno_id
  JOIN profesor p ON p.id = t.profesor_id
  JOIN usuario up ON up.id = p.usuario_id
  JOIN materia m ON m.id = t.materia_id
  JOIN usuario ur ON ur.id = t.usuario_id
`;

export async function findAll(
  filtros: FiltrosTurno = {},
  ejecutor: Ejecutor = pool,
): Promise<TurnoDetalleRow[]> {
  const condiciones: string[] = [];
  const params: unknown[] = [];

  if (filtros.busqueda) {
    params.push(`%${filtros.busqueda.trim()}%`);
    const p = `$${params.length}`;
    condiciones.push(`(
      t.codigo ILIKE ${p}
      OR a.legajo ILIKE ${p}
      OR a.apellido ILIKE ${p}
      OR a.nombre ILIKE ${p}
    )`);
  }

  if (filtros.alumnoId !== undefined) {
    params.push(filtros.alumnoId);
    condiciones.push(`t.alumno_id = $${params.length}`);
  }

  if (filtros.profesorId !== undefined) {
    params.push(filtros.profesorId);
    condiciones.push(`t.profesor_id = $${params.length}`);
  }

  if (filtros.materiaId !== undefined) {
    params.push(filtros.materiaId);
    condiciones.push(`t.materia_id = $${params.length}`);
  }

  if (filtros.estado) {
    params.push(filtros.estado);
    condiciones.push(`t.estado = $${params.length}`);
  }

  if (filtros.desde) {
    params.push(filtros.desde);
    condiciones.push(`t.fecha >= $${params.length}::date`);
  }

  if (filtros.hasta) {
    params.push(filtros.hasta);
    condiciones.push(`t.fecha <= $${params.length}::date`);
  }

  const where = condiciones.length > 0 ? `WHERE ${condiciones.join(" AND ")}` : "";
  const sql = `
    SELECT ${COLUMNAS_TURNO}
    ${FROM_TURNO}
    ${where}
    ORDER BY t.fecha ASC, t.hora_inicio ASC, t.id ASC
  `;

  if ("query" in ejecutor && ejecutor !== pool) {
    const { rows } = await ejecutor.query<TurnoDetalleRow>(sql, params);
    return rows;
  }
  return query<TurnoDetalleRow>(sql, params);
}

export async function findById(
  id: number,
  ejecutor: Ejecutor = pool,
): Promise<TurnoDetalleRow | null> {
  const sql = `
    SELECT ${COLUMNAS_TURNO}
    ${FROM_TURNO}
    WHERE t.id = $1
  `;

  if ("query" in ejecutor && ejecutor !== pool) {
    const { rows } = await ejecutor.query<TurnoDetalleRow>(sql, [id]);
    return rows[0] ?? null;
  }
  const filas = await query<TurnoDetalleRow>(sql, [id]);
  return filas[0] ?? null;
}

export async function buscarProfesorMateria(
  profesorId: number,
  materiaId: number,
  ejecutor: Ejecutor = pool,
): Promise<ProfesorMateriaInfo | null> {
  const sql = `
    SELECT
      pm.id,
      pm.profesor_id,
      pm.materia_id,
      m.duracion_clase_minutos,
      pm.capacidad_maxima
    FROM profesor_materia pm
    JOIN materia m ON m.id = pm.materia_id
    WHERE pm.profesor_id = $1 AND pm.materia_id = $2
  `;

  if ("query" in ejecutor && ejecutor !== pool) {
    const { rows } = await ejecutor.query<ProfesorMateriaInfo>(sql, [profesorId, materiaId]);
    return rows[0] ?? null;
  }
  const filas = await query<ProfesorMateriaInfo>(sql, [profesorId, materiaId]);
  return filas[0] ?? null;
}

export async function precioVigente(
  profesorMateriaId: number,
  ejecutor: Ejecutor = pool,
): Promise<number | null> {
  const sql = `
    SELECT precio
    FROM precio_clase
    WHERE profesor_materia_id = $1
    ORDER BY id DESC
    LIMIT 1
  `;

  if ("query" in ejecutor && ejecutor !== pool) {
    const { rows } = await ejecutor.query<{ precio: string }>(sql, [profesorMateriaId]);
    return rows[0] ? Number(rows[0].precio) : null;
  }
  const filas = await query<{ precio: string }>(sql, [profesorMateriaId]);
  return filas[0] ? Number(filas[0].precio) : null;
}

export async function hayDisponibilidad(
  profesorId: number,
  fecha: string,
  horaInicio: string,
  horaFin: string,
  ejecutor: Ejecutor = pool,
): Promise<boolean> {
  const sql = `
    SELECT 1
    FROM agenda_profesional ap
    JOIN agenda_semanal ags ON ags.id = ap.agenda_semanal_id
    WHERE ap.profesor_id = $1
      AND ags.dia_semana = EXTRACT(isodow FROM $2::date)
      AND ap.estado = 'activo'
      AND ags.estado = 'activo'
      AND ap.hora_inicio <= $3::time
      AND ap.hora_fin >= $4::time
    LIMIT 1
  `;

  const params = [profesorId, fecha, horaInicio, horaFin];
  if ("query" in ejecutor && ejecutor !== pool) {
    const { rows } = await ejecutor.query(sql, params);
    return rows.length > 0;
  }
  const filas = await query(sql, params);
  return filas.length > 0;
}

export async function contarOcupadosBloqueando(
  profesorId: number,
  fecha: string,
  horaInicio: string,
  horaFin: string,
  client: PoolClient,
  excluirTurnoId?: number,
): Promise<number> {
  // Lock del profesor para serializar reservas concurrentes
  await client.query("SELECT id FROM profesor WHERE id = $1 FOR UPDATE", [profesorId]);

  let sql = `
    SELECT count(*)::text AS total
    FROM turno
    WHERE profesor_id = $1
      AND fecha = $2::date
      AND estado = 'Reservado'
      AND hora_inicio < $4::time
      AND hora_fin > $3::time
  `;
  const params: unknown[] = [profesorId, fecha, horaInicio, horaFin];

  if (excluirTurnoId !== undefined) {
    params.push(excluirTurnoId);
    sql += ` AND id <> $${params.length}`;
  }

  const { rows } = await client.query<{ total: string }>(sql, params);
  return Number(rows[0]?.total ?? 0);
}

export async function buscarEstadoEntidades(
  alumnoId: number,
  profesorId: number,
  materiaId: number,
  ejecutor: Ejecutor = pool,
): Promise<{
  alumnoEstado: string | null;
  profesorEstado: string | null;
  materiaEstado: string | null;
}> {
  const sql = `
    SELECT
      (SELECT estado FROM alumno WHERE id = $1) AS alumno_estado,
      (SELECT estado FROM profesor WHERE id = $2) AS profesor_estado,
      (SELECT estado FROM materia WHERE id = $3) AS materia_estado
  `;

  const params = [alumnoId, profesorId, materiaId];
  if ("query" in ejecutor && ejecutor !== pool) {
    const { rows } = await ejecutor.query<{
      alumno_estado: string | null;
      profesor_estado: string | null;
      materia_estado: string | null;
    }>(sql, params);
    return {
      alumnoEstado: rows[0]?.alumno_estado ?? null,
      profesorEstado: rows[0]?.profesor_estado ?? null,
      materiaEstado: rows[0]?.materia_estado ?? null,
    };
  }
  const filas = await query<{
    alumno_estado: string | null;
    profesor_estado: string | null;
    materia_estado: string | null;
  }>(sql, params);
  return {
    alumnoEstado: filas[0]?.alumno_estado ?? null,
    profesorEstado: filas[0]?.profesor_estado ?? null,
    materiaEstado: filas[0]?.materia_estado ?? null,
  };
}

export async function insert(
  data: CrearTurnoInputDto & { horaFin: string; valorClaseCongelado: number },
  usuarioId: number,
  client: PoolClient,
): Promise<TurnoDetalleRow> {
  const insertSql = `
    INSERT INTO turno (
      alumno_id,
      profesor_id,
      materia_id,
      fecha,
      hora_inicio,
      hora_fin,
      valor_clase_congelado,
      estado,
      observaciones,
      usuario_id
    )
    VALUES ($1, $2, $3, $4::date, $5::time, $6::time, $7, 'Reservado', $8, $9)
    RETURNING id
  `;

  const { rows: inserted } = await client.query<{ id: number }>(insertSql, [
    data.alumnoId,
    data.profesorId,
    data.materiaId,
    data.fecha,
    data.horaInicio,
    data.horaFin,
    data.valorClaseCongelado,
    data.observaciones ? data.observaciones.trim() : null,
    usuarioId,
  ]);

  const nuevoId = inserted[0].id;
  const row = await findById(nuevoId, client);
  if (!row) {
    throw new Error("No se pudo recuperar el turno recién creado.");
  }
  return row;
}

export async function updateReprogramar(
  id: number,
  fecha: string,
  horaInicio: string,
  horaFin: string,
  observaciones: string | null,
  client: PoolClient,
): Promise<TurnoDetalleRow> {
  await client.query(
    `UPDATE turno
     SET fecha = $2::date,
         hora_inicio = $3::time,
         hora_fin = $4::time,
         observaciones = $5
     WHERE id = $1`,
    [id, fecha, horaInicio, horaFin, observaciones ? observaciones.trim() : null],
  );

  const row = await findById(id, client);
  if (!row) {
    throw new Error("No se pudo recuperar el turno reprogramado.");
  }
  return row;
}

export async function cancelar(
  id: number,
  client: PoolClient,
): Promise<TurnoDetalleRow> {
  await client.query(
    `UPDATE turno SET estado = 'Cancelado' WHERE id = $1`,
    [id],
  );

  const row = await findById(id, client);
  if (!row) {
    throw new Error("No se pudo recuperar el turno cancelado.");
  }
  return row;
}

export async function obtenerProfesorPorUsuarioId(
  usuarioId: number,
  ejecutor: Ejecutor = pool,
): Promise<{ id: number; nombre: string; apellido: string } | null> {
  const sql = `
    SELECT p.id, u.nombre, u.apellido
    FROM profesor p
    JOIN usuario u ON u.id = p.usuario_id
    WHERE p.usuario_id = $1
  `;
  if ("query" in ejecutor && ejecutor !== pool) {
    const { rows } = await ejecutor.query<{ id: number; nombre: string; apellido: string }>(sql, [usuarioId]);
    return rows[0] ?? null;
  }
  const filas = await query<{ id: number; nombre: string; apellido: string }>(sql, [usuarioId]);
  return filas[0] ?? null;
}

