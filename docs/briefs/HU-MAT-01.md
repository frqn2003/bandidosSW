# HU-MAT-01: Alta, Edición y Baja de Materias

> **Historia de Usuario:** Como gerente del centro, quiero registrar, editar y desactivar las materias que se dictan en el centro, con su nivel, duración de clase y valor, para poder asignarlas a los profesores, reservar turnos y calcular el importe de cada clase.

---

## Contexto

- **Ruta propuesta:** `/materias`
- **Módulo:** Gestión de Profesores, Materias y Disponibilidad
- **Prioridad:** Alta (Catálogo maestro del cual dependen Profesores, Turnos y Liquidaciones)
- **Relacionada con:**
  - `HU-PROF-01` / `/profesores` (Asignación de materias dictadas por profesor)
  - `HU-TUR-01` / `/turnos` (Reserva de turnos con cálculo de duración y precio de clase)
  - `HU-CAL-01` / `/calendario` (Bloques horarios de clases)
- **Contrato técnico:** [`src/contracts/materia.ts`](../../src/contracts/materia.ts) / Guía [`docs/contratos/materia.md`](../contratos/materia.md)

---

## User Flow 

1. **Acceso al Catálogo:** El usuario ingresa a `/materias` desde la barra de navegación principal o menú lateral.
2. **Visualización y Búsqueda:** Ve la tabla de materias activas ordenadas alfabéticamente (A-Z), puede buscar por nombre o filtrar por nivel (Primario, Secundario, Universitario) y estado (Activo, Inactivo, Todos).
3. **Acciones Disponibles:**
   - **Crear Materia:** Clic en botón principal `+ Nueva Materia` → Abre Modal en **Modo Inserción**.
   - **Ver Detalle:** Clic en la fila o en botón `Ver / Inspeccionar` → Abre Modal en **Modo Lectura** (todos los campos bloqueados en gris, sin botón guardar).
   - **Editar Materia:** Clic en acción `Editar` → Abre Modal en **Modo Edición** (permite modificar datos y precio; informa que el cambio de precio rige hacia adelante).
   - **Dar de Baja:** Clic en acción `Desactivar / Dar de baja` → Abre `ConfirmarDialog` con aviso destructivo.

---

## Wireframe (Layout y Componentes)

