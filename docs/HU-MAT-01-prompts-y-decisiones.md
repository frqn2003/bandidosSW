# Documentación de Prompts y Toma de Decisiones: HU-MAT-01

**Historia de Usuario:** `HU-MAT-01` — Alta, Edición y Baja de Materias  
**Módulo:** Gestión de Profesores, Materias y Disponibilidad  
**Ruta:** `/materias` | **API:** `/api/materias`  

---

## 1. Registro de Prompts Utilizados

A continuación se detalla la secuencia de prompts estructurados utilizados durante el ciclo de vida de la HU (desde la concepción visual hasta la implementación backend y frontend):

### Prompt 1: Transformación de Bocetos a Wireframe Plano (Canva → ASCII)
> **Propósito:** Convertir el boceto conceptual de la pantalla en un wireframe en texto plano listo para ser consumido por el asistente.
> 
> **Texto del Prompt:**
> ```text
> Estoy haciendo el front de un sistema ERP. Quiero que transformes estas pantallas en dibujos hechos en texto plano. Luego los voy a incorporar en un prompt. No quiero que respondas nada más. Usa emojis para los iconos.
> ```

---

### Prompt 2: Generación del Brief de la HU (`/brief`)
> **Propósito:** Definir el alcance funcional, flujo de usuario, wireframes, contratos de datos, fixtures de prueba y criterios de aceptación.
> 
> **Texto del Prompt:**
> ```text
> /brief "HU-MAT-01: Alta, Edición y Baja de Materias. Como gerente del centro, quiero registrar, editar y desactivar las materias que se dictan en el centro, con su nivel, duración de clase y valor, para poder asignarlas a los profesores, reservar turnos y calcular el importe de cada clase.
> - Cabecera y listado: tabla con nombre, nivel (Primario, Secundario, Universitario), duración de clase (30, 45, 60, 90, 120 min), valor por clase y estado (activo/inactivo).
> - Filtros: búsqueda en tiempo real por nombre/descripción, filtro por nivel y por estado.
> - Formulario modal parametrizado en 3 modos: Inserción, Edición y Lectura (todos los campos bloqueados en gris sin botón guardar).
> - Baja lógica: modal de confirmación ConfirmarDialog con botón rojo destructivo.
> - Validaciones: nombre único entre materias activas, valor mayor a 0, duración cerrada en opciones permitidas.
> - Restricciones de baja: no permitir inactivar si tiene turnos futuros o profesores asignados.
> - Integración: preparar con comentarios // BACKEND: para endpoints REST."
> ```

---

### Prompt 3: Especificación del Contrato TypeScript y Validaciones (`src/contracts/materia.ts`)
> **Propósito:** Diseñar el contrato formal de datos compartido entre frontend y backend con esquemas Zod.
> 
> **Texto del Prompt:**
> ```text
> Diseña el contrato técnico TypeScript/Zod para la entidad Materia en src/contracts/materia.ts:
> - Rutas REST: GET /api/materias, POST /api/materias, GET /api/materias/:id, PUT /api/materias/:id, PATCH /api/materias/:id/inactivar.
> - Esquemas Zod: listarMateriasQuery, crearMateriaBody, editarMateriaBody con campos estrictos (nombre min 1 max 80, nivel enum, duracionClaseMinutos union de literales 30|45|60|90|120, valorClase positivo con 2 decimales).
> - Tipos exportados: MateriaResponse, MateriaOpcion (para selects/combos en turnos y profesores), NivelMateria, EstadoMateria.
> - Errores de dominio tipados: NOMBRE_DUPLICADO, MATERIA_CON_TURNOS_FUTUROS, MATERIA_ASIGNADA, NO_ENCONTRADO, DATOS_INVALIDOS.
> ```

---

### Prompt 4: Implementación de la Capa Backend (`src/modules/materias/`)
> **Propósito:** Construir la lógica de persistencia, reglas de negocio y mapeo respetando la arquitectura del proyecto.
> 
> **Texto del Prompt:**
> ```text
> Implementa el módulo backend de materias en src/modules/materias/ siguiendo la arquitectura en capas:
> 1. materia.types.ts: tipos internos de entrada y filtros.
> 2. materia.schema.ts: validación de inputs con los schemas del contrato.
> 3. materia.mapper.ts: mapeo bidireccional DB Row -> API Response (convirtiendo valor_clase de numeric string a number).
> 4. materia.repo.ts: consultas SQL parametrizadas (findAll, findById, findActivoByNombre, insert, update, inactivar, contarTurnosFuturos, contarProfesoresAsignados).
> 5. materia.service.ts: operaciones transaccionales con withTransaction, auditoría withAuditUser en primera línea, validación de unicidad de nombre en activas y chequeo de turnos futuros y profesores asignados antes de inactivar.
> ```

