# Errores comunes — Centro Académico

Log del equipo (diseño front). Se alimenta automáticamente durante `/disenar` (pasos de verificación) cuando se detecta un problema.

## Reglas activas

Resumen de las reglas de las entradas de abajo; se verifican en el paso 6 de `/disenar`.

1. No leer `useRef().current` durante el render; valor calculado una vez → `useState(() => …)`. Reintentos con contador `intento` en las deps del efecto.
2. Toda redirección "al inicio" tiene un destino que siempre existe (`/inicio`); probar el login con cada rol.
3. `Date.now()`, `Math.random()`, `randomUUID()` nunca en el render ni en inicializadores de `useRef`.
4. Todo `.regex()` / `.refine()` / `.superRefine()` de un contrato lleva mensaje en español.
5. `AnimatePresence` de modales envuelto en `pointer-events-none` cuando está cerrado.
6. En `useEffect`, el estado se toca solo en callbacks async; el "cargando" inicial va en `useState` (o se deriva de una clave).
7. El documento de diseño manda: `MASTER.md` se actualiza en el mismo cambio que la paleta.
8. Íconos solo con `ui/Icon` (Material Symbols); nada de `lucide-react`.
9. Fuentes externas con `<link>` en `layout.tsx`, no `@import` en CSS (y el disable de `no-page-custom-font` en una sola línea arriba del `<link>`).
10. Antes de usar una clase de Tailwind, confirmar que el token existe en `globals.css`.
11. `npx next typegen` antes de `tsc`; no importar `LayoutProps`.
12. Sin `node_modules`, correr `npm install` antes de verificar.
13. **Contraste de texto chico:** `status-warning-strong` y `error` no llegan a 4.5:1 como texto sobre fondos claros, y `on-surface-variant` tampoco sobre `surface-container`/`-high`. Ahí el texto va en `on-surface` (o `status-danger-strong` sobre blanco / `error/5`) y el color de estado queda en el ícono o el borde.

---

### 2026-09-28 · Turnos (HU-TUR-02) — `ui/StatusBadge` con texto que no llegaba a 4.5:1 en algunas variantes

- **Qué pasó:** al diseñar los badges de estado del listado de turnos (`EstadoTurnoBadge`), `StatusBadge` seguía pintando el texto chico con el color del estado sobre fondos claros en varias variantes (`warning`/`danger`), y `neutral` usaba `on-surface-variant`. En la tabla de `/turnos` (texto de 11–12 px) eso no llega al contraste pedido.
- **Cómo se detectó:** paso 6a de `/disenar` (checklist de accesibilidad), contra los hex de `globals.css`.
- **Causa:** el componente recargaba `text-status-*` según la variante; la regla 13 existía pero no se aplicaba en todas las variantes.
- **Regla para no repetirlo:** en `ui/StatusBadge` el texto es SIEMPRE `on-surface`; el color de estado vive en el punto (`bg-status-*-strong`) y, si hay ícono, en `iconClass` (`text-status-*-strong`). El `neutral` también usa `on-surface`, no `on-surface-variant`.

---

### 2026-09-28 · Deuda del back — `npx tsc --noEmit` no queda 100% en verde

- **Qué pasó:** la verificación técnica de HU-TUR-02 deja 1 error de tipos que NO es del front ni de esta pantalla:
  - `src/modules/alumnos/alumno.mapper.ts(25,3)` — faltan `institucionOrigen`, `observacionesGenerales`, `materiasInteres`, `deudaPendiente` en `AlumnoResponse`.
- **Resuelto hoy:** los 2 errores de calendario que estaban en esta lista se corrigieron al resolver el crash de `CalendarioTurnos.tsx` (la agenda no emitía `profesor` en los turnos). Ver entrada 2026-09-28 "Crash CalendarioTurnos".
- **Cómo se detectó:** paso 6a de `/disenar` (verificación estática obligatoria) y reporte de runtime del usuario.
- **Causa:** el contrato de la API exige campos que el mapper del back todavía no emite. El front (que consume el contrato) está bien: `src/data/turnos.ts`, `estado-turno.ts` y los componentes nuevos dan `tsc` limpio por su cuenta.
- **Regla para no repetirlo:** cargarlo al equipo de back como deuda; en el checklist de `/disenar`, anotar "tsc verde salvo deuda conocida del back" en vez de tratarlo como fallo del frente.

---

### 2026-09-28 · Crash `CalendarioTurnos.tsx` — "Cannot read properties of undefined (reading 'apellido')"

- **Qué pasó:** al entrar desde "Ver en calendario" en `/turnos/reservas`, la grilla explotaba en `CalendarioTurnos.tsx:606` leyendo `t.profesor.apellido` porque `t.profesor` era `undefined`. También arrancaba `t.materia` en riesgo.
- **Cómo se detectó:** reporte de runtime del usuario (React dev overlay); recién se hacía visible porque antes la semana visible no tenía turnos cargados.
- **Causa real:** NO era el front. `repo.turnosDelDia` no seleccionaba las columnas del profesor, `TurnoCalendarioRow` no las declaraba y `turnoCalendarioToApi` omitía `profesor` (era deuda tsc conocida). El contrato exige `profesor` y la tarjeta lo usa.
- **Fix (raíz, no parche defensivo):** `calendario.repo.ts` agrega `JOIN profesor/usuario` y los alias `profesor_id/nombre/apellido`; `calendario.types.ts` los declara en `TurnoCalendarioRow`; `calendario.mapper.ts` emite `profesor`. Además `agendaDelDia` ahora valida `profesorId`/`fecha` opcionales (404/422 según contrato) en vez de romper el tipo en la ruta.
- **Regla para no repetirlo:** cuando una tarjeta consume `contrato.<campo obligatorio>`, no cubrir el bug con optional chaining: verificar que el back emita el campo. Los mappers que dejan tsc en rojo terminan explotando en runtime.

