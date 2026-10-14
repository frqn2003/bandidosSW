import { withRoute } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import { ValidationError } from "@/lib/http/errors";
import { indicadoresProfesorQuery } from "@/contracts/indicadores-profesor";
import * as service from "@/modules/indicadores-profesor/indicadores-profesor.service";

/** GET /api/indicadores/profesor -> Indicadores de actividad de un profesor (HU-IND-02). */
export const GET = withRoute(async ({ req, session }) => {
  const sp = new URL(req.url).searchParams;
  const raw: Record<string, string> = {};

  for (const clave of ["desde", "hasta", "profesorId", "materiaId"]) {
    const valor = sp.get(clave)?.trim();
    if (valor && valor !== "todos" && valor !== "todas" && valor !== "0") raw[clave] = valor;
  }

  // Los `.refine` del contrato darían DATOS_INVALIDOS; el contrato pide códigos propios.
  const resultado = indicadoresProfesorQuery.safeParse(raw);
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

  return ok(await service.obtener(resultado.data, session));
});
