# HU-CAL-01: Como Personal de Mesa de Entrada, quiero ver el calendario de turnos de cada profesor junto con su disponibilidad horaria, para conocer los horarios libres y ocupados de cada profesor y reservar clases sin superposiciones.

> Generado con /brief. **Actualizado al diseño final implementado** (re-skin estética "Turnos y Agenda"): sin leyenda, botón de impresión según vista, título de página fijo, huecos de duración variable.

## Contexto

- **Ruta:** `/calendario`
- **Relacionada con:** `HU-TUR-01` (reserva de turno — prefill desde un hueco), `HU-TUR-02` (detalle de turno en modo LECTURA). Contratos existentes: [`calendario.ts`](../../src/contracts/calendario.ts) y [`disponibilidad.ts`](../../src/contracts/disponibilidad.ts).
- **Prioridad:** alta

## Wireframe (diseño final)

Adaptado de la grilla semanal de agenda del otro proyecto (`agenda-semanal-export` → `AgendaSemanal`) al dominio de academia, con la estética "Turnos y Agenda" y el design system Nexo Académico.

```
┌──────────────────────────────────────────────────────────────────┐
│ [icon] Calendario                               [Imprimir semana]│  ← toolbar fijo
│        Disponibilidad y reservas de cada profesor                 │
├──────────────────────────────────────────────────────────────────┤
│ Filtro: [Profesor ▾]          Vista:[Semana|Día]  Zoom:[30'|60'] │
│ Elegí un profesor para ver su calendario.                        │
├──────────────────────────────────────────────────────────────────┤
│ [icon] Semana del 21 al 25 de Octubre de 2025  (18 turnos)       │
│                                           [Hoy] [<] [>]          │  ← rango + nav
├──────┬───────────┬───────────┬───────────┬───────────┬───────────┤
│ Hora │ Lun       │ Mar       │ Mié       │ Jue       │ Vie       │
│ 09:00│ ┌─────────┐                                           │ │
│ 09:30│ │TUR-•    │  Disponible (centrado, borde punteado)    │ │
│ 10:00│ │Reservado│  ─ clic → reserva HU-TUR-01 precargada    │ │
│ ...  │ └─────────┘                                           │ │
│ 19:30│ — fuera de cobertura                                  │ │
└──────┴───────────────────────────────────────────────────────────┘
 (click turno → detalle LECTURA · click franja libre → reserva)
```

- **Toolbar de página fijo:** icono + título "Calendario" + subtítulo "Disponibilidad y reservas de cada profesor"; a la derecha el botón de impresión (**"Imprimir semana"** / **"Imprimir día"** según la vista activa) que abre `window.print()`.
- **Línea de encabezado de la grilla:** icono + rango ("Semana del X al Y de Mes de Año" o día completo, capitalizado) + pill contador "N turnos" a la izquierda; navegación **Hoy / ◀ / ▶** a la derecha.
- **Sin leyenda ni nota de anticipación** (decisión de diseño final; se removieron a pedido del producto).
- **Grilla horaria** limitada al horario de atención del centro (de `agenda_semanal`).
- Vistas **Día** y **Semana** (por defecto Semana), con botones Anterior / Siguiente / Hoy.
- **Zoom de la grilla: 30 min por fila por defecto**; opción alterna de 60 min/fila.
- Filtro Profesor obligatorio: mientras no se elija, mensaje "Elegí un profesor para ver su calendario." (rol Mesa de Entrada y Gerente). El **Profesor** ve solo su propio calendario (filtro fijo y bloqueado).
- Celdas "—" fuera de cobertura; **"Disponible"** (icono `add_circle`, borde punteado) centrado en la celda, clickeable en cada banda dentro de un hueco.
- Tarjetas de turno con **borde lateral de color** (`border-l-4`): `secondary` para Reservado, `error` + fondo claro para Cancelado; código + rango horario, alumno (Apellido, Nombre) y materia.
- Resaltado del día/hora actual: badge "Hoy" y header del día en `secondary` sólido; banda de hora actual con punto.

## User flow

1. **¿De dónde viene?**: puede venir del menú lateral (item "Calendario") o del alta de turno (HU-TUR-01) al volver de una reserva. Rol Profesor entra con su propio filtro ya aplicado.
2. **¿Qué quiere?**: visualizar qué franjas horarias tiene un profesor (bloques de disponibilidad) y qué turnos ya están reservados, navegando días/semanas.
3. **¿A dónde llega?**: al hacer clic en un hueco → formulario de reserva de HU-TUR-01 con Profesor/Fecha/Horario precargados (hoy placeholder "Próx."); al hacer clic en un turno → detalle en modo LECTURA (HU-TUR-02). Al volver, la grilla muestra el nuevo turno.

## Fuente de datos (BD)

Contrato del módulo: [`src/contracts/calendario.ts`](../../src/contracts/calendario.ts) (HU-CAL-01). Vistas: `agenda_profesional` (bloques de disponibilidad del profesor), `agenda_semanal` (franjas de atención), `turno` (turnos reservados).

| Tabla | Campos usados | Relación clave |
|---|---|---|
| `profesor` | id, nombre, apellido, estado | FK → usuario.id (1 a 1) |
| `agenda_profesional` | id, profesor_id, agenda_semanal_id, hora_inicio, hora_fin, estado | FK → agenda_semanal.id |
| `agenda_semanal` | id, dia_semana, hora_inicio, hora_fin, estado | franjas de atención del centro |
| `turno` | id, codigo, alumno_id, profesor_id, materia_id, fecha, hora_inicio, hora_fin, estado (Reservado/Cancelado) | FK → alumno/profesor/materia |

