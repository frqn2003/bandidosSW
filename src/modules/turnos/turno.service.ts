import type { Session } from "@/lib/auth/session";
import type {
  TurnoResponse,
  ListarTurnosQuery,
  CrearTurnoInput,
  EditarTurnoInput,
} from "@/contracts/turno";
import { withTransaction } from "@/lib/db/tx";
import { withAuditUser } from "@/lib/audit/audit";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/lib/http/errors";
import * as repo from "./turno.repo";
import * as mapper from "./turno.mapper";

function sumarMinutos(hora: string, minutos: number): string {
  const [hh, mm] = hora.slice(0, 5).split(":").map(Number);
  const total = hh * 60 + mm + minutos;
  const nuevoH = Math.floor(total / 60) % 24;
  const nuevoM = total % 60;
  return `${String(nuevoH).padStart(2, "0")}:${String(nuevoM).padStart(2, "0")}`;
}

function faltanMenosDe(horasMinimas: number, fecha: string, hora: string): boolean {
  const ahora = new Date();
  const [hh, mm] = hora.slice(0, 5).split(":").map(Number);
  const [y, m, d] = fecha.split("-").map(Number);
  const fechaTurno = new Date(y, m - 1, d, hh, mm, 0);
  const diffHoras = (fechaTurno.getTime() - ahora.getTime()) / (1000 * 60 * 60);
  return diffHoras < horasMinimas;
}

function yaOcurrio(fecha: string, hora: string): boolean {
  const ahora = new Date();
  const [hh, mm] = hora.slice(0, 5).split(":").map(Number);
  const [y, m, d] = fecha.split("-").map(Number);
  const fechaTurno = new Date(y, m - 1, d, hh, mm, 0);
  return fechaTurno.getTime() < ahora.getTime();
}

/**
 * Lista los turnos aplicando filtros y restricciones por rol (§HU-CAL-01).
 */
export async function listar(
  filtros: ListarTurnosQuery,
  session: Session,
): Promise<TurnoResponse[]> {
  const rolesPermitidos = ["Gerente", "Mesa de Entrada", "Profesor"];
  if (!rolesPermitidos.includes(session.rol)) {
    throw new ForbiddenError(`Tu rol (${session.rol}) no tiene permisos para ver turnos.`);
  }

  // Restricción por rol: Profesor visualiza únicamente sus propios turnos
  if (session.rol === "Profesor") {
    const profeActual = await repo.obtenerProfesorPorUsuarioId(session.usuarioId);
    if (!profeActual) {
      throw new ForbiddenError("El usuario no tiene una ficha de profesor asignada.");
    }
    if (filtros.profesorId !== undefined && filtros.profesorId !== profeActual.id) {
      throw new ForbiddenError("Solo podés consultar tus propios turnos.");
    }
    filtros.profesorId = profeActual.id;
  }

  const rows = await repo.findAll(filtros);
  return mapper.toApiList(rows);
}

/**
 * Obtiene el detalle de un turno por su ID (modo LECTURA §HU-TUR-02).
 */
export async function obtener(
  id: number,
  session: Session,
): Promise<TurnoResponse> {
  const rolesPermitidos = ["Gerente", "Mesa de Entrada", "Profesor"];
  if (!rolesPermitidos.includes(session.rol)) {
    throw new ForbiddenError(`Tu rol (${session.rol}) no tiene permisos para ver turnos.`);
  }

  const row = await repo.findById(id);
  if (!row) {
    throw new NotFoundError("el turno", id);
  }

  if (session.rol === "Profesor") {
    const profeActual = await repo.obtenerProfesorPorUsuarioId(session.usuarioId);
    if (!profeActual || row.profesor_id !== profeActual.id) {
      throw new ForbiddenError("No podés ver turnos de otros profesores.");
    }
  }

  return mapper.toApi(row);
}

/**
 * Registra una nueva reserva de turno (§HU-TUR-01 / §HU-CAL-01).
 */
