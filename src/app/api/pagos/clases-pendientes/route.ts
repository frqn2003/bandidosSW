import { withRoute } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import { clasesPendientesQuery } from "@/contracts/pago";
import * as service from "@/modules/pagos/pago.service";

/**
 * GET /api/pagos/clases-pendientes?alumnoId=:id -> Clases pasadas impagas del alumno
 */
export const GET = withRoute(async ({ req, session }) => {
  const sp = new URL(req.url).searchParams;
  const raw: Record<string, string> = {};

  for (const [k, v] of sp.entries()) {
    if (v.trim() !== "") {
      raw[k] = v.trim();
    }
  }

  const { alumnoId } = clasesPendientesQuery.parse(raw);
  return ok(await service.listarClasesPendientes(alumnoId, session));
});