---

### Prompt 5: Implementación de los Route Handlers API Next.js (`src/app/api/materias/`)
> **Propósito:** Exponer los endpoints HTTP protegidos con manejo estandarizado de errores y respuestas.
> 
> **Texto del Prompt:**
> ```text
> Crea los route handlers de Next.js para materias utilizando el wrapper withRoute:
> - GET /api/materias: parseo de query params con listarMateriasQuery y llamada a service.listar.
> - POST /api/materias: parseo de body con parseBody(crearMateriaBody) y llamada a service.crear con usuario de sesión.
> - GET /api/materias/[id]: parseo de id con parseId y service.obtener.
> - PUT /api/materias/[id]: parseo de body con editarMateriaBody y service.editar.
> - PATCH /api/materias/[id]/inactivar: ejecución de baja lógica con service.inactivar.
> ```

---

## 2. Registro de Decisiones de Arquitectura y Negocio (ADR)

| # | Decisión Tomada | ¿Por qué se hizo? (Justificación / Criterio) |
|---|---|---|
| **D-01** | **Baja Lógica (`estado = 'inactivo'`) en lugar de `DELETE` físico** | **Preservación del historial e integridad referencial:** Las materias forman parte de turnos históricos, bitácoras de auditoría y liquidaciones pasadas. Un borrado físico rompería la consistencia de la base de datos. |
| **D-02** | **Bloqueo de baja si existen turnos futuros o profesores asignados** | **Consistencia operativa:** Desactivar una materia que tiene turnos agendados generaría turnos inválidos en el calendario. Desactivarla con profesores asignados dejaría asignaciones huérfanas. Se crearon los errores específicos `MATERIA_CON_TURNOS_FUTUROS` y `MATERIA_ASIGNADA`. |
| **D-03** | **Unicidad de nombre restringida solo a materias activas (`uq_materia_nombre_activa`)** | **Flexibilidad de catálogo:** Permite que si una materia fue dada de baja en el pasado, la academia pueda volver a registrar una nueva versión con el mismo nombre sin colisionar con registros históricos inactivos. |
| **D-04** | **Regla de Precio de Referencia hacia adelante** | **Protección financiera:** El campo `valor_clase` en `materia` es una referencia sugerida. Al agendar turnos, el valor real se congela (`valor_clase_congelado` en `turno`). Modificar el precio en la materia solo impacta en futuros turnos, nunca en los ya pactados o liquidados. |
| **D-05** | **Duración de clase cerrada en lista de opciones (30, 45, 60, 90, 120 min)** | **Sincronización frontend/DB:** Garantiza que la duración se ajuste a bloques horarios estándares de la academia y coincida exactamente con la restricción `CHECK (duracion_clase_minutos IN (...))` de PostgreSQL, facilitando el cálculo automático de `horaFin` en turnos. |
| **D-06** | **Conversión explícita de `numeric(12,2)` a `number` en el Mapper** | **Compatibilidad con driver `pg`:** El driver PostgreSQL de Node.js retorna columnas `NUMERIC` como strings para evitar pérdida de precisión aritmética. El mapper ejecuta `Number(row.valor_clase)` para entregar un `number` nativo al contrato y a la UI. |
| **D-07** | **Formulario Modal unificado en 3 modos (`INSERCIÓN`, `EDICIÓN`, `LECTURA`)** | **Reutilización y consistencia de UX:** Un único componente gestiona los tres estados: en Lectura bloquea inputs (`disabled`) y oculta el botón Guardar; en Edición permite modificar campos mostrando advertencia sobre el precio futuro; en Inserción inicializa limpio. |
| **D-08** | **Auditoría obligatoria en primera línea de cada transacción (`withAuditUser`)** | **Trazabilidad estricta:** Cumple la regla dura de arquitectura donde cualquier mutación (`INSERT`, `UPDATE`, `INACTIVAR`) registra el ID del usuario operador en las variables de sesión de PostgreSQL para los triggers de auditoría (`bitacora`). |
| **D-09** | **Uso del endpoint `PATCH /api/materias/:id/inactivar` con idempotencia** | **Claridad semántica:** Una baja lógica es un cambio de estado parcial (`PATCH`). Además, si la materia ya se encontraba inactiva, la operación retorna el estado actual sin fallar (idempotente). |