### 1. Pantalla Principal (`/materias`)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  HUELLITAS / BANDIDOS SW      [ Materias ]  [ Profesores ]  [ Turnos ]   (Usuario)│
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Gestión de Materias                                                             │
│  Administrá las asignaturas, niveles, duraciones y aranceles base de las clases. │
│                                                                                  │
│  ┌──────────────────────────────────────────────┐ ┌───────────────┐ ┌──────────┐ │
│  │ 🔍 Buscar por nombre o descripción...        │ │ Nivel: [Todos]▼│ │Est:[Act]▼│ │
│  └──────────────────────────────────────────────┘ └───────────────┘ └──────────┘ │
│                                                      [ + Nueva Materia (CTA) ]   │
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │ NOMBRE           │ NIVEL        │ DURACIÓN │ VALOR CLASE │ ESTADO   │ ACC. │  │
│  ├──────────────────┼──────────────┼──────────┼─────────────┼──────────┼──────┤  │
│  │ Álgebra I        │ Universitario│  90 min  │  $ 12.500,00│ [Activo] │ 👁 ✏ 🗑│  │
│  │ Biología         │ Secundario   │  60 min  │  $  8.500,00│ [Activo] │ 👁 ✏ 🗑│  │
│  │ Física Cuántica  │ Universitario│ 120 min  │  $ 15.000,00│ [Activo] │ 👁 ✏ 🗑│  │
│  │ Matemática       │ Primario     │  45 min  │  $  6.000,00│ [Activo] │ 👁 ✏ 🗑│  │
│  │ Química Orgánica │ Secundario   │  60 min  │  $  8.500,00│ [Inactiva│ 👁 ✏ ↺│  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
│  Mostrando 1-5 de 12 materias                           [ < ] [ 1 ] [ 2 ] [ > ]  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 2. Modal de Formulario (Parametrizado en 3 Modos)

```
┌────────────────────────────────────────────────────────┐
│  [ Nueva Materia | Editar Materia | Detalle de Materia ] [X]│
├────────────────────────────────────────────────────────┤
│  Nombre de la Materia (*)                              │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Matemática Avanzada                              │  │
│  └──────────────────────────────────────────────────┘  │
│  (Error en rojo si duplicada: "Ya existe una materia activa...")│
│                                                        │
│  Nivel Educativo (*)            Duración de Clase (*)  │
│  ┌─────────────────────────┐    ┌────────────────────┐ │
│  │ Secundario            ▼ │    │ 60 minutos       ▼ │ │
│  └─────────────────────────┘    └────────────────────┘ │
│                                                        │
│  Valor por Clase ($ ARS) (*)    Estado                 │
│  ┌─────────────────────────┐    ┌────────────────────┐ │
│  │ 8.500,00                │    │ [●] Activo         │ │
│  └─────────────────────────┘    └────────────────────┘ │
│  ℹ Los cambios de valor aplican solo a turnos futuros.  │
│                                                        │
│  Descripción (Opcional - Máx 250 caracteres)           │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Preparación para exámenes y apoyo escolar.       │  │
│  └──────────────────────────────────────────────────┘  │
│  180/250 caracteres                                    │
├────────────────────────────────────────────────────────┤
│  (Modo Lectura: sin botón Guardar, campos disabled)    │
│                               [ Cancelar ] [ Guardar ] │
└────────────────────────────────────────────────────────┘
```

### 3. Modal de Confirmación de Baja Lógica (`ConfirmarDialog`)

```
┌────────────────────────────────────────────────────────┐
│  ¿Desactivar Materia?                              [X] │
├────────────────────────────────────────────────────────┤
│  ¿Estás seguro de que querés desactivar "Matemática"?  │
│  La materia dejará de estar disponible para nuevos     │
│  turnos y asignaciones de profesores.                  │
├────────────────────────────────────────────────────────┤
│                        [ Cancelar ]  [ Confirmar Baja ]│
│                                      (Botón Rojo)      │
└────────────────────────────────────────────────────────┘
```

---

## Fuente de Datos (Esquema BD y Contratos)

| Tabla | Campos Usados | Relación / Validación Clave |
|---|---|---|
| `materia` | `id`, `nombre`, `nivel`, `descripcion`, `duracion_clase_minutos`, `valor_clase`, `estado`, `created_at`, `updated_at` | Catálogo global. `uq_materia_nombre_activa` (Nombre único entre activas). |
| `profesor_materia` | `profesor_id`, `materia_id` | Restricción: No se puede inactivar si está asignada (`MATERIA_ASIGNADA`). |
| `turno` | `id`, `materia_id`, `fecha`, `hora_inicio`, `hora_fin`, `valor_clase_congelado` | Restricción: No se puede inactivar si tiene turnos futuros (`MATERIA_CON_TURNOS_FUTUROS`). |
| `bitacora` / `auditoria` | `tabla`, `operacion`, `registro_id`, `datos_antes`, `datos_despues`, `usuario_id` | Registra cambios de `valor_clase`, alta y baja lógica. |

---

## Datos Hardcodeados de Ejemplo (Fixtures para Front)

```ts
import type { MateriaResponse } from "@/contracts/materia";

export const MATERIAS_FIXTURE: MateriaResponse[] = [
  {
    id: 1,
    nombre: "Matemática",
    nivel: "Secundario",
    descripcion: "Álgebra, geometría y preparación para exámenes de ingreso.",
    duracionClaseMinutos: 60,
    valorClase: 8500.0,
    estado: "activo",
    fechaCreacion: "2026-03-01T10:00:00.000Z",
    fechaActualizacion: "2026-03-01T10:00:00.000Z",
  },
  {
    id: 2,
    nombre: "Física Cuántica I",
    nivel: "Universitario",
    descripcion: "Mecánica cuántica y física moderna para carreras de grado.",
    duracionClaseMinutos: 120,
    valorClase: 16000.0,
    estado: "activo",
    fechaCreacion: "2026-03-02T14:30:00.000Z",
    fechaActualizacion: "2026-03-05T09:15:00.000Z",
  },
  {
    id: 3,
    nombre: "Lectoescritura Inicial",
    nivel: "Primario",
    descripcion: "Apoyo escolar integral para 1° y 2° ciclo.",
    duracionClaseMinutos: 45,
    valorClase: 6000.0,
    estado: "activo",
    fechaCreacion: "2026-03-05T11:00:00.000Z",
    fechaActualizacion: "2026-03-05T11:00:00.000Z",
  },
  {
    id: 4,
    nombre: "Química Orgánica",
    nivel: "Secundario",
    descripcion: "Laboratorio y formulación química.",
    duracionClaseMinutos: 90,
    valorClase: 10500.0,
    estado: "inactivo",
    fechaCreacion: "2026-02-15T08:00:00.000Z",
    fechaActualizacion: "2026-03-10T16:20:00.000Z",
  },
  {
    id: 5,
    nombre: "Inglés Técnico",
    nivel: "Universitario",
    descripcion: "Lectura y comprensión de textos científicos y técnicos.",
    duracionClaseMinutos: 60,
    valorClase: 9500.0,
    estado: "activo",
    fechaCreacion: "2026-03-12T17:00:00.000Z",
    fechaActualizacion: "2026-03-12T17:00:00.000Z",
  },
];
```

---

## Componentes UI a Reutilizar (`src/components/ui/`)

- `Modal.tsx`: Ventana modal para el formulario en sus 3 modos.
- `ConfirmarDialog.tsx`: Modal para confirmación de baja lógica con botón rojo destructivo.
- `Input.tsx`: Campo de texto para Nombre y Valor por clase (con prefijo `$`).
- `Textarea.tsx`: Campo para Descripción con contador de caracteres (0/250).
- `Select.tsx`: Desplegable para Nivel (`Primario`, `Secundario`, `Universitario`) y Duración (`30`, `45`, `60`, `90`, `120` min).
- `StatusBadge.tsx`: Indicador visual de estado (Verde: Activo, Gris: Inactivo).
- `Pagination.tsx`: Control de paginación de la tabla.
- `Toast.tsx`: Mensajes flotantes de feedback tras crear, editar o inactivar.

---

## Estados de la Pantalla

- [x] **Cargando:** Skeleton shimmer sobre la tabla y filtros mientras se obtienen los datos.
- [x] **Vacío:** Mensaje amigable e ilustración/ícono cuando no hay materias cargadas o no hay resultados para los filtros aplicados.
- [x] **Error:** Banner de alerta en caso de falla de red o error de servidor.
- [x] **Con datos:** Tabla interactiva con ordenamiento, filtros, badges y acciones por fila.

---

## Criterios de Aceptación

### Obligatorios
- [ ] **Modos del Formulario:** Un único componente modal parametrizado para `INSERCIÓN`, `EDICIÓN` y `LECTURA`. En modo LECTURA todos los controles están bloqueados (`disabled`), con fondo gris claro y el botón "Guardar" está oculto.
- [ ] **Campos y Validaciones:**
  - `Nombre`: Obligatorio, máx 80 caracteres. Validación de unicidad contra materias activas (`NOMBRE_DUPLICADO`).
  - `Nivel`: Obligatorio (`Primario`, `Secundario`, `Universitario`).
  - `Descripción`: Opcional, máx 250 caracteres con contador de longitud.
  - `Duración de clase`: Obligatorio, opciones cerradas: `30`, `45`, `60`, `90`, `120` minutos.
  - `Valor por clase`: Obligatorio, numérico decimal positivo (`> 0`) con 2 decimales, formateado en moneda local.
  - `Estado`: Booleano / Enum (`activo` / `inactivo`), por defecto `activo`.
- [ ] **Manejo de Errores Específicos:** Si el nombre ya existe entre materias activas, se marca el input en rojo y se muestra el mensaje específico debajo del campo.
- [ ] **Regla de Precio Hacia Adelante:** La edición del valor de la clase incluye un texto aclaratorio ("Rige solo para futuros turnos").
- [ ] **Baja Lógica y Confirmación:** La eliminación se realiza mediante confirmación modal (`ConfirmarDialog`). Si la materia tiene turnos futuros (`MATERIA_CON_TURNOS_FUTUROS`) o profesores asignados (`MATERIA_ASIGNADA`), el sistema bloquea la baja y muestra el motivo claro.
- [ ] **Listado y Filtros:**
  - Filtro por defecto: solo materias activas.
  - Orden alfabético por nombre (A-Z).
  - Filtro combinable por Nivel y Estado (Activas, Inactivas, Todas).
  - Buscador en tiempo real por Nombre (coincidencia parcial insensible a mayúsculas/minúsculas).
- [ ] **Preparación para Backend:** Inclusión de comentarios `// BACKEND:` en cada interacción API (`GET /api/materias`, `POST /api/materias`, `PUT /api/materias/:id`, `POST /api/materias/:id/inactivar`).

### Opcionales / Deseables
- [ ] Badges de estado con colores semánticos (`StatusBadge`: Activa en verde, Inactiva en gris).
- [ ] Contador de profesores asignados por cada materia en la tabla.
- [ ] Botón de exportación rápida a formato CSV / Excel.
