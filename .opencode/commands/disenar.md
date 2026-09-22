---
description: Diseña una pantalla completa de Centro Académico desde un brief (HU + wireframe). Flujo: audit UX → reuso de componentes (inventario) → visual MD3 (tokens BandidosSW) → código hardcodeado → verificación técnica → checkpoint de revisión. La subida a GitHub se hace con /subir.
agent: build
---

# Comando /disenar — Pantalla completa desde brief

Vas a diseñar, codear y verificar una pantalla de **Centro Académico** (sistema de gestión académica) a partir del brief indicado. Ejecutá los pasos EN ORDEN y no te saltees ninguno.

**Brief a procesar:** `docs/briefs/$ARGUMENTS.md`
($ARGUMENTS es el nombre del brief, ej: `HU-001` o `dashboard`. Si no se indica o el archivo no existe, listá los briefs disponibles en `docs/briefs/` y pedí cuál procesar.)

---

## Paso 1 — Leer contexto (obligatorio, optimizado con Engram)

**Objetivo:** obtener todo el contexto necesario sin leer archivos pesados cada vez. Usá `mem_search` por topic_keys para recuperar lo cacheado. **Delegá las búsquedas de contexto a sub-agentes en paralelo** para acelerar y no inflar tu contexto.

1. **Brief (inline):** leé directamente `docs/briefs/$ARGUMENTS.md` — la HU, wireframe, datos y criterios de aceptación. Este es el **único archivo que lees inline tú** (es único por HU).

2. **Lanzá los sub-agentes en paralelo** (delegate → `explore`):
   - **Sub-agente A — tokens:** `mem_search(query: "disenar/design-system")` + si es necesario `grep` sobre `MASTER.md`. Devuelve: paleta, tipografía, radios, motion, composición.
   - **Sub-agente B — componentes + HUs previas:** `mem_search(query: "disenar/componentes")` + `grep` sobre `src/components/**` + `mem_search(query: "hu/HU-XXX components-used")` del mismo módulo. Devuelve: inventario + decisiones previas.
   - **Sub-agente C — reglas + esquema:** `mem_search(query: "disenar/reglas")` + `grep` de las tablas del brief sobre `docs/esquema-bd-front.md`. Devuelve: reglas activas + campos/tipos de las entidades.

3. **Consolidá** los 3 resultados y seguí con el paso 2.

4. **Override de página:** (directo, es rápido) si existe `design-system/bandidossw/pages/[pantalla].md`, leelo directamente (tiene prioridad sobre el MASTER para esa pantalla). Si NO existe, lo crea el paso 5.

5. **Razonamiento de token puntual:** si te falta el "por qué" de un token, `grep -n "<token>" design-system/bandidossw/MASTER.md` y leé solo ese fragmento. **NUNCA** leas el archivo completo.

## Paso 2 — Audit UX (antes de codear)

Usá la skill `ux-heuristics` sobre el wireframe del brief:

- Aplicá las heurísticas de Nielsen y las leyes de Krug ("Don't make me think").
- Asigná severidad a cada problema (catastrophic / major / minor / cosmetic).
- Dá un puntaje (0-10) y explicá qué corregir para llegar a 10.
- Si el brief no trae wireframe, proponé vos la estructura y auditála.

> **Presupuesto de contexto:** activá la skill `ux-heuristics`, pero leé **solo** `SKILL.md` + `references/nielsen-heuristics.md` + `references/krug-principles.md`. Las demás references quedan bajo demanda.

Presentá un resumen corto del audit antes de seguir. Corregí problemas de lógica y jerarquía en el plan de implementación.

## Paso 3 — Generar el visual

### 3a. Composición con tokens MD3

Usá los tokens del design system BandidosSW como guía de composición, estados y anti-patterns. **Los tokens finales son SIEMPRE los del MASTER:**

- **Primary:** `#00236f` (azul oscuro navy) → CTAs, sidebar activo, headers
- **Secondary:** `#0058be` (azul medio) → links, acentos, CTAs secundarios
- **Tertiary:** `#340081` (púrpura) → acentos
- **Background:** `#f8f9ff` (fondo general)
- **Tipografía:** Inter (400-700)
- **Icons:** Material Symbols Outlined
- **Spacing:** custom (2xs a 2xl + gutter + margin)
- **Border radius:** 2px / 4px / 8px / 12px

