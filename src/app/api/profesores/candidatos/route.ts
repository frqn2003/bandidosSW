import { withRoute } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import * as service from "@/modules/profesores/profesor.service";

/**
 * Devuelve usuarios activos con rol "Profesor" que todavía no tienen ficha creada.
 * Alimenta el combobox de "Usuario Asociado" del formulario de alta.
 */
export const GET = withRoute(async () => {
  return ok(await service.candidatos());
});