---

### 2026-09-23 · Turnos (HU-TUR-01) — texto de estado con contraste insuficiente

- **Qué pasó:** en las franjas horarias, el motivo de una franja deshabilitada iba en `text-on-surface-variant` sobre `bg-surface-container-high` (≈3.6:1), el aviso "último cupo" en `text-status-warning-strong` sobre blanco (≈3.2:1) y "El alumno ya tiene un turno" en `text-error` sobre gris. Ninguno llega a 4.5:1 para texto de 12 px. El mismo patrón ámbar se había puesto en el aviso de "día pasado" del `ReservaTurnoModal`.
- **Cómo se detectó:** paso 6a de `/disenar` (checklist de accesibilidad), calculando el contraste con los hex de `globals.css`.
- **Causa:** se eligió el color por semántica (gris = deshabilitado, ámbar = atención) sin chequear el par texto/fondo. El gris del deshabilitado es un requisito de la HU, pero el **motivo** es información que el operador tiene que leer.
- **Regla para no repetirlo:** el color de estado va en el ícono, el borde o el fondo suave; el texto chico va en `on-surface` (o `status-danger-strong` para errores). Ver regla activa 13.

---

### 2026-09-22 · Calendario (HU-CAL-01) — leer un `useRef().current` durante el render

- **Qué pasó:** `npm run lint` falló con `react-hooks/refs` en `CalendarioTurnos.tsx`: `const hoyISO = useRef(aISO(new Date())).current;` (y su uso en el inicializador de `useState`). La regla prohíbe leer `ref.current` **durante el render** porque el valor puede cambiar entre renders y romper la concordancia de React.
- **Cómo se detectó:** paso 6a de `/disenar` (verificación estática). TypeScript no lo marca.
- **Causa:** se usó `useRef` pensando "solo lo inicializo", pero la lectura en render es inválida.
- **Regla para no repetirlo:** para un valor calculado una sola vez que no se escribe después de montar, usar `const [hoyISO] = useState(() => aISO(new Date()))` — el inicializador corre una sola vez y no hay refs de por medio. Además, el botón "Reintentar" no debe ir en las deps del `useCallback` de datos: se incrementa un contador `intento` y ese contador va en las deps del `useEffect` (`useEffect(traer, [traer, intento])`) para repetir la búsqueda sin recrear la función.

---

### 2026-09-22 · Sesión (HU-SIS-01) — un rol sin módulos construidos quedaba varado en el login

- **Qué pasó:** el rol **Profesor** iniciaba sesión correctamente (la sesión quedaba guardada) pero la pantalla seguía mostrando el formulario de login. Parecía que el login no funcionaba.
- **Cómo se detectó:** paso 6b de `/disenar`, probando los tres roles uno por uno. Con Gerente y Mesa de Entrada no se veía: los dos tienen módulos construidos.
- **Causa:** el login redirige al primer módulo **construido** que el rol puede ver. Profesor solo tiene módulos que todavía no existen (Turnos, Mi ficha, Reportes), así que no había destino y el `router.replace` caía en `"/"` — la misma pantalla.
- **Regla para no repetirlo:** toda redirección "al inicio" necesita un **destino que exista siempre**. Se creó `/inicio`, que no pertenece a ningún módulo (no pasa por el control de permisos) y muestra el Sidebar con lo que el rol va a tener. Al agregar un rol o sacar un módulo, probar el login **con cada rol**: el caso roto es siempre el del rol con menos permisos.

---

### 2026-09-22 · Sesión (HU-SIS-01) — `Date.now()` en el inicializador de un `useRef`

- **Qué pasó:** `npm run lint` falló con `react-hooks/purity` en `src/lib/sesion.tsx`: *"Cannot call impure function during render"*.
- **Cómo se detectó:** paso 6a de `/disenar`. TypeScript no lo marca.
- **Causa:** `useRef<number>(Date.now())`. El inicializador de `useRef` se evalúa **durante el render**, y ahí no se pueden llamar funciones impuras: dos renders darían valores distintos.
- **Regla para no repetirlo:** `Date.now()`, `Math.random()` y `crypto.randomUUID()` van en efectos o en callbacks de eventos, **nunca en el cuerpo del render** — y el inicializador de `useRef`/`useState` es cuerpo del render. El patrón es inicializar con un valor neutro (`0`, `null`) y asignar el real dentro del `useEffect`.

---

### 2026-09-22 · Alumnos (HU-ALU-01) — mensajes de validación en inglés salidos del contrato

