import { withRoute, parseBody } from "@/lib/http/handler";
import { ok, created } from "@/lib/http/responses";
import { crearTurnoBody, listarTurnosQuery } from "@/contracts/turno";
import * as service from "@/modules/turnos/turno.service";

export const GET = withRoute(async ({ req, session }) => {
  const sp = new URL(req.url).searchParams;
  const raw: Record<string, string> = {};

  const busqueda = sp.get("busqueda")?.trim();
  if (busqueda) raw.busqueda = busqueda;

  const alumnoId = sp.get("alumnoId")?.trim();
  if (alumnoId) raw.alumnoId = alumnoId;

  const profesorId = sp.get("profesorId")?.trim();
  if (profesorId) raw.profesorId = profesorId;

  const materiaId = sp.get("materiaId")?.trim();
  if (materiaId) raw.materiaId = materiaId;

  const estado = sp.get("estado")?.trim();
  if (estado && estado !== "todos") raw.estado = estado;

  const desde = sp.get("desde")?.trim();
  if (desde) raw.desde = desde;

  const hasta = sp.get("hasta")?.trim();
  if (hasta) raw.hasta = hasta;

  const filtros = listarTurnosQuery.parse(raw);
  return ok(await service.listar(filtros, session));
});

export const POST = withRoute(async ({ req, session }) => {
  const input = await parseBody(req, crearTurnoBody);
  return created(await service.reservar(input, session.usuarioId, session));
});
