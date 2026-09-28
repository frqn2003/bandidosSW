import { withRoute } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import { huecosQuery } from "@/contracts/calendario";
import * as service from "@/modules/calendario/calendario.service";

export const GET = withRoute(async ({ req, session }) => {
  const sp = new URL(req.url).searchParams;
  const raw: Record<string, string> = {};

  const desde = sp.get("desde")?.trim();
  if (desde) raw.desde = desde;

  const hasta = sp.get("hasta")?.trim();
  if (hasta) raw.hasta = hasta;

  const profesorId = sp.get("profesorId")?.trim();
  if (profesorId) raw.profesorId = profesorId;

  const materiaId = sp.get("materiaId")?.trim();
  if (materiaId) raw.materiaId = materiaId;

  const duracionMinutos = sp.get("duracionMinutos")?.trim();
  if (duracionMinutos) raw.duracionMinutos = duracionMinutos;

  const filtros = huecosQuery.parse(raw);
  return ok(await service.huecos(filtros, session));
});
