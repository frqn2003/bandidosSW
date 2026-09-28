import { withRoute, parseBody, parseId } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import { inactivarUsuarioBody } from "@/contracts/usuario";
import * as service from "@/modules/usuarios/usuario.service";

type Params = { id: string };

/**
 * POST /api/usuarios/:id/inactivar
 * Ejecuta la baja lógica obligatoria con motivo de baja.
 */
export const POST = withRoute<Params>(async ({ req, session, params }) => {
  const { id } = await params;
  const input = await parseBody(req, inactivarUsuarioBody);
  return ok(await service.inactivar(parseId(id), input, session.usuarioId));
});