- **Qué pasó:** el formulario mostraba `"Invalid"` (en inglés) como error del DNI y del teléfono **del responsable**, mientras que los del alumno sí decían el mensaje en español.
- **Cómo se detectó:** paso 6b de `/disenar`, guardando un alumno menor sin los datos del responsable: dos de las tres alertas del modal vinieron en inglés.
- **Causa:** en `src/contracts/alumno.ts`, `responsableDni` y `responsableTelefono` usaban `.regex(...)` **sin segundo argumento**. Zod emite `"Invalid"` por defecto. Los campos `dni` y `telefono` del alumno sí tenían mensaje, por eso la diferencia pasó desapercibida al escribir el contrato.
- **Regla para no repetirlo:** en los contratos, **todo `.regex()`, `.refine()` y `.superRefine()` lleva su mensaje en español**. Ese texto no es solo del front: el back valida con `parseBody` contra el mismo schema y devuelve ese mismo string al usuario. Al crear un contrato, revisarlo con `grep -n "regex(" src/contracts/*.ts` y confirmar que ninguno quedó sin mensaje.

---

### 2026-09-21 · ui/Modal (HU-MAT-01) — el modal cerrado seguía tapando la pantalla

- **Qué pasó:** al cerrar cualquier modal, `AnimatePresence` deja el nodo en el DOM mientras corre la animación de salida. Ese nodo es un overlay `fixed inset-0`: aunque esté en `opacity: 0`, **sigue capturando los clicks de toda la pantalla**. Si además la pestaña pasa a segundo plano durante el cierre, `requestAnimationFrame` se pausa, la animación nunca termina, el nodo no se desmonta y la app queda inusable hasta recargar.
- **Cómo se detectó:** en el paso 6b (prueba de renderizado) de HU-MAT-01: después de guardar, `document.elementFromPoint(centro)` devolvía un elemento **dentro** del diálogo ya invisible.
- **Causa:** el nodo que anima la salida conserva las props del último render con `open: true`; no hay forma de apagarle los eventos desde adentro.
- **Regla para no repetirlo:** el `AnimatePresence` va envuelto en un `<div className={open ? undefined : "pointer-events-none"}>`. Ese wrapper **sí** se vuelve a renderizar cuando `open` pasa a false, así que corta los eventos al instante sin tocar la animación. Al crear un componente que monta/desmonta un overlay animado, verificar con `elementFromPoint` que después de cerrar no quede capturando clicks.

---

### 2026-09-21 · Materias (HU-MAT-01) — setState síncrono dentro de un efecto

- **Qué pasó:** `npm run lint` falló con `react-hooks/set-state-in-effect` en `src/app/materias/page.tsx`: el efecto de carga inicial llamaba `setEstadoCarga("cargando")` en el cuerpo del efecto, lo que dispara renders en cascada.
- **Cómo se detectó:** paso 6a de `/disenar` (verificación estática). TypeScript no lo marca: es una regla de lint de React 19.
- **Causa:** se reusó el mismo handler para la carga inicial (efecto) y para el botón "Reintentar" (evento). Lo que es válido en un handler no lo es dentro de un efecto.
- **Regla para no repetirlo:** dentro de un `useEffect` el estado se toca **solo en callbacks asíncronos** (`.then`/`.catch`), nunca en el cuerpo. El estado inicial "cargando" se declara como valor inicial del `useState`; el reintento va en un handler aparte.

---

### 2026-09-21 · Sistema de diseño (HU-PRO-01) — paleta desactualizada

- **Qué pasó:** El `MASTER.md` del repo tenía una paleta MD3 (`#00236f`, `#0058be`, `#340081`, `#f8f9ff`) distinta a la del **documento de diseño** del sistema (Nexo Académico: `#142B6F`, `#2F6FED`, `#14B8A6`, …). Se había implementado la del MASTER.
- **Cómo se detectó:** El usuario señaló que el documento de diseño manda; comparación hex por hex contra la tabla "Paleta de Colores del Sistema".
- **Causa:** El `MASTER.md` venía heredado del proyecto anterior (Huellitas) y nunca se regeneró con la paleta del Centro Académico.
- **Regla para no repetirlo:** el **documento de diseño es la fuente de verdad**; antes de tocar tokens, cotejar la paleta del MASTER contra el documento. Si difieren, actualizar el MASTER **en el mismo cambio** que el código.

---

### 2026-09-21 · Sistema de diseño (HU-PRO-01) — librería de iconos equivocada

- **Qué pasó:** Los componentes usaban `lucide-react`, pero el documento de diseño especifica **Material Symbols Outlined**.
- **Cómo se detectó:** El usuario lo marcó; `MASTER.md` (sección Icons) y `AGENTS.md` ya lo decían.
- **Causa:** Se heredó `lucide-react` del fork anterior sin revisar la sección Icons del design system.
- **Regla para no repetirlo:** los íconos van **siempre** por `ui/Icon` (Material Symbols). No importar otra librería de iconos (`grep -rn "lucide-react" src/` debe dar vacío).

---

### 2026-09-21 · Verificación técnica (HU-PRO-01) — Tailwind descarta `@import` remotos

