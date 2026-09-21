import type { BloqueDisponibilidadResponse, DiaSemana } from "@/contracts/disponibilidad";
import { withTransaction } from "@/lib/db/tx";
import { withAuditUser } from "@/lib/audit/audit";
import {
  BusinessRuleError,
  NotFoundError,
  ValidationError,
} from "@/lib/http/errors";
import type {
  FiltrosDisponibilidad,
  CrearBloqueInputDto,
  EditarBloqueInputDto,
} from "./disponibilidad.types";
import * as repo from "./disponibilidad.repo";
import * as mapper from "./disponibilidad.mapper";
import * as profesorRepo from "@/modules/profesores/profesor.repo";

const hhmm = (t: string) => t.slice(0, 5);

/**
 * Lista los bloques de disponibilidad del profesor.
 */
export async function listar(
  filtros: FiltrosDisponibilidad,
): Promise<BloqueDisponibilidadResponse[]> {
  const rows = await repo.findAll(filtros);
  return mapper.toApiList(rows);
}

/**
 * Obtiene el detalle de un bloque horario.
 */
export async function obtener(id: number): Promise<BloqueDisponibilidadResponse> {
  const row = await repo.findById(id);
  if (!row) {
    throw new NotFoundError("el bloque de disponibilidad", id);
  }
  return mapper.toApi(row);
}

/**
 * Registra un nuevo bloque horario dentro del horario de atención del centro (§Receta 5).
 */
export async function crear(
  input: CrearBloqueInputDto,
  usuarioId: number,
): Promise<BloqueDisponibilidadResponse> {
  return withTransaction(async (client) => {
    // 1. Auditoría (§0.3 Regla 4)
    await withAuditUser(client, usuarioId);

    // 2. Verificar existencia de la franja del centro
    const franja = await repo.buscarFranja(input.agendaSemanalId, client);
    if (!franja) {
      throw new ValidationError("REFERENCIA_INVALIDA", "La franja no existe.", "agendaSemanalId");
    }
    if (franja.estado !== "activo") {
      throw new ValidationError(
        "REFERENCIA_INVALIDA",
        "La franja semanal seleccionada está inactiva.",
        "agendaSemanalId",
      );
    }

    // 3. Validar rango dentro del horario de atención
    const frInicio = hhmm(franja.hora_inicio);
    const frFin = hhmm(franja.hora_fin);
    if (input.horaInicio < frInicio || input.horaFin > frFin) {
      throw new ValidationError(
        "FUERA_DE_HORARIO_ATENCION",
        `Ese día se atiende de ${frInicio} a ${frFin}.`,
        "horaInicio",
      );
    }

    // 4. Validar que el profesor pertenezca a la misma academia que la franja
    const profesor = await profesorRepo.findById(input.profesorId, client);
    if (!profesor) {
      throw new ValidationError("REFERENCIA_INVALIDA", "El profesor no existe.", "profesorId");
    }
    if (profesor.academia_id !== franja.academia_id) {
      throw new ValidationError(
        "PROFESOR_DE_OTRA_ACADEMIA",
        "Esa franja pertenece a otra sede/academia.",
        "agendaSemanalId",
      );
    }

    // 5. Inserción (la no-superposición la valida Postgres con EXCLUDE)
    const row = await repo.insert(input, client);
    return mapper.toApi(row);
  });
}

/**
 * Edita un bloque horario existente (§Receta 8).
 * Valida que no queden turnos futuros desprotegidos al modificar el horario.
 */
