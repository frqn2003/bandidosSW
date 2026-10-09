---
description: "Crear o revisar contratos de API (contracts). Lee docs/api-contracts.md y revisa docs/contratos/ + src/contracts/ antes de empezar."
---

# /contract — Flujo de Contratos de API

> **Somos el equipo de FRONT-END.** El contrato se comparte con el back, pero los pasos de implementación que nos corresponden son solo los del front.

## Paso 0: Leer la guía y revisar los contratos existentes

Antes de hacer CUALQUIER cosa:

1. **Leer la guía de contratos**: el archivo `docs/api-contracts.md` completo.
   Ese archivo define las reglas, la estructura y los ejemplos que se deben seguir al pie de la letra.
   Si el archivo no existe, informar al usuario y detenerse.

2. **Revisar los contratos que YA existen** (siempre, en cada uso del comando):
   - Guías de uso: `docs/contratos/*.md` — leer la de la entidad que se está contratando
     y, si corresponde, las que comparten tipos (ej. `usuario.md` cuando el contrato
     referencia un `usuarioId`).
   - Contratos tipados: `src/contracts/*.ts` — revisar estructura, convenciones,
     errores de dominio y tipos ya definidos.

   Esto sirve para:
   - **No duplicar** un contrato que ya existe (si existe, NO se regenera: se revisa/ajusta).
   - **Reutilizar** tipos, rutas y campos ya acordados (ej. `usuarioId`, `estado`)
     en vez de inventar nombres nuevos.
   - **Imitar** exactamente el estilo y la estructura de los contratos existentes.

## Paso 1: Entender el contexto

Preguntar al usuario (si no lo especificó):
1. **Entidad**: ¿qué entidad/RESOURCE se contractual? (ej: proveedor, alumno, docente)
2. **Operaciones**: ¿qué CRUD se necesita? (listar, crear, editar, inactivar, etc.)
3. **Campos**: ¿qué campos tiene el request y el response?
4. **Errores de dominio**: ¿qué errores específicos puede devolver?

## Paso 2: Generar el contrato

> Si el Paso 0 encontró un contrato ya existente para la entidad, **NO crear uno nuevo**:
> revisar el existente contra lo que pidió el usuario y reportar qué falta o qué se ajusta.

Crear el archivo `src/contracts/{entidad}.ts` siguiendo EXACTAMENTE la estructura de `docs/api-contracts.md`
y el estilo de los contratos ya existentes en `src/contracts/` (los revisados en el Paso 0):

1. **Rutas** — constantes y funciones helper
2. **Request: filtros del listado** — schema Zod con `.strict()`
3. **Request: alta y edición** — schema Zod con `.strict()`, types `Body` e `Input`
4. **Response** — tipo con todos los campos (incluyendo `id`, `estado`)
5. **Errores de dominio** — union type con códigos y status HTTP

Este archivo es **compartido**: lo escriben ambos equipos antes de que exista la pantalla o el service.

## Paso 3: Generar los stubs del front (si se pide)

Si el usuario quiere probar la pantalla sin backend, crear la ruta stub en `src/app/api/{entidad}/route.ts`:

```ts
// STUB — datos de prueba hasta que el back conecte la ruta real
import { withRoute } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import type { {Entidad}Response } from "@/contracts/{entidad}";

const FIXTURE: {Entidad}Response[] = [
  {
    // datos de prueba con la misma forma del Response del contrato
  },
];

export const GET = withRoute(async () => ok(FIXTURE));
```

> Esto es **solo front**. El equipo de back crea sus propias rutas reales, mapper y service aparte.

## Paso 4: Verificar reglas clave

Confirmar que se cumple:
- [ ] Se revisaron `docs/contratos/` y `src/contracts/` (Paso 0): sin duplicados, sin campos inventados
- [ ] El contrato va ANTES de la pantalla o el service
- [ ] Solo va: ruta, request, response, errores
- [ ] No va: SQL, reglas de negocio, componentes
- [ ] El front importa tipos del contrato, nunca tipea URLs ni bodies manualmente
- [ ] El stub (si se crea) usa el tipo Response del contrato
- [ ] El stub es temporal — se reemplaza cuando el back conecte la ruta real

## Paso 5: Reportar

Entregar al usuario:
- Contratos existentes revisados en `docs/contratos/` y `src/contracts/` (qué se encontró y cómo se reusó)
- Ruta del contrato creado (o del existente revisado)
- Resumen de operaciones y campos
- Errores de dominio definidos
- Si se creó stub: ruta del stub y recordatorio de que es temporal
- Próximos pasos del front: importar contrato → armar body tipado → llamar con `apiSend` → manejar errores del contrato

## Flujo del front al usar el contrato

Estos son los pasos que NOSOTROS seguimos al implementar la pantalla:

1. **Importar del contrato** — `RUTA`, tipos `Body`, `Response`, `Error`
2. **Armar el body tipado** — declarar el tipo en una variable, no en el `apiSend`
3. **Llamar y tipar la respuesta** — `apiSend<Response>("POST", RUTA, body)`
4. **Manejar los errores del contrato** — catch con `codigoDeError` y el union type de errores