export async function reservar(
  input: CrearTurnoInput,
  usuarioId: number,
  session: Session,
): Promise<TurnoResponse> {
  const rolesPermitidos = ["Gerente", "Mesa de Entrada"];
  if (!rolesPermitidos.includes(session.rol)) {
    throw new ForbiddenError("Los profesores no pueden registrar reservas de turnos.");
  }

  return withTransaction(async (client) => {
    await withAuditUser(client, usuarioId);

      // 1. Validar existencia y estado de alumno, profesor y materia
      const estados = await repo.buscarEstadoEntidades(
        input.alumnoId,
        input.profesorId,
        input.materiaId,
        client,
      );

      if (estados.alumnoEstado === null) {
        throw new ValidationError("REFERENCIA_INVALIDA", "El alumno no existe.", "alumnoId");
      }
      if (estados.alumnoEstado !== "activo") {
        throw new ValidationError("ALUMNO_INACTIVO", "El alumno seleccionado está inactivo.", "alumnoId");
      }

      if (estados.profesorEstado === null) {
        throw new ValidationError("REFERENCIA_INVALIDA", "El profesor no existe.", "profesorId");
      }
      if (estados.profesorEstado !== "activo") {
        throw new ValidationError("PROFESOR_INACTIVO", "El profesor seleccionado está inactivo.", "profesorId");
      }

      if (estados.materiaEstado === null) {
        throw new ValidationError("REFERENCIA_INVALIDA", "La materia no existe.", "materiaId");
      }
      if (estados.materiaEstado !== "activo") {
        throw new ValidationError("MATERIA_INACTIVA", "La materia seleccionada está inactiva.", "materiaId");
      }

      // 1b. Nivel educativo: el alumno solo puede cursar materias de su mismo nivel educativo
      if (
        estados.alumnoNivelEducativo &&
        estados.materiaNivel &&
        estados.alumnoNivelEducativo !== estados.materiaNivel
      ) {
        throw new ValidationError(
          "NIVEL_EDUCATIVO_INCOMPATIBLE",
          `El alumno (${estados.alumnoNivelEducativo}) no puede reservar clases de materias de nivel ${estados.materiaNivel}.`,
          "materiaId",
        );
      }

      // 2. Profesor debe dictar la materia
      const pm = await repo.buscarProfesorMateria(input.profesorId, input.materiaId, client);
      if (!pm) {
        throw new ValidationError(
          "PROFESOR_NO_DICTA_MATERIA",
          "El profesor no dicta esa materia.",
          "materiaId",
        );
      }

      // 3. Precio vigente
      const precio = await repo.precioVigente(pm.id, client);
      if (precio === null) {
        throw new ValidationError(
          "PRECIO_NO_DEFINIDO",
          "No hay precio cargado para ese profesor y esa materia.",
          "materiaId",
        );
      }

      // 4. Calcular horaFin con la duración de la materia
      const horaFin = sumarMinutos(input.horaInicio, pm.duracion_clase_minutos);

      // 5. Anticipación mínima de 2 horas
      if (faltanMenosDe(2, input.fecha, input.horaInicio)) {
        throw new ValidationError(
          "ANTICIPACION_INSUFICIENTE",
          "El turno se tiene que reservar con al menos 2 horas de anticipación.",
          "horaInicio",
        );
      }

      // 6. El horario debe caer en un bloque de disponibilidad activo del profesor
      const enDisponibilidad = await repo.hayDisponibilidad(
        input.profesorId,
        input.fecha,
        input.horaInicio,
        horaFin,
        client,
      );
      if (!enDisponibilidad) {
        throw new ValidationError(
          "FUERA_DE_DISPONIBILIDAD",
          "El profesor no atiende en ese horario.",
          "horaInicio",
        );
      }

      // 7. Cupo del profesor con bloqueo FOR UPDATE
      const ocupados = await repo.contarOcupadosBloqueando(
        input.profesorId,
        input.fecha,
        input.horaInicio,
        horaFin,
        client,
      );
      if (ocupados >= pm.capacidad_maxima) {
        throw new ConflictError("SIN_CUPO", "No quedan lugares en ese horario.");
      }

      // 8. Inserción (la superposición del alumno la valida el constraint EXCLUDE de Postgres)
      const row = await repo.insert(
        { ...input, horaFin, valorClaseCongelado: precio },
        usuarioId,
        client,
      );

      return mapper.toApi(row);
    });
}

