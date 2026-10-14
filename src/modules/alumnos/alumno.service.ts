import { randomInt } from "node:crypto";
import type {
  AlumnoResponse,
  HabilitarPortalResponse,
  PosiblesDuplicadosQuery,
} from "@/contracts/alumno";
import { withTransaction } from "@/lib/db/tx";
import { withAuditUser } from "@/lib/audit/audit";
import {
  BusinessRuleError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ServicioAuthNoDisponibleError,
  ValidationError,
} from "@/lib/http/errors";
import { crearUsuarioAuth, eliminarUsuarioAuth } from "@/lib/auth/gotrue";
import { enviarPasswordTemporal } from "@/lib/email";
import * as usuarioRepo from "@/modules/usuarios/usuario.repo";
import { edadEnAnios } from "@/funciones/formato";
import type {
  FiltrosAlumno,
  CrearAlumnoInputDto,
  EditarAlumnoInputDto,
} from "./alumno.types";
import * as repo from "./alumno.repo";
import * as mapper from "./alumno.mapper";

/**
 * Valida que un alumno menor de 18 años cuente con todos los datos de su responsable.
 * Mayor de 18 años: regla "todo o nada" (o los tres nulos o los tres completos).
 */
function validarResponsable(input: {
  fechaNacimiento: string;
  responsableNombre?: string | null;
  responsableDni?: string | null;
  responsableTelefono?: string | null;
}): void {
  const esMenor = edadEnAnios(input.fechaNacimiento) < 18;
  const obligatorios = [
    ["responsableNombre", input.responsableNombre],
    ["responsableDni", input.responsableDni],
    ["responsableTelefono", input.responsableTelefono],
  ] as const;

  if (esMenor) {
    for (const [campo, valor] of obligatorios) {
      if (!valor || !valor.trim()) {
        throw new ValidationError(
          "RESPONSABLE_REQUERIDO",
          "Un alumno menor de edad necesita los datos completos del responsable.",
          campo,
        );
      }
    }
  } else {
    const cargados = obligatorios.filter(([, valor]) => Boolean(valor && valor.trim()));
    if (cargados.length > 0 && cargados.length < 3) {
      const faltante = obligatorios.find(([, valor]) => !valor || !valor.trim())!;
      throw new ValidationError(
        "DATOS_INVALIDOS",
        "Si se cargan datos del responsable para un mayor de edad, deben completarse nombre, DNI y teléfono.",
        faltante[0],
      );
    }
  }
}

/**
 * Lista alumnos aplicando los filtros especificados sin problema de N+1 (Receta 15).
 */
export async function listar(
  filtros: FiltrosAlumno = {},
): Promise<AlumnoResponse[]> {
  const rows = await repo.findAll(filtros);
  const ids = rows.map((r) => r.id);
  const [materiasMapa, deudasSet, turnosFuturosMapa] = await Promise.all([
    repo.materiasInteresDe(ids),
    repo.deudaPendienteDe(ids),
    repo.turnosFuturosDe(ids),
  ]);

  return mapper.toApiList(rows, materiasMapa, deudasSet, turnosFuturosMapa);
}

/**
 * Obtiene el detalle de la ficha completa de un alumno por su ID.
 */
export async function obtener(id: number): Promise<AlumnoResponse> {
  const row = await repo.findById(id);
  if (!row) {
    throw new NotFoundError("el alumno", id);
  }

  const [materias, deuda, turnosFuturosMap] = await Promise.all([
    repo.materiasInteresDeAlumno(id),
    repo.tieneDeudaPendiente(id),
    repo.turnosFuturosDe([id]),
  ]);

  return mapper.toApi(row, materias, deuda, turnosFuturosMap.get(id) ?? []);
}

export const obtenerPorId = obtener;

/**
 * Registra un nuevo alumno (HU-ALU-01 / HU-ALU-02).
 */
