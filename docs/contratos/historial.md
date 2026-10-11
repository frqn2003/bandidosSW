# Cómo usar el contrato `historial` (HU-ALU-03)

Contrato: [`src/contracts/historial.ts`](../../src/contracts/historial.ts). Pestaña "Historial" de la ficha del alumno: línea de tiempo + notas. No es el historial de asistencia de HU-ASI-01 ([`asistencia.md`](asistencia.md)), que lista solo clases con su estado.

Lo que el front **no** manda: `usuarioId` ni la fecha y hora de la nota (los pone el back).

```
src/contracts/historial.ts                          ← el acuerdo
src/app/api/alumnos/[id]/historial/route.ts         ← back: GET línea de tiempo + resumen
src/app/api/alumnos/[id]/notas/route.ts             ← back: POST nota
src/app/.../alumnos/[id] (pestaña Historial)        ← front
```

## Back — casi todo está en la base

| Dato | Base |
|---|---|
| `eventos` | vista `vw_historial_alumno` (Reservado, Modificado, Cancelado, Asistió, Ausente, Nota). Filtros: `fecha_hora::date` entre desde/hasta, `tipo`, `materia_id`, `profesor_id`. Orden `fecha_hora DESC, orden_evento DESC` |
| `resumen` | `fn_historial_resumen(alumno)` (sin filtros; incluye `fecha_ultima_clase`) |
| nota | `INSERT INTO nota_alumno (alumno_id, texto)`: el trigger `fn_nota_alumno_validar` fija `usuario_id` y `created_at`, valida rol, alumno activo y que el profesor atienda al alumno |
| bitácora | `trg_auditoria_nota_alumno` → `GET /api/auditoria?tabla=nota_alumno` |

- `SET LOCAL app.usuario_id` en el alta de la nota.
- La lectura **no** valida acceso en la base: el service chequea rol (mesa, gerente, profesor) y, para el Profesor, `fn_profesor_atiende_alumno(profesor, alumno)` → `PROFESOR_NO_ATIENDE_ALUMNO`. El alumno inactivo se lee igual (`alumnoInactivo = true`).
- `observaciones` (de la asistencia) solo se devuelve a Mesa de Entrada, Gerente y Profesor; si algún otro rol llegara a acceder, va `null`.
- `fecha_hora` de la vista ya está en hora de Argentina (`fn_ts_servidor_a_art`): devolverla sin convertir.
- `profesor` y `usuario` vienen como un texto "Apellido, Nombre" → `nombreCompleto`.
- `nota_alumno` no admite UPDATE ni DELETE (`trg_nota_alumno_bloquear_cambios`): no hay rutas para eso.

| Trigger / regla | Error |
|---|---|
| rol no habilitado | `ACCESO_DENEGADO` (403) |
| profesor que no atiende al alumno | `PROFESOR_NO_ATIENDE_ALUMNO` (403) |
| alumno inactivo al agregar nota | `ALUMNO_INACTIVO` (409) |
| `hasta < desde` | `RANGO_INVALIDO` (422) |

## Front

```ts
import { rutaHistorial, rutaNotas, type HistorialAlumnoResponse, type CrearNotaBody, type NotaResponse } from "@/contracts/historial";

const h = await apiGet<HistorialAlumnoResponse>(`${rutaHistorial(alumnoId)}?tipo=Cancelado&desde=2026-09-01`);

const body: CrearNotaBody = { texto: texto.trim() };
const nota = await apiSend<NotaResponse>("POST", rutaNotas(alumnoId), body);
// recargar el historial: la nota aparece como un evento más
```

- Ícono y color por `tipo`; resaltar `cancelacionTardia` y `Ausente` (deseable).
- `resumen.porcentajeAsistencia === null` → "—". `alumnoInactivo` → ocultar "Agregar nota".
- No hay "editar nota": una corrección es una nota nueva.
- Las notas no tienen materia ni profesor: no aparecen al filtrar por esos campos.

## Datos stub

```ts
const FIXTURE: HistorialAlumnoResponse = {
  alumnoInactivo: false,
  resumen: { clasesAsistidas: 8, ausencias: 2, cancelaciones: 1, porcentajeAsistencia: 80.0, fechaUltimaClase: "2026-10-09" },
  eventos: [{
    tipo: "Cancelado", fechaHora: "2026-10-08T09:15:00",
    materia: { id: 1, nombre: "Matemática" }, profesor: { id: 1, nombreCompleto: "Pérez, Luis" },
    detalle: "Motivo: Pedido alumno · Clase 09/10/2026 10:00",
    observaciones: null, cancelacionTardia: true, responsableCancelacion: "Alumno",
    usuario: { id: 2, nombreCompleto: "Gómez, Ana" }, turnoId: 14, fechaClase: "2026-10-09", horaClase: "10:00",
  }],
};
```