- **Qué pasó:** Al cargar la fuente de íconos con `@import url("https://fonts.googleapis.com/...")` en `globals.css`, el CSS compilado **no contenía** el `@import` (la fuente nunca cargaba) y además aparecía el warning *"@import rules must precede all rules"*.
- **Cómo se detectó:** `grep` del CSS compilado en `.next/` buscando `fonts.googleapis` → 0 coincidencias; luego, verificando que Google Fonts respondía el `@font-face`.
- **Causa:** El pipeline de CSS (Tailwind v4 / Turbopack) resuelve e inlinea los `@import` y descarta los remotos, dejando el de la fuente fuera de lugar.
- **Regla para no repetirlo:** las fuentes externas se cargan con `<link rel="stylesheet">` en `src/app/layout.tsx`, **no** con `@import` en CSS. Ojo: `next/font/google` **no** incluye Material Symbols (verificado en `font-data.json`), así que va por `<link>`.

---

### 2026-09-21 · ESLint (HU-PRO-01) — `no-page-custom-font` es falso positivo en App Router

- **Qué pasó:** Al agregar el `<link>` de Google Fonts en el layout, ESLint marcó `@next/next/no-page-custom-font` ("Custom fonts not added in `pages/_document.js`").
- **Cómo se detectó:** `npm run lint` en la verificación técnica.
- **Causa:** Es una regla del **Pages Router**; en el App Router no existe `pages/_document.js` y el layout raíz aplica a toda la app.
- **Regla para no repetirlo:** silenciar la regla puntualmente con `{/* eslint-disable-next-line @next/next/no-page-custom-font */}` **inmediatamente arriba** del `<link>` (la directiva debe ser de una sola línea), dejando la justificación en un comentario aparte.

---

### 2026-09-21 · Cuerpo Docente (HU-PRO-01)

- **Qué pasó:** El repo arrancaba con `globals.css` default de Next (solo `--background`/`--foreground`) mientras los componentes `ui/` usaban tokens de Huellitas (`bg-brand-900`, `text-cream-50`, `rounded-pill`, `border-border`, `accent-500`) que NO existían → toda la UI habría renderizado sin estilos.
- **Cómo se detectó:** En el código (`grep` de clases contra `globals.css`) y en la carga visual: no había tokens definidos.
- **Causa:** Fork del proyecto Huellitas Felices sin migrar el tema visual; los tokens quedaron en las clases de los componentes pero nunca se definieron en Tailwind.
- **Regla para no repetirlo:** antes de crear/heredar componentes, verificar que cada clase usada exista como token en `globals.css` (o en `@theme` del MASTER.md). Al heredar un repo, correr `grep -oE "(bg|text|border|ring)-(brand|cream|accent|text-text)-..."` y resolver contra el tema real.

---

### 2026-09-21 · Verificación técnica (HU-PRO-01)

- **Qué pasó:** `npx tsc --noEmit` fallaba con `TS2304: Cannot find name 'LayoutProps'` en el layout raíz.
- **Cómo se detectó:** En el paso 6 (verificación técnica), al correr los chequeos obligatorios.
- **Causa:** En Next 16 los helpers `LayoutProps<'/ruta'>` / `PageProps<'/ruta'>` son **globales generados por typegen**, no importables; si no corre antes `next typegen` (o `next dev`/`build`), TypeScript no los conoce.
- **Regla para no repetirlo:** tras clonar/instalar el repo, correr `npx next typegen` antes de `tsc --noEmit`, y **no** tratar de importar `LayoutProps` desde `next`.

---

### 2026-09-21 · Verificación técnica (HU-PRO-01)

- **Qué pasó:** `npm run lint` y `npx tsc --noEmit` no existían: `node_modules/` no estaba instalado en el repo.
- **Cómo se detectó:** El comando devolvía "eslint no se reconoce" (PATH global sin eslint del proyecto).
- **Causa:** Dependencias nunca instaladas en este clon.
- **Regla para no repetirlo:** siempre verificar `node_modules/` antes de correr verificaciones; si falta, `npm install` (no usar `npx` suelto, que instala la versión global en vez de la del proyecto).

---

### 2026-09-28 · Calendario (HU-CAL-02) — `setState` dentro de un efecto y `Date.now()` en render

- **Qué pasó:** ESLint (React Compiler, reglas `react-hooks/set-state-in-effect` y `react-hooks/purity`) tiró 2 errores en la grilla nueva: un `setAgenda([])` + `setEstadoCarga("listo")` sincrónicos dentro del `useEffect` de carga, y un `Math.floor((Date.now() - ultima) / 1000)` calculado **durante el render** para el texto "Actualizado hace N s".
- **Cómo se detectó:** `npm run lint` en el paso de verificación técnica.
- **Causa:** el estado de carga se seteaba desde el efecto (que debería solo *disparar* la consulta) y el reloj del polling leía el reloj del sistema en render, que es impuro y desactualiza el valor con cada re-render.
- **Regla para no repetirlo:** el `useEffect` de datos **no setea estado**: solo llama al fetch. El "cargando" se dispara desde los **handlers** (`pedirDatos()`: `setEstadoCarga("cargando")` + `setIntento(i => i+1)`) y el efecto depende de `intento`. Para cualquier "hace N s" / "hace N minutos": el instante va en un `useRef` que se escribe **desde la promesa**, el contador en `useState`, y un `setInterval` que lo recalcula. En render solo se lee el estado.

