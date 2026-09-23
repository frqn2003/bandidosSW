import type { Session } from "@/lib/auth/session";
import type {
  HuecoResponse,
  AgendaDiaResponse,
  HuecosQuery,
} from "@/contracts/calendario";
import { ForbiddenError, ValidationError } from "@/lib/http/errors";
import * as repo from "./calendario.repo";
import * as mapper from "./calendario.mapper";

function diasEntre(desde: string, hasta: string): number {
  const msPorDia = 1000 * 60 * 60 * 24;
  const d1 = new Date(desde + "T00:00:00Z");
  const d2 = new Date(hasta + "T00:00:00Z");
  return Math.round((d2.getTime() - d1.getTime()) / msPorDia);
}

/**
 * Consulta los huecos disponibles en un rango de fechas (§HU-CAL-01).
 * La vista proyecta hasta 60 días.
 */
export async function huecos(
  filtros: HuecosQuery,
  session: Session,
): Promise<HuecoResponse[]> {
  const rolesPermitidos = ["Gerente", "Mesa de Entrada", "Profesor"];
  if (!rolesPermitidos.includes(session.rol)) {
    throw new ForbiddenError(`Tu rol (${session.rol}) no tiene permisos para ver el calendario.`);
  }

  // Restricción por rol: Profesor visualiza únicamente su propio calendario
  if (session.rol === "Profesor") {
    const profe = await repo.obtenerProfesorPorUsuarioId(session.usuarioId);
    if (!profe) {
      throw new ForbiddenError("El usuario no tiene una ficha de profesor asignada.");
    }
    if (filtros.profesorId !== undefined && filtros.profesorId !== profe.id) {
      throw new ForbiddenError("Solo podés consultar tu propio calendario.");
    }
    filtros.profesorId = profe.id;
  }

  // Validar rango máximo de 60 días
  if (diasEntre(filtros.desde, filtros.hasta) > 60) {
    throw new ValidationError(
      "RANGO_DEMASIADO_AMPLIO",
      "El calendario proyecta hasta 60 días.",
      "hasta",
    );
  }

  // Validar existencia de referencias
  if (filtros.profesorId !== undefined) {
    const existe = await repo.obtenerProfesor(filtros.profesorId);
    if (!existe) {
      throw new ValidationError(
        "REFERENCIA_INVALIDA",
        "El profesor no existe.",
        "profesorId",
      );
    }
  }

  if (filtros.materiaId !== undefined) {
    const existe = await repo.existeMateria(filtros.materiaId);
    if (!existe) {
      throw new ValidationError(
        "REFERENCIA_INVALIDA",
        "La materia no existe.",
        "materiaId",
      );
    }
  }

  const filas = await repo.huecos(filtros);
  const lista = filas.map(mapper.huecoToApi);

  // El filtro por duración se aplica en el service para que el mismo
  // endpoint sirva con y sin materia elegida.
  return filtros.duracionMinutos
    ? lista.filter((h) => h.duracionMinutos >= filtros.duracionMinutos!)
    : lista;
}

/**
 * Consulta la agenda completa de un día: profesor, bloques de disponibilidad,
 * turnos reservados y huecos libres (§HU-CAL-01).
 */
export async function agendaDelDia(
  profesorId: number,
  fecha: string,
  session: Session,
): Promise<AgendaDiaResponse> {
  const rolesPermitidos = ["Gerente", "Mesa de Entrada", "Profesor"];
  if (!rolesPermitidos.includes(session.rol)) {
    throw new ForbiddenError(`Tu rol (${session.rol}) no tiene permisos para ver el calendario.`);
  }

  // Restricción por rol: Profesor visualiza únicamente su propio calendario
  if (session.rol === "Profesor") {
    const profe = await repo.obtenerProfesorPorUsuarioId(session.usuarioId);
    if (!profe || profe.id !== profesorId) {
      throw new ForbiddenError("Solo podés consultar tu propio calendario.");
    }
  }

  const profesor = await repo.obtenerProfesor(profesorId);
  if (!profesor) {
    throw new ValidationError(
      "REFERENCIA_INVALIDA",
      "El profesor no existe.",
      "profesorId",
    );
  }

  const diaSemana = await repo.obtenerDiaSemanaIso(fecha);

  const [bloques, turnos, filasHuecos] = await Promise.all([
    repo.bloquesDelDia(profesorId, diaSemana),
    repo.turnosDelDia(profesorId, fecha),
    repo.huecos({ profesorId, desde: fecha, hasta: fecha }),
  ]);

  return mapper.agendaDiaToApi(profesor, fecha, bloques, turnos, filasHuecos);
}
