# Manual de Usuario — Centro Académico (Borrador)

> **Nota para el redactor:** Este documento contiene la estructura y redacción final lista para copiar y pegar en tu documento o procesador de textos (Word, Google Docs, Canva o PDF). Encontrarás indicadores destacados como `> 📸 [INSERTAR CAPTURA: ...]` indicando exactamente qué pantalla o modal capturar.

---

## 1. Introducción y Roles del Sistema

El **Centro Académico** es una plataforma integral orientada a la gestión académica, administrativa y financiera de institutos y centros de estudio. Permite coordinar turnos de apoyo y clases particulares, controlar asistencias, administrar legajos de alumnos y profesores, cobrar clases dictadas y monitorear la salud del centro mediante indicadores de gestión.

### Roles de Usuario y Permisos

| Rol | Descripción y Alcance |
| :--- | :--- |
| **Gerente** | Acceso total al sistema. Gestiona usuarios y permisos, monitorea tableros e indicadores financieros/operativos, supervisa catálogo de materias y reportes. |
| **Mesa de Entrada** | Operación cotidiana del centro. Administra legajos de alumnos, registra y reprograma turnos, opera el calendario general y efectúa el cobro de clases emitiendo comprobantes. |
| **Profesor** | Consulta su calendario de clases asignadas, registra la asistencia de los alumnos a sus turnos y visualiza el historial de sus dictados. |
| **Alumno (Portal)** | Acceso de autoservicio para consultar sus turnos asignados, reservar horarios según disponibilidad y revisar su estado de pagos e historial. |

---

## 2. Acceso y Seguridad

### 2.1. Inicio de Sesión (Login)
1. Ingrese a la dirección web del sistema en su navegador.
2. Complete su **Correo Electrónico** y **Contraseña**.
3. Haga clic en el botón **"Iniciar Sesión"**.

> 📸 **[INSERTAR CAPTURA: Pantalla de inicio de sesión con los campos de correo y contraseña]**

### 2.2. Primer Inicio de Sesión y Contraseña Temporal
Al ser dado de alta por un administrador, recibirá una contraseña temporal por correo:
1. Ingrese con la contraseña provista.
2. El sistema solicitará automáticamente el cambio obligatorio de contraseña.
3. Defina una contraseña segura cumpliendo los requisitos mínimos de seguridad y confirme la nueva clave.

> 📸 **[INSERTAR CAPTURA: Pantalla o modal de cambio obligatorio de contraseña]**

### 2.3. Recuperación de Contraseña
1. En la pantalla de login, haga clic en **"¿Olvidaste tu contraseña?"**.
2. Ingrese su correo registrado y presione **"Enviar instrucciones"**.
3. Revise su bandeja de entrada y siga el enlace de restablecimiento.

> 📸 **[INSERTAR CAPTURA: Pantalla de recuperación de contraseña]**

---

## 3. Navegación General y Barra Lateral

Una vez autenticado, visualizará la interfaz principal compuesta por:
- **Barra de navegación lateral (Sidebar):** Permite acceder a los diferentes módulos según su rol (Inicio, Calendario, Turnos, Alumnos, Profesores, Materias, Asistencia, Pagos, Usuarios, Reportes).
- **Cabecera superior (Header):** Indica la sección activa, notificaciones pendientes y el perfil del usuario activo con la opción de cerrar sesión.

> 📸 **[INSERTAR CAPTURA: Vista general del dashboard principal con la barra lateral desplegada]**

---

## 4. Módulo de Usuarios y Seguridad (Rol Gerente)

Permite gestionar las cuentas de acceso del personal del instituto.

### 4.1. Visualización y Búsqueda de Usuarios
1. Ingrese a **Usuarios** desde el menú lateral.
2. Utilice el buscador superior para filtrar por **Nombre, Apellido o DNI**.
3. Aplique los filtros combinables por **Rol** (Gerente, Mesa de Entrada, Profesor) o **Estado** (Activos / Inactivos).
4. La tabla lista los usuarios ordenados alfabéticamente con su badge identificador de estado (verde: Activo, gris: Inactivo).

