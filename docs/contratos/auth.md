# Cómo usar el contrato `auth`

Contrato: [`src/contracts/auth.ts`](../../src/contracts/auth.ts). Login, logout, sesión actual, cambio de contraseña y recuperación (HU-SIS-01).

No es un ABM, y eso cambia varias cosas:

- **La contraseña no está en la base.** `usuario` no tiene columna de contraseña: la valida Supabase Auth (GoTrue) contra `auth.users`, y `usuario.auth_id` es el vínculo. Ningún response de este contrato devuelve una contraseña.
- **El error de credenciales es genérico y sin `campo`.** No distingue email inexistente de contraseña incorrecta — ni siquiera para un usuario inactivo. Marcar en rojo el input de la contraseña confirmaría que el email era válido.
- **El conteo de intentos, el bloqueo y la bitácora son del back.** El front solo muestra lo que el error trae.

Archivos que toca cada equipo:

```
src/contracts/auth.ts                          ← el acuerdo (ya existe)
src/app/api/auth/login/route.ts                ← back: POST login
src/app/api/auth/logout/route.ts               ← back: POST logout
src/app/api/auth/sesion/route.ts               ← back: GET sesión actual
src/app/api/auth/cambiar-contrasena/route.ts   ← back: POST cambio obligatorio
src/app/api/auth/recuperar/route.ts            ← back: POST enlace de recuperación
src/modules/auth/auth.service.ts               ← back: intentos, bloqueo, bitácora
src/lib/auth/{gotrue,cookie,session}.ts        ← back: YA EXISTEN, ver abajo
src/data/auth.ts                               ← front: capa de datos (hoy fixture)
src/lib/sesion.tsx                             ← front: contexto de sesión
src/app/page.tsx                               ← front: pantalla de login
```

---

# Back-end

## 0. Lo que ya está hecho

Antes de escribir nada, mirar [`src/lib/auth/`](../../src/lib/auth): el andamiaje ya existe y está probado.

| Archivo | Qué da |
|---|---|
| `gotrue.ts` | `verificarCredenciales(email, password)` → `{ ok: true, tokens }` \| `{ ok: false, motivo: "credenciales" \| "servicio" }` · `invalidarToken(accessToken)` |
| `cookie.ts` | `escribirCookie(usuarioId, accessToken)` · `leerCookie()` · `borrarCookie()` (cookie firmada) |
| `session.ts` | `getSession()` · `requireSession()` · `destroySession()` |

Lo que **falta** es exponerlo: las rutas `/api/auth/*` no existen.

> ⚠️ Mientras `SESSION_USUARIO_DNI` esté en `.env.local`, `requireSession()` resuelve por el fallback de desarrollo y **nunca devuelve 401**: el login va a parecer que no hace nada. Está documentado en `session.ts`. El día que se pruebe el login de verdad, hay que sacar esa línea.

## 1. Ruta real

```ts
// src/app/api/auth/login/route.ts
import { withPublicRoute, parseBody } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import { loginBody } from "@/contracts/auth";
import * as service from "@/modules/auth/auth.service";

// `withPublicRoute`, no `withRoute`: pedir sesión para poder loguearse sería
// un círculo. Es el único wrapper que no llama a requireSession().
export const POST = withPublicRoute(async ({ req }) => {
  const input = await parseBody(req, loginBody);
  return ok(await service.login(input, req));
});
```

`/logout` y `/sesion` sí van con sesión; `/recuperar` es pública.

## 2. El `service.ts` — acá viven los intentos y el bloqueo

```ts
// src/modules/auth/auth.service.ts
export async function login(input: LoginInput, req: Request): Promise<SesionResponse> {
  const usuario = await repo.buscarPorEmail(input.email);

  // Bloqueada: 423 ANTES de tocar GoTrue. Probar de nuevo no sirve hasta que
  // pase el tiempo, y el front necesita distinguirlo para mostrar el contador.
  if (usuario?.bloqueado_hasta && usuario.bloqueado_hasta > new Date()) {
    await repo.registrarEvento(usuario.id, "bloqueado", req);
    throw new CuentaBloqueadaError(usuario.bloqueado_hasta);
  }

  const resultado = await verificarCredenciales(input.email, input.password);

  // Servicio caído ≠ credenciales mal. Si contara como intento fallido, una
  // caída de Supabase bloquearía a todo el mundo por 15 minutos.
  if (!resultado.ok && resultado.motivo === "servicio") {
    throw new ServicioAuthNoDisponibleError();
  }

  // Genérico: mismo error para email inexistente, contraseña incorrecta y
  // usuario inactivo. El `if` de abajo es lo único que los diferencia.
  if (!resultado.ok || !usuario || usuario.estado !== "activo") {
    if (usuario) {
      await repo.sumarIntentoFallido(usuario.id);   // CHECK 0..5 + bloqueado_hasta
      await repo.registrarEvento(usuario.id, "login_fallido", req);
    }
    throw new CredencialesInvalidasError();
  }

  const ultimaConexion = await repo.ultimoLogin(usuario.id);   // ANTES de registrar el nuevo
  await repo.limpiarIntentos(usuario.id);
  await repo.registrarEvento(usuario.id, "login", req);
  await escribirCookie(usuario.id, resultado.tokens.accessToken);

  return toApi(usuario, ultimaConexion);
}
```

