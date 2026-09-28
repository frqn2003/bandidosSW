# HU-TUR-02: Como Personal de Mesa de Entrada, quiero listar, modificar y cancelar turnos del centro para gestionar cambios de fecha, horario o profesor y liberar el cupo cuando un turno deba ser cancelado, manteniendo el historial de la reserva.

> Generado con /brief. Revisar y ajustar antes de /disenar.

## Contexto

- **Ruta propuesta:** `/turnos` (pantalla nueva, principal del módulo)
- **Relacionada con:** HU-TUR-01 (`/turnos/reservas`, la pantalla de reserva existente), HU-CAL-01 (`/calendario`, de donde se traslada la tabla), HU-PAG-01 (los turnos cancelados antes de la clase son parte de la cobranza).
- **Prioridad:** alta
- **Roles:** Gerente y Mesa de Entrada. El rol Profesor **no** entra: su módulo `turnos` no está en `PERMISOS_POR_ROL` (ver `src/funciones/permisos.ts`).

### Qué cambia en el resto del sistema

| Cambio | Dónde | Nota |
|---|---|---|
| El ítem "Turnos y Agenda" del sidebar pasa a apuntar a `/turnos` | `src/funciones/permisos.ts` → `MODULOS` | El orden en el array se mantiene: `inicioDe(rol)` sigue devolviendo Calendario como primer módulo construido. No hay que tocarlo. |
| `/turnos/reservas` sigue existiendo | — | Deja de ser la entrada del módulo; queda como destino del botón "Reservar turno". |
| `moduloDeRuta("/turnos/reservas")` sigue funcionando | `src/funciones/permisos.ts` | Hace `pathname.startsWith(m.href)` y `"/turnos/reservas".startsWith("/turnos")` es `true`. El guard de permisos no se rompe. |
| Se saca la tabla "todos los profesores" | `src/components/calendario/CalendarioTurnos.tsx` (líneas ~516-581) | `/calendario` sigue vivo, pero la selección `profesorId === "todos"` deja de existir: esa vista ahora es `/turnos`. |

---

## Registro de decisiones

Estas 11 decisiones se tomaron antes de generar el brief. Son la base del diseño.

| # | Cuestión | Decisión |
|---|---|---|
| 1 | El enum `estado_turno` es `('Reservado','Cancelado')`. "Finalizado" no existe en la base, en el contrato ni en la HU original. | **El front lo deriva**: `estado === "Reservado" && fecha + horaInicio <= hoyAR()` → se muestra como *Finalizado*. No se pide `ALTER TYPE` al back. |
| 2 | El contrato trae `cantidadModificaciones` pero no el tope. | **Leemos `GET /api/parametros` al montar la pantalla** y leemos `max_modificaciones_turno`. Mientras tanto se hardcodea `2` con el `// BACKEND:` pidiendo el fetch. |
| 3 | Ruta de la pantalla nueva | **`/turnos`**. `/turnos/reservas` queda como pantalla de reserva. Sidebar apunta a `/turnos`. |
| 4 | Botón "Reservar turno" | **Navega a `/turnos/reservas`**, no abre modal embebido. |
| 5 | Filtro de fechas | **Rango `desde`/`hasta`** con barra visual y dos puntitos arrastrables. Sin segmentos rápidos (Hoy/Semana/Mes). |
| 6 | Filtro de estado | **Selección única** (uno a la vez, o "Todos"). |
| 7 | Los 6 criterios opcionales de la HU | **Todos afuera** por ahora. |
| 8 | Prioridad | **Alta.** |
| 9 | Vista "Antes → Después" | **Comparación en vivo** en un recuadro chico a la derecha del formulario de edición, **+ resumen dentro del modal de confirmación** al guardar. No los dos modales uno al lado del otro. |
| 10 | Calendario | **Sigue existiendo.** Se le saca la tabla de "profesor: todos". |
| 11 | Filtro "Finalizado" (consecuencia de 1 + 6) | **Auto-acota el rango a hoy** si el rango está vacío, y el filtro derivado se resuelve 100% en el front. |

**Regla que gobierna 6, 10 y 11:** rango abierto nunca pega contra el back; rango acotado siempre. "Reservado" y "Cancelado" se delegan al servidor (`estado=` o `verCancelados=`). "Finalizado" se resuelve en el front, siempre dentro de un rango acotado.

**Consecuencia de 1 que hay que tener presente:** el `trigger` `fn_turno_validar_modificacion` de la base rechaza con `OLD.estado <> 'Reservado'`, así que un turno "Finalizado" para el front es un `Reservado` vencido para la base. Derivarlo no cambia una sola fila: solo cambia qué badge se pinta. El historial queda intacto.

---

## Propuesta inicial (del equipo)

