import { withRoute } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import { query } from "@/lib/db/client";
import {
  listarMotivosBajaQuery,
  type MotivoBajaResponse,
} from "@/contracts/catalogo";

/**
 * GET /api/motivos-baja
 * Catálogo de motivos de baja para el modal de confirmación de baja lógica (§Receta 1).
 */
export const GET = withRoute(async ({ req }) => {
  const sp = new URL(req.url).searchParams;
  const { soloActivos } = listarMotivosBajaQuery.parse(Object.fromEntries(sp));

  const where = soloActivos ? "WHERE estado = 'activo'" : "";
  const filas = await query<{
    id: number;
    nombre: string;
    requiere_detalle: boolean;
    estado: "activo" | "inactivo";
  }>(`SELECT id, nombre, requiere_detalle, estado FROM motivo_baja ${where} ORDER BY id ASC`);

  const response: MotivoBajaResponse[] = filas.map((f) => ({
    id: f.id,
    nombre: f.nombre,
    requiereDetalle: f.requiere_detalle,
    estado: f.estado,
  }));

  return ok(response);
});
