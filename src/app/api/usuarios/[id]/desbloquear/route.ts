import { withRoute, parseId } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import * as service from "@/modules/usuarios/usuario.service";

type Params = { id: string };

/**
 * POST /api/usuarios/:id/desbloquear
 * Desbloquea un usuario reseteando sus intentos fallidos y bloqueo por tiempo.
 */
export const POST = withRoute<Params>(async ({ session, params }) => {
  const { id } = await params;
  return ok(await service.desbloquear(parseId(id), session.usuarioId));
});
