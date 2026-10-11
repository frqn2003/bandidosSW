# Cómo usar el contrato `bloqueo` (y lo nuevo de `calendario`)

Contratos: [`src/contracts/bloqueo.ts`](../../src/contracts/bloqueo.ts) y [`src/contracts/calendario.ts`](../../src/contracts/calendario.ts). HU-CAL-03: bloqueo de fechas, % de ocupación y estados de asistencia en el calendario.

Lo que el front **no** manda ni calcula:

| Dato | De dónde sale |
|---|---|
| `usuarioId`, fecha de alta y de baja | sesión / `now()` del back |
| `estado` del bloqueo | el trigger lo fija en `activo`; la baja lo pasa a `inactivo` |
| Semáforo de ocupación (< 50 verde, 50–80 amarillo, > 80 rojo) | `fn_ocupacion` |
| Si una fecha está bloqueada | `bloqueos` en agenda/mes y `bloqueado` en ocupación |

Archivos que toca cada equipo:

```
src/contracts/bloqueo.ts, calendario.ts           ← el acuerdo (ya existen)
src/app/api/bloqueos/route.ts                     ← back: GET listar, POST cargar
src/app/api/bloqueos/[id]/baja/route.ts           ← back: POST baja lógica
src/app/api/calendario/ocupacion/route.ts         ← back: GET ocupación
src/app/.../calendario/page.tsx, bloqueos         ← front
```

## Back

- **Tabla/vista:** `bloqueo_fecha` / `vw_bloqueo_fecha`. Ocupación: `fn_ocupacion(desde, hasta, profesor, materia)` (devuelve `semaforo` y `bloqueado`).
- `SET LOCAL app.usuario_id` es obligatorio (`fn_bloqueo_fecha_validar`). Solo el Gerente → `SIN_PERMISO`.
- El alta devuelve `{ bloqueo, turnosAfectados }`: los turnos `Reservado` dentro del rango y del profesor (o de todos si `profesor = null`). **No se modifican.**
- `POST /api/bloqueos/{id}/baja` es el único UPDATE permitido; no hay DELETE (`trg_bloqueo_fecha_bloquear_borrado`).
- La bitácora ya existe (`trg_auditoria_bloqueo_fecha`): `GET /api/auditoria?tabla=bloqueo_fecha`.
- `fn_turno_validar_bloqueo` rechaza reservas/modificaciones en fechas bloqueadas → mapear a `FECHA_BLOQUEADA` (422) del contrato de turno.
- `agenda` y `mes` devuelven `bloqueos` (vigentes que se superponen con lo pedido).
- `ocupacion`: `fn_ocupacion` no devuelve filas de profesores sin agenda ni turnos. Rango máximo 42 días.

| Regla | Error |
|---|---|
| Rol distinto de gerente | `SIN_PERMISO` (403) |
| `fechaHasta < fechaDesde` | `RANGO_INVALIDO` (422) |
| Profesor inexistente / inactivo | `REFERENCIA_INVALIDA` / `PROFESOR_INACTIVO` (422) |
| Bloqueo ya dado de baja | `BLOQUEO_YA_DADO_DE_BAJA` (409) |

## Front

```ts
import {
  RUTA, rutaBaja,
  type CrearBloqueoBody, type CrearBloqueoResponse, type BloqueoResponse, type ErrorBloqueo,
} from "@/contracts/bloqueo";
import { RUTA_OCUPACION, type OcupacionDiaResponse } from "@/contracts/calendario";

const body: CrearBloqueoBody = {
  fechaDesde, fechaHasta,                       // "2026-12-24"
  profesorId: profesorId === "todos" ? null : Number(profesorId),   // null = "Todos"
  motivo: motivo.trim(),
};
const { bloqueo, turnosAfectados } = await apiSend<CrearBloqueoResponse>("POST", RUTA, body);
if (turnosAfectados.length > 0) abrirListaParaReprogramar(turnosAfectados);   // no se tocaron solos

const baja = await apiSend<BloqueoResponse>("POST", rutaBaja(bloqueo.id));

// Al abrir el expander de ocupación (vista Semana o Mes):
const ocupacion = await apiGet<OcupacionDiaResponse[]>(
  `${RUTA_OCUPACION}?desde=${desde}&hasta=${hasta}`,
);
```

- Reprogramar o cancelar los `turnosAfectados` se hace con `PUT /api/turnos/{id}` y `POST /api/turnos/{id}/cancelar` ([`turno.md`](turno.md)).
- Fechas bloqueadas: pintar gris con rayado según `calendario.bloqueos` o `ocupacion.bloqueado`; no ofrecer huecos ahí.
- Estados de asistencia: `TurnoCalendarioResponse.estado` ahora puede ser `Asistió` (verde) o `Ausente` (naranja); la leyenda incluye los cuatro estados.
- Errores: `RANGO_INVALIDO` → campo `fechaHasta`; `PROFESOR_INACTIVO`/`REFERENCIA_INVALIDA` → campo profesor; `FECHA_BLOQUEADA` en turnos → mensaje global y recargar el calendario.

## Datos stub

```ts
const FIXTURE: OcupacionDiaResponse[] = [{
  profesor: { id: 1, nombre: "Luis", apellido: "Pérez" },
  fecha: "2026-10-12", horasDisponibles: 6, horasReservadas: 3.5,
  porcentajeOcupacion: 58.3, semaforo: "amarillo", bloqueado: false,
}];
```
