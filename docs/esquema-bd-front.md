# Esquema de Base de Datos — Diccionario de Datos (academia_esquema.sql)

> Diccionario de datos generado a partir del dump `academia_esquema.sql` (PostgreSQL 14 o superior). Iteración 1: Profesores, Materias, Disponibilidad, Alumnos, Usuarios/Accesos, Turnos y Calendario.

---

## Enums

| Enum | Valores |
|---|---|
| estado_activo_inactivo | activo, inactivo |
| estado_turno | Reservado, Cancelado |
| modo_abm | INSERCION, EDICION, LECTURA |
| nivel_materia | Primario, Secundario, Universitario |
| tipo_evento_sesion | login, logout, login_fallido, bloqueado, acceso_denegado |
| tipo_operacion_auditoria | INSERT, UPDATE, DELETE |

> `modo_abm` está definido en el esquema pero, a la fecha del dump, ninguna columna de ninguna tabla lo utiliza.
> `nivel_materia` se reutiliza tal cual para `alumno.nivel_educativo` (mismos 3 valores que `materia.nivel`), sin crear un enum duplicado.

---

## 1. Academia, Roles, Usuarios y Auditoría

### `academia`
| Campo | Tipo | Notas |
|---|---|---|
| id | integer identity PK | |
| nombre | varchar(100) NOT NULL | |
| direccion | varchar(255) NOT NULL | |
| telefono | varchar(30) | |
| estado | enum estado_activo_inactivo NOT NULL | default activo |
| created_at | timestamp NOT NULL | default now() |
| updated_at | timestamp NOT NULL | default now(), actualizado por trigger `trg_academia_updated_at` |

UNIQUE parcial `uq_academia_nombre_activa` sobre `lower(nombre)` WHERE estado='activo': no puede haber dos academias activas con el mismo nombre (case-insensitive). Sede física de la institución; cada academia tiene su propia agenda y sus propios profesores/usuarios.

### `rol`
| Campo | Tipo | Notas |
|---|---|---|
| id | integer identity PK | |
| nombre | varchar(50) UNIQUE NOT NULL | Gerente, Profesor, Mesa de Entrada (carga inicial) |

### `usuario`
| Campo | Tipo | Notas |
|---|---|---|
| id | integer identity PK | |
| rol_id | int NOT NULL FK → rol.id | |
| academia_id | int (nullable) FK → academia.id | |
| nombre | varchar(80) NOT NULL | |
| apellido | varchar(80) NOT NULL | |
| dni | varchar(20) NOT NULL | |
| email | varchar(120) NOT NULL | |
| estado | enum estado_activo_inactivo NOT NULL | default activo |
| auth_id | uuid UNIQUE (nullable) | vínculo 1 a 1 con auth.users(id) de Supabase Auth |
| intentos_fallidos | smallint NOT NULL | default 0, CHECK entre 0 y 5 (bloqueo tras 5 intentos fallidos) |
| bloqueado_hasta | timestamp (nullable) | |
| fecha_creacion | timestamp NOT NULL | default now() |

UNIQUE parcial `uq_usuario_dni_activo` (dni) y `uq_usuario_email_activo` (lower(email)), ambas WHERE estado='activo'. Índices por `academia_id` y `rol_id`. El login, bloqueo de cuenta y recuperación de contraseña se delegan a Supabase Auth; esta tabla solo guarda el perfil de negocio.

### `auditoria`
| Campo | Tipo | Notas |
|---|---|---|
| id | bigint identity PK | |
| tabla | varchar(50) NOT NULL | nombre de la tabla origen |
| operacion | enum tipo_operacion_auditoria NOT NULL | |
| registro_id | int NOT NULL | PK (columna id) del registro afectado en la tabla origen |
| usuario_id | int (nullable) FK → usuario.id, ON DELETE SET NULL | responsable del cambio, tomado de la variable de sesión app.usuario_id |
| fecha_hora | timestamp NOT NULL | default now() |
| valores_anteriores | jsonb | snapshot completo de la fila ANTES del cambio (NULL en INSERT) |
| valores_nuevos | jsonb | snapshot completo de la fila DESPUÉS del cambio (NULL en DELETE) |

