import { withRoute, parseBody } from "@/lib/http/handler";
import { ok, created } from "@/lib/http/responses";
import { misTurnosQuery, reservarTurnoPortalBody } from "@/contracts/portal";
import * as service from "@/modules/portal/portal.service";

/**
 * GET  /api/portal/turnos -> Mis turnos (alumno de la sesión)
 * POST /api/portal/turnos -> Reservar un turno para el alumno de la sesión (HU-POR-01)
 */
export const GET = withRoute(async ({ req, session }) => {
  const sp = new URL(req.url).searchParams;
  const raw: Record<string, string> = {};
  const verHistorial = sp.get("verHistorial")?.trim();
  if (verHistorial) raw.verHistorial = verHistorial;

  const filtros = misTurnosQuery.parse(raw);
  return ok(await service.misTurnos(filtros, session));
});

export const POST = withRoute(async ({ req, session }) => {
  const input = await parseBody(req, reservarTurnoPortalBody);
  return created(await service.reservar(input, session));
});
