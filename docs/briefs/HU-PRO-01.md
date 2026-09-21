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
│   Buenos    │  [🔍 Buscar por nombre, apellido o título         ] [Materia v]│
│   Aires)    │  [Día v] [Estado v(Activos|Inactivos|Todos)]                  │
│  ▸ Turnos   ├───────────────────────────────────────────────────────────────┤
│  ▸ Alumnos  │  DOCENTE          MATERIAS        ESTADO  ACCIONES            │
│  ▾ Cuerpo   │  Peralta, Roberto Ap. Matemático  ● Activo  [👁][✏][🗓][⋮]    │
│    Docente  │  Vásquez, Elena   Física I · Física II  ● Activo [👁][✏][🗓][⋮]│
│  ▸ Cobranzas│  Menéndez, Gabriel Álgebra Lineal    ● Activo  [👁][✏][🗓][⋮] │
│  ▸ Usuarios │  Arrieta, Silvina Química General    🚫 Inactivo [👁][✏][🗓][⋮]│
│  ▸ Reportes ├───────────────────────────────────────────────────────────────┤
│             │  Filtros: Materia Algebra | Día: Lunes            [BORRAR]     │
│             │  Mostrando 1-4 de 4 · [< Página 1 de N >] [Rows: 10 v]         │
└─────────────┴───────────────────────────────────────────────────────────────┘
```

- Solo activos por defecto; orden alfabético `Apellido, Nombre` A-Z.
- Buscador parcial case-insensitive (nombre, apellido o título).
- Filtros combinables: Materia / Día / Estado; los chips activos se pueden borrar.
- Columna Materias: lista las materias del profesor (badge materias + `+N` si sobran). Badge de estado Activo (verde) / Inactivo (gris).
- Acciones por fila: Ver, Editar, Ver agenda, Más (menú: copiar disponibilidad, baja).

### 2) Modal Nuevo Profesor

```
┌ Nuevo profesor ──────────────────────────────────────────────── ✕ ┐
│ Usuario asociado*  [Combobox de usuarios rol Profesor sin ficha]  │
│ Título (opcional) [Ing. en Sistemas              ]                 │
│ Teléfono*         [11 5555 5555]  (solos dígitos, 10-11)          │
│ Materias* (1+)    [Combobox materia] [+ Agregar]                  │
│   Análisis Matemático I   Capacidad [5]  ✕                        │
│   Física I                Capacidad [3]  ✕                        │
│ Capacidad máxima alum.*   [3]  ← global (1 a 10)                  │
│ Estado  [● Activo] (Switch)                                       │
│ [Cancelar] [Guardar]                                             │
└───────────────────────────────────────────────────────────────────┘
```

- Formulario único parametrizado por modo (INSERCION / EDICION / LECTURA). En lectura, campos grises y sin botones Guardar.
- Validación por campo con error en rojo bajo cada input (teléfono 10-11 dígitos, ≥1 materia, capacidad 1-10).

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

Igual que Nuevo, con datos precargados y legibilidad idéntica; usuario asociado bloqueado (la identidad es el `usuario_id`, único).

### 5) Modal Matriz semanal (Disponibilidad)

```
┌ Disponibilidad semanal — Roberto Peralta ─────────────────────── ✕ ┐
│ [Copiar día: Lun → a SAS Aplicar]        LUN 08:00-20:00           │
│ HORA │ LUN        MAR …          SAB                                 │
│ 08:00│ ██         ██            ██                                  │
│ 08:30│ ██         ██            ██                                  │
│ 09:00│ ██                        ██                                  │
│ ……
│ 20:00│                                                  Δ Δ          │
│ Andando: 14 bloques activos                                          │
│ [Cancelar] [Guardar disponibilidad]                                 │
└─────────────────────────────────────────────────────────────────────┘
```

- Grilla lunes a sábado, bloques de 30 minutos, dentro del horario de atención de la sede (08:00-20:00 en el ejemplo).
- Click en celda = alternar bloque (disponible/no). Click+arrastre = pintar rango. "Copiar a" duplica un día entero.
- Bloque inválido (fin ≤ inicio o superpuesto) se marca en rojo sobre la celda con tooltip. Mínimo 1 bloque semanal obligatorio.

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
2. **¿Qué quiere hacer?** Altas (Nuevo profesor), Editar ficha, Ver disponibilidad/matriz, Ver agenda, Dar de baja.
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
- [ ] Formulario único parametrizado por modo (INSERCION / EDICION / LECTURA): en lectura los campos están grises y no hay Guardar.
- [ ] Campo "Usuario asociado" (Combobox) sobre usuarios con rol Profesor **sin ficha de profesor** (activar al crear): al tener ya ficha o estar inactivo, no listar.
- [ ] Título/Especialidad opcional, máximo 100 caracteres.
- [ ] Teléfono obligatorio, solo dígitos, 10 a 11 caracteres.
- [ ] Materias: múltiple desde catálogo activo, mínimo 1 obligatoria; cada materia asignada con capacidad máxima 1-10 (capacidad por materia, `profesor_materia.capacidad_maxima`).
- [ ] Estado por Switch (Activo/Inactivo), default Activo.
- [ ] Disponibilidad: grilla lunes a sábado en bloques de 30 min (día 1-6 ISO); el horario cae dentro del rango de atención de la sede.
- [ ] En disponibilidad: hora fin siempre posterior a hora inicio; bloques sin superposición; ante superposición/inválido, error rojo sobre el bloque. Mínimo 1 bloque semanal activo.
- [ ] Baja **lógica**: modal de confirmación → estado inactivo. **Bloqueada si hay turnos futuros no cancelados** (muestra la cantidad); no desaparece del historial.
- [ ] Listado: solo activos por defecto, orden Apellido + Nombre A-Z.
- [ ] Filtros combinables: Materia / Día / Estado; buscador parcial case-insensitive (nombre, apellido o título).
- [ ] Cada alta/editación/baja registra bitácora (via `auditoria` con valores anteriores/nuevos).
- [ ] Comentarios `// BACKEND:` en cada integración (fetch a `/api/profesores`, POST/PUT/PATCH/DELETE, catálogos de materia/usuario) según `grep -rn "BACKEND"`.

### Opcionales
- [ ] Vista gráfica semanal (matriz) en la ficha del profesor.
- [ ] Badge verde/gris de disponibilidad por día.
- [ ] Exportación a Excel/PDF del listado.
- [ ] Copiar disponibilidad de un día a otro(s).