import { withRoute } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import { listarDeudoresQuery } from "@/contracts/deuda";
import * as service from "@/modules/deuda/deuda.service";

/** GET /api/deudores -> Listado de deudores + total general (HU-PAG-02). */
export const GET = withRoute(async ({ req, session }) => {
  const sp = new URL(req.url).searchParams;
  const raw: Record<string, string> = {};

  for (const clave of ["busqueda", "antiguedad", "materiaId", "profesorId"]) {
    const valor = sp.get(clave)?.trim();
    if (valor && valor !== "todos") raw[clave] = valor;
  }

  const filtros = listarDeudoresQuery.parse(raw);
  return ok(await service.listarDeudores(filtros, session));
});
