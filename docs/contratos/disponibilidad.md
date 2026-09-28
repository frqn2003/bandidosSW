# Cómo usar el contrato `disponibilidad`

Contrato: [`src/contracts/disponibilidad.ts`](../../src/contracts/disponibilidad.ts). Tabla `agenda_profesional`: los bloques semanales en los que **un profesor** atiende ("los lunes de 09:00 a 12:00").

Dos cosas que definen todo el módulo:

- El bloque cuelga de una franja del horario de atención (`agenda_semanal`) y tiene que caer dentro de ella. Por eso el body pide `agendaSemanalId` y **no** `diaSemana`: el día lo aporta la franja.
- Las horas son múltiplos de 30 minutos (CHECK `ck_agenda_profesional_30min`).

Archivos que toca cada equipo:

```
src/contracts/disponibilidad.ts                        ← el acuerdo (ya existe)
src/app/api/disponibilidad/route.ts                    ← back: GET listar, POST crear
src/app/api/disponibilidad/[id]/route.ts               ← back: PUT editar
src/app/api/disponibilidad/[id]/inactivar/route.ts     ← back: POST inactivar
src/server/disponibilidad/disponibilidad.service.ts    ← back: reglas de negocio
src/server/disponibilidad/disponibilidad.repo.ts       ← back: SQL
src/server/disponibilidad/disponibilidad.mapper.ts     ← back: snake_case → camelCase
src/app/.../profesores/[id]/disponibilidad/page.tsx    ← front: grilla semanal
```

---

# Back-end

## 1. Ruta real

```ts
// src/app/api/disponibilidad/route.ts
export const GET = withRoute(async ({ req }) => {
  const sp = new URL(req.url).searchParams;
  const filtros = listarDisponibilidadQuery.parse(Object.fromEntries(sp));
  return ok(await service.listar(filtros));
});

export const POST = withRoute(async ({ req, session }) => {
  const input = await parseBody(req, crearBloqueBody);
  return created(await service.crear(input, session.usuarioId));
});
```

`profesorId` es obligatorio en el query (no `.optional()`): sin ese filtro el listado sería la agenda entera de la academia, que es otra pantalla ([`calendario.md`](calendario.md)).

## 2. El `mapper.ts`

```ts
// src/server/disponibilidad/disponibilidad.mapper.ts
import type { BloqueDisponibilidadResponse, DiaSemana } from "@/contracts/disponibilidad";

const hhmm = (t: string) => t.slice(0, 5);   // pg devuelve "09:00:00"

export function toApi(row: BloqueRow): BloqueDisponibilidadResponse {
  return {
    id: row.id,
    profesor: {
      id: row.profesor_id,
      nombre: row.profesor_nombre,          // ← del JOIN profesor → usuario
      apellido: row.profesor_apellido,
    },
    agendaSemanalId: row.agenda_semanal_id,
    diaSemana: row.dia_semana as DiaSemana,  // ← del JOIN con agenda_semanal
    horaInicio: hhmm(row.hora_inicio),
    horaFin: hhmm(row.hora_fin),
    franjaAtencion: {
      horaInicio: hhmm(row.franja_hora_inicio),
      horaFin: hhmm(row.franja_hora_fin),
    },
    estado: row.estado,
  };
}
```

`diaSemana` y `franjaAtencion` no son columnas de `agenda_profesional`: salen del JOIN con `agenda_semanal`. Viajan igual porque la grilla del front necesita saber en qué columna dibujar el bloque y hasta dónde llega el horario del centro — si no, tendría que pedir la agenda aparte y cruzar a mano.

## 3. El `service.ts`

```ts
// src/server/disponibilidad/disponibilidad.service.ts
export async function crear(
  input: CrearBloqueInput,
  usuarioId: number,
): Promise<BloqueDisponibilidadResponse> {
  return withTransaction(async (client) => {
    await withAuditUser(client, usuarioId);

    const franja = await repo.buscarFranja(input.agendaSemanalId, client);
    if (!franja) {
      throw new ValidationError("REFERENCIA_INVALIDA", "La franja no existe.", "agendaSemanalId");
    }

    // Lo mismo que valida trg_agenda_profesional_validar_rango, pero con el
    // mensaje que va a leer el operador y señalando el campo.
    if (input.horaInicio < franja.hora_inicio || input.horaFin > franja.hora_fin) {
      throw new ValidationError(
        "FUERA_DE_HORARIO_ATENCION",
        `Ese día se atiende de ${franja.hora_inicio} a ${franja.hora_fin}.`,
        "horaInicio",
      );
    }

    // La superposición la decide el EXCLUDE de Postgres, no un SELECT previo:
    // ex_agenda_profesional_sin_superposicion → BLOQUE_SUPERPUESTO (409).
    return toApi(await repo.insert(input, client));
  });
}
```

