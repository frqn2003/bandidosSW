import { withRoute, parseBody, parseId } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import { editarUsuarioBody } from "@/contracts/usuario";
import * as service from "@/modules/usuarios/usuario.service";

type Params = { id: string };

/**
 * GET /api/usuarios/:id
 * Retorna los datos de un usuario por su ID (modo LECTURA / EDICIÓN).
 */
export const GET = withRoute<Params>(async ({ params }) => {
  const { id } = await params;
  return ok(await service.obtener(parseId(id)));
});

/**
 * PUT /api/usuarios/:id
 * Modifica los datos de un usuario existente.
 */
export const PUT = withRoute<Params>(async ({ req, session, params }) => {
  const { id } = await params;
  const input = await parseBody(req, editarUsuarioBody);
  return ok(await service.editar(parseId(id), input, session.usuarioId));
});

// No hay DELETE a propósito: la baja es LÓGICA y va por
// POST /api/usuarios/:id/inactivar (criterio de aceptación obligatorio HU-SIS-00).
