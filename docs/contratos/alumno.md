# Cómo usar el contrato `alumno`

Contrato: [`src/contracts/alumno.ts`](../../src/contracts/alumno.ts).

Dos cosas propias de este módulo:

- **Menor de 18 ⇒ responsable obligatorio.** La base lo fuerza (`ck_alumno_responsable_menor`) y el contrato lo valida también con zod, porque la fecha de nacimiento y los datos del responsable están en el mismo body: el front puede avisar sin ir al servidor.
- **El posible duplicado NO es un error.** Mismo nombre + apellido + fecha de nacimiento es un aviso de UX; el alta se confirma igual. Por eso tiene endpoint propio y no un código de error.

Archivos que toca cada equipo:

```
src/contracts/alumno.ts                              ← el acuerdo (ya existe)
src/app/api/alumnos/route.ts                         ← back: GET listar, POST crear
src/app/api/alumnos/[id]/route.ts                    ← back: GET detalle, PUT editar
src/app/api/alumnos/[id]/inactivar/route.ts          ← back: POST inactivar
src/app/api/alumnos/posibles-duplicados/route.ts     ← back: GET aviso de duplicado
src/server/alumnos/alumno.service.ts                 ← back: reglas de negocio
src/server/alumnos/alumno.repo.ts                    ← back: SQL
src/server/alumnos/alumno.mapper.ts                  ← back: snake_case → camelCase
src/app/.../alumnos/page.tsx                         ← front: pantalla
```

---

# Back-end

## 1. Ruta real

```ts
// src/app/api/alumnos/route.ts
export const GET = withRoute(async ({ req }) => {
  const sp = new URL(req.url).searchParams;
  const filtros = listarAlumnosQuery.parse(Object.fromEntries(sp));
  return ok(await service.listar(filtros));
});

export const POST = withRoute(async ({ req, session }) => {
  const input = await parseBody(req, crearAlumnoBody);
  return created(await service.crear(input, session.usuarioId));
});
```

```ts
// src/app/api/alumnos/posibles-duplicados/route.ts
export const GET = withRoute(async ({ req }) => {
  const sp = new URL(req.url).searchParams;
  const criterio = posiblesDuplicadosQuery.parse(Object.fromEntries(sp));
  return ok(await service.posiblesDuplicados(criterio));
});
```

Devuelve un array (vacío si no hay coincidencias), nunca un 409: es información, no un rechazo.

## 2. El `mapper.ts` — acá se agrupa el responsable

```ts
// src/server/alumnos/alumno.mapper.ts
import type { AlumnoResponse } from "@/contracts/alumno";

export function toApi(row: AlumnoRow): AlumnoResponse {
  return {
    id: row.id,
    legajo: row.legajo,                                  // ← generado por la base
    nombre: row.nombre,
    apellido: row.apellido,
    dni: row.dni,
    fechaNacimiento: row.fecha_nacimiento.toISOString().slice(0, 10),   // date → "yyyy-mm-dd"
    telefono: row.telefono,
    email: row.email,
    nivelEducativo: row.nivel_educativo,
    // Tres columnas de la base, un solo concepto en pantalla.
    responsable: row.responsable_nombre
      ? {
          nombre: row.responsable_nombre,
          dni: row.responsable_dni!,
          telefono: row.responsable_telefono!,
        }
      : null,
    estado: row.estado,
    fechaCreacion: row.created_at.toISOString(),
    fechaActualizacion: row.updated_at.toISOString(),
  };
}
```

`fecha_nacimiento` es `date`, no `timestamp`: el contrato dice `"yyyy-mm-dd"`. Si se manda el ISO completo, el front pone la hora en el `<input type="date">` y no la muestra.

## 3. El `service.ts`

```ts
// src/server/alumnos/alumno.service.ts
export async function crear(
  input: CrearAlumnoInput,
  usuarioId: number,
): Promise<AlumnoResponse> {
  return withTransaction(async (client) => {
    await withAuditUser(client, usuarioId);

    if (await repo.existeDni(input.dni, client)) {
      throw new ConflictError("DNI_DUPLICADO", "Ya existe un alumno activo con ese DNI.", "dni");
    }

    // El mismo CHECK que la base, del lado del service: el body puede llegar de
    // otro cliente que no corrió el zod del front.
    if (esMenor(input.fechaNacimiento) && !input.responsableNombre) {
      throw new ValidationError(
        "RESPONSABLE_REQUERIDO",
        "Un alumno menor de edad necesita los datos del responsable.",
        "responsableNombre",
      );
    }

    return toApi(await repo.insert(input, client));
  });
}
```

Reglas de negocio de este módulo:

