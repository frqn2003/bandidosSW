# Cómo usar el contrato `turno`

Contrato: [`src/contracts/turno.ts`](../../src/contracts/turno.ts). La reserva de una clase: alumno + profesor + materia + fecha y hora.

Lo que el front **no** manda, aunque esté en la tabla:

| Campo | De dónde sale | Por qué no va en el body |
|---|---|---|
| `horaFin` | `materia.duracion_clase_minutos` | Si lo calcula el front, dos pantallas pueden calcular distinto. |
| `valorClaseCongelado` | `precio_clase` del par profesor+materia | Un precio que viaja en el body se edita desde el navegador. |
| `usuarioId` | la sesión | Es quién opera, no un dato del formulario. |
| `codigo` (`TUR-000123`) | `GENERATED STORED` de la base | Vuelve en la response. |

Archivos que toca cada equipo:

```
src/contracts/turno.ts                           ← el acuerdo (ya existe)
src/app/api/turnos/route.ts                      ← back: GET listar, POST reservar
src/app/api/turnos/[id]/route.ts                 ← back: GET detalle, PUT reprogramar
src/app/api/turnos/[id]/cancelar/route.ts        ← back: POST cancelar
src/server/turnos/turno.service.ts               ← back: reglas de negocio
src/server/turnos/turno.repo.ts                  ← back: SQL
src/server/turnos/turno.mapper.ts                ← back: snake_case → camelCase
src/app/.../turnos/page.tsx                      ← front: pantalla
```

---

# Back-end

## 1. Ruta real

```ts
// src/app/api/turnos/route.ts
export const GET = withRoute(async ({ req }) => {
  const sp = new URL(req.url).searchParams;
  const filtros = listarTurnosQuery.parse(Object.fromEntries(sp));
  return ok(await service.listar(filtros));
});

export const POST = withRoute(async ({ req, session }) => {
  const input = await parseBody(req, crearTurnoBody);
  return created(await service.reservar(input, session.usuarioId));
});
```

```ts
// src/app/api/turnos/[id]/cancelar/route.ts
export const POST = withRoute<{ id: string }>(async ({ session, params }) => {
  const id = parseId((await params).id);
  return ok(await service.cancelar(id, session.usuarioId));
});
```

Cancelar es un POST a una subruta, no un DELETE: el turno **no se borra**, pasa a `estado = 'Cancelado'`. La fila queda para el historial y para la auditoría.

`session.usuarioId` va a `turno.usuario_id` (quién registró) **y** a `SET LOCAL app.usuario_id` para la auditoría. Son dos usos del mismo dato, ninguno viene del body.

## 2. El `mapper.ts`

```ts
// src/server/turnos/turno.mapper.ts
import type { TurnoResponse } from "@/contracts/turno";

const hhmm = (t: string) => t.slice(0, 5);

export function toApi(row: TurnoRow): TurnoResponse {
  return {
    id: row.id,
    codigo: row.codigo,
    alumno: {
      id: row.alumno_id,
      legajo: row.alumno_legajo,
      nombre: row.alumno_nombre,
      apellido: row.alumno_apellido,
    },
    profesor: { id: row.profesor_id, nombre: row.profesor_nombre, apellido: row.profesor_apellido },
    materia: {
      id: row.materia_id,
      nombre: row.materia_nombre,
      nivel: row.materia_nivel,
      duracionClaseMinutos: row.duracion_clase_minutos,
    },
    fecha: row.fecha.toISOString().slice(0, 10),        // date → "yyyy-mm-dd"
    horaInicio: hhmm(row.hora_inicio),
    horaFin: hhmm(row.hora_fin),
    valorClaseCongelado: Number(row.valor_clase_congelado),   // ← numeric llega como string
    estado: row.estado,
    observaciones: row.observaciones,
    registradoPor: { id: row.usuario_id, nombre: row.usuario_nombre, apellido: row.usuario_apellido },
    fechaCreacion: row.created_at.toISOString(),
  };
}
```

## 3. El `service.ts` — donde vive todo lo importante

