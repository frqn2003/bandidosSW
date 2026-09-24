# HU-TUR-01: Como Personal de Mesa de Entrada, quiero reservar un turno para un alumno eligiendo materia, profesor, fecha y un horario disponible, para asegurar la clase de apoyo del alumno y evitar superposiciones o sobrecupo en la agenda del profesor.

> Generado con /brief. Revisar y ajustar antes de /disenar.

## Contexto

- **Ruta propuesta:** `/turnos/reservas`
- **Relacionada con:** `HU-CAL-01` (`/calendario`: el clic en un hueco "Disponible" navega acá con profesor/fecha/horario precargados; reemplaza el placeholder `ReservaTurnoModal`), `HU-TUR-02` (detalle de turno), `HU-ALU-01`, `HU-MAT-01`, `HU-PRO-01` (catálogos).
- **Contrato:** [`src/contracts/turno.ts`](../../src/contracts/turno.ts) (POST `/api/turnos`). Falta el endpoint de franjas con cupos → `// PENDIENTE CONTRATO:`.
- **Menú:** item "Turnos y Agenda" de `src/lib/permisos.ts` → `href: "/turnos/reservas"`, `construido: true`.
- **Roles:** Mesa de Entrada y Gerente.
- **Prioridad:** alta (1)

## Propuesta inicial (del equipo)

- Formulario de reserva en página propia (`/turnos/reservas`).
- Flujo encadenado: Alumno → Materia → Profesor → Fecha → Horario → Observaciones.
- Franjas con "Cupos disponibles X de N"; sin cupo = gris y deshabilitada.
- Modal de resumen antes de guardar (Confirmar / Cancelar).
- Comprobante en pantalla al confirmar, con **valor de la clase** (`valorClaseCongelado`).
- Acciones del comprobante: **Nueva reserva**, **Ver en calendario**, **Imprimir** y **Enviar por email** (estas dos últimas marcadas en código como `// OPCIONAL:` — si no se quieren, se eliminan).
- Cupos: **no se agrega columna `cupos_disponibles`**. Es un dato derivado (`profesor_materia.capacidad_maxima − turnos Reservado superpuestos`) que calcula el back y viaja en la respuesta de franjas como `capacidad` + `cuposDisponibles`. Persistirlo obligaría a mantenerlo sincronizado y agrava la concurrencia.

## Wireframe (idea)

```
┌────────────┬─────────────────────────────────────────────────────────┐
│            │ [icon] Reservar turno                                   │
│  SIDEBAR   │        Clase de apoyo · Mesa de Entrada                 │
│            ├─────────────────────────────────┬───────────────────────┤
│ Turnos y   │ 1 Alumno *                      │  RESUMEN (sticky)     │
│ Agenda ◀   │ [🔍 DNI, nombre, apellido o     │  Alumno:  —           │
│            │     legajo...            ]      │  Materia: —           │
│            │  └ lista de coincidencias       │  Profesor:—           │
│            │  (seleccionado: chip ALU-000123 │  Fecha:   —           │
│            │   López, María · DNI  [x])      │  Horario: —           │
│            │                                 │  Duración: 60 min     │
│            │ 2 Materia *    [Combo ▾]        │  Valor:  $ 8.500      │
│            │ 3 Profesor *   [Combo ▾]        │                       │
│            │   (deshabilitado hasta materia) │  [Reservar turno]     │
│            │ 4 Fecha *      [dd/mm/aaaa]     │                       │
│            │   hint: hasta 60 días           │                       │
│            │ 5 Horario *                     │                       │
│            │  ⚡ Próximo libre: Mar 14/10 10:00 [Usar]               │
│            │  ┌────────┐┌────────┐┌────────┐ │                       │
│            │  │ 09:00  ││ 10:00  ││ 11:00  │ │                       │
│            │  │ 2 de 4 ││ 4 de 4 ││ 0 de 4 │ │ ← gris, disabled      │
│            │  └────────┘└────────┘└────────┘ │                       │
│            │ 6 Observaciones  [.......] 0/250│                       │
│            │ ⛔ (error rojo: superposición / │                       │
│            │     anticipación / sin cupo)    │                       │
└────────────┴─────────────────────────────────┴───────────────────────┘

Modal resumen → [Cancelar] [Confirmar]
Comprobante (reemplaza el formulario):
  ✔ Turno reservado   TUR-000123  [Reservado]
  Alumno · Legajo · DNI | Materia · Profesor | Fecha · Horario · Duración
  Valor de la clase | Observaciones | Registrado por · fecha/hora
  [Nueva reserva] [Ver en calendario] [Imprimir]* [Enviar por email]*
  (* OPCIONAL)
```

