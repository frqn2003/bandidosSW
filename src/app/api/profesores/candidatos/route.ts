import { withRoute, parseBody } from "@/lib/http/handler";
import { ok, created } from "@/lib/http/responses";
import { crearCandidatoBody } from "@/contracts/profesor";
import * as service from "@/modules/profesores/profesor.service";

/**
 * Devuelve usuarios activos con rol "Profesor" que todavía no tienen ficha creada.
 * Alimenta el combobox de "Usuario Asociado" del formulario de alta.
 */
export const GET = withRoute(async () => {
  return ok(await service.candidatos());
});

/**
 * Alta rápida de un usuario con rol Profesor (solo Gerente): crea la cuenta en
 * Supabase Auth y la fila de `usuario`. Devuelve el candidato + la contraseña
 * temporal, que se muestra una sola vez.
 */
export const POST = withRoute(async ({ req, session }) => {
  const input = await parseBody(req, crearCandidatoBody);
  return created(await service.crearCandidato(input, session));
});
