import type { Session } from "@/lib/auth/session";
import type {
  IndicadoresProfesorQuery,
  IndicadoresProfesorResponse,
} from "@/contracts/indicadores-profesor";
import { ForbiddenError, ValidationError } from "@/lib/http/errors";
import * as repo from "./indicadores-profesor.repo";
import * as mapper from "./indicadores-profesor.mapper";

/** Misma regla que `fn_validar_periodo`: hasta <= desde + 12 meses. */
function superaDoceMeses(desde: string, hasta: string): boolean {
  const [y, m, d] = desde.split("-").map(Number);
  const limite = Date.UTC(y, m - 1 + 12, d);
  return new Date(`${hasta}T00:00:00Z`).getTime() > limite;
}

/**
 * GET /api/indicadores/profesor — solo lectura, sin datos de pagos.
 * Profesor: solo los propios (el back usa el de la sesión). Gerente: cualquier
 * profesor activo, `profesorId` obligatorio. Resto de los roles: ACCESO_DENEGADO.
 * Todos los cálculos salen de las funciones de la base.
 */
export async function obtener(
  filtros: IndicadoresProfesorQuery,
  session: Session,
): Promise<IndicadoresProfesorResponse> {
  let profesor;

  if (session.rol === "Profesor") {
    profesor = await repo.profesorDeUsuario(session.usuarioId);
    if (!profesor) throw new ForbiddenError("Tu usuario no tiene una ficha de profesor activa.");
    if (filtros.profesorId !== undefined && filtros.profesorId !== profesor.id) {
      throw new ForbiddenError("Solo podés consultar tus propios indicadores.");
    }
  } else if (session.rol === "Gerente") {
    if (filtros.profesorId === undefined) {
      throw new ValidationError("PROFESOR_REQUERIDO", "Seleccioná un profesor.", "profesorId");
    }
    profesor = await repo.obtenerProfesor(filtros.profesorId);
    if (!profesor || profesor.estado !== "activo") {
      throw new ValidationError(
        "REFERENCIA_INVALIDA",
        "El profesor no existe o está inactivo.",
        "profesorId",
      );
    }
  } else {
    throw new ForbiddenError(`Tu rol (${session.rol}) no tiene permisos para ver estos indicadores.`);
  }

  // El zod del contrato ya valida hasta >= desde y 366 días; esto replica el
  // límite exacto de la base para no caer en su excepción.
  if (superaDoceMeses(filtros.desde, filtros.hasta)) {
    throw new ValidationError(
      "RANGO_MAXIMO_EXCEDIDO",
      "El período seleccionado no puede superar los 12 meses.",
      "hasta",
    );
  }

  if (filtros.materiaId !== undefined && !(await repo.dictaMateria(profesor.id, filtros.materiaId))) {
    throw new ValidationError(
      "REFERENCIA_INVALIDA",
      "El profesor no dicta la materia seleccionada.",
      "materiaId",
    );
  }

  const periodo = {
    profesorId: profesor.id,
    desde: filtros.desde,
    hasta: filtros.hasta,
    materiaId: filtros.materiaId,
  };
  const [materias, ind, semanas, porMateria, ausencias] = await Promise.all([
    repo.materiasDictadas(profesor.id),
    repo.indicadores(periodo),
    repo.clasesPorSemana(periodo),
    repo.clasesPorMateria(periodo),
    repo.topAusencias(periodo),
  ]);

  return mapper.toApi(
    { desde: filtros.desde, hasta: filtros.hasta },
    profesor,
    materias,
    ind,
    semanas,
    porMateria,
    ausencias,
  );
}
