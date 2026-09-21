import { withRoute, parseBody, parseId } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import { editarMateriaBody } from "@/contracts/materia";
import * as service from "@/modules/materias/materia.service";

export const GET = withRoute<{ id: string }>(async ({ params }) => {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  return ok(await service.obtener(id));
});

export const PUT = withRoute<{ id: string }>(async ({ req, session, params }) => {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  const input = await parseBody(req, editarMateriaBody);
  return ok(await service.editar(id, input, session.usuarioId));
});
