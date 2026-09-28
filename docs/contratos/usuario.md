# Cómo usar el contrato `usuario`

Contrato: [`src/contracts/usuario.ts`](../../src/contracts/usuario.ts). Es el acuerdo entre las dos mitades: nadie tipea una URL a mano ni redefine el shape de la respuesta.

Archivos que toca cada equipo:

```
src/contracts/usuario.ts                          ← el acuerdo (ya existe)
src/app/api/usuarios/route.ts                     ← back: GET listar, POST crear
src/app/api/usuarios/[id]/route.ts                ← back: GET detalle, PUT editar
src/app/api/usuarios/[id]/inactivar/route.ts      ← back: POST inactivar
src/app/api/usuarios/[id]/desbloquear/route.ts    ← back: POST desbloquear
src/server/usuarios/usuario.service.ts            ← back: reglas de negocio
src/server/usuarios/usuario.repo.ts               ← back: SQL
src/server/usuarios/usuario.mapper.ts             ← back: snake_case → camelCase
src/server/usuarios/usuario.types.ts              ← back: shape de la fila de la base
src/app/.../usuarios/page.tsx                     ← front: pantalla
```

---

# Back-end

## 1. Ruta real

```ts
// src/app/api/usuarios/route.ts
import { withRoute, parseBody } from "@/lib/http/handler";
import { ok, created } from "@/lib/http/responses";
import { listarUsuariosQuery, crearUsuarioBody } from "@/contracts/usuario";
import * as service from "@/server/usuarios/usuario.service";

export const GET = withRoute(async ({ req }) => {
  const sp = new URL(req.url).searchParams;
  const filtros = listarUsuariosQuery.parse(Object.fromEntries(sp));
  return ok(await service.listar(filtros));
});

export const POST = withRoute(async ({ req, session }) => {
  const input = await parseBody(req, crearUsuarioBody);
  return created(await service.crear(input, session.usuarioId));
});
```

`session.usuarioId` sale de la sesión, no del body. Por eso no está en el contrato: es quien opera, no un dato del formulario. Va al service solo para la auditoría (`SET LOCAL app.usuario_id`).

```ts
// src/app/api/usuarios/[id]/route.ts
export const PUT = withRoute<{ id: string }>(async ({ req, session, params }) => {
  const id = parseId((await params).id);
  const input = await parseBody(req, editarUsuarioBody);
  return ok(await service.editar(id, input, session.usuarioId));
});
```

```ts
// src/app/api/usuarios/[id]/inactivar/route.ts   (ídem .../desbloquear/route.ts)
export const POST = withRoute<{ id: string }>(async ({ session, params }) => {
  const id = parseId((await params).id);
  return ok(await service.inactivar(id, session.usuarioId));
});
```

Las cuatro rutas van envueltas en `withRoute`: resuelve la sesión (401 si no hay), captura el error y lo mapea a HTTP. El service nunca ve un status code.

## 2. El `mapper.ts` — los nombres de la base se traducen acá y en ningún otro lado

```ts
// src/server/usuarios/usuario.mapper.ts
import type { UsuarioResponse } from "@/contracts/usuario";
import type { UsuarioRow } from "./usuario.types";

export function toApi(row: UsuarioRow): UsuarioResponse {
  return {
    id: row.id,
    nombre: row.nombre,
    apellido: row.apellido,
    dni: row.dni,
    email: row.email,
    rol: { id: row.rol_id, nombre: row.rol_nombre },              // ← del JOIN con rol
    academia: row.academia_id
      ? { id: row.academia_id, nombre: row.academia_nombre! }     // ← nullable en la base
      : null,
    estado: row.estado,
    bloqueadoHasta: row.bloqueado_hasta?.toISOString() ?? null,   // ← Date → ISO string
    fechaCreacion: row.fecha_creacion.toISOString(),
  };
}
```

Dos cosas que el contrato obliga a hacer acá:

- Los `timestamp` de pg vuelven como `Date` y el contrato dice `string` → `.toISOString()`. Si te lo olvidás, no compila.
- `intentos_fallidos` y `auth_id` **no** se mapean: son datos internos del login, no viajan al front.