Trasladar a `Turnos` la tabla que hoy aparece en Calendario cuando se selecciona *Profesor: todos*, y convertirla en la pantalla principal del módulo. Sobre esa tabla:

- Botón **"Reservar turno"** arriba a la derecha, que lleva a la pantalla de reserva existente.
- **Buscador** arriba, por código de turno o nombre, apellido o DNI del alumno (texto libre, coincidencia parcial).
- A la derecha del buscador, **filtro de estado** (Reservado / Cancelado / Finalizado) y **rango de fechas**.
- Por defecto muestra **los turnos de hoy**.
- Columnas en este orden: **Código · Alumno · Materia · Profesor · Fecha y hora · Estado · Modif. · Acciones**.
- Fecha y hora en un solo formato corto: `Lun 28/09 · 15:00`.
- Columna **Modif.** muestra el contador como `1/2` o `2/2`.
- Al **modificar**: formulario precargado (reusando el de la reserva), campo de observaciones, barra de progreso de modificaciones con el texto `Modificaciones: 1 de 2 permitidas` y la leyenda *"el horario original se libera recién al confirmar"*. A la derecha, un recuadro con **los datos antiguos** que se actualiza mientras se edita.
- Dentro del flujo de edición, un botón **"Cancelar turno"** que abre un modal con motivo + detalle (200 caracteres).
- Caso del **máximo de modificaciones alcanzado**: hay que definir qué pasa con el turno y cómo se lo muestra.
- Ícono de cancelar en la fila: la HU pide un ícono representativo o la palabra "Cancelar". **Se usa el menú de acciones** (ver tabla de componentes) en lugar de íconos sueltos.

---

## Wireframe (idea)

### `/turnos` — listado

```
┌──────────────────────────────────────────────────────────────────────┐
│ Turnos                                    ┌───────────────────────┐ │
│ Gestioná los turnos del centro            │ + Reservar turno      │ │
│                                           └───────────────────────┘ │
├──────────────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────┐  ┌──────────────┐                  │
│ │ 🔍 Código, nombre, apellido o  │  │ Estado: ▾    │  (selección única)
│ │    DNI                        │  └──────────────┘                  │
│ └────────────────────────────────┘                                   │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │ Lun 21/09 ●━━━━━━━━━━━━━━━● Dom 27/09        [21/09] – [27/09]  │ │
│ │         ▲                                            ▲          │ │
│ │      desde                                        hasta         │ │
│ └──────────────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────────────┤
│ Código    Alumno          Materia      Profesor     Fecha y hora      │
│ TUR-0001  García, Lucía   Matemática   Ruiz, Ana    Lun 28/09·15:00 │
│ TUR-0002  Sosa, Mateo     Física       Díaz, Pablo  Lun 28/09·17:00 │
│ TUR-0003  López, Sofía    Inglés       Ruiz, Ana    Mar 29/09·10:00 │
│ TUR-0004  Núñez, Juan     Química      Díaz, Pablo  Mar 29/09·12:00 │
│           Estado    Modif.            Acciones                      │
│           Reservado 1/2               [⋯] Ver · Modificar · Cancelar│
│           Finalizado 2/2               (deshabilitado = gris + motivo)
│           Cancelado —                                           │
│                                                                      │
│ Mostrando 1-10 de 24 turnos        [10 ▾]  ‹ 1 2 3 ›                │
└──────────────────────────────────────────────────────────────────────┘
```

### Modo EDICIÓN (paso 1) — reusa la pantalla de reserva

```
┌──────────────────────────────────────────────────────────────────────┐
│ Modificar turno TUR-0001                              [ ✕ Cerrar ]   │
├────────────────────────────────────────┬─────────────────────────────┤
│ Alumno                                  │  ┌───────────────────────┐  │
│  García, Lucía · Leg. 1042 · 38112345 │  │ DATOS ANTERIORES      │  │
│  (solo lectura, gris)                  │  │                       │  │
│                                        │  │ Profesor  Ruiz, Ana   │  │
│ Materia                                │  │         ↓             │  │
│  Matemática (solo lectura, gris)      │  │         Ruiz, Diego   │  │
│                                        │  │ Fecha    Mar 29/09    │  │
│ Profesor  [ Ruiz, Ana        ▾ ]       │  │         ↓             │  │
│          (combo filtrado por materia)  │  │         Mar 28/09    │  │
│                                        │  │ Hora     15:00        │  │
│ Fecha    [ 28/09/2026   📅 ]           │  │         ↓             │  │
│                                        │  │         17:00        │  │
│ Horario  ┌──────┐┌──────┐              │  │                       │  │
│          │15:00 ││17:00 │ ← franjas    │  │ (se actualiza solo    │  │
│          └──────┘└──────┘  disponibles │  │  con lo que cambia)  │  │
│                                        │  └───────────────────────┘  │
│ Observaciones  [                    ]  │                             │
│                  (250 caracteres)     │                             │
│                                        │                             │
│ ┌────────────────────────────────────┐ │                             │
│ │ Modificaciones  ●─●─○  1 de 2      │ │                             │
│ └────────────────────────────────────┘ │                             │
│ ℹ El horario original se libera recién  │                             │
│   al confirmar.                         │                             │
├────────────────────────────────────────┴─────────────────────────────┤
│ [ Cancelar turno ]                    [ Descartar ] [ Continuar → ] │
└──────────────────────────────────────────────────────────────────────┘
```

