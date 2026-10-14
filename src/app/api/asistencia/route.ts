import { withRoute, parseBody } from "@/lib/http/handler";
import { created } from "@/lib/http/responses";
import { registrarAsistenciaBody } from "@/contracts/asistencia";
import * as service from "@/modules/asistencia/asistencia.service";

export const POST = withRoute(async ({ req, session }) => {
  const input = await parseBody(req, registrarAsistenciaBody);
  return created(await service.registrar(input, session));
});
