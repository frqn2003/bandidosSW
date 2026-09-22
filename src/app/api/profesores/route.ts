import { withRoute, parseBody } from "@/lib/http/handler";
import { ok, created } from "@/lib/http/responses";
import { crearProfesorBody, listarProfesoresQuery } from "@/contracts/profesor";
import * as service from "@/modules/profesores/profesor.service";

export const GET = withRoute(async ({ req }) => {
  const sp = new URL(req.url).searchParams;
  const raw: Record<string, string> = {};

  const busqueda = sp.get("busqueda")?.trim();
  if (busqueda) raw.busqueda = busqueda;

  const materiaId = sp.get("materiaId")?.trim();
  if (materiaId) raw.materiaId = materiaId;

  const academiaId = sp.get("academiaId")?.trim();
  if (academiaId) raw.academiaId = academiaId;

  const diaSemana = sp.get("diaSemana")?.trim();
  if (diaSemana) raw.diaSemana = diaSemana;

  const estado = sp.get("estado")?.trim().toLowerCase();
  if (estado && estado !== "todos") raw.estado = estado;

  const filtros = listarProfesoresQuery.parse(raw);
  return ok(await service.listar(filtros));
});

export const POST = withRoute(async ({ req, session }) => {
  const input = await parseBody(req, crearProfesorBody);
  return created(await service.crear(input, session.usuarioId));
});
