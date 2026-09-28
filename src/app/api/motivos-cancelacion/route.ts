import { withRoute } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import { listarMotivosCancelacionQuery, type MotivoCancelacionResponse } from "@/contracts/catalogo";
import { query } from "@/lib/db/client";

export const GET = withRoute(async ({ req }) => {
  const sp = new URL(req.url).searchParams;
  const filtros = listarMotivosCancelacionQuery.parse(Object.fromEntries(sp));

  const sql = filtros.soloActivos
    ? `SELECT id, nombre, requiere_detalle, estado FROM motivo_cancelacion WHERE estado = 'activo' ORDER BY id ASC`
    : `SELECT id, nombre, requiere_detalle, estado FROM motivo_cancelacion ORDER BY id ASC`;

  const rows = await query<{
    id: number;
    nombre: string;
    requiere_detalle: boolean;
    estado: "activo" | "inactivo";
  }>(sql);

  const res: MotivoCancelacionResponse[] = rows.map((r) => ({
    id: r.id,
    nombre: r.nombre,
    requiereDetalle: r.requiere_detalle,
    estado: r.estado,
  }));

  return ok(res);
});
