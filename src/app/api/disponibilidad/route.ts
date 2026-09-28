import { withRoute, parseBody } from "@/lib/http/handler";
import { ok, created } from "@/lib/http/responses";
import { crearBloqueBody, listarDisponibilidadQuery } from "@/contracts/disponibilidad";
import * as service from "@/modules/disponibilidad/disponibilidad.service";

export const GET = withRoute(async ({ req }) => {
  const sp = new URL(req.url).searchParams;
  const raw: Record<string, string> = {};

  const profesorId = sp.get("profesorId")?.trim();
  if (profesorId) raw.profesorId = profesorId;

  const diaSemana = sp.get("diaSemana")?.trim();
  if (diaSemana) raw.diaSemana = diaSemana;

  const estado = sp.get("estado")?.trim().toLowerCase();
  if (estado && estado !== "todos") raw.estado = estado;

  const filtros = listarDisponibilidadQuery.parse(raw);
  return ok(await service.listar(filtros));
});

export const POST = withRoute(async ({ req, session }) => {
  const input = await parseBody(req, crearBloqueBody);
  return created(await service.crear(input, session.usuarioId));
});
