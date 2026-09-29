import { randomInt } from "node:crypto";
import { withTransaction } from "@/lib/db/tx";
import { withAuditUser } from "@/lib/audit/audit";
import {
  ConflictError,
  ValidationError,
  NotFoundError,
  BusinessRuleError,
  ServicioAuthNoDisponibleError,
} from "@/lib/http/errors";
import { crearUsuarioAuth, eliminarUsuarioAuth } from "@/lib/auth/gotrue";
import { enviarPasswordTemporal } from "@/lib/email";
import type { UsuarioResponse } from "@/contracts/usuario";
import type {
  FiltrosUsuario,
  CrearUsuarioInputDto,
  EditarUsuarioInputDto,
  InactivarUsuarioInputDto,
} from "./usuario.types";
import * as repo from "./usuario.repo";
import * as mapper from "./usuario.mapper";

/** Caracteres alfanuméricos seguros sin ambigüedades visuales (0/O, 1/l/I). */
const MAYUS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const MINUS = "abcdefghijkmnpqrstuvwxyz";
const DIGITOS = "23456789";

/**
 * Genera una contraseña temporal alfanumérica de 10 caracteres (mínimo 8 requerido)
 * con entropía criptográfica, conteniendo al menos una mayúscula, una minúscula y un dígito.
 */
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
 * Consulta listado de usuarios con filtros y orden alfabético Apellido, Nombre (A-Z).
 */
export async function listar(filtros: FiltrosUsuario = {}): Promise<UsuarioResponse[]> {
  const rows = await repo.findAll(filtros);
  return rows.map(mapper.toApi);
}

/**
 * Obtiene el detalle de un usuario por su ID (§Receta 4).
 */
export async function obtener(id: number): Promise<UsuarioResponse> {
  const row = await repo.findById(id);
  if (!row) {
    throw new NotFoundError("el usuario", id);
  }
  return mapper.toApi(row);
}

/**
 * Alta de un nuevo usuario en el sistema (HU-SIS-00).
 *
 * Flujo de ejecución seguro:
 *  1. Inicia transacción y fija el usuario auditor (§Reglas 3 y 4).
 *  2. Bloqueo de concurrencia para evitar colisiones de DNI o email simultáneos.
 *  3. Valida la existencia del rol y la regla de academia para 'Profesor'.
 *  4. Valida que el DNI y el Email no existan en usuarios activos.
 *  5. Genera la contraseña temporal y crea la cuenta en Supabase Auth.
 *  6. Si Auth falla, devuelve error de servicio y revierte la transacción.
 *  7. Inserta el usuario en la BD con `debe_cambiar_password = true`.
 *  8. Envía el email con la contraseña temporal. Si falla, compensa borrando la cuenta de Auth.
 */