### Cancelación (desde la tabla o desde el modo edición)

```
┌──────────────────────────────────────────────┐
│ ⚠  Cancelar turno                            │
│                                               │
│  TUR-0001 · García, Lucía                    │
│  Matemática · Lun 28/09 · 15:00               │
│                                               │
│  Motivo  *                                    │
│  [ Ausencia del profesor                ▾ ]  │
│                                               │
│  Detalle del motivo                           │
│  [ No aplica para este motivo          ]      │
│  (0/200 · solo obligatorio si el motivo      │
│   es "Otro")                                  │
│                                               │
├──────────────────────────────────────────────┤
│ [ Cancelar ]                    [ Confirmar ] │  ← confirmar en rojo
└──────────────────────────────────────────────┘
```

### Caso borde: máximo de modificaciones alcanzado

La fila muestra el ícono de modificar **deshabilitado en gris** y un badge rojo `2/2` en la columna Modif. El tooltip del ícono dice: *"Este turno ya alcanzó el máximo de 2 modificaciones. Cancelá el turno y reservá uno nuevo."* El mismo texto aparece en el paso 1 del formulario si se llega por otra vía. El turno **no se bloquea ni se oculta**: sigue siendo un turno reservado, válido y cobrable.

---

## User flow

1. **¿De dónde viene?** Del sidebar ("Turnos y Agenda"), de `/calendario`, o escribiendo `/turnos`. Roles Gerente y Mesa de Entrada.
2. **¿Qué quiere hacer?**
   - Localizar un turno puntual → escribir en el buscador (código, nombre, apellido o DNI).
   - Ver qué hay para un período → mover la barra de rango.
   - Ver solo un tipo de turno → elegir estado.
   - Corregir un cambio de horario/profesor → "Modificar" en la fila.
   - Liberar un cupo → "Cancelar" en la fila, o el botón "Cancelar turno" dentro del modo edición.
   - Cargar un turno nuevo → botón "Reservar turno" → `/turnos/reservas`.
3. **¿A dónde quiere llegar?**
   - Modificar: paso 1 (formulario + recuadro "Datos anteriores") → paso 2 (modal de confirmación Antes → Después) → de vuelta a la tabla con el turno actualizado y un toast.
   - Cancelar: modal de motivo + detalle → de vuelta a la tabla con el turno en rojo y un toast.
   - Reservar: a `/turnos/reservas` (pantalla existente, sin cambios).

---

## Fuente de datos (BD)

> Fuente autoritativa: **`db/schema.sql`** (dump de 2521 líneas). Ojo: **`docs/esquema-bd-front.md` documenta solo la Iteración 1** y le faltan columnas de `turno` (`cantidad_modificaciones`, `motivo_cancelacion_id`, `pagado`, `cancelacion_tardia`) y 4 tablas que sí existen. Para esta HU, leer el `schema.sql`.

| Tabla | Campos usados | Relación clave |
|---|---|---|
| `turno` | `id`, `codigo`, `alumno_id`, `profesor_id`, `materia_id`, `fecha`, `hora_inicio`, `hora_fin`, `valor_clase_congelado`, `estado`, `observaciones`, `cantidad_modificaciones`, `motivo_cancelacion_id`, `detalle_cancelacion`, `fecha_cancelacion`, `cancelacion_tardia`, `pagado` | PK. FKs → `alumno`, `profesor`, `materia`, `usuario`, `motivo_cancelacion` |
| `alumno` | `id`, `legajo`, `nombre`, `apellido`, `dni` | FK desde `turno.alumno_id` |
| `profesor` | `id`, `usuario_id`, `telefono`, `estado` | FK desde `turno.profesor_id`; `usuario_id` UNIQUE → `usuario.id` |
| `materia` | `id`, `nombre`, `nivel`, `duracion_clase_minutos` | FK desde `turno.materia_id` |
| `profesor_materia` | `profesor_id`, `materia_id`, `capacidad_maxima` (default 1) | UNIQUE `(profesor_id, materia_id)`. Alimenta el combo de profesor filtrado por materia y los cupos. |
| `motivo_cancelacion` | `id`, `nombre`, `requiere_detalle`, `estado` | FK desde `turno.motivo_cancelacion_id`. `GET /api/motivos-cancelacion` |
| `parametro` | `clave`, `valor` | UNIQUE `clave`. `max_modificaciones_turno` = 2. `GET /api/parametros` |
| `agenda_profesional` | `profesor_id`, `hora_inicio`, `hora_fin`, `estado` | Availability del profesor. Valida que el nuevo horario caiga en franja. |
| `usuario` | `id`, `nombre`, `apellido` | `turno.usuario_id`: quién registró el turno. Lo pone el back desde la sesión. |

