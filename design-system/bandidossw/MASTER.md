# Design System Master File — Centro Académico

> **LOGIC:** When building a specific page, first check `design-system/bandidossw/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.
>
> **SOURCE OF TRUTH:** This file is the machine-readable version of the Material Design 3 tokens for Centro Académico.

---

**Project:** Centro Académico
**Generated:** 2026-09-21 — paleta "Nexo Académico" (documento de diseño) mapeada a tokens MD3
**Category:** Academic management system (institutional, clean professional style)

---

## Global Rules

### Color Palette — Nexo Académico

> **Fuente:** documento de diseño "Paleta de Colores del Sistema". El azul profundo
> transmite solidez institucional; el turquesa y el celeste, la idea de *nexo*
> (conexión entre alumnos, profesores y conocimiento); los colores de estado
> comunican de un vistazo la situación de alumnos, turnos y pagos.

| Color | Nombre | Uso recomendado | Hex |
|-------|--------|-----------------|-----|
| Primario | Azul Conexión | CTAs, estados activos, barra lateral y marca del sistema | `#2F6FED` |
| Secundario | Azul Foco | Botones secundarios, enlaces y elementos de foco | `#1D4ED8` |
| Acento | Turquesa Nexo | Íconos, acentos y elementos destacados | `#14B8A6` |
| Éxito | Verde Éxito | Estados "Activo", asistencia y confirmaciones | `#22C55E` |
| Atención | Ámbar Atención | Alertas, deuda pendiente y advertencias | `#F59E0B` |
| Error | Rojo Error | Errores, bajas y cancelaciones | `#EF4444` |
| Texto | Gris Oscuro | Texto principal de la interfaz | `#1E293B` |
| Texto secundario | Gris Medio | Texto secundario y etiquetas | `#64748B` |
| Fondo | Gris Claro | Fondos de pantalla y tarjetas | `#F1F5F9` |

Los tonos de contenedor/fixed de abajo son derivaciones MD3 de esos 9 colores
base (tints para fondos, escalones para estados) — **no** introducen matices
nuevos de marca.

#### Primary (Azul Conexión)
| Role | Hex | CSS Variable |
|------|-----|--------------|
| primary | `#2f6fed` | `--color-primary` |
| on-primary | `#ffffff` | `--color-on-primary` |
| primary-container | `#4a83f1` | `--color-primary-container` |
| on-primary-container | `#fefcff` | `--color-on-primary-container` |
| primary-fixed | `#d8e2ff` | `--color-primary-fixed` |
| primary-fixed-dim | `#adc6ff` | `--color-primary-fixed-dim` |
| on-primary-fixed | `#001a42` | `--color-on-primary-fixed` |
| on-primary-fixed-variant | `#004395` | `--color-on-primary-fixed-variant` |

#### Secondary (Azul Foco)
| Role | Hex | CSS Variable |
|------|-----|--------------|
| secondary | `#1d4ed8` | `--color-secondary` |
| on-secondary | `#ffffff` | `--color-on-secondary` |
| secondary-container | `#dbe4ff` | `--color-secondary-container` |
| on-secondary-container | `#062f83` | `--color-on-secondary-container` |
| secondary-fixed | `#e0e6ff` | `--color-secondary-fixed` |
| secondary-fixed-dim | `#c0ccff` | `--color-secondary-fixed-dim` |
| on-secondary-fixed | `#00114d` | `--color-on-secondary-fixed` |
| on-secondary-fixed-variant | `#0e2c91` | `--color-on-secondary-fixed-variant` |

#### Tertiary (Turquesa Nexo)
| Role | Hex | CSS Variable |
|------|-----|--------------|
| tertiary | `#14b8a6` | `--color-tertiary` |
| on-tertiary | `#ffffff` | `--color-on-tertiary` |
| tertiary-container | `#5eead4` | `--color-tertiary-container` |
| on-tertiary-container | `#0f766e` | `--color-on-tertiary-container` |
| tertiary-fixed | `#ccfbf1` | `--color-tertiary-fixed` |
| tertiary-fixed-dim | `#99f6e4` | `--color-tertiary-fixed-dim` |
| on-tertiary-fixed | `#042f2e` | `--color-on-tertiary-fixed` |
| on-tertiary-fixed-variant | `#0f766e` | `--color-on-tertiary-fixed-variant` |

#### Error (Rojo Error)
| Role | Hex | CSS Variable |
|------|-----|--------------|
| error | `#ef4444` | `--color-error` |
| on-error | `#ffffff` | `--color-on-error` |
| error-container | `#ffdad6` | `--color-error-container` |
| on-error-container | `#93000a` | `--color-on-error-container` |