export async function crear(
  input: CrearAlumnoInputDto,
  usuarioId: number,
): Promise<AlumnoResponse> {
  return withTransaction(async (client) => {
    // 1. Auditoría: primera línea siempre
    await withAuditUser(client, usuarioId);

    // 2. Validar responsable según edad
    validarResponsable(input);

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

    // 4. Validar materias de interés (deben ser materias activas)
    const materiasIds = input.materiasInteresIds ?? [];
    if (materiasIds.length > 0) {
      const materiasConsultadas = await repo.consultarMateriasPorIds(materiasIds, client);
      const mapaEstado = new Map(materiasConsultadas.map((m) => [m.id, m.estado]));
      for (const mid of materiasIds) {
        const estado = mapaEstado.get(mid);
        if (!estado || estado !== "activo") {
          throw new ValidationError(
            "MATERIA_INTERES_INACTIVA",
            "Una o más materias de interés seleccionadas no existen o no están activas.",
            "materiasInteresIds",
          );
        }
      }
    }

    // 5. Inserción del alumno
    const row = await repo.insert(input, client);

    // 6. Asignar materias de interés
    await repo.reemplazarMateriasInteres(row.id, materiasIds, client);

    // 7. Leer materias asignadas
    const materias = await repo.materiasInteresDeAlumno(row.id, client);

    return mapper.toApi(row, materias, false);
  });
}

/**
 * Modifica la ficha completa de un alumno existente (HU-ALU-02).
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
        "No se puede editar un alumno inactivo. Reactivalo primero.",
      );
    }

    // 4. Validar datos del responsable reevaluando la fecha de nacimiento
    validarResponsable(input);

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

    // 6. Validar que solo las materias de interés NUEVAS estén activas en el catálogo
    const materiasIds = input.materiasInteresIds ?? [];
    const materiasActuales = await repo.obtenerMateriasInteresIdsDeAlumno(id, client);
    const actualesSet = new Set(materiasActuales);
    const nuevasIds = materiasIds.filter((mid) => !actualesSet.has(mid));

    if (nuevasIds.length > 0) {
      const materiasConsultadas = await repo.consultarMateriasPorIds(nuevasIds, client);
      const mapaEstado = new Map(materiasConsultadas.map((m) => [m.id, m.estado]));
      for (const mid of nuevasIds) {
        const estado = mapaEstado.get(mid);
        if (!estado || estado !== "activo") {
          throw new ValidationError(
            "MATERIA_INTERES_INACTIVA",
            "Solo se pueden asociar nuevas materias de interés que se encuentren activas en el catálogo.",
            "materiasInteresIds",
          );
        }
      }
    }

    // 7. Actualizar datos de la ficha
    const row = await repo.update(id, input, client);
    if (!row) {
      throw new NotFoundError("el alumno", id);
    }

    // 8. Reemplazar materias de interés
    await repo.reemplazarMateriasInteres(id, materiasIds, client);

    // 9. Releer materias, deuda y turnos futuros
    const [materias, deuda, turnosFuturosMap] = await Promise.all([
      repo.materiasInteresDeAlumno(id, client),
      repo.tieneDeudaPendiente(id, client),
      repo.turnosFuturosDe([id], client),
    ]);

    return mapper.toApi(row, materias, deuda, turnosFuturosMap.get(id) ?? []);
  });
}

/**
 * Realiza la baja lógica de un alumno (HU-ALU-02).
 * Valida que no tenga turnos futuros reservados y gestiona advertencia de deuda pendiente.
 */
