# HU-SIS-01: Como usuario del sistema (Gerente, Mesa de Entrada o Profesor), quiero iniciar sesión con mis credenciales y acceder únicamente a los módulos habilitados para mi rol, para proteger la información del centro y que cada persona opere solo aquello que le corresponde

> Generado con /brief. Revisar y ajustar antes de /disenar.

## Contexto

- **Rutas:** `/` (login, **reemplaza el template default de Next**) · `/cambiar-contrasena` · `/recuperar-contrasena`
- **Relacionada con:** todas las pantallas ya construidas (`/alumnos`, `/materias`, `/profesores`) quedan detrás del login; HU-ALU-01, HU-MAT-01 y HU-PRO-01 no cambian por dentro, solo se envuelven con el guard.
- **Prioridad:** alta (iteración 1)
- **Contrato de API:** **no existe todavía** → hay que correr `/contract auth` antes de `/disenar`. Los códigos de error ya están definidos por el back en [`src/lib/http/errors.ts`](../../src/lib/http/errors.ts) y el contrato debe usar **esos mismos**.
- **Datos:** capa de datos con fixture — `src/data/auth.ts`, patrón de [`docs/capa-de-datos-front.md`](../capa-de-datos-front.md). **Esta HU no toca `src/app/api/`, `src/modules/`, `src/lib/auth/` ni `.env.local`.**

> ⚠️ **Esto es una simulación de interfaz, no un control de seguridad.** Un login resuelto en el front se saltea con las herramientas de desarrollador en diez segundos. Quien autoriza de verdad es el back: `requireSession()` ya corre en cada endpoint. El menú filtrado por rol y la pantalla "Acceso denegado" son **UX** — le evitan al usuario ver opciones que no puede usar, no impiden el acceso a los datos.

## Propuesta inicial (del equipo)

Cuatro pantallas y un guard, con el lenguaje visual de los módulos ya construidos:

1. **Login** (`/`) — email + contraseña, error genérico, bloqueo por intentos.
2. **Cambio de contraseña obligatorio** (`/cambiar-contrasena`) — primer ingreso con contraseña temporal.
3. **Recuperación** (`/recuperar-contrasena`) — pedir el enlace por email.
4. **Acceso denegado** — no es una ruta: es lo que el guard muestra **en lugar** del contenido cuando el rol no alcanza (la URL no cambia, así el usuario ve dónde quiso entrar).

Más: Sidebar filtrado por rol + botón "Cerrar sesión" + expiración por inactividad.

**Decisiones tomadas en el checkpoint del brief:**

| Punto | Decisión |
|---|---|
| Alcance | **Todo el paquete**: login, menú por rol, logout, acceso denegado, expiración por inactividad, cambio de contraseña obligatorio y recuperación. |
| Autenticación | **Fixture** en `src/data/auth.ts`, con `// BACKEND:` indicando de qué tabla/endpoint sale cada dato. No se toca `src/lib/auth/` (el andamiaje real del back) ni `SESSION_USUARIO_DNI` del `.env.local`. |
| Persistencia | La sesión sobrevive al refresco: **`localStorage`**. |
| Pantallas existentes | `/alumnos`, `/materias` y `/profesores` **requieren sesión**: sin sesión redirigen al login, con un rol sin permiso muestran "Acceso denegado". |
| Mostrar/ocultar contraseña (opcional) | **Entra.** Un campo `CampoContrasena` reutilizable por las tres pantallas que piden contraseña. |
| "Última conexión" en el encabezado (opcional) | **Entra.** Sale de `auditoria_sesion` (último `login` anterior al actual). |
| Rol Alumno (opcional) | **No entra.** La tabla `rol` tiene exactamente tres filas (Gerente, Profesor, Mesa de Entrada) y el alumno no es usuario del sistema. Incorporarlo es un cambio de esquema, no de pantalla. |

## Wireframe (idea)

