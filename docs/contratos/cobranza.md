# Cómo usar los contratos de cobranza (HU-PAG-02)

Contratos: [`deuda.ts`](../../src/contracts/deuda.ts) (deudores y estado de cuenta), [`caja.ts`](../../src/contracts/caja.ts) (cierre de caja), [`rendicion.ts`](../../src/contracts/rendicion.ts) (rendición por profesor) y la anulación en [`pago.ts`](../../src/contracts/pago.ts) (ver [`pago.md`](pago.md)).

Lo que el front **no** manda ni calcula: `usuarioId` (sesión), totales, `diferencia` de caja, semáforo de deuda, saldo acumulado, número REC.

Archivos que toca cada equipo:

```
src/app/api/deudores/route.ts                          ← back: GET deudores
src/app/api/alumnos/[id]/estado-cuenta/route.ts        ← back: GET estado de cuenta
src/app/api/caja/route.ts                              ← back: GET caja del día
src/app/api/caja/cierres/route.ts                      ← back: GET historial, POST cerrar
src/app/api/caja/cierres/[id]/reabrir/route.ts         ← back: POST reabrir (gerente)
src/app/api/rendicion/route.ts                         ← back: GET rendición
src/app/api/pagos/[id]/anular/route.ts                 ← back: POST anular
src/app/.../deudores, caja, rendicion                  ← front
```

## Back — qué función de la base usa cada ruta

| Ruta | Base |
|---|---|
| `GET /api/deudores` | `fn_deudores(materia, profesor, dias_min, dias_max, buscar)`; `antiguedad` → `0-30` = (0,30), `31-60` = (31,60), `mas-60` = (61,∅). Ya devuelve `semaforo` y `total_general` |
| `GET /api/alumnos/{id}/estado-cuenta` | `fn_estado_cuenta(alumno)` (`afecta_saldo`, `saldo_acumulado`); `saldo` = último acumulado |
| `GET /api/caja` | `fn_caja_resumen(fecha)` + `fn_caja_detalle(fecha)` (vigentes vs. anulados por `estado`) + `fn_caja_cerrada` |
| `POST /api/caja/cierres` | `INSERT` en `cierre_caja`: el trigger calcula totales y diferencia; el service valida `OBSERVACIONES_REQUERIDAS` |
| `POST …/reabrir` | `UPDATE cierre_caja SET estado='Reabierta', motivo_reapertura=…` |
| `GET /api/rendicion` | `fn_rendicion_resumen` / `fn_rendicion_detalle` / `fn_rendicion_pendientes`; el mapper agrupa por materia |
| `POST /api/pagos/{id}/anular` | `UPDATE pago SET estado='Anulado', motivo_anulacion=…` (los triggers fijan quién y cuándo, validan rol y caja cerrada, y liberan las clases) |

- `SET LOCAL app.usuario_id` en cierre, reapertura y anulación.
- Roles: deudores, estado de cuenta, caja y anulación → gerente y mesa de entrada; reabrir → solo gerente; rendición → gerente (cualquiera) o profesor (solo la suya, `fn_profesor_id_actual`).
- Bitácora lista (`GET /api/auditoria?tabla=pago` o `cierre_caja`).
- Cuidado con `numeric`: en el mapper, `Number(...)`.

| Trigger / regla | Error |
|---|---|
| `fn_cierre_caja_validar` fecha futura | `FECHA_FUTURA` (422) |
| caja ya cerrada | `CAJA_YA_CERRADA` (409) |
| ya reabierta | `CAJA_YA_REABIERTA` (409) |
| `fn_pago_validar_caja` | `CAJA_CERRADA` (409, en pago.ts) |
| pago ya anulado | `PAGO_YA_ANULADO` (409) |
| `fn_validar_periodo` > 12 meses | `PERIODO_DEMASIADO_AMPLIO` (422) |

## Front

```ts
import { RUTA_DEUDORES, rutaEstadoCuenta, type DeudoresResponse, type EstadoCuentaResponse } from "@/contracts/deuda";
import { RUTA as RUTA_CAJA, RUTA_CIERRES, rutaReabrir, type CajaDelDiaResponse, type CerrarCajaBody, type CierreCajaResponse } from "@/contracts/caja";
import { RUTA as RUTA_RENDICION, type RendicionResponse } from "@/contracts/rendicion";
import { rutaAnular, type AnularPagoBody, type PagoResponse } from "@/contracts/pago";

const deudores = await apiGet<DeudoresResponse>(`${RUTA_DEUDORES}?antiguedad=mas-60&busqueda=${q}`);
const cuenta = await apiGet<EstadoCuentaResponse>(rutaEstadoCuenta(alumnoId));
const caja = await apiGet<CajaDelDiaResponse>(`${RUTA_CAJA}?fecha=${fecha}`);

// Modal de cierre: la diferencia se muestra en vivo, pero vale la de la respuesta.
const diferencia = efectivoContado - caja.efectivoRegistrado;
const body: CerrarCajaBody = { fecha, efectivoContado, observaciones: obs.trim() || null };
const cierre = await apiSend<CierreCajaResponse>("POST", RUTA_CIERRES, body);

const reabierta = await apiSend<CierreCajaResponse>("POST", rutaReabrir(cierre.id), { motivo });
const rendicion = await apiGet<RendicionResponse>(`${RUTA_RENDICION}?profesorId=${id}&desde=${d}&hasta=${h}`);

const bodyAnular: AnularPagoBody = { motivo: motivo.trim() };
const anulado = await apiSend<PagoResponse>("POST", rutaAnular(pago.id), bodyAnular);
```

- Tras cerrar o reabrir, volver a pedir la caja del día; tras anular, recargar estado de cuenta y deudores.
- Colores de deuda: `semaforo` amarillo/naranja/rojo viene del back. Movimientos con `afectaSaldo = false` (clase cancelada, pago anulado) van tachados o atenuados.
- Errores: `OBSERVACIONES_REQUERIDAS` → campo observaciones; `CAJA_CERRADA`, `CAJA_YA_CERRADA`, `PAGO_YA_ANULADO` → mensaje global y recargar; `PERIODO_DEMASIADO_AMPLIO`/`RANGO_INVALIDO` → campo del período.
- Anulación: el modal muestra el detalle del `PagoResponse` ya cargado; el botón "Anular" solo en pagos con `estado` distinto de `Anulado`.

## Datos stub

```ts
const FIXTURE: DeudoresResponse = {
  items: [{
    alumno: { id: 1, legajo: "ALU-000001", nombre: "Sofía", apellido: "Ramírez", dni: "40111222" },
    clasesAdeudadas: 3, montoAdeudado: 27000, fechaClaseMasAntigua: "2026-08-10",
    diasAntiguedad: 62, semaforo: "rojo",
  }],
  totalGeneral: 27000,
};
```
