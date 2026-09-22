import { withRoute, parseBody } from "@/lib/http/handler";
import { ok, created } from "@/lib/http/responses";
import { crearAlumnoBody, listarAlumnosQuery } from "@/contracts/alumno";
import * as service from "@/modules/alumnos/alumno.service";

export const GET = withRoute(async ({ req }) => {
  const sp = new URL(req.url).searchParams;
  const raw: Record<string, string> = {};

  const busqueda = sp.get("busqueda")?.trim();
  if (busqueda) raw.busqueda = busqueda;

  const nivelEducativo = sp.get("nivelEducativo")?.trim();
  if (nivelEducativo && nivelEducativo !== "Todos") raw.nivelEducativo = nivelEducativo;

  const estado = sp.get("estado")?.trim().toLowerCase();
  if (estado && estado !== "todos") raw.estado = estado;

  const filtros = listarAlumnosQuery.parse(raw);
  return ok(await service.listar(filtros));
});

export const POST = withRoute(async ({ req, session }) => {
  const input = await parseBody(req, crearAlumnoBody);
  return created(await service.crear(input, session.usuarioId));
});
