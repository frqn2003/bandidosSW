---
description: Diseña una pantalla completa de Centro Académico desde un brief (HU + wireframe). Flujo: audit UX → reuso de componentes → visual MD3 (tokens BandidosSW) → código hardcodeado → verificación técnica → checkpoint. La subida se hace con /subir.
argument-hint: HU-XXX (nombre del brief en docs/briefs/)
---

# Comando /disenar — Pantalla completa desde brief

Vas a diseñar, codear y verificar una pantalla de **Centro Académico** (sistema de gestión académica) a partir del brief indicado. Ejecutá los pasos EN ORDEN y no te saltees ninguno.

**Brief a procesar:** `docs/briefs/$ARGUMENTS.md`
($ARGUMENTS es el nombre del brief, ej: `HU-MAT-01`. Si no se indica o el archivo no existe, listá los briefs disponibles en `docs/briefs/` y pedí cuál procesar.)

> Versión Claude Code de `.opencode/commands/disenar.md`. Diferencias: donde el original usa Engram (`mem_search` / `mem_save`) acá se leen y escriben los archivos del repo; la prueba de renderizado usa el navegador integrado en vez de la skill `browser-automation`.

---

## Paso 1 — Leer contexto (obligatorio)

**Objetivo:** juntar el contexto necesario sin leer archivos pesados enteros. **Delegá las búsquedas a sub-agentes `Explore` en paralelo** (una sola tanda) para no inflar tu contexto.

1. **Brief (inline):** leé directamente `docs/briefs/$ARGUMENTS.md` — HU, wireframe, datos y criterios de aceptación. Es el **único archivo que leés vos entero**.

2. **Lanzá los sub-agentes en paralelo:**
   - **Sub-agente A — tokens:** `grep` sobre `design-system/bandidossw/MASTER.md`. Devuelve paleta, tipografía, radios, spacing, motion y reglas de composición. **Nunca leas el MASTER completo.**
   - **Sub-agente B — componentes + HUs previas:** lee `design-system/bandidossw/componentes.md` + `grep` sobre `src/components/**` + revisa los briefs previos del mismo módulo en `docs/briefs/`. Devuelve inventario con props + decisiones previas.
   - **Sub-agente C — reglas + esquema:** lee las **"Reglas activas"** de `docs/errores-comunes.md` + `grep` de las tablas del brief sobre `docs/esquema-bd-front.md`. Si la entidad tiene contrato, también `src/contracts/<entidad>.ts`. Devuelve reglas activas + campos/tipos.

3. **Consolidá** los 3 resultados y seguí con el paso 2.

4. **Override de página:** si existe `design-system/bandidossw/pages/[pantalla].md`, leelo directo (tiene prioridad sobre el MASTER para esa pantalla). Si NO existe, lo crea el paso 5.

5. **Razonamiento de token puntual:** si te falta el "por qué" de un token, `grep -n "<token>" design-system/bandidossw/MASTER.md` y leé solo ese fragmento.

## Paso 2 — Audit UX (antes de codear)

Usá la skill `ux-heuristics` (leé `.agents/skills/ux-heuristics/SKILL.md`) sobre el wireframe del brief:

- Aplicá las heurísticas de Nielsen y las leyes de Krug ("Don't make me think").
- Asigná severidad a cada problema (catastrophic / major / minor / cosmetic).
- Dá un puntaje (0-10) y explicá qué corregir para llegar a 10.
- Si el brief no trae wireframe, proponé vos la estructura y auditála.

> **Presupuesto de contexto:** leé **solo** `SKILL.md` + `references/nielsen-heuristics.md` + `references/krug-principles.md`. Las demás references quedan bajo demanda.

Presentá un resumen corto del audit antes de seguir. Corregí problemas de lógica y jerarquía en el plan de implementación.

## Paso 3 — Generar el visual

Usá los tokens del design system BandidosSW como guía de composición, estados y anti-patterns. Si consultás la skill `ui-ux-pro-max` (`.opencode/skills/ui-ux-pro-max/SKILL.md`), **sus paletas y tipografías genéricas NO se usan**: los tokens finales son SIEMPRE los del MASTER.

Paleta **Nexo Académico** (resumen; la tabla completa está en el MASTER):