> 📸 **[INSERTAR CAPTURA: Listado de usuarios con filtros de rol/estado y buscador]**

### 4.2. Alta de un Nuevo Usuario
1. En la esquina superior derecha, haga clic en el botón **"+ Nuevo Usuario"**.
2. Complete los datos obligatorios del formulario:
   - **Nombre y Apellido** (máx. 50 caracteres).
   - **DNI** (único en el sistema, 7 u 8 dígitos).
   - **Correo electrónico** (validado y único).
   - **Teléfono** (opcional).
   - **Rol:** Seleccione entre *Gerente*, *Mesa de Entrada* o *Profesor*.
3. Haga clic en **"Guardar Usuario"**.
4. El sistema creará el usuario, enviándole automáticamente sus credenciales provisionales por email.

> 📸 **[INSERTAR CAPTURA: Formulario modal de alta de usuario con campos completos]**

### 4.3. Modificación y Baja Lógica de Usuarios
- **Modificar:** Haga clic en el ícono de lápiz o en la fila del usuario. Actualice los datos necesarios y guarde los cambios.
- **Dar de Baja:** Haga clic en la acción **"Dar de baja"**.
  - Seleccione el **Motivo de baja** (Enfermedad, Retiro, Renuncia, Otro).
  - Si seleccionó "Otro", ingrese el detalle explicativo obligatorio.
  - Confirme en el modal de advertencia. El usuario pasará a estado inactivo y no podrá volver a iniciar sesión, conservando todo su historial auditable.

> 📸 **[INSERTAR CAPTURA: Modal de confirmación de baja de usuario con selección de motivo]**

---

## 5. Módulo de Alumnos

Permite la administración integral de los legajos de los estudiantes.

### 5.1. Listado y Filtros de Alumnos
1. Diríjase a **Alumnos** en el menú.
2. Busque alumnos por **Nombre, Apellido, DNI o Número de Legajo**.
3. Filtre por **Nivel Educativo** (Primario, Secundario, Universitario), **Materia de Interés** o active la casilla **"Ver inactivos"**.

> 📸 **[INSERTAR CAPTURA: Pantalla del listado general de alumnos con filtros y tarjetas/tabla]**

### 5.2. Alta de Alumno
1. Presione **"+ Nuevo Alumno"**.
2. Complete la información personal:
   - Nombre, Apellido, DNI, Fecha de nacimiento, Email y Teléfono.
   - *Nota:* Si el alumno es menor de edad, el sistema exigirá obligatoriamente los datos del **Adulto Responsable** (Nombre, Teléfono, Vínculo).
3. Complete los datos académicos: Nivel educativo, Institución de origen y Materias de interés.
4. Presione **"Guardar"**. El sistema generará el número de legajo correlativo automáticamente.

> 📸 **[INSERTAR CAPTURA: Formulario de alta de alumno mostrando la sección de datos del responsable]**

### 5.3. Ficha Completa del Alumno
Al hacer clic en un alumno se accede a su legajo digital organizado en pestañas:
- **Datos Personales:** Información de contacto, académica y responsable.
- **Historial de Turnos:** Clases pasadas y futuras con estado de reserva.
- **Asistencia:** Porcentaje de concurrencia y registro de presencias/ausencias.
- **Cuenta Corriente / Pagos:** Clases adeudadas, recibos abonados e historial.

> 📸 **[INSERTAR CAPTURA: Ficha de detalle del alumno con sus pestañas de navegación]**

---

## 6. Módulo de Calendario y Turnos

El núcleo operativo para coordinar las clases individuales y grupales.

### 6.1. Vistas del Calendario (Mes, Semana, Día)
1. Ingrese a **Calendario**.
2. Alterne entre las vistas disponibles en la parte superior:
   - **Mes:** Muestra el volumen general de turnos por día. Al hacer clic en un día, se abre la vista detallada de esa fecha.
   - **Semana (vista predeterminada):** Grilla horaria que muestra la distribución de clases en la semana en curso.
   - **Día:** Desglosa los turnos en columnas separadas por cada profesor activo.
3. Utilice los filtros rápidos por **Materia** y **Profesor** para enfocar la agenda.

