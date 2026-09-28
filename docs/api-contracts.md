# Contratos de API

## Flujo

```
FRONT escribe contrato → lo comparte con BACK → BACK usa el contrato para:
  1. Crear la ruta real (parsea request con los schemas del contrato)
  2. Crear el mapper.ts (traduce snake_case de la DB → camelCase del contrato)
  3. Crear el service.ts (recibe Input, no Body — lo ya validado)

Mientras tanto, FRONT usa STUBS (fixtures) para testear las pantallas.
```

**El contrato es el handoff.** Se escribe ANTES de que exista la pantalla o el service: es el acuerdo, no la documentación del acuerdo.

Va: ruta, request, response, errores. No va: SQL, reglas de negocio, componentes. Tiene que leerse entero en dos minutos.

## Ejemplo completo: Proveedor

```ts
// src/contracts/proveedor.ts
//
// Lo importan las DOS mitades. Se escribe ANTES de que exista la pantalla o el
// service: es el acuerdo, no la documentación del acuerdo.
//
// Va: ruta, request, response, errores. No va: SQL, reglas de negocio,
// componentes. Tiene que leerse entero en dos minutos.

import { z } from "zod";

// ─── Rutas ───────────────────────────────────────────────────────────────
export const RUTA = "/api/proveedores";
export const rutaProveedor = (id: number) => `${RUTA}/${id}`;
export const rutaInactivar = (id: number) => `${RUTA}/${id}/inactivar`;

// ─── Request: filtros del listado ────────────────────────────────────────
export const listarProveedoresQuery = z
  .object({
    busqueda: z.string().trim().optional(),
    estado: z.enum(["activo", "inactivo"]).optional(),
    formaPagoId: z.coerce.number().int().positive().optional(),
  })
  .strict();

// ─── Request: alta y edición ─────────────────────────────────────────────
export const crearProveedorBody = z
  .object({
    razonSocial: z.string().trim().min(1).max(150),
    cuit: z.string().trim().regex(/^\d{2}-?\d{8}-?\d$/,
      "El CUIT debe tener el formato XX-XXXXXXXX-X."),
    direccion: z.string().trim().max(255).optional(),
    telefono: z.string().trim().max(30).optional(),
    email: z.string().trim().max(120).email().optional(),
    contacto: z.string().trim().max(100).optional(),
    plazoEntregaDias: z.number().int().min(0).max(365).optional(),
    formaPagoIds: z.array(z.number().int().positive()).min(1),
  })
  .strict();

export const editarProveedorBody = crearProveedorBody;

export type CrearProveedorBody = z.input<typeof crearProveedorBody>;
export type CrearProveedorInput = z.output<typeof crearProveedorBody>;

// ─── Response ────────────────────────────────────────────────────────────
export type EstadoProveedor = "activo" | "inactivo";

export type ProveedorResponse = {
  id: number;
  razonSocial: string;
  cuit: string;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  contacto: string | null;
  plazoEntregaDias: number | null;
  formasPago: { id: number; nombre: string }[];
  estado: EstadoProveedor;
};

// ─── Errores de dominio ──────────────────────────────────────────────────
export type ErrorProveedor =
  | "CUIT_DUPLICADO"                    // 409
  | "PROVEEDOR_CON_ORDENES_ABIERTAS"    // 409, al inactivar
  | "NO_ENCONTRADO"                     // 404
  | "DATOS_INVALIDOS";
```

---

## Lo que hace FRONT (nosotros)

### 1. Crear el contrato

Crear `src/contracts/{entidad}.ts` con la estructura de arriba. Este archivo se comparte con el back.

### 2. Crear stubs para testear pantallas

Mientras el back no conecte la ruta real, crear fixtures en `src/app/api/{entidad}/route.ts`:

