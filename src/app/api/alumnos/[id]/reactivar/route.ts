import { withRoute, parseId } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import * as service from "@/modules/alumnos/alumno.service";

export const POST = withRoute<{ id: string }>(async ({ session, params }) => {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  return ok(await service.reactivar(id, session.usuarioId));
});
