import type { PoolClient } from "pg";
import type { Session } from "@/lib/auth/session";
import type {
  AsistenciaResponse,
  ClaseDelDiaResponse,
  CorregirAsistenciaInput,
  HistorialAsistenciaResponse,
  ListarClasesDelDiaQuery,
  ListarHistorialQuery,
  RegistrarAsistenciaInput,
} from "@/contracts/asistencia";
import { withTransaction } from "@/lib/db/tx";
import { withAuditUser } from "@/lib/audit/audit";
import {
  BusinessRuleError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/lib/http/errors";
import * as repo from "./asistencia.repo";
import * as mapper from "./asistencia.mapper";
import type { ClaseRow } from "./asistencia.types";

const ROLES_LECTURA = ["Gerente", "Mesa de Entrada", "Profesor"];

const sinPermiso = (mensaje: string) => new ForbiddenError(mensaje, "SIN_PERMISO");
const turnoAjeno = (mensaje: string) => new ForbiddenError(mensaje, "TURNO_AJENO");

/** Ficha de profesor del usuario logueado; sin ficha activa no opera como Profesor. */
async function profesorDeSesion(session: Session): Promise<number> {
  const profe = await repo.obtenerProfesorPorUsuarioId(session.usuarioId);
  if (!profe || profe.estado !== "activo") {
    throw sinPermiso("Tu usuario no tiene una ficha de profesor activa.");
  }
  return profe.id;
}

async function recargar(turnoId: number, client: PoolClient): Promise<AsistenciaResponse> {
  const row = await repo.findClaseByTurnoId(turnoId, client);
  const asistencia = row ? mapper.asistenciaToApi(row) : null;
  if (!asistencia) throw new Error("No se pudo recuperar la asistencia guardada.");
  return asistencia;
}

/**
 * GET /api/asistencia/clases-del-dia
 * Profesor: solo sus turnos. Gerente y Mesa de Entrada: todos, o los de `profesorId`.
 */
export async function listarClasesDelDia(
  filtros: ListarClasesDelDiaQuery,
  session: Session,
): Promise<ClaseDelDiaResponse[]> {
  if (!ROLES_LECTURA.includes(session.rol)) {
    throw sinPermiso(`Tu rol (${session.rol}) no puede consultar las clases del día.`);
  }

  let profesorId: number | null = null;
  if (session.rol === "Profesor") {
    profesorId = await profesorDeSesion(session);
    if (filtros.profesorId !== undefined && filtros.profesorId !== profesorId) {
      throw sinPermiso("Solo podés consultar tus propias clases.");
    }
    filtros = { ...filtros, profesorId };
  }

  const rows = await repo.findClasesDelDia(filtros);
  const visor = { rol: session.rol, profesorId };
  return rows.map((r) => mapper.claseToApi(r, visor));
}

/**
 * POST /api/asistencia
 * El trigger `fn_asistencia_validar` vuelve a chequear todo; acá se valida antes
 * para devolver el código del contrato con un mensaje claro.
 */
export async function registrar(
  input: RegistrarAsistenciaInput,
  session: Session,
): Promise<AsistenciaResponse> {
  if (session.rol !== "Profesor") {
    throw sinPermiso("Solo el Profesor puede registrar la asistencia.");
  }
  const profesorId = await profesorDeSesion(session);

  return withTransaction(async (client) => {
    await withAuditUser(client, session.usuarioId);

    if (!(await repo.bloquearTurno(input.turnoId, client))) {
      throw new NotFoundError("el turno", input.turnoId);
    }
    const clase = (await repo.findClaseByTurnoId(input.turnoId, client)) as ClaseRow;

    if (clase.profesor_id !== profesorId) {
      throw turnoAjeno("Solo podés registrar la asistencia de tus propios turnos.");
    }
    if (clase.a_id !== null) {
      throw new BusinessRuleError(
        "ASISTENCIA_YA_REGISTRADA",
        "El turno ya tiene la asistencia registrada: corregila en lugar de registrarla de nuevo.",
      );
    }
    if (clase.estado !== "Reservado") {
      throw new BusinessRuleError(
        "TURNO_NO_RESERVADO",
        `El turno ${clase.codigo} está en estado "${clase.estado}": solo se registra asistencia sobre turnos Reservados.`,
      );
    }
    if (clase.antes_de_ventana || clase.despues_de_ventana) {
      throw new ValidationError(
        "FUERA_DE_VENTANA_HORARIA",
        clase.antes_de_ventana
          ? `La asistencia se puede registrar desde las ${clase.ventana_desde} (${clase.minutos_antes} minutos antes del inicio).`
          : "La jornada del turno ya finalizó: no se puede registrar la asistencia.",
      );
    }

    await repo.insert(
      {
        turnoId: input.turnoId,
        presente: input.presente,
        temaTrabajado: input.temaTrabajado ?? null,
        observaciones: input.observaciones ?? null,
      },
      session.usuarioId,
      client,
    );

    return recargar(input.turnoId, client);
  });
}

/**
 * PUT /api/asistencia/:id
 * Profesor: sus turnos, dentro de `horas_correccion_asistencia`.
 * Gerente: solo pasado ese plazo, con `motivoCorreccion` obligatorio.
 */
export async function corregir(
  id: number,
  input: CorregirAsistenciaInput,
  session: Session,
): Promise<AsistenciaResponse> {
  if (session.rol !== "Profesor" && session.rol !== "Gerente") {
    throw sinPermiso("Solo el Profesor del turno o el Gerente pueden corregir la asistencia.");
  }
  const profesorId = session.rol === "Profesor" ? await profesorDeSesion(session) : null;

  return withTransaction(async (client) => {
    await withAuditUser(client, session.usuarioId);

    const turnoId = await repo.bloquearAsistencia(id, client);
    if (turnoId === null) throw new NotFoundError("la asistencia", id);
    const clase = (await repo.findClaseByTurnoId(turnoId, client)) as ClaseRow;

    if (session.rol === "Profesor") {
      if (clase.profesor_id !== profesorId) {
        throw turnoAjeno("Solo podés corregir la asistencia de tus propios turnos.");
      }
      if (!clase.dentro_plazo) {
        throw new BusinessRuleError(
          "PLAZO_CORRECCION_VENCIDO",
          `Pasaron más de ${clase.horas_correccion} horas desde el registro: solo el Gerente puede modificarlo.`,
        );
      }
    } else if (clase.dentro_plazo) {
      // La base se lo permitiría; la regla del negocio no.
      throw sinPermiso(
        `Dentro de las ${clase.horas_correccion} horas solo el Profesor puede corregir el registro.`,
      );
    } else if (!input.motivoCorreccion) {
      throw new ValidationError(
        "MOTIVO_CORRECCION_REQUERIDO",
        "Fuera del plazo de corrección hay que indicar el motivo de la modificación.",
        "motivoCorreccion",
      );
    }

    await repo.update(
      id,
      {
        presente: input.presente,
        temaTrabajado: input.temaTrabajado ?? null,
        observaciones: input.observaciones ?? null,
        // El motivo es del Gerente; si corrige el Profesor el trigger conserva el anterior.
        motivoCorreccion: session.rol === "Gerente" ? (input.motivoCorreccion ?? null) : null,
      },
      client,
    );

    return recargar(turnoId, client);
  });
}

/**
 * GET /api/alumnos/:id/historial-asistencia
 * Solo lectura. Mesa de Entrada y Gerente: cualquier alumno. Profesor: solo los
 * que atiende (`fn_profesor_atiende_alumno`).
 */
export async function historialAlumno(
  alumnoId: number,
  filtros: ListarHistorialQuery,
  session: Session,
): Promise<HistorialAsistenciaResponse> {
  if (!ROLES_LECTURA.includes(session.rol)) {
    throw sinPermiso(`Tu rol (${session.rol}) no puede consultar el historial de asistencia.`);
  }
  if (filtros.desde && filtros.hasta && filtros.hasta < filtros.desde) {
    throw new ValidationError(
      "RANGO_INVALIDO",
      "La fecha hasta no puede ser anterior a la fecha desde.",
      "hasta",
    );
  }
  if (!(await repo.existeAlumno(alumnoId))) {
    throw new NotFoundError("el alumno", alumnoId);
  }

  if (session.rol === "Profesor") {
    const profesorId = await profesorDeSesion(session);
    if (!(await repo.profesorAtiendeAlumno(profesorId, alumnoId))) {
      throw sinPermiso("Solo podés consultar el historial de los alumnos que atendés.");
    }
  }

  const [rows, resumen] = await Promise.all([
    repo.findHistorial(alumnoId, filtros),
    repo.resumen(alumnoId, filtros),
  ]);
  return mapper.historialToApi(rows, resumen);
}
