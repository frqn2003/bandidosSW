# Lecciones aprendidas — Centro Académico

Registro del trabajo del equipo durante la construcción del sistema: quiénes lo hicieron, con qué herramientas, qué problemas aparecieron y cómo los resolvimos.

Este documento no reemplaza a los otros. Es la puerta de entrada: cuenta la historia general y deja señalado dónde está el detalle de cada tema.

---

## 1. El proyecto en un minuto

**Qué es.** Un sistema de gestión académica: permite llevar el control de alumnos, docentes, materias, turnos, asistencia y reportes de un centro de estudios.

**En qué estado está.** Hoy tiene nueve pantallas funcionando, conectadas a la base de datos real. No es una maqueta: los formularios guardan, las listas leen, y hay búsqueda y filtros.

**Algunos datos del avance:**

| Dato | Valor |
| --- | --- |
| Personas en el equipo | 4 |
| Pantallas construidas | 9 |
| Conexiones con la base (endpoints) | 28 |
| Componentes de interfaz | 49 |
| Documentos de acuerdo de datos (contratos) | 12 |
| Problemas documentados y resueltos | 14 |
| Reglas internas que quedaron escritas | 13 |
| Cambios registrados en el historial | 65 |
| Período de trabajo registrado | 20 al 25 de septiembre |

**La base de datos** está en Supabase. La usamos porque nos daba la base ya armada, con usuario y clave, sin que tuviéramos que instalar ni administrar un servidor. Eso nos permitió concentrarnos en las pantallas.

---

## 2. Quiénes somos y qué hizo cada uno

### Cómo se formaron los roles

Al arrancar el proyecto se decidió que el núcleo de desarrollo quedara a cargo de quienes ya tenían más experiencia tanto en el frente como en la base. Fue una decisión consciente: en las primeras etapas es cuando más conviene que alguien con oficio esté mirando la arquitectura, porque después es caro corregir.

**Desarrolladores (front y back):** Francisco Aguirre, Emiliano Aguirre e Ignacio Kotting.

**Coach y Desarrolladora:** Carolina Rojas.

Aparte del trabajo técnico, el rol de Coach tuvo otra función: facilitar la comunicación y ayudar a resolver conflictos dentro del grupo. En un equipo chico y con plazos cortos, esa función no es un extra: es la que evita que dos personas hagan el mismo trabajo o que un desacuerdo quede sin hablar.

### Qué hizo cada persona

| Persona | Rol | De qué se encargo |
| --- | --- | --- |
| **Francisco Aguirre** | Desarrollador | Frente del sistema y los **contratos de datos** (los acuerdos que definen qué información guarda y devuelve cada pantalla) |
| **Emiliano Aguirre** | Desarrollador | Frente del sistema |
| **Ignacio Kotting** | Desarrollador | **Back-end y base de datos** |
| **Carolina Rojas** | Coach y Desarrolladora | **Esquemas y modelo de datos** que después dieron origen a los contratos |

**Cómo se repartió el trabajo en el frente:** cada persona tomó las historias de usuario que podía resolver. No hubo un plan fijo que asignara pantalla por pantalla; el reparto se fue haciendo según avanzábamos. Cuando alguien terminaba, tomaba la siguiente disponible.

**Sobre el back-end:** el plan original era que el equipo de frente entregara las pantallas y que otro equipo conectara los datos después. En la práctica el equipo también construyó la capa de conexión y la base, porque era la única forma de probar que las pantallas funcionaban de verdad y no solo se veían bien.

---

## 3. Los roles del sistema (para entender los problemas)

El sistema maneja tres roles de usuario, y esto explica varios de los errores que encontramos:

| Rol | Qué puede ver |
| --- | --- |
| **Gerente** | Acceso completo: todo el sistema |
| **Mesa de Entrada** | Alumnos, materias, turnos y calendario |
| **Profesor** | Su ficha, sus turnos, el calendario y reportes |

Cada persona que entra ve un menú distinto. Eso significa que **una pantalla puede estar terminada y todavía así ser invisible** para determinado rol, porque no le corresponde.

---

## 4. Cómo trabajamos

El proyecto no se construyó improvisando. Definimos un camino de cuatro pasos y lo repetimos en cada pantalla.

```
/brief  →  /contract  →  /disenar  →  /subir
```

