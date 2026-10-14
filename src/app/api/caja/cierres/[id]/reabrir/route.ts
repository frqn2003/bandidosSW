import { withRoute, parseBody, parseId } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import { reabrirCajaBody } from "@/contracts/caja";
import * as service from "@/modules/caja/caja.service";

/** POST /api/caja/cierres/:id/reabrir -> Reabrir una caja cerrada (solo Gerente, con motivo). */
export const POST = withRoute<{ id: string }>(async ({ req, params, session }) => {
  const id = parseId((await params).id);
  const input = await parseBody(req, reabrirCajaBody).catch((e: unknown) => {
    throw service.motivoReaperturaRequerido(e);
  });
  return ok(await service.reabrir(id, input, session));
});
