import { NextResponse } from "next/server";
import { ok } from "@/lib/http/responses";
import { errorResponse } from "@/lib/http/responses";
import { UnauthorizedError, traducirErrorPostgres } from "@/lib/http/errors";
import * as service from "@/modules/auth/auth.service";

/**
 * GET /api/auth/sesion
 *
 * NO usa `withRoute` porque el 401 acá es una respuesta VÁLIDA ("no hay sesión"),
 * no un error. Con `withRoute` el 401 interrumpiría y nunca llegaríamos al handler.
 *
 * Responde:
 *  · 200 + SesionResponse  → hay sesión activa
 *  · 401 + NO_AUTENTICADO  → no hay sesión o expiró
 */
export async function GET(): Promise<NextResponse> {
  try {
    const sesion = await service.sesionActual();
    if (!sesion) {
      return errorResponse(new UnauthorizedError());
    }
    return ok(sesion);
  } catch (e) {
    return errorResponse(traducirErrorPostgres(e) ?? e);
  }
}