---

### 2026-09-28 · Calendario (HU-CAL-02) — el color de la materia no puede usar rojo ni verde

- **Qué pasó:** Al agregar el color por materia a las tarjetas de turno, la primera propuesta metió tonos que rozaban el rojo y el verde de la paleta de estados.
- **Cómo se detectó:** en el audit de color contra `MASTER.md` (rojo = `danger` = Cancelado, verde = `success` = Disponible).
- **Causa:** 8 tonos de una paleta opensource que incluía rojo y verde chocan con los dos colores que el sistema ya usa para estado.
- **Regla para no repetirlo:** la paleta por materia (`--color-materia-1..8`) es **visual**, no semántica: no puede incluir rojo ni verde. Cuando el estado es Cancelado, **el estado pisa el color de materia** y la tarjeta se pinta de `error` (`tonoEstadoCancelado`). Antes de elegir un color nuevo para un componente, preguntarse si ya tiene dueño en `Status Colors`.

---

### 2026-09-28 · Documentación (HU-CAL-02) — no reescribir un `.md` con `Get-Content | Set-Content`

- **Qué pasó:** al actualizar `design-system/bandidossw/componentes.md` con PowerShell, el archivo entero quedó con los acentos y las "ñ" corruptos (`â€”`, `Ã©`) y con BOM.
- **Cómo se detectó:** `git diff` mostró 56 líneas modificadas de 90 para un cambio de una línea.
- **Causa:** `Get-Content` sin `-Encoding UTF8` lee UTF-8 como Windows-1252; al escribir de vuelta, cada byte queda doble-codificado.
- **Regla para no repetirlo:** editar los `.md` del repo **siempre con la herramienta de edición de archivos**, nunca con `Get-Content`/`Set-Content` de PowerShell. Si hay que usar la consola, `-Encoding UTF8` en lectura **y** escritura, y revisar el `git diff --stat` después: si un cambio de una línea movió decenas, se rompió el encoding.

---

### 2026-09-28 · Calendario (HU-CAL-02) — no repetir el estado en dos lugares

- **Qué pasó:** la barra de controles ya tenía los Select de Profesor/Materia y los Switch de "Ver cancelados"/"Solo con cupo", y abajo del período había **además** una fila de chips "Filtros" con el mismo estado, cada uno con su X.
- **Cómo se detectó:** el usuario, en la revisión visual de la pantalla.
- **Causa:** se implementó el patrón "filtros activos + limpiar todo" (que sirve en tablas) sin preguntarse si en un calendario la barra de controles **ya está a la vista**: el chip repetía lo que el Select y el Switch acababan de mostrar.
- **Regla para no repetirlo:** antes de agregar un resumen del estado de los filtros, preguntar si la pantalla **ya es autoexplicativa**. Si los controles quedan visibles en la misma vista, duplicarlos es ruido, no ayuda. El patrón de chips se reserva para filtros que se **ocultan** (drawer, panel colapsado) o que no se pueden ver de un vistazo. Si se eliminan, borrar también el componente que dejó de usarse, o queda código muerto y `no-unused-vars` lo delata.

---

### 2026-09-28 · Botones · Un `ghost` con texto de color no tiene affordance (y el rojo por `className` depende del orden de Tailwind)

- **Qué pasó:** al sacar el ícono a "Cancelar" del detalle del calendario quedó `variant="ghost"` + `text-status-danger`. El resultado era un texto rojo sobre fondo transparente: **sólo se pintaba al pasar el mouse**, y sin borde ni fondo se lee como un texto, no como un botón. El usuario tiene que descubrirlo con el hover para saber que es un control. Lejos de "sólo se ve poco": no se ve el control.
- **Por qué se cuela:** `ghost` está pensado para acciones **dentro de un menú o de una fila de íconos**, donde el contexto ya dice "esto es un botón". Sacado a un footer de panel con un `outline` al lado, el `ghost` pierde el contexto que lo justificaba.
- **Regla para no repetirlo:** un `ghost` (o cualquier texto sin borde ni fondo) **sólo va donde el contexto ya declara que hay un botón**. Si la acción destructiva convive con una acción igual de importante, necesita silueta propia → `outline-danger` (nace de este caso: la silueta del `outline` con el color de la acción destructiva, en `ui/Button`). `destructive` (relleno rojo) es para el botón de confirmación solo.
- **Segundo error, en el mismo cambio:** el rojo se puso como `className="text-status-danger hover:bg-status-danger/10"` sobre `ghost`. Funciona —lo verifiqué— **porque `.text-status-danger` se emite después de `.text-secondary`** (pos 40859 vs 40814), pero eso es un accidente del orden en que Tailwind emite las utilidades, no un contrato del design system. Pisar el color de una variante con `className` es frágil; si el color importa, que sea una variante.
- **Al verificar CSS compilado, cuidado con los falsos negativos:** en los selectores Tailwind las utilidades con `:` y `/` van escapadas (`.hover\:bg-status-danger\/10:hover`). Buscar el nombre plano con `IndexOf("hover:bg-status-danger")` da **AUSENTE aunque la clase exista y funcione** — me pasó, y casi reporto un bug inexistente. Buscar el fragmento post-barra (`status-danger\/10`) o un regex que contemple el `\/`. Y ojo con selectores agrupados: `.text-on-error, .text-on-primary { color: #fff }` no matchea un regex que exija `{` justo después del nombre de clase.
- **Observación aparte (preexistente, no tocada):** `active:scale-[0.97]` **no aparece en el CSS compilado** en ninguna variante de `Button`, así que la animación de pulsación no se está aplicando. Es previo a este cambio y afecta a todos los botones por igual.

