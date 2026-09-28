import { withRoute } from "@/lib/http/handler";
import { noContent } from "@/lib/http/responses";
import { ipDelRequest } from "@/lib/http/ip";
import * as service from "@/modules/auth/auth.service";

/**
 * POST /api/auth/acceso-denegado
 *
 * Registra en la bitácora (`auditoria_sesion`) cuando un usuario intenta
 * acceder por URL directa a un módulo o recurso que su rol no tiene permitido.
 */
export const POST = withRoute(async ({ req, session }) => {
  const ip = ipDelRequest(req);
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  await service.registrarAccesoDenegado(session.usuarioId, ip, body);
  return noContent();
});
