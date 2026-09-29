# HU-CAL-02: Como Personal de Mesa de Entrada, quiero ver el calendario de turnos en vistas Día, Semana y Mes, filtrar por profesor y materia, y actuar sobre un turno desde el propio calendario, para tener una visión global de la actividad por profesor o por materia y gestionar los turnos sin salir de la pantalla.

> Generado con /brief. **No codifica nada**: es el insumo de `/disenar HU-CAL-02`.
> Contrato ya escrito y tipado: [`src/contracts/calendario.ts`](../../src/contracts/calendario.ts) (secciones 2c, 3 y 4).
> ⚠️ Fuente de verdad del esquema: **`db/schema.sql`** (dump vigente). `docs/esquema-bd-front.md` está desactualizado (no trae `turno.cantidad_modificaciones`, `motivo_cancelacion_id`, `pagado`, etc.).

## Contexto

- **Ruta propuesta:** `/calendario` (extiende la pantalla existente de HU-CAL-01, no crea una nueva ruta)
- **Relacionada con:**
  - `HU-CAL-01` — grilla Semana/Día con filtro Profesor obligatorio. **Este brief lo amplía y le cambia dos reglas**: el filtro Profesor deja de ser obligatorio y se agrega la vista Mes.
  - `HU-TUR-02` — `/turnos`: de ahí vienen las acciones "Modificar" y "Cancelar turno" (`EditarTurnoModal`, `CancelarTurnoModal`).
  - `HU-TUR-01` — `/turnos/reservas`: clic en franja libre sigue prellenando la reserva.
- **Prioridad:** alta (1.0 en `docs/historias_de_usuario.md:103`)
- **Componente principal:** `src/components/calendario/CalendarioTurnos.tsx` (hoy: `type Vista = "semana" | "dia"`, `Zoom = 30 | 60`)
- **Deuda que este brief resuelve:**
  - `RUTA_MES = "/api/calendario/mes"` está declarada (`calendario.ts:30`) pero **no existe la ruta, ni el service, ni el mapper, ni la función de datos**.
  - `calendario.ts:15` afirma *"Actualización en tiempo real (30 s): implementada vía polling"* — **es falso: no hay polling en todo el repo** (ni SWR, ni react-query, ni `router.refresh`, ni `setInterval` de datos).
  - El filtro Profesor es obligatorio y la API `/api/calendario/agenda` **descarta** `materiaId`, `desde`, `hasta` y `verCancelados` aunque `agendaQuery` los declare (`src/app/api/calendario/agenda/route.ts:10-17`).
  - El detalle es un **modal** (`TurnoDetalleModal`), no un panel lateral.

## Propuesta inicial (del equipo)

1. Agregar la vista **Mes**; **Semana** sigue siendo la predeterminada.
2. Switch de vista **Día | Semana | Mes** en el margen izquierdo, **antes** del selector de profesores.
3. **Eliminar** los botones de zoom `30` / `60` (UI y la lógica que quede sin uso).
4. Filtros **combinables** y aplicables a las tres vistas: **Profesor** (con "Todos los profesores"), **Materia** (con "Todas las materias"), **Ver cancelados** y **Solo franjas con cupo disponible**.
5. Con más de un profesor visible, cada turno muestra el **apellido del profesor** y, en vista Día, los turnos se agrupan en **una columna por profesor**.
6. Vista Mes: cada día muestra **solo la cantidad de turnos**; clic en el día → vista Día.
7. Reglas de color estrictas: **rojo solo para Cancelado**, **verde solo para Disponible**, y la paleta por materia no puede usar rojos ni verdes.
8. Detalle del turno en **panel lateral derecho** (modo LECTURA) con 9 campos y botones "Modificar" / "Cancelar turno" habilitados según rol y estado.
9. Actualización automática sin recargar, demora máxima **30 s**.
10. PDF con encabezado "Nexo Académico" + logo, vista, filtros aplicados y período.

## Decisiones tomadas en el brief (respuestas del equipo)

| # | Tema | Decisión |
|---|---|---|
| 1 | Alcance de backend (vista Mes, rango `desde/hasta`, multi-profesor, polling) | **Pendiente en el back.** Se marca `PENDIENTE BACKEND` en cada punto. |
| 2 | Origen del color por materia | **Visual en el front.** Hash de `materia.id` sobre una paleta fija. **Sin cambios de BD** (la tabla `materia` no tiene columna de color y no se le agrega). |
| 3 | Detalle del turno | **Panel lateral derecho** con botón de cierre que libera el espacio de la grilla. Reemplaza al `TurnoDetalleModal`. |
| 4 | "Modificar" / "Cancelar turno" | **Navegan a `/turnos`.** No se abren los modales inline. El deep-link `?turnoId=&accion=` **no existe hoy** → `PENDIENTE BACKEND`. |
| 5 | "Solo franjas con cupo disponible" | Filtra **franjas de atención con cupo libre de un profesor**, no turnos. El cupo vive en **`profesor_materia.capacidad_maxima`** (única capacidad del esquema). |
| 6 | Desborde de franja | **4 turnos visibles como máximo**; si hay más, un botón que **expande la lista completa** de esa franja. |
| 7 | Vista Mes, días sin turnos | **Se muestran vacíos** (cuadrícula completa). Navegación `Hoy / ◀ / ▶` por mes, coherente con Día/Semana. |