### 1) Login (`/`)

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│                    ┌────────────────┐                        │
│                    │  🎓 (logo)     │                        │
│                    │ Centro         │                        │
│                    │ Académico      │                        │
│                    └────────────────┘                        │
│              Ingresá con tu cuenta del centro                │
│   ┌────────────────────────────────────────────────────┐     │
│   │  ⚠ Credenciales inválidas.          ← rojo, genérico│     │
│   │                                                    │     │
│   │  Email*        [ana@academia.edu.ar            ]   │     │
│   │  Contraseña*   [••••••••••              ] [👁]     │     │
│   │                                                    │     │
│   │              [   Iniciar sesión   ]                │     │
│   │                                                    │     │
│   │              ¿Olvidaste tu contraseña?             │     │
│   └────────────────────────────────────────────────────┘     │
│   ┌ Datos de prueba (demo del front) ──────────────────┐     │
│   │ Gerente · gerente@demo / Demo1234                  │     │
│   │ Mesa de Entrada · mesa@demo / Demo1234             │     │
│   │ Profesor · profe@demo / Demo1234                   │     │
│   │ Primer ingreso · nuevo@demo / Temporal1            │     │
│   └────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────┘
```

Estado **bloqueada** (tras 5 intentos fallidos): el formulario se deshabilita y en su lugar aparece

```
   ⛔ La cuenta está bloqueada por intentos fallidos.
      Volvé a intentar en 14 minutos.        ← cuenta regresiva viva
```

### 2) Cambio de contraseña obligatorio (`/cambiar-contrasena`)

```
┌──────────────────────────────────────────────────────────────┐
│  Definí tu contraseña                                        │
│  Es tu primer ingreso: la contraseña temporal no se puede    │
│  seguir usando.                                              │
│                                                              │
│  Contraseña actual*   [••••••••]                      [👁]   │
│  Contraseña nueva*    [••••••••]                      [👁]   │
│     ✓ Mínimo 8 caracteres                                    │
│     ✓ Una mayúscula        ✗ Un número                       │
│     ✗ Distinta de la actual                                  │
│  Repetir la nueva*    [••••••••]                      [👁]   │
│     ✗ Las contraseñas no coinciden                           │
│                                    [ Guardar y continuar ]   │
└──────────────────────────────────────────────────────────────┘
```

Los requisitos se tildan **en vivo** mientras se escribe: el usuario no descubre al enviar que le faltaba un número.

### 3) Recuperación (`/recuperar-contrasena`)

```
┌──────────────────────────────────────────────┐        ┌──────────────────────────────────────────────┐
│  Recuperar contraseña                        │        │  📧 Revisá tu correo                         │
│  Te enviamos un enlace para definir una      │   →    │  Si ana@academia.edu.ar corresponde a una    │
│  contraseña nueva.                           │        │  cuenta del centro, le enviamos un enlace.   │
│  Email*   [ana@academia.edu.ar          ]    │        │  El enlace vence en 1 hora y se usa una vez. │
│                        [ Enviar enlace ]     │        │                      [ Volver al inicio ]    │
│                        ← Volver al inicio    │        └──────────────────────────────────────────────┘
└──────────────────────────────────────────────┘
```

La confirmación **no dice si el email existe**: eso convertiría la pantalla en un detector de cuentas válidas.

### 4) Acceso denegado (dentro del layout, con el Sidebar visible)

```
┌─────────────┬────────────────────────────────────────────────┐
│  SIDEBAR    │            🔒                                  │
│  (solo lo   │      Acceso denegado                           │
│   permitido)│  Tu rol (Mesa de Entrada) no tiene acceso a     │
│             │  Materias. Si creés que es un error, pedile     │
│             │  al Gerente que revise tus permisos.           │
│             │            [ Ir al inicio ]                    │
└─────────────┴────────────────────────────────────────────────┘
```

### 5) Sidebar con sesión

```
┌─────────────────────┐
│ 🎓 Centro Académico │
│─────────────────────│
│  (solo los módulos  │
│   del rol)          │
│─────────────────────│
│  AG  Ana Gómez      │
│      Gerente        │
│  Última conexión:   │
│  ayer 18:42         │
│  [→ Cerrar sesión]  │
└─────────────────────┘
```

Y el aviso de expiración, al volver al login:

```
   ℹ Tu sesión se cerró por inactividad. Volvé a ingresar.
