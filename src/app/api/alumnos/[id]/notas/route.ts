import { withRoute, parseBody, parseId } from "@/lib/http/handler";
import { created } from "@/lib/http/responses";
import { crearNotaBody } from "@/contracts/historial";
import * as service from "@/modules/historial/historial.service";

/**
 * POST /api/alumnos/:id/notas -> Agregar una nota al historial (HU-ALU-03).
 * No hay PUT ni DELETE: una corrección es una nota nueva.
 */
export const POST = withRoute<{ id: string }>(async ({ req, params, session }) => {
  const alumnoId = parseId((await params).id);
  const input = await parseBody(req, crearNotaBody);
  return created(await service.agregarNota(alumnoId, input, session));
});