```ts
// src/server/turnos/turno.service.ts
export async function reservar(
  input: CrearTurnoInput,
  usuarioId: number,
): Promise<TurnoResponse> {
  return withTransaction(async (client) => {
    await withAuditUser(client, usuarioId);

    // 1. El par profesor+materia tiene que existir: de ahí salen la capacidad y
    //    el precio. Sin él no hay turno posible.
    const pm = await repo.buscarProfesorMateria(input.profesorId, input.materiaId, client);
    if (!pm) {
      throw new ValidationError(
        "PROFESOR_NO_DICTA_MATERIA",
        "El profesor no dicta esa materia.",
        "materiaId",
      );
    }

    const precio = await repo.precioVigente(pm.id, client);
    if (precio === null) {
      throw new ValidationError(
        "PRECIO_NO_DEFINIDO",
        "No hay precio cargado para ese profesor y esa materia.",
        "materiaId",
      );
    }

    // 2. horaFin la calcula el back, con la duración de la materia.
    const horaFin = sumarMinutos(input.horaInicio, pm.duracion_clase_minutos);

    // 3. Anticipación mínima de 2 horas.
    if (faltanMenosDe(2, input.fecha, input.horaInicio)) {
      throw new ValidationError(
        "ANTICIPACION_INSUFICIENTE",
        "El turno se tiene que reservar con al menos 2 horas de anticipación.",
        "horaInicio",
      );
    }

    // 4. El horario tiene que caer en un bloque de disponibilidad del profesor.
    if (!(await repo.hayDisponibilidad(input, horaFin, client))) {
      throw new ValidationError(
        "FUERA_DE_DISPONIBILIDAD",
        "El profesor no atiende en ese horario.",
        "horaInicio",
      );
    }

    // 5. Cupo: se cuenta CON BLOQUEO (SELECT ... FOR UPDATE sobre la franja), no
    //    con un count suelto. Dos operadores sobre el último lugar, sin bloqueo,
    //    cuentan los dos "queda 1" y entran los dos.
    const ocupados = await repo.contarOcupadosBloqueando(input, horaFin, client);
    if (ocupados >= pm.capacidad_maxima) {
      throw new ConflictError("SIN_CUPO", "No quedan lugares en ese horario.");
    }

    // 6. El precio se COPIA. Si mañana cambia precio_clase, este turno no cambia.
    //    La superposición del alumno la resuelve el EXCLUDE de la base →
    //    ALUMNO_CON_TURNO_SUPERPUESTO (409).
    const row = await repo.insert({ ...input, horaFin, valorClaseCongelado: precio }, client);
    return toApi(row);
  });
}
```

Reglas de negocio de este módulo:

| Regla | Dónde | Error |
|---|---|---|
| El profesor no dicta esa materia | `reservar` | `PROFESOR_NO_DICTA_MATERIA` (422) |
| No hay `precio_clase` para ese par | `reservar` | `PRECIO_NO_DEFINIDO` (422) |
| Menos de 2 horas de anticipación | `reservar` / `reprogramar` | `ANTICIPACION_INSUFICIENTE` (422) |
| El horario no cae en la disponibilidad del profesor | `reservar` / `reprogramar` | `FUERA_DE_DISPONIBILIDAD` (422) |
| Se llenó el cupo del profesor en esa franja | `reservar` (con bloqueo) | `SIN_CUPO` (409) |
| El alumno ya tiene un turno que se superpone | EXCLUDE de la base | `ALUMNO_CON_TURNO_SUPERPUESTO` (409) |
| Alumno, profesor o materia inactivos | `reservar` | `*_INACTIVO` / `MATERIA_INACTIVA` (422) |
| Cancelar o reprogramar algo ya cancelado o pasado | `cancelar` / `reprogramar` | `TURNO_YA_CANCELADO`, `TURNO_PASADO` (409) |

El EXCLUDE del alumno aplica solo `WHERE estado = 'Reservado'`: un turno cancelado no bloquea el horario, que es lo que se espera.

## 4. Datos stub

