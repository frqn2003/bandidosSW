import { withRoute } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import { listarClasesDelDiaQuery } from "@/contracts/asistencia";
import * as service from "@/modules/asistencia/asistencia.service";

export const GET = withRoute(async ({ req, session }) => {
  const sp = new URL(req.url).searchParams;
  const raw: Record<string, string> = {};

  const fecha = sp.get("fecha")?.trim();
  if (fecha) raw.fecha = fecha;

  const profesorId = sp.get("profesorId")?.trim();
  if (profesorId) raw.profesorId = profesorId;

  const filtros = listarClasesDelDiaQuery.parse(raw);
  return ok(await service.listarClasesDelDia(filtros, session));
});