CHECK `ck_auditoria_valores`: si `operacion = INSERT` → `valores_anteriores` NULL y `valores_nuevos` NOT NULL; si `operacion = UPDATE` → ambos NOT NULL; si `operacion = DELETE` → `valores_anteriores` NOT NULL y `valores_nuevos` NULL. Bitácora general alimentada por la función de trigger genérica `fn_auditoria()`, aplicada sobre `materia`, `profesor`, `profesor_materia`, `agenda_profesional`, `alumno` y `turno`. Índices por fecha, por (tabla, registro_id) y por usuario.

### `auditoria_sesion`
| Campo | Tipo | Notas |
|---|---|---|
| id | bigint identity PK | |
| usuario_id | int (nullable) FK → usuario.id, ON DELETE SET NULL | |
| evento | enum tipo_evento_sesion NOT NULL | login / logout / login_fallido / bloqueado / acceso_denegado |
| fecha_hora | timestamp NOT NULL | default now() |
| ip_origen | inet | |
| detalle | jsonb | |

Bitácora de login/logout/bloqueos. Tabla aparte de `auditoria` porque un evento de sesión no es un cambio de fila de una tabla de negocio; el bloqueo de 15 minutos, la expiración de sesión y el "Acceso denegado" por rol se controlan en el backend, esta tabla solo registra el evento. Índices por usuario y por fecha (DESC).

---

## 2. Agenda y Horario de Atención

### `agenda`
| Campo | Tipo | Notas |
|---|---|---|
| id | integer identity PK | |
| academia_id | int NOT NULL UNIQUE FK → academia.id | |
| nombre | varchar(100) NOT NULL | default 'Agenda principal' |
| estado | enum estado_activo_inactivo NOT NULL | default activo |
| created_at | timestamp NOT NULL | default now() |

Relación 1 a 1 con `academia` (a diferencia del `sucursal`/`agenda` del esquema anterior, aquí `academia_id` es UNIQUE): exactamente una agenda por academia.

### `agenda_semanal`
| Campo | Tipo | Notas |
|---|---|---|
| id | integer identity PK | |
| agenda_id | int NOT NULL FK → agenda.id | |
| dia_semana | smallint NOT NULL | CHECK entre 1 y 6 (lunes a sábado, ISO 1..6) |
| hora_inicio | time NOT NULL | |
| hora_fin | time NOT NULL | CHECK hora_fin > hora_inicio |
| estado | enum estado_activo_inactivo NOT NULL | default activo |

Horario general de atención del centro. EXCLUDE `ex_agenda_semanal_sin_superposicion` (gist, requiere `btree_gist`): dentro de la misma agenda y mismo día, dos franjas activas no pueden solaparse en el tiempo.

---

## 3. Materias, Profesores y Precios

### `materia`
| Campo | Tipo | Notas |
|---|---|---|
| id | integer identity PK | |
| nombre | varchar(80) NOT NULL | CHECK no vacío (btrim) |
| nivel | enum nivel_materia NOT NULL | Primario / Secundario / Universitario |
| descripcion | varchar(250) | |
| duracion_clase_minutos | smallint NOT NULL | CHECK IN (30, 45, 60, 90, 120) |
| valor_clase | numeric(12,2) NOT NULL | CHECK > 0 |
| estado | enum estado_activo_inactivo NOT NULL | default activo |
| created_at | timestamp NOT NULL | default now() |
| updated_at | timestamp NOT NULL | default now(), actualizado por trigger `trg_materia_updated_at` |

UNIQUE parcial `uq_materia_nombre_activa` sobre `lower(btrim(nombre))` WHERE estado='activo'. Catálogo global de materias, no depende de la academia. Cambiar `valor_clase` rige solo hacia adelante: `turno` guarda una copia congelada del valor vigente al momento de reservar.

### `profesor`
| Campo | Tipo | Notas |
|---|---|---|
| id | integer identity PK | |
| usuario_id | int NOT NULL UNIQUE FK → usuario.id | relación 1 a 1; el usuario debe tener rol "Profesor" (validado por trigger) |
| titulo_especialidad | varchar(100) | |
| telefono | varchar(11) NOT NULL | CHECK regex `^[0-9]{10,11}$` |
| estado | enum estado_activo_inactivo NOT NULL | default activo |
| created_at | timestamp NOT NULL | default now() |
| updated_at | timestamp NOT NULL | default now(), actualizado por trigger `trg_profesor_updated_at` |

