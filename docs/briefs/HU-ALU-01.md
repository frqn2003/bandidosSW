# HU-ALU-01: Como Personal de Mesa de Entrada, quiero registrar nuevos alumnos y consultar su ficha mediante un formulario paramétrico con sus datos personales y de contacto básicos, para contar con un legajo único por alumno que permita comenzar a reservarle clases de apoyo

> Generado con /brief. Revisar y ajustar antes de /disenar.

## Contexto

- **Ruta propuesta:** `/alumnos`
- **Relacionada con:** HU-ALU-02 (incorpora el modo EDICIÓN y la baja), HU-TUR-01 (reserva de turno: el acceso directo de la ficha), HU-MAT-01 (nivel educativo comparte el enum `nivel_materia`)
- **Prioridad:** alta (iteración 1)
- **Contrato de API:** ya existe → [`src/contracts/alumno.ts`](../../src/contracts/alumno.ts) ([guía](../contratos/alumno.md)). La pantalla importa de ahí `RUTA`, `AlumnoResponse`, `CrearAlumnoBody`, `crearAlumnoBody` (el schema, como valor) y `ErrorAlumno`.
- **Datos:** capa de datos con fixture — [`src/data/alumnos.ts`](../../src/data/alumnos.ts), patrón de [`docs/capa-de-datos-front.md`](../capa-de-datos-front.md). **Esta HU no toca `src/app/api/` ni `src/modules/`**: cuando el back conecte `/api/alumnos`, se cambia el cuerpo de las funciones y la pantalla queda igual (es lo que ya pasó con materias).

## Propuesta inicial (del equipo)

Alta y consulta de alumnos para Mesa de Entrada, con el patrón de los dos módulos ya construidos (Materias y Cuerpo Docente): listado con buscador + modal para el alta y la ficha.

**Alcance de este incremento:** solo **INSERCIÓN** y **LECTURA**. El modo EDICIÓN y la baja lógica entran en HU-ALU-02 → en el listado hay acción **Ver**, no Editar ni Baja.

**Decisiones tomadas en el checkpoint del brief:**

| Punto | Decisión |
|---|---|
| Origen de los datos | Fixture en `src/data/alumnos.ts` con la firma final (async, tipos y errores del contrato). Solo front. |
| Ficha tras guardar | El **mismo modal** pasa a modo LECTURA con el legajo asignado, como en Materias y Profesores. |
| "Reservar turno" | Botón **visible pero deshabilitado**, con chip "Próx." — HU-TUR-01 todavía no existe y no queremos llevar a una ruta rota. |
| Alerta de posible duplicado (opcional) | **Entra.** Usa `RUTA_POSIBLES_DUPLICADOS` del contrato; es un aviso, no un rechazo: se puede cargar igual. |
| Paginación 20 (opcional) | **Entra.** `ui/Pagination` hoy ofrece 10/25/50 → se **extiende** con una prop opcional `pageSizes` (default actual) y alumnos pasa `[20, 50, 100]`. |
| Badge de estado (opcional) | **Entra.** Verde = activo, gris = inactivo, sobre `ui/StatusBadge`. |
| Filtros | Solo **Estado** (Activos / Inactivos / Todos), porque el criterio dice "por defecto solo activos" y hace falta una forma de ver el resto. No se agregan filtros que la HU no pide. |
| Campo Estado en el alta | **No es un control editable.** El alta siempre nace Activo (default de la columna) y el contrato no acepta `estado` en el body; se muestra como dato fijo. El switch llega con la baja, en HU-ALU-02. |

## Wireframe (idea)

### 1) Listado de Alumnos

```
┌─────────────┬───────────────────────────────────────────────────────────────┐
│  SIDEBAR    │  Alumnos                                   [+ Nuevo alumno]   │
│  ▸ Dashboard├───────────────────────────────────────────────────────────────┤
│  ▸ Sedes    │  [🔍 Buscar por nombre, apellido, DNI o legajo ] [Estado v]    │
│  ▸ Turnos   ├───────────────────────────────────────────────────────────────┤
│  ▾ Alumnos  │  LEGAJO      APELLIDO Y NOMBRE      DNI       NIVEL     TEL.   │
│  ▸ Cuerpo   │  ALU-000001  Acosta, Julieta ●Activo 45111222 Secundario 387…  │
│    Docente  │  ALU-000004  Benítez, Mateo  ●Activo 48333444 Primario   387…  │
│  ▸ Materias │  ALU-000007  Cabrera, Lucía  🚫Inact 42555666 Universit. 387…  │
│  ▸ Cobranzas│                                                          [👁]  │
│  ▸ Usuarios ├───────────────────────────────────────────────────────────────┤
│  ▸ Reportes │  Mostrando 1-20 de 24 · [< Página 1 de 2 >] [Filas: 20 v]      │
└─────────────┴───────────────────────────────────────────────────────────────┘
```

