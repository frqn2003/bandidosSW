# HU-MAT-01: Como Gerente del centro, quiero registrar, editar y desactivar las materias que se dictan, con su nivel, duración de clase y valor, para poder asignarlas a los profesores, reservar turnos y calcular el importe de cada clase

> Generado con /brief. Revisar y ajustar antes de /disenar.

## Contexto

- **Ruta propuesta:** `/materias`
- **Relacionada con:** HU-PRO-01 (el profesor dicta materias y les pone capacidad y precio), HU-TUR-01 (el turno congela el valor de la clase), HU-CAL-01 (la duración define el largo del hueco)
- **Prioridad:** alta
- **Contrato de API:** ya existe → [`src/contracts/materia.ts`](../../src/contracts/materia.ts) ([guía](../contratos/materia.md)). La pantalla importa de ahí `RUTA`, `MateriaResponse`, `DURACIONES_CLASE` y `ErrorMateria`; no tipea URLs ni redefine el shape.

## Propuesta inicial (del equipo)

ABM de materias para el Gerente, con el mismo patrón del módulo Cuerpo Docente (HU-PRO-01): listado con filtros + modales para alta/edición/lectura y baja lógica con confirmación.

**Decisiones tomadas en el checkpoint del brief:**

| Criterio opcional | Decisión |
|---|---|
| Badge de color (verde = activa, gris = inactiva) | **Entra.** Sobre `ui/StatusBadge`, igual que `EstadoProfesorBadge`. |
| Código abreviado | **Entra, derivado del `id`** (`MAT-000001`), no es una columna de la base. Misma convención que `alumno.legajo` (`ALU-000123`) y `turno.codigo` (`TUR-000123`). |
| Exportación del listado | **Entra sin dependencias nuevas:** "Excel" = descarga `.csv` (abre en Excel) armado en el cliente; "PDF" = `window.print()` con estilos de impresión. |
| Contador de profesores por materia | **No entra.** Es dato de otro módulo (`profesor_materia`); ningún criterio obligatorio lo pide. Cuando se quiera, sale del `Response` del contrato. |
| Bitácora de cambios | **Solo `// BACKEND:`** en el punto de integración. La escribe el trigger `fn_auditoria()`; consultarla es otra HU (contrato en `src/contracts/auditoria.ts`). |
| Sidebar | Se **agrega el ítem "Materias"** navegable a `/materias`, al lado de Cuerpo Docente. |

## Wireframe (idea)

### 1) Listado de Materias

```
┌─────────────┬───────────────────────────────────────────────────────────────┐
│  SIDEBAR    │  Materias                                  [+ Nueva materia]  │
│  ▸ Dashboard├───────────────────────────────────────────────────────────────┤
│  ▸ Sedes    │  [🔍 Buscar por nombre           ] [Nivel v] [Estado v]        │
│  ▸ Turnos   │                                     [⬇ Exportar CSV] [🖨 PDF] │
│  ▸ Alumnos  ├───────────────────────────────────────────────────────────────┤
│  ▸ Cuerpo   │  CÓDIGO     MATERIA        NIVEL      DURACIÓN  VALOR   ESTADO│
│    Docente  │  MAT-000001 Álgebra Lineal Universit.   90 min  $12.500 ●Activa│
│  ▾ Materias │  MAT-000002 Física I       Secundario   60 min  $ 9.000 ●Activa│
│  ▸ Cobranzas│  MAT-000004 Lengua         Primario     45 min  $ 7.200 🚫Inact│
│  ▸ Usuarios ├───────────────────────────────────────────────────────────────┤
│  ▸ Reportes │  Filtros: Nivel Universitario                     [BORRAR]     │
│             │  Mostrando 1-4 de 4 · [< Página 1 de N >] [Filas: 10 v]        │
└─────────────┴───────────────────────────────────────────────────────────────┘
```