---

### 2026-09-28 · Contraste (regla 13) — El chip de un estado no puede usar `on-surface-variant` sobre `surface-container`

- **Qué pasó:** al convertir el conteo del mes en etiqueta, el chip de "0 turnos" quedó con `bg-surface-container-high` + `text-on-surface-variant`. Salió bonito y **rechazado**: `#64748b` sobre `#d9e2ec` da **3.64:1**, y un `text-xs` (12px) exige **4.5:1** por WCAG AA. El chip de los días con turnos (`bg-primary/10` + `on-surface`) da 13.4:1 y el mismo color de texto en gris da **11.2:1**.
- **Por qué se cuela:** `on-surface-variant` es la elección "automática" cuando el fondo es un surface, y funciona sobre `surface-container` (claro) pero **se rompe sobre `surface-container-high`**, que es dos tonos más oscuro. El chip cambió de superficie y el texto no se recalculó.
- **Regla para no repetirlo:** al cambiar el fondo de un chip, **recalcular el contraste del texto**, no arrastrarlo. Tabla rápida: texto chico sobre `surface-container-high` va en `on-surface`, nunca en `on-surface-variant`. Y ojo al revés también: si el chip es de estado (`status-*`/10), el texto va en `on-surface` y el color lo lleva el ícono o el punto.
- **Corolario — el contraste se verifica, no se estima:** los valores de `globals.css` son los que se miden (`#d9e2ec` = `surface-container-high`, `#64748b` = `on-surface-variant`, `#1e293b` = `on-surface`, `#2f6fed` = `primary`). Merece la pena hacer la cuenta de luminancia cuando el texto es chico: son dos minutos contra un rechazo de accesibilidad.

---

### 2026-09-28 · Calendario (HU-CAL-02) — Un estado vacío sin salida es un bug de diseño

- **Qué pasó:** con un filtro por profesor, la pantalla reemplazaba TODA la grilla por el cartel "No hay turnos para los filtros seleccionados" cuando el profesor tenía 0 turnos en la semana. El usuario perdía algo que sí existía: las franjas libres de ese profesor, que ya estaban calculadas y que la grilla sabe pintar como "Disponible" clickeable. Dead end absoluto: la pantalla no decía ni cuánto había libre ni cómo reservar.
- **El error conceptual:** se trataron "0 filas" y "no hay nada" como la misma cosa. No lo son. **0 filas + N franjas libres = agenda libre.** El estado vacío corresponde a "no hay nada que mostrar", no a "el filtro no matcheó nada".
- **Regla para no repetirlo:** antes de devolver un estado vacío, preguntarse **"¿hay algo más que sí puedo ofrecer?"**. Si la respuesta es sí, la pantalla no se vacía: se muestra la grilla real (con sus acciones) y un aviso que explica el 0. El cartel vacío queda reservado para el caso de verdad vacío.
- **Corolario — el aviso cuenta, y hay que contarlo bien:** el memo `huecosReservables` deduplica por `fecha|profesor|horaInicio|horaFin`. Sin dedupe, la misma franja puede volver en dos respuestas de la agenda y el aviso promete más huecos de los que hay. **Un número en pantalla es una promesa: tiene que coincidir con lo clickeable.**
- **Corolario — mismo criterio, dos lugares:** el memo `huecosReservables` tiene que usar EXACTAMENTE el mismo filtro que la celda (`muestraDisponibles` + `profesorId`), igual que pasó con `filasConAgenda`. Si el aviso dice "hay 8 franjas" y la grilla pinta 3, es peor que no decir nada.
- **Corolario — no reindentar medio archivo:** para insertar un aviso arriba de la grilla se dudó entre envolver la rama en un `div.space-y-3` (que obligaba a reindentar ~50 líneas del `<Grilla>`) y poner el aviso como hermano antes de la cadena de condicionales con un `div.mb-3`. Se fue por la segunda. **Preferir el diff chico: si un cambio obliga a reindentar un bloque grande, probablemente hay un lugar más limpio para hacerlo.**

---

### 2026-09-28 · Calendario (HU-CAL-02) — Un feature flag de UI NO es lo mismo que `hayFiltros`

