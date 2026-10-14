import { withRoute, parseBody } from "@/lib/http/handler";
import { ok, created } from "@/lib/http/responses";
import { crearBloqueoBody, listarBloqueosQuery } from "@/contracts/bloqueo";
import * as service from "@/modules/bloqueos/bloqueo.service";

export const GET = withRoute(async ({ req, session }) => {
  const sp = new URL(req.url).searchParams;
  const raw: Record<string, string> = {};

  for (const clave of ["estado", "profesorId", "desde", "hasta"]) {
    const valor = sp.get(clave)?.trim();
    if (valor && valor !== "todos") raw[clave] = valor;
  }

  const filtros = listarBloqueosQuery.parse(raw);
  return ok(await service.listar(filtros, session));
});

/**
 * Se valida con el objeto del contrato sin su `.refine` de fechas: el rango lo
 * chequea el service para devolver `RANGO_INVALIDO` (el refine daría DATOS_INVALIDOS).
 */
export const POST = withRoute(async ({ req, session }) => {
  const input = await parseBody(req, crearBloqueoBody.innerType());
  return created(await service.crear(input, session));
});