- En móvil el resumen lateral baja debajo del formulario.
- Campos dependientes: cambiar la materia limpia profesor/fecha/horario; cambiar profesor o fecha limpia horario.
- Franjas como botones tipo "chip" (radiogroup accesible), `aria-disabled` + gris cuando `cuposDisponibles = 0` o no cumplen anticipación mínima.

## User flow

1. **¿De dónde viene?** Del menú lateral ("Turnos y Agenda") o desde `/calendario` al hacer clic en un hueco "Disponible" (`/turnos/reservas?profesorId=&fecha=&hora=`, precarga profesor, fecha y horario; falta elegir alumno y materia).
2. **¿Qué quiere?** Buscar al alumno, elegir materia/profesor/fecha, tomar una franja con cupo, revisar el resumen y confirmar.
3. **¿A dónde llega?** Al comprobante en pantalla (código TUR-xxxxxx, estado Reservado azul). Desde ahí: nueva reserva (formulario limpio), ver en calendario (`/calendario?profesorId=&fecha=`), imprimir o enviar por email (opcionales).

## Fuente de datos (BD)

| Tabla | Campos usados | Relación clave |
|---|---|---|
| `alumno` | id, legajo, nombre, apellido, dni, email, responsable_nombre, estado (solo activos) | — |
| `materia` | id, nombre, nivel, duracion_clase_minutos, estado (solo activas) | — |
| `profesor` / `usuario` | id, nombre, apellido, estado (solo activos) | profesor.usuario_id → usuario.id |
| `profesor_materia` | profesor_id, materia_id, **capacidad_maxima** (= N del cupo) | FK → profesor, materia |
| `precio_clase` | precio → copiado a `turno.valor_clase_congelado` | FK → profesor_materia |
| `agenda_profesional` | profesor_id, hora_inicio, hora_fin (bloques de disponibilidad) | FK → agenda_semanal |
| `turno` | id, codigo, alumno_id, profesor_id, materia_id, fecha, hora_inicio, hora_fin, valor_clase_congelado, estado, observaciones, usuario_id, created_at | FK → alumno/profesor/materia/usuario |
| `auditoria` | registro de la reserva (usuario, fecha/hora, datos del turno) | lo escribe el back en el POST |

> **Cupos:** sin columna nueva. El back calcula `cuposDisponibles = capacidad_maxima − count(turno Reservado superpuesto)` por franja.
> **PENDIENTE CONTRATO:** `GET /api/turnos/franjas?profesorId=&materiaId=&fecha=` → `FranjaTurnoResponse[]` `{ horaInicio, horaFin, capacidad, cuposDisponibles, disponible, motivo? }`, y `GET /api/turnos/proxima-franja?profesorId=&materiaId=&desde=` (sugerencia).
> **PENDIENTE CONTRATO (opcional):** `POST /api/turnos/:id/enviar-comprobante` `{ destinatario: "alumno" | "responsable" }`.
> **Parámetro:** anticipación mínima = 2 h (`ANTICIPACION_MINIMA_HORAS`), parametrizable; el back es la fuente de verdad (`ANTICIPACION_INSUFICIENTE`).

## Componentes sugeridos (reuso)

| Pieza | Acción | Nota |
|---|---|---|
| `Sidebar`, `RequiereSesion` | Reusar | Patrón de página |
| `Input` (`type="search"`) | Reusar | Buscador de alumno + lista de resultados (listbox) |
| `Combobox` | Reusar | Materia y Profesor (con búsqueda) |
| `Input` `type="date"` | Reusar | `min` hoy / `max` hoy+60; se muestra dd/mm/aaaa en resumen |
| `Textarea` | Reusar | Observaciones con contador 0/250 |
| `Button` | Reusar | Reservar, Usar sugerencia, acciones del comprobante |
| `Modal` | Reusar | Modal de resumen (Confirmar / Cancelar) |
| `StatusBadge` / `TurnoCalendarioBadge` | Reusar | Estado "Reservado" (info azul) |
| `Toast` (`useToast`) | Reusar | "El horario ya no está disponible" + confirmación de email |
| `BuscadorAlumno` | **Crear** (`src/components/turnos/`) | Buscador por DNI/nombre/apellido/legajo, solo activos |
| `FranjasHorarias` | **Crear** | Grilla radiogroup de franjas con "Cupos disponibles X de N" |
| `ResumenReservaModal` | **Crear** | Sobre `Modal` |
| `ComprobanteTurno` | **Crear** | Comprobante imprimible (`print:`) |
| `ReservaTurnoModal` (calendario) | **Extender** | Pasa a navegar a `/turnos/reservas` con query params |

## Datos hardcodeados