export async function inactivar(
  id: number,
  usuarioId: number,
  confirmarConDeuda: boolean = false,
): Promise<AlumnoResponse> {
  return withTransaction(async (client) => {
    // 1. Auditoría
    await withAuditUser(client, usuarioId);

    // 2. ¿Existe?
    const actual = await repo.findById(id, client);
    if (!actual) {
      throw new NotFoundError("el alumno", id);
    }

    // 3. Si ya está inactivo, rechazar con ALUMNO_YA_INACTIVO
    if (actual.estado === "inactivo") {
      throw new ConflictError(
        "ALUMNO_YA_INACTIVO",
        "El alumno ya se encuentra inactivo.",
      );
    }

    // 4. Bloqueo duro si el alumno tiene turnos futuros reservados
    const turnosFuturos = await repo.contarTurnosFuturos(id, client);
    if (turnosFuturos > 0) {
      throw new ConflictError(
        "ALUMNO_CON_TURNOS_FUTUROS",
        `No se puede dar de baja: el alumno tiene ${turnosFuturos} turno(s) futuro(s) reservado(s).`,
        undefined,
        { cantidadTurnosFuturos: turnosFuturos },
      );
    }

    // 5. Advertencia por deuda pendiente si no se confirmó explícitamente
    const tieneDeuda = await repo.tieneDeudaPendiente(id, client);
    if (tieneDeuda && !confirmarConDeuda) {
      throw new ConflictError(
        "ALUMNO_CON_DEUDA",
        "El alumno posee clases dictadas pendientes de pago.",
        undefined,
        { deudaPendiente: true },
      );
    }

    // 6. Ejecutar baja lógica
    const row = await repo.inactivar(id, client);
    if (!row) {
      throw new NotFoundError("el alumno", id);
    }

    // 7. Cargar materias y responder
    const materias = await repo.materiasInteresDeAlumno(id, client);
    return mapper.toApi(row, materias, tieneDeuda);
  });
}

/**
 * Reactiva un alumno inactivo validando unicidad de DNI (HU-ALU-02).
 */
export async function reactivar(
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

    // 3. ¿Ya está activo?
    if (actual.estado === "activo") {
      throw new ConflictError(
        "ALUMNO_YA_ACTIVO",
        "El alumno ya se encuentra activo.",
      );
    }

    // 4. Revalidar unicidad de DNI contra alumnos actualmente activos
    const chocado = await repo.findByDniActivo(actual.dni, id, client);
    if (chocado) {
      throw new ConflictError(
        "DNI_DUPLICADO",
        `No se puede reactivar: ya existe un alumno activo (${chocado.legajo}) con el DNI ${actual.dni}.`,
        "dni",
        { id: chocado.id, legajo: chocado.legajo },
      );
    }

    // 5. Reactivar
    const row = await repo.reactivar(id, client);
    if (!row) {
      throw new NotFoundError("el alumno", id);
    }

    // 6. Obtener materias y deuda
    const [materias, deuda] = await Promise.all([
      repo.materiasInteresDeAlumno(id, client),
      repo.tieneDeudaPendiente(id, client),
    ]);

    return mapper.toApi(row, materias, deuda);
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
  const ids = rows.map((r) => r.id);
  const [materiasMapa, deudasSet] = await Promise.all([
    repo.materiasInteresDe(ids),
    repo.deudaPendienteDe(ids),
  ]);

  return mapper.toApiList(rows, materiasMapa, deudasSet);
}

const MAYUS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const MINUS = "abcdefghijkmnopqrstuvwxyz";
const DIGITOS = "23456789";

function generarPasswordTemporal(): string {
  const todos = MAYUS + MINUS + DIGITOS;
  const elegir = (set: string) => set[randomInt(set.length)];
  const chars = [elegir(MAYUS), elegir(MINUS), elegir(DIGITOS)];

  while (chars.length < 10) {
    chars.push(elegir(todos));
  }

  // Mezcla de Fisher-Yates para distribución uniforme de caracteres obligatorios
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join("");
}

/**
 * Habilita el acceso al portal del alumno (HU-POR-01).
 * Crea el usuario con rol "Alumno", lo vincula a la ficha y envía la contraseña temporal por correo electrónico.
 */
