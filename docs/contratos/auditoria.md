# Cómo usar el contrato `auditoria`

Contrato: [`src/contracts/auditoria.ts`](../../src/contracts/auditoria.ts). Solo lectura, dos bitácoras distintas:

- `auditoria` → **cambios de filas** (INSERT/UPDATE/DELETE) sobre `materia`, `profesor`, `profesor_materia`, `agenda_profesional`, `alumno` y `turno`. Las escribe el trigger `fn_auditoria()`.
- `auditoria_sesion` → **accesos**: login, logout, login_fallido, bloqueado, acceso_denegado. Un evento de sesión no es un cambio de fila, por eso es otra tabla y otro endpoint.

**No hay POST, PUT ni DELETE.** Una bitácora que se puede editar desde la API no es una bitácora.

Archivos que toca cada equipo:

```
src/contracts/auditoria.ts                       ← el acuerdo (ya existe)
src/app/api/auditoria/route.ts                   ← back: GET bitácora de cambios
src/app/api/auditoria/sesiones/route.ts          ← back: GET bitácora de accesos
src/server/auditoria/auditoria.repo.ts           ← back: SQL + count
src/server/auditoria/auditoria.mapper.ts         ← back: snake_case → camelCase
src/app/.../auditoria/page.tsx                   ← front: pantalla
```

Quién escribe estas tablas está en [`src/lib/audit/audit.ts`](../../src/lib/audit/audit.ts): `withAuditUser(client, usuarioId)` hace `SET LOCAL app.usuario_id`, y el trigger lee esa variable. Si un service escribe sin llamarlo, la fila de auditoría queda con `usuario_id` NULL y no se sabe quién fue.

---

# Back-end

## 1. Ruta real

```ts
// src/app/api/auditoria/route.ts
import { withRoute } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import { listarAuditoriaQuery } from "@/contracts/auditoria";
import * as service from "@/server/auditoria/auditoria.service";

export const GET = withRoute(async ({ req, session }) => {
  exigirRol(session, "Gerente");        // la bitácora no la ve cualquiera
  const sp = new URL(req.url).searchParams;
  const filtros = listarAuditoriaQuery.parse(Object.fromEntries(sp));
  return ok(await service.listar(filtros));
});
```

Un intento contra este endpoint sin el rol necesario se rechaza **y** se registra como `acceso_denegado` en `auditoria_sesion`: el evento es justamente lo que esta pantalla sirve para ver.

## 2. El `mapper.ts`

```ts
// src/server/auditoria/auditoria.mapper.ts
import type { AuditoriaResponse } from "@/contracts/auditoria";

export function toApi(row: AuditoriaRow): AuditoriaResponse {
  return {
    id: Number(row.id),                    // ← bigint: pg lo devuelve como string
    tabla: row.tabla,
    operacion: row.operacion,
    registroId: row.registro_id,
    usuario: row.usuario_id
      ? { id: row.usuario_id, nombre: row.usuario_nombre!, apellido: row.usuario_apellido! }
      : null,                              // ON DELETE SET NULL: puede no estar
    fechaHora: row.fecha_hora.toISOString(),
    valoresAnteriores: row.valores_anteriores,   // jsonb: se pasa tal cual
    valoresNuevos: row.valores_nuevos,
  };
}
```

Dos cosas de este mapper:

- `id` es `bigint` y pg lo devuelve **string**. El contrato dice `number` → `Number(...)`, igual que con los `numeric`.
- Los snapshots `jsonb` se pasan **tal cual**, con los nombres de columna en snake_case. Es la única excepción a la regla de camelCase, y es a propósito: son el contenido de la fila que cambió, no un shape del contrato. Traducirlos obligaría a mantener un diccionario por tabla.

## 3. El `service.ts`

```ts
// src/server/auditoria/auditoria.service.ts
export async function listar(filtros: ListarAuditoriaQuery): Promise<Pagina<AuditoriaResponse>> {
  if (filtros.desde && filtros.hasta && filtros.hasta < filtros.desde) {
    throw new ValidationError("RANGO_INVALIDO", "El rango de fechas está invertido.", "hasta");
  }

  // El count va en la misma consulta (window function) y no en un segundo
  // SELECT: con la tabla creciendo, dos consultas separadas pueden dar totales
  // distintos entre sí.
  const { filas, total } = await repo.listar(filtros);

  return {
    items: filas.map(toApi),
    total,
    pagina: filtros.pagina,
    porPagina: filtros.porPagina,
  };
}
```

