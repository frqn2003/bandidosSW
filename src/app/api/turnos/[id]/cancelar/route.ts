import { withRoute, parseId } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import * as service from "@/modules/turnos/turno.service";

export const POST = withRoute<{ id: string }>(async ({ params, session }) => {
  const id = parseId((await params).id);
  return ok(await service.cancelar(id, session.usuarioId, session));
});
