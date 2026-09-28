# HU-SIS-00 - Alta, Edición y Baja de Usuarios del Sistema

**Épica:** Gestión de Usuarios y Control de Accesos  
**Prioridad:** 2.0  
**Como...:** Gerente del centro...  
**Necesito...:**   
**Para...:** Que cada integrante del centro acceda al sistema con credenciales propias y acordes a su función

**Criterios de Aceptación:**

CRITERIOS OBLIGATORIOS:  
- Formulario único parametrizado en 3 modos: INSERCIÓN, EDICIÓN y LECTURA (en modo LECTURA todos los campos se muestran deshabilitados/en gris, sin botón Guardar).  
- Campos y tipos de dato:  
• Nombre: texto, máx. 50 caracteres, obligatorio.  
• Apellido: texto, máx. 50 caracteres, obligatorio.  
• DNI: numérico, 7 u 8 dígitos, obligatorio y único.  
• Email: texto con formato validado (usuario@dominio), obligatorio y único.  
• Teléfono: numérico, 10 u 11 dígitos, opcional.  
• Rol: combo desplegable con valores predefinidos (Gerente, Mesa de Entrada, Profesor), obligatorio.  
• Estado: booleano Activo/Inactivo; por defecto "Activo" al dar de alta.  
- Valida que email y DNI no se repitan entre usuarios activos; si ya existen, rechaza la operación y muestra el mensaje de error en rojo debajo del campo correspondiente.  
- Al alta, genera una contraseña temporal alfanumérica (mínimo 8 caracteres) y la envía al email registrado; el sistema obliga a cambiarla en el primer inicio de sesión.  
- El usuario dado de baja debe tener un campo obligatorio extra:  
• Motivo de baja: combo desplegable generico (Enfermedad, Retiro, Renuncia, Otro).  
• Detalle del motivo: texto, máximo 200 caracteres, obligatorio solo si el motivo es "Otro".  
- Solo por la baja un usuario puede cambiar de estado "activo" a "inactivo"  
- La baja es LÓGICA, con modal de confirmación (botón "Confirmar" en rojo, "Cancelar" en gris); se conservan datos e historial de auditoría íntegros.  
- Un usuario inactivo no puede iniciar sesión ni ser seleccionado en combos/listas de otros módulos.  
- El Gerente no puede desactivar su propio usuario ni al último Gerente activo del sistema; en ambos casos muestra un mensaje de error.  
- Listado de usuarios:  
• Muestra por defecto solo los activos.  
• Ordenado alfabéticamente por Apellido y luego por Nombre (ascendente A-Z).  
• Filtros combinables por Rol y Estado, se pueden aplicar de manera simultanea.  
• Buscador por Nombre, Apellido o DNI, con coincidencia parcial y sin distinguir mayúsculas/minúsculas o acentos.  
- Registra en bitácora de auditoría cada alta, modificación y baja: usuario responsable, fecha, hora, campo modificado, valor anterior y valor nuevo.  

CRITERIOS OPCIONALES / DESEABLES:  
- Ícono o badge de color (verde = activo, gris = inactivo) junto al nombre en el listado.  
- Rol "Alumno" habilitado para un portal de autoservicio de solo lectura (sus turnos, asistencia y pagos).  
- Indicador de fortaleza de la contraseña temporal (semáforo rojo/amarillo/verde).  
- Exportación del listado de usuarios a Excel o PDF.  
- Paginación del listado (por ejemplo, 50 registros por página).  
- Doble confirmación adicional antes de ejecutar la baja de un usuario.  
- Botón de activar para usuarios inactivos.  

---

# HU-TUR-02 - Modificación o Cancelación de Turno

**Épica:** Reserva y Gestión de Turnos  
**Prioridad:** 1.0  
**Como...:** Personal de Mesa de Entrada...  
**Necesito...:** Modificar los datos de un turno reservado o cancelarlo indicando el motivo correspondiente  
**Para...:** Gestionar cambios de fecha, horario o profesor y liberar el cupo cuando un turno deba ser cancelado, manteniendo el historial de la reserva

**Criterios de Aceptación:**

CRITERIOS OBLIGATORIOS:  