### PENDIENTE DBA

1. **`estado_turno` no tiene `'Finalizado'`** (schema.sql:18). Decisión 1: el front lo deriva, no se pide `ALTER TYPE`. Si algún día se agrega el valor, hay que revisar además `ck_turno_cancelacion` (hoy `NOT VALID`), `ex_turno_alumno_sin_superposicion` (filtra `WHERE estado = 'Reservado'`) y `fn_turno_validar_modificacion` (rechaza `OLD.estado <> 'Reservado'`).
2. **El seed de `parametro` no está en el repo.** `schema.sql` es DDL puro, sin `INSERT`. `fn_parametro` (schema.sql:805) **no tiene default**: si `max_modificaciones_turno` no está sembrado, *toda* modificación de turno revienta con `'El parámetro "%" no está configurado.'`. Verificar en la DB viva.
3. **`turno.codigo` es `varchar(20)` nullable, sin expresión `GENERATED` y sin índice único** en el dump — pese a que `docs/esquema-bd-front.md` afirma `'TUR-' || lpad(id,6,'0')`. Nueve triggers usan `OLD.codigo` en sus mensajes, así que un `codigo` NULL devuelve *"El turno <NULL> alcanzó el máximo…"*. Confirmar si la generación vive en la DB real y no llegó al dump.
4. **Límite de rango en `GET /api/turnos`:** `listarTurnosQuery` valida el formato de `desde`/`hasta` pero no pone tope. El tope de 60 días (`RANGO_DEMASIADO_AMPLIO`) está en `huecosQuery`, que es otro endpoint. Confirmar con el back si la barra de rango arrastrable puede soltar un rango de meses o si hay que acotarla en el front.

---

## Componentes sugeridos (reuso)

> Regla del repo: reusar antes de crear, extender antes que duplicar. Íconos solo por `ui/Icon` (Material Symbols). Nada de `lucide-react`.

### Se reusan tal cual

| Pieza | Acción | Nota |
|---|---|---|
| `ui/Input` | Reusar | Ya tiene `label`, `requiredMark`, `error`, `hint`. Es el buscador (con `icon` de lupa). |
| `ui/Select` | Reusar | Filtro de estado (selección única). `wrapperClassName` para el ancho. |
| `ui/StatusBadge` | Reusar | Base de los 3 estados. `success`/`info`/`neutral` para Reservado/Finalizado/Cancelado. |
| `ui/MenuAcciones` | Reusar | **Resuelve la decisión del ícono de cancelar.** Trae `disabled` por acción y panel `position: fixed` que no lo recorta el `overflow-x-auto` de la tabla. Menú: *Ver · Modificar · Cancelar* (el último con `peligro`). |
| `ui/Modal` | Reusar | Modal de cancelación. Trae `titleExtra` y `subtitle` para colgar los datos del turno. `maxWidth` medio. |
| `ui/ConfirmarDialog` | Reusar | Confirmación Antes → Después (`tone="success"`) y confirmación de cancelación (`tone="danger"`). Trae `confirmDisabled` y `confirmando`. |
| `ui/Textarea` | Reusar | Observaciones. Auto-crece hasta 192px. |
| `ui/Pagination` | Reusar | `itemLabel="turnos"`. La tabla de "todos" hoy **no tiene paginación** — esto es nuevo. |
| `ui/Icon` | Reusar | Todos los íconos. |
| `ui/Toast` | Reusar | `ToastProvider` + `showToast("success"\|"error", msg)`. |
| `turnos/FranjasHorarias` | Reusar | Las franjas con cupo del formulario de edición. Los 5 estados (no-listo / cargando / error / vacío / lista) ya están resueltos. |
| `turnos/ResumenReserva` | Reusar | El recuadro "Datos anteriores" y el resumen del modal de confirmación. Acepta `DatoReserva[]` y variantes `lista`/`grid`. |
| `calendario/TurnoCalendarioBadge` | **Extender** | Hoy solo mapea `Reservado`→`info` y `Cancelado`→`neutral`. Agregar el tercer estado derivado. |

### Se reusan como molde (copiar estructura, no componente)

