import { withRoute } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import { verAgendaQuery } from "@/contracts/agenda";
import * as service from "@/modules/agenda/agenda.service";

export const GET = withRoute(async ({ req }) => {
  const sp = new URL(req.url).searchParams;
  const raw: Record<string, string> = {};

  const academiaId = sp.get("academiaId")?.trim();
  if (academiaId) raw.academiaId = academiaId;

  const incluirInactivas = sp.get("incluirInactivas")?.trim();
  if (incluirInactivas) raw.incluirInactivas = incluirInactivas;

  if (raw.academiaId) {
    const filtros = verAgendaQuery.parse(raw);
    return ok(await service.verPorAcademia(filtros.academiaId, filtros.incluirInactivas ?? false));
  }

  const incluir = incluirInactivas === "true";
  return ok(await service.verAgendaDefault(incluir));
});
