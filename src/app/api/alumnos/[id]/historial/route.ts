import { withRoute, parseId } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import { ValidationError } from "@/lib/http/errors";
import { listarHistorialAlumnoQuery } from "@/contracts/historial";
import * as service from "@/modules/historial/historial.service";

/** GET /api/alumnos/:id/historial -> Línea de tiempo + resumen del alumno (HU-ALU-03). */
export const GET = withRoute<{ id: string }>(async ({ req, params, session }) => {
  const alumnoId = parseId((await params).id);
  const sp = new URL(req.url).searchParams;
  const raw: Record<string, string> = {};

  for (const clave of ["desde", "hasta", "tipo", "materiaId", "profesorId"]) {
    const valor = sp.get(clave)?.trim();
    if (valor && valor !== "todos" && valor !== "todas") raw[clave] = valor;
  }

  // El `.refine` de fechas del contrato daría DATOS_INVALIDOS; el contrato pide RANGO_INVALIDO.
  const resultado = listarHistorialAlumnoQuery.safeParse(raw);
  if (!resultado.success) {
    const primero = resultado.error.issues[0];
    const mensaje = primero?.message || "Los filtros enviados no son válidos.";
    const codigo = mensaje.includes("no puede ser anterior") ? "RANGO_INVALIDO" : "DATOS_INVALIDOS";
    throw new ValidationError(codigo, mensaje, primero?.path.join(".") || undefined);
  }

  return ok(await service.obtener(alumnoId, resultado.data, session));
});