> `HuecoResponse`: `{ agendaProfesionalId, profesor, fecha, horaInicio, horaFin, duracionMinutos }` — de la vista `vw_huecos_disponibles`. **Los huecos tienen duración variable** (hueco interno entre turnos consecutivos + hueco final hasta el cierre del bloque), no pasos fijos de 30'. `AgendaDiaResponse`: `{ profesor, fecha, bloques, turnos, huecos }`.
> **BACKEND:** la grilla semanal proyecta los días con `vw_huecos_disponibles` (GET `/api/calendario/huecos?profesorId=&desde=&hasta=`). El zoom de 30/60 min por fila es un ajuste visual del front, no un cambio de datos.

## Componentes usados (reuso)

| Pieza | Acción | Nota |
|---|---|---|
| `CalendarioTurnos` (componente nuevo) | **Crear** | Grilla principal con estética "Turnos y Agenda": toolbar, línea de rango + nav, tarjetas `border-l-4`, huecos "Disponible" centrados |
| `Button` (ui) | Reusar | Navegación, vistas, zoom, impresión, reintentar |
| `Select` (ui) | Reusar | Filtro Profesor; hint fuera del Select (evita desalineación con `items-end`) |
| `Modal` (ui) + `TurnoDetalleModal` | Crear | Detalle en modo LECTURA del turno (HU-TUR-02) |
| `ReservaTurnoModal` | Crear (placeholder) | Prefill de reserva HU-TUR-01 (chip "Próx.") |
| `TurnoCalendarioBadge` | Crear | Badge de estado sobre `StatusBadge`: reservado=info `event_available`, cancelado=neutral `event_busy` |

## Datos hardcodeados

Datos de ejemplo que respetan el esquema en `src/data/calendario.ts` (fixture con `id` numérico PK; `// BACKEND:` en turnos, franjas y profesores; `/api/calendario/*` aún no existen). Los turnos se generan sobre la semana **real** (la que contiene a hoy) para que el resaltado y la navegación "Hoy" funcionen en cualquier momento. 4 profesores; el `usuarioId` 3 = Roberto Peralta (rol Profesor demo) se usa para el filtro bloqueado.

```ts
// Profesores para el combo (GET /api/profesores?estado=activo). // BACKEND:
const PROFESORES = [
  { id: 1, usuarioId: 1, nombre: "Juan", apellido: "Pérez", estado: "activo" },
  { id: 2, usuarioId: 2, nombre: "Ana", apellido: "González", estado: "activo" },
  { id: 3, usuarioId: 4, nombre: "Lucía", apellido: "Rodríguez", estado: "activo" },
  { id: 4, usuarioId: 3, nombre: "Roberto", apellido: "Peralta", estado: "activo" },
];

// Franjas de atención del centro (GET /api/agenda — franjas agenda_semanal). // BACKEND:
// lun–vie 08:00-13:00 / 14:00-20:00, sáb 08:00-12:00 (diaSemana 1..6 ISO).

// Bloques de disponibilidad del profesor (GET /api/disponibilidad?profesorId=). // BACKEND:
// Siempre múltiplos de 30' y dentro de la franja de atención del día.

// Turnos reservados (GET /api/turnos?profesorId=&desde=&hasta=). // BACKEND:
// turnosDeSemanaActual() genera la semana relativa a la fecha real.
```

## Estados

- [x] Vacío (profesor sin bloques / sin turnos → grilla con bloques pero sin turnos; sin profesor → mensaje de selección)
- [x] Cargando (spinner sobre la grilla, opacidad 60%)
- [x] Error (mensaje + botón Reintentar, patrón de AgendaSemanal)
- [x] Con datos (grilla con bloques + turnos)

## Criterios de aceptación

- [x] Vista **Semana** por defecto y **Día**; botones "Anterior", "Siguiente" y "Hoy" en ambas.
- [x] Filtro Profesor: combo con profesores activos, obligatorio; sin selección muestra "Elegí un profesor para ver su calendario.".
- [x] Muestra los bloques de disponibilidad del profesor (celdas "Disponible" clickeables) y, sobre ellos, los turnos en estado "Reservado" (azul).
- [x] Cada turno muestra: hora de inicio y fin, Apellido y Nombre del alumno, materia y código de turno.
- [x] Al hacer clic en un turno abre su detalle en modo LECTURA (campos deshabilitados/en gris, sin botones de edición).
- [x] Al hacer clic en una franja libre abre el formulario de reserva de HU-TUR-01 con Profesor, Fecha y Horario precargados (placeholder "Próx."; flujo real en HU-TUR-01).
- [ ] Al volver desde la reserva, el calendario muestra el nuevo turno. *(Pendiente: la reserva real es HU-TUR-01)*
- [x] Restricción por rol: Profesor visualiza solo su propio calendario (filtro fijo y bloqueado); Mesa de Entrada y Gerente consultan el de cualquiera.
- [ ] ~~Leyenda de colores visible en todo momento~~ — **removida** por decisión de producto (diseño final sin leyenda).
- [x] Grilla horaria limitada al horario de atención del centro.

## Criterios aceptables / deseables

- [x] Impresión del calendario (**semana o día** según la vista activa): botón en el toolbar con `window.print()`. Puro front, `@media print` del design system: controles, filtro de profesor y botones con `print:hidden`; queda grilla + encabezado con academia, profesor y rango (o día) según la vista. NO toca contratos ni la capa de datos.
- [x] Resaltado del día actual (header `secondary` sólido + badge "Hoy") y de la hora actual (banda con punto en la columna Hora).
- [x] Ajuste del zoom de la grilla (30 o 60 minutos por fila) — **zoom por defecto: 30 min/fila**, con alternancia a 60.