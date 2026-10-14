import type { Session } from "@/lib/auth/session";
import type {
  DeudoresResponse,
  EstadoCuentaResponse,
  ListarDeudoresQuery,
} from "@/contracts/deuda";
import { ForbiddenError, NotFoundError } from "@/lib/http/errors";
import * as repo from "./deuda.repo";
import * as mapper from "./deuda.mapper";

/** Deudores y estado de cuenta: Gerente y Mesa de Entrada. El Profesor no accede. */
function validarAcceso(session: Session): void {
  if (session.rol !== "Gerente" && session.rol !== "Mesa de Entrada") {
    throw new ForbiddenError(`Tu rol (${session.rol}) no tiene permisos para consultar la deuda.`);
  }
}

/** GET /api/deudores — solo lectura; `totalGeneral` coherente con los filtros. */
export async function listarDeudores(
  filtros: ListarDeudoresQuery,
  session: Session,
): Promise<DeudoresResponse> {
  validarAcceso(session);
  return mapper.deudoresToApi(await repo.deudores(filtros));
}

/**
 * GET /api/alumnos/:id/estado-cuenta — modo LECTURA. Las clases canceladas y
 * los pagos anulados se listan con `afectaSaldo = false`.
 */
export async function estadoCuenta(
  alumnoId: number,
  session: Session,
): Promise<EstadoCuentaResponse> {
  validarAcceso(session);

  const alumno = await repo.obtenerAlumno(alumnoId);
  if (!alumno) throw new NotFoundError("el alumno", alumnoId);

  return mapper.estadoCuentaToApi(alumno, await repo.estadoCuenta(alumnoId));
}
