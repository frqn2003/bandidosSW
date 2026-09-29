import { withRoute, parseId } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import * as service from "@/modules/pagos/pago.service";

/**
 * GET /api/pagos/:id -> Detalle del comprobante de pago emitido
 */
export const GET = withRoute<{ id: string }>(async ({ params, session }) => {
  const id = parseId((await params).id);
  return ok(await service.obtener(id, session));
});
