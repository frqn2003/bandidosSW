import { withRoute } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import { calendarioOcupacionQuery } from "@/contracts/calendario";
import * as service from "@/modules/calendario/calendario.service";

/**
 * Se valida con el objeto del contrato sin sus `.refine`: el rango (hasta < desde
 * y máximo 42 días) lo chequea el service para devolver RANGO_INVALIDO /
 * RANGO_DEMASIADO_AMPLIO en vez de DATOS_INVALIDOS.
 */
export const GET = withRoute(async ({ req, session }) => {
  const sp = new URL(req.url).searchParams;
  const raw: Record<string, string> = {};

  for (const clave of ["desde", "hasta", "profesorId", "materiaId"]) {
    const valor = sp.get(clave)?.trim();
    if (valor && valor !== "todos") raw[clave] = valor;
  }

  const filtros = calendarioOcupacionQuery.sourceType().parse(raw);
  return ok(await service.ocupacion(filtros, session));
});
