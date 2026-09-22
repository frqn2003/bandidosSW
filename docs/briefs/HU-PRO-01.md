# HU-PRO-01: Como Gerente del centro, quiero registrar y editar la ficha de cada profesor con las materias que dicta y su disponibilidad horaria, para que Mesa de Entrada sepa en qué momentos cada profesor puede recibir alumnos y reserve clases sin superposiciones

## Contexto

- **Ruta propuesta:** `/profesores`
- **Relacionada con:** HU-MAT-01 (catálogo de materias), HU-USU-01 (usuarios del sistema, rol Profesor), HU-TUR-01 (registro de turnos: valida que la baja no tenga turnos futuros), HU-CAL-01 (vista de huecos disponibles)
- **Prioridad:** alta

## Wireframe (idea)

Pantalla única del módulo **Cuerpo Docente**. Layout general con sidebar fija (Sedes / Turnos y Agenda / Alumnos / Cuerpo Docente / Cobranzas / Usuarios / Reportes) + header de sesión. El contenido es un listado con filtros y los flujos de alta/edición/lectura/baja viven en modales.

### 1) Listado Cuerpo Docente

```
┌─────────────┬───────────────────────────────────────────────────────────────┐
│  SIDEBAR    │  Cuerpo Docente                          [+ Nuevo profesor]   │
│  (Sedes     ├───────────────────────────────────────────────────────────────┤
│   Buenos    │  [🔍 Buscar por nombre, apellido y especialidad  ] [Materia v] │
│   Aires)    │  [Día v] [Estado v] [Limpiar filtros]                          │
│  ▸ Turnos   ├───────────────────────────────────────────────────────────────┤
│  ▸ Alumnos  │  DOCENTE          MATERIAS        ESTADO  ACCIONES            │
│  ▾ Cuerpo   │  Peralta, Roberto Ap. Matemático  ● Activo  [👁][✏][🗓][⋮]    │
│    Docente  │  Vásquez, Elena   Física I · Física II  ● Activo [👁][✏][🗓][⋮]│
│  ▸ Cobranzas│  Menéndez, Gabriel Álgebra Lineal    ● Activo  [👁][✏][🗓][⋮] │
│  ▸ Usuarios │  Arrieta, Silvina Química General    🚫 Inactivo [👁][✏][🗓][⋮]│
│  ▸ Reportes ├───────────────────────────────────────────────────────────────┤
│             │  Mostrando 1-4 de 4 · [< Página 1 de N >] [Rows: 10 v]         │
└─────────────┴───────────────────────────────────────────────────────────────┘
```

- Solo activos por defecto; orden alfabético `Apellido, Nombre` A-Z.
- Fila de filtros **única** (desktop): buscador extensible (`flex-1`) + selects **Materia / Día / Estado** + botón **Limpiar filtros** siempre visible a la derecha del Estado.
  - Buscador parcial case-insensitive por nombre, apellido **o especialidad** (placeholder: "Buscar por nombre, apellido y especialidad").
  - **Limpiar filtros** resetea solo Materia / Día / Estado (deja el texto de búsqueda como está), sin engranaje de configuración ni chips.
  - En mobile los controles hacen wrap a todo el ancho.
- Columna Materias: lista las materias del profesor (badge materias + `+N` si sobran). Badge de estado Activo (verde) / Inactivo (gris).
- Acciones por fila: Ver, Editar, Ver agenda, Más (menú: baja).

### 2) Modal Nuevo Profesor

