import { z } from "zod";
import { withRoute, parseBody, parseId } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import { ValidationError, NotFoundError } from "@/lib/http/errors";
import * as service from "@/modules/turnos/turno.service";
import * as alumnoRepo from "@/modules/alumnos/alumno.repo";
import { enviarComprobanteTurno } from "@/lib/email";

const enviarEmailBody = z
  .object({
    emailDestino: z.string().trim().email("Email inválido").optional(),
  })
  .strict();

/**
 * POST /api/turnos/:id/email
 * Envía el comprobante de turno por correo electrónico.
 */
export const POST = withRoute<{ id: string }>(async ({ req, params, session }) => {
  const id = parseId((await params).id);
  const input = await parseBody(req, enviarEmailBody).catch(() => ({ emailDestino: undefined }));

  const turno = await service.obtener(id, session);
  if (!turno) {
    throw new NotFoundError("el turno", id);
  }

  let emailDestino = input?.emailDestino;
  if (!emailDestino) {
    const alumno = await alumnoRepo.findById(turno.alumno.id);
    emailDestino = alumno?.email ?? undefined;
  }

  if (!emailDestino) {
    throw new ValidationError(
      "ALUMNO_SIN_EMAIL",
      "El alumno no tiene un correo electrónico registrado para el envío.",
    );
  }

  await enviarComprobanteTurno(emailDestino, {
    codigoTurno: turno.codigo,
    alumnoNombre: `${turno.alumno.nombre} ${turno.alumno.apellido}`,
    profesorNombre: `${turno.profesor.nombre} ${turno.profesor.apellido}`,
    materiaNombre: turno.materia.nombre,
    fecha: turno.fecha,
    horaInicio: turno.horaInicio,
    horaFin: turno.horaFin,
    precio: turno.valorClaseCongelado,
    estado: turno.estado,
  });

  return ok({
    enviado: true,
    email: emailDestino,
    mensaje: `Comprobante de turno enviado a ${emailDestino}`,
  });
});