| Paso | Qué significa en palabras simples | Qué produce |
| --- | --- | --- |
| **`/brief`** | Escribir la ficha de la pantalla | Una descripción con qué se quiere, para quién y qué datos necesita |
| **`/contract`** | Acordar los datos antes de programar | El acuerdo de qué se guarda y qué se devuelve, con sus validaciones |
| **`/disenar`** | Construir la pantalla | La interfaz, conectada a los datos |
| **`/subir`** | Publicar el cambio | La versión nueva, disponible para el equipo |

**Por qué este orden importa tanto:**

- El **brief** evita construir la pantalla equivocada. Una vez bien escrita la ficha, las decisiones de diseño dejan de ser opiniones.
- El **contract** es un acuerdo, no documentación del acuerdo. Se escribe **antes** de la pantalla, y el back-end valida contra ese mismo acuerdo. Por eso el mismo texto de error que ve el usuario en pantalla es el que devuelve el servidor.
- **Publicar al final** y no sobre la marcha evitó que una pantalla a medio hacer llegara a manos de alguien más.

### Las cuatro reglas de la casa

1. **Buscar antes de crear.** Si el componente ya existe, se extiende. No se duplica.
2. **El documento de diseño manda.** Si el código y el documento no coinciden, gana el documento.
3. **La base se conecta después.** Cada pantalla se prepara con comentarios que le dicen al equipo de back exactamente dónde enchufarse, qué dato va y de qué tipo.
4. **Un problema encontrado se anota.** Con su causa, no solo con la solución.

---

## 5. Con qué lo trabajamos

Lo importante no es el nombre de cada herramienta, sino **qué problema nos resolvió**.

| Herramienta | Para qué nos sirvió |
| --- | --- |
| **Next.js** | La base sobre la que corren las pantallas. Nos dio las piezas ya resueltas (navegación, formularios, carga de datos) para que escribiéramos solo lo nuestro. |
| **React** | Permite armar la interfaz como piezas reutilizables: si un botón se ve bien en el alta de alumno, el mismo botón sirve en el alta de profesor. |
| **TypeScript** | Describe la forma exacta de cada dato. Si un campo cambia de un lado y no del otro, nos avisa **antes** de probarlo. |
| **Tailwind** | Permite cambiar toda la apariencia del sistema desde un solo archivo, en vez de editar colores y espacios pantalla por pantalla. Un cambio de identidad visual es un cambio en un lugar. |
| **Material Design 3** | El sistema visual con el que está diseñado el centro (colores, tipografía, tamaños de botón, esquinas). Seguirlo hace que la aplicación se vea como algo diseñado y no como un formulario armado con lo que había. |
| **Zod** | Define las reglas de los formularios. El mismo archivo sirve para mostrar el error en pantalla y para que el servidor rechace datos malos. Una sola definición, dos protecciones. |
| **Supabase** | La base de datos. La elegimos porque es una base real en la nube y no hay que instalar ni administrar nada en la computadora. |
| **Framer Motion** | Las animaciones de apertura y cierre de ventanas y pantallas. |
| **OpenCode** | La herramienta con la que trabajamos. Le escribimos la tarea en lenguaje normal y él lee, escribe y revisa el código. Ver la sección siguiente. |
| **Git** | El historial de versiones. Nos permitió ver qué cambió, cuándo y quién lo hizo. |
| **ESLint + revisión automática** | Un control automático que detecta errores que la compilación no marca. Fue clave — ver el grupo B de la sección 6. |
| **OpenSpec + Engram** | La documentación del proyecto: decisiones, acuerdos y contexto, guardados y consultables. |

### Sobre trabajar con OpenCode

Vale la pena explicar cómo trabajamos, porque fue una decisión del proyecto y no un detalle menor.

El equipo no programó escribiendo código directamente. Se trabajó con un asistente (OpenCode) al que se le daba una tarea y una guía de trabajo. Cada comando de los cuatro de la sección 4 tiene dentro su propia secuencia: revisar la usabilidad antes de mostrar la pantalla, aplicar los colores del diseño, y al final correr las verificaciones obligatorias.

**Lo que esto nos dio:**

- Las pantallas quedaron parecidas entre sí, porque todas siguieron la misma guía.
- Los errores se detectaron antes de ser mostrados, porque la verificación era obligatoria.
- La documentación se actualizó en el mismo momento en que se detectaba el problema.

**Lo que hay que tener en cuenta:** el asistente acelera, pero no reemplaza el criterio. Cada problema que aparece en la sección 6 fue detectado por una persona probando la pantalla — no por la herramienta.

