import { withRoute, parseId } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import * as service from "@/modules/profesores/profesor.service";

// No hay DELETE a propósito: la baja es LÓGICA y va por
// POST o PATCH /api/profesores/:id/inactivar (criterio HU-PRO-01 / Manual §Receta 9).

export const PATCH = withRoute<{ id: string }>(async ({ session, params }) => {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  return ok(await service.inactivar(id, session.usuarioId));
});

export const POST = withRoute<{ id: string }>(async ({ session, params }) => {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  return ok(await service.inactivar(id, session.usuarioId));
});
