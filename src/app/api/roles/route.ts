import { withRoute } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import { query } from "@/lib/db/client";
import type { RolResponse } from "@/contracts/rol";

/**
 * GET /api/roles
 * Catálogo de solo lectura para poblar el combo de roles en el alta y edición de usuarios (§Receta 1).
 */
export const GET = withRoute(async () => {
  const filas = await query<RolResponse>(
    "SELECT id, nombre FROM rol ORDER BY id ASC",
  );
  return ok(filas);
});
