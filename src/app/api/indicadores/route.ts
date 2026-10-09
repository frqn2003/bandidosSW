import { withRoute } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import { ForbiddenError, ValidationError } from "@/lib/http/errors";
import { indicadoresQuery } from "@/contracts/indicadores";
import * as service from "@/modules/indicadores/indicadores.service";

export const GET = withRoute(async ({ req, session }) => {
  // Criterio HU-IND-01: Acceso exclusivo del rol Gerente (403 ACCESO_DENEGADO)
  if (session.rol !== "Gerente") {
    throw new ForbiddenError("Solo el Gerente puede consultar los indicadores de gestión.");
  }

  const sp = new URL(req.url).searchParams;
  const raw: Record<string, string> = {};

  const desde = sp.get("desde")?.trim();
  if (desde) raw.desde = desde;

  const hasta = sp.get("hasta")?.trim();
  if (hasta) raw.hasta = hasta;

  const profesorId = sp.get("profesorId")?.trim();
  if (profesorId && profesorId !== "todos" && profesorId !== "0") {
    raw.profesorId = profesorId;
  }

  const materiaId = sp.get("materiaId")?.trim();
  if (materiaId && materiaId !== "todas" && materiaId !== "0") {
    raw.materiaId = materiaId;
  }

  const resultado = indicadoresQuery.safeParse(raw);
  if (!resultado.success) {
    const primero = resultado.error.issues[0];
    const mensaje = primero?.message || "Los parámetros enviados no son válidos.";
    const campo = primero?.path.join(".") || "hasta";

    let codigo = "DATOS_INVALIDOS";
    if (mensaje.includes("anterior a la de inicio")) {
      codigo = "RANGO_INVALIDO";
    } else if (mensaje.includes("12 meses")) {
      codigo = "RANGO_MAXIMO_EXCEDIDO";
    }

    throw new ValidationError(codigo, mensaje, campo);
  }

  return ok(await service.obtenerIndicadores(resultado.data));
});
