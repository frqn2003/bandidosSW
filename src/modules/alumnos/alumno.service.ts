import type {
  AlumnoResponse,
  PosiblesDuplicadosQuery,
} from "@/contracts/alumno";
import { withTransaction } from "@/lib/db/tx";
import { withAuditUser } from "@/lib/audit/audit";
import {
  BusinessRuleError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@/lib/http/errors";
import { edadEnAnios } from "@/lib/formato";
import type {
  FiltrosAlumno,
  CrearAlumnoInputDto,
  EditarAlumnoInputDto,
} from "./alumno.types";
import * as repo from "./alumno.repo";
import * as mapper from "./alumno.mapper";

/**
 * Valida que un alumno menor de 18 años cuente con todos los datos de su responsable.
 */
function validarResponsableSiEsMenor(input: {
  fechaNacimiento: string;
  responsableNombre?: string | null;
  responsableDni?: string | null;
  responsableTelefono?: string | null;
}): void {
  if (edadEnAnios(input.fechaNacimiento) >= 18) return;

  const obligatorios = [
    ["responsableNombre", input.responsableNombre],
    ["responsableDni", input.responsableDni],
    ["responsableTelefono", input.responsableTelefono],
  ] as const;

  for (const [campo, valor] of obligatorios) {
    if (!valor || !valor.trim()) {
      throw new ValidationError(
        "RESPONSABLE_REQUERIDO",
        "Un alumno menor de edad necesita los datos del responsable.",
        campo,
      );
    }
  }
}

/**
 * Lista alumnos aplicando los filtros especificados.
 */
export async function listar(
  filtros: FiltrosAlumno = {},
): Promise<AlumnoResponse[]> {
  const rows = await repo.findAll(filtros);
  return mapper.toApiList(rows);
}

/**
 * Obtiene el detalle de un alumno por su ID.
 */
export async function obtener(id: number): Promise<AlumnoResponse> {
  const row = await repo.findById(id);
  if (!row) {
    throw new NotFoundError("el alumno", id);
  }
  return mapper.toApi(row);
}

export const obtenerPorId = obtener;

/**
 * Registra un nuevo alumno.
 */
export async function crear(
  input: CrearAlumnoInputDto,
  usuarioId: number,
): Promise<AlumnoResponse> {
  return withTransaction(async (client) => {
    // 1. Auditoría: primera línea siempre
    await withAuditUser(client, usuarioId);

    // 2. Validar que el responsable esté presente si el alumno es menor
    validarResponsableSiEsMenor(input);

    // 3. Validar regla de unicidad de DNI entre alumnos activos
    const chocado = await repo.findByDniActivo(input.dni, undefined, client);
    if (chocado) {
      throw new ConflictError(
        "DNI_DUPLICADO",
        `Ya existe el alumno ${chocado.legajo} con ese DNI.`,
        "dni",
        { id: chocado.id, legajo: chocado.legajo },
      );
    }

    // 4. Inserción
    const row = await repo.insert(input, client);

    // 5. Mapear y responder
    return mapper.toApi(row);
  });
}

/**
 * Modifica un alumno existente.
 */
export async function editar(
  id: number,
  input: EditarAlumnoInputDto,
  usuarioId: number,
): Promise<AlumnoResponse> {
  return withTransaction(async (client) => {
    // 1. Auditoría
    await withAuditUser(client, usuarioId);

    // 2. ¿Existe?
    const actual = await repo.findById(id, client);
    if (!actual) {
      throw new NotFoundError("el alumno", id);
    }

    // 3. ¿Se puede editar en su estado actual?
    if (actual.estado === "inactivo") {
      throw new BusinessRuleError(
        "ALUMNO_INACTIVO",
        "No se puede editar un alumno inactivo.",
      );
    }

    // 4. Validar responsable si es menor
    validarResponsableSiEsMenor(input);

    // 5. Validar unicidad de DNI excluyendo el propio ID
    const chocado = await repo.findByDniActivo(input.dni, id, client);
    if (chocado) {
      throw new ConflictError(
        "DNI_DUPLICADO",
        `Ya existe el alumno ${chocado.legajo} con ese DNI.`,
        "dni",
        { id: chocado.id, legajo: chocado.legajo },
      );
    }

    // 6. Actualizar
    const row = await repo.update(id, input, client);
    if (!row) {
      throw new NotFoundError("el alumno", id);
    }

    return mapper.toApi(row);
  });
}

/**
 * Realiza la baja lógica de un alumno.
 */
export async function inactivar(
  id: number,
  usuarioId: number,
): Promise<AlumnoResponse> {
  return withTransaction(async (client) => {
    // 1. Auditoría
    await withAuditUser(client, usuarioId);

    // 2. ¿Existe?
    const actual = await repo.findById(id, client);
    if (!actual) {
      throw new NotFoundError("el alumno", id);
    }

    // 3. Idempotente: si ya está inactivo, devolver estado actual
    if (actual.estado === "inactivo") {
      return mapper.toApi(actual);
    }

    // 4. Verificar si tiene turnos futuros reservados
    const turnosFuturos = await repo.contarTurnosFuturos(id, client);
    if (turnosFuturos > 0) {
      throw new BusinessRuleError(
        "ALUMNO_CON_TURNOS_FUTUROS",
        `No se puede dar de baja: el alumno tiene ${turnosFuturos} turno(s) futuro(s) reservado(s).`,
      );
    }

    // 5. Ejecutar baja lógica
    const row = await repo.inactivar(id, client);
    if (!row) {
      throw new NotFoundError("el alumno", id);
    }

    return mapper.toApi(row);
  });
}

/**
 * Consulta de aviso de posibles duplicados (nombre + apellido + fecha de nacimiento).
 */
export async function posiblesDuplicados(
  criterio: PosiblesDuplicadosQuery,
): Promise<AlumnoResponse[]> {
  const rows = await repo.findPosiblesDuplicados(
    criterio.nombre,
    criterio.apellido,
    criterio.fechaNacimiento,
  );
  return mapper.toApiList(rows);
}