- Solo **activas** por defecto; orden alfabético por Nombre **A-Z**.
- Buscador por Nombre, coincidencia **parcial** y sin distinguir mayúsculas/minúsculas.
- Filtros **combinables**: Nivel (Primario/Secundario/Universitario) y Estado (Activas/Inactivas/Todas), con chip "Borrar filtros".
- Acciones por fila: **Ver** (LECTURA) · **Editar** (EDICIÓN) · **Baja** (deshabilitada si ya está inactiva).
- `Valor por clase` alineado a la derecha, formato es-AR con 2 decimales.

### 2) Modal Nueva materia / Editar / Ver — formulario único, 3 modos

```
┌ Nueva materia ──────────────────────────────────────────────── ✕ ┐
│ Nombre*              [Álgebra Lineal                    ] 15/80  │
│   ⚠ Ya existe una materia activa con ese nombre.   ← error rojo  │
│ Nivel*               [Universitario            v]                │
│ Duración de clase*   [90 minutos               v]                │
│ Valor por clase*     [$ 12.500,00            ]                   │
│ Descripción          [Matrices, determinantes…]         42/250   │
│                      (textarea, opcional)                        │
│ Estado               [● Activa] (Switch)                         │
│                                                                   │
│ ℹ Un cambio de valor rige solo hacia adelante: no modifica        │
│   clases ya dictadas ni pagos ya registrados.                    │
│                                          [Cancelar] [Guardar]    │
└───────────────────────────────────────────────────────────────────┘
```

- **INSERCIÓN:** campos vacíos, Estado = Activa por defecto.
- **EDICIÓN:** datos precargados. El aviso de "rige hacia adelante" se muestra al tocar el valor.
- **LECTURA:** todos los campos deshabilitados/en gris, **sin botón Guardar**; muestra además Código, fecha de creación y última modificación.

### 3) Modal de baja lógica

```
┌ Dar de baja la materia ───────────────────────────────────── ✕ ┐
│  ⚠  ¿Confirmás la baja de "Álgebra Lineal" (MAT-000001)?       │
│     La materia pasa a Inactiva: no se podrá seleccionar en     │
│     combos de otros módulos ni asignarse a nuevos profesores.  │
│     Los turnos ya reservados no se modifican.                  │
│                                   [Cancelar] [Confirmar]       │
│                                     (gris)     (rojo)          │
└─────────────────────────────────────────────────────────────────┘
```

## User flow

1. El **Gerente** entra desde el Sidebar → **Materias** (`/materias`).
2. Ve el listado de materias activas, ordenado A-Z. Busca o filtra por Nivel/Estado.
3. **Alta:** `+ Nueva materia` → modal en modo INSERCIÓN → Guardar → toast de éxito y la fila aparece en el listado.
4. **Edición:** ✏ en la fila → modal en modo EDICIÓN → Guardar → toast + fila actualizada.
5. **Lectura:** 👁 en la fila → modal en modo LECTURA (todo gris, sin Guardar).
6. **Baja:** 🚫 en la fila → modal de confirmación → Confirmar → la materia queda Inactiva (badge gris) y desaparece del listado por defecto (sigue visible con filtro Estado = Inactivas/Todas).
7. Desde acá el Gerente sigue a **Cuerpo Docente** para asignar la materia a un profesor (HU-PRO-01).

## Fuente de datos (BD)

| Tabla | Campos usados | Relación clave |
|---|---|---|
| `materia` | `id`, `nombre`, `nivel`, `descripcion`, `duracion_clase_minutos`, `valor_clase`, `estado`, `created_at`, `updated_at` | Catálogo global: no depende de `academia` |
| `profesor_materia` | — (solo para la regla de baja) | FK → `materia.id` · Una materia inactiva no se asigna a nuevos profesores |
| `turno` | — (solo para la regla de baja) | FK → `materia.id` · No se puede inactivar con turnos futuros |
| `auditoria` | — (solo `// BACKEND:`) | La escribe el trigger `fn_auditoria()` sobre `materia` |

