import type { Pool, PoolClient } from "pg";
import { pool, query } from "@/lib/db/client";
import type { AgendaRow, FranjaRow } from "./agenda.types";

type Ejecutor = Pool | PoolClient;

export async function findAgendaPorAcademia(
  academiaId: number,
  ejecutor: Ejecutor = pool,
): Promise<AgendaRow | null> {
  const sql = `
    SELECT
      a.id,
      a.academia_id,
      ac.nombre AS academia_nombre,
      a.nombre,
      a.estado
    FROM agenda a
    JOIN academia ac ON ac.id = a.academia_id
    WHERE a.academia_id = $1
  `;

  if ("query" in ejecutor && ejecutor !== pool) {
    const { rows } = await ejecutor.query<AgendaRow>(sql, [academiaId]);
    return rows[0] ?? null;
  }
  const filas = await query<AgendaRow>(sql, [academiaId]);
  return filas[0] ?? null;
}

export async function findPrimeraAgendaActiva(
  ejecutor: Ejecutor = pool,
): Promise<AgendaRow | null> {
  const sql = `
    SELECT
      a.id,
      a.academia_id,
      ac.nombre AS academia_nombre,
      a.nombre,
      a.estado
    FROM agenda a
    JOIN academia ac ON ac.id = a.academia_id
    WHERE a.estado = 'activo'
    ORDER BY a.id ASC
    LIMIT 1
  `;

  if ("query" in ejecutor && ejecutor !== pool) {
    const { rows } = await ejecutor.query<AgendaRow>(sql);
    return rows[0] ?? null;
  }
  const filas = await query<AgendaRow>(sql);
  return filas[0] ?? null;
}

export async function findFranjas(
  agendaId: number,
  incluirInactivas = false,
  ejecutor: Ejecutor = pool,
): Promise<FranjaRow[]> {
  const condiciones = ["agenda_id = $1"];
  const params: unknown[] = [agendaId];

  if (!incluirInactivas) {
    condiciones.push("estado = 'activo'");
  }

  const sql = `
    SELECT
      id,
      agenda_id,
      dia_semana,
      hora_inicio::text AS hora_inicio,
      hora_fin::text AS hora_fin,
      estado
    FROM agenda_semanal
    WHERE ${condiciones.join(" AND ")}
    ORDER BY dia_semana ASC, hora_inicio ASC
  `;

  if ("query" in ejecutor && ejecutor !== pool) {
    const { rows } = await ejecutor.query<FranjaRow>(sql, params);
    return rows;
  }
  return query<FranjaRow>(sql, params);
}