-Buscador de turnos por Código de turno, DNI o Nombre/Apellido del alumno (texto libre, coincidencia parcial).  
-Solo permite modificar o cancelar turnos en estado "Reservado" cuya fecha y hora de inicio sean futuras. En cualquier otro caso, las acciones correspondientes se muestran deshabilitadas en gris.  

Para modificar el turno:  

-Usa el mismo formulario de turno en modo EDICIÓN: Alumno y Materia se muestran en gris (solo lectura); son editables Profesor (combo filtrado por la materia), Fecha, Horario y Observaciones, con los mismos tipos de dato y rangos que en la reserva.  
-Aplica las mismas validaciones que la reserva: disponibilidad del profesor, cupos, no superposición del alumno y anticipación mínima de 2 horas respecto del inicio original y del nuevo.  
-Antes de guardar muestra un modal de confirmación con el detalle "Antes → Después", con los botones "Confirmar" y "Cancelar". Esto debería poner ambos modales uno alado del otro para mejor lectura de cambios  
-El horario original se libera únicamente cuando se confirma la modificación. Si la validación falla, el turno original se conserva sin cambios.  
-Conserva el código de turno original.  
-No permite cambiar la materia ni el alumno del turno.  
-Permite hasta 2 modificaciones por turno (parametrizable). Al alcanzarlo, muestra un mensaje en rojo e indica cancelar y reservar nuevamente.  
-El detalle del turno muestra el contador "Modificado N veces".  
-Registra en bitácora cada modificación: usuario responsable, fecha, hora, campo modificado, valor anterior y valor nuevo.  

Para cancelar el turno:  

-Al presionar "Cancelar turno", abre un modal de confirmación con los datos del turno y el siguiente campo obligatorio:  
     Motivo: combo desplegable (Pedido del alumno, Ausencia del profesor, Error de carga, Otro), obligatorio.  
     Detalle del motivo: texto, máximo 200 caracteres, obligatorio solo si el motivo es "Otro".  
-Botón "Confirmar" en rojo y "Cancelar" en gris.  
-Al confirmar, el turno cambia a estado "Cancelado" (rojo). La cancelación es LÓGICA y el turno permanece en el historial.  
-El cupo liberado queda disponible de inmediato para nuevas reservas.  
-Un turno cancelado no puede reactivarse; para retomarlo debe generarse una nueva reserva.  
-Si la cancelación se realiza con menos de 24 horas de anticipación (parametrizable), el turno queda marcado como "Cancelación tardía" y dicha marca es visible en el detalle del turno.  
-Los turnos cancelados se ocultan por defecto en los listados y se muestran activando el filtro "Ver cancelados".  
-Registra en bitácora cada cancelación: usuario responsable, fecha, hora, motivo, estado anterior y estado nuevo.  

CRITERIOS OPCIONALES / DESEABLES:  

-Notificación por email al alumno o a su responsable con el detalle de la modificación o cancelación.  
-Sugerencia de horarios alternativos cuando el horario elegido no tiene cupo.  
-Reprogramar un turno arrastrándolo y soltándolo desde el calendario.  
-Cancelación masiva de todos los turnos de un profesor en una fecha, con listado de alumnos a reprogramar.  
-Permitir al Profesor cancelar sus propios turnos con el motivo "Ausencia del profesor", notificando a Mesa de Entrada.  
-Resaltar en el listado los turnos que fueron modificados.  
-Doble confirmación adicional antes de cancelar.  

---

# HU-CAL-02 - Calendario Completo: Vista Mensual, Filtro por Materia y Acciones sobre Turnos

**Épica:** Calendarios de Turnos  
**Prioridad:** 1.0  
**Como...:** Personal de Mesa de Entrada...  
**Necesito...:** Ampliar el calendario con vista mensual, filtro por materia y acciones directas sobre los turnos, con actualización en tiempo real  
**Para...:** Tener una visión global de la actividad por profesor o por materia y gestionar los turnos sin salir del calendario

**Criterios de Aceptación:**

