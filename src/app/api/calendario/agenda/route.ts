import { withRoute } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import { agendaDiaQuery } from "@/contracts/calendario";
import * as service from "@/modules/calendario/calendario.service";

export const GET = withRoute(async ({ req, session }) => {
  const sp = new URL(req.url).searchParams;
  const raw: Record<string, string> = {};

  const profesorId = sp.get("profesorId")?.trim();
  if (profesorId) raw.profesorId = profesorId;

  const fecha = sp.get("fecha")?.trim();
  if (fecha) raw.fecha = fecha;

  const filtros = agendaDiaQuery.parse(raw);
  return ok(await service.agendaDelDia(filtros.profesorId, filtros.fecha, session));
});
