import { withRoute, parseBody } from "@/lib/http/handler";
import { ok, created } from "@/lib/http/responses";
import { listarUsuariosQuery, crearUsuarioBody } from "@/contracts/usuario";
import * as service from "@/modules/usuarios/usuario.service";

/**
 * GET /api/usuarios
 * Lista usuarios con filtros combinables y ordenados alfabéticamente por Apellido, Nombre.
 */
export const GET = withRoute(async ({ req }) => {
  const sp = new URL(req.url).searchParams;
  const filtros = listarUsuariosQuery.parse(Object.fromEntries(sp));
  return ok(await service.listar(filtros));
});

/**
 * POST /api/usuarios
 * Da de alta un nuevo usuario, generando su contraseña temporal y enviándola por email.
 */
export const POST = withRoute(async ({ req, session }) => {
  const input = await parseBody(req, crearUsuarioBody);
  return created(await service.crear(input, session.usuarioId));
});
