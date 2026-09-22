import { z } from "zod";
import { withRoute, parseBody } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import * as service from "@/modules/disponibilidad/disponibilidad.service";

const copiarDiaSchema = z
  .object({
    profesorId: z.number().int().positive(),
    diaOrigen: z.number().int().min(1).max(6),
    diasDestino: z.array(z.number().int().min(1).max(6)).min(1),
  })
  .strict();

export const POST = withRoute(async ({ req, session }) => {
  const input = await parseBody(req, copiarDiaSchema);
  return ok(
    await service.copiarDia(
      input.profesorId,
      input.diaOrigen,
      input.diasDestino,
      session.usuarioId,
    ),
  );
});
