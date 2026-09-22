# Centro Académico — Guía de comandos OpenCode + Engram

Documento de referencia para el equipo que trabaja en **Centro Académico** (sistema de gestión académica, frontend en Next.js/React).

> **Roles importantes:** este equipo solo trabaja el **frontend**. Se define una HU (historia de usuario), se arma el brief y se diseña la pantalla con `/disenar`. El backend lo maneja el equipo de back.

---

## Sección 1 — Comandos OpenCode del equipo

Los cuatro comandos que se usan a diario. Van siempre precedidos de `/` y se escriben en OpenCode.

### `/contract` — Definir contrato de API

Define el contrato de una entidad: rutas, request/response con Zod, errores, tipos TypeScript. **No codea la ruta ni el service**, solo el contrato. Se ejecuta DESPUÉS de `/disenar`: lee el código generado y extrae los types que el front realmente necesita.

```
/contract alumno
```

Lo que hace:
1. Identifica la entidad y sus operaciones (listar, crear, editar, inactivar).
2. Define las rutas REST y helpers de construcción.
3. Crea schemas Zod para filtros del listado + body de alta/edición.
4. Define tipos TypeScript de respuesta (uno por operación).
5. Enumera errores de dominio con sus códigos HTTP.
6. Genera fixture de prueba (stub) que cumple el contrato.
7. Guarda `src/contracts/<entidad>.ts`.

> El contrato se escribe ANTES de la pantalla o el service: es el acuerdo, no la documentación del acuerdo.

### `/brief` — Armar el brief de una pantalla

Genera el archivo `docs/briefs/HU-XXX.md` a partir de tu descripción + idea inicial. **No codea nada**, solo produce el brief. El diseño se hace después con `/disenar`.

```
/brief HU-CEL-01: Como administrativo, quiero cargar un nuevo alumno para inscribirlo a materias. Idea: formulario con datos personales, selección de carrera y materia.
```

Lo que hace:
1. Interpreta la HU + tu idea inicial → identifica las entidades de negocio.
2. **Te hace preguntas solo de lo que falta** (ruta, estados, prioridad, etc.). No lo que ya puede inferir.
3. (Espera tus respuestas.)
4. Junta contexto: esquema de BD (`docs/esquema-bd-front.md` si existe), componentes existentes y HUs previas del módulo.
5. Genera `docs/briefs/HU-XXX.md` completo: wireframe, user flow, fuente de datos, componentes sugeridos, datos hardcodeados, estados y criterios de aceptación.
6. Te muestra el resultado para revisar antes de `/disenar`.

> Regla: `/brief` pregunta **solo lo que falta de verdad**. Si la respuesta es obvia del brief o del dominio, no pregunta.

### `/disenar` — Diseñar y codear la pantalla

Diseña, codea y verifica la pantalla completa a partir del brief. **La subida a GitHub NO la hace**: eso va con `/subir` aparte.

```
/disenar HU-CEL-01
```

Lo que hace (pasos en orden):
1. **Paso 1 — Contexto**: lee el brief y recupera tokens MD3, componentes existentes y HUs previas del módulo.
2. **Paso 2 — Audit UX**: evaluación de usabilidad (Nielsen + Krug), con severidad y puntaje 0-10.
3. **Paso 3 — Visual**: tokens Material Design 3 (primary `#00236f`, secondary `#0058be`, Inter font, spacing custom).
4. **Paso 4 — Reuso de componentes**: clasifica cada pieza (reusar/extender/crear).
5. **Paso 5 — Codea**: componentes en `src/components/` + página en `src/app/<ruta>/page.tsx` con datos hardcodeados y comentarios `// BACKEND:`.
6. **Paso 6 — Verificación**: `npm run lint` + `npx tsc --noEmit` + checklist de accesibilidad.
7. **Paso 7 — Checkpoint**: te muestra el resumen y te deja probar (`npm run dev`). Ajustes → vuelve al paso 6.
8. **Paso 8 — Post-checkpoint**: guarda en Engram las decisiones de la HU.