- **Qué pasó:** se pidió que los huecos "Disponible" solo se vieran si hay filtro por materia o por profesor. El primer instinto fue reutilizar `hayFiltros` (`profesorId || materiaId || verCancelados || soloCupo`), que ya existía y "decía lo mismo". No dice lo mismo.
- **Por qué importa:** `hayFiltros` responde "¿el usuario tocó algo para acotar la vista?" (y además gobierna el estado vacío con el botón "Limpiar filtros"). La regla nueva responde "¿el usuario ya sabe a QUIÉN o a QUÉ está mirando?". Con `hayFiltros` mal usado, activar "Ver cancelados" —un switch que no acota nada por profesor— habría pintado los disponibles de todos los profesores: exactamente lo que se pidió evitar.
- **Regla para no repetirlo:** los flags de UI se nombran por la **pregunta que responden**, no por "ya tengo algo parecido". Si dos booleanos sirven para dos decisiones distintas, son dos booleanos: `hayFiltros` (vacío + botón limpiar) y `muestraDisponibles` (profesor o materia).
- **Corolario — un flag tiene que propagarse a TODO lo que ese feature decide, no solo a su JSX:** el memo `filasConAgenda` (el margen gris/blanco de la columna Hora) también tenía que respetar `muestraDisponibles`. Si el flag queda solo en el `return`, la columna Hora queda gris en franjas donde ya no se muestra nada — el mismo bug de "dos partes contando historias distintas" que ya estaba en el log por el margen de la hora. **Cuando un flag cambia qué se ve, listar mentalmente todos los cálculos derivados antes de terminar.**

- **El "hueco" se anula en el origen:** en vez de envolver el JSX con `hueco && muestraDisponibles`, el flag entró en la condición que calcula `hueco`. Así no existen dos verdades sobre "hay disponible": el `hueco` es `undefined` cuando no corresponde.
- **Lo que NO cambió:** `limiteAtencion` sigue agregando los `huecos` al cálculo de ids de profesor. El rango de filas de la grilla viene de los límites de atención de los profesores visibles y no tiene que depender de si los huecos se pintan o no — si se mezclara, sin filtro la grilla perdería franjas que igual tienen turnos.

---

### 2026-09-28 · Calendario (HU-CAL-02) — Sacar el texto de un chip NO es solo CSS: hay que mover el nombre accesible

- **Qué pasó:** se pidió que el chip de "Cancelado" de la tarjeta del calendario vaya solo con el ícono (la palabra le come el nombre de la materia). El cambio visual era de una línea, pero escondía un problema de accesibilidad.
- **El error invisible:** `TarjetaTurnoCalendario` es un `<button>` con `aria-label` propio. Cuando un botón declara su nombre accesible, **el texto de sus hijos deja de usarlo**. O sea: antes, el chip con la palabra "Cancelado" tampoco se anunciaba (el `aria-label` del botón ya lo pisaba) — pero al sacarle el texto, el estado quedaba **completamente invisible** para un lector de pantalla, sin que nada pareciera roto.
- **Regla para no repetirlo:** cuando un componente padre tiene `aria-label` explícito, **el `aria-label` es la única fuente de verdad del nombre**. Todo lo que antes se leía como texto (estado, cantidad, contexto) tiene que estar ahí adentro. Antes de sacar un texto visual, preguntarse quién lo anunciaba y copiar ese texto al `aria-label`.
- **El patrón correcto para quitar texto a un chip:** la prop opcional `soloIcono` en `StatusBadge` (no un badge paralelo) + `role="img"` + `aria-label={label}` en el pill, porque un `span` genérico con `aria-label` **no se nombra** (rol generic no admite nombre accesible). Doble capa: el chip se nombra a sí mismo Y el padre lo repite.
- **Corolario — extends, no dupliques:** la prop se agregó a `StatusBadge` con default `false` y se propagó por `EstadoTurnoBadge` y `TurnoCalendarioBadge`. `/turnos` sigue mostrando la etiqueta escrita sin tocar una línea: el detalle de un turno en un listado es el contenido principal, no un adorno.

---

### 2026-09-28 · Calendario (HU-CAL-02) — "El gris" de la grilla: hay que señalar el blanco, no solo pintar el color

- **Qué pasó:** con el color por materia ya funcionando, el usuario pidió que "los momentos que no tienen ni materias ni disponibles" tengan fondo blanco. Lectura literal: la grilla. Resultado: la grilla **ya era blanca** (el contenedor de la tabla es `bg-surface-container-lowest`). Pedirle blanco a algo que ya es blanco no produce ningún cambio visible, y hace perder la vuelta.
- **Regla para no repetirlo:** antes de proponer un cambio de color, **identificar qué elemento es el que tiene el color hoy**. Un pedido de "poné X de fondo" en realidad puede ser tres cosas: (a) el elemento ya tiene ese color y el problema es otro, (b) el pedido apunta a OTRO elemento del que uno está mirando, o (c) lo que se quiere NO es ese color sino "dejar de ver" el color actual. Acá era (b) + (c): lo gris era el margen de la columna Hora, y lo que se quería era **reservar el gris para las horas con agenda** en vez de pintar de blanco las franjas muertas.
- **Cómo se resolvió:** en vez de blanquear las celdas (no-op), el gris `surface-container` de la columna Hora se volvió **condicional**: gris con agenda, blanco en franja muerta. Menos CSS que antes, y ahora el color **codifica información** en lugar de ser decorativo.
- **Corolario — el color Should Say Something:** un fondo que está en todas las filas no dice nada. Cuando un color se vuelve condicional a un dato, la pantalla comunica ("acá hay movimiento, acá no") sin una sola etiqueta nueva.
- **Corolario 2 — el estado actual no se pisa:** en la franja muerta que cae en la hora actual, gana el blanco y se conserva el punto `secondary` que marca "son las...". Regla: cuando un nuevo condicional compite con un indicador de estado, el estado gana y el nuevo condicional se acomoda. No al revés.