## Wireframe (idea)

### Barra de controles (común a las tres vistas)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ▦  Calendario                                       [ 🖨 PDF ]               │
│    Turnos por profesor y materia                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│ [ Día | Semana* | Mes ]   Profesor [Todos los profesores ▾]  Materia [Todas ▾] │  ← 1 switch
│                                           ⊘ Ver cancelados   ⊘ Solo cupo      │
├──────────────────────────────────────────────────────────────────────────────┤
│ ▦ Octubre 2026 · 24 turnos                                  [Hoy] [◀] [▶]     │
└──────────────────────────────────────────────────────────────────────────────┘
   * Semana es la vista predeterminada.
   Switch de vista = <div role="group" aria-label="Vista del calendario"> con
   Button variant={activo ? "primary" : "outline"} (patrón ya vigente, NO hay
   componente Tabs en el design system).
   Switch de filtro = ui/Switch (h-11 w-11, ariaLabel obligatoria; el texto va al lado).
```

### Vista Semana (multi-profesor)

```
┌────────┬──────────┬──────────┬──────────┬──────────┬──────────┐
│        │ LUN 3    │ MAR 4    │ MIÉ 5    │ JUE 6    │ VIE 7    │  ← cabecera "hoy" bg-secondary
│ Hora   │          │          │          │          │          │
├────────┼──────────┼──────────┼──────────┼──────────┼──────────┤
│ 09:00  │ ┌──────┐ │          │ ┌──────┐ │          │ ┌──────┐ │
│        │ │Matem │ │          │ │Físic.│ │          │ │Matem │ │ ← borde-l-4 = color por MATERIA
│ 09:30  │ │Gómez,│ │          │ │Castro│ │          │ │Ruiz, │ │
│        │ │ L.    │ │          │ │       │ │          │ │ J.    │ │
│ 10:00  │ └──────┘ │ ┌──────┐ │ └──────┘ │          │ └──────┘ │
│        │          │ │Químic│ │          │ ┌──────┐ │          │
│        │          │ │Díaz, │ │          │ │Físic.│ │          │
│ 10:30  │          │ │ M.    │ │          │ │Soto, │ │          │
│        │          │ └──────┘ │          │ │ N.    │ │          │
├────────┼──────────┼──────────┼──────────┼──────────┼──────────┤
│        │ dotted   │ dotted   │ dotted   │ dotted   │ dotted   │ ← "Disponible"
│ 11:00  │ border-  │ border-  │ border-  │ border-  │ border-  │   (border-dashed
│        │ success  │ success  │ success  │ success  │ success  │    status-success/50)
├────────┴──────────┴──────────┴──────────┴──────────┴──────────┤
│ DESBORDE (misma franja, 4Clock)                        [+N Ver todos]
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  ┌────────┐
│ │Matem │Gómez││Físic│Castro││Matem │Ruiz││Químic │Díaz│  │+2 más →│
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘  └────────┘
└──────────────────────────────────────────────────────────────
  Contenido de la tarjeta, EN ORDEN:
   1. Materia (negrita)  2. Apellido del alumno  3. Apellido del profesor (solo si
   hay >1 profesor visible)   →   [ Estado Cancelado: card roja, solo con el switch on ]
```

### Vista Día (una columna por profesor)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ▦ Martes 4 de Octubre · 7 turnos                             [Hoy] [◀] [▶]    │
├───────────────────┬───────────────────┬───────────────────┬───────────────────┤
│ ⓐ Pérez, J.    3 │ ⓑ Castro, A.   2 │ ⓒ Soto, N.     2 │ ⓓ Profesores      │ ← contador por
├───────────────────┼───────────────────┼───────────────────┼───────────────────┤ │   profesor en el
│ 09:00 ┌────────┐  │ 09:00 ┌────────┐  │ 09:00 ┌────────┐  │ header (DESEABLE)  │ │   header (DESEABLE)
│       │Matem    │  │       │Física  │  │       │Matem   │  │                   │ │
│ 10:00 │ Gómez,L │  │ 10:00 │ Castro│  │ 10:00 │ Ruiz,J │  │                   │ │
│       └────────┘  │       └────────┘  │       └────────┘  │                   │ │
│ 11:00 dotted Disp │ 11:00 ┌────────┐  │ 11:00 dotted Disp │                   │
└───────────────────┴───────────────────┴───────────────────┴───────────────────┘
  Con 1 solo profesor visible → UNA columna, sin el apellido del profesor en la tarjeta.
```