export async function editar(
  id: number,
  input: EditarBloqueInputDto,
  usuarioId: number,
): Promise<BloqueDisponibilidadResponse> {
  return withTransaction(async (client) => {
    await withAuditUser(client, usuarioId);

    const actual = await repo.findById(id, client);
    if (!actual) {
      throw new NotFoundError("el bloque de disponibilidad", id);
    }

    // Verificar si hay turnos reservados en el rango que se reduce o traslada
    const turnosAfectados = await repo.contarTurnosFuturosBloque(
      id,
      input.horaInicio,
      input.horaFin,
      client,
    );
    if (turnosAfectados > 0) {
      throw new BusinessRuleError(
        "BLOQUE_CON_TURNOS_FUTUROS",
        `No se puede modificar el bloque: hay ${turnosAfectados} turno(s) futuro(s) reservado(s) dentro del horario que estás quitando.`,
      );
    }

    const franja = await repo.buscarFranja(input.agendaSemanalId, client);
    if (!franja) {
      throw new ValidationError("REFERENCIA_INVALIDA", "La franja no existe.", "agendaSemanalId");
    }

    const frInicio = hhmm(franja.hora_inicio);
    const frFin = hhmm(franja.hora_fin);
    if (input.horaInicio < frInicio || input.horaFin > frFin) {
      throw new ValidationError(
        "FUERA_DE_HORARIO_ATENCION",
        `Ese día se atiende de ${frInicio} a ${frFin}.`,
        "horaInicio",
      );
    }

    const row = await repo.update(id, input, client);
    if (!row) {
      throw new NotFoundError("el bloque de disponibilidad", id);
    }

    return mapper.toApi(row);
  });
}

/**
 * Baja lógica de un bloque horario (§Receta 9).
 * Bloqueada si tiene turnos futuros reservados.
 */
export async function inactivar(
  id: number,
  usuarioId: number,
): Promise<BloqueDisponibilidadResponse> {
  return withTransaction(async (client) => {
    await withAuditUser(client, usuarioId);

    const actual = await repo.findById(id, client);
    if (!actual) {
      throw new NotFoundError("el bloque de disponibilidad", id);
    }

    if (actual.estado === "inactivo") {
      return mapper.toApi(actual);
    }

    // Validar que no tenga turnos reservados futuros
    const turnosAfectados = await repo.contarTurnosFuturosBloque(id, undefined, undefined, client);
    if (turnosAfectados > 0) {
      throw new BusinessRuleError(
        "BLOQUE_CON_TURNOS_FUTUROS",
        `No se puede dar de baja el bloque: hay ${turnosAfectados} turno(s) futuro(s) reservado(s) en ese horario.`,
      );
    }

    const row = await repo.inactivar(id, client);
    if (!row) {
      throw new NotFoundError("el bloque de disponibilidad", id);
    }

    return mapper.toApi(row);
  });
}

/**
 * Copia los bloques de disponibilidad de un día hacia uno o más días destino (Criterio opcional HU-PRO-01).
 */
export async function copiarDia(
  profesorId: number,
  diaOrigen: number,
  diasDestino: number[],
  usuarioId: number,
): Promise<BloqueDisponibilidadResponse[]> {
  return withTransaction(async (client) => {
    await withAuditUser(client, usuarioId);

    const profesor = await profesorRepo.findById(profesorId, client);
    if (!profesor || !profesor.academia_id) {
      throw new ValidationError("REFERENCIA_INVALIDA", "Profesor o academia inexistente.");
    }

    // Obtener bloques activos del día origen
    const bloquesOrigen = await repo.findAll(
      { profesorId, diaSemana: diaOrigen as DiaSemana, estado: "activo" },
      client,
    );

    if (bloquesOrigen.length === 0) {
      throw new ValidationError("DATOS_INVALIDOS", "El día de origen no tiene bloques horarios activos.");
    }

    const creados: BloqueDisponibilidadResponse[] = [];

    for (const diaDestino of diasDestino) {
      if (diaDestino === diaOrigen) continue;

      const franjaDestino = await repo.buscarFranjaDeAcademiaPorDia(
        profesor.academia_id,
        diaDestino,
        client,
      );

      if (!franjaDestino) {
        continue; // La academia no atiende ese día
      }

      for (const b of bloquesOrigen) {
        // Validar que el horario caiga dentro de la franja del día destino
        const frInicio = hhmm(franjaDestino.hora_inicio);
        const frFin = hhmm(franjaDestino.hora_fin);
        const hInicio = hhmm(b.hora_inicio);
        const hFin = hhmm(b.hora_fin);

        if (hInicio >= frInicio && hFin <= frFin) {
          const insertado = await repo.insert(
            {
              profesorId,
              agendaSemanalId: franjaDestino.id,
              horaInicio: hInicio,
              horaFin: hFin,
            },
            client,
          );
          creados.push(mapper.toApi(insertado));
        }
      }
    }

    return creados;
  });
}
