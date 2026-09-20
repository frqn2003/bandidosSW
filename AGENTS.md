<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md — Centro Académico

Guía de trabajo para agentes de IA en este repositorio. Es el acuerdo del equipo de diseño (Scrum) antes de pasar a backend.

## Proyecto

- **Producto:** Centro Académico — sistema de gestión académica (alumnos, docentes, turnos, asistencia, cobranzas, reportes).
- **Rol del equipo:** diseñadores UI/UX. Las interfaces se construyen **hardcodeadas** en el front para pasarlas después al equipo de backend.
- **Stack:** Next.js + React (frontend), SQL (backend/datos, lo maneja el equipo de back).
- **Control de versiones:** Git + GitHub (repo `bandidosSW`).

## Estilo de respuesta

- Respuestas objetivas y cortas.
- Solo lo que el usuario pide; sin explicaciones extra ni acciones adicionales.

## Documentación de referencia

- `docs/COMO-USAR.md` — guía del equipo: comandos OpenCode (`/brief`, `/disenar`, `/subir`).
- `docs/briefs/` (base `_plantilla.md`) — briefs por pantalla (HU + wireframe + datos + criterios de aceptación); son el insumo de `/disenar`.
- `design-system/bandidossw/MASTER.md` — design system Material Design 3 (tokens de color, tipografía, spacing, radius, motion).
- `design-system/bandidossw/componentes.md` — inventario de componentes de `src/components/`. Consultarlo **antes de crear componentes** y actualizarlo al crear/extender.
- `docs/errores-comunes.md` — log de errores/lecciones del equipo.

## Workflow obligatorio (comando `/disenar`)

El flujo completo diseño → código → verificación corre con el comando **`/disenar <brief>`** (`.opencode/commands/disenar.md`) sobre un brief de `docs/briefs/`. En resumen:

1. **Audit UX** → evaluar wireframe/flujo antes de visual: usabilidad, jerarquía, heurísticas de Nielsen/Krug.
2. **Visual MD3** → generar y pulir visualmente los componentes con tokens Material Design 3.
3. **Verificación técnica** → `npm run lint` + `npx tsc --noEmit` + checklist de accesibilidad sobre el código.

> Antes de codear: **buscar y reusar componentes** existentes (ver inventario en `design-system/bandidossw/componentes.md`); extender antes que duplicar.

## Control de versiones

- El diseño de pantallas se lanza con `/disenar` (termina en checkpoint, **no commitea**). Publicar cambios con el comando `/subir` (revisa el diff, propone el mensaje `feat/fix/chore` referenciando la HU y pushea a `origin` tras confirmación explícita).
- Nota técnica: `git` no está en el PATH de PowerShell → usar `C:\Program Files\Git\cmd\git.exe`.

## Log de errores

- Los errores/lecciones del equipo viven en `docs/errores-comunes.md`. El agente los consulta al diseñar y verifica las "Reglas activas" en la verificación técnica.
- El log se alimenta **automáticamente** durante `/disenar` (pasos 6/7): si se detecta un error, el agente lo registra sin esperar a que el usuario lo haga.

## Design System (resumen ejecutivo)

Tokens y reglas completos en `design-system/bandidossw/MASTER.md`. En resumen:

- **Primary:** `#00236f` (azul oscuro navy) → CTAs, sidebar activo, headers
- **Secondary:** `#0058be` (azul medio) → links, acentos, CTAs secundarios
- **Tertiary:** `#340081` (púrpura) → acentos
- **Background:** `#f8f9ff` (fondo general)
- **Font:** Inter (400-700)
- **Icons:** Material Symbols Outlined
- **Spacing:** custom (2xs a 2xl + gutter + margin)
- **Border radius:** 2px / 4px / 8px / 12px

## Reglas técnicas

- Componentes **reutilizables** (pensados 1 a 1 para React), no pantallas sueltas.
- Usar los tokens del design system vía Tailwind (`src/app/globals.css`, tema `@theme`) — no colores hardcodeados en componentes.
- Iconografía: **Material Symbols Outlined** (outline, stroke medio, esquinas redondeadas).
- Accesibilidad: contraste verificado, focus visible, touch targets ≥ 44×44px, `alt` en imágenes.
- Verificación: `npm run lint` + `npx tsc --noEmit`.
- Antes de subir: comprimir imágenes (TinyPNG).
- Idioma de la UI: español.
- **Preparación para backend**: los datos placeholder llevan `id` numérico (la PK que mandará la base). Cada punto de integración (fetch, POST/PUT/PATCH/DELETE, selects de catálogos) lleva un comentario `// BACKEND:` con el endpoint y qué reemplazar. El equipo de back los busca con `grep -rn "BACKEND" src/`.