| Pieza | Origen | Qué copiar |
|---|---|---|
| Estructura de página | `src/app/alumnos/page.tsx` | Filtros arriba + los 4 estados + tabla + `Pagination`. Es el esqueleto de la pantalla. |
| Esqueleto de tabla | `src/components/alumnos/AlumnosTable.tsx` | `overflow-x-auto rounded-md border shadow-card`, `min-w-[Npx]`, `caption sr-only`, `thead bg-surface-container-low` con `text-[11px] uppercase tracking-wider`. |
| Columnas de la tabla | `CalendarioTurnos.tsx` (~534-579) | Las 7 columnas que ya existen. Se reordenan y se agregan Estado (3 valores), Modif. y Acciones. |
| Formulario de edición | `src/app/turnos/reservas/page.tsx` | El componente local `Paso`, la cascada `cambiarMateria`/`cambiarProfesor`/`cambiarFecha`, el patrón de carga `Carga<T> = { clave, lista, error }` con el "cargando" **derivado de la clave**, y el `validar()` que devuelve un mapa campo→mensaje. |
| Patrón de "cargando" | `SeccionHorario` (reservas) | El "cargando" se deriva comparando la clave, no con un `setState` sincrónico en el efecto. Regla activa 6 de `docs/errores-comunes.md`. |

### Componentes nuevos (no existen en el repo)

| Pieza | Para qué | Nota |
|---|---|---|
| `turnos/TurnosTable` | La tabla del listado, extraída de `CalendarioTurnos` | Es lógica de tabla, no de calendario. Se saca de `CalendarioTurnos.tsx` y `CalendarioTurnos` deja de tener la vista "todos". |
| `ui/RangoFechas` | La barra con dos puntitos arrastrables | **No existe nada parecido.** `RangoNumerico` son dos `<input type="text">` con un "–" en el medio, sin slider y sin `error`/`hint` — sirve de molde estructural, no de reuso. Accesibilidad: `role="slider"` con teclado (flechas, `Home`/`End`) y foco visible. |
| `turnos/ContadorModificaciones` | La barra `●─●─○` con `Modificaciones: 1 de 2 permitidas` | **No existe componente de progress bar en el repo.** Los únicos `progress` son el ícono `progress_activity` (spinner). |

### Capa de datos — falta todo lo de HU-TUR-02

Verificado: `src/data/turnos.ts` ya está conectado a la API real (`apiGet`/`apiSend`), no tiene fixtures. **Le faltan las funciones de esta HU:**

| Falta | Contrato | Nota |
|---|---|---|
| Listar con filtros | `RUTA` + `listarTurnosQuery` | Existe `listarTurnosEnRango(desde, hasta)` pero vive en `src/data/calendario.ts` y no acepta `busqueda`, `estado` ni `verCancelados`. Se agrega `listarTurnos(filtros)` en `src/data/turnos.ts`. |
| `GET /api/turnos/:id` | `rutaTurno(id)` | Para el detalle / "Ver". |
| `PUT /api/turnos/:id` | `rutaTurno(id)` + `editarTurnoBody` | No hay función. |
| `POST /api/turnos/:id/cancelar` | `rutaCancelar(id)` + `cancelarTurnoBody` | No hay función. |
| `GET /api/motivos-cancelacion` | `RUTA_MOTIVOS_CANCELACION` | No hay función. |
| `GET /api/parametros` | `RUTA_PARAMETROS` | No hay función. Hardcodear `2` mientras tanto. |

**Reglas del contrato que NO hay que reimplementar en el front** (`src/contracts/turno.ts`):
- `editarTurnoBody` no acepta `alumnoId` ni `materiaId` — son inmutables. Es `.strict()`: mandar un campo de más es 422.
- `puedeModificar` / `puedeCancelar` / `motivoDeshabilitado` ya vienen calculados por el back. **Usarlos, no recalcularlos.** Si el front los recalcula, el día que el back diverge se rompe.
- `cancelacionTardia` también viene calculado. No recalcular las 24 h.
- Los errores se discriminan por `e.codigo`: `MAX_MODIFICACIONES_ALCANZADO` (409), `TURNO_YA_PAGADO` (409), `TURNO_PASADO` (409), `ANTICIPACION_INSUFICIENTE` (422), `FUERA_DE_DISPONIBILIDAD` (422), `SIN_CUPO` (409), `ALUMNO_CON_TURNO_SUPERPUESTO` (409), `TURNO_YA_CANCELADO` (409), `DETALLE_CANCELACION_REQUERIDO` (422), `MOTIVO_CANCELACION_REQUERIDO` (422).

---

## Datos hardcodeados

