import { withPublicRoute, parseBody } from "@/lib/http/handler";
import { noContent } from "@/lib/http/responses";
import { recuperarBody } from "@/contracts/auth";
import * as service from "@/modules/auth/auth.service";

/**
 * POST /api/auth/recuperar
 *
 * Solicita el enlace de recuperación de contraseña.
 *
 * IMPORTANTE: siempre responde 204, exista o no la cuenta.
 * Si respondiera distinto según si el email existe, se convertiría en un
 * detector de cuentas registradas.
 *
 * `withPublicRoute`: el usuario no está logueado cuando olvidó su contraseña.
 */
export const POST = withPublicRoute(async ({ req }) => {
  const input = await parseBody(req, recuperarBody);
  await service.recuperar(input);
  return noContent();
});