- Solo **activos** por defecto; orden alfabético por **Apellido, luego Nombre** (A-Z).
- Columnas exactas del criterio: N° de legajo · Apellido y Nombre · DNI · Nivel educativo · Teléfono. El **badge** va junto al nombre (criterio opcional).
- Buscador único por **nombre, apellido, DNI o legajo**, parcial y sin distinguir mayúsculas/minúsculas.
- Acción por fila: **Ver** (abre la ficha en modo LECTURA). Editar y Baja llegan en HU-ALU-02.

### 2) Modal Nuevo alumno (modo INSERCIÓN)

```
┌ Nuevo alumno ───────────────────────────────────────────────── ✕ ┐
│ Legajo: se asigna al guardar   ·   Estado: ● Activo               │
│ ── Datos del alumno ───────────────────────────────────────────── │
│ Nombre*      [Julieta            ] 7/50   Apellido* [Acosta ] 6/50│
│ DNI*         [45111222 ]  ⚠ Ya existe el alumno ALU-000003 con   │
│                              ese DNI.            ← error rojo     │
│ Fecha de nacimiento* [dd/mm/aaaa]   Nivel educativo* [Secundario v]│
│ Teléfono*    [3874556677]   Email [julieta@mail.com   ] (opcional)│
│ ── Datos del responsable ──────────────── (menor de 18 años) ──── │
│ ℹ Julieta tiene 15 años: los datos del responsable son obligatorios│
│ Nombre*      [Marta Acosta   ]                                    │
│ DNI*         [27333444 ]    Teléfono* [3874556688]                │
│                                          [Cancelar] [Guardar]     │
└───────────────────────────────────────────────────────────────────┘
```

- La sección **Datos del responsable** aparece sola cuando la fecha de nacimiento indica menor de 18; con el aviso de por qué es obligatoria.
- Contadores de caracteres en Nombre y Apellido (máx. 50).
- Legajo, Fecha de alta y Estado se muestran como **datos del sistema**, nunca como inputs.

### 3) Aviso de posible duplicado (antes de guardar)

```
┌ ¿Es la misma persona? ──────────────────────────────────────── ✕ ┐
│  ℹ Ya hay un alumno con ese nombre, apellido y fecha de           │
│    nacimiento:                                                    │
│      ALU-000003 · Acosta, Julieta · 14/05/2010 · DNI 45111222    │
│    Puede ser un duplicado, o dos personas distintas.              │
│                                   [Cancelar] [Cargar igual]       │
└───────────────────────────────────────────────────────────────────┘
```

Es un **aviso**, no un rechazo: el alta se puede confirmar. Si el array viene vacío, este modal no aparece.

### 4) Ficha del alumno (modo LECTURA)

```
┌ Ficha del alumno ───────────────────────────────────────────── ✕ ┐
│ ALU-000025 · Acosta, Julieta           ● Activo                  │
│ ── Todos los campos en gris, deshabilitados, sin Guardar ──────── │
│ Nombre    Julieta        Apellido   Acosta                        │
│ DNI       45111222       Nacimiento 14/05/2010 (15 años)          │
│ Nivel     Secundario     Teléfono   3874556677                    │
│ Email     —                                                       │
│ Responsable  Marta Acosta · DNI 27333444 · Tel. 3874556688        │
│ Alta en el sistema: 22/09/2026                                    │
│                       [📅 Reservar turno (Próx.)]  [Cerrar]       │
└───────────────────────────────────────────────────────────────────┘
```

Se abre de dos formas: al **guardar** un alta (con el legajo recién asignado) y desde el botón **Ver** del listado.

## User flow

