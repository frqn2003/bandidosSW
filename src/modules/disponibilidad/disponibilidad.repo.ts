import type { Pool, PoolClient } from "pg";
import { pool, query } from "@/lib/db/client";
import type {
  BloqueRow,
  FranjaAtencionRow,
  FiltrosDisponibilidad,
  CrearBloqueInputDto,
  EditarBloqueInputDto,
} from "./disponibilidad.types";

type Ejecutor = Pool | PoolClient;

const COLUMNAS_BLOQUE = `
  ap.id,
  ap.profesor_id,
  u.nombre AS profesor_nombre,
  u.apellido AS profesor_apellido,
  ap.agenda_semanal_id,
  ags.dia_semana,
  ap.hora_inicio::text AS hora_inicio,
  ap.hora_fin::text AS hora_fin,
  ags.hora_inicio::text AS franja_hora_inicio,
  ags.hora_fin::text AS franja_hora_fin,
  ap.estado
`;

const FROM_BLOQUE = `
  FROM agenda_profesional ap
  JOIN profesor p ON p.id = ap.profesor_id
  JOIN usuario u ON u.id = p.usuario_id
  JOIN agenda_semanal ags ON ags.id = ap.agenda_semanal_id
`;

/**
 * Lista los bloques de disponibilidad filtrados (§Receta 2).
 */
export async function findAll(
  filtros: FiltrosDisponibilidad,
  ejecutor: Ejecutor = pool,
): Promise<BloqueRow[]> {
  const condiciones: string[] = [];
  const params: unknown[] = [];

  params.push(filtros.profesorId);
  condiciones.push(`ap.profesor_id = $${params.length}`);

  if (filtros.diaSemana !== undefined) {
    params.push(filtros.diaSemana);
    condiciones.push(`ags.dia_semana = $${params.length}`);
  }

  if (filtros.estado) {
    params.push(filtros.estado);
    condiciones.push(`ap.estado = $${params.length}`);
  }

  const where = `WHERE ${condiciones.join(" AND ")}`;
  const sql = `
    SELECT ${COLUMNAS_BLOQUE}
    ${FROM_BLOQUE}
    ${where}
    ORDER BY ags.dia_semana ASC, ap.hora_inicio ASC, ap.id ASC
  `;

  if ("query" in ejecutor && ejecutor !== pool) {
    const { rows } = await ejecutor.query<BloqueRow>(sql, params);
    return rows;
  }
  return query<BloqueRow>(sql, params);
}

/**
 * Busca un bloque horario por su ID primario.
 */
export async function findById(
  id: number,
  ejecutor: Ejecutor = pool,
): Promise<BloqueRow | null> {
  const sql = `
    SELECT ${COLUMNAS_BLOQUE}
    ${FROM_BLOQUE}
    WHERE ap.id = $1
  `;

  if ("query" in ejecutor && ejecutor !== pool) {
    const { rows } = await ejecutor.query<BloqueRow>(sql, [id]);
    return rows[0] ?? null;
  }
  const filas = await query<BloqueRow>(sql, [id]);
  return filas[0] ?? null;
}

/**
 * Consulta la franja horaria de atención de la sede a la que pertenece el bloque.
 */
export async function buscarFranja(
  agendaSemanalId: number,
  ejecutor: Ejecutor = pool,
): Promise<FranjaAtencionRow | null> {
  const sql = `
    SELECT
      ags.id,
      ags.agenda_id,
      a.academia_id,
      ags.dia_semana,
      ags.hora_inicio::text AS hora_inicio,
      ags.hora_fin::text AS hora_fin,
      ags.estado
    FROM agenda_semanal ags
    JOIN agenda a ON a.id = ags.agenda_id
    WHERE ags.id = $1
  `;

  if ("query" in ejecutor && ejecutor !== pool) {
    const { rows } = await ejecutor.query<FranjaAtencionRow>(sql, [agendaSemanalId]);
    return rows[0] ?? null;
  }
  const filas = await query<FranjaAtencionRow>(sql, [agendaSemanalId]);
  return filas[0] ?? null;
}

/**
 * Busca franjas activas de una academia para un día de la semana.
 */
