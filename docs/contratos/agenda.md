# Cómo usar el contrato `agenda`

Contrato: [`src/contracts/agenda.ts`](../../src/contracts/agenda.ts). El **horario de atención del centro**: `agenda` (una por academia) + `agenda_semanal` (las franjas: "lunes de 08:00 a 13:00").

Es el marco de todo lo demás: la disponibilidad de cada profesor tiene que caer dentro de estas franjas → [`disponibilidad.md`](disponibilidad.md).

Archivos que toca cada equipo:

```
src/contracts/agenda.ts                              ← el acuerdo (ya existe)
src/app/api/agenda/route.ts                          ← back: GET la agenda de una academia
src/app/api/agenda/franjas/route.ts                  ← back: POST crear franja
src/app/api/agenda/franjas/[id]/route.ts             ← back: PUT editar franja
src/app/api/agenda/franjas/[id]/inactivar/route.ts   ← back: POST inactivar franja
src/server/agenda/agenda.service.ts                  ← back: reglas de negocio
src/server/agenda/agenda.repo.ts                     ← back: SQL
src/server/agenda/agenda.mapper.ts                   ← back: snake_case → camelCase
src/app/.../horario-atencion/page.tsx                ← front: pantalla
```

No hay POST ni DELETE de agenda: nace con la academia ([`academia.md`](academia.md)) y es 1 a 1. Lo que el ABM toca son las franjas.

---

# Back-end

## 1. Ruta real

```ts
// src/app/api/agenda/route.ts
export const GET = withRoute(async ({ req }) => {
  const sp = new URL(req.url).searchParams;
  const { academiaId, incluirInactivas } = verAgendaQuery.parse(Object.fromEntries(sp));
  return ok(await service.verPorAcademia(academiaId, incluirInactivas ?? false));
});
```

```ts
// src/app/api/agenda/franjas/route.ts
export const POST = withRoute(async ({ req, session }) => {
  const input = await parseBody(req, crearFranjaBody);
  return created(await service.crearFranja(input, session.usuarioId));
});
```

`GET /api/agenda` devuelve **una** agenda con sus franjas adentro, no un array: la pantalla es la grilla semanal de una sede, no un listado.

## 2. El `mapper.ts` — acá se recortan los segundos

```ts
// src/server/agenda/agenda.mapper.ts
import type { AgendaResponse, FranjaSemanalResponse, DiaSemana } from "@/contracts/agenda";

/** pg devuelve `time` como "08:00:00"; el contrato dice "HH:MM". */
const hhmm = (t: string) => t.slice(0, 5);

export function franjaToApi(row: FranjaRow): FranjaSemanalResponse {
  return {
    id: row.id,
    agendaId: row.agenda_id,
    diaSemana: row.dia_semana as DiaSemana,
    horaInicio: hhmm(row.hora_inicio),
    horaFin: hhmm(row.hora_fin),
    estado: row.estado,
  };
}

export function toApi(row: AgendaRow, franjas: FranjaSemanalResponse[]): AgendaResponse {
  return {
    id: row.id,
    academia: { id: row.academia_id, nombre: row.academia_nombre },  // ← del JOIN
    nombre: row.nombre,
    estado: row.estado,
    franjas,   // ya vienen ordenadas por (dia_semana, hora_inicio) desde el repo
  };
}
```

Si el mapper devuelve "08:00:00", el `<input type="time">` del front no lo muestra. Por eso el recorte va acá y no en la pantalla.

## 3. El `service.ts`

```ts
// src/server/agenda/agenda.service.ts
export async function crearFranja(
  input: CrearFranjaInput,
  usuarioId: number,
): Promise<FranjaSemanalResponse> {
  return withTransaction(async (client) => {
    await withAuditUser(client, usuarioId);

    if (!(await repo.existeAgenda(input.agendaId, client))) {
      throw new ValidationError("REFERENCIA_INVALIDA", "La agenda no existe.", "agendaId");
    }

    // La superposición la resuelve el EXCLUDE de Postgres, no un SELECT previo:
    // bajo dos operadores concurrentes, el SELECT dice "libre" en los dos y las
    // dos franjas entran. `traducirErrorPostgres` mapea
    // ex_agenda_semanal_sin_superposicion → FRANJA_SUPERPUESTA (409).
    const row = await repo.insertFranja(input, client);
    return franjaToApi(row);
  });
}
```

Reglas de negocio de este módulo:

