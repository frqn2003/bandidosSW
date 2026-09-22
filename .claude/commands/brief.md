---
description: Arma el brief de una pantalla de Centro Académico. Recibe la HU + tu idea inicial, te hace preguntas de lo que falta, y genera docs/briefs/HU-XXX.md. Se usa antes de /disenar.
argument-hint: HU-XXX + descripción de la HU e idea inicial
---

# Comando /brief — Generar brief de pantalla

Vas a armar el brief `docs/briefs/HU-XXX.md` para una pantalla de **Centro Académico**, a partir de:
1. La descripción de la HU (como \<rol\>, quiero \<acción\>, para \<beneficio\>).
2. La idea inicial que te da el equipo.

Ejecutá los pasos EN ORDEN y no te saltees ninguno. **Este comando NO codea nada**: solo produce el brief. El diseño se hace después con `/disenar HU-XXX`.

> Versión Claude Code de `.opencode/commands/brief.md`. Única diferencia: donde el original consulta Engram (`mem_search`), acá se leen los archivos del repo directamente.

---

## Paso 1 — Diagnóstico del brief

El usuario te pasó en `$ARGUMENTS`:
- La HU en algún formato (probablemente `HU-XXX: Como ..., quiero ..., para ...`)
- Una idea inicial escrita (puede ser en prosa, lista, dibujo ASCII, lo que sea)

Interpretá qué pantalla quiere. Identificá:
- **Rol** (gerente, profesor, mesa de entrada, alumno)
- **Acción** (qué quiere hacer)
- **Beneficio** (para qué)
- **Entidades de negocio implicadas** (alumnos, profesores, materias, turnos, disponibilidad, usuarios, auditoría, etc.)

Guardá el nombre del brief: `docs/briefs/$ARGUMENTS.md` (si `$ARGUMENTS` arranca con `HU-MAT-01`, el archivo es `HU-MAT-01.md`).

## Paso 2 — Información que falta (preguntar)

Compará lo que el usuario te dio contra los campos del brief (ver `docs/briefs/_plantilla.md`):
- Contexto (ruta, relacionadas, prioridad)
- Wireframe (idea visual)
- User flow (de dónde viene a dónde va)
- Datos hardcodeados
- Estados (vacío / cargando / error / con datos)
- Criterios de aceptación

**Generá una lista de preguntas puntuales** de lo que te falta. Preguntas habituales:

- ¿Dónde entra el usuario? ¿Viene de otra pantalla? (ruta / relacionadas)
- ¿Qué columnas/acciones necesita en la tabla o formulario?
- ¿Qué estados maneja la entidad?
- ¿Hay acciones de negocio especiales (dar de baja, editar, transferir, etc.)?
- ¿Prioridad de esta HU?

**Regla:** preguntá **solo lo que verdaderamente falta** y que no se pueda inferir razonablemente del brief o del dominio. Si un dato es obvio del brief o está en los criterios de aceptación, no preguntes.

Mostrá las preguntas como lista. **Esperá las respuestas del usuario antes de seguir.**

> En este punto NO toques archivos ni guardes nada. Solo preguntás.

## Paso 3 — Contexto del sistema (para datos correctos)

Una vez que tengas las respuestas, juntá el contexto técnico. **Delegá las búsquedas pesadas a sub-agentes `Explore` en paralelo** (una sola tanda de llamadas):

1. **Sub-agente de esquema de BD:** pasale las entidades/tablas del paso 1. Devuelve campos, tipos, constraints, FKs y enums. Busca con `grep -n "### \`<tabla>\`" docs/esquema-bd-front.md` y lee solo esa sección. Si una tabla no existe en el esquema, marcá **"PENDIENTE DBA"**.

2. **Sub-agente de componentes:** pasale las piezas que probablemente necesite la pantalla. Lee `design-system/bandidossw/componentes.md` (el inventario) y hace `grep` sobre `src/components/**` para confirmar qué existe y con qué props.

3. **Sub-agente de contratos (si la pantalla toca una entidad ya contratada):** revisa `src/contracts/<entidad>.ts` y `docs/contratos/<entidad>.md`. Los campos y tipos del brief deben coincidir con el `Response` del contrato.

Si ya hay briefs del mismo módulo en `docs/briefs/`, leé el más parecido para mantener consistencia de patrones.

Esperá los resultados y usalos en el paso 4.

## Paso 4 — Generar el brief

Completá `docs/briefs/$ARGUMENTS.md` usando **`docs/briefs/_plantilla.md` como plantilla de contenido** (la estructura exacta de secciones). Generá un brief completo y bien formado:

```markdown
# HU-XXX: [Como <rol>, quiero <acción>, para <beneficio>]

> Generado con /brief. Revisar y ajustar antes de /disenar.

## Contexto

- **Ruta propuesta:** `/ruta-de-la-pantalla`
- **Relacionada con:** (si corresponde)
- **Prioridad:** alta / media / baja

## Propuesta inicial (del equipo)

[lo que el equipo te pasó como idea, resumido y organizado]

## Wireframe (idea)

[ASCII o descripción de las zonas. Basado en la propuesta + patrón de pantalla]

## User flow

1. ¿De dónde viene el usuario?
2. ¿Qué quiere hacer?
3. ¿A dónde llega?

## Fuente de datos (BD)

| Tabla | Campos usados | Relación clave |
|---|---|---|
| `nombre_tabla` | campo1, campo2, campo3 | FK → otra_tabla.id |

> Si falta una tabla en el esquema: "PENDIENTE DBA: falta tabla X para ..."

## Componentes sugeridos (reuso)

| Pieza | Acción | Nota |
|---|---|---|
| `NombreComponente` | Reusar/Extender | descripción |

## Datos hardcodeados

```ts
const datos = [
  { id: 1, campo: "valor" },
];
```

## Estados

- [ ] Vacío
- [ ] Cargando
- [ ] Error
- [ ] Con datos

## Criterios de aceptación

- [ ] ...
```

Reglas de los datos:
- Respetar tipos del esquema (varchar→string, numeric→number, date→ISO string, timestamp→ISO string).
- `id` siempre numérico (la PK).
- No inventar campos que no existan en la tabla (salvo marcar PENDIENTE DBA).
- Si la entidad tiene contrato en `src/contracts/`, los nombres de campo son los del `Response` (camelCase), no los de la base.
- En español.

## Paso 5 — Revisión con el usuario

1. Mostrá el brief generado (o un resumen si es largo).
2. Preguntá: "¿Querés ajustar algo antes de pasar a /disenar?"
3. Si pide cambios, aplicálos al `.md` y volvé a mostrar.
4. Recordale que el próximo paso es `/disenar HU-XXX`.

## Recordatorio de reglas

- **Este comando solo arma el brief.** NO codea, NO diseña, NO verifica, NO sube a GitHub.
- Solo preguntá lo que falta de verdad; no seas preguntón por defecto.
- El brief respeta el esquema (`docs/esquema-bd-front.md`) y sugiere componentes del inventario (`design-system/bandidossw/componentes.md`).
- UI en español.
