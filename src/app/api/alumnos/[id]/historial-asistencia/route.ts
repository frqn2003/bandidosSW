import { withRoute, parseId } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import { listarHistorialQuery } from "@/contracts/asistencia";
import * as service from "@/modules/asistencia/asistencia.service";

export const GET = withRoute<{ id: string }>(async ({ req, params, session }) => {
  const alumnoId = parseId((await params).id);
  const sp = new URL(req.url).searchParams;
  const raw: Record<string, string> = {};

  for (const clave of ["desde", "hasta", "materiaId", "profesorId", "estado"]) {
    const valor = sp.get(clave)?.trim();
    if (valor && valor !== "todos") raw[clave] = valor;
  }

  const filtros = listarHistorialQuery.parse(raw);
  return ok(await service.historialAlumno(alumnoId, filtros, session));
});