```ts
// src/app/api/proveedores/route.ts
// STUB — datos de prueba hasta que el back conecte la ruta real
import { withRoute } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import type { ProveedorResponse } from "@/contracts/proveedor";

const FIXTURE: ProveedorResponse[] = [
  {
    id: 1, razonSocial: "Distribuidora Norte S.A.", cuit: "30-11223344-5",
    direccion: null, telefono: null, email: null, contacto: null,
    plazoEntregaDias: 3, formasPago: [{ id: 1, nombre: "Contado" }],
    estado: "activo",
  },
];

export const GET = withRoute(async () => ok(FIXTURE));
```

> **Esto es solo front.** El fixture se reemplaza cuando el back conecte la ruta real.

### 3. Implementar la pantalla (pasos del front)

**Importar del contrato**, nunca tipear la URL:

```ts
import {
  RUTA,
  type CrearProveedorBody,
  type ProveedorResponse,
  type ErrorProveedor,
} from "@/contracts/proveedor";
```

**Armar el body tipado** — declarar el tipo en una variable, no en el `apiSend`:

```ts
const body: CrearProveedorBody = {
  razonSocial: razonSocial.trim(),
  cuit: cuit.trim(),
  email: email.trim() || undefined,        // "" no es un email válido: se omite
  plazoEntregaDias: Number(plazo),
  formaPagoIds: [Number(formaPagoId)],
};
```

> El error del compilador te señala la línea del campo mal escrito, no la de la llamada.

**Llamar y tipar la respuesta** — se agrega lo que devolvió la API, no el borrador local:

```ts
const creado = await apiSend<ProveedorResponse>("POST", RUTA, body);
setProveedores((prev) => [...prev, creado]);
```

**Manejar los errores que el contrato declara:**

```ts
try {
  const creado = await apiSend<ProveedorResponse>("POST", RUTA, body);
  ...
} catch (e) {
  const codigo = codigoDeError(e) as ErrorProveedor | undefined;

  if (codigo === "CUIT_DUPLICADO") {
    setErrores({ cuit: "Ya existe un proveedor con ese CUIT." });
  } else {
    setErrorGlobal(mensajeDeError(e));   // 422, 500, red caída
  }
}
```

---

## Lo que hace BACK (el equipo de back usa nuestro contrato)

> Estos ejemplos son REFERENCIA para el equipo de back. El front NO crea estos archivos — el back los implementa usando el contrato que le llega de `src/contracts/`.

### 1. Ruta real (`src/app/api/proveedores/route.ts`)

El back crea esta ruta. Usa los schemas del contrato para parsear el request:

```ts
// ─── BACK: Este archivo lo crea el equipo de back ────────────────────────
// Importa los schemas del contrato para validar request y tipos para responses.
// El front ya creó el contrato en src/contracts/proveedor.ts — usarlo como acuerdo.

import { withRoute } from "@/lib/http/handler";
import { ok, created } from "@/lib/http/responses";
import { listarProveedoresQuery, crearProveedorBody } from "@/contracts/proveedor";
import * as service from "./proveedor.service";

// GET /api/proveedores — listar con filtros
// El schema del contrato (listarProveedoresQuery) valida los query params.
// Si falta un campo requerido o el tipo es incorrecto, Zod lanza error automáticamente.
export const GET = withRoute(async ({ req }) => {
  const sp = new URL(req.url).searchParams;
  const filtros = listarProveedoresQuery.parse(Object.fromEntries(sp)); // ← valida con Zod
  return ok(await service.listar(filtros));
});

// POST /api/proveedores — crear
// parseBody usa el schema del contrato (crearProveedorBody) para validar el body.
// El resultado es CrearProveedorInput (ya validado, con defaults aplicados).
// NOTA: usuarioId viene de session, NO del body — por eso no está en el contrato.
export const POST = withRoute(async ({ req, session }) => {
  const input = await parseBody(req, crearProveedorBody); // ← retorna CrearProveedorInput
  return created(await service.crear(input, session.usuarioId));
});
```

