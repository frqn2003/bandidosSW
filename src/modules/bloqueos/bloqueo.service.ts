import type { Session } from "@/lib/auth/session";
import type {
  BloqueoResponse,
  CrearBloqueoInput,
  CrearBloqueoResponse,
  ListarBloqueosQuery,
} from "@/contracts/bloqueo";
import { withTransaction } from "@/lib/db/tx";
import { withAuditUser } from "@/lib/audit/audit";
import {
  BusinessRuleError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/lib/http/errors";
import * as repo from "./bloqueo.repo";
import * as mapper from "./bloqueo.mapper";

const ROLES_LECTURA = ["Gerente", "Mesa de Entrada", "Profesor"];

const sinPermiso = (mensaje: string) => new ForbiddenError(mensaje, "SIN_PERMISO");

function exigirGerente(session: Session): void {
  if (session.rol !== "Gerente") {
    throw sinPermiso("Solo el Gerente puede cargar o dar de baja bloqueos de fechas.");
  }
}

function validarRango(desde: string | undefined, hasta: string | undefined, campo: string): void {
  if (desde && hasta && hasta < desde) {
    throw new ValidationError(
      "RANGO_INVALIDO",
      "La fecha hasta no puede ser anterior a la fecha desde.",
      campo,
    );
  }
}

/** GET /api/bloqueos — vigentes por defecto. Lectura para los roles del calendario. */
export async function listar(
  filtros: ListarBloqueosQuery,
  session: Session,
): Promise<BloqueoResponse[]> {
  if (!ROLES_LECTURA.includes(session.rol)) {
    throw sinPermiso(`Tu rol (${session.rol}) no puede consultar los bloqueos de fechas.`);
  }
  validarRango(filtros.desde, filtros.hasta, "hasta");

  const rows = await repo.findAll(filtros);
  return rows.map(mapper.toApi);
}

/**
 * POST /api/bloqueos
 * Carga el bloqueo y devuelve los turnos 'Reservado' del rango SIN tocarlos: el
 * Gerente decide si los reprograma o cancela. La bitácora la escribe
 * `trg_auditoria_bloqueo_fecha` con el usuario de `withAuditUser`.
 */
export async function crear(
  input: CrearBloqueoInput,
  session: Session,
): Promise<CrearBloqueoResponse> {
  exigirGerente(session);
  validarRango(input.fechaDesde, input.fechaHasta, "fechaHasta");

  return withTransaction(async (client) => {
    await withAuditUser(client, session.usuarioId);

    if (input.profesorId !== null) {
      const estado = await repo.estadoProfesor(input.profesorId, client);
      if (estado === null) {
        throw new ValidationError("REFERENCIA_INVALIDA", "El profesor no existe.", "profesorId");
      }
      if (estado !== "activo") {
        throw new ValidationError(
          "PROFESOR_INACTIVO",
          "El profesor seleccionado está inactivo.",
          "profesorId",
        );
      }
    }

    const id = await repo.insert(
      {
        fechaDesde: input.fechaDesde,
        fechaHasta: input.fechaHasta,
        profesorId: input.profesorId,
        motivo: input.motivo,
      },
      session.usuarioId,
      client,
    );

    const [bloqueo, afectados] = await Promise.all([
      repo.findById(id, client),
      repo.turnosAfectados(input.fechaDesde, input.fechaHasta, input.profesorId, client),
    ]);
    if (!bloqueo) throw new Error("No se pudo recuperar el bloqueo recién creado.");

    return {
      bloqueo: mapper.toApi(bloqueo),
      turnosAfectados: afectados.map(mapper.turnoAfectadoToApi),
    };
  });
}

/** POST /api/bloqueos/:id/baja — baja lógica (no hay DELETE). */
export async function darDeBaja(id: number, session: Session): Promise<BloqueoResponse> {
  exigirGerente(session);

  return withTransaction(async (client) => {
    await withAuditUser(client, session.usuarioId);

    const actual = await repo.bloquear(id, client);
    if (!actual) throw new NotFoundError("el bloqueo", id);
    if (actual.estado !== "activo") {
      throw new BusinessRuleError(
        "BLOQUEO_YA_DADO_DE_BAJA",
        "El bloqueo ya fue dado de baja.",
      );
    }

    await repo.darDeBaja(id, client);

    const row = await repo.findById(id, client);
    if (!row) throw new Error("No se pudo recuperar el bloqueo dado de baja.");
    return mapper.toApi(row);
  });
}
