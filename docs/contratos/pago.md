# Cómo usar el contrato `pago`

Contrato: [`src/contracts/pago.ts`](../../src/contracts/pago.ts). Gestión de pagos de clases dictadas (HU-PAG-01).

Lo que el front **no** manda, aunque esté en la base:

| Campo | De dónde sale | Por qué no va en el body |
|---|---|---|
| `monto` | Suma de `valor_clase_congelado` de los turnos | Evita inconsistencias o manipulación de precios desde el cliente. |
| `comprobante` (`REC-000123`) | Generador de secuencia/formato en el backend | Garantiza unicidad e irrepetibilidad. |
| `usuarioId` | La sesión activa | Es quién registra el cobro, no un dato del formulario. |
| `pagado` en turnos | Trigger `fn_pago_turno_marcar_pagado` | Se actualiza en la misma transacción al asociar el turno al pago. |

Archivos que toca cada equipo:

```
src/contracts/pago.ts                            ← el acuerdo entre front y back
src/app/api/pagos/route.ts                       ← back: GET historial, POST registrar cobro
src/app/api/pagos/[id]/route.ts                  ← back: GET detalle de comprobante
src/app/api/pagos/clases-pendientes/route.ts     ← back: GET clases pasadas impagas por alumno
src/app/api/formas-pago/route.ts                 ← back: GET catálogo de formas de pago
src/modules/pagos/pago.service.ts                ← back: reglas de negocio y transacciones
src/modules/pagos/pago.repo.ts                   ← back: SQL sobre pago, pago_turno, pago_forma_pago
src/modules/pagos/pago.mapper.ts                 ← back: mapeo a PagoResponse
src/app/.../pagos/page.tsx                       ← front: pantalla de cobro y comprobantes
```

---

# Back-end

## 1. Rutas

```ts
// src/app/api/pagos/route.ts
import { withRoute, parseBody } from "@/lib/http/handler";
import { ok, created } from "@/lib/http/responses";
import { listarPagosQuery, crearPagoBody } from "@/contracts/pago";
import * as service from "@/modules/pagos/pago.service";

export const GET = withRoute(async ({ req }) => {
  const sp = new URL(req.url).searchParams;
  const filtros = listarPagosQuery.parse(Object.fromEntries(sp));
  return ok(await service.listar(filtros));
});

export const POST = withRoute(async ({ req, session }) => {
  const input = await parseBody(req, crearPagoBody);
  return created(await service.registrarPago(input, session.usuarioId));
});
```

```ts
// src/app/api/pagos/clases-pendientes/route.ts
import { withRoute } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import { clasesPendientesQuery } from "@/contracts/pago";
import * as service from "@/modules/pagos/pago.service";

export const GET = withRoute(async ({ req }) => {
  const sp = new URL(req.url).searchParams;
  const { alumnoId } = clasesPendientesQuery.parse(Object.fromEntries(sp));
  return ok(await service.listarClasesPendientes(alumnoId));
});
```

## 2. Reglas del service

1. **Transacción obligatoria:** se inserta en `pago`, `pago_turno` y `pago_forma_pago`.
2. **Validación de turnos:** deben pertenecer al alumno, no estar cancelados, no estar pagados previamente y su fecha/hora de inicio ya debe haber transcurrido.
3. **Validación de medios de pago:** si la forma de pago tiene `requiere_nro_operacion = true` (ej: Transferencia), `nroOperacion` no puede ser nulo ni vacío.

---

# Front-end

## 1. Importar del contrato

```ts
import {
  RUTA,
  RUTA_CLASES_PENDIENTES,
  RUTA_FORMAS_PAGO,
  type CrearPagoBody,
  type PagoResponse,
  type ClasePendientePagoResponse,
  type ErrorPago,
} from "@/contracts/pago";
```

## 2. Consultar clases pendientes y registrar pago

```ts
// 1. Obtener clases que adeuda el alumno seleccionado
const clases = await apiGet<ClasePendientePagoResponse[]>(
  `${RUTA_CLASES_PENDIENTES}?alumnoId=${alumnoId}`
);

// 2. Registrar cobro
const body: CrearPagoBody = {
  alumnoId,
  turnoIds: seleccionados.map((t) => t.id),
  formasPago: [
    { formaPagoId: 2, nroOperacion: "TRANSF12345" }, // Transferencia con referencia
  ],
  fechaPago: new Date().toISOString().slice(0, 10),
  observaciones: "Pago presencial en administración",
};

try {
  const pago = await apiSend<PagoResponse>("POST", RUTA, body);
  // Mostrar modal de comprobante generado (REC-000123)
} catch (e) {
  const codigo = codigoDeError(e) as ErrorPago | undefined;
  if (codigo === "NRO_OPERACION_REQUERIDO") {
    setErrores({ nroOperacion: "Debe ingresar el comprobante o referencia de la transferencia." });
  } else if (codigo === "TURNO_YA_PAGADO") {
    setErrorGlobal("Una de las clases seleccionadas ya fue cobrada previamente.");
  }
}
```
