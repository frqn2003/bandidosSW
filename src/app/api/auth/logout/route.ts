import { withRoute } from "@/lib/http/handler";
import { noContent } from "@/lib/http/responses";
import { ipDelRequest } from "@/lib/http/ip";
import * as service from "@/modules/auth/auth.service";

/**
 * POST /api/auth/logout
 *
 * Invalida el token en Supabase Auth y borra la cookie.
 * Usa `withRoute` (exige sesión activa): si no hay sesión, 401 es la respuesta
 * correcta — no tiene sentido cerrar una sesión que no existe.
 */
export const POST = withRoute(async ({ req }) => {
  await service.logout(ipDelRequest(req));
  return noContent();
});