Notas del esquema:
- `nombre`: `varchar(80)` NOT NULL, CHECK no vacío. UNIQUE parcial `uq_materia_nombre_activa` sobre `lower(btrim(nombre))` WHERE `estado = 'activo'` → el duplicado se valida **solo contra activas**.
- `nivel`: enum `nivel_materia` (Primario / Secundario / Universitario).
- `duracion_clase_minutos`: `smallint` CHECK IN (30, 45, 60, 90, 120).
- `valor_clase`: `numeric(12,2)` CHECK > 0 → en el front es `number` (el mapper del back hace `Number(...)`).
- `estado`: enum `estado_activo_inactivo` (activo / inactivo), default `activo`.
- **No hay columna de código**: `MAT-000001` se deriva del `id` en el front (helper `codigoMateria`). Si la DBA agrega una columna generada, el helper se reemplaza por el campo.

## Componentes sugeridos (reuso)

| Pieza | Acción | Nota |
|---|---|---|
| `ui/Button`, `ui/Input`, `ui/Textarea`, `ui/Select`, `ui/Modal`, `ui/Switch`, `ui/Pagination`, `ui/Toast`, `ui/Icon` | **Reusar** | Sin cambios |
| `ui/StatusBadge` | **Reusar** | Base del badge de estado |
| `ui/ConfirmarDialog` | **Reusar** | Ya tiene `tone="danger"` y `children`; el modal de baja se arma sobre él |
| `layout/Sidebar` | **Extender** | Agregar ítem "Materias" → `/materias` (hoy no está); pasa de `aria-disabled` a navegable |
| `materias/MateriasTable` | **Crear** | Espejo de `ProfesoresTable` (orden por columna clickeable, acciones por fila) |
| `materias/FiltrosMaterias` | **Crear** | Espejo de `FiltrosProfesores` (búsqueda + Nivel + Estado + chip borrar) |
| `materias/MateriaFormModal` | **Crear** | Formulario único 3 modos, como `ProfesorFormModal` |
| `materias/BajaMateriaModal` | **Crear** | Sobre `ui/ConfirmarDialog`, con el aviso de consecuencias |
| `materias/EstadoMateriaBadge` | **Crear** | Mapea activo→success `check_circle` / inactivo→neutral `cancel` sobre `StatusBadge` |
| `materias/exportar.ts` | **Crear** | CSV en el cliente (`Blob` + `URL.createObjectURL`) y `window.print()`. Sin dependencias nuevas |

## Datos hardcodeados

Respetan el `MateriaResponse` del contrato (camelCase, `id` numérico, `valorClase` como `number`, fechas ISO 8601).

```ts
// src/data/materias.ts
// BACKEND: reemplazar por GET /api/materias (contrato: src/contracts/materia.ts) → tabla materia
const materias: MateriaResponse[] = [
  { id: 1, nombre: "Álgebra Lineal", nivel: "Universitario", descripcion: "Matrices, determinantes y espacios vectoriales", duracionClaseMinutos: 90, valorClase: 12500.0, estado: "activo", fechaCreacion: "2026-03-01T12:00:00.000Z", fechaActualizacion: "2026-03-01T12:00:00.000Z" },
  { id: 2, nombre: "Física I", nivel: "Secundario", descripcion: "Cinemática y dinámica", duracionClaseMinutos: 60, valorClase: 9000.0, estado: "activo", fechaCreacion: "2026-03-02T12:00:00.000Z", fechaActualizacion: "2026-03-02T12:00:00.000Z" },
  { id: 3, nombre: "Matemática", nivel: "Secundario", descripcion: null, duracionClaseMinutos: 60, valorClase: 8500.0, estado: "activo", fechaCreacion: "2026-03-03T12:00:00.000Z", fechaActualizacion: "2026-03-10T09:30:00.000Z" },
  { id: 4, nombre: "Lengua y Literatura", nivel: "Primario", descripcion: "Comprensión lectora y escritura", duracionClaseMinutos: 45, valorClase: 7200.0, estado: "inactivo", fechaCreacion: "2026-02-20T12:00:00.000Z", fechaActualizacion: "2026-03-15T16:00:00.000Z" },
];
```

