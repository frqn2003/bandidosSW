# Cómo usar el contrato `indicadores`

Contrato: [`src/contracts/indicadores.ts`](../../src/contracts/indicadores.ts). Tablero e indicadores iniciales de gestión (HU-IND-01).

Acceso exclusivo: **Gerente**.

Archivos que toca cada equipo:

```
src/contracts/indicadores.ts                      ← el acuerdo
src/app/api/indicadores/route.ts                  ← back: GET indicadores y gráficos
src/modules/indicadores/indicadores.service.ts     ← back: agregaciones y cálculo de porcentajes
src/modules/indicadores/indicadores.repo.ts        ← back: consultas analíticas SQL
src/modules/indicadores/indicadores.mapper.ts      ← back: formato IndicadoresResponse
src/app/.../reportes/indicadores/page.tsx         ← front: dashboard y visualización
```

---

# Back-end

## 1. Ruta

```ts
// src/app/api/indicadores/route.ts
import { withRoute } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import { indicadoresQuery } from "@/contracts/indicadores";
import * as service from "@/modules/indicadores/indicadores.service";

export const GET = withRoute(async ({ req, session }) => {
  if (session.rol !== "Gerente") {
    throw new ForbiddenError("ACCESO_DENEGADO", "Solo el Gerente puede consultar los indicadores.");
  }
  const sp = new URL(req.url).searchParams;
  const filtros = indicadoresQuery.parse(Object.fromEntries(sp));
  return ok(await service.obtenerIndicadores(filtros));
});
```

## 2. Reglas del service y SQL

1. **Rango de fechas:** máximo 12 meses entre `desde` y `hasta`.
2. **Filtros independientes:** `materiaId` y `profesorId` no aplican a la cantidad de alumnos activos ni a las altas de alumnos del período (miden el centro en su totalidad).
3. **Manejo de ceros:** si el denominador de un porcentaje es 0, devolver `null` para que el front muestre `—` en lugar de `NaN` o `0%`.

---

# Front-end

## 1. Importar del contrato

```ts
import {
  RUTA,
  type IndicadoresResponse,
  type IndicadoresQuery,
  type ErrorIndicadores,
} from "@/contracts/indicadores";
```

## 2. Consulta y visualización

```ts
const filtros: IndicadoresQuery = {
  desde: "2026-09-01",
  hasta: "2026-09-30",
  profesorId: profesorSeleccionado || undefined,
};

const datos = await apiGet<IndicadoresResponse>(
  `${RUTA}?desde=${filtros.desde}&hasta=${filtros.hasta}`
);
```