> 📸 **[INSERTAR CAPTURA: Vista semanal del calendario con turnos coloreados por materia/estado]**

> 📸 **[INSERTAR CAPTURA: Vista mensual del calendario mostrando cantidad de turnos por celda]**

### 6.2. Reserva de un Nuevo Turno
1. Haga clic en un espacio libre de la grilla del calendario o presione **"+ Reservar Turno"** en la sección de Turnos.
2. Seleccione el **Alumno** (buscador predictivo por nombre o DNI).
3. Seleccione la **Materia**.
4. Elija el **Profesor** (el sistema listará únicamente los docentes habilitados para esa materia y con disponibilidad en el horario).
5. Defina la **Fecha**, **Hora de inicio** y **Duración**.
6. Ingrese observaciones si corresponde y presione **"Confirmar Reserva"**.

> 📸 **[INSERTAR CAPTURA: Modal de reserva de turno con selectores de alumno, materia y profesor]**

### 6.3. Modificación de un Turno (Reprogramación)
1. Haga clic sobre el turno reservado en el calendario o listado de turnos.
2. Presione el botón **"Modificar Turno"** (disponible para turnos futuros en estado "Reservado").
3. Puede modificar el **Profesor**, la **Fecha** y el **Horario**.
4. El sistema desplegará un modal comparativo con el detalle **"Antes → Después"** para revisar los cambios.
5. Presione **"Confirmar Cambio"**. El horario anterior quedará inmediatamente liberado para otros alumnos.

> 📸 **[INSERTAR CAPTURA: Modal comparativo "Antes -> Después" de modificación de turno]**

### 6.4. Cancelación de Turno
1. En el detalle del turno, seleccione **"Cancelar Turno"**.
2. Indique obligatoriamente el **Motivo de cancelación** en el menú desplegable:
   - *Pedido del alumno*
   - *Ausencia del profesor*
   - *Error de carga*
   - *Otro* (habilita un campo de texto obligatorio para detallar).
3. Haga clic en **"Confirmar Cancelación"**.
4. El turno cambiará a estado "Cancelado" (color rojo) y el cupo se liberará de inmediato.

> 📸 **[INSERTAR CAPTURA: Modal de cancelación de turno con selección obligatoria del motivo]**

---

## 7. Módulo de Asistencia y Clases Diarias

Permite a los profesores y a mesa de entrada registrar la concurrencia a las clases del día.

1. Ingrese a **Asistencia** (o **"Clases de Hoy"**).
2. Seleccione la clase correspondiente al horario actual.
3. En la lista de alumnos inscriptos, marque el estado correspondiente:
   - **Presente** (verde)
   - **Ausente con aviso** (amarillo)
   - **Ausente sin aviso** (rojo)
4. Puede ingresar notas pedagógicas u observaciones de la clase dictada.
5. Presione **"Guardar Asistencia"**.

> 📸 **[INSERTAR CAPTURA: Pantalla de registro de asistencia con lista de alumnos y botones de estado]**

---

## 8. Módulo de Pagos y Cobranzas (Mesa de Entrada y Gerente)

Permite registrar el cobro de las clases ya dictadas a los alumnos y emitir los comprobantes correspondientes.

### 8.1. Registro de Cobro paso a paso
1. Ingrese a la sección **Pagos**.
2. En el buscador superior, localice al alumno por **DNI, Nombre o N° de Legajo**.
3. El sistema listará automáticamente todas las **clases dictadas pendientes de cobro**.
4. Marque mediante las casillas de verificación (checkbox) la o las clases que el alumno va a cancelar en este momento.
5. En el panel lateral o inferior, observe el **Monto Total Calculado** de forma automática según la tarifa vigente de cada clase seleccionada.
6. Complete los datos de la transacción:
   - **Medio de Pago:** Seleccione *Efectivo* o *Transferencia bancaria*.
   - **N° de Operación / Referencia:** Obligatorio en caso de transferencia bancaria (ingrese el código de comprobante bancario).
   - **Fecha de pago:** Establecida por defecto en el día de hoy (no admite fechas futuras).
   - **Observaciones:** Opcional (ej.: "Abona responsable en recepción").