Es el **único módulo paginado**: los demás devuelven un array porque son listados acotados. Esta tabla crece para siempre y el front nunca la pide entera. `pagina` y `porPagina` tienen default en el contrato (1 y 50), así que en `z.output` siempre llegan con valor.

Reglas de este módulo:

| Regla | Dónde | Error |
|---|---|---|
| `hasta < desde` | `listar` | `RANGO_INVALIDO` (422) |
| `porPagina` máximo 100 | zod | `DATOS_INVALIDOS` (422) |
| Solo lo ve el rol Gerente | la ruta | 403 (`acceso_denegado` registrado) |
| Nadie escribe por la API | — | no hay POST/PUT/DELETE |

## 4. Datos stub

```ts
const FIXTURE: Pagina<AuditoriaResponse> = {
  items: [
    {
      id: 1, tabla: "turno", operacion: "UPDATE", registroId: 12,
      usuario: { id: 2, nombre: "Ana", apellido: "Gómez" },
      fechaHora: "2026-09-21T14:30:00.000Z",
      valoresAnteriores: { estado: "Reservado" },
      valoresNuevos: { estado: "Cancelado" },
    },
  ],
  total: 1, pagina: 1, porPagina: 50,
};

export const GET = withRoute(async () => ok(FIXTURE));
```

---

# Front

## 1. Importar del contrato

```ts
import {
  RUTA,
  RUTA_SESIONES,
  type AuditoriaResponse,
  type AuditoriaSesionResponse,
  type Pagina,
  type TablaAuditada,
  type ErrorAuditoria,
} from "@/contracts/auditoria";
```

## 2. Pedir una página

```ts
const params = new URLSearchParams({ pagina: String(pagina), porPagina: "50" });
if (tabla) params.set("tabla", tabla);
if (desde) params.set("desde", desde);

const pag = await apiGet<Pagina<AuditoriaResponse>>(`${RUTA}?${params}`);
// pag.items → las filas · pag.total → para el paginador
```

## 3. El uso más común: la historia de un registro

```ts
// Desde el detalle de un alumno o de un turno: "ver historial".
const historia = await apiGet<Pagina<AuditoriaResponse>>(
  `${RUTA}?tabla=turno&registroId=${turnoId}&porPagina=100`,
);
```

`tabla` + `registroId` juntos son la línea de tiempo de ese registro. `TablaAuditada` es la unión cerrada de las seis tablas con trigger: si el `<select>` ofrece otra, no compila.

## 4. Mostrar el cambio

```tsx
// Cuál de los dos snapshots es null lo define la operación:
//   INSERT → anteriores null · UPDATE → los dos · DELETE → nuevos null
const campos = new Set([
  ...Object.keys(fila.valoresAnteriores ?? {}),
  ...Object.keys(fila.valoresNuevos ?? {}),
]);

{[...campos].map((campo) => (
  <tr key={campo}>
    <td>{campo}</td>                                     {/* snake_case, es el nombre real */}
    <td>{String(fila.valoresAnteriores?.[campo] ?? "—")}</td>
    <td>{String(fila.valoresNuevos?.[campo] ?? "—")}</td>
  </tr>
))}
```

Para un UPDATE conviene mostrar solo los campos que cambiaron; el resto es ruido. Los valores son `unknown`: se muestran, no se operan.

## 5. La bitácora de accesos

```ts
const sesiones = await apiGet<Pagina<AuditoriaSesionResponse>>(
  `${RUTA_SESIONES}?evento=login_fallido&pagina=1`,
);
```

`usuario` puede venir null (login fallido con un email que no existe, o usuario borrado): la pantalla muestra "—", no `undefined`. `ipOrigen` y `detalle` también son nullables.

## 6. Manejar los errores que el contrato declara

```ts
const codigo = (e instanceof ApiError ? e.codigo : undefined) as ErrorAuditoria | undefined;

if (codigo === "RANGO_INVALIDO") {
  setErrores({ hasta: "La fecha de fin no puede ser anterior a la de inicio." });
} else {
  setErrorGlobal(mensajeDeError(e));
}
```
