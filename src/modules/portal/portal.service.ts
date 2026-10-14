import type { Session } from "@/lib/auth/session";
import type {
  MateriaPortalResponse,
  MisTurnosQuery,
  MisTurnosResponse,
  ProfesorPortalResponse,
  ReservarTurnoPortalInput,
  TurnoPortalResponse,
} from "@/contracts/portal";
import { AppError, ConflictError, ForbiddenError } from "@/lib/http/errors";
import { crearReserva } from "@/modules/turnos/turno.service";
import * as repo from "./portal.repo";
import * as mapper from "./portal.mapper";

/**
 * Todo el portal: solo el rol Alumno, con su ficha activa. El alumno sale
 * siempre de la sesión, nunca de la request.
 */
async function alumnoDeSesion(session: Session) {
  if (session.rol !== "Alumno") {
    throw new ForbiddenError("El portal es exclusivo del rol Alumno.");
  }
  const alumno = await repo.alumnoDeUsuario(session.usuarioId);
  if (!alumno) {
    throw new ForbiddenError(
      "Tu cuenta no está asociada a una ficha de alumno activa.",
      "CUENTA_SIN_FICHA",
    );
  }
  return alumno;
}

/** 409 con `datos.limite` para que el front muestre el mensaje en rojo con el número. */
export class LimiteTurnosFuturosError extends AppError {
  readonly status = 409;

  override get datos(): Record<string, unknown> {
    return { limite: this.limite };
  }

  constructor(readonly limite: number) {
    super(
      "LIMITE_TURNOS_FUTUROS",
      `Alcanzaste el límite de ${limite} turnos futuros reservados. Cancelá o esperá a que se dicte uno para reservar otro.`,
    );
  }
}

/** GET /api/portal/turnos — Mis turnos (sin precios ni datos de pago). */
export async function misTurnos(filtros: MisTurnosQuery, session: Session): Promise<MisTurnosResponse> {
  const alumno = await alumnoDeSesion(session);
  const [turnos, futuros, limite] = await Promise.all([
    repo.misTurnos(alumno.id, filtros.verHistorial),
    repo.contarFuturosReservados(alumno.id),
    repo.limiteTurnosFuturos(),
  ]);
  return {
    turnos: turnos.map(mapper.turnoToApi),
    turnosFuturosReservados: futuros,
    limiteTurnosFuturos: limite,
  };
}

/**
 * POST /api/portal/turnos — reserva para el alumno de la sesión con las reglas
 * de HU-TUR-01. El límite de turnos futuros se chequea acá para el mensaje y lo
 * vuelve a aplicar `fn_turno_validar_portal` bajo lock (origen 'Portal del
 * Alumno'); la reserva queda en la bitácora de `turno`.
 */
export async function reservar(
  input: ReservarTurnoPortalInput,
  session: Session,
): Promise<TurnoPortalResponse> {
  const alumno = await alumnoDeSesion(session);

  const [futuros, limite] = await Promise.all([
    repo.contarFuturosReservados(alumno.id),
    repo.limiteTurnosFuturos(),
  ]);
  if (futuros >= limite) throw new LimiteTurnosFuturosError(limite);

  let turnoId: number;
  try {
    turnoId = (await crearReserva({ ...input, alumnoId: alumno.id }, session.usuarioId)).id;
  } catch (e) {
    // Carrera: otra reserva simultánea llegó al límite y la frenó el trigger.
    const m = /límite de (\d+) turnos futuros/.exec((e as { message?: string }).message ?? "");
    if (m) throw new LimiteTurnosFuturosError(Number(m[1]));
    throw e;
  }

  const row = await repo.turnoPortalPorId(turnoId);
  if (!row) throw new ConflictError("NO_ENCONTRADO", "No se pudo recuperar el turno reservado.");
  return mapper.turnoToApi(row);
}

/** GET /api/portal/materias — combo de materias reservables. */
export async function materias(session: Session): Promise<MateriaPortalResponse[]> {
  const alumno = await alumnoDeSesion(session);
  return (await repo.materias(alumno.nivel_educativo)).map(mapper.materiaToApi);
}

/** GET /api/portal/profesores?materiaId= — profesores activos que dictan la materia. */
export async function profesores(materiaId: number, session: Session): Promise<ProfesorPortalResponse[]> {
  await alumnoDeSesion(session);
  return (await repo.profesores(materiaId)).map(mapper.profesorToApi);
}