> `usuarioId` sale de `session`, no del body. Por eso no está en el contrato.

### 2. El mapper.ts (`src/app/api/proveedores/proveedor.mapper.ts`)

El back crea este archivo. Traduce snake_case de la DB a camelCase del contrato:

```ts
// ─── BACK: Este archivo lo crea el equipo de back ────────────────────────
// La DB usa snake_case (razon_social, plazo_entrega_dias).
// El contrato (y todo el front) usa camelCase (razonSocial, plazoEntregaDias).
// Este mapper es el ÚNICO lugar donde se hace la traducción.

import type { ProveedorResponse } from "@/contracts/proveedor";
import type { ProveedorRow } from "./proveedor.types";

export function toApi(row: ProveedorRow, formasPago: FormaPago[]): ProveedorResponse {
  return {
    id: row.id,
    razonSocial: row.razon_social,          // ← snake_case → camelCase, ACÁ Y EN NINGÚN OTRO LADO
    cuit: row.cuit,
    direccion: row.direccion,
    telefono: row.telefono,
    email: row.email,
    contacto: row.contacto,
    plazoEntregaDias: row.plazo_entrega_dias,
    formasPago,
    estado: row.estado,
  };
}

// ─── CUIDADO con columnas numeric ────────────────────────────────────────
// PostgreSQL devuelve las columnas numeric como STRING, no como number.
// Si el contrato dice que un campo es number, el mapper tiene que hacer:
//   calificacion: Number(row.calificacion)
// Si te olvidás, TypeScript no compila (el contrato está tipado).
// Ese es el valor de tener los dos extremos tipados.
```

### 3. El service.ts (`src/app/api/proveedores/proveedor.service.ts`)

El back crea este archivo. Recibe `Input` (lo ya validado por Zod), no `Body`:

```ts
// ─── BACK: Este archivo lo crea el equipo de back ────────────────────────
// Importa CrearProveedorInput (el output de Zod, ya validado con defaults).
// NO importa CrearProveedorBody (eso es el input crudo del usuario).
//
// Flujo: Request → Zod valida → CrearProveedorInput → service.crear()
// El service NUNCA ve el body crudo — solo lo ya validado.

import type { CrearProveedorInput, ProveedorResponse } from "@/contracts/proveedor";
import * as repo from "./proveedor.repo";
import { toApi } from "./proveedor.mapper";

export async function crear(
  input: CrearProveedorInput,    // ← NO es ...Body — es lo ya validado por Zod
  usuarioId: number,             // ← viene de session, no del contrato
): Promise<ProveedorResponse> {
  return withTransaction(async (client) => {
    await withAuditUser(client, usuarioId);

    // Reglas de negocio acá, NO en el contrato
    if (await repo.existeCuit(input.cuit, client)) {
      throw new ConflictError("CUIT_DUPLICADO", "Ya existe un proveedor con ese CUIT.");
    }

    const row = await repo.insert(input, client);
    return toApi(row, await repo.formasPagoDe(row.id, client));
  });
}
```

> `CrearProveedorInput`, no `...Body` — el service recibe lo ya validado, después de los defaults.

---

## Reglas clave

1. **El contrato lo escribe FRONT** y se comparte con BACK — es el acuerdo.
2. **Va**: ruta, request, response, errores. **No va**: SQL, reglas de negocio, componentes.
3. **FRONT crea stubs** (fixtures) para testear pantallas mientras BACK no conecta la ruta real.
4. **BACK usa el contrato** para crear: ruta real, mapper.ts, service.ts.
5. **snake_case → camelCase** solo en el mapper.ts, en ningún otro lado.
6. **numeric de pg** → `Number()` en el mapper si el contrato dice `number`.
7. **El service recibe `Input`**, no `Body` — lo ya validado, después de defaults.
8. **El front importa tipos del contrato**, nunca tipea URLs ni bodies manualmente.
9. **Se agrega lo que devolvió la API**, no el borrador local.