```ts
const FIXTURE: TurnoResponse[] = [
  {
    id: 1, codigo: "TUR-000001",
    alumno: { id: 1, legajo: "ALU-000001", nombre: "Sofía", apellido: "Ramírez" },
    profesor: { id: 1, nombre: "Luis", apellido: "Pérez" },
    materia: { id: 1, nombre: "Matemática", nivel: "Secundario", duracionClaseMinutos: 60 },
    fecha: "2026-09-25", horaInicio: "10:00", horaFin: "11:00",
    valorClaseCongelado: 9000.0, estado: "Reservado", observaciones: null,
    registradoPor: { id: 2, nombre: "Ana", apellido: "Gómez" },
    fechaCreacion: "2026-09-21T12:00:00.000Z",
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
  rutaTurno,
  rutaCancelar,
  type CrearTurnoBody,
  type TurnoResponse,
  type ErrorTurno,
} from "@/contracts/turno";
```

## 2. Cargar la agenda del día

```ts
const turnos = await apiGet<TurnoResponse[]>(
  `${RUTA}?profesorId=${profesorId}&desde=${fecha}&hasta=${fecha}&estado=Reservado`,
);
```

`desde` y `hasta` son inclusive: con el mismo valor en los dos se ve un día.

## 3. Armar el body tipado

```ts
const body: CrearTurnoBody = {
  alumnoId: Number(alumnoId),
  profesorId: Number(profesorId),
  materiaId: Number(materiaId),
  fecha,                                   // "2026-09-25"
  horaInicio,                              // "10:00"
  observaciones: observaciones.trim() || null,
};
```

La hora de fin **se muestra** en pantalla pero no se manda:

```ts
const materia = materias.find((m) => m.id === Number(materiaId));
const horaFinEstimada = sumarMinutos(horaInicio, materia?.duracionClaseMinutos ?? 0);
// Solo para mostrar. La real la devuelve la API.
```

## 4. Llamar y tipar la respuesta

```ts
const creado = await apiSend<TurnoResponse>("POST", RUTA, body);
setTurnos((prev) => [...prev, creado]);   // trae código, horaFin y valor congelado

const reprogramado = await apiSend<TurnoResponse>("PUT", rutaTurno(id), bodyReprogramar);
const cancelado = await apiSend<TurnoResponse>("POST", rutaCancelar(id));
```

Reprogramar solo cambia fecha, hora y observaciones. Cambiar alumno, profesor o materia es **otro turno**: se cancela y se reserva de nuevo, y la auditoría queda con las dos operaciones.

## 5. Manejar los errores que el contrato declara

```ts
const codigo = (e instanceof ApiError ? e.codigo : undefined) as ErrorTurno | undefined;

if (codigo === "SIN_CUPO") {
  setErrorGlobal("No quedan lugares en ese horario. Elegí otro hueco.");
  await recargarHuecos();                  // el calendario ya no está actualizado
} else if (codigo === "ALUMNO_CON_TURNO_SUPERPUESTO") {
  setErrores({ alumnoId: "El alumno ya tiene otro turno en ese horario." });
} else if (codigo === "FUERA_DE_DISPONIBILIDAD") {
  setErrores({ horaInicio: "El profesor no atiende en ese horario." });
} else if (codigo === "ANTICIPACION_INSUFICIENTE") {
  setErrores({ horaInicio: "Reservá con al menos 2 horas de anticipación." });
} else if (codigo === "PROFESOR_NO_DICTA_MATERIA" || codigo === "PRECIO_NO_DEFINIDO") {
  setErrores({ materiaId: mensajeDeError(e) });
} else if (codigo === "TURNO_YA_CANCELADO" || codigo === "TURNO_PASADO") {
  setErrorGlobal(mensajeDeError(e));
} else {
  setErrorGlobal(mensajeDeError(e));
}
```

`SIN_CUPO` y `ALUMNO_CON_TURNO_SUPERPUESTO` hay que manejarlos **siempre**, aunque el calendario haya mostrado el hueco como libre: entre que se pintó y el operador confirmó, otro pudo haber reservado. Ver [`calendario.md`](calendario.md).