> **Nota:** `src/data/turnos.ts` ya consume la API real — no hay arrays de turnos en el repo. Este bloque sirve como **fixture de referencia** para el diseño: tiene que reflejar exactamente el shape de `TurnoResponse` (`src/contracts/turno.ts:126-161`) respetando los tipos del `schema.sql`. Si al maquetar convience tener datos sin backend, va en un archivo de fixture separado, nunca mezclado en `src/data/`.

Tipos: `date` → `"yyyy-mm-dd"`, `time` → `"HH:MM"`, `timestamp` → ISO 8601, `numeric(12,2)` → `number`, `varchar(20)` de código → `"TUR-000123"`, `dni` → 7 u 8 dígitos (`^[0-9]{7,8}$`), `telefono` → 10 u 11 dígitos.

```ts
// Fixture de referencia — shape: TurnoResponse (src/contracts/turno.ts)
type EstadoVisible = "Reservado" | "Finalizado" | "Cancelado";

const hoyAR = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());

// Decisión 1: "Finalizado" NO viene de la base. Se deriva.
function estadoVisible(estado: "Reservado" | "Cancelado", fecha: string, horaInicio: string) {
  if (estado === "Cancelado") return "Cancelado" as const;
  return `${fecha}T${horaInicio}:00` <= `${hoyAR()}T23:59` ? ("Finalizado" as const) : ("Reservado" as const);
}

const turnos = [
  {
    id: 1,
    codigo: "TUR-000123",
    alumno: { id: 12, legajo: "1042", nombre: "Lucía", apellido: "García", dni: "38123456" },
    profesor: { id: 3, nombre: "Ana", apellido: "Ruiz" },
    materia: { id: 4, nombre: "Matemática", nivel: "Secundario", duracionClaseMinutos: 60 },
    fecha: "2026-09-28",              // lunes
    horaInicio: "15:00",
    horaFin: "16:00",
    valorClaseCongelado: 18000.00,
    estado: "Reservado",              // → visible "Reservado"
    observaciones: "Traer calculadora",
    cantidadModificaciones: 1,        // → columna Modif. "1/2"
    puedeModificar: true,
    puedeCancelar: true,
    motivoDeshabilitado: null,
    motivoCancelacion: null,
    detalleCancelacion: null,
    fechaCancelacion: null,
    cancelacionTardia: false,
    pagado: false,
    registradoPor: { id: 5, nombre: "Marta", apellido: "Sosa" },
    fechaCreacion: "2026-09-20T14:32:00.000Z",
  },
  {
    id: 2,
    codigo: "TUR-000124",
    alumno: { id: 18, legajo: "1057", nombre: "Mateo", apellido: "Sosa", dni: "40112233" },
    profesor: { id: 7, nombre: "Pablo", apellido: "Díaz" },
    materia: { id: 9, nombre: "Física", nivel: "Secundario", duracionClaseMinutos: 60 },
    fecha: "2026-09-28",
    horaInicio: "17:00",
    horaFin: "18:00",
    valorClaseCongelado: 20000.00,
    estado: "Reservado",
    observaciones: null,
    cantidadModificaciones: 0,        // → "0/2"
    puedeModificar: true,
    puedeCancelar: true,
    motivoDeshabilitado: null,
    motivoCancelacion: null,
    detalleCancelacion: null,
    fechaCancelacion: null,
    cancelacionTardia: false,
    pagado: false,
    registradoPor: { id: 5, nombre: "Marta", apellido: "Sosa" },
    fechaCreacion: "2026-09-22T09:10:00.000Z",
  },
  {
    id: 3,
    codigo: "TUR-000125",
    alumno: { id: 25, legajo: "1103", nombre: "Sofía", apellido: "López", dni: "35210987" },
    profesor: { id: 3, nombre: "Ana", apellido: "Ruiz" },
    materia: { id: 12, nombre: "Inglés", nivel: "Primario", duracionClaseMinutos: 45 },
    fecha: "2026-09-29",              // martes → visible "Finalizado" (ya transcurrió)
    horaInicio: "10:00",
    horaFin: "10:45",
    valorClaseCongelado: 15000.00,
    estado: "Reservado",              // el front lo muestra como "Finalizado"
    observaciones: null,
    cantidadModificaciones: 2,        // → "2/2" y modificar deshabilitado
    puedeModificar: false,
    puedeCancelar: false,
    motivoDeshabilitado: "Este turno ya alcanzó el máximo de 2 modificaciones. Cancelá el turno y reservá uno nuevo.",
    motivoCancelacion: null,
    detalleCancelacion: null,
    fechaCancelacion: null,
    cancelacionTardia: false,
    pagado: true,                     // ya cobrado → no se modifica ni se cancela
    registradoPor: { id: 5, nombre: "Marta", apellido: "Sosa" },
    fechaCreacion: "2026-09-10T16:45:00.000Z",
  },
  {
    id: 4,
    codigo: "TUR-000126",
    alumno: { id: 31, legajo: "1120", nombre: "Juan", apellido: "Núñez", dni: "33123456" },
    profesor: { id: 7, nombre: "Pablo", apellido: "Díaz" },
    materia: { id: 15, nombre: "Química", nivel: "Universitario", duracionClaseMinutos: 90 },
    fecha: "2026-09-30",              // miércoles
    horaInicio: "12:00",
    horaFin: "13:30",
    valorClaseCongelado: 28000.00,
    estado: "Cancelado",              // → visible "Cancelado"
    observaciones: "El alumno avisó que no puede",
    cantidadModificaciones: 0,
    puedeModificar: false,
    puedeCancelar: false,
    motivoDeshabilitado: "El turno está cancelado.",
    motivoCancelacion: { id: 2, nombre: "Pedido alumno" },
    detalleCancelacion: null,          // requiere_detalle = false
    fechaCancelacion: "2026-09-25T11:20:00.000Z",
    cancelacionTardia: false,
    pagado: false,
    registradoPor: { id: 5, nombre: "Marta", apellido: "Sosa" },
    fechaCreacion: "2026-09-15T10:00:00.000Z",
  },
];

// Decisión 2: el máximo sale de `parametro`. Hardcodeado hasta que exista el endpoint.
// BACKEND: GET /api/parametros → buscar clave === "max_modificaciones_turno" y usar su `valor`.
const MAX_MODIFICACIONES = 2;

// Contratos de UI derivados (NO van al contrato de API).
type TurnoFila = (typeof turnos)[number] & { estadoVisible: EstadoVisible };
```

