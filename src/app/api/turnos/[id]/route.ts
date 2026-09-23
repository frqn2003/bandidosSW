import { withRoute, parseBody, parseId } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import { editarTurnoBody } from "@/contracts/turno";
import * as service from "@/modules/turnos/turno.service";

export const GET = withRoute<{ id: string }>(async ({ params, session }) => {
  const id = parseId((await params).id);
  return ok(await service.obtener(id, session));
});

export const PUT = withRoute<{ id: string }>(async ({ req, params, session }) => {
  const id = parseId((await params).id);
  const input = await parseBody(req, editarTurnoBody);
  return ok(await service.reprogramar(id, input, session.usuarioId, session));
});