---

## 6. Problemas que encontramos y cómo los resolvimos

Esta es la parte más útil del documento. De los 14 problemas que registramos, estos son los que mejor explican cómo trabajamos.

### Grupo A — Venimos de otro proyecto y arrastramos cosas que no correspondían

#### A1. La interfaz iba a verse sin estilo

**Qué pasó.** El proyecto arrancó sobre una base de código que venía de otro sistema anterior. Los componentes de la interfaz estaban escritos usando colores y formas que **no existen** en el diseño de este centro. Si lo hubiéramos entregado así, el usuario habría visto páginas sin ningún estilo: texto negro sobre fondo blanco, sin los botones ni los colores del diseño.

**Por qué pasó.** Se heredó código del proyecto anterior sin revisar que las definiciones de estilo acompañaran al código. Los componentes se copiaron; la base de estilos, no.

**Cómo lo resolvimos.** Definimos primero el tema visual real del centro y después verificamos que **cada** clase de estilo usada por los componentes existiera realmente. La regla que quedó: antes de usar un color o una forma, confirmar que existe en el archivo de tema.

#### A2. Implementamos la paleta de colores equivocada

**Qué pasó.** El documento de diseño del centro tenía su propia paleta (azul oscuro, azul medio, verde agua). Nuestro archivo de referencia, en cambio, traía la paleta del proyecto anterior. Implementamos la que estaba en el archivo de referencia. El usuario lo detectó al comparar.

**Por qué pasó.** El archivo de referencia venía heredado del proyecto anterior y nunca se regeneró. Confiamos en un documento que ya no era cierto.

**Cómo lo resolvimos.** El documento de diseño pasó a ser la fuente de verdad. Y quedó una regla: si el archivo de referencia y el documento de diseño no coinciden, hay que actualizar el de referencia **en el mismo cambio** en que se corrige el código, para que no vuelva a pasar.

#### A3. Iconos de una librería que el diseño no pedía

**Qué pasó.** Los componentes usaban una librería de iconos heredada, mientras que el sistema de diseño del centro pide otra (Material Symbols). Visualmente los íconos no correspondían.

**Cómo lo resolvimos.** Todos los íconos pasan por un único componente. La regla: no se importa otra librería de iconos.

### Grupo B — La revisión automática avisó lo que la compilación daba por bueno

#### B1. Tres errores que pasaron la compilación sin que nadie los viera

**Qué pasó.** En tres lugares distintos del código usamos funciones que dan un valor distinto cada vez que se las llama, o leímos un valor guardado **mientras la pantalla se está dibujando**. El resultado: una pantalla puede mostrar números que cambian, fechas que se corre, o valores que no coinciden con lo que se ve.

El detalle importante: **la compilación dio todo por bueno.** No marcó ningún error. Los agarró la revisión automática del código, que tiene reglas más estrictas que el compilador.

**Por qué pasó.** Son errores lógicos, no de escritura. El código está bien escrito; lo que está mal es *cuándo* se ejecuta.

**Cómo lo resolvimos.** Los tres casos se corrigieron con la misma idea: calcular el valor **una sola vez** al montar la pantalla, y para los que cambian, actualizarlos solo como respuesta a una acción del usuario — nunca mientras se dibuja.

**Lo que queda de esto:** que el código compile no significa que esté bien. Son dos controles distintos y los dos hacen falta.

#### B2. Un formulario que se trababa con el botón "Reintentar"

**Qué pasó.** El botón de reintentar estaba dentro de la función que carga los datos, de una forma que hacía que cada reintento recreara esa función. El resultado era un crecimiento continuo que terminaba trabando la pantalla.

**Cómo lo resolvimos.** Separar la carga en dos cosas distintas: una que busca los datos y un contador que sube cada vez que el usuario reintenta. El reintento es un número que aumenta, no una función que se rehace.

### Grupo C — Problemas que le importaban a alguien usando el sistema

#### C1. El rol Profesor no lograba entrar nunca

**Qué pasó.** El rol Profesor iniciaba sesión **correctamente** — la sesión quedaba guardada — pero la pantalla se quedaba siempre en el formulario de login. A primera vista parecía que el login no funcionaba. Con los otros dos roles no se veía, porque los dos tienen pantallas construidas.