Catálogos: `listarAlumnos({ busqueda, estado: "activo" })`, `listarMaterias({ estado: "activo" })`, `listarProfesores({ materiaId, estado: "activo" })` (ya existen en `src/data/`). Franjas y reserva: fixture nuevo en `src/data/turnos.ts`.

```ts
// src/data/turnos.ts (fixture — BACKEND: GET /api/turnos/franjas)
const franjas: FranjaTurnoResponse[] = [
  { horaInicio: "09:00", horaFin: "10:00", capacidad: 4, cuposDisponibles: 2, disponible: true },
  { horaInicio: "10:00", horaFin: "11:00", capacidad: 4, cuposDisponibles: 4, disponible: true },
  { horaInicio: "11:00", horaFin: "12:00", capacidad: 4, cuposDisponibles: 0, disponible: false, motivo: "SIN_CUPO" },
];

// Respuesta del POST (TurnoResponse del contrato)
const turno: TurnoResponse = {
  id: 123, codigo: "TUR-000123",
  alumno: { id: 1, legajo: "ALU-000001", nombre: "María", apellido: "López" },
  profesor: { id: 1, nombre: "Juan", apellido: "Pérez" },
  materia: { id: 1, nombre: "Matemática", nivel: "Secundario", duracionClaseMinutos: 60 },
  fecha: "2026-10-14", horaInicio: "10:00", horaFin: "11:00",
  valorClaseCongelado: 8500, estado: "Reservado", observaciones: null,
  registradoPor: { id: 2, nombre: "Laura", apellido: "Gómez" },
  fechaCreacion: "2026-09-23T14:32:00-03:00",
};
```

- Fixture: franjas cada 30 min dentro de los bloques del profesor, de duración = `duracionClaseMinutos`; algunas con cupo parcial, alguna sin cupo.
- Simulaciones: turno existente del alumno → `ALUMNO_CON_TURNO_SUPERPUESTO`; `?demo=concurrencia` → `SIN_CUPO` al confirmar ("El horario ya no está disponible" + recarga de franjas); `?demo=error` → error de carga.

## Estados

- [ ] Vacío: sin coincidencias de alumno ("No hay alumnos activos que coincidan"); profesor sin franjas en la fecha ("El profesor no tiene horarios libres ese día" + sugerencia del próximo libre).
- [ ] Cargando: catálogos, búsqueda de alumnos, franjas, confirmación (botón deshabilitado "Reservando…").
- [ ] Error: carga de catálogos/franjas con "Reintentar"; errores de negocio en rojo (`role="alert"`).
- [ ] Con datos: formulario completo → resumen → comprobante.

## Criterios de aceptación

- [ ] Buscador de alumno por DNI, nombre, apellido o legajo, coincidencia parcial, solo activos, obligatorio.
- [ ] Materia: combo de materias activas, obligatorio.
- [ ] Profesor: combo de profesores activos que dictan la materia elegida, obligatorio; deshabilitado sin materia.
- [ ] Fecha: no anterior a hoy, hasta 60 días hacia adelante, obligatoria; se muestra dd/mm/aaaa.
- [ ] Horario: franjas libres (disponibilidad − turnos reservados), duración según la materia, obligatorio.
- [ ] Cada franja muestra "Cupos disponibles X de N"; sin cupo → gris y no seleccionable.
- [ ] Franjas que no cumplen la anticipación mínima de 2 h (parametrizable) deshabilitadas con motivo.
- [ ] Superposición del alumno con otro turno → se rechaza y se muestra mensaje en rojo.
- [ ] Observaciones opcionales, máx. 250 caracteres con contador.
- [ ] Modal de resumen (alumno, materia, profesor, fecha, horario) con "Confirmar" y "Cancelar".
- [ ] Al confirmar: código TUR-000123 no editable, estado "Reservado" (azul).
- [ ] Concurrencia: `SIN_CUPO` → "El horario ya no está disponible" + actualización de franjas.
- [ ] Comprobante en pantalla con todos los datos del turno, incluido `valorClaseCongelado`.
- [ ] Bitácora: `// BACKEND:` en el POST indicando que se registra en `auditoria` (usuario, fecha, hora, datos).
- [ ] Deseable: sugerencia del próximo horario libre con botón "Usar".
- [ ] Deseable (`// OPCIONAL:`): imprimir comprobante (`window.print()`).
- [ ] Deseable (`// OPCIONAL:`): enviar comprobante por email al alumno o a su responsable.
- [ ] Acciones "Nueva reserva" y "Ver en calendario".
- [ ] El clic en "Disponible" de `/calendario` abre esta pantalla con profesor/fecha/horario precargados.
