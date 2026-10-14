import type { PoolClient } from "pg";
import type { Session } from "@/lib/auth/session";
import type {
  CrearNotaInput,
  HistorialAlumnoResponse,
  ListarHistorialAlumnoQuery,
  NotaResponse,
} from "@/contracts/historial";
import { withTransaction } from "@/lib/db/tx";
import { withAuditUser } from "@/lib/audit/audit";
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/http/errors";
import * as repo from "./historial.repo";
import * as mapper from "./historial.mapper";

/** Mesa de Entrada, Gerente y Profesor: los mismos que ven las observaciones de la asistencia. */
const ROLES = ["Mesa de Entrada", "Gerente", "Profesor"];

/**
 * Rol habilitado, alumno existente y, para el Profesor, que lo atienda.
 * Devuelve el estado del alumno.
 */
async function exigirAcceso(
  alumnoId: number,
  session: Session,
  client?: PoolClient,
): Promise<string> {
  if (!ROLES.includes(session.rol)) {
    throw new ForbiddenError(`Tu rol (${session.rol}) no tiene acceso al historial del alumno.`);
  }

  const estado = await repo.estadoAlumno(alumnoId, client);
  if (estado === null) throw new NotFoundError("el alumno", alumnoId);

  if (session.rol === "Profesor") {
    const profesorId = await repo.profesorDeUsuario(session.usuarioId, client);
    if (profesorId === null || !(await repo.profesorAtiendeAlumno(profesorId, alumnoId, client))) {
      throw new ForbiddenError(
        "Solo podés acceder al historial de los alumnos que atendés.",
        "PROFESOR_NO_ATIENDE_ALUMNO",
      );
    }
  }
  return estado;
}

/**
 * GET /api/alumnos/:id/historial — línea de tiempo + resumen, en modo LECTURA.
 * El historial de un alumno inactivo se sigue leyendo (`alumnoInactivo = true`).
 */
export async function obtener(
  alumnoId: number,
  filtros: ListarHistorialAlumnoQuery,
  session: Session,
): Promise<HistorialAlumnoResponse> {
  const estado = await exigirAcceso(alumnoId, session);

  const [eventos, resumen] = await Promise.all([
    repo.eventos(alumnoId, filtros),
    repo.resumen(alumnoId),
  ]);
  return mapper.historialToApi(eventos, resumen, estado !== "activo", ROLES.includes(session.rol));
}

/**
 * POST /api/alumnos/:id/notas — nota de texto libre (no se edita ni se borra).
 * Solo para alumnos activos. La bitácora la escribe el trigger con `withAuditUser`.
 */
export async function agregarNota(
  alumnoId: number,
  input: CrearNotaInput,
  session: Session,
): Promise<NotaResponse> {
  return withTransaction(async (client) => {
    await withAuditUser(client, session.usuarioId);

    const estado = await exigirAcceso(alumnoId, session, client);
    if (estado !== "activo") {
      throw new ConflictError(
        "ALUMNO_INACTIVO",
        "El alumno está inactivo: su historial es de solo lectura.",
      );
    }

    const nota = await repo.insertNota(alumnoId, input.texto, session.usuarioId, client);
    return mapper.notaToApi(nota);
  });
}
