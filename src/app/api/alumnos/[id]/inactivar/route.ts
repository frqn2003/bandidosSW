import { withRoute, parseId } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import { inactivarAlumnoBody } from "@/contracts/alumno";
import { ValidationError } from "@/lib/http/errors";
import * as service from "@/modules/alumnos/alumno.service";

async function resolverConfirmarConDeuda(req: Request): Promise<boolean> {
  const text = await req.text();
  if (!text || !text.trim()) {
    return false;
  }
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new ValidationError("BODY_INVALIDO", "El cuerpo de la petición no es JSON válido.");
  }
  const body = inactivarAlumnoBody.parse(json);
  return body.confirmarConDeuda;
}

export const POST = withRoute<{ id: string }>(async ({ req, session, params }) => {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  const confirmarConDeuda = await resolverConfirmarConDeuda(req);
  return ok(await service.inactivar(id, session.usuarioId, confirmarConDeuda));
});

export const PATCH = withRoute<{ id: string }>(async ({ req, session, params }) => {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  const confirmarConDeuda = await resolverConfirmarConDeuda(req);
  return ok(await service.inactivar(id, session.usuarioId, confirmarConDeuda));
});