1. **Mesa de Entrada** entra desde el Sidebar → **Alumnos** (`/alumnos`).
2. Ve el listado de alumnos activos, ordenado por Apellido. Busca por nombre, DNI o legajo.
3. **Alta:** `+ Nuevo alumno` → modal INSERCIÓN → completa los datos (si es menor, aparece la sección del responsable) → Guardar.
   - Si hay coincidencia de nombre + apellido + fecha de nacimiento → aviso de posible duplicado → Cancelar o **Cargar igual**.
   - Si el DNI ya existe entre activos → error en rojo bajo el campo, con el legajo del alumno existente.
4. Al guardar, el modal pasa a **LECTURA** con el legajo asignado y el acceso directo **Reservar turno** (deshabilitado hasta HU-TUR-01). El alumno aparece en el listado.
5. **Consulta:** 👁 en la fila → la misma ficha en modo LECTURA.

## Fuente de datos (BD)

| Tabla | Campos usados | Relación clave |
|---|---|---|
| `alumno` | `id`, `legajo`, `nombre`, `apellido`, `dni`, `fecha_nacimiento`, `telefono`, `email`, `nivel_educativo`, `responsable_nombre`, `responsable_dni`, `responsable_telefono`, `estado`, `created_at`, `updated_at` | Sin FKs entrantes propias |
| `auditoria` | — (solo `// BACKEND:`) | La escribe el trigger `fn_auditoria()` sobre `alumno`: usuario responsable, fecha y hora |

Notas del esquema:
- `legajo`: `GENERATED STORED` → `'ALU-' || lpad(id, 6, '0')`. **No se manda en el body**, vuelve en la response. Acá sí es columna de la base (a diferencia del `MAT-000001` de materias, que el front deriva).
- `dni`: `varchar(8)` CHECK `^[0-9]{7,8}$`. UNIQUE parcial `uq_alumno_dni_activo` WHERE `estado = 'activo'` → el duplicado se valida **solo contra activos**.
- `fecha_nacimiento`: `date` CHECK `<= CURRENT_DATE` → viaja como `"yyyy-mm-dd"`.
- `telefono` / `responsable_telefono`: CHECK `^[0-9]{10,11}$` (solo dígitos, sin guiones).
- `nivel_educativo`: enum `nivel_materia` (Primario / Secundario / Universitario), el mismo de `materia.nivel`.
- CHECK `ck_alumno_responsable_menor`: menor de 18 ⇒ los **tres** datos del responsable son obligatorios. El contrato ya lo valida con `superRefine`, así que el formulario lo corre con el mismo código.
- El posible duplicado (nombre + apellido + fecha de nacimiento) **no** es una restricción de unicidad: es un warning de UX.

## Componentes sugeridos (reuso)

| Pieza | Acción | Nota |
|---|---|---|
| `ui/Button`, `ui/Input`, `ui/Select`, `ui/Modal`, `ui/Toast`, `ui/Icon`, `ui/StatusBadge` | **Reusar** | Sin cambios |
| `ui/ConfirmarDialog` | **Reusar** | Base del aviso de duplicado: `tone="neutral"` + `children` con las coincidencias |
| `ui/Pagination` | **Extender** | Prop opcional `pageSizes` (default `[10, 25, 50]`, retrocompatible); alumnos pasa `[20, 50, 100]` |
| `layout/Sidebar` | **Extender** | El ítem "Alumnos" pasa de `disabled` a navegable → `/alumnos` |
| `alumnos/AlumnosTable` | **Crear** | Columnas del criterio + badge junto al nombre + acción Ver |
| `alumnos/FiltrosAlumnos` | **Crear** | Buscador único (nombre/apellido/DNI/legajo) + Select Estado |
| `alumnos/AlumnoFormModal` | **Crear** | Formulario paramétrico de **2 modos** (INSERCION / LECTURA), con la sección del responsable condicional |
| `alumnos/DuplicadosModal` | **Crear** | Sobre `ui/ConfirmarDialog`, lista las coincidencias |
| `alumnos/EstadoAlumnoBadge` | **Crear** | Mapea sobre `StatusBadge` (activo=success `check_circle` / inactivo=neutral `cancel`), como en los otros dos módulos |

> Con este serían **tres** `Estado*Badge` casi idénticos (materias, profesores, alumnos). Se mantiene el patrón por consistencia, pero queda anotado: si aparece un cuarto, se generaliza a `ui/`.

## Datos hardcodeados

