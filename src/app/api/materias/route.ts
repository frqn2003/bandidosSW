import { withRoute, parseBody } from "@/lib/http/handler";
import { ok, created } from "@/lib/http/responses";
import { crearMateriaBody, listarMateriasQuery } from "@/contracts/materia";
import * as service from "@/modules/materias/materia.service";

export const GET = withRoute(async ({ req }) => {
  const sp = new URL(req.url).searchParams;
  const raw: Record<string, string> = {};

  const busqueda = sp.get("busqueda")?.trim();
  if (busqueda) raw.busqueda = busqueda;

  const nivel = sp.get("nivel")?.trim();
  if (nivel && nivel !== "Todos") raw.nivel = nivel;

  const estado = sp.get("estado")?.trim().toLowerCase();
  if (estado && estado !== "todos") raw.estado = estado;

  const filtros = listarMateriasQuery.parse(raw);
  return ok(await service.listar(filtros));
});

export const POST = withRoute(async ({ req, session }) => {
  const input = await parseBody(req, crearMateriaBody);
  return created(await service.crear(input, session.usuarioId));
});