/**
 * Reprograma un turno existente (§HU-TUR-01).
 */
export async function reprogramar(
  id: number,
  input: EditarTurnoInput,
  usuarioId: number,
  session: Session,
): Promise<TurnoResponse> {
  const rolesPermitidos = ["Gerente", "Mesa de Entrada"];
  if (!rolesPermitidos.includes(session.rol)) {
    throw new ForbiddenError("Los profesores no pueden reprogramar turnos.");
  }

  return withTransaction(async (client) => {
    await withAuditUser(client, usuarioId);

    const actual = await repo.findById(id, client);
    if (!actual) {
      throw new NotFoundError("el turno", id);
    }

    if (actual.estado === "Cancelado") {
      throw new ConflictError("TURNO_YA_CANCELADO", "No se puede reprogramar un turno cancelado.");
    }

    if (yaOcurrio(actual.fecha, actual.hora_inicio)) {
      throw new ConflictError("TURNO_PASADO", "No se puede reprogramar un turno que ya ocurrió.");
    }

    const pm = await repo.buscarProfesorMateria(actual.profesor_id, actual.materia_id, client);
    if (!pm) {
      throw new ValidationError("PROFESOR_NO_DICTA_MATERIA", "El profesor no dicta esa materia.", "horaInicio");
    }

    const horaFin = sumarMinutos(input.horaInicio, pm.duracion_clase_minutos);

    if (faltanMenosDe(2, input.fecha, input.horaInicio)) {
      throw new ValidationError(
        "ANTICIPACION_INSUFICIENTE",
        "El turno se tiene que reprogramar con al menos 2 horas de anticipación.",
        "horaInicio",
      );
    }

    const enDisponibilidad = await repo.hayDisponibilidad(
      actual.profesor_id,
      input.fecha,
      input.horaInicio,
      horaFin,
      client,
    );
    if (!enDisponibilidad) {
      throw new ValidationError(
        "FUERA_DE_DISPONIBILIDAD",
        "El profesor no atiende en ese horario.",
        "horaInicio",
      );
    }

    const ocupados = await repo.contarOcupadosBloqueando(
      actual.profesor_id,
      input.fecha,
      input.horaInicio,
      horaFin,
      client,
      id,
    );
    if (ocupados >= pm.capacidad_maxima) {
      throw new ConflictError("SIN_CUPO", "No quedan lugares en ese horario.");
    }

    const row = await repo.updateReprogramar(
      id,
      input.fecha,
      input.horaInicio,
      horaFin,
      input.observaciones,
      client,
    );

    return mapper.toApi(row);
  });
}

/**
 * Cancela un turno (§HU-TUR-01 / §HU-CAL-01). No se borra físicamente.
 */
export async function cancelar(
  id: number,
  usuarioId: number,
  session: Session,
): Promise<TurnoResponse> {
  const rolesPermitidos = ["Gerente", "Mesa de Entrada"];
  if (!rolesPermitidos.includes(session.rol)) {
    throw new ForbiddenError("Los profesores no pueden cancelar turnos.");
  }

  return withTransaction(async (client) => {
    await withAuditUser(client, usuarioId);

    const actual = await repo.findById(id, client);
    if (!actual) {
      throw new NotFoundError("el turno", id);
    }

    if (actual.estado === "Cancelado") {
      throw new ConflictError("TURNO_YA_CANCELADO", "El turno ya se encuentra cancelado.");
    }

    if (yaOcurrio(actual.fecha, actual.hora_inicio)) {
      throw new ConflictError("TURNO_PASADO", "No se puede cancelar un turno que ya ocurrió.");
    }

    const row = await repo.cancelar(id, client);
    return mapper.toApi(row);
  });
}
