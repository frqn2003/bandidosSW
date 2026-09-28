# Cómo usar el contrato `profesor`

Contrato: [`src/contracts/profesor.ts`](../../src/contracts/profesor.ts). Ficha profesional: `profesor` + `profesor_materia` + `precio_clase`, los tres en el mismo body.

Un profesor **no es un usuario nuevo**: es un usuario existente con rol "Profesor" al que se le agrega la ficha. El nombre, el DNI y el email se cargan en el ABM de usuarios ([`usuario.md`](usuario.md)) y acá vuelven resueltos en la response.

Archivos que toca cada equipo:

```
src/contracts/profesor.ts                          ← el acuerdo (ya existe)
src/app/api/profesores/route.ts                    ← back: GET listar, POST crear
src/app/api/profesores/[id]/route.ts               ← back: GET detalle, PUT editar
src/app/api/profesores/[id]/inactivar/route.ts     ← back: POST inactivar
src/server/profesores/profesor.service.ts          ← back: reglas de negocio
src/server/profesores/profesor.repo.ts             ← back: SQL (3 tablas)
src/server/profesores/profesor.mapper.ts           ← back: snake_case → camelCase
src/app/.../profesores/page.tsx                    ← front: pantalla
```

La disponibilidad horaria es otra pantalla → [`disponibilidad.md`](disponibilidad.md).

---

# Back-end

## 1. Ruta real

```ts
// src/app/api/profesores/route.ts
export const GET = withRoute(async ({ req }) => {
  const sp = new URL(req.url).searchParams;
  const filtros = listarProfesoresQuery.parse(Object.fromEntries(sp));
  return ok(await service.listar(filtros));
});

export const POST = withRoute(async ({ req, session }) => {
  const input = await parseBody(req, crearProfesorBody);
  return created(await service.crear(input, session.usuarioId));
});
```

## 2. El `mapper.ts`

```ts
// src/server/profesores/profesor.mapper.ts
import type { ProfesorResponse, MateriaDictadaResponse } from "@/contracts/profesor";

export function materiaToApi(row: ProfesorMateriaRow): MateriaDictadaResponse {
  return {
    id: row.id,                                    // ← profesor_materia.id, NO materia.id
    materia: {
      id: row.materia_id,
      nombre: row.materia_nombre,
      nivel: row.materia_nivel,
      duracionClaseMinutos: row.duracion_clase_minutos,
    },
    capacidadMaxima: row.capacidad_maxima,
    precio: Number(row.precio),                    // ← numeric llega como string
  };
}

export function toApi(row: ProfesorRow, materias: MateriaDictadaResponse[]): ProfesorResponse {
  return {
    id: row.id,
    usuario: {
      id: row.usuario_id,
      nombre: row.usuario_nombre,
      apellido: row.usuario_apellido,
      dni: row.usuario_dni,
      email: row.usuario_email,
    },
    academia: row.academia_id
      ? { id: row.academia_id, nombre: row.academia_nombre! }   // ← nullable en la base
      : null,
    tituloEspecialidad: row.titulo_especialidad,
    telefono: row.telefono,
    materias,
    estado: row.estado,
    fechaCreacion: row.created_at.toISOString(),
    fechaActualizacion: row.updated_at.toISOString(),
  };
}
```

El `id` de cada materia dictada es el de `profesor_materia`, no el de `materia`: es lo que el turno necesita para llegar al precio vigente. Si el mapper manda `materia_id` ahí, compila igual y rompe en runtime — está comentado en el contrato por eso.

## 3. El `service.ts`

```ts
// src/server/profesores/profesor.service.ts
export async function crear(
  input: CrearProfesorInput,
  usuarioId: number,
): Promise<ProfesorResponse> {
  return withTransaction(async (client) => {
    await withAuditUser(client, usuarioId);

    const usuario = await repo.buscarUsuario(input.usuarioId, client);
    if (!usuario) {
      throw new ValidationError("REFERENCIA_INVALIDA", "El usuario no existe.", "usuarioId");
    }
    // Las mismas tres cosas que valida trg_profesor_validar_usuario, pero con
    // mensaje lindo y señalando el campo. El trigger queda como red de seguridad.
    if (usuario.rol_nombre !== "Profesor") {
      throw new ValidationError("USUARIO_NO_ES_PROFESOR", "El usuario no tiene rol Profesor.", "usuarioId");
    }
    if (usuario.estado !== "activo") {
      throw new ValidationError("USUARIO_INACTIVO", "El usuario está inactivo.", "usuarioId");
    }
    if (usuario.academia_id === null) {
      throw new ValidationError("USUARIO_SIN_ACADEMIA", "El usuario no tiene academia asignada.", "usuarioId");
    }
    if (await repo.existeFichaDe(input.usuarioId, client)) {
      throw new ConflictError("USUARIO_YA_ES_PROFESOR", "Ese usuario ya tiene ficha de profesor.", "usuarioId");
    }

    const ids = input.materias.map((m) => m.materiaId);
    if (new Set(ids).size !== ids.length) {
      throw new ValidationError("MATERIA_DUPLICADA", "Hay una materia repetida en la lista.", "materias");
    }

    const row = await repo.insert(input, client);
    // Las tres tablas se escriben en la MISMA transacción: un profesor sin sus
    // materias, o con materias sin precio, no es un estado válido del sistema.
    const materias = await repo.reemplazarMaterias(row.id, input.materias, client);
    return toApi(row, materias);
  });
}
```