### Vista Mes

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ▦ Octubre de 2026 · 128 turnos                                [Hoy] [◀] [▶]   │
├────────┬────────┬────────┬────────┬────────┬────────┬────────┐
│ Lun    │ Mar    │ Mié    │ Jue    │ Vie    │ Sáb    │ Dom    │
├────────┼────────┼────────┼────────┼────────┼────────┼────────┤
│        │        │  1     │  2     │  3     │  4     │  5     │  ← nº del día
│        │        │  ● 6   │  ● 4   │  ● 9   │  ● 5   │  ○     │     ● = tiene turnos
│        │        │        │        │        │        │        │     ○ = vacío, clickeable igual
│  6     │  7     │  8     │  9     │ 10     │ 11     │ 12     │
│  ● 7   │  ● 8   │  ● 3   │  ● 0   │  ● 11  │  ● 6   │  ○     │
├────────┼────────┼────────┼────────┼────────┼────────┼────────┤
│ 13     │ 14 •Hoy│ 15     │ 16     │ 17     │ 18     │ 19     │
│  ● 5   │  ● 9   │  ● 2   │  ● 7   │  ● 8   │  ● 0   │  ○     │
├────────┼────────┼────────┼────────┼────────┼────────┼────────┤
│ …      │        │        │        │        │        │        │
└────────┴────────┴────────┴────────┴────────┴────────┴────────┘
  Clic en cualquier celda (con o sin turnos) → cambia a vista Día con esa fecha.
  Días fuera del mes (relleno) se muestran atenuados y NO son clickeables.
