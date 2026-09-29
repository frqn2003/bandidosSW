import { withRoute, parseBody } from "@/lib/http/handler";
import { ok, created } from "@/lib/http/responses";
import { listarPagosQuery, crearPagoBody } from "@/contracts/pago";
import * as service from "@/modules/pagos/pago.service";

/**
 * GET  /api/pagos -> Historial de pagos (orden fecha descendente)
 * POST /api/pagos -> Registrar cobro de clases seleccionadas
 */
export const GET = withRoute(async ({ req, session }) => {
  const sp = new URL(req.url).searchParams;
  const raw: Record<string, string> = {};

  for (const [k, v] of sp.entries()) {
    if (v.trim() !== "") {
      raw[k] = v.trim();
    }
  }

  const filtros = listarPagosQuery.parse(raw);
  return ok(await service.listar(filtros, session));
});

export const POST = withRoute(async ({ req, session }) => {
  const input = await parseBody(req, crearPagoBody);
  return created(await service.registrarPago(input, session.usuarioId, session));
});
