# Inventario de componentes — Centro Académico

Índice de los componentes que existen en `src/components/`. Lo consulta el comando `/disenar` antes de codear para **reusar antes de crear**.

> **Mantenimiento:** todo componente nuevo creado con `/disenar` (o a mano) debe agregarse acá. Si un componente cambia de propósito o props clave, actualizar su fila. Este archivo es índice: la fuente de verdad es el código.

## Compartidos (`src/components/ui/`)

Usar SIEMPRE estos antes de crear un equivalente propio del módulo.

| Componente | Para qué | Props clave / notas |
|---|---|---|
| `Icon` | Ícono del sistema (**Material Symbols Outlined**) | `name` (ligadura snake_case, ej. `"check_circle"`), `size?` (px, default 20), `filled?` (FILL 1). Decorativo por defecto (`aria-hidden`). **Única** vía de iconos: no usar otra librería |
| `Button` | Botón del sistema | `variant`: primary (CTA — `secondary` = Azul Conexión, hover `primary`) / secondary (Azul Nexo) / outline / ghost / destructive (`error`) · `size`: sm/md/lg/icon. Tokens de la paleta Nexo Académico, `rounded-sm` = 4px, focus ring `secondary` |
| `Input` | Input de texto estándar | extiende `InputHTMLAttributes`, estilos de foco/token ya resueltos |
| `Textarea` | Área de texto que crece hacia abajo con el contenido (hasta 192px, luego scroll) | extiende `TextareaHTMLAttributes` + `label`/`error`/`hint`. Para textos largos (ej. Dirección, notas) |
| `Select` | Select nativo estándar | extiende `SelectHTMLAttributes` |
| `Combobox` | Select con búsqueda (catálogos largos) | `options: {value,label,tone?}[]`, `sanitize?` (filtro de caracteres al tipear), integra `label`/`error`/`hint` |
| `Modal` | Modal base con overlay + cierre | `open`, `onClose`, `title`, `icon?`, `footer?`, `maxWidth?`; anima con Framer Motion y respeta `prefers-reduced-motion` |
| `StatusBadge` | Chip de estado (pill + indicador + texto) | `variant`: success/warning/danger/info/neutral/pink + `label`, `icon?` (**nombre de Material Symbols**, ej. `"check_circle"`). Único punto de verdad de colores de estado (tokens `status-*`) |
| `Pagination` | Paginación de tablas | `page`, `totalPages`, `totalItems`, `pageStart/End`, `pageSize`, `onPageChange`, `onPageSizeChange` (tamaños 10/25/50) |
| `OrdenamientoSelect` | Orden por fecha | `value`: "recientes"/"antiguas", `onChange` |
| `RangoNumerico` | Filtro numérico min–max | `label`, `valor: {min,max}`, `onChange` |
| `Switch` | Toggle de estado Activo/Inactivo | `role="switch"` + `aria-checked`, `checked`, `onChange`, `ariaLabel`; touch target ≥ 44px |
| `Toast` | Notificaciones de éxito/error | `ToastProvider` + `useToast()` → `showToast("success"\|"error", msg)`. Éxito = verde (`status-success-strong`), error = rojo (`error`) |
| `ConfirmarDialog` | Diálogo de confirmación sobre `Modal maxWidth="max-w-md"` | `open`, `title`, `description`, `confirmLabel`, `cancelLabel="Volver"`, `onClose`, `onConfirm`; `tone?: "danger" (default) \| "success" \| "neutral"` (mapea a Button variant destructive/primary/secondary + icono; `success`/`neutral` para acciones no destructivas). HU-PRO-01 agregó `children?` (contenido opcional extra bajo la descripción, ej: aviso de turnos futuros) |

## Por módulo (`src/components/<módulo>/`)

Patrones recurrentes por pantalla: `<Entidad>Table`, `<Entidad>Filtros*`, `<Entidad>FormModal`, `Estado*Badge`, `Cancelar*Modal`, `<Entidad>Tabs`.

### layout
`Sidebar` (nav principal del Centro Académico): Dashboard · Sedes · Turnos y Agenda · Alumnos · **Cuerpo Docente** (`/profesores`, ítem activo) · Cobranzas · Usuarios · Reportes. Los módulos no construidos navegan con `href="#"`, quedan `aria-disabled` y muestran el chip "Próx.". Íconos Material Symbols vía `ui/Icon` (`dashboard`, `location_city`, `calendar_month`, `group`, `groups`, `receipt_long`, `school`, `settings`).

### profesores
Módulo HU-PRO-01 (Cuerpo Docente, `/profesores`): `ProfesoresTable` (columnas Profesor/Materias+capacidad/Disponibilidad resumen/Alta/Estado/Acciones Ver/Editar/Matriz/Baja; orden por columna clickeable) · `FiltrosProfesores` (búsqueda nombre/apellido/título + Select Materia/Día disponible/Estado; default Activos; chip "Borrar filtros"; helpers `FiltrosProfesoresState`) · `ProfesorFormModal` (formulario único paramétrico 3 modos INSERCION/EDICION/LECTURA: Combobox usuario rol Profesor sin ficha, Título ≤100 opcional, Teléfono 10-11 dígitos, Materias múltiples con capacidad 1-10 por materia, Switch estado; en lectura campos grises sin Guardar) · `MatrizDisponibilidadModal` (grilla 30 min LUN-SÁB 08:00-20:00, click alterna celda, click en día activa/vacía el día, copiar día a todos; expone `MatrizSerializable`) · `BajaProfesorModal` (sobre `ui/ConfirmarDialog` con `children` de aviso: **bloqueada** si hay turnos futuros Reservado — muestra cantidad; baja lógica → inactivo) · `EstadoProfesorBadge` (mapea sobre `StatusBadge`: activo=success `check_circle`, inactivo=neutral `cancel`)
> Datos placeholder en `src/data/profesores.ts` (camelCase; `id` numérico PK real; `// BACKEND:` en usuario-asociado, teléfono, materias, disponibilidad, baja, filtros). No existe legajo de profesor (solo alumno). Disponibilidad guardada como `bloquesPorDia: Record<diaIso, "HH:MM-HH:MM"[]>`.
> `layout/Sidebar` y `globals.css` se migraron de Huellitas → **paleta Nexo Académico + tokens del MASTER.md** en HU-PRO-01 (home `/` sigue default hasta próxima HU).
> Iconos: se reemplazó `lucide-react` por **Material Symbols Outlined** (`ui/Icon` + fuente en `layout.tsx` + estilos base en `globals.css`) en todo el sistema, según el documento de diseño.

## Reglas de reuso

1. **Reusar antes de crear:** si existe algo equivalente en `ui/`, se usa. Los equivalentes de módulo (ej: `EstadoProfesorBadge`) se evalúan caso por caso; si sirven, se generalizan hacia `ui/` en lugar de duplicarse.
2. **Extender, no duplicar:** si un componente existente casi cumple, se le agregan props/variantes manteniendo retrocompatibilidad con quienes ya lo usan.
3. **Nuevo solo si no hay equivalente**, justificándolo en el plan (qué falta y por qué no conviene extender).
4. **Los badges de estado van sobre `StatusBadge`:** los `Estado*Badge` de módulo solo mapean su estado de negocio a una variante + label + **nombre de ícono Material Symbols**; nunca definen sus propios colores.
5. **Los íconos van sobre `ui/Icon`** (Material Symbols Outlined). Prohibido importar `lucide-react` u otra librería de iconos.
6. **Verificar contra el código:** este inventario puede quedarse atrás; ante duda, confirmar con una búsqueda real en `src/components/**`.