```
┌ 👤 Nuevo profesor   (MODO INSERCIÓN) ─────────────────────────── ✕ ┐
│ Completá la ficha profesional, materias asignadas y disponibilidad │
│ semanal.                                                            │
│ Usuario Asociado del Sistema*   [Combobox usuarios rol Profesor]   │
│   Nombre, Apellido y Email se vinculan automáticamente            │
│ Título o Especialidad        Teléfono Contacto*                    │
│ [Ing. en Sistemas           ] [11 5555 5555          ]              │
│ Capacidad Máxima de Alumnos*       ┌───────────────────────────┐  │
│ Capacidad por bloque lectivo       │ 4 alumnos (Por defecto) ▼ │  │
│ (1 = Clase individual,             └───────────────────────────┘  │
│  2-10 = grupal)                                                    │
│ Materias que Dicta* — elegí al menos 1 materia                     │
│   ☑ Análisis Matemático I   ☐ Física I                             │
│   ☐ Álgebra Lineal          ☑ Química General                      │
│   ☐ Programación I          …                                      │
│ Gestión de Disponibilidad Horaria Semanal*                         │
│   Total activo programado: 14.0 h semanales asignables             │
│ ┌ Lunes ▼ ┌De: 08:30 ▼ ┌A: 12:00 ▼  3.5 h            🗑           │
│ ┌ Martes ▼┌De: 08:00 ▼ ┌A: 10:00 ▼  2.0 h            🗑           │
│   [+ Agregar Bloque Horario]                                       │
│ Estado Inicial del Docente                                         │
│   Disponible para asignación de turnos        [Switch ● Activo]    │
│ * Campos obligatorios               [Cancelar] [Guardar y Habilitar│
└────────────────────────────────────────────────────────────────────┘
```

- Formulario único parametrizado por modo (INSERCION / EDICION). El badge de modo va **en el header del modal** (a la derecha del título), y en EDICION se suma el badge de estado del profesor.
- Bloque superior: Combobox de "Usuario Asociado del Sistema" (usuarios rol Profesor sin ficha). Al elegirlo, nombre, apellido y email quedan vinculados automáticamente.
- **Título o Especialidad** opcional (máx. 100) y **Teléfono** obligatorio (solo dígitos, 10-11) en grid de 2 columnas.
- **Capacidad Máxima de Alumnos**: bloque en una fila — texto descriptivo a la izquierda ("Capacidad por bloque lectivo: 1 = Clase individual, 2-10 = grupal") y select a la derecha con la opción actual etiquetada "(Por defecto)". Rango 1-10.
- **Materias que Dicta**: lista de checkboxes del catálogo activo (grid 2 columnas), contador "N materias seleccionadas", mínimo 1. No se muestra duración de clase en el checkbox.
- **Disponibilidad**: franjas en línea — select de **día (Lunes–Sábado)** + "De:" + "A:" con horas de 30 min + duración calculada + botón 🗑 a la derecha (contra la esquina del bloque). Botón "+ Agregar Bloque Horario" y total "X.X h semanales asignables" en vivo.
- Estado por Switch (Activo/Inactivo), default Activo, con texto contextual.
- Validación por campo con error en rojo bajo cada input (teléfono, materias ≥1, horarios válidos y sin solapamiento).

### 3) Modal Lectura (Ver ficha)

```
┌ Perfil del docente ───────────────────────────────────────────── ✕ ┐
│ [Avatar RP]  Roberto Peralta    ● Activo    [+ Nueva clase]        │
│  Profesor  ·  Titular de Análisis Matemático I                     │
│  📞 11 5555 5555  ·  usuario.peralta@sistema.edu                   │
│ Materias (3) · Capacidad: 5 alumnos máximo                        │
│   [Análisis Matemático I] [Física I] [Álgebra Lineal]             │
│ Agenda del profesor (vista semanal resumida, 1 hora asignable/día) │
│ ┌ LUN ┬ MAR ┬ MIE ┬ JUE ┬ VIE ┬ SAB ┐  [Ver agenda completa →]    │
│ │## # │## # │## # │## # │## # │## # │                             │
│ └─────┴─────┴─────┴─────┴─────┴─────┘                              │
│ Datos del sistema · Creado: 15/03/2024 · Última modificación…     │
│ [Editar] [Ver agenda] [＋ Disponibilidad]                          │
└───────────────────────────────────────────────────────────────────┘
```

