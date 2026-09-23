# HU-CAL-01: Como Personal de Mesa de Entrada, quiero ver el calendario de turnos de cada profesor junto con su disponibilidad horaria, para conocer los horarios libres y ocupados de cada profesor y reservar clases sin superposiciones.

> Generado con /brief. Revisar y ajustar antes de /disenar.

## Contexto

- **Ruta propuesta:** `/calendario`
- **Relacionada con:** `HU-TUR-01` (reserva de turno — prefill desde un hueco), `HU-TUR-02` (detalle de turno en modo LECTURA). Contratos existentes: [`calendario.ts`](../../src/contracts/calendario.ts) y [`disponibilidad.ts`](../../src/contracts/disponibilidad.ts).
- **Prioridad:** alta

## Wireframe (idea)

Basado en la grilla semanal de agenda del otro proyecto (referencia: `agenda-semanal-export` → `AgendaSemanal`), adaptado al dominio de academia (profesor/alumno/materia/vista día y semana).

```
┌──────────────────────────────────────────────────────────────┐
│ 📅 Calendario de turnos                          [Hoy] [<] [>] │
│ Filtro: [Profesor ▾]            Vista: [Semana|Día]  Zoom: [30']│
│                                                               │
│  Leyenda:  ■ Reservado  □ Disponible(bloque)  ▨ Sin atención   │
│ ┌────────┬──────┬──────┬──────┬──────┬──────┬──────┬────────┐ │
│ │ Hora   │ Lunes│ Mart │ Miér │ Juev │ Vier │ Sáb  │        │ │
│ ├────────┼──────┼──────┼──────┼──────┼──────┼──────┼────────┤ │
│ │ 08:00  │ ↓    │ —    │      │      │      │      │        │ │
│ │ 08:30  │ ┌────┐      │...turnos reservados (azul)...      │ │
│ │ 09:00  │ │TUR-│      │                                    │ │
│ │ 09:30  │ └────┘      │                                    │ │
│ │ ...    │ franja      │  (franja de atención del profesor   │ │
│ │ 18:00  │ libre       │   en tono claro)                   │ │
│ └────────┴─────────────┴────────────────────────────────────┘ │
│  (click en turno → detalle LECTURA · click en franja libre   │
│   → reserva HU-TUR-01 con Profesor/Fecha/Horario precargados)│
└──────────────────────────────────────────────────────────────┘
```

