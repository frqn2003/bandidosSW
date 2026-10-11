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

## 3. HU-IND-03: tablero completo de dirección

Todo es aditivo: se conserva lo de HU-IND-01 y se agregan el filtro `nivel`, las `tarjetas` con comparación, `rankingProfesores` y el mapa de calor (endpoint aparte).

El cálculo está en la base; el back solo mapea:

| Campo | Función |
|---|---|
| `tarjetas` (8, con `valorAnterior`, `variacionPorcentual`, `mejora`, `menorEsMejor`) | `fn_indicadores_direccion(desde, hasta, materia, profesor, nivel)`; internamente `fn_ind_direccion_valores` calcula el período actual y el anterior de igual duración |
| `periodoAnterior` | `hasta_ant = desde - 1`, `desde_ant = hasta_ant - (días - 1)` |
| `rankingProfesores` | `fn_ind_top_profesores(...)` (ya limita a 5) |
| `turnosPorSemana` | `fn_ind_turnos_por_semana(...)` |
| `rankingMateriasMasPedidas` / `rankingMateriasMayorIngreso` | `fn_ind_top_materias_demanda` / `fn_ind_top_materias_ingresos` |
| `GET /api/indicadores/mapa-calor` | `fn_ind_mapa_calor(desde, hasta, materia, profesor, nivel, hora_desde, hora_hasta)` |

- Deuda pendiente total usa `fn_deuda_al(corte)` con corte = `min(hasta, hoy)`; es la misma definición de deuda de HU-PAG-02 (ver [`cobranza.md`](cobranza.md)). Ingresos = pagos vigentes, sin anulados.
- `mejora`: `true` verde, `false` rojo, `null` sin flecha. Ya considera `menorEsMejor` (deuda y % de cancelaciones: bajar es mejorar). La flecha ▲/▼ sale del signo de `variacionPorcentual`; el **color** sale de `mejora`.
- `valor` o `variacionPorcentual` en `null` → mostrar "—".
- Mapa de calor: solo vienen celdas con demanda; el front completa con 0 y usa `maxTurnos` para la escala de color. `horaHasta` es excluyente y filtra por hora de inicio.
- El back valida que sea Gerente (las funciones no validan rol).

```ts
import { RUTA, RUTA_MAPA_CALOR, type IndicadoresResponse, type MapaCalorResponse } from "@/contracts/indicadores";

const tablero = await apiGet<IndicadoresResponse>(`${RUTA}?desde=${d}&hasta=${h}&nivel=Secundario`);
const calor = await apiGet<MapaCalorResponse>(`${RUTA_MAPA_CALOR}?desde=${d}&hasta=${h}&horaDesde=14:00&horaHasta=20:00`);
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