### 4) Modal Editar

```
┌ ✏️ Editar profesor   (MODO EDICIÓN) (● Activo) ──────────────── ✕ ┐
│ Modificá datos profesionales, materias asignadas o disponibilidad │
│ horaria de Roberto Peralta.                                        │
│ Usuario Asociado del Sistema*                                     │
│ ┌ 🔒 Bloqueado por integridad de identidad ───────────────────┐   │
│ │ (RP) Lic. en Matemática — Roberto Peralta                    │   │
│ │      (r.peralta@sistema.edu)                                 │   │
│ └──────────────────────────────────────────────────────────────┘   │
│ Título o Especialidad        Teléfono Contacto*                    │
│ [Lic. en Matemática         ] [11 5555 5555          ]              │
│ Capacidad Máxima de Alumnos*       ┌───────────────────────────┐  │
│ Capacidad por bloque lectivo       │ 5 alumnos (Por defecto) ▼ │  │
│ (1 = Clase individual,             └───────────────────────────┘  │
│  2-10 = grupal)                                                    │
│ Materias que Dicta — 2 materias seleccionadas                      │
│   ☑ Análisis Matemático I   ☐ Física I                             │
│   ☑ Álgebra Lineal          ☐ Química General                      │
│   Si retiras materias con turnos asignados, solicitará reasignación│
│ Gestión de Disponibilidad Horaria Semanal*                         │
│   Total activo programado: 14.0 h semanales asignables             │
│ ┌ Lunes ▼ ┌De: 08:30 ▼ ┌A: 12:00 ▼  3.5 h            🗑           │
│ ┌ Martes ▼┌De: 08:00 ▼ ┌A: 10:00 ▼  2.0 h            🗑           │
│   [+ Agregar Bloque Horario]                                       │
│ Estado del Profesor                                                │
│   Habilitado para Turnos                          [Switch ● Activo]│
│ [Dar de Baja Profesor...]          [Cancelar] [Guardar]            │
└────────────────────────────────────────────────────────────────────┘
```

- Igual que Nuevo, con datos precargados y legibilidad idéntica.
- **Usuario asociado bloqueado** (icono 🔒 + "Bloqueado por integridad de identidad"): la identidad es el `usuario_id`, único; nombre, apellido y email vienen del usuario vinculado y no se editan aquí.
- Footer con acción destructiva **"Dar de Baja Profesor..."** a la izquierda + Cancelar + Guardar.
- Estado con texto contextual según valor: "Habilitado para Turnos" (activo) / equivalente inactivo.

### 5) Modal Modificar Bloques (disponibilidad)

```
┌ ✏️ Modificar Bloques de Disponibilidad — Peralta, Roberto ────── ✕ ┐
│ Edita los bloques horarios ya cargados. La alta de nuevos bloques  │
│ se hace desde Editar Profesor.                                      │
│ Total activo programado: 14.0 h semanales asignables                │
│ ┌ Lunes ▼ ┌De: 08:30 ▼ ┌A: 12:00 ▼  3.5 h            🗑           │
│ ┌ Martes ▼┌De: 08:00 ▼ ┌A: 10:00 ▼  2.0 h            🗑           │
│ [Cancelar] [Guardar bloques]                                       │
└────────────────────────────────────────────────────────────────────┘
```

- Se abre desde el botón **"Modificar Bloques"** de la agenda semanal. Reemplaza a la matriz de 30 minutos.
- Edita **solo los bloques ya cargados** del profesor, con la **misma UI de franjas del formulario** (select día Lunes–Sábado + "De:"/"A:" cada 30 min + duración calculada + 🗑 en la esquina).
- **Sin superposiciones**: si dos franjas del mismo día se pisan o la hora fin no es posterior al inicio, el error en rojo aparece bajo la franja y **no se guarda** (misma regla que el form).
- **No permite agregar bloques nuevos** aquí: para alta se usa el formulario (Nuevo/Editar Profesor). Si el profesor no tiene bloques, el modal lo avisa.
- Total "X.X h semanales asignables" en vivo.

