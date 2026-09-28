# Cómo usar el contrato `materia`

Contrato: [`src/contracts/materia.ts`](../../src/contracts/materia.ts). Catálogo global: la materia no depende de la academia.

Ojo con los dos precios del sistema, que no son el mismo:

- `materia.valorClase` → valor de **referencia** de la materia. Cambiarlo rige solo hacia adelante.
- `precio_clase.precio` → lo que cobra **ese profesor** por **esa materia**. Es el que se copia congelado al turno → [`profesor.md`](profesor.md) y [`turno.md`](turno.md).

Archivos que toca cada equipo:

```
src/contracts/materia.ts                         ← el acuerdo (ya existe)
src/app/api/materias/route.ts                    ← back: GET listar, POST crear
src/app/api/materias/[id]/route.ts               ← back: GET detalle, PUT editar
src/app/api/materias/[id]/inactivar/route.ts     ← back: POST inactivar
src/server/materias/materia.service.ts           ← back: reglas de negocio
src/server/materias/materia.repo.ts              ← back: SQL
src/server/materias/materia.mapper.ts            ← back: snake_case → camelCase
src/app/.../materias/page.tsx                    ← front: pantalla
```

---

# Back-end

## 1. Ruta real

```ts
// src/app/api/materias/route.ts
export const GET = withRoute(async ({ req }) => {
  const sp = new URL(req.url).searchParams;
  const filtros = listarMateriasQuery.parse(Object.fromEntries(sp));
  return ok(await service.listar(filtros));
});

export const POST = withRoute(async ({ req, session }) => {
  const input = await parseBody(req, crearMateriaBody);
  return created(await service.crear(input, session.usuarioId));
});
```

## 2. El `mapper.ts` — acá se arregla el `numeric`

```ts
// src/server/materias/materia.mapper.ts
import type { MateriaResponse, DuracionClase } from "@/contracts/materia";

export function toApi(row: MateriaRow): MateriaResponse {
  return {
    id: row.id,
    nombre: row.nombre,
    nivel: row.nivel,
    descripcion: row.descripcion,
    duracionClaseMinutos: row.duracion_clase_minutos as DuracionClase,
    valorClase: Number(row.valor_clase),              // ← numeric llega como string
    estado: row.estado,
    fechaCreacion: row.created_at.toISOString(),
    fechaActualizacion: row.updated_at.toISOString(),
  };
}
```

`valor_clase` es `numeric(12,2)` y **pg lo devuelve como string**. El contrato dice `number`, así que sin el `Number(...)` no compila. Ese es exactamente el valor de tener los dos extremos tipados: si se colara el string, el front haría `valorClase * cantidad` y sacaría `NaN` en producción.

## 3. El `service.ts`

```ts
// src/server/materias/materia.service.ts
export async function crear(
  input: CrearMateriaInput,
  usuarioId: number,
): Promise<MateriaResponse> {
  return withTransaction(async (client) => {
    await withAuditUser(client, usuarioId);

    if (await repo.existeNombre(input.nombre, client)) {
      throw new ConflictError(
        "NOMBRE_DUPLICADO",
        "Ya existe una materia activa con ese nombre.",
        "nombre",
      );
    }

    return toApi(await repo.insert(input, client));
  });
}
```

Reglas de negocio de este módulo:

| Regla | Dónde | Error |
|---|---|---|
| Nombre repetido entre materias activas | `crear` / `editar` | `NOMBRE_DUPLICADO` (409) |
| Baja con turnos futuros reservados | `inactivar` | `MATERIA_CON_TURNOS_FUTUROS` (409) |
| Baja con profesores que la dictan | `inactivar` | `MATERIA_ASIGNADA` (409) |
| Cambiar `valorClase` no toca los turnos ya reservados | `editar` | — |
| El combo filtra `estado = 'activo'` | `listar` | — |

`uq_materia_nombre_activa` compara `lower(btrim(nombre))`: el chequeo del service tiene que normalizar igual.

Una materia inactiva no se puede asignar a un profesor (`trg_profesor_materia_validar_materia`, ver [`profesor.md`](profesor.md)).

## 4. Datos stub

```ts
const FIXTURE: MateriaResponse[] = [
  {
    id: 1, nombre: "Matemática", nivel: "Secundario",
    descripcion: "Álgebra y análisis", duracionClaseMinutos: 60,
    valorClase: 8500.0, estado: "activo",
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
  rutaMateria,
  rutaInactivar,
  DURACIONES_CLASE,
  type CrearMateriaBody,
  type MateriaResponse,
  type MateriaOpcion,
  type ErrorMateria,
} from "@/contracts/materia";
```

## 2. Cargar el listado y el combo

```ts
const materias = await apiGet<MateriaResponse[]>(`${RUTA}?estado=activo`);

// En la pantalla de turnos, la materia es un <select> que además aporta la
// duración: con ella el front calcula y muestra la hora de fin.
const opciones = useCatalogo<MateriaOpcion>(`${RUTA}?estado=activo`);
```

## 3. Armar el body tipado

```ts
const body: CrearMateriaBody = {
  nombre: nombre.trim(),
  nivel,                                     // "Primario" | "Secundario" | "Universitario"
  descripcion: descripcion.trim() || null,
  duracionClaseMinutos: Number(duracion) as (typeof DURACIONES_CLASE)[number],
  valorClase: Number(valor.replace(",", ".")),   // teclado es-AR: acepta coma
};
```

`DURACIONES_CLASE` sale del contrato y es la misma lista que el CHECK de la base. El `<select>` se arma con ella:

```tsx
{DURACIONES_CLASE.map((m) => <option key={m} value={m}>{m} min</option>)}
```

Si mañana se agrega la duración de 15 minutos, se cambia en el contrato y en la base — no en cinco pantallas.

## 4. Llamar y tipar la respuesta

```ts
const creada = await apiSend<MateriaResponse>("POST", RUTA, body);
setMaterias((prev) => [...prev, creada]);

const editada = await apiSend<MateriaResponse>("PUT", rutaMateria(id), body);
const baja = await apiSend<MateriaResponse>("POST", rutaInactivar(id));
```

## 5. Manejar los errores que el contrato declara

```ts
const codigo = (e instanceof ApiError ? e.codigo : undefined) as ErrorMateria | undefined;

if (codigo === "NOMBRE_DUPLICADO") {
  setErrores({ nombre: "Ya existe una materia activa con ese nombre." });
} else if (codigo === "MATERIA_CON_TURNOS_FUTUROS") {
  setErrorGlobal("No se puede dar de baja: hay turnos reservados de esta materia.");
} else if (codigo === "MATERIA_ASIGNADA") {
  setErrorGlobal("No se puede dar de baja: hay profesores que la dictan.");
} else {
  setErrorGlobal(mensajeDeError(e));
}
```
