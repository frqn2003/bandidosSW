import { withRoute, parseId } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import * as service from "@/modules/disponibilidad/disponibilidad.service";

// No hay DELETE a propósito: la baja es LÓGICA y va por
// POST o PATCH /api/disponibilidad/:id/inactivar (Manual §Receta 9).

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
