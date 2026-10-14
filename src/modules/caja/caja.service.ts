import type { Session } from "@/lib/auth/session";
import type {
  CajaDelDiaQuery,
  CajaDelDiaResponse,
  CerrarCajaInput,
  CierreCajaResponse,
  ListarCierresQuery,
  ReabrirCajaInput,
} from "@/contracts/caja";
import { withTransaction } from "@/lib/db/tx";
import { withAuditUser } from "@/lib/audit/audit";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/lib/http/errors";
import * as repo from "./caja.repo";
import * as mapper from "./caja.mapper";

/** Caja: Gerente y Mesa de Entrada. El Profesor no accede. */
function validarAcceso(session: Session): void {
  if (session.rol !== "Gerente" && session.rol !== "Mesa de Entrada") {
    throw new ForbiddenError(`Tu rol (${session.rol}) no tiene permisos para operar la caja.`);
  }
}

function fechaFutura(): ValidationError {
  return new ValidationError("FECHA_FUTURA", "La fecha de la caja no puede ser futura.", "fecha");
}

/**
 * El `.min(1)` del contrato devuelve DATOS_INVALIDOS; el contrato pide
 * MOTIVO_REAPERTURA_REQUERIDO cuando falta el motivo.
 */
export function motivoReaperturaRequerido(e: unknown): unknown {
  if (e instanceof ValidationError && e.campo === "motivo" && !/250/.test(e.message)) {
    return new ValidationError(
      "MOTIVO_REAPERTURA_REQUERIDO",
      "Indicá el motivo de la reapertura.",
      "motivo",
    );
  }
  return e;
}

/** GET /api/caja — pagos de la fecha por medio, anulados aparte, y estado del cierre. */
export async function cajaDelDia(
  filtros: CajaDelDiaQuery,
  session: Session,
): Promise<CajaDelDiaResponse> {
  validarAcceso(session);

  const hoy = await repo.hoy();
  const fecha = filtros.fecha ?? hoy;
  if (fecha > hoy) throw fechaFutura();

  const [cerrada, cierre, medios, totales, lineas] = await Promise.all([
    repo.cajaCerrada(fecha),
    repo.ultimoCierre(fecha),
    repo.medios(fecha),
    repo.totales(fecha),
    repo.lineas(fecha),
  ]);
  return mapper.cajaDelDiaToApi(fecha, cerrada, cierre, medios, totales, lineas);
}

/** GET /api/caja/cierres — historial, fecha descendente. */
export async function listarCierres(
  filtros: ListarCierresQuery,
  session: Session,
): Promise<CierreCajaResponse[]> {
  validarAcceso(session);
  if (filtros.desde && filtros.hasta && filtros.hasta < filtros.desde) {
    throw new ValidationError(
      "RANGO_INVALIDO",
      "La fecha hasta no puede ser anterior a la fecha desde.",
      "hasta",
    );
  }
  return (await repo.findCierres(filtros)).map(mapper.cierreToApi);
}

/**
 * POST /api/caja/cierres
 * Totales y diferencia los calcula el trigger en el mismo INSERT (bajo el lock
 * de la fecha); si la diferencia ≠ 0 y no hay observaciones lo rechaza
 * `ck_cierre_observaciones` → OBSERVACIONES_REQUERIDAS. La bitácora la escribe
 * `trg_auditoria_cierre_caja`.
 */
export async function cerrar(input: CerrarCajaInput, session: Session): Promise<CierreCajaResponse> {
  validarAcceso(session);

  return withTransaction(async (client) => {
    await withAuditUser(client, session.usuarioId);

    if (input.fecha > (await repo.hoy(client))) throw fechaFutura();
    if (await repo.cajaCerrada(input.fecha, client)) {
      throw new ConflictError("CAJA_YA_CERRADA", "La caja de esa fecha ya está cerrada.", "fecha");
    }

    const id = await repo.insertCierre(
      {
        fecha: input.fecha,
        efectivoContado: input.efectivoContado,
        observaciones: input.observaciones ?? null,
      },
      session.usuarioId,
      client,
    );

    const row = await repo.findCierreById(id, client);
    if (!row) throw new Error("No se pudo recuperar el cierre recién registrado.");
    return mapper.cierreToApi(row);
  });
}

/** POST /api/caja/cierres/:id/reabrir — solo el Gerente, con motivo. */
export async function reabrir(
  id: number,
  input: ReabrirCajaInput,
  session: Session,
): Promise<CierreCajaResponse> {
  validarAcceso(session);
  if (session.rol !== "Gerente") {
    throw new ForbiddenError("Solo el Gerente puede reabrir una caja cerrada.");
  }

  return withTransaction(async (client) => {
    await withAuditUser(client, session.usuarioId);

    const actual = await repo.bloquearCierre(id, client);
    if (!actual) throw new NotFoundError("el cierre de caja", id);
    if (actual.estado !== "Cerrada") {
      throw new ConflictError("CAJA_YA_REABIERTA", "Ese cierre de caja ya fue reabierto.");
    }

    await repo.reabrir(id, input.motivo, client);

    const row = await repo.findCierreById(id, client);
    if (!row) throw new Error("No se pudo recuperar el cierre reabierto.");
    return mapper.cierreToApi(row);
  });
}
