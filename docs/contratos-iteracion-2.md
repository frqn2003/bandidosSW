# Contratos de API — Iteración 2

Documento de handoff y acuerdo técnico entre Frontend y Backend para la **Iteración 2** del Centro Académico.

---

## 1. Reglas Técnicas y Corrección de Bugs Transversales

### 1.1. Manejo de Booleanos en Query Strings (`booleanQuery`)
En JavaScript, `Boolean("false") === true`, por lo que el uso de `z.coerce.boolean()` transformaba `?verCancelados=false` o `?soloActivas=false` en `true`.  
Se definió el parser canónico en `src/contracts/catalogo.ts` y se utiliza en todos los contratos:
```ts
export const booleanQuery = z
  .enum(["true", "false"])
  .transform((v) => v === "true");
```

### 1.2. Zona Horaria de Referencia (`hoyAR`)
La base de datos utiliza `America/Argentina/Buenos_Aires` (UTC-3). Validar fechas contra `new Date().toISOString().slice(0, 10)` (UTC) provocaba que a partir de las 21:00 hs en Argentina se aceptaran fechas del "día siguiente".  
Todas las validaciones de fechas máximas y fechas de nacimiento emplean:
```ts
export const hoyAR = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
```

### 1.3. Normalización de Strings Vacíos (`""` a `null`)
Los inputs HTML opcionales no completados envían `""` en lugar de `null`, lo cual causaba fallos en `.email()` y en los regex de DNI y teléfono. Se incorporó `z.preprocess()` en todos los campos opcionales para sanitizar strings vacíos a `null` de forma transparente.

---

## 2. Contratos Creados

### 2.1. `src/contracts/pago.ts` (HU-PAG-01: Registro de Pago de Clases)
- **Roles habilitados:** Mesa de Entrada y Gerente (Profesor recibe `ACCESO_DENEGADO` 403).
- **Rutas:**
  - `RUTA = "/api/pagos"`
  - `rutaPago = (id: number) => "/api/pagos/${id}"`
  - `RUTA_CLASES_PENDIENTES = "/api/pagos/clases-pendientes"`
  - `RUTA_FORMAS_PAGO = "/api/formas-pago"` (re-exportada desde `catalogo.ts`)
- **Reglas de negocio:**
  - **Monto autocalculado:** El frontend **no envía el monto** en el body (`crearPagoBody` es `.strict()`); el backend calcula la suma exacta de `valor_clase_congelado` de los turnos seleccionados en una transacción.
  - **Clases pendientes:** Turnos que ya comenzaron (`fecha + hora_inicio <= hoyAR()`), que no están cancelados y que tienen `pagado = false`.
  - **Formas de pago:** Múltiples medios posibles (mínimo 1). Si la forma de pago lo requiere (`requiere_nro_operacion = true`, ej: Transferencia), `nroOperacion` es obligatorio (alfanumérico máx. 30). Para Efectivo (`requiere_nro_operacion = false`), `nroOperacion` se normaliza a `null`.
  - **Comprobante único:** Formato `"REC-000123"`.
  - **Historial:** Ordenado de forma predeterminada por fecha descendente (`fecha_pago DESC, created_at DESC`).
- **Errores de Dominio:**
  - `ALUMNO_INACTIVO` (422), `ALUMNO_NO_ENCONTRADO` (404), `SIN_CLASES_SELECCIONADAS` (422), `TURNO_NO_PERTENECE_ALUMNO` (422), `TURNO_CANCELADO` (409), `TURNO_NO_TRANSCURRIDO` (422), `TURNO_YA_PAGADO` (409), `FORMA_PAGO_INACTIVA` (422), `FORMA_PAGO_REQUERIDA` (422), `NRO_OPERACION_REQUERIDO` (422), `FECHA_PAGO_FUTURA` (422), `ACCESO_DENEGADO` (403), `NO_ENCONTRADO` (404), `DATOS_INVALIDOS` (422).

---

### 2.2. `src/contracts/indicadores.ts` (HU-IND-01: Indicadores Iniciales de Gestión)
- **Roles habilitados:** Exclusivo Gerente (`ACCESO_DENEGADO` 403 para otros roles).
- **Ruta:** `RUTA = "/api/indicadores"`.
- **Request (`indicadoresQuery`):**
  - `desde` y `hasta`: Opcionales. Por defecto toman el primer y último día del mes en curso en Argentina. Rango máximo permitido: 12 meses (366 días).
  - `profesorId` y `materiaId`: Opcionales y combinables. Aplican a métricas de turnos, horas, ocupación, ingresos y rankings, pero **no** a `alumnosActivos` ni `altasAlumnos` (indicadores globales del centro).
