import type { Session } from "@/lib/auth/session";
import type {
  HuecoResponse,
  AgendaDiaResponse,
  HuecosQuery,
  AgendaQuery,
  CalendarioMesQuery,
  CalendarioMesResponse,
  DiaResumenMesResponse,
} from "@/contracts/calendario";
import { ForbiddenError, ValidationError } from "@/lib/http/errors";
import type { ProfesorInfoRow } from "./calendario.types";
import * as repo from "./calendario.repo";
import * as mapper from "./calendario.mapper";

function diasEntre(desde: string, hasta: string): number {
  const msPorDia = 1000 * 60 * 60 * 24;
  const d1 = new Date(desde + "T00:00:00Z");
  const d2 = new Date(hasta + "T00:00:00Z");
  return Math.round((d2.getTime() - d1.getTime()) / msPorDia);
}

function obtenerDiasSemanaEnRango(desde: string, hasta: string): number[] {
  const dias = new Set<number>();
  const curr = new Date(`${desde}T00:00:00Z`);
  const fin = new Date(`${hasta}T00:00:00Z`);
  while (curr <= fin) {
    const day = curr.getUTCDay();
    const isoDow = day === 0 ? 7 : day;
    dias.add(isoDow);
    curr.setUTCDate(curr.getUTCDate() + 1);
  }
  return Array.from(dias);
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

  return filtros.duracionMinutos
    ? lista.filter((h) => h.duracionMinutos >= filtros.duracionMinutos!)
    : lista;
}

/**
 * Consulta el resumen de cantidad de turnos por día para la vista mensual (§HU-CAL-02).
 */
export async function resumenMes(
  filtros: CalendarioMesQuery,
  session: Session,
): Promise<CalendarioMesResponse> {
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

  const mesStr = String(filtros.mes).padStart(2, "0");
  const desde = `${filtros.anio}-${mesStr}-01`;
  const ultimoDia = new Date(filtros.anio, filtros.mes, 0).getDate();
  const hasta = `${filtros.anio}-${mesStr}-${String(ultimoDia).padStart(2, "0")}`;

  const filas = await repo.contarTurnosPorDiaMes({
    desde,
    hasta,
    profesorId: filtros.profesorId,
    materiaId: filtros.materiaId,
    verCancelados: filtros.verCancelados,
  });

  const conteosMap = new Map(filas.map((f) => [f.fecha.slice(0, 10), f.cantidad_turnos]));
  const dias: DiaResumenMesResponse[] = [];
  for (let dia = 1; dia <= ultimoDia; dia++) {
    const diaStr = String(dia).padStart(2, "0");
    const fecha = `${filtros.anio}-${mesStr}-${diaStr}`;
    dias.push({
      fecha,
      cantidadTurnos: conteosMap.get(fecha) ?? 0,
    });
  }

  return {
    anio: filtros.anio,
    mes: filtros.mes,
    dias,
  };
}

/**
 * Consulta la agenda de turnos, bloques de disponibilidad y huecos para un día o rango semanal (§HU-CAL-02).
 */
export async function agenda(
  filtros: AgendaQuery,
  session: Session,
): Promise<AgendaDiaResponse> {
  const rolesPermitidos = ["Gerente", "Mesa de Entrada", "Profesor"];
  if (!rolesPermitidos.includes(session.rol)) {
    throw new ForbiddenError(`Tu rol (${session.rol}) no tiene permisos para ver el calendario.`);
  }

  const esProfesor = session.rol === "Profesor";
  if (esProfesor) {
    const profe = await repo.obtenerProfesorPorUsuarioId(session.usuarioId);
    if (!profe) {
      throw new ForbiddenError("El usuario no tiene una ficha de profesor asignada.");
    }
    if (filtros.profesorId !== undefined && filtros.profesorId !== profe.id) {
      throw new ForbiddenError("Solo podés consultar tu propio calendario.");
    }
    filtros.profesorId = profe.id;
  }

  const desde = filtros.fecha ?? filtros.desde!;
  const hasta = filtros.fecha ?? filtros.hasta!;

  if (desde > hasta) {
    throw new ValidationError(
      "RANGO_INVALIDO",
      "La fecha de fin no puede ser anterior a la de inicio.",
      "hasta",
    );
  }

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

  // 1. Obtener lista de profesores a incluir en la respuesta
  let profesoresVisibles: ProfesorInfoRow[] = [];
  let profesorUnico: ProfesorInfoRow | null = null;

  if (filtros.profesorId !== undefined) {
    profesorUnico = await repo.obtenerProfesor(filtros.profesorId);
    profesoresVisibles = profesorUnico ? [profesorUnico] : [];
  } else if (filtros.materiaId !== undefined) {
    profesoresVisibles = await repo.obtenerProfesoresActivosPorMateria(filtros.materiaId);
  } else {
    profesoresVisibles = await repo.obtenerProfesoresActivos();
  }

  const profesorIds = profesoresVisibles.map((p) => p.id);
  const diasSemana = obtenerDiasSemanaEnRango(desde, hasta);

  // 2. Consultas en paralelo
  const [bloques, turnos, filasHuecos] = await Promise.all([
    repo.bloquesEnRango(profesorIds, diasSemana),
    repo.turnosEnRango({
      desde,
      hasta,
      profesorId: filtros.profesorId,
      materiaId: filtros.materiaId,
      verCancelados: filtros.verCancelados,
    }),
    diasEntre(desde, hasta) <= 60
      ? repo.huecos({
          desde,
          hasta,
          profesorId: filtros.profesorId,
          materiaId: filtros.materiaId,
        })
      : Promise.resolve([]),
  ]);

  return mapper.agendaToApi(
    profesorUnico,
    profesoresVisibles,
    desde,
    bloques,
    turnos,
    filasHuecos,
    esProfesor,
  );
}

/**
 * Consulta la agenda completa de un día: profesor, bloques de disponibilidad,
 * turnos reservados y huecos libres (§HU-CAL-01). Mantenido por compatibilidad.
 */
export async function agendaDelDia(
  profesorId: number,
  fecha: string,
  session: Session,
): Promise<AgendaDiaResponse> {
  return agenda({ profesorId, fecha, verCancelados: false }, session);
}
