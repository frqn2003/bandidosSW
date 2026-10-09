import { withRoute } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import type { ParametroResponse } from "@/contracts/catalogo";
import { query } from "@/lib/db/client";

export const GET = withRoute(async () => {
  const rows = await query<{
    id: number;
    clave: string;
    valor: number;
    unidad: string | null;
    descripcion: string | null;
  }>(`SELECT id, clave, valor, unidad, descripcion FROM parametro ORDER BY id ASC`);

  const res: ParametroResponse[] = rows.map((r) => ({
    id: r.id,
    clave: r.clave,
    valor: r.valor,
    unidad: r.unidad,
    descripcion: r.descripcion,
  }));

  return ok(res);
});