**Por qué pasó.** Al entrar, el sistema lleva a cada rol a la primera pantalla que ese rol puede ver. Profesor tenía asignadas pantallas que **todavía no existían** (Turnos, Mi ficha, Reportes). Como no había ninguna disponible, el sistema lo dejó donde estaba: en la propia pantalla de login.

**Cómo lo resolvimos.** Creamos una pantalla de **inicio** que no pertenece a ningún módulo, que no depende de permisos y que muestra el menú con lo que ese rol va a tener. Ahora el destino existe siempre.

**Lo que queda de esto:** toda redirección necesita un destino que exista. Y hay que probar el login **con cada rol**: el caso que se rompe es siempre el del rol con menos pantallas.

#### C2. Al cerrar una ventana, la pantalla quedaba bloqueada

**Qué pasó.** Al cerrar cualquier ventana de confirmación, el fondo se quedaba invisible pero **seguía capturando los clics de toda la pantalla**. No se podía hacer nada hasta recargar la página. Peor: si la pestaña pasaba a segundo plano mientras se cerraba, la animación se congelaba, la ventana nunca terminaba de cerrarse y la aplicación quedaba inutilizable.

**Por qué pasó.** Al cerrar, el elemento que se está animando desaparece de a poco en lugar de desaparecer de golpe. Durante ese tiempo sigue ahí, transparente, interceptando los clics.

**Cómo lo resolvimos.** Envolver la animación en una capa que corta los clics en el instante en que la ventana se cierra, sin interrumpir la animación. Lo verificamos tocando el centro de la pantalla después de cerrar, para confirmar que ya no quedaba nada capturando.

#### C3. Le mostramos un mensaje en inglés a un usuario que ve todo en español

**Qué pasó.** En el alta de alumnos, cuando se guardaba un alumno menor sin los datos del responsable, dos de los tres errores aparecían con la palabra en inglés ("Invalid") mientras el tercero sí estaba en español.

**Por qué pasó.** Al escribir las reglas de validación, a dos de ellas se les olvidó escribir el mensaje. El sistema usa un texto genérico cuando falta.

**Cómo lo resolvimos.** Obligamos a que **toda** regla de validación lleve su mensaje en español. Y hay un detalle importante: ese mensaje no es solo nuestro. El servidor valida con las mismas reglas y devuelve ese mismo texto al usuario. Si escribimos un error en inglés, el usuario lo va a leer en inglés aunque el backend lo arregle después.

**Cómo lo encontramos:** probando el caso raro, no el común. Un alta de alumno común, con todos los datos completados, deja todo bien y nunca muestra este error.

#### C4. Textos que se veían incompletos

**Qué pasó.** En los horarios y el calendario, algunos textos de estado (por ejemplo, por qué una franja está deshabilitada, o el aviso de "último cupo") usaban colores de advertencia sobre fondos claros. Con el tamaño de letra que teníamos, **no se leían con claridad**.

**Por qué pasó.** Elegimos el color por lo que significaba (gris = deshabilitado, ámbar = atención) sin verificar que la combinación de ese color con el fondo permitiera leerlo.

**Cómo lo resolvimos.** Separar las dos cosas: el color de estado va en el ícono o en el borde, y el texto va en el color de lectura normal, que sí tiene contraste suficiente. Y para encontrar estos casos, comparamos los valores de color de la hoja de estilos en lugar de confiar en cómo se ven.

### Grupo D — Herramientas que no hacían lo que creíamos

#### D1. La fuente de íconos no cargaba y no nos dábamos cuenta

**Qué pasó.** Al cargar la fuente de íconos desde el archivo de estilos, la fuente **no aparecía en la página**. Y no había ningún error: el programa no decía nada.

**Cómo lo encontramos.** Buscando la dirección de la fuente en el archivo de estilos ya compilado. No aparecía. Ahí supimos que se había descartado en silencio.

**Por qué pasó.** La herramienta que procesa los estilos de la página resuelve las importaciones de forma automática y descarta las que apuntan a un archivo externo.

**Cómo lo resolvimos.** Las fuentes externas se cargan desde la página principal, no desde el archivo de estilos.

#### D2. Dos advertencias que no eran errores reales

**Qué pasó.** Dos herramientas marcaron cosas que no eran problemas: una advertencia sobre fuentes que solo corresponde a una versión antigua del programa que ya no usamos, y un error de tipos que se resolvía corriendo un comando.