## Paso 4 — Buscar y reusar componentes (antes de codear)

**Regla dura: reusar antes de crear. Nada de duplicar componentes que ya existen.**

1. **Consultá el inventario de Engram** (recuperado en el paso 1, topic_key `disenar/componentes`) y armá la lista de piezas que va a necesitar la pantalla: tablas, filtros, modales, badges, forms, tabs, paginación, toasts.
2. **Verificá contra el código real**: el inventario en Engram puede estar desactualizado; ante duda, hacé grep en `src/components/**` por nombre o propósito para confirmar que el componente existe y tiene las props que necesitás.
3. **Buscá en Engram decisiones previas del mismo módulo:** `mem_search(query: "hu/HU-XXX components-used", project: "centro-academico")` para ver qué componentes se usaron en HUs anteriores del mismo módulo.
4. **Clasificá cada pieza** en una de tres categorías y presentalo como lista explícita antes de codear:
   - **Reusar tal cual:** existe en `src/components/` o en el módulo y cubre la necesidad.
   - **Extender:** existe algo similar pero le falta una prop/variante → extender el componente existente manteniendo retrocompatibilidad.
   - **Crear nuevo:** no hay equivalente razonable → justificar por qué no conviene reusar ni extender.
5. Si un badge/estado de negocio es necesario, construiló sobre un componente base existente (mapear estado → variante + label + icono), nunca con colores propios.

### 4b. Sub-agente de viabilidad (pre-check antes de codear)

Cuando la clasificación tenga algún **"Extender"** o **"Crear nuevo"**, delegá el chequeo de viabilidad a un sub-agente con contexto fresco:

- **Input al sub-agente:** la lista de piezas clasificadas (los "extender" y "crear").
- **Lo que hace el sub-agente:**
  - Para cada **"Extender"**: lee el componente existente y verifica que la prop/variante nueva **no rompa retrocompatibilidad**.
  - Para cada **"Crear"**: hace una búsqueda real para confirmar que NO existe equivalente razonable.
- **Output:** para cada pieza → `✅ viable` / `⚠️ ajustar` / `❌ no hacer` (con justificación).

Si el sub-agente marca algo como `❌`, ajustá la clasificación antes de codear.

## Paso 5 — Codear (componentes reutilizables + página)

- Componentes **reutilizables** en `src/components/` (pensados 1 a 1 para React), no pantallas sueltas.
- Página en `src/app/<ruta>/page.tsx` con **datos hardcodeados** del brief (en español).
  - Ruta por defecto: derivar del nombre legible de la pantalla (ej: "Dashboard de turnos" → `/dashboard`). Si el brief aclara ruta, usar esa.
- **Datos placeholder listos para backend**: cada registro lleva un `id` numérico (la PK que mandará la base de datos). Los campos y tipos deben respetar el esquema del proyecto. En cada punto de integración dejar un comentario `// BACKEND:` indicando la tabla y endpoint exactos.
- Tokens vía Tailwind (`src/app/globals.css`) — nada de colores hardcodeados.
- Iconos **Material Symbols Outlined**, animaciones **Framer Motion** (respetando `prefers-reduced-motion`).
- Estados: vacío, cargando, error, con datos — según corresponda a la pantalla.
- Accesibilidad: contraste ≥4.5:1, focus visible, touch targets ≥44×44px, `alt` en imágenes.
- **Al terminar:** actualizar `design-system/bandidossw/componentes.md` con los componentes nuevos creados (y ajustar filas de los que se extendieron).

## Paso 6 — Verificación técnica

### 6a. Verificación estática (sin navegador)

1. `npm run lint` (cubre solo `src/`).
2. `npx tsc --noEmit`.
3. Checklist de accesibilidad sobre el código: contraste de tokens usados, focus visible, touch targets ≥44px, `aria-label` en iconos-acción, `alt`/`aria` en imágenes, `prefers-reduced-motion` respetado.
4. Repasá las **"Reglas activas"** del topic_key `disenar/reglas` en Engram (recuperado en el paso 1) y verificá que ninguna se esté repitiendo.

