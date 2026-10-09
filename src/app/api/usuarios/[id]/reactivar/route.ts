import { withRoute, parseId } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import * as service from "@/modules/usuarios/usuario.service";

type Params = { id: string };

/**
 * POST /api/usuarios/:id/reactivar
 * Reactivación lógica de usuarios inactivos (criterio deseable HU-SIS-00).
 */
export const POST = withRoute<Params>(async ({ session, params }) => {
  const { id } = await params;
  return ok(await service.reactivar(parseId(id), session.usuarioId));
});