---

### 2026-09-28 · Tailwind v4 · Una clase con template literal NUNCA llega al CSS (el gris invisible)

- **Qué pasó:** el calendario salía entero gris. El color por materia estaba bien calculado (mapa correcto, cada materia con un token distinto, `tono.borde` y `tono.fondo` correctos en runtime) y los tokens `--color-materia-1..8` **sí** estaban en el CSS compilado. Faltaba la mitad de la ecuación: las **utilidades** no existían.
- **Por qué:** Tailwind v4 escanea el fuente con regex y genera el CSS a partir de las clases que encuentra **escritas**. `paleta-materia.ts` armaba `borde: \`border-l-${token}\`` y `fondo: \`bg-${token}/8\``. El escáner ve `border-l-${token}` — un placeholder, no una clase — y no genera nada. Resultado: la tarjeta sin `background-color` ni `border-left-color`, o sea **gris**, sin error de TypeScript, sin error de lint, sin warning y con la página sirviendo 200.
- **Cómo se detectó:** buscando el token en el CSS compilado (`.next/dev/static/chunks/*.css`): la variable `--color-materia-1` aparecía, la clase `.bg-materia-1\/8` no. Antes: **0** utilidades. Después: **24**. Y un dato que lo delató solo: los turnos cancelados SÍ tenían color, y la única diferencia es que `tonoEstadoCancelado()` devuelve `"border-l-error"` **literal**.
- **Regla para no repetirlo:** en Tailwind v4 las clases de un mapa de estilos van **escritas completas y literales**. Nada de `` `bg-${color}` `` ni `` `text-${estado}-500` ``. Si necesitás 8 tonos, escribís las 8 utilidades enteras.
- **Cómo blindarlo:** tipar el mapa con plantillas literales para que `tsc` ate cada clase a su token. Acá, `type ParTono<T> = readonly [T, \`border-l-${T}\`, \`bg-${T}/8\`, \`bg-${T}\`]` con `as const satisfies` — si escribís `materia-2` con `border-l-materia-1`, el compilador lo rechaza. El descuido queda en el tipo, no en el ojo.
- **Corolario — el gris es el síntoma, no el bug:** si algo "tiene la variable pero no se ve", sospechá de la generación de utilidades antes que del valor del color. Y antes de culpar al estado o al mapa, **grep del CSS compilado**: es la única fuente de verdad de qué existe de verdad.
- **Alternativa válida si la lista es larga:** `@source inline("bg-materia-{1..8}")` en el CSS. Se descartó acá porque atar token y clase con tipos es más seguro que confiar en la sintaxis del safelist.

---

### 2026-09-28 · Calendario (HU-CAL-02) — `id % N` NO reparte colores: los ids son dispersos

- **Qué pasó:** el color por materia salía de `(materia.id - 1) % 8`, como pedía el brief. Con los ids del catálogo (4 · 9 · 12 · 15) la 4 y la 12 caían en el **mismo** tono: Matemática e Inglés se veían idénticas. El usuario lo detectó a ojo en la pantalla.
- **Cómo se detectó:** revisión visual. La fórmula "cumple el brief" y aun así rompe el requisito de fondo ("cada materia con un color distinto").
- **Causa:** el módulo solo reparte sin colisiones si los ids son **contiguos desde 1**. En la base `materia.id` es un serial que deja huecos (bajas, borrados, altas posteriores), así que la función se comporta como "pseudoaleatoria" y en realidad es determinista-pero-colisiona.
- **Regla para no repetirlo:** cuando el color depende de una entidad, **repartir por posición en el catálogo ordenado por id**, no por módulo del id crudo: `construirMapaTonos([...ids].sort())` asigna el índice 0..N-1. Determinista y sin colisiones mientras quepa la paleta. Y antes de aceptar una fórmula tipo "hash" o "módulo", **probarla con los ids reales del repo**, no con 1, 2, 3.
- **Corolario:** un requisito de diseño ("cada X distinto") se cumple en la **función** pero hay que validarlo en la **pantalla**. La fórmula puede ser correcta y el reparto no. Y antes de aceptar "es un módulo, se ve aleatorio", probarlo con los ids reales del catálogo.

---

### 2026-09-28 · Verificación técnica (HU-CAL-02) — un error de `tsc` preexistente no es de esta HU

- **Qué pasó:** `npx tsc --noEmit` queda con 1 error en `src/modules/alumnos/alumno.mapper.ts` (faltan 4 campos de `AlumnoResponse`) que **no** es de HU-CAL-02: viene de los commits de HU-TUR-02, que ampliaron el contrato de alumno.
- **Cómo se detectó:** comparando el error contra `git diff --name-only HEAD`: el archivo no estaba entre los modificados.
- **Causa:** alguien amplió `AlumnoResponse` sin actualizar el mapper.
- **Regla para no repetirlo:** cuando el chequeo falle, **verificar primero si el archivo que falla está en el diff**. Si no está, es deuda previa: reportarlo y NO tocarlo de paso (mezclar arreglos ajenos vuelve la HU irrevisable). Se arregla en su propia HU.