Motivos de cancelación (`GET /api/motivos-cancelacion`, seed en `src/contracts/catalogo.ts`):

```ts
const motivos = [
  { id: 1, nombre: "Ausencia profesor", requiereDetalle: false, estado: "activo" },
  { id: 2, nombre: "Pedido alumno",     requiereDetalle: false, estado: "activo" },
  { id: 3, nombre: "Error carga",       requiereDetalle: false, estado: "activo" },
  { id: 4, nombre: "Otro",              requiereDetalle: true,  estado: "activo" },
];
```

---

## Estados

- [ ] **Vacío** — sin turnos para el filtro actual. Tiene que distinguir dos casos con mensajes distintos: *búsqueda sin resultados* (hay que cambiar el filtro) vs *sin turnos en el rango* (ofrece reservar).
- [ ] **Cargando** — tabla con `opacity-60` (como hoy en `CalendarioTurnos`) y el texto "Cargando turnos…". Los skeletons de la tabla de alumnos como referencia.
- [ ] **Error** — mensaje + botón "Reintentar". El reintento va en un handler aparte, nunca en el cuerpo del `useEffect` (regla activa 6).
- [ ] **Con datos** — el listado del wireframe.

Estados del formulario de edición, adicionalmente:
- [ ] Franjas no cargadas todavía (profesor/fecha sin elegir)
- [ ] Franjas cargando (8 skeletons)
- [ ] Franjas con error + "Reintentar"
- [ ] Sin franjas disponibles en esa fecha
- [ ] Guardando (botón deshabilitado, `confirmandoLabel`)
- [ ] Error al guardar por `e.codigo` (mensaje contextual, no genérico)

---

## Criterios de aceptación

### Listado

- [ ] `/turnos` muestra la tabla de turnos con las columnas en este orden: **Código · Alumno · Materia · Profesor · Fecha y hora · Estado · Modif. · Acciones**.
- [ ] Por defecto muestra los turnos de **hoy** (rango `desde = hoy`, `hasta = hoy`).
- [ ] El buscador filtra por **código de turno, DNI, nombre o apellido**, texto libre, coincidencia parcial, con debounce.
- [ ] El filtro de estado es de **selección única** (Reservado / Cancelado / Finalizado / Todos).
- [ ] El filtro de fechas es un **rango arrastrable** con dos puntitos; se puede escribir la fecha exacta en los campos. Es operable por teclado.
- [ ] "Reservado" y "Cancelado" se piden al servidor (`estado=` / `verCancelados=`). "Finalizado" se resuelve en el front, siempre con rango acotado.
- [ ] Al elegir "Finalizado" con el rango vacío, el rango se auto-acota a hoy.
- [ ] Fecha y hora se muestran juntas en formato corto: `Lun 28/09 · 15:00`.
- [ ] La columna **Modif.** muestra `N/2` con la barra de progreso. Con `N === 2` el ícono de modificar queda deshabilitado en gris.
- [ ] El botón "Reservar turno" navega a `/turnos/reservas`.
- [ ] La tabla tiene paginación con `itemLabel="turnos"`.
- [ ] Al abrir `/calendario`, la selección "profesor: todos" ya no existe: esa vista quedó en `/turnos`.
- [ ] El ítem "Turnos y Agenda" del sidebar apunta a `/turnos`; `/turnos/reservas` sigue funcionando y sigue protegida por el guard de permisos.
- [ ] Con rol Profesor, `/turnos` responde "Acceso denegado" (no está en `PERMISOS_POR_ROL`).