> ⚠️ Inconsistencia detectada en el dump: la tabla define el CHECK `ck_profesor_capacidad CHECK (capacidad_maxima_alumnos BETWEEN 1 AND 10)`, pero la columna `capacidad_maxima_alumnos` **no existe** en la lista de columnas de `CREATE TABLE profesor`. El script fallaría al ejecutarse tal cual; falta agregar la columna (por ejemplo `capacidad_maxima_alumnos smallint NOT NULL`) o eliminar el CHECK.

Cada profesor pertenece a una sola academia (indirectamente, vía `usuario.academia_id`). Trigger `trg_profesor_validar_usuario` valida que el `usuario_id` asignado tenga rol "Profesor", esté activo y tenga academia asignada. Reglas que no se fuerzan con constraints: al menos una materia por profesor y al menos un bloque horario activo por semana (se validan en backend).

### `profesor_materia` (N a N)
| Campo | Tipo | Notas |
|---|---|---|
| id | integer identity PK | id propio, para compatibilidad con la auditoría genérica |
| profesor_id | int NOT NULL FK → profesor.id | |
| materia_id | int NOT NULL FK → materia.id | |
| capacidad_maxima | int NOT NULL | capacidad máxima de alumnos que ese profesor admite para esa materia puntual |

UNIQUE `uq_profesor_materia` (profesor_id, materia_id). Trigger `trg_profesor_materia_validar_materia` impide asignar una materia inactiva. Índice por `materia_id`.

### `precio_clase`
| Campo | Tipo | Notas |
|---|---|---|
| id | integer identity PK | |
| profesor_materia_id | int NOT NULL FK → profesor_materia.id | |
| precio | numeric(12,2) NOT NULL | CHECK > 0 |

Precio vigente por combinación profesor+materia; es la fuente de `turno.valor_clase_congelado`: al reservar, el backend toma el `precio_clase` vigente/último de esa combinación y lo copia como valor congelado del turno (mismo patrón que `orden_compra_detalle.precio_acordado` del esquema anterior). Índice por `profesor_materia_id`.

### `agenda_profesional`
| Campo | Tipo | Notas |
|---|---|---|
| id | integer identity PK | |
| agenda_semanal_id | int NOT NULL FK → agenda_semanal.id | |
| profesor_id | int NOT NULL FK → profesor.id | |
| hora_inicio | time NOT NULL | múltiplo de 30 minutos |
| hora_fin | time NOT NULL | CHECK hora_fin > hora_inicio; múltiplo de 30 minutos |
| estado | enum estado_activo_inactivo NOT NULL | default activo |

Disponibilidad semanal (bloques horarios) de cada profesor. CHECK `ck_agenda_profesional_30min` exige minutos/segundos en 0 o 30 tanto en inicio como en fin. EXCLUDE `ex_agenda_profesional_sin_superposicion` (gist): un mismo profesor no puede tener dos bloques activos que se solapen dentro de la misma franja semanal. Trigger `trg_agenda_profesional_validar_rango` valida que el bloque caiga dentro del horario de atención de `agenda_semanal` y que el profesor pertenezca a la academia de esa franja. Índices por `profesor_id` y por `agenda_semanal_id`.

---

## 4. Alumnos

### `alumno`
| Campo | Tipo | Notas |
|---|---|---|
| id | integer identity PK | |
| legajo | varchar(20) GENERATED STORED | `'ALU-' \|\| lpad(id, 6, '0')`, ej. ALU-000123 |
| nombre | varchar(50) NOT NULL | |
| apellido | varchar(50) NOT NULL | |
| dni | varchar(8) NOT NULL | CHECK regex `^[0-9]{7,8}$` |
| fecha_nacimiento | date NOT NULL | CHECK <= CURRENT_DATE |
| telefono | varchar(11) NOT NULL | CHECK regex `^[0-9]{10,11}$` |
| email | varchar(120) (nullable) | CHECK formato de email si no es NULL |
| nivel_educativo | enum nivel_materia NOT NULL | reutiliza el enum `nivel_materia` de `materia.nivel` |
| responsable_nombre | varchar(100) (nullable) | |
| responsable_dni | varchar(8) (nullable) | CHECK regex `^[0-9]{7,8}$` si no es NULL |
| responsable_telefono | varchar(11) (nullable) | CHECK regex `^[0-9]{10,11}$` si no es NULL |
| estado | enum estado_activo_inactivo NOT NULL | default activo |
| created_at | timestamp NOT NULL | default now() |
| updated_at | timestamp NOT NULL | default now() |