### 6) Modal Agenda semanal (lectura)

```
┌ Agenda semanal — Elena Vásquez ✕ ┐
│ Lunes 08:00-10:00 · 12:00-14:30   │
│ Martes 08:00-12:00                │
│ Miércoles —                       │
│ …                                  │
│ Total activo programado: 14:00 h  │
└───────────────────────────────────┘
```

- Grilla Lun–Sáb por franjas de 1.5 h (08:30 / 10:00 / 14:00 / 16:00), con turnos asignados (alumno, materia, cupos), celdas "＋ Libre" cuando hay disponibilidad sin turno, y **"No asignado"** en las celdas vacías (días sin disponibilidad o fuera de franja).

### 7) Modal Confirmar baja

```
┌ Dar de baja a Roberto Peralta? ──────────────────────────────── ✕ ┐
│ Al confirmar, el docente queda inactivo y no podrá recibir       │
│ nuevas clases.                                                    │
│ ⚠ Tiene 3 turnos futuros reservados (los podrá tomar otro prof).  │
│ [Volver] [Confirmar baja]                                        │
└───────────────────────────────────────────────────────────────────┘
```

- Baja **lógica** (estado → inactivo). Si hay turnos futuros no cancelados, se muestra la cantidad y se bloquea la baja (no se puede dar de baja con turnos futuros).
- Dado de baja → desaparece del listado por defecto (solo visible con filtro Inactivos/Todos), solo conserva Ver.

## User flow

1. **¿De dónde viene?** Del menú lateral "Cuerpo Docente" (`/profesores`), o de cross-navegación desde Turnos/Agenda al ver a qué profesor queda asignada una materia o un turno.
2. **¿Qué quiere hacer?** Altas (Nuevo profesor), Editar ficha, Ver disponibilidad/bloques, Ver agenda, Dar de baja.
3. **¿A dónde quiere llegar?** A una ficha de profesor correcta y actualizada (materias + capacidad + disponibilidad) que Mesa de Entrada use para reservar clases sin superposiciones. El alta termina con toast de éxito y el listado refrescado; la baja lógica vuelve al listado sin el profesor activo.

## Fuente de datos (BD)

Tablas del esquema (`docs/esquema-bd-front.md`) que alimentan la pantalla:

| Tabla | Campos usados | Relación clave |
|---|---|---|
| `profesor` | id, usuario_id, titulo_especialidad, telefono, estado, created_at, updated_at | FK → `usuario.id` (1 a 1, UNIQUE) |
| `usuario` | id, nombre, apellido, email, academia_id, fecha_creacion | rol_id → `rol` ("Profesor") |
| `profesor_materia` | id, profesor_id, materia_id, capacidad_maxima | FK → `profesor.id` · FK → `materia.id` (N a N) |
| `materia` | id, nombre, nivel, duracion_clase_minutos, descripcion | catálogo global activo (solo de catálogo activo) |
| `agenda_profesional` | id, agenda_semanal_id, profesor_id, hora_inicio, hora_fin, estado | FK → `agenda_semanal.id` · FK → `profesor.id` (disponibilidad, bloques 30 min) |
| `agenda_semanal` | id, dia_semana (1-6), hora_inicio, hora_fin | FK → `agenda.id` (horario de atención de la sede) |
| `turno` | id, alumno_id, profesor_id, materia_id, fecha, hora_inicio, estado | FK → `profesor.id` (para bloqueo de baja con turnos futuros) |
| `auditoria` | tabla, operacion, registro_id, usuario_id, valores_anteriores, valores_nuevos, fecha_hora | bitácora automática por trigger sobre `profesor`, `profesor_materia` y `agenda_profesional` |