| Regla | Dónde | Error |
|---|---|---|
| Dos franjas activas del mismo día que se pisan | EXCLUDE de la base | `FRANJA_SUPERPUESTA` (409) |
| `horaFin <= horaInicio` | zod + CHECK | `RANGO_HORARIO_INVALIDO` (422) |
| Baja de una franja con bloques de profesor adentro | `inactivarFranja` | `FRANJA_CON_DISPONIBILIDAD` (409) |
| Domingo (día 7) | zod (`min(1).max(6)`) | `DATOS_INVALIDOS` (422) |

Al **editar** una franja hay que revalidar los bloques de `agenda_profesional` que cuelgan de ella: achicar el horario de atención puede dejar bloques de profesor afuera. Si quedan afuera, se rechaza con `FRANJA_CON_DISPONIBILIDAD`, no se recortan en silencio.

## 4. Datos stub

```ts
const FIXTURE: AgendaResponse = {
  id: 1,
  academia: { id: 1, nombre: "Sede Centro" },
  nombre: "Agenda principal",
  estado: "activo",
  franjas: [
    { id: 1, agendaId: 1, diaSemana: 1, horaInicio: "08:00", horaFin: "13:00", estado: "activo" },
    { id: 2, agendaId: 1, diaSemana: 1, horaInicio: "16:00", horaFin: "20:00", estado: "activo" },
  ],
};

export const GET = withRoute(async () => ok(FIXTURE));
```

---

# Front

## 1. Importar del contrato

```ts
import {
  RUTA,
  RUTA_FRANJAS,
  rutaFranja,
  rutaInactivarFranja,
  type CrearFranjaBody,
  type AgendaResponse,
  type DiaSemana,
  type ErrorAgenda,
} from "@/contracts/agenda";
```

## 2. Cargar la agenda de la academia

```ts
const agenda = await apiGet<AgendaResponse>(`${RUTA}?academiaId=${academiaId}`);

// Para la pantalla de edición, que también muestra las franjas dadas de baja:
const completa = await apiGet<AgendaResponse>(`${RUTA}?academiaId=${academiaId}&incluirInactivas=true`);
```

`incluirInactivas` viaja como `"true"` / `"false"` en texto. El contrato lo convierte con un `enum` + `transform`, no con `z.coerce.boolean()`: `Boolean("false")` es `true` y el filtro haría lo contrario de lo que dice la URL.

## 3. Armar el body tipado

```ts
const DIAS: { valor: DiaSemana; etiqueta: string }[] = [
  { valor: 1, etiqueta: "Lunes" },
  { valor: 2, etiqueta: "Martes" },
  { valor: 3, etiqueta: "Miércoles" },
  { valor: 4, etiqueta: "Jueves" },
  { valor: 5, etiqueta: "Viernes" },
  { valor: 6, etiqueta: "Sábado" },
];

const body: CrearFranjaBody = {
  agendaId: agenda.id,
  diaSemana: Number(dia) as DiaSemana,
  horaInicio,   // "08:00", tal cual sale del <input type="time">
  horaFin,
};
```

Las etiquetas de los días son **de la UI**: no salen de la base y no van a un catálogo. Lo que viaja es el número ISO.

## 4. Llamar y tipar la respuesta

```ts
const creada = await apiSend<FranjaSemanalResponse>("POST", RUTA_FRANJAS, body);
setAgenda((prev) => ({ ...prev, franjas: [...prev.franjas, creada] }));

const editada = await apiSend<FranjaSemanalResponse>("PUT", rutaFranja(id), body);
const baja = await apiSend<FranjaSemanalResponse>("POST", rutaInactivarFranja(id));
```

## 5. Manejar los errores que el contrato declara

```ts
const codigo = (e instanceof ApiError ? e.codigo : undefined) as ErrorAgenda | undefined;

if (codigo === "FRANJA_SUPERPUESTA") {
  setErrorGlobal("Ya hay una franja ese día que se superpone con el horario indicado.");
} else if (codigo === "RANGO_HORARIO_INVALIDO") {
  setErrores({ horaFin: "La hora de fin tiene que ser posterior a la de inicio." });
} else if (codigo === "FRANJA_CON_DISPONIBILIDAD") {
  setErrorGlobal("No se puede modificar: hay profesores con disponibilidad cargada en esa franja.");
} else {
  setErrorGlobal(mensajeDeError(e));
}
```

`FRANJA_SUPERPUESTA` puede llegar aunque la grilla se vea libre: otro operador guardó primero. Por eso se maneja siempre, no solo "por las dudas".
