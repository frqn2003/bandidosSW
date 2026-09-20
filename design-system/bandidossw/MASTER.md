# Design System Master File — Centro Académico

> **LOGIC:** When building a specific page, first check `design-system/bandidossw/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.
>
> **SOURCE OF TRUTH:** This file is the machine-readable version of the Material Design 3 tokens for Centro Académico.

---

**Project:** Centro Académico
**Generated:** 2026-09-20 (Material Design 3 tokens)
**Category:** Academic management system (institutional, clean professional style)

---

## Global Rules

### Color Palette (Material Design 3)

#### Primary
| Role | Hex | CSS Variable |
|------|-----|--------------|
| primary | `#00236f` | `--color-primary` |
| on-primary | `#ffffff` | `--color-on-primary` |
| primary-container | `#1e3a8a` | `--color-primary-container` |
| on-primary-container | `#90a8ff` | `--color-on-primary-container` |
| primary-fixed | `#dce1ff` | `--color-primary-fixed` |
| primary-fixed-dim | `#b6c4ff` | `--color-primary-fixed-dim` |
| on-primary-fixed | `#00164e` | `--color-on-primary-fixed` |
| on-primary-fixed-variant | `#264191` | `--color-on-primary-fixed-variant` |

#### Secondary
| Role | Hex | CSS Variable |
|------|-----|--------------|
| secondary | `#0058be` | `--color-secondary` |
| on-secondary | `#ffffff` | `--color-on-secondary` |
| secondary-container | `#2170e4` | `--color-secondary-container` |
| on-secondary-container | `#fefcff` | `--color-on-secondary-container` |
| secondary-fixed | `#d8e2ff` | `--color-secondary-fixed` |
| secondary-fixed-dim | `#adc6ff` | `--color-secondary-fixed-dim` |
| on-secondary-fixed | `#001a42` | `--color-on-secondary-fixed` |
| on-secondary-fixed-variant | `#004395` | `--color-on-secondary-fixed-variant` |

#### Tertiary
| Role | Hex | CSS Variable |
|------|-----|--------------|
| tertiary | `#340081` | `--color-tertiary` |
| on-tertiary | `#ffffff` | `--color-on-tertiary` |
| tertiary-container | `#4e03b8` | `--color-tertiary-container` |
| on-tertiary-container | `#b89cff` | `--color-on-tertiary-container` |
| tertiary-fixed | `#e9ddff` | `--color-tertiary-fixed` |
| tertiary-fixed-dim | `#d0bcff` | `--color-tertiary-fixed-dim` |
| on-tertiary-fixed | `#23005c` | `--color-on-tertiary-fixed` |
| on-tertiary-fixed-variant | `#5516be` | `--color-on-tertiary-fixed-variant` |

#### Error
| Role | Hex | CSS Variable |
|------|-----|--------------|
| error | `#ba1a1a` | `--color-error` |
| on-error | `#ffffff` | `--color-on-error` |
| error-container | `#ffdad6` | `--color-error-container` |
| on-error-container | `#93000a` | `--color-on-error-container` |

#### Surface (Backgrounds & Containers)
| Role | Hex | CSS Variable |
|------|-----|--------------|
| background | `#f8f9ff` | `--color-background` |
| on-background | `#0d1c2e` | `--color-on-background` |
| surface | `#f8f9ff` | `--color-surface` |
| on-surface | `#0d1c2e` | `--color-on-surface` |
| surface-dim | `#ccdbf3` | `--color-surface-dim` |
| surface-bright | `#f8f9ff` | `--color-surface-bright` |
| surface-variant | `#d5e3fc` | `--color-surface-variant` |
| on-surface-variant | `#444651` | `--color-on-surface-variant` |
| surface-tint | `#4059aa` | `--color-surface-tint` |
| surface-container-lowest | `#ffffff` | `--color-surface-container-lowest` |
| surface-container-low | `#eff4ff` | `--color-surface-container-low` |
| surface-container | `#e6eeff` | `--color-surface-container` |
| surface-container-high | `#dce9ff` | `--color-surface-container-high` |
| surface-container-highest | `#d5e3fc` | `--color-surface-container-highest` |

#### Inverse
| Role | Hex | CSS Variable |
|------|-----|--------------|
| inverse-surface | `#233144` | `--color-inverse-surface` |
| inverse-on-surface | `#eaf1ff` | `--color-inverse-on-surface` |
| inverse-primary | `#b6c4ff` | `--color-inverse-primary` |

#### Outline
| Role | Hex | CSS Variable |
|------|-----|--------------|
| outline | `#757682` | `--color-outline` |
| outline-variant | `#c5c5d3` | `--color-outline-variant` |

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

| Token | Value | Usage |
|-------|-------|-------|
| `DEFAULT` | 2px | Elementos pequeños |
| `lg` | 4px | Botones, inputs |
| `xl` | 8px | Cards, modals |
| `full` | 12px | Badges, pills |

### Icons

- **Library:** Material Symbols Outlined
- **Default weight:** 400
- **FILL:** 0..1 (variable)
- **Usage:** `<span class="material-symbols-outlined">icon_name</span>`

### Status Colors

| Variant | Dot | Chip text | Semántica | Estados típicos |
|---------|-----|-----------|-----------|-----------------|
| `success` | `#16A34A` | `#15803D` | Positivo / completado | Activo, Confirmado, Presente |
| `warning` | `#F59E0B` | `#B45309` | Pendiente / atención | Pendiente, Bajo, Inasistente |
| `info` | `#2563EB` | `#1D4ED8` | En proceso | Enviada, En curso |
| `danger` | `#DC2626` | `#B91C1C` | Negativo / crítico | Cancelado, Eliminado |
| `neutral` | `#757682` | `#444651` | Neutro | Inactivo, Suspendido |

---

## Layout Pattern

- **Sidebar:** fixed, w-64, bg-surface-container-lowest
- **Main content:** pl-64, flex-1
- **Header:** h-16, sticky top-0, bg-surface-container-lowest
- **Content max-width:** max-w-[1600px] mx-auto

---

## Component Patterns

### Cards / Modals
- bg-surface-container-lowest
- rounded-2xl (xl token)
- border border-surface-container
- shadow-xl for modals

### Buttons Primary
- bg-primary hover:bg-secondary
- text-on-primary
- rounded-lg (lg token)
- font-semibold text-xs

### Buttons Secondary
- border border-surface-container
- hover:bg-surface-container
- text-on-surface
- rounded-lg

### Status Badges
- rounded-full
- Semantic colors (emerald for active, amber for warning, red for error)
- Always indicator + text

### Table Headers
- text-[11px] uppercase tracking-wider
- font-semibold text-on-surface-variant
- border-b border-surface-container

### Table Rows
- text-xs
- hover:bg-surface-container-low/40
- divide-y divide-surface-container/60

### Form Inputs
- h-9 px-3
- bg-surface-container-low
- border border-surface-container
- rounded-lg
- text-xs text-on-surface
- focus:border-secondary focus:bg-surface-container-lowest

### Modal Backdrop
- bg-slate-900/60 backdrop-blur-sm

---

## Componentes existentes

Inventario de componentes reutilizables en `src/components/`. Consultar `design-system/bandidossw/componentes.md` antes de crear nuevos componentes.