> **Notas de esquema:**
> - **NO existe legajo de profesor** (solo `alumno.legajo`, `'ALU-' || lpad(id,6,'0')`). El identificador de la ficha es `profesor.id`; la ficha muestra nombre/apellido y rol del `usuario` asociado. Sacado del diseño el "Legajo #DOC-0941" de los mockups.
> - La capacidad global `capacidad_maxima_alumnos` figura en un CHECK (`ck_profesor_capacidad` 1-10) pero la columna **no existe** en el dump (inconsistencia detectada). El rango 1-10 del criterio proviene de ese CHECK huérfano: `profesor_materia.capacidad_maxima` sí existe pero **sin CHECK propio** en el dump. El front usa `profesor_materia.capacidad_maxima`; verificar con DBA si la capacidad global va en `profesor` o se descarta, y si el rango 1-10 aplica como validación front mientras tanto.
> - Disponibilidad: los bloques caen dentro del horario de `agenda_semanal` de la academia (definido por la sede). Los límites del rango se toman de esa franja.
> - Días 1-6 = lunes a sábado (ISO).

## Datos hardcodeados

Tipos placeholder en `src/data/profesores.ts` (camelCase; el backend pasa a snake_case del esquema). `id` numérico = PK real. Usuarios candidatos: rol "Profesor" activos y sin ficha de profesor (por `usuario.rol_id`).

```ts
// src/data/profesores.ts (borrador)
type MateriaRef = { id: number; nombre: string; duracionClaseMinutos: 30 | 45 | 60 | 90 | 120 };

type Profesor = {
  id: number;              // profesor.id (PK)
  usuarioId: number;       // FK usuario.id (rol Profesor, sin ficha ya)
  nombre: string;
  apellido: string;
  email: string;
  tituloEspecialidad?: string;         // varchar(100)
  telefono: string;                    // ^[0-9]{10,11}$
  materias: { materia: MateriaRef; capacidadMaxima: number }[];  // profesor_materia (1..10)
  diaSemana: number;                   // resumen de disponibilidad (1-6) para columna
  estado: "activo" | "inactivo";
  fechaCreacion: string;               // usuario.fecha_creacion (para "Alta en sistema")
};

const PROFESORES: Profesor[] = [
  {
    id: 1, usuarioId: 11,
    nombre: "Roberto", apellido: "Peralta",
    email: "r.peralta@sistema.edu", tituloEspecialidad: "Lic. en Matemática",
    telefono: "1155555555",
    materias: [
      { materia: { id: 1, nombre: "Análisis Matemático I", duracionClaseMinutos: 90 }, capacidadMaxima: 5 },
      { materia: { id: 3, nombre: "Álgebra Lineal", duracionClaseMinutos: 90 }, capacidadMaxima: 5 },
    ],
    diaSemana: 1, estado: "activo", fechaCreacion: "2024-03-15",
  },
  // ... Elena Vásquez (Física I · Física II), Gabriel Menéndez (Álgebra Lineal),
  //     Silvina Arrieta (Química General, inactivo)
];
```

```ts
// src/data/agendaProfesional.ts (borrador)
type Bloque = { id: number; diaSemana: number; horaInicio: string; horaFin: string };  // hora "HH:MM", múltiplos de 30

const AGENDA_PROFESIONAL: Bloque[] = [
  { id: 1, diaSemana: 1, horaInicio: "08:00", horaFin: "10:00" },  // Lunes Roberto Peralta
  { id: 2, diaSemana: 1, horaInicio: "12:00", horaFin: "15:00" },
  { id: 3, diaSemana: 2, horaInicio: "08:00", horaFin: "12:00" },
  // ...
];
```

Catálogo de materias (para el Combobox) desde `materia` (solo activas): Análisis Matemático I (id 1, Uni, 90'), Física I (id 2, Uni, 90'), Física II (id 4), Álgebra Lineal (id 3), Química General (id 5).

