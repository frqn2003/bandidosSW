import { withRoute, parseBody, parseId } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import { anularPagoBody } from "@/contracts/pago";
import * as service from "@/modules/pagos/pago.service";

/**
 * POST /api/pagos/:id/anular -> Anula un pago vigente (HU-PAG-02).
 * Un pago registrado no se modifica ni se borra: solo se anula.
 */
export const POST = withRoute<{ id: string }>(async ({ req, params, session }) => {
  const id = parseId((await params).id);
  const input = await parseBody(req, anularPagoBody).catch((e: unknown) => {
    throw service.motivoAnulacionRequerido(e);
  });
  return ok(await service.anular(id, input, session));
});
