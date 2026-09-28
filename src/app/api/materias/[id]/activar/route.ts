import { withRoute, parseId } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import * as service from "@/modules/materias/materia.service";

// Reactivación de materia: POST o PATCH /api/materias/:id/activar

export const PATCH = withRoute<{ id: string }>(async ({ session, params }) => {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  return ok(await service.activar(id, session.usuarioId));
});

export const POST = withRoute<{ id: string }>(async ({ session, params }) => {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  return ok(await service.activar(id, session.usuarioId));
});