```

## User flow

1. El usuario entra a cualquier ruta. **Sin sesión** → login (`/`).
2. Ingresa email y contraseña.
   - Incorrectas → *"Credenciales inválidas"* en rojo (sin decir cuál de los dos falló). Al 5° intento, cuenta bloqueada 15 minutos con cuenta regresiva.
   - Correctas y **primer ingreso** → `/cambiar-contrasena` (no puede saltearlo).
   - Correctas → entra al sistema; el Sidebar muestra solo sus módulos.
3. Navega. Si escribe a mano la URL de un módulo que su rol no permite → **Acceso denegado** (y el back registra `acceso_denegado` en la bitácora).
4. A los **30 minutos sin actividad** la sesión se cierra sola y vuelve al login con el aviso.
5. **Cerrar sesión** desde el Sidebar, disponible en todas las pantallas.
6. Si olvidó la contraseña → `/recuperar-contrasena` → confirmación de envío.

## Permisos por rol

Los módulos del Sidebar, cruzados con los tres roles de la tabla `rol`:

| Módulo | Ruta | Gerente | Mesa de Entrada | Profesor |
|---|---|:---:|:---:|:---:|
| Dashboard | `#` | ✓ | — | — |
| Sedes | `#` | ✓ | — | — |
| Turnos y Agenda | `#` | ✓ | ✓ | ✓ *(su calendario)* |
| Alumnos | `/alumnos` | ✓ | ✓ | — |
| Cuerpo Docente | `/profesores` | ✓ | — | — |
| Mi ficha | `#` | — | — | ✓ *(LECTURA)* |
| Materias | `/materias` | ✓ | — | — |
| Cobranzas | `#` | ✓ | ✓ *(pagos)* | — |
| Usuarios | `#` | ✓ | — | — |
| Reportes | `#` | ✓ | — | ✓ *(propios)* |

Dos aclaraciones sobre el rol **Profesor**:
- El criterio dice "su ficha en modo LECTURA", no el ABM del cuerpo docente. `/profesores` es el listado completo con alta y baja → **el Profesor no accede**. En su lugar el menú le muestra **"Mi ficha"**, que hoy no existe como pantalla (chip "Próx.") y llegará con su propia HU.
- "Asistencia de sus clases" e "indicadores propios" tampoco existen como módulos todavía: aparecen deshabilitados, igual que el resto de lo no construido.

## Fuente de datos (BD)

| Tabla | Campos usados | Relación clave |
|---|---|---|
| `usuario` | `id`, `nombre`, `apellido`, `email`, `rol_id`, `academia_id`, `estado`, `intentos_fallidos`, `bloqueado_hasta`, `auth_id` | FK → `rol.id`, `academia.id` |
| `rol` | `id`, `nombre` | Los tres roles de la carga inicial |
| `auditoria_sesion` | `usuario_id`, `evento`, `fecha_hora`, `ip_origen` | FK → `usuario.id` · enum `tipo_evento_sesion` |

Notas del esquema:
- `intentos_fallidos`: `smallint` CHECK 0..5 y `bloqueado_hasta`: `timestamp` → el bloqueo de 15 minutos lo controla el **backend**; el front solo muestra la cuenta regresiva que llega en el error.
- `auditoria_sesion.evento` ya contempla los cinco casos que pide la HU: `login`, `logout`, `login_fallido`, `bloqueado`, `acceso_denegado`. La bitácora se escribe **entera en el back**: el front no la registra ni la consulta (eso es otra HU, contrato `auditoria.ts`).
- La contraseña **no vive en `usuario`**: el login, el bloqueo y la recuperación los delega el sistema a Supabase Auth (`auth_id` es el vínculo). Por eso el contrato de auth no tiene ningún campo de contraseña en sus responses.
- **PENDIENTE DBA:** el criterio de "primer inicio de sesión con contraseña temporal" necesita un dato que **el esquema no tiene**: no hay `usuario.debe_cambiar_contrasena` ni equivalente. Lo natural es resolverlo con el `user_metadata` de Supabase Auth, pero hay que acordarlo. En el front viaja como `debeCambiarContrasena` en la respuesta del login, marcado en el contrato.
- **"Última conexión"** (opcional) sale de `auditoria_sesion`: el último `login` **anterior** al actual. `// BACKEND:` en el punto de integración.

