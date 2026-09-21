import type { MateriaResponse } from "@/contracts/materia";
import { withTransaction } from "@/lib/db/tx";
import { withAuditUser } from "@/lib/audit/audit";
import { BusinessRuleError, ConflictError, NotFoundError } from "@/lib/http/errors";
import type { FiltrosMateria, MateriaInput } from "./materia.types";
import * as repo from "./materia.repo";
import * as mapper from "./materia.mapper";

/**
 * Lista materias aplicando los filtros especificados (§Receta 2).
 */
export async function listar(filtros: FiltrosMateria = {}): Promise<MateriaResponse[]> {
  const rows = await repo.findAll(filtros);
  return mapper.toApiList(rows);
}

/**
 * Obtiene el detalle de una materia por su ID (§Receta 4).
 */
export async function obtener(id: number): Promise<MateriaResponse> {
  const row = await repo.findById(id);
  if (!row) {
    throw new NotFoundError("la materia", id);
  }
  return mapper.toApi(row);
}

export const obtenerPorId = obtener;

/**
 * Registra una nueva materia (§Receta 5).
 */
export async function crear(
  input: MateriaInput,
  usuarioId: number,
): Promise<MateriaResponse> {
  return withTransaction(async (client) => {
    // 1. Auditoría: primera línea siempre (§0.3 Regla 4, §2.11)
    await withAuditUser(client, usuarioId);

    // 2. Validar regla de unicidad de nombre en activas
    const duplicado = await repo.findActivoByNombre(input.nombre, undefined, client);
    if (duplicado) {
      throw new ConflictError(
        "NOMBRE_DUPLICADO",
        `Ya existe una materia activa con el nombre "${input.nombre}".`,
        "nombre",
      );
    }

    // 3. Escribir
    const row = await repo.insert(input, client);

    // 4. Mapear y responder
    return mapper.toApi(row);
  });
}

/**
 * Modifica una materia existente (§Receta 8).
 */
export async function editar(
  id: number,
  input: MateriaInput,
  usuarioId: number,
): Promise<MateriaResponse> {
  return withTransaction(async (client) => {
    // 1. Auditoría
    await withAuditUser(client, usuarioId);

    // 2. ¿Existe?
    const actual = await repo.findById(id, client);
    if (!actual) {
      throw new NotFoundError("la materia", id);
    }

    // 3. ¿Se puede editar en su estado actual?
    if (actual.estado === "inactivo") {
      throw new BusinessRuleError(
        "MATERIA_INACTIVA",
        "No se puede editar una materia inactiva. Reactivala primero.",
      );
    }

    // 4. Duplicados excluyéndose a sí mismo
    const duplicado = await repo.findActivoByNombre(input.nombre, id, client);
    if (duplicado) {
      throw new ConflictError(
        "NOMBRE_DUPLICADO",
        `Ya existe una materia activa con el nombre "${input.nombre}".`,
        "nombre",
      );
    }

    // 5. Actualizar
    const row = await repo.update(id, input, client);
    if (!row) {
      throw new NotFoundError("la materia", id);
    }

    return mapper.toApi(row);
  });
}

/**
 * Realiza la baja lógica de una materia (§Receta 9).
 */
export async function inactivar(
  id: number,
  usuarioId: number,
): Promise<MateriaResponse> {
  return withTransaction(async (client) => {
    // 1. Auditoría
    await withAuditUser(client, usuarioId);

    // 2. ¿Existe?
    const actual = await repo.findById(id, client);
    if (!actual) {
      throw new NotFoundError("la materia", id);
    }

    // 3. Idempotente: si ya está inactiva, devolver estado actual
    if (actual.estado === "inactivo") {
      return mapper.toApi(actual);
    }

    // 4. Verificar si tiene turnos futuros reservados
    const turnosFuturos = await repo.contarTurnosFuturos(id, client);
    if (turnosFuturos > 0) {
      throw new BusinessRuleError(
        "MATERIA_CON_TURNOS_FUTUROS",
        `No se puede dar de baja: tiene ${turnosFuturos} turno(s) futuro(s) reservado(s).`,
      );
    }

    // 5. Verificar si hay profesores que la dictan
    const profesoresAsignados = await repo.contarProfesoresAsignados(id, client);
    if (profesoresAsignados > 0) {
      throw new BusinessRuleError(
        "MATERIA_ASIGNADA",
        `No se puede dar de baja: tiene ${profesoresAsignados} profesor(es) asignado(s) que la dictan.`,
      );
    }

    // 6. Ejecutar baja lógica
    const row = await repo.inactivar(id, client);
    if (!row) {
      throw new NotFoundError("la materia", id);
    }

    return mapper.toApi(row);
  });
}