Reglas de negocio de este módulo:

| Regla | Dónde | Error |
|---|---|---|
| Dos bloques activos del mismo profesor que se pisan | EXCLUDE de la base | `BLOQUE_SUPERPUESTO` (409) |
| El bloque se sale del horario de atención | `crear` / `editar` + trigger | `FUERA_DE_HORARIO_ATENCION` (422) |
| El profesor es de otra academia que la franja | `crear` / `editar` + trigger | `PROFESOR_DE_OTRA_ACADEMIA` (422) |
| Hora que no es `:00` ni `:30` | zod + CHECK | `HORA_NO_PERMITIDA` (422) |
| `horaFin <= horaInicio` | zod + CHECK | `RANGO_HORARIO_INVALIDO` (422) |
| Baja o achique con turnos futuros adentro | `inactivar` / `editar` | `BLOQUE_CON_TURNOS_FUTUROS` (409) |

Achicar un bloque es igual de peligroso que darlo de baja: los turnos que quedan afuera del nuevo rango no se mueven solos. Se rechaza con `BLOQUE_CON_TURNOS_FUTUROS` y el operador cancela o reprograma primero.

## 4. Datos stub

```ts
const FIXTURE: BloqueDisponibilidadResponse[] = [
  {
    id: 1,
    profesor: { id: 1, nombre: "Luis", apellido: "Pérez" },
    agendaSemanalId: 1,
    diaSemana: 1,
    horaInicio: "09:00",
    horaFin: "12:00",
    franjaAtencion: { horaInicio: "08:00", horaFin: "13:00" },
    estado: "activo",
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
  rutaBloque,
  rutaInactivar,
  type CrearBloqueBody,
  type BloqueDisponibilidadResponse,
  type ErrorDisponibilidad,
} from "@/contracts/disponibilidad";
import { RUTA as RUTA_AGENDA, type AgendaResponse } from "@/contracts/agenda";
```

## 2. Cargar la semana del profesor

```ts
const [bloques, agenda] = await Promise.all([
  apiGet<BloqueDisponibilidadResponse[]>(`${RUTA}?profesorId=${profesorId}&estado=activo`),
  // La agenda de la academia da las franjas: son las filas de la grilla y la
  // lista del <select> "franja" del formulario.
  apiGet<AgendaResponse>(`${RUTA_AGENDA}?academiaId=${academiaId}`),
]);
```

## 3. Armar el body tipado

```ts
const body: CrearBloqueBody = {
  profesorId,
  agendaSemanalId: Number(franjaId),   // el día sale de la franja, no se manda
  horaInicio,                          // "09:00" o "09:30", nunca "09:15"
  horaFin,
};
```

El `<select>` de horas se arma con los medios puntos que permite la franja elegida:

```ts
const horas = mediosPuntos(franja.horaInicio, franja.horaFin); // 09:00, 09:30, 10:00…
```

Así el usuario no puede elegir una hora que la base va a rechazar. El regex del contrato es la segunda red.

## 4. Llamar y tipar la respuesta

```ts
const creado = await apiSend<BloqueDisponibilidadResponse>("POST", RUTA, body);
setBloques((prev) => [...prev, creado]);

const editado = await apiSend<BloqueDisponibilidadResponse>("PUT", rutaBloque(id), body);
const baja = await apiSend<BloqueDisponibilidadResponse>("POST", rutaInactivar(id));
```

## 5. Manejar los errores que el contrato declara

```ts
const codigo = (e instanceof ApiError ? e.codigo : undefined) as ErrorDisponibilidad | undefined;

if (codigo === "BLOQUE_SUPERPUESTO") {
  setErrorGlobal("El profesor ya tiene un bloque que se superpone con ese horario.");
} else if (codigo === "FUERA_DE_HORARIO_ATENCION") {
  setErrores({ horaInicio: mensajeDeError(e) });   // el mensaje trae el horario real
} else if (codigo === "PROFESOR_DE_OTRA_ACADEMIA") {
  setErrorGlobal("Esa franja pertenece a otra academia.");
} else if (codigo === "BLOQUE_CON_TURNOS_FUTUROS") {
  setErrorGlobal("No se puede modificar: hay turnos reservados dentro de ese bloque.");
} else {
  setErrorGlobal(mensajeDeError(e));
}
```

Un profesor sin ningún bloque activo no se puede activar: el ABM de profesores devuelve `SIN_DISPONIBILIDAD` ([`profesor.md`](profesor.md)). Conviene que esta pantalla sea el paso siguiente del alta de profesor, no una pantalla suelta.