### Modificar

- [ ] Solo turnos `Reservado` con inicio futuro se pueden modificar. En cualquier otro caso la acción se ve deshabilitada en gris, y el motivo va en tooltip.
- [ ] **Usa el mismo formulario de la reserva en modo EDICIÓN**: Alumno y Materia se muestran en gris, solo lectura. Editables: Profesor (combo filtrado por la materia), Fecha, Horario y Observaciones, con los mismos tipos y rangos que en la reserva.
- [ ] Las franjas disponibles se calculan igual que en la reserva (disponibilidad del profesor, cupos, no superposición del alumno, anticipación mínima de 2 h).
- [ ] Hay un **recuadro "Datos anteriores"** a la derecha que muestra el estado previo del turno y se actualiza en vivo a medida que se edita, con el valor viejo y el nuevo por campo.
- [ ] Una **barra de modificaciones** con el texto `Modificaciones: 1 de 2 permitidas` debajo.
- [ ] La leyenda *"El horario original se libera recién al confirmar"* está visible junto a la barra.
- [ ] Antes de guardar, un modal de confirmación con el detalle **Antes → Después** y los botones "Confirmar" y "Cancelar".
- [ ] El código de turno se conserva. No se puede cambiar el alumno ni la materia.
- [ ] Si se alcanzó el máximo, el mensaje en rojo indica cancelar el turno y reservar uno nuevo.
- [ ] El horario original se libera **únicamente al confirmar**. Si la validación falla, el turno original queda sin cambios.
- [ ] El detalle del turno muestra el contador "Modificado N veces".
- [ ] Se registra en bitácora (`auditoria`, `tabla='turno'`) cada modificación con usuario, fecha, hora, campo, valor anterior y nuevo. Lo hace el back; el front no lo envía.

### Cancelar

- [ ] El botón "Cancelar turno" existe **en dos lugares**: en el menú de acciones de la fila y dentro del modo edición.
- [ ] El ícono de cancelar en la fila es un **menú de acciones** (`ui/MenuAcciones`: Ver · Modificar · Cancelar), no un ícono suelto. El panel es `position: fixed` para que el `overflow-x-auto` de la tabla no lo recorte.
- [ ] Abre un modal con los datos del turno y el campo **Motivo** (obligatorio, combo) y **Detalle del motivo** (máx. 200 caracteres, obligatorio solo si el motivo es "Otro").
- [ ] Botón "Confirmar" en rojo y "Cancelar" en gris.
- [ ] Al confirmar, el turno pasa a estado "Cancelado" (rojo) y el detalle muestra la marca de **cancelación tardía** si corresponde. La cancelación es lógica: el turno permanece en el historial.
- [ ] El cupo queda liberado de inmediato.
- [ ] Un turno cancelado no se reactiva. Para retomarlo hay que generar una reserva nueva.
- [ ] Los cancelados están ocultos por defecto y aparecen al elegir el filtro "Cancelado".
- [ ] Se registra en bitácora la cancelación con usuario, fecha, hora, motivo, estado anterior y nuevo. Lo hace el back.

### Reglas transversales

- [ ] Ningún texto chico de estado usa `on-surface-variant` sobre `surface-container`/`-high`, ni `status-warning-strong`/`error` como texto sobre fondo claro. El color de estado va en el ícono, el borde o el fondo suave (regla activa 13 de `docs/errores-comunes.md`).
- [ ] `npm run lint` + `npx tsc --noEmit` pasan, con `npx next typegen` antes.
- [ ] Todo punto de integración lleva su comentario `// BACKEND:`.
- [ ] La UI está en español.

---

## Fuera de alcance (criterios opcionales de la HU)

Los 6 criterios opcionales quedan afuera en esta iteración:

1. Notificación por email al alumno o responsable.
2. Sugerencia de horarios alternativos cuando el elegido no tiene cupo.
3. Reprogramar un turno arrastrándolo desde el calendario.
4. Cancelación masiva de los turnos de un profesor en una fecha.
5. El Profesor cancelando sus propios turnos.
6. Resaltar en el listado los turnos modificados.

> Nota: el punto 2 ya está **parcialmente** implementado en `/turnos/reservas` (`sugerirProximaFranja` + "Usar este horario"). Si se decide activarlo en `/turnos`, es extender esa pieza, no construirla.
