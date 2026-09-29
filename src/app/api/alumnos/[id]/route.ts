import { withRoute, parseBody, parseId } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import { editarAlumnoBody } from "@/contracts/alumno";
import * as service from "@/modules/alumnos/alumno.service";

export const GET = withRoute<{ id: string }>(async ({ params }) => {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  return ok(await service.obtener(id));
});

export const PUT = withRoute<{ id: string }>(async ({ req, session, params }) => {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  const input = await parseBody(req, editarAlumnoBody);
  return ok(await service.editar(id, input, session.usuarioId));
});

// No hay DELETE a propósito: la baja es LÓGICA y va por
// POST /api/alumnos/:id/inactivar (criterio HU-ALU-02).
