# /subir — Publicar cambios en GitHub

Sube los cambios a GitHub **con confirmación explícita**. Detecta el tipo de cambio, valida el mensaje y confirma la rama.

## Uso

```
/subir
```
o con mensaje:
```
/subir "feat: tabla de alumnos (HU-CEL-01)"
```

## Qué hace (pasos en orden)

1. **Paso 1 — Inspecciona**: rama actual, status, diff, log.
2. **Paso 2 — Confirma la rama**: te dice en qué rama estás y a dónde va a pushear. Si hay trabajo a medias de otra tarea, avisa.
3. **Paso 3 — Detecta el tipo** automáticamente por los archivos que toca:

   | Tipo | Toca | Prefijo |
   |---|---|---|
   | `feat` | `src/app/**` o `src/components/**` | `feat: <pantalla> (HU-XXX)` |
   | `fix` | `src/**` (corrección) | `fix: <descripción> (HU-XXX)` |
   | `docs` | `docs/**`, `*.md` | `docs: <descripción>` |
   | `chore` | `.opencode/`, config, herramientas | `chore: <descripción>` |

4. **Paso 4 — Valida el mensaje** contra la convención (debe empezar con `feat:`/`fix:`/`chore:`/`docs:`, referencia HU en feat/fix). Advierte si no cumple.
5. **Paso 5 — Confirma**: te muestra el resumen y propone el mensaje. **Pregunta antes de commitear y pushear.**
6. **Paso 6 — Push**: `git push origin <rama>` (explícito) + verifica que quede limpio.

## Regla de oro

**Nunca commitea ni pushea sin tu confirmación.**

## Convención de mensajes

- Formato: `<tipo>: <descripción> (HU-XXX)`
- Ejemplos:
  - `feat: tabla de alumnos (HU-CEL-01)`
  - `fix: corrección de filtros en turnos (HU-TUR-02)`
  - `docs: actualización de brief HU-CEL-01`
  - `chore: configuración de eslint`
