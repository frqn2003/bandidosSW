import type { Session } from "@/lib/auth/session";
import type { RendicionQuery, RendicionResponse } from "@/contracts/rendicion";
import { ForbiddenError, ValidationError } from "@/lib/http/errors";
import * as repo from "./rendicion.repo";
import * as mapper from "./rendicion.mapper";

const MAX_MESES = 12;

/** Mismo límite que `fn_validar_periodo`: hasta <= desde + 12 meses. */
function superaMeses(desde: string, hasta: string, meses: number): boolean {
  const [y, m, d] = desde.split("-").map(Number);
  const limite = new Date(Date.UTC(y, m - 1 + meses, d));
  return new Date(`${hasta}T00:00:00Z`).getTime() > limite.getTime();
}

/**
 * GET /api/rendicion — solo lectura.
 * Gerente: cualquier profesor (`profesorId` obligatorio). Profesor: solo la propia.
 * Mesa de Entrada no accede.
 */
export async function obtener(filtros: RendicionQuery, session: Session): Promise<RendicionResponse> {
  let profesorId: number;

  if (session.rol === "Profesor") {
    const propio = await repo.profesorDeUsuario(session.usuarioId);
    if (!propio) throw new ForbiddenError("Tu usuario no tiene una ficha de profesor activa.");
    if (filtros.profesorId !== undefined && filtros.profesorId !== propio.id) {
      throw new ForbiddenError("Solo podés consultar tu propia rendición.");
    }
    profesorId = propio.id;
  } else if (session.rol === "Gerente") {
    if (filtros.profesorId === undefined) {
      throw new ValidationError("PROFESOR_REQUERIDO", "Seleccioná un profesor.", "profesorId");
    }
    profesorId = filtros.profesorId;
  } else {
    throw new ForbiddenError(`Tu rol (${session.rol}) no tiene permisos para ver rendiciones.`);
  }

  const mes = filtros.desde && filtros.hasta ? null : await repo.mesEnCurso();
  const desde = filtros.desde ?? mes!.desde;
  const hasta = filtros.hasta ?? mes!.hasta;

  if (hasta < desde) {
    throw new ValidationError(
      "RANGO_INVALIDO",
      "La fecha hasta no puede ser anterior a la fecha desde.",
      "hasta",
    );
  }
  if (superaMeses(desde, hasta, MAX_MESES)) {
    throw new ValidationError(
      "PERIODO_DEMASIADO_AMPLIO",
      `El período no puede superar ${MAX_MESES} meses.`,
      "hasta",
    );
  }

  const profesor = await repo.obtenerProfesor(profesorId);
  if (!profesor) {
    throw new ValidationError("REFERENCIA_INVALIDA", "El profesor no existe.", "profesorId");
  }
  if (filtros.materiaId !== undefined && !(await repo.existeMateria(filtros.materiaId))) {
    throw new ValidationError("REFERENCIA_INVALIDA", "La materia no existe.", "materiaId");
  }

  const periodo = { profesorId, desde, hasta, materiaId: filtros.materiaId };
  const [detalle, pendientes] = await Promise.all([repo.detalle(periodo), repo.pendientes(periodo)]);
  return mapper.rendicionToApi(profesor, desde, hasta, detalle, pendientes);
}