**Qué hicimos.** Silenciamos la advertencia que no aplica, con una nota al lado explicando por qué, y anotamos el comando que hay que correr antes de verificar. Ninguna de las dos era un problema del sistema.

---

## 7. Las reglas que quedaron

De los 14 problemas registrados extrajimos 13 reglas que hoy se verifican automáticamente en cada pantalla que hacemos. Las más importantes:

1. **Toda redirección necesita un destino que exista siempre.** Sin excepción, aunque falten pantallas.
2. **Probar el login con cada rol.** El caso que se rompe es el del rol con menos pantallas.
3. **El color de estado va en el ícono o en el borde; el texto chico va en el color de lectura normal.** El color solo no reemplaza al contraste.
4. **Todo mensaje de validación en español.** Y recordarlo: el servidor muestra el mismo texto.
5. **Verificar que cada clase de estilo exista antes de usarla.**
6. **El documento de diseño manda sobre el archivo de referencia** — y si no coinciden, se actualiza el de referencia en el mismo cambio.
7. **Las fuentes externas se cargan desde la página, no desde el archivo de estilos.**
8. **Que el código compile no significa que esté bien.** La revisión automática y la compilación son controles distintos.
9. **Probar el caso raro, no solo el común.** El error en inglés apareció en un caso de carga con datos faltantes, no en el flujo normal.
10. **Un problema se anota con su causa, no solo con la solución.** Si no, se repite.

---

## 8. Qué nos llevamos (las lecciones)

1. **El problema más caro no fue de código, fue de herencia.** Los dos errores más grandes (la interfaz sin estilos y la paleta equivocada) vinieron de arrancar sobre un proyecto anterior. Cuando se arranca desde cero o se hereda código, **lo primero que hay que verificar es qué cosas vienen de otro lado**.

2. **Lo que no se prueba, no existe.** El modal que seguía bloqueando la pantalla era invisible para cualquiera que no tocara el centro exacto de la pantalla. El mensaje en inglés solo aparecía en un caso de carga poco común. Los dos bugs más molestos de todos los que encontramos no los vio ninguna herramienta: los vio alguien probando.

3. **Que el código compile no es garantía de nada.** Tres errores pasaron la compilación sin un solo aviso. La revisión automática los encontró. Son dos controles distintos, y con uno solo no alcanza.

4. **Probar siempre desde el usuario con menos permisos.** El rol varado en el login no se habría detectado probando con el gerente. El bug estaba en el diseño de la navegación, no en el código del login.

5. **Un problema sin su causa anotada se repite.** Por eso escribimos el registro de errores. No es burocracia: es la razón por la que este equipo ya no vuelve a cometer los mismos errores. Buena parte de los problemas de esta lista ya nos venían de otras experiencias.

6. **Escribir el acuerdo antes de construir evitó retrabajo.** Definir qué datos guarda cada pantalla antes de programarla hizo que el texto de los errores, las validaciones y la conexión con la base se resolvieran una sola vez y bien.

7. **El sistema se entendió mejor cuando dejamos de pensar en pantallas y pensamos en roles.** Los tres roles del sistema son la estructura real. Las pantallas son la consecuencia.

---

## 9. Lo que falta

- **Completar las pantallas del rol Profesor** (Turnos, Mi ficha, Reportes), que son las que todavía no tienen destino y hoy desembocan en la pantalla de inicio.
- **Conectar con el equipo de back-end.** Los acuerdos de datos están escritos y las pantallas tienen los puntos de conexión marcados, pero falta la revisión conjunta final.
- **Repasar la paleta y el contraste** en las pantallas que se fueron ajustando durante la última etapa.
- **Documentar el manual de uso** para el usuario final (por ahora tenemos el manual de trabajo del equipo, no el de uso del sistema).
- **Definir la fecha de actualización de este documento.** Debe revisarse al cierre de cada etapa.

---

## Dónde está el detalle

| Tema | Archivo |
| --- | --- |
| Registro completo de errores y reglas | `docs/errores-comunes.md` |
| Comandos y flujo de trabajo | `docs/COMO-USAR.md` |
| Fichas de cada pantalla | `docs/briefs/` |
| Acuerdos de datos por pantalla | `docs/contratos/` |
| Sistema visual (colores, tipografía, componentes) | `design-system/bandidossw/MASTER.md` |
| Inventario de componentes | `design-system/bandidossw/componentes.md` |
| Guía de trabajo del equipo | `AGENTS.md` |