- **Response (`IndicadoresResponse`):**
  - **Escala de porcentajes:** Escala estándar **0–100** con 2 decimales (ej: `75.50` = 75.50%). Si el denominador es 0, devuelven `null` para que el frontend pinte `" — "`.
  - **Ocupación:** `(horas dictadas no canceladas / horas de disponibilidad ofertada) * 100`.
  - **Distribución de semanas:** `turnosPorSemana` con clave inequívoca `fechaInicio` (aaaa-mm-dd) y `etiquetaSemana` (ej: `"Semana del 15/09"`).
  - **Rankings Top 5:**
    - `rankingMateriasMasPedidas`: ordenado por cantidad de turnos y horas dictadas.
    - `rankingMateriasMayorIngreso`: ordenado por recaudación en pesos ($).
  - `sinDatos: boolean`: Flag para mostrar el estado vacío ("Sin datos para el período seleccionado").
- **Errores de Dominio:**
  - `RANGO_INVALIDO` (422), `RANGO_MAXIMO_EXCEDIDO` (422), `ACCESO_DENEGADO` (403), `DATOS_INVALIDOS` (422).

---

### 2.3. `src/contracts/catalogo.ts` (Catálogos y Parámetros)
- **Propósito:** Tablas maestras de solo lectura y parámetros del sistema requeridos por la Iteración 2.
- **Rutas exportadas:**
  - `RUTA_FORMAS_PAGO = "/api/formas-pago"`
  - `RUTA_MOTIVOS_BAJA = "/api/motivos-baja"`
  - `RUTA_MOTIVOS_CANCELACION = "/api/motivos-cancelacion"`
  - `RUTA_PARAMETROS = "/api/parametros"`
  - `rutaParametro = (clave: string) => "/api/parametros/${clave}"`
- **Seeds y consistencia con DB:**
  - Formas de pago: `Efectivo` (`requiere_nro_operacion = false`), `Transferencia` (`requiere_nro_operacion = true`).
  - Motivos: `Otro` (`requiere_detalle = true`), restantes (`requiere_detalle = false`).
  - Parámetros del sistema: `horas_anticipacion_turno` (2), `max_modificaciones_turno` (2), `horas_cancelacion_tardia` (24).

---

## 3. Contratos Actualizados

### 3.1. `src/contracts/usuario.ts` (HU-SIS-00: Alta, Edición y Baja de Usuarios)
- **Contraseña temporal en alta:** Se eliminó `password` del body. El sistema genera una clave temporal alfanumérica (mínimo 8 caracteres), la envía al email registrado y obliga al usuario a cambiarla en su primer login (`debe_cambiar_password = true`). Si el servicio de email falla, devuelve `ERROR_ENVIO_EMAIL` (500).
- **Teléfono:** Campo opcional normalizado (numérico, 10 u 11 dígitos).
- **Baja lógica obligatoria con motivo:** `inactivarUsuarioBody` exige `motivoBajaId` y `detalleMotivoBaja` si el motivo lo requiere ("Otro").
- **Reactivación lógica:** `POST /api/usuarios/:id/reactivar` con `reactivarUsuarioBody`.
- **Reglas duras de auditoría:**
  - Auto-baja bloqueada (`AUTOBAJA_NO_PERMITIDA` 409).
  - Bloqueo de baja del último Gerente activo (`ULTIMO_GERENTE_ACTIVO` 409).
- **Listado y Orden:**
  - Orden alfabético predeterminado: Apellido y luego Nombre (A-Z).
  - Precedencia de filtros: Por defecto solo activos; `verInactivos=true` incluye inactivos; `estado` filtra estrictamente por el estado enviado.

---

### 3.2. `src/contracts/turno.ts` (HU-TUR-02: Modificación o Cancelación de Turno)
- **Buscador:** Búsqueda textual parcial por código de turno, legajo, DNI, nombre o apellido del alumno.
- **Acciones precalculadas por backend:**
  - `TurnoResponse` incluye `puedeModificar: boolean`, `puedeCancelar: boolean` y `motivoDeshabilitado?: string | null` para deshabilitar botones en frontend sin duplicar lógica de anticipación ni parámetros.
- **Modificación:** Solo turnos en estado 'Reservado' futuros. Se pueden cambiar `profesorId`, `fecha`, `horaInicio` y `observaciones`. Alumno y materia son inmutables. Máximo de 2 modificaciones por turno (`MAX_MODIFICACIONES_ALCANZADO` 409).
- **Cancelación:** Requiere `motivoCancelacionId` y `detalleCancelacion` si aplica. Calcula automáticamente si es `cancelacionTardia` (< 24hs). Los turnos cancelados no pueden reactivarse.
- **Precedencia de filtros:**
  - Por defecto solo turnos en estado 'Reservado'.
  - `verCancelados=true` incluye turnos 'Cancelado'.
  - `estado` explícito filtra únicamente por dicho estado.

---