### 6b. Prueba de renderizado real (headless browser, sin instalar nada)

1. Levantá el dev server: `npm run dev` (en background) y esperá a que responda.
2. Cargá la ruta de la pantalla en el headless browser (si la skill `browser-automation` está disponible).
3. Revisá el reporte:
   - **`title` vacío y `bodyChars` ≈ 0** → la app no montó.
   - **`console.error` / excepciones no capturadas** → casi siempre bug real. Corregilo.
   - **`requests failed`** → 404 en un chunk JS suele indicar un build viejo.
4. Confirmá que los elementos principales están en el DOM.
5. Si la pantalla tiene **estados alternos** (vacío / error), cargalos y verificá que no rompan.
6. Corregí todo lo que falle y volvé a verificar hasta que renderice limpio.

> **Si detectaste un error**, **registralo automáticamente** en `docs/errores-comunes.md` (ver "Registro automático de errores" más abajo).

Cerrá el dev server al terminar (o dejalo si el usuario va a probar de inmediato en el checkpoint).

### Registro automático de errores

Cuando detectes un error, **registralo vos automáticamente** en `docs/errores-comunes.md`:

1. **Escribí la entrada** arriba de las existentes (más reciente primero), con el formato:
   - Título: `### YYYY-MM-DD · <pantalla o módulo> (HU si aplica)`.
   - Campos: **Qué pasó**, **Cómo se detectó**, **Causa**, **Regla para no repetirlo**.
2. **Actualizá las "Reglas activas"** si la regla es aplicable a futuras pantallas: sumala al topic_key `disenar/reglas` en Engram.
3. No inventes datos que no observaste.

## Paso 7 — CHECKPOINT: revisión del usuario (sin git)

**IMPORTANTE: este comando NO hace commit ni push. La subida se hace aparte con el comando `/subir`.**

1. Presentá un resumen de lo creado: archivos, componentes (marcando cuáles se reusaron, extendieron o crearon), ruta, resultado del audit y de la verificación técnica.
2. Decile al usuario que pruebe la pantalla: `npm run dev` y abrir la ruta en el navegador.
3. Si pidió ajustes, aplicálos y volvé a correr el paso 6.
4. Recordale que cuando quiera publicar los cambios use **`/subir`**.
5. Si durante la sesión apareció un error digno de registro, registralo automáticamente.

## Paso 8 — Guardar en Engram (post-checkpoint)

Después de que el usuario apruebe el checkpoint, guardá las decisiones de esta HU en Engram:

1. **Componentes usados:** `mem_save` con topic_key `centro-academico/hu/$ARGUMENTS/components-used`:
   - Qué componentes se reusaron (nombre + archivo)
   - Cuáles se extendieron (nombre + prop/variante agregada)
   - Cuáles se crearon de nuevo (justificación)

2. **Decisiones de diseño:** si hubo decisiones no obvias, `mem_save` con topic_key `centro-academico/hu/$ARGUMENTS/decisions`.

3. **Actualizar inventario en Engram:** si se crearon o extendieron componentes, actualizar `disenar/componentes` con `mem_update` para que la próxima HU tenga el inventario actualizado.

## Recordatorio de reglas

- **Reusar antes de crear** — consultar el inventario en Engram (`disenar/componentes`) y verificar contra `src/components/**`. Mantenerlo actualizado con lo nuevo (paso 8).
- El log `docs/errores-comunes.md` se alimenta **automáticamente** durante los pasos 6/7. Las "Reglas activas" viven en Engram (`disenar/reglas`).
- UI en español, tono profesional.
- **Cada HU exitosa deja contexto en Engram** (paso 8): componentes usados + decisiones de diseño. La próxima HU del mismo módulo arranca con ventaja.
- **Preparación para backend**: los datos placeholder llevan `id` numérico. Cada punto de integración lleva un comentario `// BACKEND:` con el endpoint y qué reemplazar.