#### Surface (Backgrounds & Containers)
| Role | Hex | CSS Variable |
|------|-----|--------------|
| background | `#f1f5f9` | `--color-background` |
| on-background | `#1e293b` | `--color-on-background` |
| surface | `#f1f5f9` | `--color-surface` |
| on-surface | `#1e293b` | `--color-on-surface` |
| surface-dim | `#cbd5e1` | `--color-surface-dim` |
| surface-bright | `#f1f5f9` | `--color-surface-bright` |
| surface-variant | `#e2e8f0` | `--color-surface-variant` |
| on-surface-variant | `#64748b` | `--color-on-surface-variant` |
| surface-tint | `#2f6fed` | `--color-surface-tint` |
| surface-container-lowest | `#ffffff` | `--color-surface-container-lowest` |
| surface-container-low | `#f8fafc` | `--color-surface-container-low` |
| surface-container | `#e2e8f0` | `--color-surface-container` |
| surface-container-high | `#d9e2ec` | `--color-surface-container-high` |
| surface-container-highest | `#cbd5e1` | `--color-surface-container-highest` |

#### Inverse
| Role | Hex | CSS Variable |
|------|-----|--------------|
| inverse-surface | `#334155` | `--color-inverse-surface` |
| inverse-on-surface | `#f1f5f9` | `--color-inverse-on-surface` |
| inverse-primary | `#93c5fd` | `--color-inverse-primary` |

#### Outline
| Role | Hex | CSS Variable |
|------|-----|--------------|
| outline | `#64748b` | `--color-outline` |
| outline-variant | `#cbd5e1` | `--color-outline-variant` |

### Typography

- **Font Family:** Inter (sans-serif)
- **Weights:** 400 (regular), 500 (medium), 600 (semibold), 700 (bold)
- **Google Fonts:** `https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap`

### Type Scale

| Level | Size | Weight | Line-height | Notes |
|-------|------|--------|-------------|-------|
| Display | 48–64px | 700 | 0.90–1.00 | letter-spacing -2% |
| H1 | 40–48px | 700 | 0.95–1.05 | |
| H2 | 28–36px | 700 | 1.00–1.10 | |
| H3 | 18–22px | 600–700 | 1.10–1.25 | |
| Body | 14–16px | 400–500 | 1.45–1.60 | |
| Small | 11–13px | 500 | 1.30–1.40 | |

### Spacing Variables

| Token | Value | Usage |
|-------|-------|-------|
| `space-2xs` | 2px | Micro separación |
| `space-xs` | 4px | Icono/texto |
| `space-sm` | 8px | Padding pequeño |
| `space-md` | 12px | Padding estándar |
| `space-lg` | 16px | Cards / grid |
| `space-xl` | 24px | Grupos |
| `space-2xl` | 32px | Componentes |
| `gutter` | 20px | Gutter estándar |
| `gutter-compact` | 12px | Gutter compacto |
| `margin` | 24px | Margin estándar |
| `margin-wide` | 32px | Margin amplio |

### Border Radius

| Token | Value | Tailwind | Usage |
|-------|-------|----------|-------|
| `radius-xs` | 2px | `rounded-xs` | Elementos mínimos |
| `radius-sm` | 4px | `rounded-sm` | Botones, inputs |
| `radius-md` | 8px | `rounded-md` | Cards, modales |
| `radius-lg` | 12px | `rounded-lg` | Badges, contenedores amplios |
| — | 9999px | `rounded-full` | Pills, avatares |

### Icons

- **Library:** Material Symbols Outlined (la única del sistema; **no** usar otra librería de iconos)
- **Default weight:** 400
- **FILL:** 0..1 (variable) → `filled` para énfasis / estados activos
- **Carga:** hoja externa de Google Fonts en `src/app/layout.tsx` (Tailwind descarta
  los `@import` remotos; `next/font` no incluye esta familia)
