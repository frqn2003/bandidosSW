import { withRoute, parseBody } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import { ValidationError } from "@/lib/http/errors";
import { cambiarContrasenaBody } from "@/contracts/auth";
import * as service from "@/modules/auth/auth.service";

/**
 * POST /api/auth/cambiar-contrasena
 *
 * Cambio obligatorio del primer ingreso. Usa `withRoute` (exige sesión activa):
 * el usuario llegó hasta acá habiendo pasado por el login.
 *
 * `parseBody` valida con `cambiarContrasenaBody` del contrato:
 *  · nueva >= 8 chars, mayúscula, minúscula, número
 *  · nueva !== actual
 *  · nueva === repetirNueva
 */
export const POST = withRoute(async ({ req }) => {
  let input;
  try {
    input = await parseBody(req, cambiarContrasenaBody);
  } catch (e) {
    if (e instanceof ValidationError && e.campo === "nueva") {
      if (e.message.includes("distinta")) {
        throw new ValidationError("CONTRASENA_REUSADA", e.message, "nueva");
      }
      throw new ValidationError("CONTRASENA_INSEGURA", e.message, "nueva");
    }
    throw e;
  }
  return ok(await service.cambiarContrasena(input));
});
