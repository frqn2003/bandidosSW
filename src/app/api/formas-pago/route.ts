import { withRoute } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import { query } from "@/lib/db/client";
import {
  listarFormasPagoQuery,
  type FormaPagoResponse,
} from "@/contracts/catalogo";

/**
 * GET /api/formas-pago
 * Catálogo de formas de pago activas para el módulo de pagos (§HU-PAG-01).
 */
export const GET = withRoute(async ({ req }) => {
  const sp = new URL(req.url).searchParams;
  const { soloActivas } = listarFormasPagoQuery.parse(Object.fromEntries(sp));

  const where = soloActivas ? "WHERE estado = 'activo'" : "";
  const filas = await query<{
    id: number;
    nombre: string;
    requiere_nro_operacion: boolean;
    estado: "activo" | "inactivo";
  }>(`SELECT id, nombre, requiere_nro_operacion, estado FROM forma_pago ${where} ORDER BY id ASC`);

  const response: FormaPagoResponse[] = filas.map((f) => ({
    id: f.id,
    nombre: f.nombre,
    requiereNroOperacion: f.requiere_nro_operacion,
    estado: f.estado,
  }));

  return ok(response);
});