- **Primary — Azul Nexo `#142B6F`** → encabezados, sidebar, marca
- **Secondary — Azul Conexión `#2F6FED`** → botones principales, links, foco
- **Tertiary — Turquesa Nexo `#14B8A6`** → íconos y acentos
- **Éxito `#22C55E`** · **Atención `#F59E0B`** · **Error `#EF4444`**
- **Texto `#1E293B`** / secundario `#64748B` · **Fondo `#F1F5F9`**
- **Tipografía:** Inter (400-700)
- **Icons:** Material Symbols Outlined (siempre vía `ui/Icon`, nunca otra librería)
- **Spacing:** custom (2xs a 2xl + gutter + margin)
- **Border radius:** 2px / 4px / 8px / 12px

> **Regla activa** (`docs/errores-comunes.md`): el documento de diseño manda. Ante cualquier diferencia entre estos hexes y `design-system/bandidossw/MASTER.md`, **gana el MASTER** — verificalo antes de tocar tokens. Los colores se usan por token de Tailwind (`globals.css`), nunca hardcodeados.

## Paso 4 — Buscar y reusar componentes (antes de codear)

**Regla dura: reusar antes de crear. Nada de duplicar componentes que ya existen.**

1. **Partí del inventario** recuperado en el paso 1 (`design-system/bandidossw/componentes.md`) y armá la lista de piezas que necesita la pantalla: tablas, filtros, modales, badges, forms, tabs, paginación, toasts.
2. **Verificá contra el código real:** el inventario puede estar desactualizado; ante duda, `grep` en `src/components/**` por nombre o propósito para confirmar que el componente existe y tiene las props que necesitás.
3. **Mirá los briefs previos del mismo módulo** para ver qué componentes se usaron en HUs anteriores.
4. **Clasificá cada pieza** en una de tres categorías y presentalo como lista explícita antes de codear:
   - **Reusar tal cual:** existe y cubre la necesidad.
   - **Extender:** existe algo similar pero le falta una prop/variante → extender manteniendo retrocompatibilidad.
   - **Crear nuevo:** no hay equivalente razonable → justificar por qué no conviene reusar ni extender.
5. Si un badge/estado de negocio es necesario, construiló sobre un componente base existente (mapear estado → variante + label + icono), nunca con colores propios.

### 4b. Sub-agente de viabilidad (pre-check antes de codear)

Cuando la clasificación tenga algún **"Extender"** o **"Crear nuevo"**, delegá el chequeo a un sub-agente con contexto fresco:

- **Input:** la lista de piezas clasificadas (los "extender" y "crear").
- **Qué hace:**
  - Para cada **"Extender"**: lee el componente existente y verifica que la prop/variante nueva **no rompa retrocompatibilidad**.
  - Para cada **"Crear"**: busca de verdad para confirmar que NO existe equivalente razonable.
- **Output:** por pieza → `✅ viable` / `⚠️ ajustar` / `❌ no hacer` (con justificación).

Si marca algo como `❌`, ajustá la clasificación antes de codear.

## Paso 5 — Codear (componentes reutilizables + página)

- Componentes **reutilizables** en `src/components/` (pensados 1 a 1 para React), no pantallas sueltas.
- Página en `src/app/<ruta>/page.tsx` con **datos hardcodeados** del brief (en español).
  - Ruta por defecto: derivar del nombre legible de la pantalla. Si el brief aclara ruta, usar esa.
- **Datos placeholder listos para backend**: cada registro lleva un `id` numérico (la PK que mandará la base). Los campos y tipos respetan el esquema. En cada punto de integración dejar un comentario `// BACKEND:` con la tabla y el endpoint exactos.
  - Si la entidad ya tiene contrato en `src/contracts/`, **importá de ahí** los tipos y la `RUTA` en vez de escribir el endpoint a mano en el comentario.
- **Los datos van por la capa de datos, no por un array suelto:** creá `src/data/<entidad>.ts` con funciones `async` (listar/crear/editar/inactivar) tipadas con el contrato y que lancen `ApiError` con sus códigos. La pantalla nunca importa el fixture. Patrón completo y checklist: `docs/capa-de-datos-front.md`.
- Tokens vía Tailwind (`src/app/globals.css`) — nada de colores hardcodeados.
- Iconos **Material Symbols Outlined**, animaciones **Framer Motion** (respetando `prefers-reduced-motion`).
- Estados: vacío, cargando, error, con datos — según corresponda.
- Accesibilidad: contraste ≥4.5:1, focus visible, touch targets ≥44×44px, `alt` en imágenes.
- **Al terminar:** actualizar `design-system/bandidossw/componentes.md` con los componentes nuevos (y ajustar las filas de los que se extendieron).

