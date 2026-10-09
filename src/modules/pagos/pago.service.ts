import type { Session } from "@/lib/auth/session";
import type {
  ClasePendientePagoResponse,
  PagoResponse,
  ListarPagosQuery,
  CrearPagoInput,
} from "@/contracts/pago";
import { withTransaction } from "@/lib/db/tx";
import { withAuditUser } from "@/lib/audit/audit";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/lib/http/errors";
import * as repo from "./pago.repo";
import * as mapper from "./pago.mapper";

function yaTranscurrioEnAR(fecha: string, horaInicio: string): boolean {
  const ahoraString = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date());

  const [fechaActual, horaActual] = ahoraString.split(", ");
  const fTurno = fecha.slice(0, 10);
  const hTurno = horaInicio.slice(0, 5);
  const fHoy = fechaActual.slice(0, 10);
  const hAhora = horaActual.slice(0, 5);

  if (fTurno < fHoy) return true;
  if (fTurno > fHoy) return false;
  return hTurno <= hAhora;
}

function validarAcceso(session: Session): void {
  const rolesPermitidos = ["Gerente", "Mesa de Entrada"];
  if (!rolesPermitidos.includes(session.rol)) {
    throw new ForbiddenError(
      `Tu rol (${session.rol}) no tiene permisos para gestionar pagos.`,
    );
  }
}

/**
 * Consulta las clases dictadas pendientes de cobro de un alumno (§HU-PAG-01).
 */
export async function listarClasesPendientes(
  alumnoId: number | undefined,
  session: Session,
): Promise<ClasePendientePagoResponse[]> {
  validarAcceso(session);

  if (alumnoId !== undefined) {
    const alumno = await repo.obtenerAlumno(alumnoId);
    if (!alumno) {
      throw new NotFoundError("el alumno", alumnoId);
    }
    if (alumno.estado !== "activo") {
      throw new ValidationError(
        "ALUMNO_INACTIVO",
        "El alumno se encuentra inactivo y no se pueden consultar sus pagos.",
        "alumnoId",
      );
    }
  }

  const filas = await repo.listarClasesPendientes(alumnoId);
  return filas.map(mapper.clasePendienteToApi);
}

/**
 * Registra el pago de una o más clases dictadas de un alumno (§HU-PAG-01).
 * Calcula el monto automáticamente a partir del valor congelado de los turnos seleccionados.
 */
