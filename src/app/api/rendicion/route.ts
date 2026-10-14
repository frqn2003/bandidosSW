import { withRoute } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import { rendicionQuery } from "@/contracts/rendicion";
import * as service from "@/modules/rendicion/rendicion.service";

/** GET /api/rendicion -> Rendición de un profesor en un período (HU-PAG-02). */
export const GET = withRoute(async ({ req, session }) => {
  const sp = new URL(req.url).searchParams;
  const raw: Record<string, string> = {};

  for (const clave of ["profesorId", "desde", "hasta", "materiaId"]) {
    const valor = sp.get(clave)?.trim();
    if (valor && valor !== "todos") raw[clave] = valor;
  }

  const filtros = rendicionQuery.parse(raw);
  return ok(await service.obtener(filtros, session));
});