```

### Panel lateral derecho — detalle del turno (modo LECTURA)

```
┌──────────────────────────────────────────┬─────────────────────────────┐
│                                          │ TUR-000123            [ ✕ ] │ ← botón de cierre
│              (grilla, se encoge)         │ ● Reservado                   │
│                                          ├─────────────────────────────┤
│                                          │ Código      TUR-000123       │
│                                          │ Estado      ● Reservado      │  Los 9 campos del
│                                          │ Modif.      1 vez            │  criterio, en grid
│                                          │ Alumno      Gómez, Lucía     │  sm:grid-cols-2
│                                          │ Materia     Matemática       │
│                                          │ Profesor    Pérez, Juan      │
│                                          │ Fecha       04/10/2026       │
│                                          │ Horario     09:00 – 10:00    │
│                                          │ Observac.   —                │
│                                          ├─────────────────────────────┤
│                                          │ [ Modificar ] [ Cancelar ]   │ ← solo Mesa/ Ger.
│                                          │  (o: "Tu calendario es de   │   Profesor: NO se
│                                          │   solo lectura." )           │   renderizan
└──────────────────────────────────────────┴─────────────────────────────┘
  Layout: xl:grid-cols-[min-width(0,1fr)_20rem] (patrón de app/turnos/reservas/page.tsx:606)
  En <xl el panel va debajo de la grilla (apilado), no overlay.
```

## User flow

1. **¿De dónde viene?**
   - Menú lateral → ítem "Calendario" (permisos: Gerente / Mesa de Entrada / Profesor).
   - De `/turnos/reservas` con `?profesorId=&fecha=` (vuelve de crear un turno, ver memoria #61).
   - De `/turnos` con "Ver en calendario" (`/calendario?profesorId=&fecha=`).
2. **¿Qué quiere hacer?**
   - Cambiar de vista (Día / Semana / Mes) y navegar en el tiempo.
   - Acotar la vista con **Profesor** + **Materia** + **Ver cancelados** + **Solo cupo** (combinables).
   - Leer el detalle de un turno y, si el rol y el estado lo habilitan, **modificarlo o cancelarlo**.
3. **¿A dónde llega?**
   - Clic en un turno → **panel lateral derecho** (LECTURA, cerrable).
   - "Modificar" / "Cancelar turno" → **`/turnos`** (deep-link pendiente de definir con back).
   - Clic en un día del mes → **vista Día** de esa fecha.
   - Clic en una franja libre → `/turnos/reservas?fecha=&hora=&profesorId=` (prellenado, HU-TUR-01).
   - "PDF" → `window.print()` con el encabezado de papel.

## Fuente de datos (BD)

Fuente de verdad: **`db/schema.sql`** (dump vigente, `npm run db:dump`).

| Tabla | Campos usados | Relación clave |
|---|---|---|
| `turno` | `id`, `codigo`, `alumno_id`, `profesor_id`, `materia_id`, `fecha`, `hora_inicio`, `hora_fin`, `estado` (`Reservado`\|`Cancelado`), `observaciones`, `cantidad_modificaciones`, `motivo_cancelacion_id`, `detalle_cancelacion`, `fecha_cancelacion`, `cancelacion_tardia`, `pagado` | FK → `alumno`, `profesor`, `materia`, `usuario`, `motivo_cancelacion` |
| `profesor` | `id`, `usuario_id`, `estado` | FK → `usuario(id)` UNIQUE (nombre/apellido salen del usuario) |
| `materia` | `id`, `nombre`, `nivel`, `duracion_clase_minutos` (30\|45\|60\|90\|120), `estado` | catálogo global |
| `alumno` | `id`, `legajo`, `nombre`, `apellido`, `estado` | — |
| `agenda` | `id`, `academia_id`, `nombre`, `estado` | 1 agenda por academia |
| `agenda_semanal` | `id`, `agenda_id`, `dia_semana` (**smallint CHECK 1..6 = lun..sáb**), `hora_inicio`, `hora_fin`, `estado` | FK → `agenda`. Franjas de atención del centro |
| `agenda_profesional` | `id`, `agenda_semanal_id`, `profesor_id`, `hora_inicio`, `hora_fin`, `estado` | FK → `agenda_semanal`, `profesor`. Bloques de disponibilidad |
| `profesor_materia` | `id`, `profesor_id`, `materia_id`, **`capacidad_maxima`** (`integer NOT NULL DEFAULT 1 CHECK > 0`) | **ÚNICA capacidad del esquema** — origen del filtro "cupo" |
| `motivo_cancelacion` | `id`, `nombre`, `requiere_detalle`, `estado` | FK desde `turno` |
| `vw_huecos_disponibles` | `agenda_profesional_id`, `profesor_id`, `fecha`, `hueco_inicio`, `hueco_fin` | vista; genera fechas desde hoy + 60 días |

### Restricciones del esquema que impactan el diseño

- **`agenda_semanal.dia_semana` es CHECK 1..6: el domingo no existe** en el horario de atención. La vista Mes muestra 7 columnas (lun–dom) y **el domingo queda siempre vacío**. `turno.fecha` no tiene restricción de día, así que un turno en domingo es legal en BD → la grilla debe tolerarlo.
- **`ex_turno_alumno_sin_superposicion`** excluye superposiciones **solo por `alumno_id`**, no por `profesor_id`: dos alumnos distintos **pueden** compartir franja con el mismo profesor. De ahí que el cupo sea por franja y que el desborde de franja sea un caso real, no hipotético.
- **`profesor_materia.capacidad_maxima`** es el cupo. En el front el rango 1..10 solo vive en el Zod (`contracts/profesor.ts`); el CHECK de BD es `> 0`.
- **No existe** ningún campo de cupo/capacidad en `turno`, `materia`, `agenda_profesional` ni `agenda_semanal`. Verificado con grep sobre el dump.

### PENDIENTE BACKEND (todo esto es del equipo de back)

| # | Pendiente | Contrato que ya lo declara | Nota |
|---|---|---|---|
| B1 | `GET /api/calendario/mes?anio&mes&profesorId&materiaId&verCancelados` → `{ anio, mes, dias: [{ fecha, cantidadTurnos }] }` | `RUTA_MES`, `calendarioMesQuery`, `CalendarioMesResponse`, `DiaResumenMesResponse` (`calendario.ts:30,85-93,156-166`) | Falta ruta, service, repo y mapper. `COUNT(*) GROUP BY fecha` sobre `turno`, con `idx_turno_fecha` |
| B2 | `GET /api/calendario/agenda` debe **honrar `materiaId`, `desde`, `hasta` y `verCancelados`** | `agendaQuery` ya los declara (`:66-78`) | Hoy la route los **descarta** (`api/calendario/agenda/route.ts:10-17`) |
| B3 | `agendaDelDia` debe admitir **ausencia de `profesorId`** (todos los profesores) | `agendaQuery.profesorId` es `.optional()` | Hoy tira `ValidationError("REFERENCIA_INVALIDA")` si falta. El front ya tiene el parche: `listarTurnosEnRango()` (`data/calendario.ts:142`) |
| B4 | `AgendaDiaResponse` debe emitir **`profesores[]`** y **`bloques[].profesorId`** | ya declarados (`calendario.ts:141,147`) | El mapper actual **no los emite**. Sin esto no hay columnas por profesor ni bloques en vista Día multi-profesor |
| B5 | `TurnoCalendarioResponse` debe emitir **`puedeModificar`, `puedeCancelar`, `cantidadModificaciones`, `pagado`, `cancelacionTardia`** | ya declarados (`calendario.ts:131-135`) | El `SELECT` del repo no trae esas columnas → **el front NO recalcula los flags**, usa los del back (`funciones/estado-turno.ts`). Sin esto los botones quedan deshabilitados siempre |
| B6 | Deep-link de `/turnos`: `?turnoId=&accion=modificar\|cancelar` | — | No existe. Hay que acordarlo con el equipo de back y `src/app/turnos/page.tsx` |
| B7 | Cupo por franja: `COUNT(turno) GROUP BY (profesor_id, fecha, hora_inicio)` vs `profesor_materia.capacidad_maxima` | — | No hay columna de apoyo. Filter server-side para no traer toda la agenda |
| B8 | Empuje/polling: si se quiere < 30 s de latencia real, hace falta un canal (SSE/WebSocket). Con polling, 30 s es el piso del cliente | — | Decisión de arquitectura de back |

> Mientras B1–B5 no estén, la vista Mes y el multi-profesor **no tienen datos reales**. El front las construye contra los tipos del contrato con mocks de diseño, y así se lo marca en pantalla o en el código.

## Reglas de color y estados

- **Rojo (`error` #ef4444) → EXCLUSIVO de `estado === "Cancelado"`.** Se ocultan por defecto; aparecen solo con "Ver cancelados" activo.
- **Verde (`status-success` #22c55e) → EXCLUSIVO de "Disponible"** (celda con borde punteado `border-dashed border-status-success/50 bg-status-success/10`).
- La paleta por materia **no puede usar rojos ni verdes**.

### Paleta por materia (front, determinística)

`tonoMateriaDe(id)` = `PALETA[(id - 1) % PALETA.length]` — mismo molde que `tonoAvatarDe` (`src/funciones/formato.ts:55-64`). Consistente en toda la app porque es una función pura sobre el id.

| Índice | Hex | Familia | Token de apoyo |
|---|---|---|---|
| 0 | `#2f6fed` | Azul Conexión | `--color-primary` |
| 1 | `#1d4ed8` | Azul Foco | `--color-secondary` |
| 2 | `#4338ca` | Índigo | — |
| 3 | `#5b21b6` | Violeta profundo | — |
| 4 | `#7c3aed` | Violeta | — |
| 5 | `#0369a1` | Azul cielo profundo | — |
| 6 | `#0e7490` | Cian profundo | — |
| 7 | `#b45309` | Ámbar oscuro | `--color-status-warning` (como borde, **nunca como texto**) |

Reglas de aplicación (para cumplir la regla 13 de `docs/errores-comunes.md`):

- El color de la materia va en el **borde izquierdo de 4 px** (`border-l-4`) y en un **fondo muy tenue** (`/{opacity} 5–10`).
- **El texto siempre en `text-on-surface`.** El hex de la paleta nunca se usa como color de texto sobre fondo claro (no llega a 4.5:1).
- `Cancelado` **ignora** el color de la materia: borde `border-l-error`, fondo `bg-error/5`, y badge `TurnoCalendarioBadge` en `danger`.
- El hex crudo de la paleta se usa solo en la **vista Mes** (mini-chip de conteo) y en la **impresión**; el resto, vía `border-l-[color]` / `bg-[color]/10`.
- Nota: la paleta **excluye** `--color-error`, `--color-status-danger`, `--color-status-pink` (magenta, se confunde con rojo) y `--color-status-success` / `--color-tertiary` (turquesa, se confunde con verde). Por eso los tonos 2–7 son hex literales y no tokens.

## Componentes sugeridos (reuso)

> Inventario verificado en `design-system/bandidossw/componentes.md` + `src/components/ui/**`. **No existen** `Tabs`, `Sheet`, `Card`, `Table`, `Badge`, `Skeleton` ni `EmptyState` genéricos: se arman inline con los patrones del design system.

| Pieza | Acción | Nota |
|---|---|---|
| `CalendarioTurnos.tsx` | **Extender** | `Vista` pasa a `"dia" \| "semana" \| "mes"`; se saca el `Zoom`; se agrega estado de filtros, panel lateral y polling |
| `ui/Switch` | **Reusar** | Props `{ checked, onChange, disabled?, ariaLabel }`. `ariaLabel` es **obligatoria** y el texto va **al lado** (no tiene prop `label`). `h-11 w-11` → touch target OK |
| `ui/Select` | **Reusar** | Para Profesor y Materia. `wrapperClassName` es **obligatorio** para dimensionar en flex (`min-w-0 flex-1`). El hint va **fuera** del Select (evita desalineación con `items-end`) |
| `ui/Combobox` | Reusar (opcional) | Solo si el catálogo de materias crece; acepta `tone` por opción, útil para previsualizar el color |
| `ui/Button` | **Reusar** | Switch de vista Día/Semana/Mes y navegación `Hoy / ◀ / ▶` en `<div role="group" aria-label="…">` con `variant={activo ? "primary" : "outline"}`. **Ojo**: `primary` = Azul Conexión, `secondary` = Azul Foco |
| `ui/StatusBadge` | Reusar | Estado del turno. Texto siempre `text-on-surface`, color en el punto/ícono |
| `TurnoCalendarioBadge` | **Extender** | Agregar el color de materia al punto, sin perder la semántica de estado |
| `TurnoDetalleModal` | **Reemplazar** por panel lateral | Pass-through de `Modal` con `backdrop blur`; hay que escribir el panel nuevo |
| **Panel lateral de detalle** | **Crear** | Layout `xl:grid-cols-[minmax(0,1fr)_20rem]` (patrón de `app/turnos/reservas/page.tsx:606`), apilado bajo `xl`. Botón `close` (Material Symbols) que libera el espacio |
| `ContadorModificaciones` (`turnos/`) | Reusar | Campo "cantidad de modificaciones" del panel |
| `FranjasHorarias` (`turnos/`) | Reusar | Campo horario del panel |
| `ui/Icon` | Reusar | Solo Material Symbols. **Nunca `lucide-react`** |
| Iconos: `calendar_month`, `view_week`, `view_agenda`, `chevron_left`, `chevron_right`, `today`, `download`, `lock`, `add_circle`, `event_busy`, `close`, `expand_more`, `expand_less`, `event_available` | — | |
| Estado vacío / error | **Inline** | Patrón existente en `CalendarioTurnos.tsx:443-453`: `border-dashed border-outline-variant bg-surface-container-lowest px-6 py-16 text-center` + `Icon size={40}` + botón Reintentar |
| Cargando | **Inline** | Patrón existente: `opacity-60` sobre la grilla + `<p role="status" aria-live="polite" className="sr-only">`. **Sin skeleton** (decisión de `design-system/bandidossw/pages/calendario.md:20`) |
| PDF | **Reusar** | `window.print()` + `print:hidden` en todo lo interactivo + `<header className="hidden print:block">`. Reglas en `globals.css:185-204`. **Cero dependencias nuevas** |

### Capa de datos — funciones a agregar en `src/data/calendario.ts`

Todas `async`, con tipos del contrato y `// BACKEND:` con la llamada real. **La pantalla nunca ve el array.**

```ts
// BACKEND: GET /api/calendario/mes?anio=&mes=&profesorId=&materiaId=&verCancelados=
export async function verResumenMes(params: CalendarioMesQuery): Promise<CalendarioMesResponse>;

// Materias activas para el filtro. BACKEND: GET /api/materias?estado=activo (MateriaOpcion)
// BACKEND: NO existe endpoint que devuelva la paleta → el color es 100% front.
export async function listarMateriasActivas(): Promise<MateriaOpcion[]>;

// Semana en UNA llamada (reemplaza las 6 de verAgendaSemana). BLOCKED por B2.
export async function verAgendaRango(params: AgendaQuery): Promise<AgendaDiaResponse[]>;
```

Helpers de mes nuevos (`aISO`, `lunesDe`, `sumarDias` ya existen): `primerDiaDelMes(anio, mes)`, `ultimoDiaDelMes(anio, mes)`, `formatearMes(anio, mes)` → `"Octubre de 2026"`, `sumarMeses(anio, mes, delta)`.
**Regla de reuso:** estos helpers existen **duplicados** entre `CalendarioTurnos.tsx:47-114` y `data/calendario.ts:30-49`. `/disenar` debe **extraerlos a `src/funciones/formato.ts`** antes de agregar los de mes, no triplicar la lógica.

### Actualización automática (30 s)

`apiGet` ya usa `fetch(url, { cache: "no-store" })`, así que un polling simple funciona.

- Implementación mínima, **sin dependencia nueva**: `setInterval(() => recargar(), 30_000)` en `CalendarioTurnos`, disparando el mismo `traer` que ya existe, con `useEffect(() => { const t = setInterval(...); return () => clearInterval(t); }, [...])`.
- Regla 1 de `docs/errores-comunes.md`: nunca leer `useRef().current` en render; el id del intervalo se guarda en variable local del efecto.
- Regla 6: el estado de "cargando" por polling **no** debe vaciar la grilla (evita parpadeo); solo el primer load y el reintento manual muestran el estado cargando.
- **Costo a tener en cuenta:** hoy `verAgendaSemana` son **6 requests** → con polling son 36 requests/min. Por eso B1/B2 (endpoint de mes y rango semanal) son **prerrequisito**, no un extra.
- Limpieza del intervalo al desmontar y al cambiar de vista/filtros.

## Datos de ejemplo

> `src/data/calendario.ts` **ya consume la API real** (no hay fixture, migrado como `materias`). Estos ejemplos existen para **diseñar y validar el render contra el contrato**, no para quedar en el repo. Los types van textuales para que `/disenar` los respete.

```ts
// GET /api/profesores?estado=activo  →  GET /api/calendario/agenda?profesorId=&fecha=
const PROFESORES: ProfesorCalendario[] = [
  { id: 1, usuarioId: 1, nombre: "Juan",    apellido: "Pérez",   estado: "activo" },
  { id: 2, usuarioId: 2, nombre: "Ana",     apellido: "Castro",  estado: "activo" },
  { id: 3, usuarioId: 3, nombre: "Nora",    apellido: "Soto",    estado: "activo" },
  { id: 4, usuarioId: 4, nombre: "Lucía",   apellido: "Rodríguez",estado: "activo" },
];

// GET /api/materias?estado=activo  →  MateriaOpcion[]
const MATERIAS: MateriaOpcion[] = [
  { id: 1, nombre: "Matemática",  nivel: "Secundario",  duracionClaseMinutos: 60 },
  { id: 2, nombre: "Física",      nivel: "Secundario",  duracionClaseMinutos: 60 },
  { id: 3, nombre: "Química",     nivel: "Secundario",  duracionClaseMinutos: 90 },
  { id: 4, nombre: "Lengua",      nivel: "Primario",    duracionClaseMinutos: 45 },
  { id: 5, nombre: "Biología",    nivel: "Secundario",  duracionClaseMinutos: 60 },
];

// GET /api/calendario/agenda  →  AgendaDiaResponse  (bloques + turnos + huecos)
const AGENDA: AgendaDiaResponse = {
  profesor: { id: 1, nombre: "Juan", apellido: "Pérez" },
  profesores: [                                  // B4: hoy el mapper NO lo emite
    { id: 1, nombre: "Juan",  apellido: "Pérez" },
    { id: 2, nombre: "Ana",   apellido: "Castro" },
    { id: 3, nombre: "Nora",  apellido: "Soto" },
  ],
  fecha: "2026-10-04",
  bloques: [                                     // B4: falta profesorId en el mapper
    { profesorId: 1, horaInicio: "09:00", horaFin: "13:00" },
    { profesorId: 2, horaInicio: "09:00", horaFin: "13:00" },
  ],
  turnos: [
    {
      id: 123,
      codigo: "TUR-000123",                      // nullable en BD; el mapper fabrica TUR-{id:0>6}
      alumno:   { id: 10, nombre: "Lucía",   apellido: "Gómez" },
      profesor: { id: 1,  nombre: "Juan",    apellido: "Pérez" },
      materia:  { id: 1,  nombre: "Matemática" },
      horaInicio: "09:00",
      horaFin: "10:00",                          // 60' = duracion_clase_minutos
      estado: "Reservado",
      puedeModificar: true,                       // B5: el mapper NO lo emite hoy
      puedeCancelar: true,
      cantidadModificaciones: 1,                  // smallint NOT NULL DEFAULT 0, CHECK >= 0
      cancelacionTardia: false,
      pagado: false,
    },
    {
      id: 124,
      codigo: "TUR-000124",
      alumno:   { id: 11, nombre: "Mateo",   apellido: "Ruiz" },
      profesor: { id: 2,  nombre: "Ana",     apellido: "Castro" },
      materia:  { id: 2,  nombre: "Física" },
      horaInicio: "09:00",
      horaFin: "10:00",
      estado: "Cancelado",                        // solo visible con "Ver cancelados" activo
      puedeModificar: false,
      puedeCancelar: false,
      cantidadModificaciones: 0,
      cancelacionTardia: true,
      pagado: false,
    },
  ],
  huecos: [
    {
      agendaProfesionalId: 501,
      profesor: { id: 1, nombre: "Juan", apellido: "Pérez" },
      fecha: "2026-10-04",
      horaInicio: "10:00",
      horaFin: "11:00",
      duracionMinutos: 60,
    },
  ],
};

// GET /api/calendario/mes?anio=2026&mes=10  →  CalendarioMesResponse
// Solo los días CON turnos; el front rellena los vacíos con 0.
const MES: CalendarioMesResponse = {
  anio: 2026,
  mes: 10,
  dias: [
    { fecha: "2026-10-01", cantidadTurnos: 6 },
    { fecha: "2026-10-02", cantidadTurnos: 4 },
    { fecha: "2026-10-05", cantidadTurnos: 9 },
    { fecha: "2026-10-06", cantidadTurnos: 0 },
  ],
};
```

**Caso de desborde de franja** (para el wireframe): mismo `profesor_id` + misma `hora_inicio` con **distintos alumnos/materias**, 6 turnos → se muestran **4** + botón `+2 más` que expande los 6.

## Estados

- [ ] **Vacío** — sin filtros y sin turnos en el período → mensaje + ícono, sin críptico técnico.
- [ ] **Vacío por filtro** — hay turnos pero el filtro actual no matchea ninguno → mensaje distinto: "No hay turnos para los filtros seleccionados" + acción para limpiar filtros.
- [ ] **Sin rango de atención** — el día cae fuera de `agenda_semanal` (p. ej. domingo) → celda atenuada, sin huecos.
- [ ] **Cargando** (primer load / cambio de filtro / navegación) — `opacity-60` sobre la grilla + `aria-live`.
- [ ] **Actualizando (polling)** — refresh silencioso: la grilla **no** se vacía ni parpadea. Indicador discreto de "actualizado hace N s".
- [ ] **Error** — mensaje + botón Reintentar (patrón `AgendaSemanal`). Diferenciar `ACCESO_DENEGADO` (403: el Profesor pidió otro calendario) de un fallo de red.
- [ ] **Parcial** — la vista Mes cargó pero el día clickeado falla → mensaje en el panel, no pantalla completa.
- [ ] **Con datos** — las tres vistas.

## Criterios de aceptación

### Obligatorios

- [ ] Switch **Día / Semana / Mes** en el margen izquierdo, **antes** del selector de profesores. **Semana** predeterminada.
- [ ] **No existen** los botones de zoom 30 / 60 (ni UI ni lógica huérfana).
- [ ] Filtro **Profesor**: combo con activos + opción **"Todos los profesores"**. **Ya no es obligatorio**: sin selección muestra los turnos de todos los profesores.
- [ ] Filtro **Materia**: combo con activas + **"Todas las materias"** por defecto.
- [ ] Los cuatro filtros son **combinables** y se aplican a **las tres vistas**.
- [ ] **Cancelados ocultos por defecto**; visibles al activar "Ver cancelados". **Rojo solo para cancelados**.
- [ ] **Verde solo para "Disponible"**. La paleta por materia no usa rojos ni verdes.
- [ ] Filtro **"Solo franjas con cupo disponible"** operativo (cupo = `profesor_materia.capacidad_maxima`).
- [ ] **Vista Semana**: cada turno dentro de su día y rango horario. Contenido en orden: **Materia (negrita)**, **apellido del alumno**, y **apellido del profesor** solo si hay más de uno visible. Color por materia consistente.
- [ ] **Vista Día**: **una columna por profesor** cuando hay más de uno visible; con uno solo, una columna y sin apellido de profesor en la tarjeta.
- [ ] **Vista Mes**: grilla de calendario clásico; cada día muestra **solo la cantidad de turnos**; los días sin turnos se muestran **vacíos**. Clic en un día → **vista Día** de esa fecha. Navegación `Hoy / ◀ / ▶` por mes.
- [ ] **Panel lateral derecho** (modo LECTURA) con los **9 campos**: código, estado, cantidad de modificaciones, alumno, materia, profesor, fecha, horario, observaciones. Con **botón de cierre** que libera el espacio.
- [ ] Botones **"Modificar"** y **"Cancelar turno"** navegan a `/turnos`, **habilitados solo si el rol y el estado del turno lo permiten**.
- [ ] El rol **Profesor no ve botones de edición**; selector de profesor **fijo/oculto**; solo ve **su** calendario.
- [ ] **Actualización automática sin recargar la página**, demora máxima **30 s**, al reservar/modificar/cancelar cualquier usuario.
- [ ] **PDF** funcional: encabezado con **"Nexo Académico"** + **logo**, vista, filtros aplicados y período; sin texto cortado ni superposiciones; grilla alineada.

### Deseables (solo si los obligatorios quedaron completos)

- [ ] **Reprogramar arrastrando y soltando** en otra franja libre.
- [ ] **Contador de turnos por profesor** en el header de cada columna (vista Día).
- [ ] **Desborde de franja**: **4 turnos visibles** como máximo + botón `+N más` que **expande la lista completa**.

## PENDIENTE BACKEND (resumen operativo para el equipo de back)

```
B1  GET /api/calendario/mes            → ruta + service + repo + mapper (contrato YA declarado)
B2  agenda acepta materiaId / desde / hasta / verCancelados   (los descarta hoy)
B3  agenda sin profesorId = todos los profesores (hoy tira 422)
B4  emitir AgendaDiaResponse.profesores[] y bloques[].profesorId (declarados, no emitidos)
B5  emitir puedeModificar / puedeCancelar / cantidadModificaciones / pagado / cancelacionTardia
B6  deep-link /turnos?turnoId=&accion=modificar|cancelar
B7  cupo por franja contra profesor_materia.capacidad_maxima
B8  canal de empuje si se quiere bajar de 30 s (polling = piso del cliente)
```

**Verificado en:** `db/schema.sql`, `src/contracts/{calendario,disponibilidad,materia,turno,profesor,agenda}.ts`, `src/data/calendario.ts`, `src/app/api/calendario/agenda/route.ts`, `src/modules/calendario/*`, `src/components/calendario/*`, `src/components/ui/*`, `src/app/globals.css`, `src/funciones/{formato,estado-turno,permisos}.ts`, `design-system/bandidossw/{MASTER,componentes}.md`, `docs/errores-comunes.md`, `docs/capa-de-datos-front.md`.

**Siguiente paso:** `/disenar HU-CAL-02`