Turnos futuros (para validar la baja): ejemplo con `turno.fecha >= hoy` y `estado = 'Reservado'` para Roberto Peralta → 3 turnos que bloquean la baja.

## Estados

- [ ] **Vacío** — listado sin profesores → estado vacío con CTA "Nuevo profesor"
- [ ] **Cargando** — esqueleto/loader en tabla; placeholder en secciones Materias / Agenda del modal Ver
- [ ] **Error** — listado y formulario: banner de error + errores por campo en rojo (teléfono, materias, capacidad) + toast de error en acciones (Guardar, dar de baja)
- [ ] **Con datos** — activos por defecto; inactivos solo si el filtro los incluye

## Criterios de aceptación

### Obligatorios (HU-PRO-01)
- [ ] Formulario único parametrizado por modo (INSERCION / EDICION). El badge de modo (MODO INSERCIÓN / MODO EDICIÓN) se muestra en el header del modal a la derecha del título; en edición, también el badge de estado del profesor.
- [ ] Campo "Usuario asociado" (Combobox) sobre usuarios con rol Profesor **sin ficha de profesor** (activar al crear): al tener ya ficha o estar inactivo, no listar. En edición, bloqueado con 🔒 "por integridad de identidad".
- [ ] Título/Especialidad opcional, máximo 100 caracteres.
- [ ] Teléfono obligatorio, solo dígitos, 10 a 11 caracteres.
- [ ] Materias: **checkbox list** del catálogo activo (grid 2 columnas) con contador "N materias seleccionadas", mínimo 1 obligatoria. No se muestra duración por materia en la selección.
- [ ] Capacidad Máxima de Alumnos: select global (1-10) con opción actual etiquetada "(Por defecto)", en fila con el texto "Capacidad por bloque lectivo (1 = Clase individual, 2-10 = grupal)" a la izquierda y el select a la derecha. Se aplica como capacidad por materia al crear.
- [ ] Estado por Switch (Activo/Inactivo), default Activo, con texto contextual.
- [ ] Disponibilidad por **franjas en línea**: select de día (Lunes–Sábado, 1-6 ISO) + hora De/A en bloques de 30 min + duración calculada + botón 🗑 a la derecha; "+ Agregar Bloque Horario" y total en vivo "X.X h semanales asignables". El horario cae dentro del rango de atención de la sede.
- [ ] En disponibilidad: hora fin siempre posterior a hora inicio; franjas sin superposición en el mismo día; ante inválido, error rojo bajo la franja. Mínimo 1 bloque semanal activo.
- [ ] "Modificar Bloques" (desde la agenda) abre un editor que **modifica solo los bloques existentes** con la misma UI de franjas del formulario y las mismas validaciones de superposición; no agrega bloques nuevos.
- [ ] Agenda semanal: celdas sin turno ni disponibilidad muestran **"No asignado"** en vez de quedar vacías.
- [ ] Baja **lógica**: modal de confirmación → estado inactivo. **Bloqueada si hay turnos futuros no cancelados** (muestra la cantidad); no desaparece del historial.
- [ ] Listado: solo activos por defecto, orden Apellido + Nombre A-Z.
- [ ] Filtros en fila única: buscador case-insensitive por nombre/apellido/especialidad + selects Materia / Día / Estado + botón **Limpiar filtros** (resetea solo Materia/Día/Estado, conserva la búsqueda).
- [ ] Cada alta/editación/baja registra bitácora (via `auditoria` con valores anteriores/nuevos).
- [ ] Comentarios `// BACKEND:` en cada integración (fetch a `/api/profesores`, POST/PUT/PATCH/DELETE, catálogos de materia/usuario) según `grep -rn "BACKEND"`.

### Opcionales
- [ ] Vista gráfica semanal (matriz) en la ficha del profesor.
- [ ] Badge verde/gris de disponibilidad por día.
- [ ] Exportación a Excel/PDF del listado.