export async function buscarFranjaDeAcademiaPorDia(
  academiaId: number,
  diaSemana: number,
  ejecutor: Ejecutor = pool,
): Promise<FranjaAtencionRow | null> {
  const sql = `
    SELECT
      ags.id,
      ags.agenda_id,
      a.academia_id,
      ags.dia_semana,
      ags.hora_inicio::text AS hora_inicio,
      ags.hora_fin::text AS hora_fin,
      ags.estado
    FROM agenda_semanal ags
    JOIN agenda a ON a.id = ags.agenda_id
    WHERE a.academia_id = $1
      AND ags.dia_semana = $2
      AND ags.estado = 'activo'
    LIMIT 1
  `;

  if ("query" in ejecutor && ejecutor !== pool) {
    const { rows } = await ejecutor.query<FranjaAtencionRow>(sql, [academiaId, diaSemana]);
    return rows[0] ?? null;
  }
  const filas = await query<FranjaAtencionRow>(sql, [academiaId, diaSemana]);
  return filas[0] ?? null;
}

/**
 * Cuenta turnos futuros reservados que quedarían desprotegidos al dar de baja o achicar un bloque.
 */
export async function contarTurnosFuturosBloque(
  bloqueId: number,
  nuevaHoraInicio?: string,
  nuevaHoraFin?: string,
  ejecutor: Ejecutor = pool,
): Promise<number> {
  let sql: string;
  let params: unknown[];

  if (nuevaHoraInicio && nuevaHoraFin) {
    // Caso achicar/editar: busca turnos reservados que queden fuera del nuevo rango
    sql = `
      SELECT count(*)::text AS total
      FROM turno t
      JOIN agenda_profesional ap ON ap.profesor_id = t.profesor_id
      JOIN agenda_semanal ags ON ags.id = ap.agenda_semanal_id
      WHERE ap.id = $1
        AND t.fecha >= CURRENT_DATE
        AND t.estado = 'Reservado'
        AND EXTRACT(ISODOW FROM t.fecha) = ags.dia_semana
        AND t.hora_inicio >= ap.hora_inicio
        AND t.hora_fin <= ap.hora_fin
        AND (t.hora_inicio < $2::time OR t.hora_fin > $3::time)
    `;
    params = [bloqueId, nuevaHoraInicio, nuevaHoraFin];
  } else {
    // Caso baja/inactivación: busca todos los turnos reservados comprendidos en el bloque
    sql = `
      SELECT count(*)::text AS total
      FROM turno t
      JOIN agenda_profesional ap ON ap.profesor_id = t.profesor_id
      JOIN agenda_semanal ags ON ags.id = ap.agenda_semanal_id
      WHERE ap.id = $1
        AND t.fecha >= CURRENT_DATE
        AND t.estado = 'Reservado'
        AND EXTRACT(ISODOW FROM t.fecha) = ags.dia_semana
        AND t.hora_inicio < ap.hora_fin
        AND t.hora_fin > ap.hora_inicio
    `;
    params = [bloqueId];
  }

  if ("query" in ejecutor && ejecutor !== pool) {
    const { rows } = await ejecutor.query<{ total: string }>(sql, params);
    return Number(rows[0]?.total ?? 0);
  }
  const filas = await query<{ total: string }>(sql, params);
  return Number(filas[0]?.total ?? 0);
}

/**
 * Inserta un bloque horario en `agenda_profesional`.
 */
export async function insert(
  data: CrearBloqueInputDto,
  client: PoolClient,
): Promise<BloqueRow> {
  const sql = `
    INSERT INTO agenda_profesional (
      profesor_id,
      agenda_semanal_id,
      hora_inicio,
      hora_fin,
      estado
    )
    VALUES ($1, $2, $3::time, $4::time, 'activo')
    RETURNING id
  `;

  const { rows } = await client.query<{ id: number }>(sql, [
    data.profesorId,
    data.agendaSemanalId,
    data.horaInicio,
    data.horaFin,
  ]);

  const inserted = await findById(rows[0].id, client);
  if (!inserted) {
    throw new Error("No se pudo recuperar el bloque recién insertado.");
  }
  return inserted;
}

/**
 * Actualiza un bloque horario existente.
 */
export async function update(
  id: number,
  data: EditarBloqueInputDto,
  client: PoolClient,
): Promise<BloqueRow | null> {
  const sql = `
    UPDATE agenda_profesional
    SET agenda_semanal_id = $1,
        hora_inicio = $2::time,
        hora_fin = $3::time
    WHERE id = $4
    RETURNING id
  `;

  await client.query(sql, [
    data.agendaSemanalId,
    data.horaInicio,
    data.horaFin,
    id,
  ]);

  return findById(id, client);
}

/**
 * Inactiva un bloque de disponibilidad (baja lógica).
 */
export async function inactivar(
  id: number,
  client: PoolClient,
): Promise<BloqueRow | null> {
  const sql = `
    UPDATE agenda_profesional
    SET estado = 'inactivo'
    WHERE id = $1
    RETURNING id
  `;

  await client.query(sql, [id]);
  return findById(id, client);
}