CRITERIOS OBLIGATORIOS:  
- Agrega la vista Mes; la vista Semana continúa como predeterminada.  
- Filtros combinables: Profesor (combo con activos) y Materia (combo con activas); ya no son obligatorios y, sin filtros, muestra los turnos de todos los profesores.  
- Cuando hay más de un profesor visible, cada turno muestra además el Apellido del profesor y, en la vista Día, los turnos se agrupan en una columna por profesor.  
- En la vista Mes cada día muestra la cantidad de turnos; al hacer clic en un día abre la vista Día correspondiente.  
- Los turnos "Cancelado" (rojo) se ocultan por defecto y se muestran activando el filtro "Ver cancelados".  
- El detalle del turno (modo LECTURA) incluye los botones "Modificar" y "Cancelar turno" (HU-TUR-02), habilitados solo si el rol y el estado del turno lo permiten; el Profesor no ve botones de edición.  
- El calendario se actualiza sin recargar la página cuando cualquier usuario reserva, modifica o cancela un turno (demora máxima de 30 segundos).  
- Se mantiene la restricción por rol: el Profesor visualiza únicamente su propio calendario.  

CRITERIOS OPCIONALES / DESEABLES:  
- Reprogramar un turno arrastrándolo y soltándolo en otra franja libre.  
- Indicador de cantidad de turnos por profesor en la cabecera de cada columna.  
- Filtro rápido "Solo franjas con cupo disponible".  
- En el caso de tener varios turnos en franjas, de distintas materias o alumnos, mostrar unos 3 o 5 turnos y un botón diciendo exactamente cuantos turnos más hay  

---

# HU-PAG-01 - Registro de Pago de Clases

**Épica:** Gestión de Pagos  
**Prioridad:** 2.0  
**Como...:** Personal de Mesa de Entrada...  
**Necesito...:** Registrar el pago de las clases ya dictadas de un alumno, seleccionando las clases que se abonan e indicando el medio de pago  
**Para...:** Iniciar el control de los cobros del centro y entregar un comprobante al alumno

**Criterios de Aceptación:**

CRITERIOS OBLIGATORIOS:  
- Buscador de alumno por DNI, Nombre, Apellido o N° de legajo (solo alumnos activos).  
- Al seleccionar al alumno, lista sus clases pendientes de pago: turnos cuya fecha y hora de inicio ya transcurrieron, que no están "Cancelado" y que no fueron pagados.  
- Columnas de la lista: Fecha, Materia, Profesor, Importe (valor por clase de la materia vigente al momento de la clase) y Estado de pago (Pendiente = amarillo, Pagada = verde).  
- Permite seleccionar una o varias clases (checkbox); el sistema calcula y muestra el total de la selección.  
- Campos del pago:  
• Medio de pago: seleccionable múltiple (Efectivo, Transferencia), obligatorio.  
• Monto: numérico decimal (2 decimales), autocalculado con el total de la selección y no editable en este incremento (los pagos parciales se incorporan en HU-PAG-02).  
• N° de operación o referencia: alfanumérico, máx. 30 caracteres, obligatorio salvo para "Efectivo".  
• Fecha de pago: fecha dd/mm/aaaa, por defecto hoy, no futura.  
• Observaciones: texto, máx. 200 caracteres, opcional.  
- Antes de guardar muestra un modal de confirmación con el detalle del pago (botón "Confirmar" en verde, "Cancelar" en gris).  
- Al confirmar, las clases seleccionadas pasan a estado de pago "Pagada" y no pueden volver a seleccionarse para otro pago.  
- Genera un comprobante con número único e irrepetible (formato "REC-000123") que incluye: datos del alumno, detalle de clases abonadas, medio de pago, monto, fecha y usuario que registró el cobro.  
- Historial de pagos del alumno en modo LECTURA, ordenado por fecha descendente, con N° de comprobante, fecha, medio de pago y monto.  
- Acceso permitido a Mesa de Entrada y Gerente; el Profesor no accede a este módulo.  
- Registra en bitácora cada pago: usuario responsable, fecha, hora, monto y detalle de clases.  

CRITERIOS OPCIONALES / DESEABLES:  
- Descarga del comprobante en PDF y envío por email.  
- Impresión del comprobante.  
- Cierre de caja diario por medio de pago.  

---

# HU-IND-01 - Indicadores Iniciales de Gestión