## Paso 6 — Verificación técnica

### 6a. Verificación estática (sin navegador)

1. `npm run lint` (cubre solo `src/`).
2. `npx tsc --noEmit`.
3. Checklist de accesibilidad sobre el código: contraste de los tokens usados, focus visible, touch targets ≥44px, `aria-label` en iconos-acción, `alt`/`aria` en imágenes, `prefers-reduced-motion` respetado.
4. Repasá las **"Reglas activas"** de `docs/errores-comunes.md` (recuperadas en el paso 1) y verificá que ninguna se esté repitiendo.

### 6b. Prueba de renderizado real (navegador integrado)

1. Levantá el dev server con `preview_start` (`.claude/launch.json`, o creá la entrada `dev` → `npm run dev` la primera vez). No uses Bash para levantar servidores.
2. Navegá a la ruta de la pantalla.
3. Revisá:
   - **Página en blanco / sin texto** → la app no montó.
   - **`read_console_messages` con errores** → casi siempre bug real. Corregilo.
   - **`read_network_requests` con fallos** → un 404 en un chunk JS suele indicar build viejo.
4. Confirmá con `read_page` que los elementos principales están en el DOM.
5. Si la pantalla tiene **estados alternos** (vacío / error), cargalos y verificá que no rompan.
6. Corregí todo lo que falle y volvé a verificar hasta que renderice limpio.

> **Si detectaste un error**, **registralo automáticamente** en `docs/errores-comunes.md` (ver abajo).

Cerrá el dev server al terminar (o dejalo si el usuario va a probar en el checkpoint).

### Registro automático de errores

Cuando detectes un error, **registralo vos automáticamente** en `docs/errores-comunes.md`:

1. **Escribí la entrada** arriba de las existentes (más reciente primero):
   - Título: `### YYYY-MM-DD · <pantalla o módulo> (HU si aplica)`.
   - Campos: **Qué pasó**, **Cómo se detectó**, **Causa**, **Regla para no repetirlo**.
2. **Actualizá la sección "Reglas activas"** del mismo archivo si la regla aplica a futuras pantallas.
3. No inventes datos que no observaste.

## Paso 7 — CHECKPOINT: revisión del usuario (sin git)

**IMPORTANTE: este comando NO hace commit ni push. La subida se hace aparte con `/subir`.**

1. Presentá un resumen de lo creado: archivos, componentes (marcando cuáles se reusaron, extendieron o crearon), ruta, resultado del audit y de la verificación técnica.
2. Decile al usuario que pruebe la pantalla (`npm run dev` + la ruta).
3. Si pidió ajustes, aplicálos y volvé a correr el paso 6.
4. Recordale que cuando quiera publicar use **`/subir`**.

## Paso 8 — Dejar registro en el repo (post-checkpoint)

Después del OK del usuario, dejá la memoria **en archivos del repo** (así viaja entre máquinas):

1. **En `docs/briefs/$ARGUMENTS.md`**, agregá al final una sección:

```markdown
## Decisiones de diseño (completado por /disenar)

- **Ruta:** `/ruta-final`
- **Componentes reusados:** `X` (`src/components/x/X.tsx`), ...
- **Componentes extendidos:** `Y` → se agregó la variante `z`
- **Componentes nuevos:** `Z` — porque ...
- **Decisiones no obvias:** ...
```

2. **Actualizá `design-system/bandidossw/componentes.md`** si creaste o extendiste componentes (si no lo hiciste ya en el paso 5).

## Recordatorio de reglas

- **Reusar antes de crear** — consultar `design-system/bandidossw/componentes.md` y verificar contra `src/components/**`. Mantenerlo actualizado (pasos 5 y 8).
- `docs/errores-comunes.md` se alimenta **automáticamente** en los pasos 6/7, incluidas las "Reglas activas".
- UI en español, tono profesional.
- **Cada HU exitosa deja contexto en su brief** (paso 8): la próxima HU del mismo módulo arranca con ventaja.
- **Preparación para backend**: datos placeholder con `id` numérico y un comentario `// BACKEND:` en cada punto de integración.
