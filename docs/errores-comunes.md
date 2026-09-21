# Errores comunes — Centro Académico

Log del equipo (diseño front). Se alimenta automáticamente durante `/disenar` (pasos de verificación) cuando se detecta un problema.

---

### 2026-09-21 · Sistema de diseño (HU-PRO-01) — paleta desactualizada

- **Qué pasó:** El `MASTER.md` del repo tenía una paleta MD3 (`#00236f`, `#0058be`, `#340081`, `#f8f9ff`) distinta a la del **documento de diseño** del sistema (Nexo Académico: `#142B6F`, `#2F6FED`, `#14B8A6`, …). Se había implementado la del MASTER.
- **Cómo se detectó:** El usuario señaló que el documento de diseño manda; comparación hex por hex contra la tabla "Paleta de Colores del Sistema".
- **Causa:** El `MASTER.md` venía heredado del proyecto anterior (Huellitas) y nunca se regeneró con la paleta del Centro Académico.
- **Regla para no repetirlo:** el **documento de diseño es la fuente de verdad**; antes de tocar tokens, cotejar la paleta del MASTER contra el documento. Si difieren, actualizar el MASTER **en el mismo cambio** que el código.

---

### 2026-09-21 · Sistema de diseño (HU-PRO-01) — librería de iconos equivocada

- **Qué pasó:** Los componentes usaban `lucide-react`, pero el documento de diseño especifica **Material Symbols Outlined**.
- **Cómo se detectó:** El usuario lo marcó; `MASTER.md` (sección Icons) y `AGENTS.md` ya lo decían.
- **Causa:** Se heredó `lucide-react` del fork anterior sin revisar la sección Icons del design system.
- **Regla para no repetirlo:** los íconos van **siempre** por `ui/Icon` (Material Symbols). No importar otra librería de iconos (`grep -rn "lucide-react" src/` debe dar vacío).

---

### 2026-09-21 · Verificación técnica (HU-PRO-01) — Tailwind descarta `@import` remotos

- **Qué pasó:** Al cargar la fuente de íconos con `@import url("https://fonts.googleapis.com/...")` en `globals.css`, el CSS compilado **no contenía** el `@import` (la fuente nunca cargaba) y además aparecía el warning *"@import rules must precede all rules"*.
- **Cómo se detectó:** `grep` del CSS compilado en `.next/` buscando `fonts.googleapis` → 0 coincidencias; luego, verificando que Google Fonts respondía el `@font-face`.
- **Causa:** El pipeline de CSS (Tailwind v4 / Turbopack) resuelve e inlinea los `@import` y descarta los remotos, dejando el de la fuente fuera de lugar.
- **Regla para no repetirlo:** las fuentes externas se cargan con `<link rel="stylesheet">` en `src/app/layout.tsx`, **no** con `@import` en CSS. Ojo: `next/font/google` **no** incluye Material Symbols (verificado en `font-data.json`), así que va por `<link>`.

---

### 2026-09-21 · ESLint (HU-PRO-01) — `no-page-custom-font` es falso positivo en App Router

- **Qué pasó:** Al agregar el `<link>` de Google Fonts en el layout, ESLint marcó `@next/next/no-page-custom-font` ("Custom fonts not added in `pages/_document.js`").
- **Cómo se detectó:** `npm run lint` en la verificación técnica.
- **Causa:** Es una regla del **Pages Router**; en el App Router no existe `pages/_document.js` y el layout raíz aplica a toda la app.
- **Regla para no repetirlo:** silenciar la regla puntualmente con `{/* eslint-disable-next-line @next/next/no-page-custom-font */}` **inmediatamente arriba** del `<link>` (la directiva debe ser de una sola línea), dejando la justificación en un comentario aparte.

---

### 2026-09-21 · Cuerpo Docente (HU-PRO-01)

- **Qué pasó:** El repo arrancaba con `globals.css` default de Next (solo `--background`/`--foreground`) mientras los componentes `ui/` usaban tokens de Huellitas (`bg-brand-900`, `text-cream-50`, `rounded-pill`, `border-border`, `accent-500`) que NO existían → toda la UI habría renderizado sin estilos.
- **Cómo se detectó:** En el código (`grep` de clases contra `globals.css`) y en la carga visual: no había tokens definidos.
- **Causa:** Fork del proyecto Huellitas Felices sin migrar el tema visual; los tokens quedaron en las clases de los componentes pero nunca se definieron en Tailwind.
- **Regla para no repetirlo:** antes de crear/heredar componentes, verificar que cada clase usada exista como token en `globals.css` (o en `@theme` del MASTER.md). Al heredar un repo, correr `grep -oE "(bg|text|border|ring)-(brand|cream|accent|text-text)-..."` y resolver contra el tema real.

---

### 2026-09-21 · Verificación técnica (HU-PRO-01)

- **Qué pasó:** `npx tsc --noEmit` fallaba con `TS2304: Cannot find name 'LayoutProps'` en el layout raíz.
- **Cómo se detectó:** En el paso 6 (verificación técnica), al correr los chequeos obligatorios.
- **Causa:** En Next 16 los helpers `LayoutProps<'/ruta'>` / `PageProps<'/ruta'>` son **globales generados por typegen**, no importables; si no corre antes `next typegen` (o `next dev`/`build`), TypeScript no los conoce.
- **Regla para no repetirlo:** tras clonar/instalar el repo, correr `npx next typegen` antes de `tsc --noEmit`, y **no** tratar de importar `LayoutProps` desde `next`.

---

### 2026-09-21 · Verificación técnica (HU-PRO-01)

- **Qué pasó:** `npm run lint` y `npx tsc --noEmit` no existían: `node_modules/` no estaba instalado en el repo.
- **Cómo se detectó:** El comando devolvía "eslint no se reconoce" (PATH global sin eslint del proyecto).
- **Causa:** Dependencias nunca instaladas en este clon.
- **Regla para no repetirlo:** siempre verificar `node_modules/` antes de correr verificaciones; si falta, `npm install` (no usar `npx` suelto, que instala la versión global en vez de la del proyecto).