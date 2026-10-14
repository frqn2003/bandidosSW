import { withRoute, parseId } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import * as service from "@/modules/deuda/deuda.service";

/** GET /api/alumnos/:id/estado-cuenta -> Movimientos y saldo del alumno, modo LECTURA (HU-PAG-02). */
export const GET = withRoute<{ id: string }>(async ({ params, session }) => {
  const alumnoId = parseId((await params).id);
  return ok(await service.estadoCuenta(alumnoId, session));
});