Reglas de negocio de este módulo:

| Regla | Dónde | Error |
|---|---|---|
| El usuario ya tiene ficha (`usuario_id` es UNIQUE) | `crear` | `USUARIO_YA_ES_PROFESOR` (409) |
| El usuario no tiene rol Profesor / está inactivo / sin academia | `crear` | `USUARIO_NO_ES_PROFESOR`, `USUARIO_INACTIVO`, `USUARIO_SIN_ACADEMIA` (422) |
| Al menos una materia | zod (`.min(1)`) + `crear` | `MATERIAS_REQUERIDAS` (422) |
| Materia inactiva o repetida | `crear` / `editar` | `MATERIA_INACTIVA`, `MATERIA_DUPLICADA` (422) |
| Quitar una materia con turnos futuros | `editar` | `MATERIA_CON_TURNOS_FUTUROS` (409) |
| Al menos un bloque horario activo por semana | `activar` / `editar` | `SIN_DISPONIBILIDAD` (422) |
| Baja con turnos futuros reservados | `inactivar` | `PROFESOR_CON_TURNOS_FUTUROS` (409) |

**`editar` reemplaza la lista completa de materias.** Lo que manda el front es el estado final: lo que no está, se saca. Antes de sacar una materia hay que chequear turnos futuros — si no, quedan turnos apuntando a un par profesor+materia que ya no existe.

**Capacidad:** el contrato usa `profesor_materia.capacidad_maxima`. El dump define el CHECK `ck_profesor_capacidad` sobre `profesor.capacidad_maxima_alumnos`, pero esa columna **no existe** en el `CREATE TABLE` (inconsistencia registrada en el diccionario de datos). Si el back agrega la columna, se agrega **primero** al contrato.

## 4. Datos stub

```ts
const FIXTURE: ProfesorResponse[] = [
  {
    id: 1,
    usuario: { id: 5, nombre: "Luis", apellido: "Pérez", dni: "28111222", email: "luis@academia.edu.ar" },
    academia: { id: 1, nombre: "Sede Centro" },
    tituloEspecialidad: "Profesor de Matemática",
    telefono: "3874112233",
    materias: [
      {
        id: 10,
        materia: { id: 1, nombre: "Matemática", nivel: "Secundario", duracionClaseMinutos: 60 },
        capacidadMaxima: 4,
        precio: 9000.0,
      },
    ],
    estado: "activo",
    fechaCreacion: "2026-03-01T12:00:00.000Z",
    fechaActualizacion: "2026-03-01T12:00:00.000Z",
  },
];

export const GET = withRoute(async () => ok(FIXTURE));
```

---

# Front

## 1. Importar del contrato

```ts
import {
  RUTA,
  rutaProfesor,
  rutaInactivar,
  rutaCandidatos,
  type CrearProfesorBody,
  type CandidatoProfesorResponse,
  type ProfesorResponse,
  type ProfesorOpcion,
  type ErrorProfesor,
} from "@/contracts/profesor";
```

## 2. Cargar el listado y los combos

```ts
const profesores = await apiGet<ProfesorResponse[]>(`${RUTA}?estado=activo`);

// Los dos combos del formulario, en un solo efecto (no un useCatalogo por cada uno):
const [candidatos, materias] = await Promise.all([
  apiGetOpcional<CandidatoProfesorResponse[]>(rutaCandidatos, []),
  apiGetOpcional<MateriaOpcion[]>("/api/materias?estado=activo", []),
]);

// Resolver la ficha del profesor logueado (rol Profesor en /calendario):
// La sesión tiene `usuarioId`; con ese dato se obtiene el profesor.id.
const [miProfesor] = await apiGet<ProfesorResponse[]>(`${RUTA}?usuarioId=${session.usuarioId}`);
// `miProfesor` puede ser undefined si el usuario aún no tiene ficha creada.
```

`rutaCandidatos` ya devuelve los usuarios con rol Profesor, activos, con academia y
**sin ficha**: son los únicos ids que `crearProfesorBody.usuarioId` acepta. Filtrar
`/api/usuarios` en el front no alcanza — desde ahí no se ve quién ya tiene ficha.

