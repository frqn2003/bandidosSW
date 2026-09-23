import { withPublicRoute, parseBody } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import { ipDelRequest } from "@/lib/http/ip";
import { loginBody } from "@/contracts/auth";
import * as service from "@/modules/auth/auth.service";

/**
 * POST /api/auth/login
 *
 * `withPublicRoute` y NO `withRoute`: pedir sesión para loguearse sería un círculo.
 * Es el único endpoint que usa este wrapper.
 */
export const POST = withPublicRoute(async ({ req }) => {
  const input = await parseBody(req, loginBody);
  return ok(await service.login(input, ipDelRequest(req)));
});
