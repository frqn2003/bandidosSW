import { withRoute } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import { cajaDelDiaQuery } from "@/contracts/caja";
import * as service from "@/modules/caja/caja.service";

/** GET /api/caja -> Caja de una fecha: pagos por medio, anulados aparte y estado del cierre. */
export const GET = withRoute(async ({ req, session }) => {
  const sp = new URL(req.url).searchParams;
  const raw: Record<string, string> = {};

  for (const clave of ["fecha"]) {
    const valor = sp.get(clave)?.trim();
    if (valor && valor !== "todos") raw[clave] = valor;
  }

  const filtros = cajaDelDiaQuery.parse(raw);
  return ok(await service.cajaDelDia(filtros, session));
});