Respetan el `AlumnoResponse` del contrato (camelCase, `id` numérico, fechas ISO). **24 registros** en el fixture, para que la paginación de 20 se vea de verdad; mezcla de niveles, algunos menores con responsable y 3 inactivos.

```ts
// src/data/alumnos.ts
const FIXTURE: AlumnoResponse[] = [
  {
    id: 1, legajo: "ALU-000001", nombre: "Julieta", apellido: "Acosta",
    dni: "45111222", fechaNacimiento: "2010-05-14", telefono: "3874556677",
    email: null, nivelEducativo: "Secundario",
    responsable: { nombre: "Marta Acosta", dni: "27333444", telefono: "3874556688" },
    estado: "activo",
    fechaCreacion: "2026-03-01T12:00:00.000Z", fechaActualizacion: "2026-03-01T12:00:00.000Z",
  },
  {
    id: 2, legajo: "ALU-000002", nombre: "Mateo", apellido: "Benítez",
    dni: "48333444", fechaNacimiento: "2014-08-02", telefono: "3874112233",
    email: "familia.benitez@mail.com", nivelEducativo: "Primario",
    responsable: { nombre: "Laura Benítez", dni: "30111222", telefono: "3874112244" },
    estado: "activo",
    fechaCreacion: "2026-03-02T12:00:00.000Z", fechaActualizacion: "2026-03-02T12:00:00.000Z",
  },
  {
    id: 3, legajo: "ALU-000003", nombre: "Lucía", apellido: "Cabrera",
    dni: "42555666", fechaNacimiento: "2001-11-20", telefono: "3874998877",
    email: "lucia.cabrera@mail.com", nivelEducativo: "Universitario",
    responsable: null,                                   // mayor de edad
    estado: "activo",
    fechaCreacion: "2026-03-03T12:00:00.000Z", fechaActualizacion: "2026-03-03T12:00:00.000Z",
  },
  // … hasta 24, con 3 en estado "inactivo"
];
```

## Estados

- [x] **Vacío** — sin alumnos cargados (ilustración + CTA "Nuevo alumno") y sin resultados de búsqueda (copy distinto + "Borrar búsqueda").
- [x] **Cargando** — skeleton de filas.
- [x] **Error** — banner con botón "Reintentar".
- [x] **Con datos** — listado paginado de 20.

## Criterios de aceptación

### Obligatorios

- [ ] Formulario paramétrico con los modos **INSERCIÓN** y **LECTURA** (en LECTURA todos los campos deshabilitados/en gris, sin botón Guardar). EDICIÓN queda para HU-ALU-02.
- [ ] **N° de legajo:** autogenerado, secuencial, formato `ALU-000123`, no editable.
- [ ] **Nombre:** texto, máx. 50, obligatorio.
- [ ] **Apellido:** texto, máx. 50, obligatorio.
- [ ] **DNI:** numérico, 7 u 8 dígitos, obligatorio y único entre alumnos activos.
- [ ] **Fecha de nacimiento:** dd/mm/aaaa, no futura, obligatoria.
- [ ] **Teléfono:** numérico, 10 u 11 dígitos, obligatorio.
- [ ] **Email:** formato validado, opcional.
- [ ] **Nivel educativo:** combo (Primario, Secundario, Universitario), obligatorio.
- [ ] **Responsable (nombre, DNI y teléfono):** obligatorios cuando el alumno es menor de 18, calculado a partir de la fecha de nacimiento; opcionales en caso contrario.
- [ ] **Fecha de alta:** autogenerada, no editable.
- [ ] **Estado:** Activo/Inactivo; el alta nace "Activo".
- [ ] Si el DNI ya existe entre activos, rechaza la operación y muestra el error **en rojo debajo del campo, indicando el N° de legajo existente**.
- [ ] Al guardar correctamente muestra la ficha en modo **LECTURA** con el legajo asignado y el acceso directo **"Reservar turno"**.
- [ ] Listado: solo activos por defecto · orden por Apellido y luego Nombre (A-Z) · columnas Legajo, Apellido y Nombre, DNI, Nivel educativo y Teléfono · buscador por nombre, apellido, DNI o legajo (parcial, insensible a mayúsculas).
- [ ] Cada alta queda registrada en la bitácora con usuario responsable, fecha y hora (en el front: comentario `// BACKEND:` en el punto de integración).

### Opcionales incluidos