- **Grilla horaria** limitada al horario de atención del centro (de `agenda_semanal`).
- Vistas **Día** y **Semana** (por defecto Semana), con botones Anterior / Siguiente / Hoy.
- **Zoom de la grilla: 30 min por fila por defecto** (encaja con los múltiplos de 30 del esquema y los turnos de 30'); opción alterna de 60 min/fila.
- Filtro Profesor obligatorio: mientras no se elija, mensaje "Seleccione un profesor para ver su calendario" (rol Mesa de Entrada y Gerente). El **Profesor** ve solo su propio calendario (filtro fijo y bloqueado).
- Colores: turnos **Reservado = azul** (FILL azul), bloque de disponibilidad en tono claro (fondo claro), resto de la grilla "—".

## User flow

1. **¿De dónde viene?**: puede venir del menú lateral (item "Calendario") o del alta de turno (HU-TUR-01) al volver de una reserva. Rol Profesor entra con su propio filtro ya aplicado.
2. **¿Qué quiere?**: visualizar qué franjas horarias tiene un profesor (bloques de disponibilidad) y qué turnos ya están reservados, navegando días/semanas.
3. **¿A dónde llega?**: al hacer clic en un hueco → formulario de reserva de HU-TUR-01 con Profesor/Fecha/Horario precargados; al hacer clic en un turno → detalle en modo LECTURA (HU-TUR-02). Al volver, la grilla muestra el nuevo turno.

## Fuente de datos (BD)

Contrato del módulo: [`src/contracts/calendario.ts`](../../src/contracts/calendario.ts) (HU-CAL-01). Vistas: `agenda_profesional` (bloques de disponibilidad del profesor), `agenda_semanal` (franjas de atención), `turno` (turnos reservados).

| Tabla | Campos usados | Relación clave |
|---|---|---|
| `profesor` | id, nombre, apellido, estado, foto | FK → usuario.id |
| `agenda_profesional` | id, profesor_id, agenda_semanal_id, bloque_dia_semana, hora_inicio, hora_fin, estado | FK → agenda_semanal.id |
| `agenda_semanal` | id, dia_semana, hora_inicio, hora_fin, estado | franjas de atención del centro |
| `turno` | id, codigo, alumno_id, profesor_id, materia_id, fecha, hora_inicio, hora_fin, estado (Reservado/Cancelado) | FK → alumno/profesor/materia |

> `HuecoResponse`: `{ id, agendaProfesionalId, profesor, fecha, horaInicio, horaFin, duracionMinutos }` — de la vista `vw_huecos_disponibles`. `AgendaDiaResponse`: `{ profesor, fecha, franjas, huecos[] }` de `vw_agenda_profesional_dia`.
> **BACKEND:** la grilla semanal proyecta los 60 días con `vw_huecos_disponibles` (GET `/api/calendario/huecos?profesorId=&desde=&hasta=`). El zoom de 30/60 min por fila es un ajuste visual del front, no un cambio de datos: la vista ya devuelve huecos con `horaInicio`/`horaFin` en pasos de 30 min.

## Componentes sugeridos (reuso)

| Pieza | Acción | Nota |
|---|---|---|
| `AgendaSemanal` (grilla semanal) | **Extender** | Patrón de grilla horaria del módulo turnos; se adapta de veterinaria (cliente/mascota) a academia (alumno/materia) y se le agrega vista Día + zoom. |
| `Button` (ui) | Reusar | Botones Hoy / Anterior / Siguiente, y volver |
| `Select` (ui) | Reusar | Filtro Profesor (combo con profesores activos) |
| `EstadoTurnoBadge` | Reusar | Badge de estado Reservado/Cancelado en tarjeta de turno |
| `Modal` (ui) + `TurnoDetalleModal` | Reusar | Detalle en modo LECTURA del turno (HU-TUR-02) |
| `StatusBadge` / chips de leyenda | Reusar | Leyenda de colores (Reservado azul / bloque claro / sin atención) |

## Datos hardcodeados

Datos de ejemplo que respetan el esquema. `id` numérico; estado de turno según enum `estado_turno` (Reservado=1, Cancelado=2). Referencia de alumnos/materias/profesores en `src/data/` (fixtures). Sincronizar ids con las franjas de `src/contracts/disponibilidad.ts`.

```ts
// Profesores para el combo (GET /api/profesores). // BACKEND:
const profesores = [
  { id: 1, nombre: "Juan", apellido: "Pérez", estado: "activo" },
  { id: 2, nombre: "Ana", apellido: "González", estado: "activo" },
  { id: 3, nombre: "Lucía", apellido: "Rodríguez", estado: "activo" },
];

// Franjas de atención del centro (GET /api/agenda — franjas agenda_semanal). // BACKEND:
const franjasAtencion = [
  { id: 1, diaSemana: 1, horaInicio: "09:00", horaFin: "13:00", estado: "activo" },
  { id: 2, diaSemana: 1, horaInicio: "16:00", horaFin: "20:00", estado: "activo" },
];

// Bloques de disponibilidad del profesor (GET /api/disponibilidad?profesorId=). // BACKEND:
const bloques = [
  { id: 1, profesorId: 1, agendaSemanalId: 1, diaSemana: 1, horaInicio: "09:00", horaFin: "13:00", estado: "activo" },
  { id: 2, profesorId: 1, agendaSemanalId: 2, diaSemana: 1, horaInicio: "16:00", horaFin: "20:00", estado: "activo" },
];

// Turnos reservados (GET /api/turnos?profesorId=&desde=&hasta=). // BACKEND:
const turnos = [
  { id: 1, codigo: "TUR-000001", alumno: { id: 1, nombre: "María", apellido: "López" }, materia: { id: 1, nombre: "Matemática" }, fecha: "2026-09-14", horaInicio: "09:00", horaFin: "10:00", estado: "Reservado" },
  { id: 2, codigo: "TUR-000002", alumno: { id: 2, nombre: "Carlos", apellido: "Sosa" }, materia: { id: 2, nombre: "Inglés" }, fecha: "2026-09-14", horaInicio: "10:30", horaFin: "11:30", estado: "Reservado" },
];
```

## Estados

- [x] Vacío (profesor sin bloques / sin turnos → grilla con bloques pero sin turnos; sin profesor → mensaje de selección)
- [x] Cargando (spinner sobre la grilla)
- [x] Error (mensaje + botón Reintentar, patrón de AgendaSemanal)
- [x] Con datos (grilla con bloques + turnos)

## Criterios de aceptación

- [ ] Vista **Semana** por defecto y **Día**; botones "Anterior", "Siguiente" y "Hoy" en ambas.
- [ ] Filtro Profesor: combo con profesores activos, obligatorio; sin selección muestra "Seleccione un profesor para ver su calendario".
- [ ] Muestra los bloques de disponibilidad del profesor en tono claro y, sobre ellos, los turnos en estado "Reservado" (azul).
- [ ] Cada turno muestra: hora de inicio y fin, Apellido y Nombre del alumno, materia y código de turno.
- [ ] Al hacer clic en un turno abre su detalle en modo LECTURA (campos deshabilitados/en gris, sin botones de edición).
- [ ] Al hacer clic en una franja libre abre el formulario de reserva de HU-TUR-01 con Profesor, Fecha y Horario precargados (solo Mesa de Entrada y Gerente).
- [ ] Al volver desde la reserva, el calendario muestra el nuevo turno.
- [ ] Restricción por rol: Profesor visualiza solo su propio calendario (filtro fijo y bloqueado); Mesa de Entrada y Gerente consultan el de cualquiera.
- [ ] Leyenda de colores visible en todo momento.
- [ ] Grilla horaria limitada al horario de atención del centro.

## Criterios aceptables / deseables

- [ ] Impresión del calendario **semanal** (vista Semana): botón "Imprimir" que abre `window.print()`. Puro front, `@media print` del design system (bloque ya instalado en `globals.css`): los controles de navegación, el filtro de profesor y los botones van con `print:hidden`; quedan grilla + leyenda + encabezado con academia, profesor y rango de fechas. Sin dependencias nuevas (mismo patrón que `exportar.ts`). NO toca contratos ni la capa de datos.
- [ ] Resaltado del día actual y de la hora actual en la grilla.
- [ ] Ajuste del zoom de la grilla (30 o 60 minutos por fila) — **zoom por defecto: 30 min/fila**, con alternancia a 60.
