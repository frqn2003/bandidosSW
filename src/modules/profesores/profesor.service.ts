import type {
  ProfesorResponse,
} from "@/contracts/profesor";
import { withTransaction } from "@/lib/db/tx";
import { withAuditUser } from "@/lib/audit/audit";
import {
  BusinessRuleError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@/lib/http/errors";
import type {
  FiltrosProfesor,
  CrearProfesorInputDto,
  EditarProfesorInputDto,
} from "./profesor.types";
import * as repo from "./profesor.repo";
import * as mapper from "./profesor.mapper";

/**
 * Lista profesores con filtros combinables y orden Apellido, Nombre A-Z.
 */
export async function listar(
  filtros: FiltrosProfesor = {},
): Promise<ProfesorResponse[]> {
  const rows = await repo.findAll(filtros);
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const materiasMap = await repo.findMateriasDeProfesores(ids);

  return rows.map((row) => {
    const mats = (materiasMap.get(row.id) ?? []).map(mapper.materiaToApi);
    return mapper.toApi(row, mats);
  });
}

/**
 * Obtiene el detalle de un profesor por su ID.
 */
export async function obtener(id: number): Promise<ProfesorResponse> {
  const row = await repo.findById(id);
  if (!row) {
    throw new NotFoundError("el profesor", id);
  }

  const materiasMap = await repo.findMateriasDeProfesores([id]);
  const mats = (materiasMap.get(id) ?? []).map(mapper.materiaToApi);

  return mapper.toApi(row, mats);
}

/**
 * Obtiene los usuarios activos con rol "Profesor" disponibles para asignar ficha.
 */
export async function candidatos() {
  const rows = await repo.findCandidatos();
  return rows.map(mapper.toCandidatoApi);
}

/**
 * Registra un nuevo profesor con sus materias y precios (§Receta 5/6).
 */
export async function crear(
  input: CrearProfesorInputDto,
  usuarioId: number,
): Promise<ProfesorResponse> {
  return withTransaction(async (client) => {
    // 1. Auditoría: primera línea siempre (§0.3 Regla 4)
    await withAuditUser(client, usuarioId);

    // 2. Validar que el usuario existe y cumple las condiciones
    const usuario = await repo.buscarUsuario(input.usuarioId, client);
    if (!usuario) {
      throw new ValidationError("REFERENCIA_INVALIDA", "El usuario no existe.", "usuarioId");
    }
    if (usuario.rol_nombre.toLowerCase() !== "profesor") {
      throw new ValidationError(
        "USUARIO_NO_ES_PROFESOR",
        "El usuario no tiene rol Profesor.",
        "usuarioId",
      );
    }
    if (usuario.estado !== "activo") {
      throw new ValidationError("USUARIO_INACTIVO", "El usuario está inactivo.", "usuarioId");
    }
    if (usuario.academia_id === null) {
      throw new ValidationError(
        "USUARIO_SIN_ACADEMIA",
        "El usuario no tiene academia asignada.",
        "usuarioId",
      );
    }

    // 3. Comprobar que no tenga ya ficha de profesor (usuario_id UNIQUE)
    if (await repo.existeFichaDe(input.usuarioId, client)) {
      throw new ConflictError(
        "USUARIO_YA_ES_PROFESOR",
        "Ese usuario ya tiene ficha de profesor.",
        "usuarioId",
      );
    }

    // 4. Validar materias sin duplicados
    const ids = input.materias.map((m) => m.materiaId);
    if (new Set(ids).size !== ids.length) {
      throw new ValidationError(
        "MATERIA_DUPLICADA",
        "Hay una materia repetida en la lista.",
        "materias",
      );
    }

    // 5. Inserción de cabecera y líneas en la misma transacción
    const row = await repo.insert(input, client);
    const materiasRows = await repo.reemplazarMaterias(row.id, input.materias, client);

    const mats = materiasRows.map(mapper.materiaToApi);
    return mapper.toApi(row, mats);
  });
}

/**
 * Edita los datos profesionales y actualiza la lista de materias dictadas (§Receta 8).
 */
export async function editar(
  id: number,
  input: EditarProfesorInputDto,
  usuarioId: number,
): Promise<ProfesorResponse> {
  return withTransaction(async (client) => {
    await withAuditUser(client, usuarioId);

    const actual = await repo.findById(id, client);
    if (!actual) {
      throw new NotFoundError("el profesor", id);
    }

    // Validar materias sin duplicados
    const ids = input.materias.map((m) => m.materiaId);
    if (new Set(ids).size !== ids.length) {
      throw new ValidationError(
        "MATERIA_DUPLICADA",
        "Hay una materia repetida en la lista.",
        "materias",
      );
    }

    const row = await repo.update(id, input, client);
    if (!row) {
      throw new NotFoundError("el profesor", id);
    }

    const materiasRows = await repo.reemplazarMaterias(id, input.materias, client);
    const mats = materiasRows.map(mapper.materiaToApi);

    return mapper.toApi(row, mats);
  });
}

/**
 * Baja lógica de un profesor (§Receta 9).
 * Bloqueada si tiene turnos futuros reservados.
 */
export async function inactivar(
  id: number,
  usuarioId: number,
): Promise<ProfesorResponse> {
  return withTransaction(async (client) => {
    await withAuditUser(client, usuarioId);

    const actual = await repo.findById(id, client);
    if (!actual) {
      throw new NotFoundError("el profesor", id);
    }

    if (actual.estado === "inactivo") {
      const materiasMap = await repo.findMateriasDeProfesores([id], client);
      const mats = (materiasMap.get(id) ?? []).map(mapper.materiaToApi);
      return mapper.toApi(actual, mats);
    }

    // Validar que no tenga turnos futuros reservados
    const turnosFuturos = await repo.contarTurnosFuturos(id, client);
    if (turnosFuturos > 0) {
      throw new BusinessRuleError(
        "PROFESOR_CON_TURNOS_FUTUROS",
        `No se puede dar de baja: el profesor tiene ${turnosFuturos} turno(s) futuro(s) reservado(s).`,
      );
    }

    const row = await repo.inactivar(id, client);
    if (!row) {
      throw new NotFoundError("el profesor", id);
    }

    const materiasMap = await repo.findMateriasDeProfesores([id], client);
    const mats = (materiasMap.get(id) ?? []).map(mapper.materiaToApi);

    return mapper.toApi(row, mats);
  });
}