CHECK `ck_alumno_responsable_menor`: si el alumno es menor de 18 años (calculado con `age(fecha_nacimiento)`), los tres datos del responsable (`responsable_nombre`, `responsable_dni`, `responsable_telefono`) son obligatorios. UNIQUE parcial `uq_alumno_dni_activo` (dni) WHERE estado='activo'. Índices por (apellido, nombre) y por (nivel_educativo, estado). La alerta de posible duplicado (nombre+apellido+fecha de nacimiento) es un warning de UX en el frontend, no una restricción de unicidad en la base.

---

## 5. Turnos y Calendario

### `turno`
| Campo | Tipo | Notas |
|---|---|---|
| id | integer identity PK | |
| codigo | varchar(20) GENERATED STORED | `'TUR-' \|\| lpad(id, 6, '0')`, ej. TUR-000123 |
| alumno_id | int NOT NULL FK → alumno.id | |
| profesor_id | int NOT NULL FK → profesor.id | |
| materia_id | int NOT NULL FK → materia.id | |
| fecha | date NOT NULL | |
| hora_inicio | time NOT NULL | |
| hora_fin | time NOT NULL | CHECK hora_fin > hora_inicio |
| valor_clase_congelado | numeric(12,2) NOT NULL | CHECK > 0; copiado de `precio_clase` al momento de reservar |
| estado | enum estado_turno NOT NULL | default 'Reservado'; valores: Reservado, Cancelado |
| observaciones | varchar(250) | |
| usuario_id | int NOT NULL FK → usuario.id | quien registró el turno |
| created_at | timestamp NOT NULL | default now() |

EXCLUDE `ex_turno_alumno_sin_superposicion` (gist) WHERE estado='Reservado': un mismo alumno no puede tener dos turnos reservados que se superpongan en el tiempo, con cualquier profesor. El cupo por profesor/franja (contra `profesor.capacidad_maxima_alumnos` o `profesor_materia.capacidad_maxima` cuando corresponde) sí permite superposición entre distintos alumnos y se valida en el backend, no con una constraint. La anticipación mínima de 2 horas y la concurrencia sobre el último cupo también se resuelven en el backend. Índices por (profesor_id, fecha, hora_inicio), por alumno, por materia y por estado.

---

## 6. Vistas

### `vw_huecos_disponibles`
Vista (no persiste datos) usada para HU-CAL-01. Para cada profesor y cada franja de `agenda_profesional` activa, proyecta los próximos 60 días y calcula los huecos libres dentro de esa franja: compara los bloques de `agenda_profesional`/`agenda_semanal` contra los turnos no cancelados (`turno.estado <> 'Cancelado'`) de ese profesor en esa fecha, devolviendo tanto los huecos internos (entre turnos consecutivos) como el hueco final (entre el último turno del día y el cierre de la franja).

Columnas resultantes: `agenda_profesional_id`, `profesor_id`, `fecha`, `hueco_inicio`, `hueco_fin`.

---

## Relaciones (FKs) — resumen

```
usuario.rol_id → rol.id
usuario.academia_id → academia.id (nullable)

agenda.academia_id → academia.id (UNIQUE, 1 a 1)
agenda_semanal.agenda_id → agenda.id

auditoria.usuario_id → usuario.id (ON DELETE SET NULL)
auditoria_sesion.usuario_id → usuario.id (ON DELETE SET NULL)

materia — sin FKs entrantes propias (catálogo global)

profesor.usuario_id → usuario.id (UNIQUE, 1 a 1)

profesor_materia.profesor_id → profesor.id
profesor_materia.materia_id → materia.id

precio_clase.profesor_materia_id → profesor_materia.id

agenda_profesional.agenda_semanal_id → agenda_semanal.id
agenda_profesional.profesor_id → profesor.id

alumno — sin FKs entrantes propias

turno.alumno_id → alumno.id
turno.profesor_id → profesor.id
turno.materia_id → materia.id
turno.usuario_id → usuario.id
```