export async function registrarPago(
  input: CrearPagoInput,
  usuarioId: number,
  session: Session,
): Promise<PagoResponse> {
  validarAcceso(session);

  if (!input.turnoIds || input.turnoIds.length === 0) {
    throw new ValidationError(
      "SIN_CLASES_SELECCIONADAS",
      "Debe seleccionar al menos una clase para cobrar.",
      "turnoIds",
    );
  }

  if (!input.formasPago || input.formasPago.length === 0) {
    throw new ValidationError(
      "FORMA_PAGO_REQUERIDA",
      "Debe indicar al menos una forma de pago.",
      "formasPago",
    );
  }

  return withTransaction(async (client) => {
    await withAuditUser(client, usuarioId);

    // 1. Validar alumno
    const alumno = await repo.obtenerAlumno(input.alumnoId, client);
    if (!alumno) {
      throw new NotFoundError("el alumno", input.alumnoId);
    }
    if (alumno.estado !== "activo") {
      throw new ValidationError(
        "ALUMNO_INACTIVO",
        "El alumno no se encuentra activo; no se puede registrar el pago.",
        "alumnoId",
      );
    }

    // 2. Bloquear y validar turnos seleccionados
    const turnos = await repo.obtenerTurnosParaCobro(input.turnoIds, client);
    if (turnos.length !== input.turnoIds.length) {
      throw new NotFoundError("uno o más turnos seleccionados");
    }

    for (const t of turnos) {
      if (t.alumno_id !== input.alumnoId) {
        throw new ValidationError(
          "TURNO_NO_PERTENECE_ALUMNO",
          `El turno ${t.codigo ?? t.id} no pertenece al alumno seleccionado.`,
          "turnoIds",
        );
      }

      if (t.estado === "Cancelado") {
        throw new ConflictError(
          "TURNO_CANCELADO",
          `El turno ${t.codigo ?? t.id} está cancelado y no puede ser abonado.`,
        );
      }

      if (t.pagado) {
        throw new ConflictError(
          "TURNO_YA_PAGADO",
          `El turno ${t.codigo ?? t.id} ya fue abonado previamente.`,
        );
      }

      if (!yaTranscurrioEnAR(t.fecha, t.hora_inicio)) {
        throw new ValidationError(
          "TURNO_NO_TRANSCURRIDO",
          `El turno ${t.codigo ?? t.id} aún no se dictó; solo se cobran clases ya transcurridas.`,
          "turnoIds",
        );
      }
    }

    // 3. Autocalcular monto total exacto
    const montoTotal = turnos.reduce(
      (acc, t) => acc + Number(t.valor_clase_congelado),
      0,
    );

    // 4. Validar formas de pago seleccionadas
    const formaIds = input.formasPago.map((fp) => fp.formaPagoId);
    const formasDb = await repo.obtenerFormasPago(formaIds, client);
    const formasMap = new Map(formasDb.map((f) => [f.id, f]));

    const formasSanitizadas = input.formasPago.map((fp) => {
      const info = formasMap.get(fp.formaPagoId);
      if (!info || info.estado !== "activo") {
        throw new ValidationError(
          "FORMA_PAGO_INACTIVA",
          "Una de las formas de pago indicadas no existe o está inactiva.",
          "formasPago",
        );
      }

      if (info.requiere_nro_operacion) {
        if (!fp.nroOperacion || fp.nroOperacion.trim() === "") {
          throw new ValidationError(
            "NRO_OPERACION_REQUERIDO",
            `La forma de pago "${info.nombre}" requiere número de operación o referencia.`,
            "formasPago",
          );
        }
        return { formaPagoId: fp.formaPagoId, nroOperacion: fp.nroOperacion.trim() };
      }

      return { formaPagoId: fp.formaPagoId, nroOperacion: null };
    });

    // 5. Inserción de cabecera de pago y comprobante correlativo
    const nuevoPago = await repo.insertarPago(
      {
        alumnoId: input.alumnoId,
        monto: montoTotal,
        fechaPago: input.fechaPago,
        observaciones: input.observaciones ?? null,
        usuarioId,
      },
      client,
    );

    // 6. Inserción de turnos asociados (el trigger de BD actualiza turno.pagado = true)
    await repo.insertarPagoTurnos(
      nuevoPago.id,
      turnos.map((t) => ({
        turnoId: t.id,
        importe: Number(t.valor_clase_congelado),
      })),
      client,
    );

    // 7. Inserción de medios de pago
    await repo.insertarPagoFormasPago(nuevoPago.id, formasSanitizadas, client);

    // 8. Carga completa del comprobante emitido
    const pagoRow = await repo.obtenerPagoPorId(nuevoPago.id, client);
    const formasRows = await repo.obtenerPagoFormasPago([nuevoPago.id], client);
    const turnosRows = await repo.obtenerPagoTurnos([nuevoPago.id], client);

    return mapper.pagoToApi(pagoRow!, formasRows, turnosRows);
  });
}

/**
 * Obtiene el detalle de un pago y su comprobante por su ID (§HU-PAG-01).
 */
export async function obtener(
  id: number,
  session: Session,
): Promise<PagoResponse> {
  validarAcceso(session);

  const pago = await repo.obtenerPagoPorId(id);
  if (!pago) {
    throw new NotFoundError("el pago", id);
  }

  const [formas, clases] = await Promise.all([
    repo.obtenerPagoFormasPago([id]),
    repo.obtenerPagoTurnos([id]),
  ]);

  return mapper.pagoToApi(pago, formas, clases);
}

/**
 * Consulta el historial de pagos aplicando filtros (§HU-PAG-01).
 * Orden predeterminado: fecha_pago DESC, created_at DESC.
 */
export async function listar(
  filtros: ListarPagosQuery,
  session: Session,
): Promise<PagoResponse[]> {
  validarAcceso(session);

  const pagos = await repo.listarPagos(filtros);
  if (pagos.length === 0) {
    return [];
  }

  const pagoIds = pagos.map((p) => p.id);
  const [todasFormas, todasClases] = await Promise.all([
    repo.obtenerPagoFormasPago(pagoIds),
    repo.obtenerPagoTurnos(pagoIds),
  ]);

  const formasPorPago = new Map<number, typeof todasFormas>();
  for (const f of todasFormas) {
    const arr = formasPorPago.get(f.pago_id) ?? [];
    arr.push(f);
    formasPorPago.set(f.pago_id, arr);
  }

  const clasesPorPago = new Map<number, typeof todasClases>();
  for (const c of todasClases) {
    const arr = clasesPorPago.get(c.pago_id) ?? [];
    arr.push(c);
    clasesPorPago.set(c.pago_id, arr);
  }

  return pagos.map((p) =>
    mapper.pagoToApi(
      p,
      formasPorPago.get(p.id) ?? [],
      clasesPorPago.get(p.id) ?? [],
    ),
  );
}
