---
description: Sube los cambios del repo Centro Académico a GitHub con confirmación. Detecta el tipo de cambio (feat/fix/chore/docs), valida el mensaje contra la convención, avisa la rama actual y pushea a origin tras tu OK.
argument-hint: "[mensaje del commit]" (opcional)
---

# Comando /subir — Publicar cambios en GitHub

Publica los cambios del repo **Centro Académico** en GitHub (`origin`). **Nunca commitear ni pushear sin confirmación explícita del usuario.**

> Versión Claude Code de `.opencode/commands/subir.md`. Diferencia: acá `git` se llama normal desde la herramienta Bash. Si alguna vez corrés esto desde PowerShell y falla, usá la ruta completa `C:\Program Files\Git\cmd\git.exe`.

Mensaje pedido por el usuario (puede venir vacío): `$ARGUMENTS`

---

## Paso 1 — Inspeccionar el estado

Corré en el directorio del proyecto:
- `git branch --show-current` → rama actual.
- `git status --short` → archivos modificados/nuevos/borrados.
- `git diff --stat` (y `git diff --cached --stat` si hay staged) → tamaño de los cambios.
- `git log --oneline -8` → estilo de mensajes del repo.

Revisá que NO haya archivos sensibles a subir (`.env`, claves, credenciales, `node_modules/`, artefactos de build). Si hay algo dudoso, parar y preguntar.

## Paso 2 — Confirmar la rama

1. Mostrá la rama actual: **"Estás en la rama `<rama>`."**
2. Si hay upstream configurado, avisá a dónde va a pushear (`git rev-parse --abbrev-ref --symbolic-full-name "@{u}"`). Si NO hay upstream o la rama no es la esperada, preguntá antes de continuar:
   - **"¿Pusheo a `origin/<rama>`?"** → sí / no (indicá otra rama o cancelá).
3. **Guarda de checkpoint:** si hay archivos sin commitear que NO forman parte del cambio que se quiere subir, avisá y preguntá si se incluyen o si conviene commitearlos aparte primero.

## Paso 3 — Detectar tipo de cambio y proponer mensaje

Detectá el **tipo de cambio automáticamente** a partir de los archivos del diff:

| Tipo | Dispara cuando toca | Prefijo |
|---|---|---|
| `feat` | `src/app/**` o `src/components/**` (pantalla/feature de HU) | `feat: <pantalla> (HU-XXX)` |
| `fix` | `src/**` (corrección de algo ya existente) | `fix: <descripción> (HU-XXX)` |
| `docs` | `docs/**`, `*.md` (documentación) | `docs: <descripción>` |
| `chore` | `.claude/`, `.opencode/`, `.agents/`, config, herramientas, infra | `chore: <descripción>` |

Reglas de clasificación:
- Si el diff toca **solo** `.claude/`, `.opencode/`, `.agents/`, config o herramientas → `chore`.
- Si toca **solo** `docs/` → `docs`.
- Si toca `src/**` + otra cosa → clasificar por la parte principal de `src/**`.
- Si toca varias HUs distintas, proponer el de la acción principal; si es ambiguo, preguntar.

**Mensaje propuesto:**
- Si el usuario pasó argumento (`/subir "mensaje"`), usarlo, pero **validarlo** (paso 4).
- Si no, derivarlo del tipo detectado + resumen del diff.

## Paso 4 — Validar el mensaje

Antes de commitear, validá que el mensaje siga la convención del repo:

- Empieza con `feat:` / `fix:` / `chore:` / `docs:`.
- Las HU (feat/fix) referencian la HU al final entre paréntesis `(HU-XXX)` cuando corresponde.
- Conciso y en español.

Si el mensaje NO cumple, **advertí y proponé una corrección** antes de commitear. Nunca commitees un mensaje fuera de convención sin avisar.

## Paso 5 — Confirmación y commit

1. Mostrá el **resumen del diff** (archivos + stats), la **rama** y el **mensaje propuesto** (con su tipo detectado).
2. Preguntá explícitamente: **"¿Confirmás el commit y push en `origin/<rama>` con el mensaje: \<mensaje\>?"**
   - **Sí** → `git add -A` + `git commit -m "<mensaje>"`.
   - **No / ajustes** → aplicá lo que pida (otro mensaje, archivos excluidos) y volvé a preguntar.
   - **Solo commit, sin push** → commitear y avisar que el push queda pendiente.
   - **Dejarlo local** → no commitear nada; avisar que los cambios quedan en el working tree.
3. Si el commit falla o un hook lo rechaza, corregí el problema y creá un commit nuevo (no amendar).

## Paso 6 — Push y verificación

1. `git push origin <rama>` (rama explícita, no solo `origin`). Si no hay remote configurado, avisar y preguntar la URL.
2. Verificá con `git log --oneline -3` y `git status --short` (debe quedar limpio).
3. Avisá que se subió y mostrá el hash/descripción del commit.

## Recordatorio de reglas

- Nunca pushear sin confirmación explícita (preguntar siempre).
- Nunca commitear secretos ni archivos fuera del alcance del cambio pedido.
- Mensajes concisos en español, estilo convencional, referenciando la HU cuando corresponda.
- **Validar SIEMPRE el mensaje** contra la convención antes de commitear.
- Detectar el tipo de cambio por los archivos que toca, no asumir.
- Confirmar la rama antes de pushear (`git push origin <rama>` explícito).