Reglas de este módulo:

| Regla | Dónde | Error |
|---|---|---|
| Email o contraseña incorrectos (o cuenta inactiva) | `login` | `CREDENCIALES_INVALIDAS` (401) |
| 5 intentos fallidos → 15 minutos de bloqueo | `login` + `sumarIntentoFallido` | `CUENTA_BLOQUEADA` (423) |
| Supabase Auth no responde | `login` | `AUTH_NO_DISPONIBLE` (503) — **no** suma intento |
| Sin sesión o expirada por inactividad | `requireSession` | `NO_AUTENTICADO` (401) |
| Contraseña nueva que no cumple la política | `cambiarContrasena` | `CONTRASENA_INSEGURA` (422) |
| Contraseña nueva igual a la actual | `cambiarContrasena` | `CONTRASENA_REUSADA` (422) |
| `recuperar` contesta 204 exista o no la cuenta | `recuperar` | — |

`ultimaConexion` se lee **antes** de registrar el login nuevo; si se lee después, el usuario ve siempre "última conexión: ahora".

## 3. El `mapper.ts`

```ts
export function toApi(row: UsuarioSesionRow, ultimaConexion: Date | null): SesionResponse {
  return {
    usuario: {
      id: row.id,
      nombre: row.nombre,
      apellido: row.apellido,
      email: row.email,
      rol: { id: row.rol_id, nombre: row.rol_nombre },              // ← JOIN con rol
      academia: row.academia_id
        ? { id: row.academia_id, nombre: row.academia_nombre! }
        : null,
    },
    // PENDIENTE: ver la nota del contrato — la columna todavía no existe.
    debeCambiarContrasena: row.debe_cambiar_contrasena ?? false,
    ultimaConexion: ultimaConexion?.toISOString() ?? null,
  };
}
```

Nunca se mapean `intentos_fallidos`, `bloqueado_hasta` ni `auth_id`: son internos del login.

---

# Front

## 1. Importar del contrato

```ts
import {
  RUTA_LOGIN,
  RUTA_SESION,
  MINUTOS_INACTIVIDAD,
  type LoginBody,
  type SesionResponse,
  type DatosCuentaBloqueada,
  type ErrorAuth,
} from "@/contracts/auth";
```

## 2. Armar el body tipado y llamar

```ts
const body: LoginBody = { email: email.trim().toLowerCase(), password };
const sesion = await apiSend<SesionResponse>("POST", RUTA_LOGIN, body);
```

## 3. Manejar los errores que el contrato declara

```ts
const codigo = (e instanceof ApiError ? e.codigo : undefined) as ErrorAuth | undefined;

if (codigo === "CREDENCIALES_INVALIDAS") {
  // Tal cual, sin marcar ningún campo: marcar la contraseña diría que el email
  // estaba bien.
  setErrorGlobal("Credenciales inválidas.");
} else if (codigo === "CUENTA_BLOQUEADA") {
  const datos = (e as ApiError).datos as DatosCuentaBloqueada | undefined;
  setBloqueadoHasta(datos?.bloqueadoHasta ?? null);   // → cuenta regresiva
} else if (codigo === "AUTH_NO_DISPONIBLE") {
  setErrorGlobal(mensajeDeError(e));                  // "intentá en unos segundos"
} else {
  setErrorGlobal(mensajeDeError(e));
}
```

## 4. Después del login

```ts
if (sesion.debeCambiarContrasena) router.replace("/cambiar-contrasena");
else router.replace("/alumnos");
```

## 5. La sesión y el rol

El menú y el guard se arman con `sesion.usuario.rol.nombre`, que es la unión cerrada `NombreRol` (`"Gerente" | "Profesor" | "Mesa de Entrada"`) — no con el `id`, que cambia si se recrea la base.

`MINUTOS_INACTIVIDAD` sale del contrato para que el aviso del front y el corte del back usen el mismo número.

> **Recordatorio:** el guard del front es UX, no seguridad. Esconder un ítem del menú no protege nada; lo que protege es `requireSession()` en cada endpoint del back.