export async function habilitarPortal(
  id: number,
  actor: { usuarioId: number; rol: string },
): Promise<HabilitarPortalResponse> {
  const rolActor = (actor.rol || "").toLowerCase().trim();
  if (rolActor !== "gerente" && rolActor !== "mesa de entrada") {
    throw new ForbiddenError(
      "Solo Mesa de Entrada o el Gerente pueden habilitar el acceso al portal.",
    );
  }

  const alumno = await repo.findById(id);
  if (!alumno) {
    throw new NotFoundError("el alumno", id);
  }

  if (alumno.estado !== "activo") {
    throw new ValidationError(
      "ALUMNO_INACTIVO",
      "La ficha del alumno está inactiva: no se puede habilitar el acceso al portal.",
    );
  }

  const emailLimpio = alumno.email?.trim().toLowerCase();
  if (!emailLimpio) {
    throw new ValidationError(
      "ALUMNO_SIN_EMAIL",
      "El alumno no tiene Email cargado: es obligatorio para habilitar el acceso al portal.",
      "email",
    );
  }

  if (alumno.usuario_id) {
    const usuarioActual = await usuarioRepo.findById(alumno.usuario_id);
    if (usuarioActual && usuarioActual.estado === "activo") {
      throw new ConflictError(
        "PORTAL_YA_HABILITADO",
        "La ficha ya tiene una cuenta activa en el portal (una sola cuenta por ficha).",
      );
    }
  }

  const duplicado = await usuarioRepo.buscarDuplicadoActivo(alumno.dni, emailLimpio);
  if (duplicado) {
    if (duplicado.email.toLowerCase() === emailLimpio) {
      throw new ConflictError(
        "EMAIL_DUPLICADO",
        "Ya existe una cuenta con el email de la ficha.",
        "email",
      );
    }
    if (duplicado.dni === alumno.dni) {
      throw new ConflictError(
        "DNI_DUPLICADO",
        `Ya existe un usuario activo con el DNI ${alumno.dni}.`,
        "dni",
      );
    }
  }

  const passwordTemporal = generarPasswordTemporal();
  let authIdCreado: string | null = null;

  try {
    const usuarioCreado = await withTransaction(async (client) => {
      // 1. Fijar auditoría para cumplir triggers
      await withAuditUser(client, actor.usuarioId);

      // 2. Rol Alumno (id 4)
      const rolAlumno = await client.query<{ id: number }>(
        "SELECT id FROM rol WHERE lower(nombre) = 'alumno' LIMIT 1",
      );
      const rolId = rolAlumno.rows[0]?.id ?? 4;

      // 3. Crear usuario en el servicio de Auth
      const altaAuth = await crearUsuarioAuth(emailLimpio, passwordTemporal, {
        nombre: alumno.nombre,
        apellido: alumno.apellido,
      });

      if (!altaAuth.ok) {
        if (altaAuth.motivo === "email_existente") {
          throw new ConflictError(
            "EMAIL_DUPLICADO",
            "Ya existe un usuario registrado en el sistema de autenticación con ese email.",
            "email",
          );
        }
        throw new ServicioAuthNoDisponibleError(
          "No se pudo crear la cuenta de autenticación en este momento. Intentá de nuevo en unos segundos.",
        );
      }
      authIdCreado = altaAuth.authId;

      // 4. Insertar en tabla usuario
      const nuevoUsuario = await usuarioRepo.insert(
        {
          rolId,
          academiaId: null,
          nombre: alumno.nombre,
          apellido: alumno.apellido,
          dni: alumno.dni,
          email: emailLimpio,
          telefono: alumno.telefono,
          authId: altaAuth.authId,
        },
        client,
      );

      // 5. Vincular usuario a la ficha del alumno
      await repo.asociarUsuario(alumno.id, nuevoUsuario.id, client);

      // 6. Enviar contraseña temporal por correo electrónico
      await enviarPasswordTemporal(
        emailLimpio,
        passwordTemporal,
        `${alumno.nombre} ${alumno.apellido}`,
      );

      return nuevoUsuario;
    });

    return {
      alumnoId: alumno.id,
      usuarioId: usuarioCreado.id,
      email: emailLimpio,
    };
  } catch (error) {
    if (authIdCreado) {
      await eliminarUsuarioAuth(authIdCreado);
    }
    throw error;
  }
}
