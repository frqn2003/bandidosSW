import { withRoute, parseBody } from "@/lib/http/handler";
import { ok, created } from "@/lib/http/responses";
import { cerrarCajaBody, listarCierresQuery } from "@/contracts/caja";
import * as service from "@/modules/caja/caja.service";

/**
 * GET  /api/caja/cierres -> Historial de cierres (fecha descendente)
 * POST /api/caja/cierres -> Cerrar la caja de una fecha
 */
export const GET = withRoute(async ({ req, session }) => {
  const sp = new URL(req.url).searchParams;
  const raw: Record<string, string> = {};

  for (const clave of ["desde", "hasta", "estado"]) {
    const valor = sp.get(clave)?.trim();
    if (valor && valor !== "todos") raw[clave] = valor;
  }

  const filtros = listarCierresQuery.parse(raw);
  return ok(await service.listarCierres(filtros, session));
});

export const POST = withRoute(async ({ req, session }) => {
  const input = await parseBody(req, cerrarCajaBody);
  return created(await service.cerrar(input, session));
});