## Contrato de API a crear (`/contract auth`)

| Método | Ruta | Request | Response |
|---|---|---|---|
| POST | `/api/auth/login` | `{ email, password }` | `SesionResponse` |
| POST | `/api/auth/logout` | — | 204 |
| GET | `/api/auth/sesion` | — | `SesionResponse` · 401 si no hay |
| POST | `/api/auth/cambiar-contrasena` | `{ actual, nueva }` | `SesionResponse` |
| POST | `/api/auth/recuperar` | `{ email }` | 204 **siempre** (no revela si la cuenta existe) |

Errores — **los códigos ya existen en `src/lib/http/errors.ts`, no se inventan**:

| Código | Status | Cuándo |
|---|---|---|
| `CREDENCIALES_INVALIDAS` | 401 | Email o contraseña incorrectos. Sin `campo`: marcar un input diría cuál de los dos estaba bien. |
| `CUENTA_BLOQUEADA` | 423 | 5 intentos fallidos. Trae `datos.bloqueadoHasta` (ISO) para la cuenta regresiva. |
| `AUTH_NO_DISPONIBLE` | 503 | Supabase Auth caído. **No cuenta como intento fallido.** |
| `NO_AUTENTICADO` | 401 | No hay sesión, o expiró. |
| `CONTRASENA_INSEGURA` | 422 | No cumple los requisitos. |
| `CONTRASENA_REPETIDA` | 422 | La nueva es igual a la anterior. |
| `DATOS_INVALIDOS` | 422 | |

## Componentes sugeridos (reuso)

| Pieza | Acción | Nota |
|---|---|---|
| `ui/Button`, `ui/Input`, `ui/Icon`, `ui/Toast` | **Reusar** | Sin cambios |
| `layout/Sidebar` | **Extender** | Filtrar `NAV_ITEMS` por rol + bloque de usuario con "Cerrar sesión" y última conexión |
| `lib/formato.ts` | **Reusar** | `inicialesDe` y `tonoAvatarDe` para el avatar del usuario |
| `auth/CampoContrasena` | **Crear** | Input de contraseña con botón mostrar/ocultar (`visibility` / `visibility_off`), `aria-pressed`. Lo usan las 3 pantallas con contraseña |
| `auth/RequisitosContrasena` | **Crear** | Lista de requisitos que se tildan en vivo |
| `auth/AccesoDenegado` | **Crear** | Pantalla de rol sin permiso, dentro del layout |
| `auth/SesionProvider` (`src/lib/sesion.tsx`) | **Crear** | Contexto + `localStorage` + timer de inactividad + `useSesion()` |
| `auth/RequiereSesion` | **Crear** | Guard: sin sesión → login; sin permiso → `AccesoDenegado`; envuelve las 3 pantallas existentes |
| `src/data/auth.ts` | **Crear** | Fixture: `login`, `logout`, `sesionActual`, `cambiarContrasena`, `recuperarContrasena` |

## Datos hardcodeados

Usuarios demo, uno por rol + uno con contraseña temporal. Los campos son los del `UsuarioResponse` del contrato de usuario ya existente.

