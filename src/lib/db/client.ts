import { Pool } from "pg";

/**
 * Pool de conexiones a Postgres.
 *
 * Se guarda en globalThis porque en `next dev` el hot reload vuelve a evaluar
 * este módulo en cada cambio: sin esto quedarían pools huérfanos abiertos hasta
 * agotar las conexiones de la base.
 */

declare global {
  var __huellitasPool: Pool | undefined;
}

function crearPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "Falta DATABASE_URL. Copiá .env.example a .env.local (ver docs/backend/GUIA-IMPLEMENTACION.md §4).",
    );
  }

  const p = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
  });

  // Maneja conexiones inactivas cerradas remotamente por Supabase pooler sin romper el proceso
  p.on("error", (err) => {
    console.warn("[db] conexión inactiva del pool cerrada remotamente:", err.message);
  });

  return p;
}

export const pool: Pool = globalThis.__huellitasPool ?? crearPool();

if (process.env.NODE_ENV !== "production") {
  globalThis.__huellitasPool = pool;
}

function esErrorConexion(e: unknown): boolean {
  if (typeof e !== "object" || e === null) return false;
  const msg = "message" in e && typeof e.message === "string" ? e.message : "";
  const code = "code" in e && typeof e.code === "string" ? e.code : "";
  return (
    code === "ECONNRESET" ||
    code === "57P01" ||
    code === "EPIPE" ||
    code === "ETIMEDOUT" ||
    msg.includes("read ECONNRESET") ||
    msg.includes("Connection terminated unexpectedly")
  );
}

/**
 * Query suelta, fuera de transacción. Para lecturas simples.
 * Las escrituras van SIEMPRE por withTransaction().
 * Si la conexión del pool fue reseteada por inactividad, reintenta automáticamente una vez.
 */
export async function query<T extends Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  try {
    const { rows } = await pool.query(sql, params);
    return rows as T[];
  } catch (err) {
    if (esErrorConexion(err)) {
      console.warn("[db] reintentando consulta tras reconexión:", (err as Error).message);
      const { rows } = await pool.query(sql, params);
      return rows as T[];
    }
    throw err;
  }
}
