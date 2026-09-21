# /contract — Definir contrato de API

Define el contrato de una entidad: rutas, request/response con Zod, errores, tipos TypeScript. **No codea la ruta ni el service**, solo el contrato. Se ejecuta DESPUÉS de `/disenar`: lee el código generado y extrae los types que el front realmente necesita.

## Uso

```
/contract proveedor
```
o con más detalle:
```
/contract HU-CEL-01: contrato para alumnos (listar, crear, editar, inactivar)
```

## Qué hace (pasos en orden)

1. **Paso 1 — Entidad**: identifica la entidad y sus operaciones (listar, crear, editar, inactivar, etc.).
2. **Paso 2 — Rutas**: define las rutas REST y helpers de construcción.
3. **Paso 3 — Request**: schema Zod para filtros del listado + body de alta/edición.
4. **Paso 4 — Response**: tipos TypeScript de respuesta (uno por operación).
5. **Paso 5 — Errores**: enum de errores de dominio con sus códigos HTTP.
6. **Paso 6 — Stub**: genera fixture de prueba que cumple el contrato.
7. **Paso 7 — Guarda**: crea `src/contracts/<entidad>.ts` con todo lo anterior.

## Estructura del contrato

```ts
// src/contracts/<entidad>.ts
import { z } from "zod";

// ─── Rutas ───────────────────────────────────────────────────────────────
export const RUTA = "/api/<entidades>";
export const rutaEntidad = (id: number) => `${RUTA}/${id}`;
export const rutaInactivar = (id: number) => `${RUTA}/${id}/inactivar`;

// ─── Request: filtros del listado ────────────────────────────────────────
export const listarEntidadQuery = z.object({ ... }).strict();

// ─── Request: alta y edición ─────────────────────────────────────────────
export const crearEntidadBody = z.object({ ... }).strict();
export const editarEntidadBody = crearEntidadBody;

export type CrearEntidadBody = z.input<typeof crearEntidadBody>;
export type CrearEntidadInput = z.output<typeof crearEntidadBody>;

// ─── Response ────────────────────────────────────────────────────────────
export type EstadoEntidad = "activo" | "inactivo";
export type EntidadResponse = { ... };

// ─── Errores de dominio ──────────────────────────────────────────────────
export type ErrorEntidad = "ERROR_1" | "ERROR_2"; // con código HTTP
```

## Reglas

- **Ruta**: RESTful, plural (`/api/alumnos`, no `/api/alumno`).
- **Request**: usar `.strict()` en todos los schemas Zod para rechazar campos extra.
- **Response**: tipo completo con `id: number` (la PK que manda la base).
- **Errores**: cada error indica su código HTTP (404, 409, 422).
- **Tipos**: exportar `CrearXBody` (input del form) y `CrearXInput` (output del schema, después de defaults).
- **No incluir**: SQL, reglas de negocio, componentes UI, lógica de service.

## Ejemplo de uso

```
/contract alumno
```

El agente genera `src/contracts/alumno.ts` con:
- Rutas: `/api/alumnos`, `rutaAlumno(id)`, `rutaInactivar(id)`
- Filtros: `listarAlumnosQuery` (busqueda, estado, carreraId)
- Body: `crearAlumnoBody` (nombre, apellido, dni, email, carreraId, etc.)
- Response: `AlumnoResponse` (id, nombre, apellido, dni, email, carrera, estado)
- Errores: `DNI_DUPLICADO` (409), `NO_ENCONTRADO` (404), `DATOS_INVALIDOS` (422)
- Stub: `FIXTURE` con 1 alumno de ejemplo

## Después del contrato

Una vez creado el contrato (que ya fue diseñado con `/disenar`):
1. Probar con `npm run dev`
2. `/subir` — publicar los cambios en GitHub
3. El back implementa service + route.ts usando los mismos tipos del contrato