> Reutilizar antes de crear es **regla dura**.
> Si en el paso 6/7 se detecta un error, se registra automáticamente en `docs/errores-comunes.md`.

### `/subir` — Publicar cambios en GitHub

Sube los cambios a GitHub **con confirmación explícita**.

```
/subir
```
o con mensaje:
```
/subir "feat: tabla de alumnos (HU-CEL-01)"
```

Lo que hace:
1. **Paso 1 — Inspecciona**: rama actual, status, diff, log.
2. **Paso 2 — Confirma la rama**: te dice en qué rama estás y a dónde va a pushear.
3. **Paso 3 — Detecta el tipo** automáticamente (feat/fix/docs/chore).
4. **Paso 4 — Valida el mensaje** contra la convención.
5. **Paso 5 — Confirma**: te muestra el resumen y propone el mensaje.
6. **Paso 6 — Push**: `git push origin <rama>` + verifica que quede limpio.

> Regla de oro: **nunca commitea ni pushea sin tu confirmation.**

---

## Sección 2 — Design System del proyecto

Este proyecto usa **Material Design 3** con los siguientes tokens:

### Colores principales
| Token | Hex | Uso |
|-------|-----|-----|
| primary | `#00236f` | CTAs, sidebar activo, headers |
| secondary | `#0058be` | Links, acentos, CTAs secundarios |
| tertiary | `#340081` | Acentos púrpura |
| error | `#ba1a1a` | Errores, acciones destructivas |
| background | `#f8f9ff` | Fondo general |

### Tipografía
- **Font family:** Inter (400, 500, 600, 700)
- **Icons:** Material Symbols Outlined

### Spacing
- space-2xs: 2px
- space-xs: 4px
- space-sm: 8px
- space-md: 12px
- space-lg: 16px
- space-xl: 24px
- space-2xl: 32px
- gutter: 20px
- margin: 24px
- margin-wide: 32px

### Border Radius
- DEFAULT: 2px
- lg: 4px
- xl: 8px
- full: 12px

Tokens completos en `design-system/bandidossw/MASTER.md`.

---

## Sección 3 — Orden de comandos para una HU

```
1. /brief "HU-XXX: Como <rol>, quiero <acción>, para <beneficio>. Idea: <tu propuesta>"
2. /disenar HU-XXX                  ← codea la pantalla con datos hardcodeados
3. /contract HU-XXX                 ← analiza el código generado → genera contrato (types + Zod)
4. (probar en el navegador con npm run dev)
5. /subir   (con confirmación)
```

> **Flujo:** el brief define qué se necesita, `/disenar` lo implementa con datos hardcodeados, y `/contract` lee el código resultante para extraer los types reales que el front necesita. El contrato se genera DESPUÉS del diseño, no antes — así los types reflejan lo que el código realmente usa, no lo que se imaginó en papel.

---

## Sección 4 — Topic keys de Engram

| Topic key | Qué contiene |
|---|---|
| `design-system/centro-academico` | Tokens MD3 completos |
| `design-system/centro-academico-colors` | Paleta de colores MD3 |
| `design-system/centro-academico-components` | Tipografía, spacing, componentes |
| `screens/centro-academico-inventory` | Inventario de pantallas diseñadas |
| `centro-academico/hu/HU-XXX/components-used` | Componentes usados por HU |
| `centro-academico/hu/HU-XXX/decisions` | Decisiones de diseño por HU |

---

## Referencias del proyecto

- `docs/briefs/` — briefs por pantalla (base `_plantilla.md`).
- `docs/esquema-bd-front.md` — diccionario de datos (pendiente DBA).
- `design-system/bandidossw/MASTER.md` — tokens Material Design 3.
- `design-system/bandidossw/componentes.md` — inventario de componentes.
- `docs/errores-comunes.md` — log de errores del equipo.
- `AGENTS.md` — acuerdos del equipo y reglas técnicas.