7. Presione **"Registrar Pago"**.
8. Confirme los datos en el modal de verificación.

> 📸 **[INSERTAR CAPTURA: Pantalla de selección de clases pendientes de pago con total autocalculado]**

> 📸 **[INSERTAR CAPTURA: Formulario de pago con medio de pago y campo de comprobante de transferencia]**

### 8.2. Emisión y Consulta de Comprobantes
- Al confirmarse el pago, las clases pasan a estado **"Pagada"** y el sistema genera automáticamente un **Recibo oficial numerado** (ejemplo: `REC-000124`).
- El comprobante detalla: fecha, nombre y DNI del alumno, clases abonadas, monto, método de pago y el nombre del usuario de mesa de entrada que cobró.
- Desde el historial de pagos del alumno se puede consultar, imprimir o exportar cualquier comprobante emitido.

> 📸 **[INSERTAR CAPTURA: Modal o vista previa del comprobante / recibo emitido (REC-XXXXXX)]**

---

## 9. Módulo de Indicadores y Reportes de Gestión (Rol Gerente)

Tablero de control ejecutivo para la toma de decisiones estratégicas.

### 9.1. Filtros del Tablero
En la parte superior puede segmentar los datos por:
- **Rango de Fechas / Período:** Por defecto el mes en curso (configurable hasta 12 meses).
- **Materia:** Seleccione una materia específica o visualice el consolidado general.
- **Profesor:** Filtre por docente para evaluar su carga horaria.

> 📸 **[INSERTAR CAPTURA: Cabecera del tablero con selectores de fecha, materia y profesor]**

### 9.2. Tarjetas de Indicadores Principales (KPIs)
- **Turnos Generados:** Total de turnos reservados en el período seleccionado.
- **Tasa de Cancelación (%):** Relación porcentual entre turnos cancelados y turnos totales.
- **Nivel de Ocupación (%):** Porcentaje de horas de clase efectivamente dictadas respecto de la disponibilidad total de profesores.
- **Alumnos Activos y Nuevas Altas:** Cantidad de estudiantes regulares y altas incorporadas en el período.
- **Ingresos Totales Cobrados:** Suma monetaria total recaudada en concepto de clases pagadas durante el período.

> 📸 **[INSERTAR CAPTURA: Tarjetas de métricas principales (KPIs numéricos con porcentajes y montos)]**

### 9.3. Gráficos Estadísticos
- **Evolución Semanal de Turnos:** Gráfico de barras que ilustra la demanda a lo largo de las semanas.
- **Ranking Top 5 Materias:** Gráfico con las asignaturas de mayor volumen de alumnos e ingresos generados.
- **Mapa de Calor / Ocupación:** Grilla visual que destaca los días y horarios pico de demanda académica.

> 📸 **[INSERTAR CAPTURA: Gráficos de barras de turnos y ranking de las materias más solicitadas]**

---

## 10. Preguntas Frecuentes y Solución de Problemas

#### ¿Qué ocurre si intento dar de baja a un alumno con turnos pendientes?
El sistema no permitirá la baja si el alumno cuenta con reservas futuras activas. Deberá ingresar primero al módulo de turnos, cancelarlas indicando el motivo correspondiente, y luego proceder con la baja lógica del alumno.

#### ¿Cuántas veces se puede modificar un turno?
Por regla de negocio, cada turno admite hasta **2 modificaciones**. Si se alcanza el límite, el sistema bloqueará nuevas reprogramaciones y sugerirá cancelar el turno y generar una nueva reserva.

#### ¿Un profesor puede cancelar turnos o cobrar clases?
No. El rol Profesor únicamente tiene permisos para consultar su agenda de clases y marcar asistencia. Las cancelaciones y la gestión de cobros son exclusivas de Mesa de Entrada y Gerencia.

#### ¿Cómo distingo los turnos cancelados en el calendario?
Los turnos cancelados se ocultan por defecto para mantener la vista limpia. Puede visualizarlos en cualquier momento activando el filtro **"Ver cancelados"**; se mostrarán identificados en color rojo.