El filtro `usuarioId` devuelve un array de 0 o 1 elementos. Si devuelve vacío, el
usuario tiene rol Profesor en el sistema pero su ficha todavía no fue creada.

## 3. Armar el body tipado

```ts
const body: CrearProfesorBody = {
  usuarioId: Number(usuarioId),
  tituloEspecialidad: titulo.trim() || null,
  telefono: telefono.replace(/\D/g, ""),          // la base pide 10-11 dígitos pelados
  materias: filas.map((f) => ({
    materiaId: Number(f.materiaId),
    capacidadMaxima: Number(f.capacidad),
    precio: Number(f.precio.replace(",", ".")),
  })),
};
```

La lista de materias es el estado final, no un delta: si el usuario borró una fila de la tabla, esa materia simplemente no va en el array.

## 4. Llamar y tipar la respuesta

```ts
const creado = await apiSend<ProfesorResponse>("POST", RUTA, body);
setProfesores((prev) => [...prev, creado]);

// La edición NO manda usuarioId: la relación profesor↔usuario es 1 a 1 y no se
// reasigna. El tipo lo impide (EditarProfesorBody no lo tiene).
const editado = await apiSend<ProfesorResponse>("PUT", rutaProfesor(id), bodyEdicion);
const baja = await apiSend<ProfesorResponse>("POST", rutaInactivar(id));
```

## 5. Manejar los errores que el contrato declara

```ts
const codigo = (e instanceof ApiError ? e.codigo : undefined) as ErrorProfesor | undefined;

if (codigo === "USUARIO_YA_ES_PROFESOR") {
  setErrores({ usuarioId: "Ese usuario ya tiene ficha de profesor." });
} else if (codigo === "USUARIO_NO_ES_PROFESOR" || codigo === "USUARIO_SIN_ACADEMIA") {
  setErrores({ usuarioId: mensajeDeError(e) });
} else if (codigo === "MATERIA_INACTIVA" || codigo === "MATERIA_DUPLICADA") {
  setErrores({ materias: mensajeDeError(e) });
} else if (codigo === "MATERIA_CON_TURNOS_FUTUROS") {
  setErrorGlobal("No se puede quitar esa materia: tiene turnos reservados.");
} else if (codigo === "SIN_DISPONIBILIDAD") {
  setErrorGlobal("Cargá al menos un bloque horario antes de activar al profesor.");
} else if (codigo === "PROFESOR_CON_TURNOS_FUTUROS") {
  setErrorGlobal("No se puede dar de baja: el profesor tiene turnos reservados.");
} else {
  setErrorGlobal(mensajeDeError(e));
}
```

---

## Alta rápida de usuario candidato (`POST /api/profesores/candidatos`)

Destraba el alta de profesores mientras no exista el módulo `/usuarios` (solución 1 de la propuesta "usuarios candidatos"). Solo **Gerente** (`ACCESO_DENEGADO` 403 para el resto).

- **Body** `crearCandidatoBody`: `{ nombre, apellido, dni (7-8 dígitos), email }`. Rol (`rol_id = 2`, Profesor) y academia (`academia_id = 1`) los fija el back hasta la HU de usuarios/academias.
- **Response 201** `CandidatoCreadoResponse`: `{ usuario: CandidatoProfesorResponse, passwordTemporal }`. La contraseña se muestra **una sola vez** y no se guarda en el sistema.
- **Errores:** `DNI_DUPLICADO` / `EMAIL_DUPLICADO` (409), `EMAIL_YA_REGISTRADO_EN_AUTH` (409, el email tiene cuenta en Supabase Auth pero no fila en `usuario`), `AUTH_NO_DISPONIBLE` (503, Supabase no respondió o falta `SUPABASE_SERVICE_ROLE_KEY`).

**Cómo se obtiene `usuario.auth_id`** (`auth_id uuid NOT NULL UNIQUE`): con la **API de administración** de Supabase Auth (`POST /auth/v1/admin/users`, `email_confirm: true`) desde `src/lib/auth/gotrue.ts`, con la `SUPABASE_SERVICE_ROLE_KEY` (solo servidor). No se usa `signUp`: es auto-registro (pide confirmar el email y, si el email ya existe, devuelve un id falso).

**Orden en `profesor.service.crearCandidato`:** transacción + `pg_advisory_xact_lock` (la base todavía no tiene UNIQUE de dni/email) → chequeo de duplicados → alta en Supabase Auth → `INSERT usuario` con `auth_id` y `cambiar_contraseña = true` → si el INSERT o el COMMIT fallan, se borra la cuenta de Auth (`DELETE /auth/v1/admin/users/:id`).

**Primer ingreso:** `cambiar_contraseña = true` hace que el login obligue a definir una contraseña nueva (`/cambiar-contrasena`, HU-SIS-01).