## 3. El `service.ts`

```ts
// src/server/usuarios/usuario.service.ts
import type { CrearUsuarioInput, UsuarioResponse } from "@/contracts/usuario";
import { withTransaction } from "@/lib/db/tx";
import { withAuditUser } from "@/lib/audit/audit";
import { ConflictError, ValidationError } from "@/lib/http/errors";
import { toApi } from "./usuario.mapper";
import * as repo from "./usuario.repo";

export async function crear(
  input: CrearUsuarioInput,
  usuarioId: number,
): Promise<UsuarioResponse> {
  return withTransaction(async (client) => {
    await withAuditUser(client, usuarioId);

    const rol = await repo.buscarRol(input.rolId, client);
    if (!rol) throw new ValidationError("REFERENCIA_INVALIDA", "El rol no existe.", "rolId");

    // Regla que zod no puede validar: al contrato solo llega el id del rol, no su nombre.
    if (rol.nombre === "Profesor" && input.academiaId === null) {
      throw new ValidationError(
        "ACADEMIA_REQUERIDA",
        "Un profesor tiene que pertenecer a una academia.",
        "academiaId",
      );
    }

    if (await repo.existeDni(input.dni, client)) {
      throw new ConflictError("DNI_DUPLICADO", "Ya existe un usuario activo con ese DNI.", "dni");
    }
    if (await repo.existeEmail(input.email, client)) {
      throw new ConflictError("EMAIL_DUPLICADO", "Ya existe un usuario activo con ese email.", "email");
    }

    // La contraseña NO se guarda acá: se crea la cuenta en Supabase Auth y la tabla
    // solo persiste el `auth_id` que devuelve. Si Auth no responde →
    // ServicioAuthNoDisponibleError (503, AUTH_NO_DISPONIBLE) y la transacción hace
    // ROLLBACK: no queda un usuario que no se puede loguear.
    const authId = await crearCuentaAuth(input.email, input.password);

    const row = await repo.insert({ ...input, authId }, client);
    return toApi(row);
  });
}
```

Notas del patrón:

- El parámetro es `CrearUsuarioInput` (`z.output`), no `...Body`: el service recibe lo ya validado, con los defaults aplicados (`academiaId` ya es `null`, nunca `undefined`).
- `withAuditUser` va como primera línea de toda transacción que escriba. Si se olvida, la fila de auditoría queda con `usuario_id` NULL.
- Cada `throw` usa un código que **está declarado en el contrato** (`ErrorUsuario`). Si el service necesita uno nuevo, primero se agrega al contrato y después se lanza.
- Los chequeos de duplicado dan el mensaje lindo; el UNIQUE de la base es la red de seguridad bajo concurrencia, y `traducirErrorPostgres` ya mapea `usuario_dni` y `usuario_email` a esos mismos códigos.

Reglas de negocio de este módulo (las que no fuerza la base):

| Regla | Dónde | Error |
|---|---|---|
| Profesor sin academia | `crear` / `editar` | `ACADEMIA_REQUERIDA` (422) |
| Baja de un profesor con turnos futuros reservados | `inactivar` | `PROFESOR_CON_TURNOS_FUTUROS` (409) |
| Nadie se inactiva a sí mismo | `inactivar` | `AUTOBAJA_NO_PERMITIDA` (409) |
| Desbloquear = `intentos_fallidos = 0` y `bloqueado_hasta = NULL` | `desbloquear` | — |
| El listado y los combos filtran `estado = 'activo'` por defecto | `listar` | — |

## 4. Mientras el service no existe: datos stub

Sirve para que el front arranque el mismo día que se firma el contrato. Se borra cuando entra la ruta real; el front no se toca.

