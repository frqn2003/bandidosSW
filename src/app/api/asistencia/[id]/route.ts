import { withRoute, parseBody, parseId } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import { corregirAsistenciaBody } from "@/contracts/asistencia";
import * as service from "@/modules/asistencia/asistencia.service";

export const PUT = withRoute<{ id: string }>(async ({ req, params, session }) => {
  const id = parseId((await params).id);
  const input = await parseBody(req, corregirAsistenciaBody);
  return ok(await service.corregir(id, input, session));
});