| Regla | Dónde | Error |
|---|---|---|
| DNI repetido entre alumnos activos | `crear` / `editar` | `DNI_DUPLICADO` (409) |
| Menor de 18 sin datos del responsable | zod + `crear`/`editar` + CHECK | `RESPONSABLE_REQUERIDO` (422) |
| Fecha de nacimiento futura | zod + CHECK | `FECHA_NACIMIENTO_INVALIDA` (422) |
| Baja con turnos futuros reservados | `inactivar` | `ALUMNO_CON_TURNOS_FUTUROS` (409) |
| Posible duplicado (nombre+apellido+fecha) | `posiblesDuplicados` | — (es un aviso) |

El `legajo` (`ALU-000123`) es `GENERATED STORED`: no se manda en el body, vuelve en la response. Por eso el front pinta lo que devolvió la API y no su borrador.

## 4. Datos stub

```ts
const FIXTURE: AlumnoResponse[] = [
  {
    id: 1, legajo: "ALU-000001", nombre: "Sofía", apellido: "Ramírez",
    dni: "48111222", fechaNacimiento: "2010-05-14", telefono: "3874556677",
    email: null, nivelEducativo: "Secundario",
    responsable: { nombre: "Marta Ramírez", dni: "27333444", telefono: "3874556688" },
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
  rutaAlumno,
  rutaInactivar,
  RUTA_POSIBLES_DUPLICADOS,
  crearAlumnoBody,
  type CrearAlumnoBody,
  type AlumnoResponse,
  type AlumnoOpcion,
  type ErrorAlumno,
} from "@/contracts/alumno";
```

Acá el schema se importa como **valor**, no solo como tipo: la validación de menor de edad se corre en el front con el mismo código que corre el back.

## 2. Validar antes de enviar con el schema del contrato

```ts
const resultado = crearAlumnoBody.safeParse(body);
if (!resultado.success) {
  // Los issues ya vienen con el `path` del campo: responsableDni, fechaNacimiento…
  setErrores(Object.fromEntries(
    resultado.error.issues.map((i) => [String(i.path[0]), i.message]),
  ));
  return;
}
```

La sección "Datos del responsable" se muestra sola cuando corresponde:

```ts
const menor = fechaNacimiento !== "" && edadEnAnios(fechaNacimiento) < 18;
{menor && <DatosResponsable obligatorio />}
```

## 3. Avisar del posible duplicado antes de confirmar

```ts
const params = new URLSearchParams({ nombre, apellido, fechaNacimiento });
const parecidos = await apiGetOpcional<AlumnoResponse[]>(
  `${RUTA_POSIBLES_DUPLICADOS}?${params}`, [],
);

if (parecidos.length > 0) {
  // Modal: "Ya existe ALU-000123 Sofía Ramírez con esa fecha de nacimiento.
  //         ¿Querés cargarlo igual?" → el alta sigue si confirma.
}
```

`apiGetOpcional`: si el chequeo falla, el alta no se bloquea. Es un aviso, no un requisito.

## 4. Armar el body y llamar

```ts
const body: CrearAlumnoBody = {
  nombre: nombre.trim(),
  apellido: apellido.trim(),
  dni: dni.trim(),
  fechaNacimiento,                                  // "2010-05-14"
  telefono: telefono.replace(/\D/g, ""),
  email: email.trim() || null,
  nivelEducativo,
  responsableNombre: menor ? responsableNombre.trim() : null,
  responsableDni: menor ? responsableDni.trim() : null,
  responsableTelefono: menor ? responsableTelefono.replace(/\D/g, "") : null,
};

const creado = await apiSend<AlumnoResponse>("POST", RUTA, body);
setAlumnos((prev) => [...prev, creado]);            // trae el legajo real
```

En la tabla, el responsable viene agrupado: `alumno.responsable?.nombre ?? "—"`.

## 5. Manejar los errores que el contrato declara

```ts
const codigo = (e instanceof ApiError ? e.codigo : undefined) as ErrorAlumno | undefined;

if (codigo === "DNI_DUPLICADO") {
  setErrores({ dni: "Ya existe un alumno activo con ese DNI." });
} else if (codigo === "RESPONSABLE_REQUERIDO") {
  setErrores({ responsableNombre: "Dato obligatorio para un alumno menor de edad." });
} else if (codigo === "FECHA_NACIMIENTO_INVALIDA") {
  setErrores({ fechaNacimiento: "La fecha de nacimiento no puede ser futura." });
} else if (codigo === "ALUMNO_CON_TURNOS_FUTUROS") {
  setErrorGlobal("No se puede dar de baja: el alumno tiene turnos reservados.");
} else {
  setErrorGlobal(mensajeDeError(e));
}
```
