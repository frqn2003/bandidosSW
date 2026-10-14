import { withRoute, parseId } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import * as service from "@/modules/bloqueos/bloqueo.service";

/** Baja lógica. No hay DELETE: `trg_bloqueo_fecha_bloquear_borrado` lo impide. */
export const POST = withRoute<{ id: string }>(async ({ params, session }) => {
  const id = parseId((await params).id);
  return ok(await service.darDeBaja(id, session));
});
