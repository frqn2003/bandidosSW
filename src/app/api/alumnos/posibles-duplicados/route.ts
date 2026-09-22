import { withRoute } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import { posiblesDuplicadosQuery } from "@/contracts/alumno";
import * as service from "@/modules/alumnos/alumno.service";

export const GET = withRoute(async ({ req }) => {
  const sp = new URL(req.url).searchParams;
  const raw = {
    nombre: sp.get("nombre") ?? "",
    apellido: sp.get("apellido") ?? "",
    fechaNacimiento: sp.get("fechaNacimiento") ?? "",
  };

  const criterio = posiblesDuplicadosQuery.parse(raw);
  return ok(await service.posiblesDuplicados(criterio));
});