```ts
// src/data/auth.ts
// BACKEND: reemplazar por POST /api/auth/login → tabla `usuario` + Supabase Auth.
// Las contraseñas NO viven en la base: las valida GoTrue contra `auth.users`.
const CUENTAS_DEMO = [
  {
    password: "Demo1234",                       // solo para la demo del front
    debeCambiarContrasena: false,
    ultimaConexion: "2026-09-21T18:42:00.000Z", // BACKEND: último `login` de auditoria_sesion
    usuario: {
      id: 1, nombre: "Ana", apellido: "Gómez", dni: "30111222",
      email: "gerente@demo", rol: { id: 1, nombre: "Gerente" },
      academia: { id: 1, nombre: "Sede Centro" },
      estado: "activo", bloqueadoHasta: null,
      fechaCreacion: "2026-03-01T12:00:00.000Z",
    },
  },
  // …mesa@demo (Mesa de Entrada), profe@demo (Profesor),
  //   nuevo@demo (Mesa de Entrada, debeCambiarContrasena: true)
];
```

Las credenciales se muestran en un panel "Datos de prueba" en la pantalla de login: es un demo de front y el equipo tiene que poder entrar sin preguntar. Ese panel lleva un `// BACKEND:` para borrarlo cuando el login sea real.

## Estados

- [x] **Cargando** — mientras se resuelve la sesión guardada (evita el parpadeo login → contenido).
- [x] **Enviando** — botón deshabilitado con "Ingresando…" (no se puede mandar dos veces).
- [x] **Error** — credenciales inválidas · cuenta bloqueada (con contador) · servicio no disponible.
- [x] **Con sesión** — el layout con el Sidebar filtrado.
- [x] **Sin permiso** — Acceso denegado.
- [x] **Expirada** — vuelta al login con el aviso.

## Criterios de aceptación

### Obligatorios

- [ ] Pantalla de inicio de sesión con **Email** (formato validado, obligatorio) y **Contraseña** (enmascarada, obligatoria).
- [ ] Credenciales incorrectas → mensaje genérico **"Credenciales inválidas"** en rojo, sin revelar cuál de los dos falló.
- [ ] Tras **5 intentos fallidos consecutivos**, la cuenta se bloquea **15 minutos** y se le informa al usuario.
- [ ] Primer inicio de sesión (contraseña temporal) → obliga a definir una nueva: **mínimo 8 caracteres, una mayúscula, una minúscula y un número**, distinta de la anterior, con confirmación que debe coincidir.
- [ ] El menú muestra **solo los módulos permitidos** según el rol (tabla de permisos de arriba).
- [ ] URL directa a un módulo no permitido → pantalla **"Acceso denegado"** (y el back registra el intento en la bitácora).
- [ ] La sesión expira a los **30 minutos de inactividad** y redirige al login con un mensaje informativo.
- [ ] Botón **"Cerrar sesión"** visible en todas las pantallas.
- [ ] Recuperación de contraseña: formulario + confirmación de envío (el enlace de un solo uso con validez de 1 hora lo genera y manda el **backend**).
- [ ] Cada inicio de sesión exitoso y fallido queda en la bitácora con usuario, fecha y hora (en el front: `// BACKEND:` en el punto de integración).

### Opcionales incluidos

- [ ] Botón para mostrar/ocultar la contraseña.
- [ ] "Última conexión" del usuario en el encabezado.

### Fuera de alcance

- Permisos del rol **Alumno**: la tabla `rol` tiene tres filas y el alumno no es usuario del sistema.
- El envío real del email, el enlace de un solo uso, el conteo de intentos y el bloqueo: son del backend. El front muestra lo que el contrato devuelve.
- La pantalla "Mi ficha" del Profesor y los módulos de asistencia e indicadores: sus propias HUs.

---

## Decisiones de diseño (completado por /disenar)

