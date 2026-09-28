import { withRoute, parseBody, parseId } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import { cancelarTurnoBody } from "@/contracts/turno";
import * as service from "@/modules/turnos/turno.service";

export const POST = withRoute<{ id: string }>(async ({ req, params, session }) => {
  const id = parseId((await params).id);
  const input = await parseBody(req, cancelarTurnoBody);
  return ok(await service.cancelar(id, input, session.usuarioId, session));
});
