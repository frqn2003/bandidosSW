# Cómo usar el contrato `academia`

Contrato: [`src/contracts/academia.ts`](../../src/contracts/academia.ts). La sede física: cada academia tiene sus propios usuarios, sus profesores y **una** agenda.

El horario de atención NO está en este contrato: nace con la academia y se edita en otra pantalla → [`agenda.md`](agenda.md).

Archivos que toca cada equipo:

```
src/contracts/academia.ts                          ← el acuerdo (ya existe)
src/app/api/academias/route.ts                     ← back: GET listar, POST crear
src/app/api/academias/[id]/route.ts                ← back: GET detalle, PUT editar
src/app/api/academias/[id]/inactivar/route.ts      ← back: POST inactivar
src/server/academias/academia.service.ts           ← back: reglas de negocio
src/server/academias/academia.repo.ts              ← back: SQL
src/server/academias/academia.mapper.ts            ← back: snake_case → camelCase
src/server/academias/academia.types.ts             ← back: shape de la fila
src/app/.../academias/page.tsx                     ← front: pantalla
```

---

# Back-end

## 1. Ruta real

```ts
// src/app/api/academias/route.ts
import { withRoute, parseBody } from "@/lib/http/handler";
import { ok, created } from "@/lib/http/responses";
import { listarAcademiasQuery, crearAcademiaBody } from "@/contracts/academia";
import * as service from "@/server/academias/academia.service";

export const GET = withRoute(async ({ req }) => {
  const sp = new URL(req.url).searchParams;
  const filtros = listarAcademiasQuery.parse(Object.fromEntries(sp));
  return ok(await service.listar(filtros));
});

export const POST = withRoute(async ({ req, session }) => {
  const input = await parseBody(req, crearAcademiaBody);
  return created(await service.crear(input, session.usuarioId));
});
```

## 2. El `mapper.ts`

```ts
// src/server/academias/academia.mapper.ts
import type { AcademiaResponse } from "@/contracts/academia";
import type { AcademiaRow } from "./academia.types";

export function toApi(row: AcademiaRow): AcademiaResponse {
  return {
    id: row.id,
    nombre: row.nombre,
    direccion: row.direccion,
    telefono: row.telefono,
    estado: row.estado,
    fechaCreacion: row.created_at.toISOString(),       // ← Date → ISO string
    fechaActualizacion: row.updated_at.toISOString(),
  };
}
```

## 3. El `service.ts`

```ts
// src/server/academias/academia.service.ts
export async function crear(
  input: CrearAcademiaInput,
  usuarioId: number,
): Promise<AcademiaResponse> {
  return withTransaction(async (client) => {
    await withAuditUser(client, usuarioId);

    if (await repo.existeNombre(input.nombre, client)) {
      throw new ConflictError(
        "NOMBRE_DUPLICADO",
        "Ya existe una academia activa con ese nombre.",
        "nombre",
      );
    }

    const row = await repo.insert(input, client);
    // La agenda es 1 a 1 con la academia: se crea acá, en la misma transacción.
    // Si se creara después, habría academias sin agenda y el ABM de horarios
    // tendría que contemplar ese caso para siempre.
    await repo.insertAgenda(row.id, client);
    return toApi(row);
  });
}
```

`uq_academia_nombre_activa` compara `lower(nombre)`: el chequeo del service tiene que ser case-insensitive también, o el mensaje lindo no aparece nunca y salta el UNIQUE crudo.

Reglas de negocio de este módulo:

| Regla | Dónde | Error |
|---|---|---|
| Nombre repetido entre academias activas | `crear` / `editar` | `NOMBRE_DUPLICADO` (409) |
| Baja con usuarios activos asignados | `inactivar` | `ACADEMIA_CON_USUARIOS` (409) |
| Baja con turnos futuros reservados | `inactivar` | `ACADEMIA_CON_TURNOS_FUTUROS` (409) |
| Al crear la academia se crea su agenda | `crear` | — |

## 4. Mientras el service no existe: datos stub

```ts
// src/app/api/academias/route.ts
const FIXTURE: AcademiaResponse[] = [
  {
    id: 1, nombre: "Sede Centro", direccion: "Av. Belgrano 123",
    telefono: "3874000111", estado: "activo",
    fechaCreacion: "2026-03-01T12:00:00.000Z",
    fechaActualizacion: "2026-03-01T12:00:00.000Z",
  },
];

export const GET = withRoute(async () => ok(FIXTURE));
```

---

# Front

## 1. Importar del contrato, nunca tipear la URL

```ts
import {
  RUTA,
  rutaAcademia,
  rutaInactivar,
  type CrearAcademiaBody,
  type AcademiaResponse,
  type AcademiaOpcion,
  type ErrorAcademia,
} from "@/contracts/academia";
import { apiGet, apiSend, ApiError, mensajeDeError } from "@/lib/api-client";
```

## 2. Cargar el listado y el combo

```ts
const academias = await apiGet<AcademiaResponse[]>(`${RUTA}?estado=activo`);

// En las pantallas de usuarios y profesores, la academia es un <select>:
const opciones = useCatalogo<AcademiaOpcion>(`${RUTA}?estado=activo`);
```

`AcademiaOpcion` es `Pick<AcademiaResponse, "id" | "nombre">`: el mismo endpoint sirve para la tabla y para el combo, y el combo declara que solo usa dos campos.

## 3. Armar el body tipado

```ts
const body: CrearAcademiaBody = {
  nombre: nombre.trim(),
  direccion: direccion.trim(),
  telefono: telefono.trim() || null,   // "" no es un teléfono: va null
};
```

## 4. Llamar y tipar la respuesta

```ts
const creada = await apiSend<AcademiaResponse>("POST", RUTA, body);
setAcademias((prev) => [...prev, creada]);

const editada = await apiSend<AcademiaResponse>("PUT", rutaAcademia(id), body);
const dadaDeBaja = await apiSend<AcademiaResponse>("POST", rutaInactivar(id));
```

## 5. Manejar los errores que el contrato declara

```ts
const codigo = (e instanceof ApiError ? e.codigo : undefined) as ErrorAcademia | undefined;

if (codigo === "NOMBRE_DUPLICADO") {
  setErrores({ nombre: "Ya existe una academia activa con ese nombre." });
} else if (codigo === "ACADEMIA_CON_USUARIOS") {
  setErrorGlobal("No se puede dar de baja: la academia tiene usuarios activos.");
} else if (codigo === "ACADEMIA_CON_TURNOS_FUTUROS") {
  setErrorGlobal("No se puede dar de baja: hay turnos reservados por venir.");
} else {
  setErrorGlobal(mensajeDeError(e));
}
```
