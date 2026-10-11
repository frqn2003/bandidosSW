# Cómo usar el contrato `asistencia`

Contrato: [`src/contracts/asistencia.ts`](../../src/contracts/asistencia.ts). HU-ASI-01: el Profesor registra la asistencia de sus clases y se consulta el historial del alumno.

Lo que el front **no** manda:

| Campo | De dónde sale | Por qué no va en el body |
|---|---|---|
| `usuarioId` | la sesión | Es quién registra, no un dato del formulario. |
| `registradoAt` / `modificadoAt` | `now()` del back | No editables. |
| estado del turno | trigger `fn_asistencia_sincronizar_turno` | `presente` → `Asistió`, si no → `Ausente`. |
| `puedeRegistrar` / `puedeCorregir` | back | Ventana de 15 min antes y plazo de 24 h son parámetros (`minutos_antes_asistencia`, `horas_correccion_asistencia`). |

Archivos que toca cada equipo:

```
src/contracts/asistencia.ts                          ← el acuerdo (ya existe)
src/app/api/asistencia/route.ts                      ← back: POST registrar
src/app/api/asistencia/clases-del-dia/route.ts       ← back: GET mis clases del día
src/app/api/asistencia/[id]/route.ts                 ← back: PUT corregir
src/app/api/alumnos/[id]/historial-asistencia/route.ts ← back: GET historial + resumen
src/server/asistencia/*.{service,repo,mapper}.ts     ← back
src/app/.../mis-clases/page.tsx, ficha del alumno    ← front
```

## Back

- Datos: tabla `asistencia`, vistas `vw_historial_asistencia`, función `fn_asistencia_resumen(alumno, desde, hasta, materia, profesor)` (devuelve el % con 1 decimal).
- El `SET LOCAL app.usuario_id` es obligatorio: los triggers `fn_asistencia_validar` lo exigen.
- Los `RAISE EXCEPTION` del trigger se mapean a los códigos de `ErrorAsistencia` (ver tabla).

| Trigger / regla | Error |
|---|---|
| Turno de otro profesor | `TURNO_AJENO` (403) |
| Rol distinto de profesor al registrar | `SIN_PERMISO` (403) |
| Turno no `Reservado` | `TURNO_NO_RESERVADO` (409) |
| `uq_asistencia_turno` | `ASISTENCIA_YA_REGISTRADA` (409) |
| Fuera de ventana | `FUERA_DE_VENTANA_HORARIA` (422) |
| Profesor pasó 24 h | `PLAZO_CORRECCION_VENCIDO` (409) |
| Gerente fuera de plazo sin motivo | `MOTIVO_CORRECCION_REQUERIDO` (422) |
| `ck_asistencia_tema` | `TEMA_REQUERIDO` (422) |

- Historial: el Profesor solo ve alumnos para los que `fn_profesor_atiende_alumno` da true; si no, `SIN_PERMISO`.
- `GET /api/auditoria?tabla=asistencia&registroId=…` devuelve la bitácora (ya se agregó `asistencia` a `TablaAuditada`).
- No hay DELETE (`trg_asistencia_bloquear_borrado`).

## Front

```ts
import {
  RUTA, RUTA_CLASES_DEL_DIA, rutaAsistencia, rutaHistorialAlumno,
  type RegistrarAsistenciaBody, type CorregirAsistenciaBody,
  type ClaseDelDiaResponse, type AsistenciaResponse,
  type HistorialAsistenciaResponse, type ErrorAsistencia,
} from "@/contracts/asistencia";

const clases = await apiGet<ClaseDelDiaResponse[]>(`${RUTA_CLASES_DEL_DIA}?fecha=${fecha}`);

const body: RegistrarAsistenciaBody = {
  turnoId: clase.turnoId,
  presente: true,
  temaTrabajado: tema.trim() || null,   // obligatorio si presente
  observaciones: obs.trim() || null,
};
const registrada = await apiSend<AsistenciaResponse>("POST", RUTA, body);

const corregida = await apiSend<AsistenciaResponse>("PUT", rutaAsistencia(registrada.id), bodyCorreccion);

const historial = await apiGet<HistorialAsistenciaResponse>(
  `${rutaHistorialAlumno(alumnoId)}?estado=Ausente&desde=2026-09-01`,
);
```

- Los botones Presente/Ausente se habilitan con `clase.puedeRegistrar`; "Corregir" con `clase.puedeCorregir`. Si están en false, mostrar `motivoDeshabilitado`.
- Tras guardar, reemplazar la fila con lo que devolvió la API y recargar la clase (cambió su `estado`).
- Colores: `Asistió` verde, `Ausente` naranja; el front los mapea, la API manda solo el estado.
- Errores: manejar `TEMA_REQUERIDO` (campo tema), `FUERA_DE_VENTANA_HORARIA` y `PLAZO_CORRECCION_VENCIDO` (mensaje global + recargar), `ASISTENCIA_YA_REGISTRADA` (recargar la lista).

## Datos stub

```ts
const FIXTURE: ClaseDelDiaResponse[] = [{
  turnoId: 1, codigo: "TUR-000001",
  alumno: { id: 1, legajo: "ALU-000001", nombre: "Sofía", apellido: "Ramírez" },
  materia: { id: 1, nombre: "Matemática" },
  fecha: "2026-10-11", horaInicio: "10:00", horaFin: "11:00",
  estado: "Reservado", asistencia: null,
  puedeRegistrar: true, puedeCorregir: false, motivoDeshabilitado: null,
}];
```
