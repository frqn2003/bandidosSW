# Cómo usar el contrato `portal` (HU-POR-01)

Contrato: [`src/contracts/portal.ts`](../../src/contracts/portal.ts). Portal del Alumno: reservar un turno y "Mis turnos". "Habilitar acceso al portal" está en [`alumno.ts`](../../src/contracts/alumno.ts).

El alumno **nunca** viaja en una request: sale de la sesión. El portal tiene endpoints propios para no exponer precios (`valorClaseCongelado`, `valorClase`) ni datos de otros alumnos.

```
src/contracts/portal.ts                              ← el acuerdo
src/app/api/portal/turnos/route.ts                   ← back: GET mis turnos, POST reservar
src/app/api/portal/materias/route.ts                 ← back: GET combo de materias
src/app/api/portal/profesores/route.ts               ← back: GET combo de profesores
src/app/api/alumnos/[id]/habilitar-portal/route.ts   ← back: POST habilitar acceso
src/app/.../portal (reservar, mis-turnos)            ← front
```

## Back

| Qué | Base |
|---|---|
| alumno de la sesión | `fn_alumno_de_usuario(usuario)` (solo ficha activa) → si no hay: `CUENTA_SIN_FICHA` |
| reservar | `INSERT INTO turno`: `fn_turno_validar_portal` fuerza `origen = 'Portal del Alumno'`, `usuario_id` de la sesión, que el alumno sea el propio y el límite de turnos futuros (`fn_parametro('max_turnos_futuros_alumno')`). Las demás reglas son las de HU-TUR-01 |
| `limiteTurnosFuturos` | `fn_parametro('max_turnos_futuros_alumno')` |
| `turnosFuturosReservados` | turnos `Reservado` con `fecha + hora_inicio > ahora` (hora AR) |
| habilitar acceso | crear `usuario` (rol Alumno, contraseña temporal) + `UPDATE alumno SET usuario_id`; el trigger `fn_alumno_validar_acceso_portal` valida rol, ficha activa, email y cuenta única |
| bitácora de reservas | `trg_auditoria_turno_ins_del` (el INSERT guarda `origen`); consultable en `GET /api/auditoria?tabla=turno` |
| acceso denegado | `auditoria_sesion`, evento `acceso_denegado` |

- Verificar que el parámetro `max_turnos_futuros_alumno` esté cargado en `parametro`: `fn_parametro` lanza error si no existe.
- Un alumno inactivo no puede loguearse: al inactivar la ficha, `fn_alumno_baja_cuenta_portal` inactiva la cuenta y `auth.ts` devuelve el error genérico `CREDENCIALES_INVALIDAS`.
- Mis turnos: sin `verHistorial`, solo `Reservado` futuros en orden ascendente; con `verHistorial=true`, todos (pasados y cancelados) en orden descendente por fecha y hora.
- Horarios libres: `GET /api/calendario/huecos` (`calendario.ts`) también habilitado para el rol Alumno.
- `GET /api/roles` **no** lista el rol Alumno.
- La contraseña temporal no viaja en ningún response; falla de email → `ERROR_ENVIO_EMAIL`.

| Regla | Error |
|---|---|
| límite de turnos futuros | `LIMITE_TURNOS_FUTUROS` (409, `datos.limite`) |
| módulo o endpoint de gestión | `ACCESO_DENEGADO` (403) |
| cuenta sin ficha activa | `CUENTA_SIN_FICHA` (403) |
| ficha sin email / ya habilitada / email repetido | `ALUMNO_SIN_EMAIL` / `PORTAL_YA_HABILITADO` / `EMAIL_DUPLICADO` |
| reserva: cupo, superposición, disponibilidad, anticipación, bloqueo | los de [`turno.md`](turno.md) |

## Front

```ts
import {
  RUTA_TURNOS, RUTA_MATERIAS, RUTA_PROFESORES, RUTA_HUECOS,
  type ReservarTurnoPortalBody, type TurnoPortalResponse, type MisTurnosResponse, type ErrorPortal,
} from "@/contracts/portal";

const mis = await apiGet<MisTurnosResponse>(`${RUTA_TURNOS}?verHistorial=${ver}`);

const body: ReservarTurnoPortalBody = {
  profesorId: Number(profesorId), materiaId: Number(materiaId),
  fecha, horaInicio, observaciones: obs.trim() || null,   // sin alumnoId
};
const reservado = await apiSend<TurnoPortalResponse>("POST", RUTA_TURNOS, body);
// modal de resumen → código `reservado.codigo` y comprobante en pantalla con lo que devolvió la API
```

- Mostrar `mis.turnosFuturosReservados / mis.limiteTurnosFuturos`; `LIMITE_TURNOS_FUTUROS` va en rojo.
- Colores de estado: los del calendario (Reservado, Asistió verde, Ausente naranja, Cancelado).
- El menú del Alumno sale de `permisos.ts` (`Alumno: reservar-turno, mis-turnos`); un acceso por URL a otro módulo muestra "Acceso denegado".
- Habilitar acceso (Mesa de Entrada / Gerente): botón en la ficha si `!alumno.accesoPortal`.

```ts
import { rutaHabilitarPortal, type HabilitarPortalResponse } from "@/contracts/alumno";
await apiSend<HabilitarPortalResponse>("POST", rutaHabilitarPortal(alumno.id));
```

## Datos stub

```ts
const FIXTURE: MisTurnosResponse = {
  turnosFuturosReservados: 1, limiteTurnosFuturos: 5,
  turnos: [{
    id: 1, codigo: "TUR-000001", fecha: "2026-10-14", horaInicio: "10:00", horaFin: "11:00",
    materia: { id: 1, nombre: "Matemática" }, profesor: { id: 1, nombre: "Luis", apellido: "Pérez" },
    estado: "Reservado", observaciones: null, fechaCreacion: "2026-10-11T12:00:00.000Z",
  }],
};
```
