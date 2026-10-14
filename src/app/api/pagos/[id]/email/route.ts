import { z } from "zod";
import { withRoute, parseBody, parseId } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import { ValidationError, NotFoundError } from "@/lib/http/errors";
import * as service from "@/modules/pagos/pago.service";
import * as alumnoRepo from "@/modules/alumnos/alumno.repo";
import { enviarComprobantePago } from "@/lib/email";

const enviarEmailBody = z
  .object({
    emailDestino: z.string().trim().email("Email inválido").optional(),
  })
  .strict();

/**
 * POST /api/pagos/:id/email
 * Envía el comprobante/recibo de pago por correo electrónico.
 */
export const POST = withRoute<{ id: string }>(async ({ req, params, session }) => {
  const id = parseId((await params).id);
  const input = await parseBody(req, enviarEmailBody).catch(() => ({ emailDestino: undefined }));

  const pago = await service.obtener(id, session);
  if (!pago) {
    throw new NotFoundError("el pago", id);
  }

  let emailDestino = input?.emailDestino;
  if (!emailDestino) {
    const alumno = await alumnoRepo.findById(pago.alumno.id);
    emailDestino = alumno?.email ?? undefined;
  }

  if (!emailDestino) {
    throw new ValidationError(
      "ALUMNO_SIN_EMAIL",
      "El alumno no tiene un correo electrónico registrado para el envío.",
    );
  }

  const concepto =
    pago.clases.length > 0
      ? pago.clases.map((c) => c.materiaNombre).join(", ")
      : "Clases de apoyo";

  const formaPago =
    pago.formasPago.length > 0
      ? pago.formasPago.map((f) => f.nombre).join(" + ")
      : "Efectivo";

  await enviarComprobantePago(emailDestino, {
    numeroComprobante: pago.comprobante,
    alumnoNombre: `${pago.alumno.nombre} ${pago.alumno.apellido}`,
    concepto,
    monto: pago.monto,
    fechaPago: pago.fechaPago,
    formaPago,
    codigoTurno: pago.clases.length === 1 ? pago.clases[0].codigo : undefined,
    observaciones: pago.observaciones ?? undefined,
  });

  return ok({
    enviado: true,
    email: emailDestino,
    mensaje: `Recibo de pago enviado a ${emailDestino}`,
  });
});
