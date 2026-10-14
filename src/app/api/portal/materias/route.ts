import { withRoute } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import * as service from "@/modules/portal/portal.service";

/** GET /api/portal/materias -> Materias que el alumno puede reservar (combo). */
export const GET = withRoute(async ({ session }) => {
  return ok(await service.materias(session));
});
