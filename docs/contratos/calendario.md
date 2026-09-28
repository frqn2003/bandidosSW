# Cómo usar el contrato `calendario`

Contrato: [`src/contracts/calendario.ts`](../../src/contracts/calendario.ts). HU-CAL-01: los **huecos disponibles** para reservar.

Solo lectura: acá no hay POST ni PUT. Es la vista `vw_huecos_disponibles`, que para cada profesor y cada bloque de `agenda_profesional` activo proyecta los próximos 60 días y descuenta los turnos no cancelados. Reservar sobre un hueco es un POST a `/api/turnos` → [`turno.md`](turno.md).

**Un hueco es informativo, no una reserva.** Entre que la pantalla lo pinta y el operador confirma, otro puede haber tomado el cupo: el alta de turno igual puede devolver `SIN_CUPO` y el front tiene que manejarlo.

Archivos que toca cada equipo:

```
src/contracts/calendario.ts                      ← el acuerdo (ya existe)
src/app/api/calendario/huecos/route.ts           ← back: GET huecos en un rango
src/app/api/calendario/agenda/route.ts           ← back: GET el día de un profesor
src/server/calendario/calendario.service.ts      ← back: armado de la respuesta
src/server/calendario/calendario.repo.ts         ← back: SELECT sobre la vista
src/server/calendario/calendario.mapper.ts       ← back: snake_case → camelCase
src/app/.../calendario/page.tsx                  ← front: grilla
```

---

# Back-end

## 1. Ruta real

```ts
// src/app/api/calendario/huecos/route.ts
export const GET = withRoute(async ({ req }) => {
  const sp = new URL(req.url).searchParams;
  const filtros = huecosQuery.parse(Object.fromEntries(sp));
  return ok(await service.huecos(filtros));
});
```

```ts
// src/app/api/calendario/agenda/route.ts
export const GET = withRoute(async ({ req }) => {
  const sp = new URL(req.url).searchParams;
  const { profesorId, fecha } = agendaDiaQuery.parse(Object.fromEntries(sp));
  return ok(await service.agendaDelDia(profesorId, fecha));
});
```

## 2. El `mapper.ts` — la vista ya hizo la cuenta difícil

```ts
// src/server/calendario/calendario.mapper.ts
import type { HuecoResponse } from "@/contracts/calendario";

const hhmm = (t: string) => t.slice(0, 5);

export function huecoToApi(row: HuecoRow): HuecoResponse {
  return {
    agendaProfesionalId: row.agenda_profesional_id,
    profesor: { id: row.profesor_id, nombre: row.profesor_nombre, apellido: row.profesor_apellido },
    fecha: row.fecha.toISOString().slice(0, 10),
    horaInicio: hhmm(row.hueco_inicio),               // ← la vista las llama hueco_*
    horaFin: hhmm(row.hueco_fin),
    duracionMinutos: minutosEntre(row.hueco_inicio, row.hueco_fin),
  };
}
```

`duracionMinutos` no está en la vista: lo calcula el mapper. Va en la response porque el front filtra los huecos que no alcanzan para la materia elegida, y no tiene por qué restar horas en string.

## 3. El `service.ts`

```ts
// src/server/calendario/calendario.service.ts
export async function huecos(filtros: HuecosQuery): Promise<HuecoResponse[]> {
  // La vista proyecta 60 días. Pedir más no devuelve más: se rechaza en vez de
  // mentir con un resultado incompleto.
  if (diasEntre(filtros.desde, filtros.hasta) > 60) {
    throw new ValidationError(
      "RANGO_DEMASIADO_AMPLIO",
      "El calendario proyecta hasta 60 días.",
      "hasta",
    );
  }

  const filas = await repo.huecos(filtros);
  const lista = filas.map(huecoToApi);

  // El filtro por duración se aplica acá y no en el SQL para que el mismo
  // endpoint sirva con y sin materia elegida.
  return filtros.duracionMinutos
    ? lista.filter((h) => h.duracionMinutos >= filtros.duracionMinutos!)
    : lista;
}
```

Reglas de este módulo:

| Regla | Dónde | Error |
|---|---|---|
| `hasta < desde` | zod (`.refine`) | `RANGO_INVALIDO` (422) |
| Rango mayor a 60 días | `huecos` | `RANGO_DEMASIADO_AMPLIO` (422) |
| `materiaId` filtra por los profesores que la dictan | `huecos` | — |
| Los turnos cancelados no ocupan lugar | la vista | — |

Si se filtra por `materiaId`, el rango del hueco tiene que alcanzar para la duración de esa materia: conviene que el front mande también `duracionMinutos`, así no pinta huecos de 30 minutos para una clase de 60.

## 4. Datos stub

```ts
const FIXTURE: HuecoResponse[] = [
  {
    agendaProfesionalId: 1,
    profesor: { id: 1, nombre: "Luis", apellido: "Pérez" },
    fecha: "2026-09-25", horaInicio: "09:00", horaFin: "10:00", duracionMinutos: 60,
  },
  {
    agendaProfesionalId: 1,
    profesor: { id: 1, nombre: "Luis", apellido: "Pérez" },
    fecha: "2026-09-25", horaInicio: "11:00", horaFin: "12:00", duracionMinutos: 60,
  },
];

export const GET = withRoute(async () => ok(FIXTURE));
```

---

# Front

## 1. Importar del contrato

```ts
import {
  RUTA_HUECOS,
  RUTA_AGENDA,
  type HuecoResponse,
  type AgendaDiaResponse,
  type ErrorCalendario,
} from "@/contracts/calendario";
```

## 2. Pedir los huecos de la semana

```ts
const params = new URLSearchParams({
  profesorId: String(profesorId),
  desde,
  hasta,
  duracionMinutos: String(materia.duracionClaseMinutos),   // no mostrar huecos que no alcanzan
});

const huecos = await apiGet<HuecoResponse[]>(`${RUTA_HUECOS}?${params}`);
```

## 3. El día de un profesor: turnos + huecos en una sola llamada

```ts
const dia = await apiGet<AgendaDiaResponse>(
  `${RUTA_AGENDA}?profesorId=${profesorId}&fecha=${fecha}`,
);

// dia.bloques → los límites de la grilla (la disponibilidad del profesor)
// dia.turnos  → lo ocupado
// dia.huecos  → lo libre, clickeable
```

Los tres vienen juntos a propósito: dibujar la grilla con tres requests que pueden llegar desfasados muestra un hueco encima de un turno.

## 4. Del hueco al turno

```ts
// Click en un hueco → prellenar el alta de turno. El hueco NO reserva nada.
function alElegirHueco(h: HuecoResponse) {
  setFormulario((f) => ({
    ...f,
    profesorId: h.profesor.id,
    fecha: h.fecha,
    horaInicio: h.horaInicio,
  }));
}
```

Y después del POST a `/api/turnos`, **recargar los huecos**: la grilla que se está viendo ya quedó vieja.

## 5. Manejar los errores que el contrato declara

```ts
const codigo = (e instanceof ApiError ? e.codigo : undefined) as ErrorCalendario | undefined;

if (codigo === "RANGO_DEMASIADO_AMPLIO") {
  setErrorGlobal("El calendario muestra hasta 60 días. Acortá el rango.");
} else if (codigo === "RANGO_INVALIDO") {
  setErrores({ hasta: "La fecha de fin no puede ser anterior a la de inicio." });
} else {
  setErrorGlobal(mensajeDeError(e));
}
```