- **Rutas:** `/` (login) · `/cambiar-contrasena` · `/recuperar-contrasena` · **`/inicio`** (no estaba en el brief: ver más abajo).
- **Componentes reusados:** `ui/Button`, `ui/Input`, `ui/Modal`, `ui/Icon`, `lib/formato` (`inicialesDe`, `tonoAvatarDe`, `formatearFecha`).
- **Componentes extendidos:** `layout/Sidebar` → filtra por rol, y sus ítems salen de `lib/permisos.ts` en vez de una constante propia; suma el bloque de usuario con última conexión y Cerrar sesión.
- **Componentes nuevos:** `auth/CampoContrasena`, `auth/RequisitosContrasena`, `auth/AccesoDenegado`, `auth/RequiereSesion`, `auth/AvisoInactividad`, más `lib/permisos.ts`, `lib/sesion.tsx` y `data/auth.ts`.
- **Contrato creado antes de la pantalla:** [`src/contracts/auth.ts`](../../src/contracts/auth.ts) + [guía](../contratos/auth.md).

### Decisiones no obvias

- **Una sola tabla de permisos** (`lib/permisos.ts`) para el menú y para el guard. Con dos listas, tarde o temprano el menú esconde algo que la ruta igual deja entrar.
- **"Acceso denegado" no cambia la URL** y se muestra con el Sidebar al lado: el usuario ve a dónde quiso entrar (puede copiar el link para pedir permiso) y puede irse a un módulo que sí le corresponde. El botón **nombra el destino** ("Ir a Alumnos") porque "el inicio" significa algo distinto para cada rol.
- **El panel de credenciales demo se renderiza solo fuera de producción** (`process.env.NODE_ENV`). Dejarlo atado a que alguien se acuerde de borrarlo era el riesgo más caro de esta HU: una lista de usuarios y contraseñas a la vista.
- **No se muestra "te quedan N intentos".** Informar eso le confirma a quien prueba emails al azar que esa cuenta existe, que es justo lo que evita el mensaje genérico. El criterio pide informar el bloqueo, y eso se informa con una cuenta regresiva viva que reactiva el formulario sola.
- **El aviso de inactividad no se cancela moviendo el mouse:** hay que apretar "Seguir conectado". Si bastara un roce, el aviso se cerraría sin que nadie lo lea.
- **El cambio de contraseña valida con el schema del contrato** (`cambiarContrasenaBody`): la política, la coincidencia y el "distinta de la actual" se escriben una vez y las corren las dos mitades.
- **`?demo=inactividad`** (expira en 30 s) y **`?demo=auth-caido`** (fuerza el 503) permiten probar esos dos caminos sin esperar ni romper nada.

### Hallazgo: falta una pantalla de aterrizaje

El rol **Profesor** no tiene todavía ningún módulo construido. Al iniciar sesión, el `router.replace` no tenía destino y caía en `/` — el usuario quedaba mirando el formulario de login **con la sesión abierta**, como si el login hubiera fallado. Se creó **`/inicio`**: no pertenece a ningún módulo (no pasa por el control de permisos), muestra el Sidebar y le dice al usuario qué módulos va a tener. Registrado en `docs/errores-comunes.md`.

### Verificación

- `npx tsc --noEmit` y `npm run lint`: sin errores (lint encontró uno durante el paso 6 — ver el log).
- Renderizado real, sin errores de consola en ningún paso:
  - **5 intentos fallidos** → los 4 primeros con "Credenciales inválidas", el 5° bloquea con cuenta regresiva `15:00` y esconde el formulario;
  - **Gerente** → entra a `/alumnos`, ve los 9 módulos, nombre, rol, última conexión y Cerrar sesión;
  - **Mesa de Entrada** → menú de 3 ítems; `/materias` por URL directa → "Acceso denegado" con el Sidebar y la URL intacta;
  - **Profesor** → aterriza en `/inicio` con sus 3 módulos "Próx.";
  - **Primer ingreso** (`nuevo@demo`) → `/cambiar-contrasena`, requisitos tildándose en vivo, "Las contraseñas no coinciden", y tras guardar entra a `/alumnos`;
  - **F5 estando logueado** → la sesión sobrevive;
  - **Inactividad** (`?demo=inactividad`) → aviso a los 15 s con contador, cierre a los 30 s, vuelta al login con el mensaje y `localStorage` limpio.