### 3.3. `src/contracts/calendario.ts` (HU-CAL-02: Calendario Completo)
- **Vista Mensual:** `RUTA_MES = "/api/calendario/mes"` (`anio`, `mes`, `profesorId?`, `materiaId?`, `verCancelados?`) devuelve `dias: { fecha, cantidadTurnos }[]`.
- **Vista Semana / Día:**
  - `agendaQuery`: admite consulta por día (`fecha`) o rango semanal (`desde` y `hasta`) para obtener la semana completa en un solo request.
  - Bloques de disponibilidad: `bloques: { profesorId?: number, horaInicio, horaFin }[]` incluye `profesorId` para asignar cada bloque a su columna correspondiente en la vista Día.
  - `AgendaDiaResponse`: incluye array de `profesores` visibles para armar dinámicamente las columnas.
- **Huecos libres:** Límite máximo de 60 días hacia adelante (acorde a la vista `vw_huecos_disponibles` de Supabase). Rangos mayores devuelven `RANGO_DEMASIADO_AMPLIO` (422).
- **Actualización:** Polling configurable en frontend cada 30 segundos.

---

### 3.4. `src/contracts/alumno.ts` (HU-ALU-02: Edición, Baja y Ficha Completa)
- **Ficha completa:** Incorpora `institucionOrigen`, `observacionesGenerales` y `materiasInteresIds` (N:M con `alumno_materia_interes`).
  - Al editar, el backend valida que solo las materias de interés *nuevas* estén activas.
- **Responsable (Regla "todo o nada"):**
  - Menor de 18 años: los tres datos (`nombre`, `dni`, `telefono`) son obligatorios.
  - Mayor de 18 años: o los tres son nulos, o los tres se completan.
- **Baja lógica y Deuda pendiente:**
  - Si tiene turnos futuros reservados, se bloquea con `ALUMNO_CON_TURNOS_FUTUROS` (409) informando `datos: { cantidadTurnosFuturos: number }`.
  - `AlumnoResponse` incluye `deudaPendiente: boolean`. Al dar de baja, si tiene deuda y no se envió `confirmarConDeuda: true`, devuelve `ALUMNO_CON_DEUDA` (409) para que el frontend solicite confirmación explícita.
- **Reactivación:** `POST /api/alumnos/:id/reactivar` revalida unicidad de DNI.
- **Precedencia de filtros:**
  - Por defecto solo activos.
  - `verInactivos=true` incluye inactivos.
  - `estado` explícito filtra por dicho estado.

---

## 4. Matriz Resumen de Endpoints (Iteración 2)

| Módulo | Método | Endpoint | Descripción | HU |
|---|---|---|---|---|
| **Pagos** | `GET` | `/api/pagos` | Historial de pagos (orden fecha DESC) | HU-PAG-01 |
| **Pagos** | `POST` | `/api/pagos` | Registrar cobro de clases seleccionadas | HU-PAG-01 |
| **Pagos** | `GET` | `/api/pagos/:id` | Detalle del comprobante emitido | HU-PAG-01 |
| **Pagos** | `GET` | `/api/pagos/clases-pendientes` | Clases transcurridas adeudadas por alumno | HU-PAG-01 |
| **Indicadores** | `GET` | `/api/indicadores` | Métricas, ocupación y rankings para Gerente | HU-IND-01 |
| **Usuarios** | `POST` | `/api/usuarios/:id/inactivar` | Baja lógica obligatoria con motivo | HU-SIS-00 |
| **Usuarios** | `POST` | `/api/usuarios/:id/reactivar` | Reactivación lógica de usuario | HU-SIS-00 |
| **Turnos** | `PUT` | `/api/turnos/:id` | Modificar profesor, fecha, hora (máx. 2) | HU-TUR-02 |
| **Turnos** | `POST` | `/api/turnos/:id/cancelar` | Cancelar turno con motivo obligatorio | HU-TUR-02 |
| **Calendario** | `GET` | `/api/calendario/mes` | Resumen mensual de cantidad de turnos | HU-CAL-02 |
| **Calendario** | `GET` | `/api/calendario/agenda` | Agenda de turnos y bloques (día o semana) | HU-CAL-02 |
| **Alumnos** | `PUT` | `/api/alumnos/:id` | Modificar ficha completa con materias de interés | HU-ALU-02 |
| **Alumnos** | `POST` | `/api/alumnos/:id/inactivar` | Baja lógica (valida turnos futuros y deuda) | HU-ALU-02 |
| **Alumnos** | `POST` | `/api/alumnos/:id/reactivar` | Reactivación lógica de alumno | HU-ALU-02 |
| **Catálogos** | `GET` | `/api/formas-pago` | Formas de pago activas (`requiereNroOperacion`) | HU-PAG-01 |
| **Catálogos** | `GET` | `/api/motivos-baja` | Motivos de baja de usuarios | HU-SIS-00 |
| **Catálogos** | `GET` | `/api/motivos-cancelacion` | Motivos de cancelación de turnos | HU-TUR-02 |
| **Catálogos** | `GET` | `/api/parametros` | Parámetros del sistema | HU-TUR-02 |