```ts
// src/app/api/usuarios/route.ts
import { withRoute } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import type { UsuarioResponse } from "@/contracts/usuario";

const FIXTURE: UsuarioResponse[] = [
  {
    id: 1, nombre: "Ana", apellido: "Gómez", dni: "30111222",
    email: "ana@academia.edu.ar",
    rol: { id: 1, nombre: "Gerente" },
    academia: { id: 1, nombre: "Sede Centro" },
    estado: "activo", bloqueadoHasta: null,
    fechaCreacion: "2026-03-01T12:00:00.000Z",
  },
];

export const GET = withRoute(async () => ok(FIXTURE));
```

El fixture está tipado como `UsuarioResponse[]`: si el contrato cambia, el stub deja de compilar. Ese es el punto.

---

# Front

## 1. Importar del contrato, nunca tipear la URL

```ts
import {
  RUTA,
  rutaUsuario,
  rutaInactivar,
  type CrearUsuarioBody,
  type UsuarioResponse,
  type ErrorUsuario,
} from "@/contracts/usuario";
import { apiGet, apiGetOpcional, apiSend, ApiError, mensajeDeError } from "@/lib/api-client";
```

## 2. Cargar el listado

```ts
const usuarios = await apiGet<UsuarioResponse[]>(`${RUTA}?estado=activo`);

// Los combos de rol y academia son datos NO esenciales: si fallan, la pantalla
// tiene que seguir mostrando el listado.
const roles = await apiGetOpcional<{ id: number; nombre: string }[]>("/api/roles", []);
```

## 3. Armar el body tipado

```ts
const body: CrearUsuarioBody = {
  nombre: nombre.trim(),
  apellido: apellido.trim(),
  dni: dni.trim(),
  email: email.trim().toLowerCase(),
  rolId: Number(rolId),
  academiaId: academiaId ? Number(academiaId) : null,   // "" no es un id: va null
  password,
};
```

Declarar el tipo **en esta línea** y no dentro del `apiSend` es lo que importa: el error del compilador te señala el campo mal escrito, no la llamada.

## 4. Llamar y tipar la respuesta

```ts
const creado = await apiSend<UsuarioResponse>("POST", RUTA, body);
setUsuarios((prev) => [...prev, creado]);
```

Se agrega lo que devolvió la API, no el borrador local: trae el `id` real, la `fechaCreacion` que completó la base y el rol ya resuelto con su nombre.

```ts
// Editar e inactivar usan los helpers de ruta, nunca un template literal a mano.
const editado = await apiSend<UsuarioResponse>("PUT", rutaUsuario(id), body);
const dadoDeBaja = await apiSend<UsuarioResponse>("POST", rutaInactivar(id));
```

## 5. Manejar los errores que el contrato declara

```ts
try {
  const creado = await apiSend<UsuarioResponse>("POST", RUTA, body);
  ...
} catch (e) {
  const codigo = (e instanceof ApiError ? e.codigo : undefined) as ErrorUsuario | undefined;

  if (codigo === "DNI_DUPLICADO") {
    setErrores({ dni: "Ya existe un usuario activo con ese DNI." });
  } else if (codigo === "EMAIL_DUPLICADO") {
    setErrores({ email: "Ya existe un usuario activo con ese email." });
  } else if (codigo === "ACADEMIA_REQUERIDA") {
    setErrores({ academiaId: "Un profesor tiene que pertenecer a una academia." });
  } else if (codigo === "PROFESOR_CON_TURNOS_FUTUROS") {
    setErrorGlobal("No se puede dar de baja: el profesor tiene turnos futuros reservados.");
  } else {
    setErrorGlobal(mensajeDeError(e));   // 422, 500, red caída
  }
}
```

`ErrorUsuario` es una unión cerrada: si el back inventa un código que no está en el contrato, el front no lo puede manejar. Por eso el código nuevo se escribe **primero** en el contrato.

Para marcar el input en rojo sin el `if` por código: el back manda `error.campo` (`dni`, `email`, `academiaId`), que coincide con el nombre del campo del body, y llega como `(e as ApiError).campo`.

---

## Regla de oro

El contrato se edita **antes** que la pantalla y **antes** que el service, y se edita una sola vez para los dos. Cambiar el shape sin tocar el contrato = una mitad compila, la otra rompe en runtime — que es exactamente lo que este archivo evita.