- **Estilos base:** `.material-symbols-outlined` en `src/app/globals.css`
- **Uso en el código:** componente `<Icon name="icon_name" />`
  (`src/components/ui/Icon.tsx`) — el nombre es la ligadura snake_case del
  catálogo (https://fonts.google.com/icons), ej. `groups`, `check_circle`, `add`.
  Tamaño con la prop `size` (px), decorativo por defecto (`aria-hidden`).
- **HTML equivalente:** `<span class="material-symbols-outlined">icon_name</span>`

### Color por materia (HU-CAL-02)

Ocho tokens para distinguir la materia de un turno en la grilla del calendario.
El consumidor es `src/funciones/paleta-materia.ts` (`construirMapaTonos` /
`tonoMateriaDe` / `tonoEstadoCancelado`).

**El tono NO es `id % 8`.** Los ids de `materia` son dispersos (4, 9, 12, 15…) y
el módulo haría que la 4 y la 12 compartieran tono: dos materias pintadas igual,
justo lo que el color por materia tiene que evitar. `construirMapaTonos` ordena
el catálogo por id y reparte los tonos **por posición**, así que dos materias
distintas nunca comparten color mientras el catálogo quepa en la paleta. Es
determinista: la misma materia tiene siempre el mismo color.

| Token | Hex | Uso |
|-------|-----|-----|
| `--color-materia-1` | `#2F6FED` | franja azul |
| `--color-materia-2` | `#1D4ED8` | franja azul profunda |
| `--color-materia-3` | `#4338CA` | índigo |
| `--color-materia-4` | `#5B21B6` | violeta |
| `--color-materia-5` | `#7C3AED` | morado |
| `--color-materia-6` | `#0369A1` | azul petróleo |
| `--color-materia-7` | `#0E7490` | cian oscuro |
| `--color-materia-8` | `#B45309` | ámbar profundo |

**Límite conocido:** con más de 8 materias activas el reparto vuelve a ciclar.
La salida definitiva es una columna de color en `materia` que asigne el backend
(o un hash del id sobre un espacio de color más grande), no un token más.

**Al consumir un token de color, la clase va ESCRITA COMPLETA.**
`border-l-materia-3`, `bg-materia-3/8`, `bg-materia-3`. Nunca la armes con
template literal (`` `border-l-${token}` ``): Tailwind v4 escanea el fuente con
regex y una clase interpolada no existe para el compilador, así que la tarjeta
sale gris sin ningún error. Ver `docs/errores-comunes.md` ("Una clase con template
literal NUNCA llega al CSS").

**Regla dura:** esta paleta **no usa rojo ni verde** porque esos dos colores ya
tienen dueño en el sistema — `danger` para **Cancelado** y `success` para
**Disponible**. Cuando una tarjeta muestra un turno cancelado, el estado pisa el
tono de materia y la tarjeta se pinta de `error`. Es un color **visual**: no
significa prioridad ni estado, solo ayuda a ubicar la materia de un vistazo.

### Status Colors

| Variant | Dot | Chip text | Semántica | Estados típicos |
|---------|-----|-----------|-----------|-----------------|
| `success` | `#22C55E` | `#16A34A` | Positivo / completado | Activo, Confirmado, Presente |
| `warning` | `#F59E0B` | `#D97706` | Pendiente / atención | Pendiente, Bajo, Inasistente |
| `info` | `#2F6FED` | `#1D4ED8` | En proceso | Enviada, En curso |
| `danger` | `#EF4444` | `#DC2626` | Negativo / crítico | Cancelado, Eliminado |
| `neutral` | `#64748B` | `#475569` | Neutro | Inactivo, Suspendido |

---

## Layout Pattern

- **Sidebar:** w-60 (240px), `bg-surface-container-lowest`, borde derecho `border-outline-variant`
- **Main content:** flex-1
- **Content max-width:** `max-w-6xl` mx-auto
- **Altura mínima de controles:** 44px (`h-11`) para touch targets accesibles

---

## Component Patterns

> Estos patrones reflejan los componentes reales de `src/components/ui/`
> (ver inventario en `componentes.md`). Si el código y este documento difieren,
> actualizar el documento en el mismo cambio.

### Cards / Modals
- `bg-surface-container-lowest`
- `rounded-md` (8px)
- `border border-outline-variant`
- `shadow-card` / `shadow-modal`

### Buttons

El CTA principal usa **Azul Conexión** (botones principales, enlaces y foco);
el secundario cae al **Azul Nexo** institucional.

- **Primary (CTA):** `bg-secondary hover:bg-primary`, `text-on-secondary`
- **Secondary:** `bg-primary hover:bg-secondary`, `text-on-primary`
- **Outline / Ghost:** `text-secondary`, borde o fondo `secondary/5`–`/10`
- **Destructive:** `bg-error hover:bg-status-danger-strong`, `text-on-error`
- **Outline-danger:** `border-status-danger` + `text-status-danger` + `hover:bg-status-danger/10`. Para la acción destructiva que acompaña a otra igual de importante (Cancelar junto a Modificar, confirmar junto a volver). Es `outline` con el color de la acción destructiva, y existe por una razón concreta: **un `ghost` con texto de color no tiene affordance** — sin borde ni fondo sólo se pinta al hacer hover, así que se lee como un texto y el usuario no lo reconoce como botón hasta descubrirlo. Cuando el rojo va como `className` sobre un `outline`/`ghost`, el color pisa por **orden de emisión** del CSS de Tailwind, que no es un contrato del design system: para eso está la variante.
- `rounded-sm` (4px), `font-bold text-sm`, `h-11` (44px)

### Status Badges
- `rounded-full`
- Colores semánticos de la tabla "Status Colors" (verde activo, ámbar atención, rojo error)
- **Siempre** indicador visual + texto (nunca solo color); se centraliza en `StatusBadge`

### Table Headers
- `text-[11px] uppercase tracking-wider`
- `font-bold text-on-surface-variant`
- `border-b border-outline-variant`

### Table Rows
- `text-sm` (datos) / `text-xs` (secundario)
- `hover:bg-surface-container-low/50`
- `divide-y divide-outline-variant/60`

### Form Inputs
- `h-11` (44px)
- `bg-surface-container-low`
- `border border-outline-variant`
- `rounded-sm`
- `text-base text-on-surface`
- `focus:border-secondary focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary/20`

### Modal Backdrop
- `bg-primary/45` (tinta institucional) + animación con `prefers-reduced-motion`

---

## Componentes existentes

Inventario de componentes reutilizables en `src/components/`. Consultar `design-system/bandidossw/componentes.md` antes de crear nuevos componentes.