**Épica:** Indicadores y Tableros  
**Prioridad:** 1.0  
**Como...:** Gerente del centro...  
**Necesito...:** Visualizar un primer tablero con indicadores de turnos, ocupación, alumnos e ingresos del período seleccionado  
**Para...:** Comenzar a monitorear la actividad del centro y detectar necesidades de ajuste en horarios y profesores

**Criterios de Aceptación:**

CRITERIOS OBLIGATORIOS:  
- Filtros combinables: Período (rango de fechas dd/mm/aaaa, por defecto el mes en curso, máximo 12 meses), Materia (combo con activas) y Profesor (combo con activos).  
- Indicadores en tarjetas numéricas:  
• Turnos generados en el período (incluye cancelados).  
• % de cancelaciones = turnos "Cancelado" / turnos generados.  
• % de ocupación = horas de turnos no cancelados / horas de disponibilidad de los profesores en el período.  
• Top de materias más pedidas/ocupadas por alumnos y que más generan ingresos  
• Alumnos activos (a la fecha) y altas de alumnos en el período.  
• Ingresos cobrados: suma de los pagos registrados en el período, en pesos.  
- Los filtros de Materia y Profesor se aplican a todos los indicadores salvo Alumnos activos y Altas de alumnos.  
- Gráfico de barras de turnos por semana y ranking de las 5 materias con más turnos.  
- Acceso exclusivo del rol Gerente; los datos son de solo lectura.  
- Si no hay datos para el período, muestra "Sin datos para el período seleccionado"; si un denominador es 0, muestra "—".  
- Los datos se recalculan al cambiar los filtros o presionar "Actualizar".  

CRITERIOS OPCIONALES / DESEABLES:  
- Exportación del tablero a PDF.  
- Tooltip con la fórmula de cada indicador.  
- Acceso directo desde cada tarjeta al listado de origen.  
- Gráficos de torta o de barra para cada uno de los indicadores  

---

# HU-ALU-02 - Edición, Baja y Ficha Completa de Alumnos

**Épica:** Gestión de Alumnos e Historial de Asistencia  
**Prioridad:** 2.0  
**Como...:** Personal de Mesa de Entrada...  
**Necesito...:** Editar los datos del alumno, darlo de baja de forma lógica y completar su ficha con datos académicos, con listados filtrables  
**Para...:** Mantener el legajo actualizado y completo durante todo el paso del alumno por el centro

**Criterios de Aceptación:**

CRITERIOS OBLIGATORIOS:  
- Habilita el modo EDICIÓN del formulario paramétrico (INSERCIÓN, EDICIÓN y LECTURA) con los mismos campos y validaciones de la alta; N° de legajo y Fecha de alta permanecen en gris y no editables; si se modifica el DNI se valida nuevamente su unicidad.  
- Campos adicionales de la ficha completa:  
• Institución de origen: texto, máx. 100 caracteres, opcional.  
• Materias de interés: selección múltiple tomada del catálogo de materias activas, opcional.  
• Observaciones generales: texto, máx. 250 caracteres, opcional.  
- Al modificar la Fecha de nacimiento se reevalúa la obligatoriedad de los datos del Responsable.  
- La baja es LÓGICA, con modal de confirmación (botón "Confirmar" en rojo, "Cancelar" en gris); se conserva íntegro el historial del alumno (turnos, asistencias y pagos).  
- No permite la baja si el alumno tiene turnos futuros en estado "Reservado"; informa la cantidad y ofrece ir a cancelarlos (HU-TUR-02). Si tiene deuda pendiente, advierte pero permite continuar.  
- Un alumno inactivo no puede ser seleccionado en combos ni buscadores de otros módulos.  
- Permite reactivar un alumno inactivo (Estado = Activo), validando nuevamente la unicidad del DNI.  
- Listado ampliado: filtros combinables por Nivel educativo, Materia de interés y Estado, con la opción "Ver inactivos".  
- Registra en bitácora cada modificación, baja y reactivación: usuario responsable, fecha, hora, campo modificado, valor anterior y valor nuevo.  

CRITERIOS OPCIONALES / DESEABLES:  
- Exportación del listado a Excel o PDF.  
- Importación masiva de alumnos desde un archivo CSV.  
- Badge de color (verde = activo, gris = inactivo) junto al nombre en el listado.  

---