## Estados

- [x] **Vacío** — sin materias cargadas (ilustración + CTA "Nueva materia") y sin resultados de filtro (mensaje distinto + "Borrar filtros").
- [x] **Cargando** — skeleton de filas mientras "llega" el listado.
- [x] **Error** — banner de error con botón "Reintentar" (`// BACKEND:`).
- [x] **Con datos** — listado paginado.

## Criterios de aceptación

### Obligatorios

- [ ] Formulario único parametrizado en 3 modos: INSERCIÓN, EDICIÓN y LECTURA (en LECTURA todos los campos deshabilitados/en gris, sin botón Guardar).
- [ ] **Nombre:** texto, máx. 80 caracteres, obligatorio y único entre materias activas.
- [ ] **Nivel:** combo (Primario, Secundario, Universitario), obligatorio.
- [ ] **Descripción:** texto, máx. 250 caracteres, opcional.
- [ ] **Duración de la clase:** combo (30, 45, 60, 90, 120 minutos), obligatorio.
- [ ] **Valor por clase:** numérico decimal (2 decimales), mayor a 0, obligatorio, en pesos.
- [ ] **Estado:** Activo/Inactivo, por defecto "Activo".
- [ ] Si el nombre ya existe entre materias activas, rechaza la operación y muestra el error **en rojo debajo del campo**.
- [ ] Un cambio de Valor por clase rige **solo hacia adelante** (aviso visible en el formulario; no modifica clases dictadas ni pagos registrados).
- [ ] La baja es **lógica**, con modal de confirmación ("Confirmar" en rojo, "Cancelar" en gris); una materia inactiva no puede seleccionarse en combos de otros módulos ni asignarse a nuevos profesores.
- [ ] Listado: solo activas por defecto · orden alfabético por Nombre A-Z · filtros combinables por Nivel y Estado · buscador por Nombre parcial e insensible a mayúsculas.
- [ ] Cada alta, modificación y baja queda registrada en bitácora (en el front: comentario `// BACKEND:` en el punto de integración, con el detalle de valor anterior → valor nuevo).

### Opcionales incluidos

- [ ] Badge de color: verde = activa, gris = inactiva.
- [ ] Código abreviado derivado del `id`: `MAT-000001`.
- [ ] Exportación del listado: CSV (Excel) y PDF vía impresión, sin dependencias nuevas.

### Fuera de alcance

- Contador de profesores que dictan cada materia (dato de `profesor_materia`, otro módulo).
- Pantalla de consulta de la bitácora (HU de auditoría).

---

## Decisiones de diseño (completado por /disenar)

- **Ruta:** `/materias` · Sidebar: ítem "Materias" (`menu_book`) navegable, al lado de Cuerpo Docente.
- **Componentes reusados:** `ui/Button`, `ui/Input`, `ui/Textarea`, `ui/Select`, `ui/Switch`, `ui/Modal`, `ui/ConfirmarDialog`, `ui/StatusBadge`, `ui/Pagination`, `ui/Toast`, `ui/Icon`, `layout/Sidebar`.
- **Componentes extendidos:** `layout/Sidebar` — se agregó el ítem Materias (sin cambiar props ni romper a `/profesores`).
- **Componentes nuevos** (`src/components/materias/`): `MateriasTable`, `FiltrosMaterias`, `MateriaFormModal`, `BajaMateriaModal`, `EstadoMateriaBadge`, `exportar.ts`. Son el espejo del módulo `profesores`: mismo patrón de tabla + filtros + modal de 3 modos, con los campos de materia.
- **Datos:** `src/data/materias.ts` tipado con el `MateriaResponse` del contrato (`src/contracts/materia.ts`), no con un tipo propio. Si cambia el contrato, el fixture deja de compilar.

