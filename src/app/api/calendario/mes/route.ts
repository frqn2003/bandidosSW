import { withRoute } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import { calendarioMesQuery } from "@/contracts/calendario";
import * as service from "@/modules/calendario/calendario.service";

export const GET = withRoute(async ({ req, session }) => {
  const sp = new URL(req.url).searchParams;
  const raw: Record<string, string> = {};

  for (const [k, v] of sp.entries()) {
    if (v.trim() !== "") {
      raw[k] = v.trim();
    }
  }

  const filtros = calendarioMesQuery.parse(raw);
  return ok(await service.resumenMes(filtros, session));
});