- [ ] Alerta de posible duplicado (nombre + apellido + fecha de nacimiento), que permite cargar igual.
- [ ] Paginación del listado, 20 registros por página.
- [ ] Badge de color junto al nombre: verde = activo, gris = inactivo.

### Fuera de alcance (HU-ALU-02)

- Modo EDICIÓN del formulario.
- Baja lógica del alumno (y el error `ALUMNO_CON_TURNOS_FUTUROS` que ya declara el contrato).

---

## Decisiones de diseño (completado por /disenar)

- **Ruta:** `/alumnos` · Sidebar: el ítem "Alumnos" (`group`) pasó de `disabled` a navegable.
- **Componentes reusados:** `ui/Button`, `ui/Input`, `ui/Select`, `ui/Modal`, `ui/StatusBadge`, `ui/ConfirmarDialog`, `ui/Toast`, `ui/Icon`.
- **Componentes extendidos:**
  - `ui/Pagination` → prop opcional `pageSizes` (default `[10, 25, 50]`; Alumnos pasa `[20, 50, 100]`). Retrocompatible: Materias y Profesores no se tocaron.
  - `layout/Sidebar` → ítem Alumnos activo.
  - `src/lib/profesores.ts` → los helpers genéricos se mudaron a **`src/funciones/formato.ts`** y se re-exportan desde su lugar original.
- **Componentes nuevos** (`src/components/alumnos/`): `AlumnosTable`, `FiltrosAlumnos`, `AlumnoFormModal`, `DuplicadosModal`, `EstadoAlumnoBadge`. Datos en `src/data/alumnos.ts`.

### Decisiones no obvias

- **El formulario valida con el schema del contrato** (`crearAlumnoBody` importado como **valor**, no solo como tipo): la regla del responsable de un menor, los regex de DNI y teléfono y la fecha no futura se escriben una sola vez y las corren las dos mitades. La pantalla solo traduce los mensajes genéricos de zod (`too_small` → "Este dato es obligatorio").
- **La sección del responsable está siempre visible** y lo que cambia es el chip OBLIGATORIO/OPCIONAL. Si apareciera y desapareciera con la fecha de nacimiento, el formulario saltaría bajo el cursor (fix del audit UX).
- **El posible duplicado se avisa dos veces, a propósito:** inline apenas están nombre + apellido + fecha (debounce de 400 ms, para no hacer cargar todo el formulario al pedo) y como modal de confirmación al guardar, que es el que decide. Ninguno de los dos bloquea: el botón dice "Cargar igual".
- **El DNI duplicado ofrece ir a la ficha existente.** El `ApiError` viaja con `datos: { id, legajo }`, así la pantalla arma el botón "Ver la ficha de ese alumno" sin parsear el mensaje.
- **El legajo lo asigna la capa de datos, no el formulario** (`ALU-` + `lpad(id, 6, '0')`), replicando la columna `GENERATED STORED`. En el alta se muestra "Se asigna al guardar".
- **`?demo=error`** fuerza el estado de error del listado; se lee de `window.location.search` y no con `useSearchParams`, que obligaría a envolver la página en `Suspense` (regla activa del log).
- **Bug corregido en el contrato:** `responsableDni` y `responsableTelefono` tenían `.regex()` sin mensaje y la UI mostraba "Invalid" en inglés. Se arregló en `src/contracts/alumno.ts` para que el back devuelva el mismo texto. Registrado en `docs/errores-comunes.md`.
- **`formatearTelefono` corregido** para números de 10 dígitos (partía `38-7455-6677` en vez de `387-455-6677`). Afecta también a Cuerpo Docente, para bien.

### Verificación

- `npx tsc --noEmit` y `npm run lint`: sin errores.
- Renderizado real en `/alumnos`, sin errores de consola en ningún paso:
  - listado 21 activos, 20 por página, 2 páginas, orden por Apellido;
  - alta de un menor sin responsable → los 3 errores en español, con foco en el primero;
  - alta completa → ficha en LECTURA con `ALU-000025`, campos deshabilitados, sin Guardar, "Reservar turno" disabled;
  - DNI existente → "Ya existe el alumno ALU-000001 con ese DNI." + acción para ver esa ficha;
  - mismo nombre+apellido+fecha → aviso inline y modal; "Cargar igual" creó `ALU-000026`;
  - buscador por legajo y por DNI parcial; estado vacío por búsqueda; estado de error (`?demo=error`).