### Decisiones no obvias

- **El duplicado de nombre respeta tildes.** `uq_materia_nombre_activa` es UNIQUE sobre `lower(btrim(nombre))`, y `lower()` de Postgres **no** ignora acentos: "Algebra Lineal" y "Álgebra Lineal" son nombres distintos para la base. El front valida igual (`normalizarNombre`) para no prometer algo que la base no cumple.
- **El error de duplicado aparece en el `blur`, no al guardar** (fix del audit UX): el usuario se entera antes de llenar el resto del formulario. Si igual llega a Guardar, el foco salta al primer campo con error.
- **`MAT-000001` se deriva del `id`** con `padStart(6, "0")`, igual que `ALU-000123` y `TUR-000123` (que sí son columnas generadas). Si la DBA agrega la columna, se reemplaza el helper `codigoMateria`.
- **Exportación sin dependencias nuevas:** CSV armado en el cliente (BOM UTF-8 + separador `;`, que es lo que Excel es-AR espera) y PDF por `window.print()` con un bloque `@media print` en `globals.css`. Lo que no va al papel usa la utilidad `print:hidden`.
- **La baja bloqueada por turnos futuros** replica el error `MATERIA_CON_TURNOS_FUTUROS` del contrato: el modal cambia a `tone="neutral"` y el botón dice "Entendido", porque no hay nada que confirmar.
- **`?demo=error`** fuerza el estado de error del listado para poder revisarlo sin backend. Se lee de `window.location.search` y **no** con `useSearchParams`, que obligaría a envolver la página en `Suspense` (regla activa del log de errores).

### Verificación

- `npx next typegen` + `npx tsc --noEmit`: sin errores.
- `npm run lint`: sin errores (se corrigió uno durante el paso 6 — ver `docs/errores-comunes.md`).
- Renderizado real en navegador (`/materias`): listado, alta, duplicado, baja lógica, baja bloqueada, modo LECTURA y estado de error verificados sin errores de consola.

### Ajuste posterior — capa de datos (preparación para backend)

La pantalla dejó de importar el array de materias. Ahora consume
[`src/data/materias.ts`](../../src/data/materias.ts), que expone funciones `async` con la firma
final (`listarMaterias`, `crearMateria`, `editarMateria`, `inactivarMateria`,
`reactivarMateria`), tipadas con el contrato y que lanzan `ApiError` con los códigos de
`ErrorMateria`. El día que existan los endpoints se cambia el cuerpo de esas funciones y la
pantalla no se toca. Patrón y checklist: [`docs/capa-de-datos-front.md`](../capa-de-datos-front.md).

Cambios que trajo:

- El body del alta/edición se arma como `CrearMateriaBody` (sin `id`, `estado` ni fechas: los pone la base).
- `MateriaFormModal` acepta `errorRemoto` (el error de la API cae bajo el campo que corresponde) y `guardando` (bloquea el botón y evita el doble alta).
- La baja pasa por `inactivarMateria`, que puede devolver `MATERIA_CON_TURNOS_FUTUROS`; el aviso previo del modal sigue siendo solo un adelanto.
- **PENDIENTE CONTRATO:** el contrato tiene `rutaInactivar` pero no una ruta para **reactivar**, y `editarMateriaBody` no incluye `estado` — pero la HU pide el switch Activo/Inactivo. Hay que acordar con el back `POST /api/materias/:id/activar` (o que la edición acepte `estado`) y agregarlo al contrato antes de conectar. Marcado en el código con `// PENDIENTE CONTRATO:`.
- **Bug corregido en `ui/Modal`** (afectaba a todo el sistema): al cerrarse, el nodo que se desvanece seguía capturando los clicks de toda la pantalla. Detalle y regla en [`docs/errores-comunes.md`](../errores-comunes.md).
