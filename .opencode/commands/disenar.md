# /disenar — Diseñar y codear la pantalla

Diseña, codea y verifica la pantalla completa a partir del brief. **La subida a GitHub NO la hace**: eso va con `/subir` aparte.

## Uso

```
/disenar HU-CEL-01
```

## Qué hace (pasos en orden)

1. **Paso 1 — Contexto**: lee el brief de `docs/briefs/HU-XXX.md` y lanza sub-agentes para recuperar tokens MD3, componentes existentes y HUs previas del módulo.
2. **Paso 2 — Audit UX**: evaluación de usabilidad sobre el wireframe (heurísticas de Nielsen + Krug), con severidad y puntaje 0-10.
3. **Paso 3 — Visual**: aplica tokens Material Design 3 del MASTER.md (primary `#00236f`, secondary `#0058be`, Inter font, spacing custom).
4. **Paso 4 — Reuso de componentes**: consulta inventario de Engram o `design-system/bandidossw/componentes.md`, clasifica cada pieza (reusar/extender/crear).
5. **Paso 5 — Codea**: componentes reutilizables en `src/components/` + página en `src/app/<ruta>/page.tsx` con datos hardcodeados. Con comentarios `// BACKEND:` para integración.
6. **Paso 6 — Verificación**: `npm run lint` + `npx tsc --noEmit` + checklist de accesibilidad.
7. **Paso 7 — Checkpoint**: te muestra el resumen y te deja probar (`npm run dev`). Ajustes → vuelve al paso 6.
8. **Paso 8 — Post-checkpoint**: guarda en Engram las decisiones de la HU para que la próxima HU del mismo módulo arranque con contexto.

## Reglas

- **Reusar antes de crear** es regla dura. El inventario vive en `design-system/bandidossw/componentes.md` y en `src/components/`.
- Si en el paso 6/7 se detecta un error, se registra automáticamente en `docs/errores-comunes.md`.
- Los datos hardcodeados deben incluir `id` numérico (la PK que mandará la base).
- Cada punto de integración lleva comentario `// BACKEND:` con el endpoint y qué reemplazar.

## Design System del proyecto

Este proyecto usa **Material Design 3**:
- Primary: `#00236f` → CTAs, sidebar activo, headers
- Secondary: `#0058be` → links, acentos, CTAs secundarios
- Tertiary: `#340081` → acentos púrpura
- Background: `#f8f9ff` → fondo general
- Font: Inter (400-700)
- Icons: Material Symbols Outlined
- Spacing: 2xs(2px) a 2xl(32px) + gutter + margin
- Border radius: DEFAULT(2px), lg(4px), xl(8px), full(12px)

Tokens completos en `design-system/bandidossw/MASTER.md`.