export async function crear(
  input: CrearUsuarioInputDto,
  usuarioResponsableId: number,
): Promise<UsuarioResponse> {
  const passwordTemporal = generarPasswordTemporal();
  let authIdCreado: string | null = null;

  try {
    const usuarioCreado = await withTransaction(async (client) => {
      // 1. Auditoría: primera línea obligatoria
      await withAuditUser(client, usuarioResponsableId);

      // 2. Lock de transacción para serializar altas
      await client.query("SELECT pg_advisory_xact_lock(hashtext('alta_usuario'))");

      // 3. Validar Rol
      const rol = await repo.buscarRol(input.rolId, client);
      if (!rol) {
        throw new ValidationError("REFERENCIA_INVALIDA", "El rol seleccionado no existe.", "rolId");
      }

      // Regla: Si el rol es Profesor, debe tener academia asignada obligatoriamente
      if (rol.nombre.toLowerCase() === "profesor" && !input.academiaId) {
        throw new ValidationError(
          "ACADEMIA_REQUERIDA",
          "Un profesor tiene que pertenecer a una academia.",
          "academiaId",
        );
      }

      // Validar academia si fue indicada
      if (input.academiaId) {
        const academia = await repo.buscarAcademia(input.academiaId, client);
        if (!academia) {
          throw new ValidationError(
            "REFERENCIA_INVALIDA",
            "La academia seleccionada no existe.",
            "academiaId",
          );
        }
      }

      // 4. Chequeo de duplicados entre usuarios activos
      const duplicado = await repo.buscarDuplicadoActivo(input.dni, input.email, undefined, client);
      if (duplicado) {
        if (duplicado.dni === input.dni.trim()) {
          throw new ConflictError("DNI_DUPLICADO", "Ya existe un usuario activo con ese DNI.", "dni");
        }
        throw new ConflictError("EMAIL_DUPLICADO", "Ya existe un usuario activo con ese email.", "email");
      }

      // 5. Crear cuenta en Supabase Auth
      const altaAuth = await crearUsuarioAuth(input.email, passwordTemporal, {
        nombre: input.nombre,
        apellido: input.apellido,
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

      // 6. Insertar registro en la tabla usuario
      const row = await repo.insert(
        {
          ...input,
          authId: altaAuth.authId,
        },
        client,
      );

      // 7. Enviar email con la contraseña temporal registrada
      await enviarPasswordTemporal(
        input.email,
        passwordTemporal,
        `${input.nombre} ${input.apellido}`,
      );

      return row;
    });

    return mapper.toApi(usuarioCreado);
  } catch (error) {
    // Compensación: Si falló la inserción en BD o el envío de email, borramos la cuenta huérfana de Auth
    if (authIdCreado) {
      await eliminarUsuarioAuth(authIdCreado);
    }
    throw error;
  }
}

/**
 * Modificación de un usuario existente (§Receta 8).
 */
export async function editar(
  id: number,
  input: EditarUsuarioInputDto,
  usuarioResponsableId: number,
): Promise<UsuarioResponse> {
  return withTransaction(async (client) => {
    await withAuditUser(client, usuarioResponsableId);

    // 1. Verificar existencia
    const actual = await repo.findById(id, client);
    if (!actual) {
      throw new NotFoundError("el usuario", id);
    }

    // 2. No se puede editar un usuario dado de baja
    if (actual.estado === "inactivo") {
      throw new ConflictError(
        "USUARIO_YA_INACTIVO",
        "No se puede modificar un usuario inactivo. Debe reactivarlo primero.",
      );
    }

    // 3. Validar Rol
    const rol = await repo.buscarRol(input.rolId, client);
    if (!rol) {
      throw new ValidationError("REFERENCIA_INVALIDA", "El rol seleccionado no existe.", "rolId");
    }

    // Regla de academia para Profesor
    if (rol.nombre.toLowerCase() === "profesor" && !input.academiaId) {
      throw new ValidationError(
        "ACADEMIA_REQUERIDA",
        "Un profesor tiene que pertenecer a una academia.",
        "academiaId",
      );
    }

    if (input.academiaId) {
      const academia = await repo.buscarAcademia(input.academiaId, client);
      if (!academia) {
        throw new ValidationError(
          "REFERENCIA_INVALIDA",
          "La academia seleccionada no existe.",
          "academiaId",
        );
      }
    }

    // 4. Chequear que no se quite el rol al último Gerente activo
    if (
      actual.rol_nombre.toLowerCase() === "gerente" &&
      rol.nombre.toLowerCase() !== "gerente"
    ) {
      const otrosGerentes = await repo.contarGerentesActivos(id, client);
      if (otrosGerentes === 0) {
        throw new BusinessRuleError(
          "ULTIMO_GERENTE_ACTIVO",
          "No se puede cambiar el rol al único Gerente activo del sistema.",
        );
      }
    }

    // 5. Validar duplicados de DNI y Email excluyéndose a sí mismo
    const duplicado = await repo.buscarDuplicadoActivo(input.dni, input.email, id, client);
    if (duplicado) {
      if (duplicado.dni === input.dni.trim()) {
        throw new ConflictError("DNI_DUPLICADO", "Ya existe un usuario activo con ese DNI.", "dni");
      }
      throw new ConflictError("EMAIL_DUPLICADO", "Ya existe un usuario activo con ese email.", "email");
    }

    // 6. Actualizar registro
    const row = await repo.update(id, input, client);
    return mapper.toApi(row);
  });
}

/**
 * Baja lógica obligatoria de usuario con motivo (§Receta 9).
 */
export async function inactivar(
  id: number,
  input: InactivarUsuarioInputDto,
  usuarioResponsableId: number,
): Promise<UsuarioResponse> {
  return withTransaction(async (client) => {
    await withAuditUser(client, usuarioResponsableId);

    // 1. Regla dura: Nadie puede darse de baja a sí mismo
    if (usuarioResponsableId === id) {
      throw new BusinessRuleError(
        "AUTOBAJA_NO_PERMITIDA",
        "No podés desactivar tu propia cuenta de usuario.",
      );
    }

    // 2. Verificar existencia
    const actual = await repo.findById(id, client);
    if (!actual) {
      throw new NotFoundError("el usuario", id);
    }

    if (actual.estado === "inactivo") {
      throw new ConflictError("USUARIO_YA_INACTIVO", "El usuario ya se encuentra inactivo.");
    }

    // 3. Regla dura: Bloqueo de baja del último Gerente activo
    if (actual.rol_nombre.toLowerCase() === "gerente") {
      const otros = await repo.contarGerentesActivos(id, client);
      if (otros === 0) {
        throw new BusinessRuleError(
          "ULTIMO_GERENTE_ACTIVO",
          "No se puede desactivar al único Gerente activo del sistema.",
        );
      }
    }

    // 4. Si es profesor, verificar si tiene turnos futuros reservados
    const turnosFuturos = await repo.contarTurnosFuturosProfesor(id, client);
    if (turnosFuturos > 0) {
      throw new ConflictError(
        "PROFESOR_CON_TURNOS_FUTUROS",
        "No se puede dar de baja: el profesor tiene turnos futuros reservados.",
      );
    }

    // 5. Validar motivo de baja
    const motivo = await repo.buscarMotivoBaja(input.motivoBajaId, client);
    if (!motivo) {
      throw new ValidationError(
        "REFERENCIA_INVALIDA",
        "El motivo de baja seleccionado no existe.",
        "motivoBajaId",
      );
    }

    if (motivo.estado !== "activo") {
      throw new ValidationError(
        "MOTIVO_BAJA_INACTIVO",
        "El motivo de baja seleccionado está inactivo.",
        "motivoBajaId",
      );
    }

    // Si el motivo requiere detalle ("Otro"), el detalle es obligatorio
    if (motivo.requiere_detalle && (!input.detalleMotivoBaja || input.detalleMotivoBaja.trim() === "")) {
      throw new ValidationError(
        "DETALLE_MOTIVO_BAJA_REQUERIDO",
        `El motivo de baja "${motivo.nombre}" requiere un detalle explicativo.`,
        "detalleMotivoBaja",
      );
    }

    // 6. Ejecutar baja lógica
    const row = await repo.inactivar(
      id,
      input.motivoBajaId,
      input.detalleMotivoBaja?.trim() ?? null,
      client,
    );

    return mapper.toApi(row);
  });
}

/**
 * Reactivación lógica de un usuario inactivo.
 */
export async function reactivar(
  id: number,
  usuarioResponsableId: number,
): Promise<UsuarioResponse> {
  return withTransaction(async (client) => {
    await withAuditUser(client, usuarioResponsableId);

    const actual = await repo.findById(id, client);
    if (!actual) {
      throw new NotFoundError("el usuario", id);
    }

    if (actual.estado === "activo") {
      throw new ConflictError("USUARIO_YA_ACTIVO", "El usuario ya se encuentra activo.");
    }

    // Verificar que DNI y email no estén tomados por otro usuario actualmente activo
    const duplicado = await repo.buscarDuplicadoActivo(actual.dni, actual.email, id, client);
    if (duplicado) {
      if (duplicado.dni === actual.dni) {
        throw new ConflictError(
          "DNI_DUPLICADO",
          "No se puede reactivar: ya existe un usuario activo con el mismo DNI.",
          "dni",
        );
      }
      throw new ConflictError(
        "EMAIL_DUPLICADO",
        "No se puede reactivar: ya existe un usuario activo con el mismo email.",
        "email",
      );
    }

    const row = await repo.reactivar(id, client);
    return mapper.toApi(row);
  });
}

/**
 * Desbloquea a un usuario limpiando sus intentos fallidos y bloqueo por tiempo.
 */
export async function desbloquear(
  id: number,
  usuarioResponsableId: number,
): Promise<UsuarioResponse> {
  return withTransaction(async (client) => {
    await withAuditUser(client, usuarioResponsableId);

    const actual = await repo.findById(id, client);
    if (!actual) {
      throw new NotFoundError("el usuario", id);
    }

    const row = await repo.desbloquear(id, client);
    return mapper.toApi(row);
  });
}
