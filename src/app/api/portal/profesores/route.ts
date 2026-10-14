import { withRoute } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import { profesoresPortalQuery } from "@/contracts/portal";
import * as service from "@/modules/portal/portal.service";

/** GET /api/portal/profesores?materiaId= -> Profesores que dictan la materia (combo). */
export const GET = withRoute(async ({ req, session }) => {
  const sp = new URL(req.url).searchParams;
  const raw: Record<string, string> = {};
  const materiaId = sp.get("materiaId")?.trim();
  if (materiaId) raw.materiaId = materiaId;

  const { materiaId: id } = profesoresPortalQuery.parse(raw);
  return ok(await service.profesores(id, session));
});
