# Manual del Backend

Manual completo de cómo está construido el backend del proyecto, desde cómo entenderlo, cómo escribir el código, como mantenerlo y qué errores debemos identificar.

Este manual está pensado para leer en 3 partes totales, divididas en diversas subpartes en sí; primero vamos a entender la **arquitectura** del back, segundo **cómo escribir código,** y tercero vamos a tener **referencias, cómo realizar control y mantenimiento** del backend.

[**Paso 1 \- Entender la arquitectura	4**](#paso-1---entender-la-arquitectura)

[**Parte 0 \- Entender la idea	4**](#parte-0---entender-la-idea)

[0.1 Problema que resuelve esta arquitectura y una analogía	4](#0.1-problema-que-resuelve-esta-arquitectura-y-una-analogía)

[0.2 El mapa de carpetas	5](#0.2-el-mapa-de-carpetas)

[0.3 Las 8 reglas duras	6](#0.3-las-8-reglas-duras)

[**Parte 1 \- Comienzo del proyecto	7**](#parte-1---comienzo-del-proyecto)

[1.1 El stack, y por qué cada pieza	7](#1.1-el-stack,-y-por-qué-cada-pieza)

[1.3 Variables de entorno	8](#1.3-variables-de-entorno)

[**Parte 2 \- La infraestructura (src/lib), archivo por archivo	8**](#parte-2---la-infraestructura-\(src/lib\),-archivo-por-archivo)

[2.1 lib/db/client.ts — la conexión	8](#2.1-lib/db/client.ts-—-la-conexión)

[2.2 lib/db/tx.ts — las transacciones	9](#2.2-lib/db/tx.ts-—-las-transacciones)

[2.3 lib/http/handler.ts — el wrapper de endpoints	10](#2.3-lib/http/handler.ts-—-el-wrapper-de-endpoints)

[withPublicRoute — el hermano sin sesión	10](#withpublicroute-—-el-hermano-sin-sesión)

[parseBody — validar el cuerpo	10](#parsebody-—-validar-el-cuerpo)

[parseId — validar un id de la URL	11](#parseid-—-validar-un-id-de-la-url)

[2.4 lib/http/errors.ts — los errores de dominio	11](#2.4-lib/http/errors.ts-—-los-errores-de-dominio)

[La jerarquía	11](#la-jerarquía)

[El campo datos	12](#el-campo-datos)

[traducirErrorPostgres() — la red de seguridad	12](#traducirerrorpostgres\(\)-—-la-red-de-seguridad)

[2.5 lib/http/responses.ts — las respuestas	13](#2.5-lib/http/responses.ts-—-las-respuestas)

[2.6 lib/http/query.ts \- leer los parámetros de URLs	14](#2.6-lib/http/query.ts---leer-los-parámetros-de-urls)

[2.7 lib/http/ip.ts — la IP del cliente	14](#2.7-lib/http/ip.ts-—-la-ip-del-cliente)

[2.8 lib/auth/cookie.ts — la cookie de sesión	14](#2.8-lib/auth/cookie.ts-—-la-cookie-de-sesión)

[Por qué está firmada y no solo httpOnly	15](#por-qué-está-firmada-y-no-solo-httponly)

[Por qué HMAC y no un JWT	15](#por-qué-hmac-y-no-un-jwt)

[El detalle del timingSafeEqual	15](#el-detalle-del-timingsafeequal)

[La configuración	15](#la-configuración)

[2.9 lib/auth/gotrue.ts — verificar la contraseña	16](#2.9-lib/auth/gotrue.ts-—-verificar-la-contraseña)

[Por qué Supabase Auth y no una columna password\_hash	16](#por-qué-supabase-auth-y-no-una-columna-password_hash)

[Por qué por REST y no con el SDK	16](#por-qué-por-rest-y-no-con-el-sdk)

[La distinción que importa	16](#la-distinción-que-importa)

[2.10 lib/auth/session.ts — quién está operando	16](#2.10-lib/auth/session.ts-—-quién-está-operando)

[2.11 lib/audit/audit.ts	17](#2.11-lib/audit/audit.ts)

[registrarEvento() — lo que el trigger no puede ver	17](#registrarevento\(\)-—-lo-que-el-trigger-no-puede-ver)

[2.12 lib/api-client.ts — el cliente del FRONT	17](#2.12-lib/api-client.ts-—-el-cliente-del-front)

[Las tres funciones	17](#las-tres-funciones)

[apiGetOpcional — el que hay que conocer	18](#apigetopcional-—-el-que-hay-que-conocer)

[cache: "no-store"	18](#cache:-"no-store")

[2.13 lib/uploads.ts — imágenes	18](#2.13-lib/uploads.ts-—-imágenes)

[**Parte 3 — El recorrido completo de un request	19**](#parte-3-—-el-recorrido-completo-de-un-request)

[3.1 El diagrama	19](#3.1-el-diagrama)

[3.2 Paso ① — withRoute recibe	20](#3.2-paso-①-—-withroute-recibe)

[3.3 Paso ② — El route handler	20](#3.3-paso-②-—-el-route-handler)

[3.4 Paso ③ — El schema valida la forma	21](#3.4-paso-③-—-el-schema-valida-la-forma)

[3.5 Paso ④ — El service decide	21](#3.5-paso-④-—-el-service-decide)

[3.6 Paso ⑤ — El repo ejecuta el SQL	22](#3.6-paso-⑤-—-el-repo-ejecuta-el-sql)

[3.7 Paso ⑥ — Postgres	22](#3.7-paso-⑥-—-postgres)

[3.8 Paso ⑦ — El mapper traduce de vuelta	23](#3.8-paso-⑦-—-el-mapper-traduce-de-vuelta)

[3.9 Paso ⑧ — La respuesta	24](#3.9-paso-⑧-—-la-respuesta)

[3.10 El mismo recorrido, en una tabla	24](#3.10-el-mismo-recorrido,-en-una-tabla)

[**Parte 4 — Las capas de un módulo, en detalle	24**](#parte-4-—-las-capas-de-un-módulo,-en-detalle)

[4.1 \*.types.ts — los dos mundos	25](#4.1-*.types.ts-—-los-dos-mundos)

[4.2 \*.repo.ts — el SQL y nada más	25](#4.2-*.repo.ts-—-el-sql-y-nada-más)

[La constante COLUMNAS	25](#la-constante-columnas)

[Lecturas vs escrituras	26](#lecturas-vs-escrituras)

[4.3 \*.service.ts — las reglas	26](#4.3-*.service.ts-—-las-reglas)

[4.4 \*.mapper.ts — la traducción de salida	27](#4.4-*.mapper.ts-—-la-traducción-de-salida)

[4.5 route.ts — el endpoint	27](#4.5-route.ts-—-el-endpoint)

[**Paso 2\. Para escribir código y entenderlo	27**](#paso-2.-para-escribir-código-y-entenderlo)

[**Parte 5 — Recetario: un ejemplo por situación	27**](#parte-5-—-recetario:-un-ejemplo-por-situación)

[Receta 1 — Catálogo de solo lectura	28](#receta-1-—-catálogo-de-solo-lectura)

[Receta 2 — Listado con filtros	28](#receta-2-—-listado-con-filtros)

[El handler: leer y normalizar	28](#el-handler:-leer-y-normalizar)

[El repo: armar el WHERE dinámico	29](#el-repo:-armar-el-where-dinámico)

[Por qué esto es seguro	29](#por-qué-esto-es-seguro)

[Filtros que se ignoran	30](#filtros-que-se-ignoran)

[Filtros de fecha: el error del día perdido	30](#filtros-de-fecha:-el-error-del-día-perdido)

[Receta 3 — Listado paginado	30](#receta-3-—-listado-paginado)

[El patrón: compartir el FROM y el WHERE	30](#el-patrón:-compartir-el-from-y-el-where)

[Receta 4 — Detalle por id	31](#receta-4-—-detalle-por-id)

[Receta 5 — Alta simple	32](#receta-5-—-alta-simple)

[Receta 6 — Alta con relación N:M	32](#receta-6-—-alta-con-relación-n:m)

[Receta 7 — Alta maestro-detalle (cabecera \+ líneas)	33](#receta-7-—-alta-maestro-detalle-\(cabecera-+-líneas\))

[El bonus: reusar el alta desde otra operación	34](#el-bonus:-reusar-el-alta-desde-otra-operación)

[Receta 8 — Edición	35](#receta-8-—-edición)

[Receta 9 — Baja lógica	36](#receta-9-—-baja-lógica)

[Receta 10 — Cambio de estado (máquina de estados)	37](#receta-10-—-cambio-de-estado-\(máquina-de-estados\))

[1\. Los estados viven en la base; las transiciones, en el código	37](#1.-los-estados-viven-en-la-base;-las-transiciones,-en-el-código)

[2\. Una función privada para todos los cambios	37](#2.-una-función-privada-para-todos-los-cambios)

[3\. Un endpoint por acción	38](#3.-un-endpoint-por-acción)

[Receta 11 — Operación concurrente con locks	38](#receta-11-—-operación-concurrente-con-locks)

[El problema	38](#el-problema)

[La solución: SELECT ... FOR UPDATE	39](#la-solución:-select-...-for-update)

[El detalle que evita un cuelgue: ordenar los ids	39](#el-detalle-que-evita-un-cuelgue:-ordenar-los-ids)

[Y después: releer para las alertas	39](#y-después:-releer-para-las-alertas)

[Receta 12 — Reglas en la base (triggers)	40](#receta-12-—-reglas-en-la-base-\(triggers\))

[Qué va en la base y qué va en el service	40](#qué-va-en-la-base-y-qué-va-en-el-service)

[Cómo hacer que el error del trigger llegue bien al usuario	40](#cómo-hacer-que-el-error-del-trigger-llegue-bien-al-usuario)

[Los códigos propios de este proyecto	41](#los-códigos-propios-de-este-proyecto)

[Receta 13 — Cálculos de dinero	41](#receta-13-—-cálculos-de-dinero)

[Receta 14 — Consulta de reporte / agregación	42](#receta-14-—-consulta-de-reporte-/-agregación)

[Decisión 1: el estado derivado se calcula en SQL, no en el mapper	42](#decisión-1:-el-estado-derivado-se-calcula-en-sql,-no-en-el-mapper)

[Decisión 2: LEFT JOIN cuando puede no haber filas relacionadas	42](#decisión-2:-left-join-cuando-puede-no-haber-filas-relacionadas)

[Decisión 3: FILTER para agregar solo parte de las filas	42](#decisión-3:-filter-para-agregar-solo-parte-de-las-filas)

[Decisión 4: vistas para lo que se consulta muchas veces	43](#decisión-4:-vistas-para-lo-que-se-consulta-muchas-veces)

[Receta 15 — Evitar el problema N+1	43](#receta-15-—-evitar-el-problema-n+1)

[Receta 16 — Endpoint público (login)	44](#receta-16-—-endpoint-público-\(login\))

[Las decisiones de seguridad del login	44](#las-decisiones-de-seguridad-del-login)

[Los parámetros	45](#los-parámetros)

[Receta 17 — Subida de archivos	46](#receta-17-—-subida-de-archivos)

[Receta 18 — Cuándo NO hace falta un módulo entero	46](#receta-18-—-cuándo-no-hace-falta-un-módulo-entero)

[**Paso 3\. Referencias, control y mantenimiento	47**](#paso-3.-referencias,-control-y-mantenimiento)

[**Parte 6 — El catálogo de errores	47**](#parte-6-—-el-catálogo-de-errores)

[6.1 Cuál lanzar	47](#6.1-cuál-lanzar)

[6.2 Cómo agregar un error nuevo	47](#6.2-cómo-agregar-un-error-nuevo)

[6.3 Cómo escribir el mensaje	48](#6.3-cómo-escribir-el-mensaje)

[**Parte 7 — Las reglas que no se negocian	48**](#parte-7-—-las-reglas-que-no-se-negocian)

[7.1 SQL parametrizado, siempre	48](#7.1-sql-parametrizado,-siempre)

[7.2 El usuario\_id sale de la sesión	48](#7.2-el-usuario_id-sale-de-la-sesión)

[7.3 Los montos se recalculan	48](#7.3-los-montos-se-recalculan)

[7.4 Validar en el back aunque el front valide	49](#7.4-validar-en-el-back-aunque-el-front-valide)

[7.5 No filtrar el esquema en los errores	49](#7.5-no-filtrar-el-esquema-en-los-errores)

[7.6 Nada se borra	49](#7.6-nada-se-borra)

[7.7 La transacción, siempre que haya más de una escritura	49](#7.7-la-transacción,-siempre-que-haya-más-de-una-escritura)

[**Parte 8 — La base de datos	49**](#parte-8-—-la-base-de-datos)

[8.1 La organización	49](#8.1-la-organización)

[8.2 Estructura vs. datos — la confusión más común	50](#8.2-estructura-vs.-datos-—-la-confusión-más-común)

[8.3 correcciones/ — los parches	50](#8.3-correcciones/-—-los-parches)

[8.4 Convenciones de nombres	51](#8.4-convenciones-de-nombres)

[8.5 El índice único parcial	51](#8.5-el-índice-único-parcial)

[**Parte 9 — Checklist: agregar un módulo nuevo	52**](#parte-9-—-checklist:-agregar-un-módulo-nuevo)

[☐ 1\. Leer el criterio y anotar las reglas	52](#☐-1.-leer-el-criterio-y-anotar-las-reglas)

[☐ 2\. Confirmar la estructura en la base	52](#☐-2.-confirmar-la-estructura-en-la-base)

[☐ 3\. cliente.types.ts	52](#☐-3.-cliente.types.ts)

[☐ 4\. cliente.schema.ts	52](#☐-4.-cliente.schema.ts)

[☐ 5\. cliente.repo.ts	52](#☐-5.-cliente.repo.ts)

[☐ 6\. cliente.mapper.ts	52](#☐-6.-cliente.mapper.ts)

[☐ 7\. cliente.service.ts	53](#☐-7.-cliente.service.ts)

[☐ 8\. Los route.ts	53](#☐-8.-los-route.ts)

[☐ 9\. Los constraints en la base	53](#☐-9.-los-constraints-en-la-base)

[☐ 10\. Probar con curl	53](#☐-10.-probar-con-curl)

[☐ 11\. Verificación técnica	53](#☐-11.-verificación-técnica)

[☐ 12\. Conectar el front	53](#☐-12.-conectar-el-front)

[**Parte 10 — Probar sin front	53**](#parte-10-—-probar-sin-front)

[**Parte 11 — Los errores que todos cometen	54**](#parte-11-—-los-errores-que-todos-cometen)

[11.1 El campo que se pierde en silencio	54](#11.1-el-campo-que-se-pierde-en-silencio)

[11.2 El 401 en todos los endpoints	55](#11.2-el-401-en-todos-los-endpoints)

[11.3 "El login no hace nada"	55](#11.3-"el-login-no-hace-nada")

[11.4 El listado sale vacío con los filtros por defecto	55](#11.4-el-listado-sale-vacío-con-los-filtros-por-defecto)

[11.5 El POST devuelve datos incompletos	55](#11.5-el-post-devuelve-datos-incompletos)

[11.6 42703 undefined\_column / 42P01 undefined\_table	55](#11.6-42703-undefined_column-/-42p01-undefined_table)

[11.7 El listado tarda tres segundos	55](#11.7-el-listado-tarda-tres-segundos)

[11.8 El paginador dice 23 y la lista tiene 18	56](#11.8-el-paginador-dice-23-y-la-lista-tiene-18)

[11.9 Un decimal que llega como texto	56](#11.9-un-decimal-que-llega-como-texto)

[11.10 Deadlock al mover stock	56](#11.10-deadlock-al-mover-stock)

[**Parte 12 — Glosario	56**](#parte-12-—-glosario)

# Paso 1 \- Entender la arquitectura {#paso-1---entender-la-arquitectura}

## Parte 0 \- Entender la idea {#parte-0---entender-la-idea}

### 0.1 Problema que resuelve esta arquitectura y una analogía {#0.1-problema-que-resuelve-esta-arquitectura-y-una-analogía}

Un backend hace siempre lo mismo: **recibe un pedido por internet, decide si está permitido, toca la base de datos y contesta**.

Podemos utilizar muchos endpoints para realizar esto, sin embargo se vuelve engorroso cuando tenemos \+40 de los mismos y se repite el mismo código.

La solución es **separar por responsabilidad**: cada archivo hace una sola cosa y solo conoce al que tiene abajo

Imagina un restaurante:

| En el restaurante | Qué hace | En el código |
| :---- | :---- | :---- |
| **El mozo** | Toma el pedido, lo anota, lo lleva a la cocina, trae el plato. No cocina. | `route.ts` |
| **La lista de "qué se puede pedir"** | "El pedido tiene que decir plato y cantidad". Rechaza un pedido incompleto sin molestar a la cocina. | `*.schema.ts` |
| **El chef** | Decide. "No hay salmón" / "esa combinación no se sirve" / "para este plato hay que hacer A, después B y después C, y si falla B se tira todo". | `*.service.ts` |
| **El depósito** | Trae ingredientes y los guarda. No opina sobre el menú. | `*.repo.ts` |
| **El emplatado** | Presenta el plato como lo espera el cliente. | `*.mapper.ts` |
| **Las reglas del local** | Cómo se cobra, cómo se atiende un reclamo, quién puede entrar a la cocina. Iguales para todas las mesas. | `src/lib/` |

El punto importante: **el mozo no cocina y el chef no atiende mesas**. Si el chef supiera de mesas, no podrías probar sus recetas sin abrir el restaurante.

### 0.2 El mapa de carpetas {#0.2-el-mapa-de-carpetas}

src/  
├── app/  
│   └── api/                    ← LOS ENDPOINTS (el mozo)  
│       ├── pedidos/  
│       │   ├── route.ts               → GET /api/pedidos, POST /api/pedidos  
│       │   └── \[id\]/  
│       │       ├── route.ts           → GET /api/pedidos/5, PUT /api/pedidos/5  
│       │       └── inactivar/route.ts → PATCH /api/pedidos/5/inactivar  
│       └── ...  
│  
├── modules/                    ← LA LÓGICA, agrupada por tema  
│   └── pedidos/  
│       ├── pedidos.types.ts     → los tipos (qué forma tienen los datos)  
│       ├── pedidos.schema.ts    → validación de entrada (zod)  
│       ├── pedidos.repo.ts      → SQL  
│       ├── pedidos.service.ts   → reglas de negocio  
│       └── pedidos.mapper.ts    → fila de la base → JSON del front  
│  
├── lib/                        ← INFRAESTRUCTURA  
     ├── db/     → conexión y transacciones  
     ├── http/   → wrapper de endpoints, errores, respuestas, query params  
     ├── auth/   → sesión, cookie firmada, login contra Supabase  
     ├── audit/  → quién hizo qué  
     ├── api-client.ts → el fetch que usa el FRONT  
     └── uploads.ts    → guardado de imágenes

Y en la raíz del repo:

db/  
└── schema.sql        ← la estructura completa de la base (tablas, triggers, vistas)  
*Este  schema.sql  se crea con el comando npm run db:dump*

### 0.3 Las 8 reglas duras {#0.3-las-8-reglas-duras}

Estas reglas son las más importantes del proyecto, las que más se van a usar y siempre se tienen que tener en cuenta para crear todos los módulos del back.

| \# | Regla | Por qué |
| :---- | :---- | :---- |
| 1 | **El valor que escribió el usuario nunca se concatena al SQL.** Siempre `$1`, `$2, …, $n`. | Es la única defensa real contra inyección SQL. |
| 2 | **El `usuario_id` sale de la sesión, nunca del body.** | Si viene del body, cualquiera puede operar como otro. |
| 3 | **Toda escritura que toca más de una tabla va dentro de `withTransaction`.** | Si falla el paso 3, los pasos 1 y 2 se deshacen. |
| 4 | **`withAuditUser` es la primera línea de toda transacción que escribe.** | Si no, la fila de auditoría queda sin autor y no sirve. |
| 5 | **Los montos y totales se recalculan en el server.** El total que manda el front se descarta. | El front puede tener un bug de redondeo — o alguien puede llamar la API a mano. |
| 6 | **El service no sabe qué es un status code.** No aparece `Request`, `Response` ni `200` en un `.service.ts`. | Así se puede testear llamando a la función, sin levantar el servidor. |
| 7 | **El repo no valida reglas de negocio.** Solo SQL. | Si el repo decide, la regla queda enterrada abajo y nadie la encuentra. |
| 8 | **El error crudo de Postgres nunca sale al cliente.** Va al log del server. | Filtra nombres de tablas, columnas y constraints. |

## Parte 1 \- Comienzo del proyecto {#parte-1---comienzo-del-proyecto}

### 1.1 El stack, y por qué cada pieza {#1.1-el-stack,-y-por-qué-cada-pieza}

| Pieza | Para qué | Por qué esta y no otra |
| :---- | :---- | :---- |
| **Next.js** 16.3 | Framework. Las carpetas de `src/app/api/` se convierten solas en endpoints. | El front ya es React; con Next el front y el back viven en el mismo repo y comparten los tipos. |
| **TypeScript** 5.x | Tipos. | El contrato entre front y back se verifica al compilar, no en producción. |
| **`pg`** 8.x | Driver de Postgres. | Es el driver oficial, sin capas intermedias. No usamos un ORM: el SQL queda a la vista y se puede copiar al editor de Supabase para depurarlo. |
| **`zod`** 3.x  | Validación de la entrada. | Declaras el schema una vez y te da el tipo de TypeScript gratis (`z.infer`). |
| **Postgres** (Supabase) | La base. | Tiene triggers, constraints y tipos fuertes: las reglas críticas se pueden garantizar en el motor, no solo en el código. |

**No hay ORM (Prisma, TypeORM) a propósito.** Con SQL a mano se ve exactamente qué consulta se ejecuta, se puede pegar en el editor de Supabase y se aprende SQL de verdad. El costo es escribir más; la ventaja es que nada es mágico.

Seleccionamos no utilizar un ORM por:

1. Nos permite optimizar consultas SQL.   
2. Ya tenemos la arquitectura realizada de un proyecto en simultáneo de otra materia.   
3. Configurar el ORM desde 0, definir modelos, gestionar migraciones y ajustar la conexión a la base de datos consumiría mucho tiempo para lo que tenemos y también generaría riesgos de bloqueos inesperados.  
4. La infraestructura actual ya maneja mucho de lo que Prisma u otro ORM haría.

### 1.3 Variables de entorno {#1.3-variables-de-entorno}

Estas variables de entornos se definen para poder conectarse a la base de datos o partes más sensibles en el proyecto, 

La raíz de las variables es en `.env.local` (**NO se commitea**, con los valores):

\# Conexión a Postgres.  
DATABASE\_URL=postgresql://usuario:password@host:5432/basededatos

\# Supabase Auth (solo si usás login).  
SUPABASE\_URL=https://XXXX.supabase.co  
SUPABASE\_ANON\_KEY=

\# SOLO DESARROLLO: saltea el login y opera siempre como este usuario.  
\# ⚠️ Mientras esté puesta, el login "no hace nada". Sacala para probar auth.  
\# SESSION\_USUARIO\_DNI=12345678

## Parte 2 \- La infraestructura (`src/lib`), archivo por archivo {#parte-2---la-infraestructura-(src/lib),-archivo-por-archivo}

Entendida una vez, sirve siempre.

### 2.1 `lib/db/client.ts` — la conexión {#2.1-lib/db/client.ts-—-la-conexión}

**Qué hace:** abre y mantiene el *pool* de conexiones a Postgres, y expone `query()` para consultas sueltas.

**Qué es un pool:** abrir una conexión a Postgres tarda decenas de milisegundos. Si cada request abriera la suya, el 90% del tiempo se iría a saludar a la base. Un pool abre un puñado de conexiones al arrancar y las **presta y recupera**. Acá son 10 como máximo.

**Por qué ese `globalThis`:** en `next dev`, cada vez que guardás un archivo, Next vuelve a evaluar los módulos. Sin guardar el pool en una variable global, cada guardado crearía un pool nuevo y el anterior quedaría huérfano con sus conexiones abiertas — hasta que la base te rechace por límite de conexiones. En producción no hace falta porque el módulo se evalúa una sola vez.

**Cómo se usa:**

import { query } from "@/lib/db/client";

const filas \= await query\<{ id: number; nombre: string }\>(  
  "SELECT id, nombre FROM forma\_pago ORDER BY nombre",  
);

**Cuándo NO usarlo:** cuando escribís. Las escrituras van por `withTransaction`, que usa una conexión dedicada.

### 2.2 `lib/db/tx.ts` — las transacciones {#2.2-lib/db/tx.ts-—-las-transacciones}

**Qué hace:** ejecuta un bloque de código dentro de una transacción de Postgres.

export async function withTransaction\<T\>(  
  fn: (client: PoolClient) \=\> Promise\<T\>,  
): Promise\<T\> {  
  const client \= await pool.connect();  
  try {  
    await client.query("BEGIN");  
    const resultado \= await fn(client);  
    await client.query("COMMIT");  
    return resultado;  
  } catch (e) {  
    await client.query("ROLLBACK");  
    throw e;  
  } finally {  
    client.release();  
  }  
}

**Qué es una transacción, en criollo:** un "todo o nada". Entre el `BEGIN` y el `COMMIT`, los cambios existen solo para vos. Si algo falla, el `ROLLBACK` los borra como si nunca hubieran pasado.

**El ejemplo que lo explica todo:** registrar un movimiento de stock hace tres cosas:

1. Inserta la cabecera del movimiento.  
2. Inserta las líneas del detalle.  
3. Actualiza el stock de cada ficha afectada.

Si el paso 3 falla y no hubo transacción, quedó registrado un movimiento que nunca movió el stock. **El inventario del sistema pasa a mentir, y nadie se entera hasta el próximo recuento.**

**Regla:** toda operación que escriba en más de una tabla va acá dentro. Sin excepciones.

**El `finally` es obligatorio:** `client.release()` devuelve la conexión al pool. Si se olvida, el pool se queda sin conexiones prestadas y la aplicación se cuelga entera después de 10 operaciones.

### 2.3 `lib/http/handler.ts` — el wrapper de endpoints {#2.3-lib/http/handler.ts-—-el-wrapper-de-endpoints}

**Qué hace:** tres cosas que si no habría que repetir en los 38 archivos de ruta.

export function withRoute\<P \= Record\<string, never\>\>(  
  fn: (ctx: Ctx\<P\>) \=\> Promise\<Response\>,  
) {  
  return async (req: Request, ctx: { params: Promise\<P\> }): Promise\<Response\> \=\> {  
    try {  
      const session \= await requireSession();       // 1\. exige sesión → 401 si no hay  
      return await fn({ req, session, params: ctx.params });  
    } catch (e) {  
      return errorResponse(traducirErrorPostgres(e) ?? e);  // 2 y 3  
    }  
  };  
}

1. **Resuelve la sesión** antes de ejecutar el handler. Si no hay, tira 401 y el handler nunca corre.	  
2. **Captura cualquier error** que se haya lanzado en cualquier punto del árbol y lo convierte en una respuesta HTTP.  
3. **Traduce los errores de Postgres** a errores de dominio.

**Por eso en los endpoints no hay `try/catch`.** Un `throw new NotFoundError(...)` tres capas más abajo llega solo hasta acá y sale como un 404 bien formado.

#### `withPublicRoute` — el hermano sin sesión {#withpublicroute-—-el-hermano-sin-sesión}

Idéntico, pero **sin** el `requireSession()`. Existe para un solo caso: el login. Envolver `POST /api/auth/login` con `withRoute` sería pedir estar logueado para poder loguearse.

> No hay un tercer wrapper "a veces con sesión". Cuando un endpoint necesita saber si hay sesión pero el 401 no es un error (por ejemplo `/api/auth/sesion`, que responde "no hay nadie logueado"), llama a `getSession()` a mano. Es una línea y deja la intención explícita.

#### `parseBody` — validar el cuerpo {#parsebody-—-validar-el-cuerpo}

const input \= await parseBody(req, crearProveedorSchema);  
Si el JSON es inválido → `ValidationError`. Si no cumple el schema → `ValidationError` con el **primer campo** que falló, que el front usa para pintar ese input en rojo.

#### `parseId` — validar un id de la URL {#parseid-—-validar-un-id-de-la-url}

const { id } \= await params;   
return ok(await service.obtener(parseId(id)));  
`parseId` verifica que sea un entero positivo. Sin esto, `/api/proveedores/abc` llegaría al SQL como `NaN`.

> **Detalle de Next 16:** los `params` de un route handler son una **Promise**. Hay que `await`\-earlos. En versiones anteriores eran un objeto plano.

### 2.4 `lib/http/errors.ts` — los errores de dominio {#2.4-lib/http/errors.ts-—-los-errores-de-dominio}

**Qué hace:** define los errores que los servicios (services) pueden lanzar, y traduce los errores de Postgres.

#### La jerarquía {#la-jerarquía}

Todos heredan de `AppError`, que lleva un `código`, un `mensaje`, un `campo` opcional y un `status` HTTP:

| Clase | Status | Cuándo se usa | Ejemplo |
| :---- | :---- | :---- | :---- |
| `ValidationError` | 422 | El input no cumple una regla de forma | "El CUIT debe tener formato XX-XXXXXXXX-X" |
| `NotFoundError` | 404 | El recurso no existe | "No se encontró el proveedor con id 99" |
| `ConflictError` | 409 | **El dato ya existe** | "Ya existe un proveedor activo con ese CUIT" |
| `BusinessRuleError` | 409 | **Una regla lo prohíbe** | "No se puede dar de baja: tiene órdenes abiertas" |
| `UnauthorizedError` | 401 | No hay sesión | "Tu sesión venció" |
| `CredencialesInvalidasError` | 401 | Email o contraseña mal | "Email o contraseña incorrectos" |
| `CuentaBloqueadaError` | **423** | Cuenta bloqueada por intentos fallidos | "Volvé a intentar en 7 minutos" |
| `ServicioAuthNoDisponibleError` | 503 | El servicio de auth no responde | "Intentá de nuevo en unos segundos" |

**`ConflictError` vs `BusinessRuleError`:** los dos dan 409, pero significan cosas distintas. `ConflictError` es "ese dato ya está tomado" (se arregla cambiando el dato). `BusinessRuleError` es "eso no se puede hacer" (se arregla cambiando de idea, o resolviendo otra cosa antes).

**Por qué `CuentaBloqueadaError` es 423 y no 401:** el 401 le dice al front "probá otra vez con las credenciales correctas". Acá probar otra vez **no sirve** hasta que pase el tiempo. El front necesita distinguirlos para mostrar el contador en vez del formulario.

#### El campo `datos` {#el-campo-datos}

Algunos errores necesitan mandar un valor, no un texto. `CuentaBloqueadaError` manda la fecha de desbloqueo:

export class CuentaBloqueadaError extends AppError {  
  readonly status \= 423;  
  get datos(): Record\<string, unknown\> {  
    return { bloqueadoHasta: this.bloqueadoHasta.toISOString() };  
  }  
  // ...  
}  
Sin esto, el front tendría que **parsear castellano** ("volvé en 7 minutos") para sacar un número — y ese parseo se rompe el día que alguien mejora la redacción.

#### `traducirErrorPostgres()` — la red de seguridad {#traducirerrorpostgres()-—-la-red-de-seguridad}

Esta es la pieza más importante del archivo. Convierte códigos SQLSTATE de Postgres en errores de dominio:

| Código | Significa | Se traduce a |
| :---- | :---- | :---- |
| `23505` | unique\_violation | `ConflictError` — se mira el **nombre del constraint** para dar el mensaje justo |
| `23502` | not\_null\_violation | `ValidationError` — "falta un dato obligatorio" |
| `23503` | foreign\_key\_violation | `ValidationError` — "se referencia un registro que no existe" |
| `23514` | check\_violation | `BusinessRuleError` o `ValidationError` según el constraint |
| `P0001` | `RAISE EXCEPTION` genérico de un trigger | `BusinessRuleError` genérico |
| `HF001`…`HF014` | códigos **propios del proyecto**, levantados por triggers | `BusinessRuleError` con mensaje específico |

**El detalle de los códigos propios.** Un trigger puede rechazar una operación así:

RAISE EXCEPTION 'stock insuficiente' USING ERRCODE \= 'HF001';  
Sin el `USING ERRCODE`, Postgres manda `P0001` para todos los rechazos y el único modo de distinguirlos sería **matchear el texto del mensaje en castellano** — que se rompe el día que alguien corrige una tilde. Con código propio, el mapeo es estable:

if (codigo \=== "HF001") {  
  return new BusinessRuleError(  
    "STOCK\_INSUFICIENTE",  
    "No hay stock suficiente para registrar este egreso.",  
  );  
}

**Por qué esto importa tanto:** el service de movimientos ya **no valida el stock** — lo hace el trigger, que es el único que puede hacerlo de forma atómica. Este mapeo es lo único que convierte esa regla en un 409 con mensaje útil. Sin él, un egreso sin stock devuelve un 500 genérico.

**Por qué existe aunque el service ya valide.** El service chequea antes para dar un mensaje lindo. Pero bajo concurrencia, dos requests simultáneos pasan **los dos** el chequeo y uno choca contra el índice único. Ese choque se traduce acá. El chequeo del service es cortesía; el índice de la base es la garantía.

### 2.5 `lib/http/responses.ts` — las respuestas {#2.5-lib/http/responses.ts-—-las-respuestas}

export function ok\<T\>(data: T)      { return NextResponse.json(data, { status: 200 }); }  
export function created\<T\>(data: T) { return NextResponse.json(data, { status: 201 }); }  
export function noContent()         { return new NextResponse(null, { status: 204 }); }  
Y `errorResponse()`, que produce **el shape único de error de toda la API**:

{  
  "error": {  
    "codigo": "CUIT\_DUPLICADO",  
    "mensaje": "Ya existe un proveedor activo con el CUIT 30-12345678-9: Pet Food SA.",  
    "campo": "cuit",  
    "datos": null  
  }  
}

Un solo formato para los todos los endpoints. El front escribe el manejo de errores una vez y funciona en todas las pantallas.

**Lo que no es `AppError` es un bug**: sale un 500 genérico al cliente y el detalle va al log del server. El usuario no tiene por qué ver un stack trace, y el stack trace no tiene por qué llegar a un extraño.

### 2.6 `lib/http/query.ts` \- leer los parámetros de URLs {#2.6-lib/http/query.ts---leer-los-parámetros-de-urls}

Helpers para los filtros de los listados. Existen para no repetir el mismo parseo en cada endpoint:

| Helper | Qué resuelve |
| :---- | :---- |
| `leerTexto(sp, "busqueda")` | Devuelve `undefined` si está vacío o solo espacios (así el filtro no se aplica). |
| `leerEntero(sp, "proveedorId")` | `undefined` si no es un entero. |
| `leerDecimal(sp, "totalMin")` | Acepta **coma decimal** — el teclado es-AR manda `1234,50`. |
| `leerBooleano(sp, "activo")` | Acepta `"true"` y `"1"`. |
| `leerEstado(sp)` | Normaliza el `"Activo"` del front al `'activo'` del enum de la base. |
| `leerFecha(sp, "desde")` | `undefined` si no parsea como fecha. |

**El patrón de fondo:** un filtro que no se entiende **se ignora**, no llega al SQL. Si el front manda `?estado=Todas` (su valor para "sin filtrar"), `leerEstado` devuelve `undefined` y el `WHERE` no incluye esa condición. Sin eso, el SQL buscaría un estado llamado "Todas" y la lista saldría vacía sin explicación.

### 2.7 `lib/http/ip.ts` — la IP del cliente {#2.7-lib/http/ip.ts-—-la-ip-del-cliente}

Saca la IP de los headers `x-forwarded-for`, `x-real-ip`, `cf-connecting-ip`, `x-vercel-forwarded-for`.

En `next dev` devuelve `null`, porque no hay proxy. Por eso la columna es nullable.

### 2.8 `lib/auth/cookie.ts` — la cookie de sesión {#2.8-lib/auth/cookie.ts-—-la-cookie-de-sesión}

**Qué guarda:** el id del usuario, cuándo vence, y el access token del proveedor de auth.

**Formato:** `<payload en base64url>.<firma HMAC en base64url>`

#### Por qué está firmada y no solo `httpOnly` {#por-qué-está-firmada-y-no-solo-httponly}

`httpOnly` evita que el JavaScript de la página lea la cookie. **No evita que el usuario la edite** — el navegador es suyo y la cookie es texto que él controla.

Sin firma, cambiar `{"uid":4}` por `{"uid":1}` es **hacerse administrador**.

La firma es HMAC-SHA256 con un secreto que solo conoce el server. Cualquier modificación del payload hace que la firma no dé, y la cookie se descarta.

#### Por qué HMAC y no un JWT {#por-qué-hmac-y-no-un-jwt}

Un JWT tiene sentido cuando el token cruza sistemas que **no comparten** el secreto. Acá la firma la pone y valida el mismo proceso. HMAC-SHA256 con `node:crypto` hace exactamente lo mismo, sin dependencias, y sin la lista de errores clásicos de JWT (`alg=none`, confusión HS/RS).

#### El detalle del `timingSafeEqual` {#el-detalle-del-timingsafeequal}

if (firmaRecibida.length \!== firmaEsperada.length) return null;  
if (\!timingSafeEqual(Buffer.from(firmaRecibida), Buffer.from(firmaEsperada))) return null;  
Comparar con `===` filtraría información: `===` corta en el primer carácter que difiere, y el **tiempo** que tarda en cortar dice en qué posición estaba la diferencia. Con suficientes intentos, eso permite reconstruir la firma carácter por carácter. `timingSafeEqual` siempre tarda lo mismo.

#### La configuración {#la-configuración}

| Opción | Valor | Por qué |
| :---- | :---- | :---- |
| `httpOnly` | `true` | El JS de la página no la puede leer (defensa contra XSS). |
| `sameSite` | `"lax"` | Con `strict`, el navegador no manda la cookie cuando se llega desde un link externo, y el usuario aterriza "deslogueado" aunque su sesión esté viva. |
| `secure` | solo en producción | En `localhost` no hay HTTPS. |
| duración | 8 horas | Un turno de trabajo. |

### 2.9 `lib/auth/gotrue.ts` — verificar la contraseña {#2.9-lib/auth/gotrue.ts-—-verificar-la-contraseña}

**Qué hace:** le pregunta a Supabase Auth una sola cosa: *¿Esta contraseña es la de este email?*

**Qué NO hace:** no cuenta intentos, no bloquea, no escribe bitácora, no toca la cookie. Todo eso es regla de negocio y vive en el service.

#### Por qué Supabase Auth y no una columna `password_hash` {#por-qué-supabase-auth-y-no-una-columna-password_hash}

La base ya se comprometió con Supabase Auth: `usuario.auth_id` es una FK a `auth.users(id)`, y hay un trigger que crea la fila de `usuario` cuando alguien se registra. Agregarle una columna de contraseña sería **un segundo lugar donde vive la misma credencial** — y dos lugares se desincronizan.

#### Por qué por REST y no con el SDK {#por-qué-por-rest-y-no-con-el-sdk}

De todo `@supabase/supabase-js` necesitamos dos llamadas. La API de GoTrue es HTTP plano, así que `fetch` alcanza, el proyecto no suma dependencias, y no aparece un cliente con su propio manejo de sesión compitiendo con nuestra cookie.

#### La distinción que importa {#la-distinción-que-importa}

export type ResultadoVerificacion \=  
  | { ok: true; tokens: TokensGoTrue }  
  | { ok: false; motivo: "credenciales" }   // la contraseña está mal  
  | { ok: false; motivo: "servicio" };      // Supabase no contestó

**No es cosmético.** Un intento que falla porque el servicio de auth está caído **no cuenta como intento fallido del usuario**. Si contara, una caída de 15 minutos dejaría bloqueada a toda la empresa.

### 2.10 `lib/auth/session.ts` — quién está operando {#2.10-lib/auth/session.ts-—-quién-está-operando}

Tres funciones:

- **`getSession()`** → la sesión, o `null`.  
- **`requireSession()`** → la sesión, o lanza `UnauthorizedError`.  
- **`destroySession()`** → invalida el token en Supabase **y después** borra la cookie. Los dos pasos, en ese orden: borrar solo la cookie deja el token vivo hasta que expire.

**Este es el único archivo del sistema que sabe cómo se autentica alguien.** Todos los endpoints y sus servicios (services) no cambiaron cuando se reemplazó el stub de desarrollo por el login real, porque la firma de `requireSession()` es la misma.

Si la cookie es válida pero el usuario fue dado de baja mientras tenía la sesión abierta, **la sesión se cae**. 

### 2.11 `lib/audit/audit.ts` {#2.11-lib/audit/audit.ts}

**La decisión clave: la auditoría la escribe un TRIGGER de Postgres, no la aplicación.**

Dos razones:

1. El requisito exige que **nadie pueda editar ni borrar** entradas de la bitácora. Eso se garantiza en el motor, no confiando en que el código se porte bien.  
2. **Un trigger no se puede olvidar** cuando alguien agrega un endpoint nuevo. Una llamada manual sí.

Lo único que la app tiene que hacer es decirle al trigger **quién** está operando:

export async function withAuditUser(client: PoolClient, usuarioId: number) {  
  await client.query("SELECT set\_config('app.usuario\_id', $1, true)", \[String(usuarioId)\]);  
}  
El trigger después lee esa variable con `current_setting('app.usuario_id', true)`.

**El tercer parámetro en `true` significa `SET LOCAL`:** la variable vive solo lo que dura la transacción. Sin eso, se filtraría a la próxima operación que reutilice esa misma conexión del pool — y un movimiento de stock quedaría auditado a nombre de la persona anterior.

**Por eso `withAuditUser` va PRIMERO**, antes de cualquier escritura:

return withTransaction(async (client) \=\> {  
  await withAuditUser(client, usuarioId);   // ← siempre la primera línea  
  // ... el resto  
});  
Si se olvida, la operación funciona igual pero la fila de auditoría queda con `usuario_id` NULL — o sea, un registro que no sirve para auditar.

#### `registrarEvento()` — lo que el trigger no puede ver {#registrarevento()-—-lo-que-el-trigger-no-puede-ver}

El trigger cubre altas, modificaciones y bajas de filas. Para eventos que **no son un cambio de fila** (inicio de sesión, exportaciones, intentos rechazados) está el registro manual.

### 2.12 `lib/api-client.ts` — el cliente del FRONT {#2.12-lib/api-client.ts-—-el-cliente-del-front}

Ojo: este archivo lo usa el **front**, no el back. Está en `lib/` porque es infraestructura compartida.

Existe para no repetir en cada pantalla el mismo `fetch` con su chequeo de `res.ok` y su parseo del error. Convierte el shape de error del back en un `ApiError` con `codigo`, `campo`, `status` y `datos`.

#### Las tres funciones {#las-tres-funciones}

apiGet\<T\>(url)                       // GET; si falla, lanza ApiError  
apiGetOpcional\<T\>(url, porDefecto)   // GET; si falla, devuelve porDefecto  
apiSend\<T\>(metodo, url, body)        // POST / PUT / PATCH / DELETE

#### `apiGetOpcional` — el que hay que conocer {#apigetopcional-—-el-que-hay-que-conocer}

Las pantallas piden el listado principal **y varios catálogos** a la vez:

const \[proveedores, formasPago, depositos\] \= await Promise.all(\[...\]);  
Con `Promise.all`, **un catálogo caído tira abajo toda la página**: el usuario ve "no se pudieron cargar los datos" aunque el listado esté perfecto y lo único que falte sea poblar un `<select>`.

**La regla:** el listado que le da sentido a la pantalla va con `apiGet` (si falla, la pantalla no sirve). Los catálogos van con `apiGetOpcional`.

#### cache: "no-store" {#cache:-"no-store"}

`apiGet` lo pasa siempre. Sin eso, Next puede servir una respuesta vieja de su caché — y son datos que cambian todo el tiempo.

### 2.13 `lib/uploads.ts` — imágenes {#2.13-lib/uploads.ts-—-imágenes}

**El problema:** el front lee el archivo con `FileReader` y lo manda como **data URL en base64** (`data:image/png;base64,iVBORw0...`), un string de cientos de miles de caracteres. La columna `articulo.imagen_url` es `varchar(255)`.

Guardar el base64 ahí es imposible. Y agrandar la columna a `text` sería peor: cada `SELECT` de artículos arrastraría megabytes de imágenes que nadie pidió.

**La solución:** el archivo se escribe en disco y en la base queda **solo la ruta**.

| Validación | Valor |
| :---- | :---- |
| Tipos aceptados | PNG, JPG, WEBP, GIF |
| Tamaño máximo | 2 MB (igual que valida el front) |
| Nombre del archivo | UUID aleatorio |

**El nombre aleatorio importa por dos motivos:** si dos artículos suben `foto.png` no se pisan, y nadie puede adivinar la URL de la imagen de otro.

**El `if` del principio** es para cuando se edita un artículo sin cambiar la imagen: el front reenvía la URL que ya tenía en vez de un archivo nuevo.

**Limitación conocida:** `public/uploads/` funciona con `next dev` y con un servidor Node normal. En un hosting serverless (Vercel) el disco **no persiste entre requests**: ahí hay que pasar a Supabase Storage o S3. El cambio queda contenido en este archivo.

---

## Parte 3 — El recorrido completo de un request {#parte-3-—-el-recorrido-completo-de-un-request}

Vamos a seguir un `POST /api/proveedores` desde que el usuario aprieta "Guardar" hasta que ve el resultado. Es el recorrido que hace **cualquier** operación del sistema.

### 3.1 El diagrama {#3.1-el-diagrama}

┌──────────────────────────────────────────────────────────────────┐  
│  NAVEGADOR                                                       │  
│  El usuario completa el formulario y aprieta "Guardar"           │  
└────────────────────────────┬─────────────────────────────────────┘  
                             │  apiSend("POST", "/api/proveedores", body)  
                             ▼  
┌──────────────────────────────────────────────────────────────────┐  
│  ① withRoute                          lib/http/handler.ts        │  
│     · try { ... } catch → traduce errores                        │  
│     · requireSession() → ¿hay cookie válida?  NO → 401           │  
└────────────────────────────┬─────────────────────────────────────┘  
                             ▼  
┌──────────────────────────────────────────────────────────────────┐  
│  ② route.ts                  app/api/proveedores/route.ts        │  
│     const input \= await parseBody(req, crearProveedorSchema)     │  
└────────────────────────────┬─────────────────────────────────────┘  
                             ▼  
┌──────────────────────────────────────────────────────────────────┐  
│  ③ schema (zod)              proveedor.schema.ts                 │  
│     ¿razonSocial tiene texto? ¿el CUIT tiene 11 dígitos?         │  
│     NO → ValidationError → 422 con el campo señalado             │  
└────────────────────────────┬─────────────────────────────────────┘  
                             ▼  
┌──────────────────────────────────────────────────────────────────┐  
│  ④ service                   proveedor.service.ts                │  
│     withTransaction(async (client) \=\> {                          │  
│       withAuditUser(client, usuarioId)   ← SIEMPRE primero       │  
│       ¿ya existe ese CUIT activo? SÍ → ConflictError → 409       │  
│       ...                                                        │  
└────────────────────────────┬─────────────────────────────────────┘  
                             ▼  
┌──────────────────────────────────────────────────────────────────┐  
│  ⑤ repo                      proveedor.repo.ts                   │  
│     INSERT INTO proveedor (...) VALUES ($1,...,$7) RETURNING ... │  
└────────────────────────────┬─────────────────────────────────────┘  
                             ▼  
┌──────────────────────────────────────────────────────────────────┐  
│  ⑥ POSTGRES                                                      │  
│     · índices UNIQUE     → si choca, SQLSTATE 23505              │  
│     · CHECK constraints  → si choca, SQLSTATE 23514              │  
│     · triggers           → auditoría, stock, numeración          │  
└────────────────────────────┬─────────────────────────────────────┘  
                             ▼  
┌──────────────────────────────────────────────────────────────────┐  
│  ⑦ mapper                    proveedor.mapper.ts                 │  
│     fila snake\_case \+ nulls \+ decimales-como-string              │  
│              ↓                                                   │  
│     el objeto exacto que espera el front                         │  
└────────────────────────────┬─────────────────────────────────────┘  
                             ▼  
┌──────────────────────────────────────────────────────────────────┐  
│  ⑧ created(data) → 201 \+ JSON                                    │  
│     (o, si algo lanzó, errorResponse lo convierte al shape único)│  
└──────────────────────────────────────────────────────────────────┘

### 3.2 Paso ① — `withRoute` recibe {#3.2-paso-①-—-withroute-recibe}

Antes de que corra una línea de código tuyo, el wrapper ya hizo dos cosas: abrió un `try/catch` que cubre todo lo que sigue, y resolvió la sesión.

**Si no hay sesión válida, acá termina todo:** respuesta 401, el handler no se ejecuta, la base ni se entera.

### 3.3 Paso ② — El route handler {#3.3-paso-②-—-el-route-handler}

export const POST \= withRoute(async ({ req, session }) \=\> {  
  const input \= await parseBody(req, crearProveedorSchema);  
  return created(await service.crear(input, session.usuarioId));  
});  
**Dos líneas.** Mirá bien lo que NO hay acá:

- ❌ No hay SQL.  
- ❌ No hay reglas de negocio.  
- ❌ No hay `try/catch`.  
- ❌ No se lee el `usuarioId` del body — sale de `session`.

El handler hace cuatro cosas: **leer, validar, delegar, responder.**

### 3.4 Paso ③ — El schema valida la forma {#3.4-paso-③-—-el-schema-valida-la-forma}

**Lo que el schema SÍ valida:** que los campos estén, que sean del tipo correcto, que respeten largos y formatos.

**Lo que el schema NO valida:** que el CUIT no esté repetido. Eso necesita **consultar la base**, y un schema valida forma, no reglas. Va en el service.

> **Regla práctica para saber dónde va una validación:** si para responder hay que mirar la base de datos, es del service. Si alcanza con mirar el dato que llegó, es del schema.

export const crearProveedorSchema \= z.object({  
  razonSocial: z.string().trim().min(1, "La razón social es obligatoria.").max(150, "..."),  
  cuit: z.string().trim().regex(/^\\d{2}-?\\d{8}-?\\d$/, "El CUIT debe tener el formato XX-XXXXXXXX-X."),  
  direccion: z.string().trim().max(255).optional(),  
  // ...  
  formaPagoIds: z.array(z.number().int().positive()).min(1, "Elegí al menos una forma de pago.").default(\[\]),  
});  
**El tipo sale gratis:**

export type CrearProveedorInput \= z.infer\<typeof crearProveedorSchema\>;  
No se declara a mano. Se deriva del schema, así nunca se desincronizan.

### 3.5 Paso ④ — El service decide {#3.5-paso-④-—-el-service-decide}

Cinco cosas, en orden:

1. **Abre la transacción.** Se insertan dos tablas (`proveedor` y `proveedor_forma_pago`): o las dos o ninguna.  
2. **Fija el usuario de auditoría.** Primera línea, siempre.  
3. **Valida la regla de negocio.** El mensaje nombra al proveedor que ya tiene ese CUIT — mucho más útil que "CUIT duplicado" a secas. Y señala el campo `"cuit"`, que el front usa para pintar ese input.  
4. **Escribe**, pasando el `client` de la transacción.  
5. **Mapea** al shape del front.

export async function crear(input: ProveedorInput, usuarioId: number): Promise\<Proveedor\> {  
  return withTransaction(async (client) \=\> {  
    await withAuditUser(client, usuarioId);

    const duplicado \= await repo.findActivoByCuit(input.cuit);  
    if (duplicado) {  
      throw new ConflictError(  
        "CUIT\_DUPLICADO",  
        \`Ya existe un proveedor activo con el CUIT ${input.cuit}: ${duplicado.razon\_social}.\`,  
        "cuit",  
      );  
    }

    const row \= await repo.insert(input, client);  
    await repo.reemplazarFormasPago(row.id, input.formaPagoIds, client);

    return mapper.toApi(row, await nombresFormasPago(row.id, client));  
  });  
}

**Fijate que en este archivo no aparece `Request`, `Response` ni un status code.** Por eso se puede testear llamando a `crear({...}, 1)` directamente, sin levantar el servidor.

**El error se lanza, no se devuelve.** `throw new ConflictError(...)` sube por toda la pila hasta el `catch` de `withRoute`, que lo convierte en un 409\. El service no necesita saber que 409 existe.

### 3.6 Paso ⑤ — El repo ejecuta el SQL {#3.6-paso-⑤-—-el-repo-ejecuta-el-sql}

Tres cosas para notar:

- **`client.query`, no `query`.** Recibe el `client` de la transacción como último parámetro. Así esta escritura entra en la misma transacción que las demás.  
- **`RETURNING`**, para no tener que hacer un `SELECT` después.  
- **`?? null`.** El driver `pg` no traduce `undefined`; hay que mandar `null` explícito.

export async function insert(data: ProveedorInput, client: PoolClient): Promise\<ProveedorRow\> {  
  const { rows } \= await client.query\<ProveedorRow\>(  
    \`INSERT INTO proveedor  
       (razon\_social, cuit, direccion, telefono, email, contacto, plazo\_entrega\_dias)  
     VALUES ($1, $2, $3, $4, $5, $6, $7)  
     RETURNING ${COLUMNAS}\`,  
    \[data.razonSocial, data.cuit, data.direccion ?? null, /\* ... \*/\],  
  );  
  return rows\[0\];  
}

### 3.7 Paso ⑥ — Postgres {#3.7-paso-⑥-—-postgres}

La base no es un depósito pasivo. En este proyecto también:

- **Rechaza duplicados** con índices `UNIQUE` (que es lo que hace correcto el chequeo del service bajo concurrencia).  
- **Rechaza datos imposibles** con `CHECK` (stock negativo, umbral crítico mayor que el mínimo).  
- **Escribe la auditoría** con triggers.  
- **Genera los números de documento** (`cod_ord`, `numero` de movimiento) con secuencias y triggers.  
- **Mueve el stock** cuando se inserta un detalle de movimiento.

Si algo de eso falla, el error sube como un SQLSTATE y `traducirErrorPostgres()` lo convierte en un error de dominio con mensaje en castellano.

### 3.8 Paso ⑦ — El mapper traduce de vuelta {#3.8-paso-⑦-—-el-mapper-traduce-de-vuelta}

export function toApi(row: ProveedorRow, formasPago: string\[\]): Proveedor {  
  return {  
    id: row.id,  
    razon\_social: row.razon\_social,  
    cuit: row.cuit,  
    direccion: row.direccion ?? "",       // null → "" (el front espera string)  
    telefono: row.telefono ?? "",  
    email: row.email ?? "",  
    contacto: row.contacto ?? "",  
    formasPago,  
    plazo\_entrega\_dias: row.plazo\_entrega\_dias ?? 0,  
    estado: row.estado,  
  };  
}  
**Tres traducciones que no son opcionales:**

1. **Nombres.** Cada módulo copia el estilo que ya usa su pantalla. Proveedores habla snake\_case (`razon_social`), Artículos habla camelCase (`categoriaId`). No es parejo en todo el proyecto y está bien: el mapper existe justamente para absorber esa diferencia.  
2. **`null` → valor por defecto.** El front declara `direccion: string`, no `string | null`. Si le llega `null`, cualquier `.trim()` explota.  
3. **Decimales.** El driver `pg` devuelve los `decimal` **como string** para no perder precisión. Si eso llega al front sin convertir, `plazoEntregaDias` viene `"5"` en vez de `5` y toda comparación numérica falla **en silencio**.

**El detalle más importante del archivo:**

import type { Proveedor } from "@/data/proveedores";  
El tipo de salida se importa del **front**. Es el contrato compartido. Si el front cambia su interfaz, el mapper deja de compilar — que es exactamente lo que queremos que pase, en vez de enterarnos en producción.

### 3.9 Paso ⑧ — La respuesta {#3.9-paso-⑧-—-la-respuesta}

`created(data)` → 201 con el JSON. O, si algo lanzó en cualquier punto, el `catch` de `withRoute` produce el shape único de error.

### 3.10 El mismo recorrido, en una tabla {#3.10-el-mismo-recorrido,-en-una-tabla}

| Paso | Archivo | Responsabilidad | Si falla |
| :---- | :---- | :---- | :---- |
| ① | `lib/http/handler.ts` | Sesión \+ captura de errores | 401 |
| ② | `app/api/.../route.ts` | Leer, validar, delegar, responder | — |
| ③ | `*.schema.ts` | Forma del input | 422 con el campo |
| ④ | `*.service.ts` | Reglas \+ transacción | 404 / 409 |
| ⑤ | `*.repo.ts` | SQL | (sube el SQLSTATE) |
| ⑥ | Postgres | Constraints y triggers | SQLSTATE → 409 / 422 |
| ⑦ | `*.mapper.ts` | Fila → JSON del front | — |
| ⑧ | `lib/http/responses.ts` | Status \+ JSON | 500 si era un bug |

---

## Parte 4 — Las capas de un módulo, en detalle {#parte-4-—-las-capas-de-un-módulo,-en-detalle}

Un módulo son 5 o 6 archivos en `src/modules/<nombre>/`. Esta tabla es la referencia rápida:

| Archivo | Qué VA | Qué NO va | Importa a |
| :---- | :---- | :---- | :---- |
| `*.types.ts` | Los tipos `*Row` (lo que devuelve Postgres), los filtros, el input | Lógica | — |
| `*.schema.ts` | Schemas de zod | Consultas a la base | `zod` |
| `*.repo.ts` | SQL parametrizado | Validaciones, reglas, `withTransaction` | `db/client`, types |
| `*.service.ts` | Reglas de negocio, transacciones, qué error corresponde | SQL, HTTP | repo, mapper, `db/tx`, `audit`, `errors` |
| `*.mapper.ts` | Fila → JSON del front | Cualquier otra cosa | types, el tipo del front |
| `route.ts` | Leer params, validar, delegar, responder | SQL, reglas, `try/catch` | schema, service, `lib/http/*` |

### 4.1 `*.types.ts` — los dos mundos {#4.1-*.types.ts-—-los-dos-mundos}

/\*\* Fila cruda de la tabla \`proveedor\`. \*/  
export type ProveedorRow \= {  
  id: number;  
  razon\_social: string;          // snake\_case: así viene de Postgres  
  direccion: string | null;      // nullable: así es la columna  
  estado: "activo" | "inactivo"; // minúscula: así es el enum  
};

/\*\* Filtros del listado. Salen del componente de filtros del front. \*/  
export type FiltrosProveedor \= {  
  busqueda?: string;  
  estado?: "activo" | "inactivo";  
  formaPagoId?: number;  
};

/\*\* Datos para insertar o actualizar (ya validados por el schema). \*/  
export type ProveedorInput \= {  
  razonSocial: string;           // camelCase: así lo valida el schema  
  // ...  
};  
**El tipo de salida NO se declara acá.** Lo define el front en `src/data/`, y el mapper lo produce. Si se redefiniera en los dos lados, se desincronizarían.

### 4.2 `*.repo.ts` — el SQL y nada más {#4.2-*.repo.ts-—-el-sql-y-nada-más}

#### La constante `COLUMNAS` {#la-constante-columnas}

const COLUMNAS \= \`  
  id, razon\_social, cuit, direccion, telefono, email, contacto,  
  plazo\_entrega\_dias, estado, calificacion  
\`;  
**Nunca `SELECT *`.** Si mañana alguien agrega una columna a la tabla, no debería aparecer sola en la respuesta de la API. Ya pasó con `calificacion`: existe en la tabla, pero es de otra historia de usuario y **no se expone**.

#### Lecturas vs escrituras {#lecturas-vs-escrituras}

// LECTURA: usa el pool directo, no necesita aislamiento  
export async function findById(id: number): Promise\<ProveedorRow | null\> {  
  const filas \= await query\<ProveedorRow\>(\`SELECT ${COLUMNAS} FROM proveedor p WHERE p.id \= $1\`, \[id\]);  
  return filas\[0\] ?? null;  
}

// ESCRITURA: recibe el client para entrar en la transacción del service  
export async function insert(data: ProveedorInput, client: PoolClient): Promise\<ProveedorRow\> {  
  const { rows } \= await client.query\<ProveedorRow\>(\`INSERT ...\`, \[...\]);  
  return rows\[0\];  
}  
**La convención:** el `client` va **último** en la lista de parámetros.

Cuando una función tiene que servir para las dos cosas, se usa un parámetro `ejecutor` con default:

type Ejecutor \= Pool | PoolClient;

export async function findAll(f: Filtros \= {}, ejecutor: Ejecutor \= pool) { /\* ... \*/ }  
Eso permite leer desde adentro de la transacción (donde las filas recién insertadas **todavía no existen para el pool**, porque falta el `COMMIT`).

### 4.3 `*.service.ts` — las reglas {#4.3-*.service.ts-—-las-reglas}

Un service bien escrito se lee como la lista de criterios de aceptación. Y tiene una propiedad que conviene aprovechar: **las funciones puras se pueden testear solas**.

export function calcularTotales(lineas: LineaOrden\[\], descuentoPct: number, gastosEnvio: number) {  
  const subtotal \= round2(lineas.reduce((acc, l) \=\> acc \+ l.cantidad \* l.precioAcordado, 0));  
  const descuentoMonto \= round2((subtotal \* descuentoPct) / 100);  
  const total \= round2(subtotal \- descuentoMonto \+ gastosEnvio);  
  return { subtotal, descuentoMonto, total };  
}

export function puedeTransicionar(estadoActual: string, esFinal: boolean, destino: string): boolean {  
  if (esFinal) return false;  
  return (TRANSICIONES\[estadoActual\] ?? \[\]).includes(destino);  
}  
Estas dos no tocan la base, no reciben un `Request` y no lanzan errores HTTP. Son las funciones más testeables del proyecto: `expect(calcularTotales([...], 10, 500))`.

**Sacá a funciones puras todo lo que no necesite la base.** Es gratis y hace el código verificable.

### 4.4 `*.mapper.ts` — la traducción de salida {#4.4-*.mapper.ts-—-la-traducción-de-salida}

Ya explicado en §3.8. Un agregado: la versión de listado evita el N+1 recibiendo un `Map` ya resuelto.

export function toApiList(rows: ProveedorRow\[\], formasPagoPorProveedor: Map\<number, string\[\]\>) {  
  return rows.map((row) \=\> toApi(row, formasPagoPorProveedor.get(row.id) ?? \[\]));  
}

### 4.5 `route.ts` — el endpoint {#4.5-route.ts-—-el-endpoint}

Cómo se traducen las carpetas a URLs:

| Carpeta | URL |
| :---- | :---- |
| `app/api/proveedores/route.ts` | `/api/proveedores` |
| `app/api/proveedores/[id]/route.ts` | `/api/proveedores/5` |
| `app/api/proveedores/[id]/inactivar/route.ts` | `/api/proveedores/5/inactivar` |

Y el nombre del export es el método HTTP: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`.

---

# Paso 2\. Para escribir código y entenderlo {#paso-2.-para-escribir-código-y-entenderlo}

## Parte 5 — Recetario: un ejemplo por situación {#parte-5-—-recetario:-un-ejemplo-por-situación}

Esta es la parte para tener abierta mientras escribís código. Buscá la situación que se parezca a la tuya y copiá el patrón.

---

### Receta 1 — Catálogo de solo lectura {#receta-1-—-catálogo-de-solo-lectura}

**Cuándo:** una tabla chica, sin reglas, que solo alimenta un `<select>` del front. Formas de pago, tipos de comprobante, sucursales.

**Patrón:** la query puede vivir **en el handler**. No hace falta módulo.

// app/api/formas-pago/route.ts  
import { withRoute } from "@/lib/http/handler";  
import { ok } from "@/lib/http/responses";  
import { query } from "@/lib/db/client";

export const GET \= withRoute(async () \=\> {  
  const filas \= await query\<{ id: number; nombre: string }\>(  
    "SELECT id, nombre FROM forma\_pago ORDER BY nombre",  
  );  
  return ok(filas);  
});  
**Por qué está bien romper la regla acá:** son 4 filas y no hay ninguna regla. Crear `repo + service + mapper + types` para esto sería ceremonia sin beneficio.

**Cuándo dejar de romperla:** el día que aparezca la primera regla. No antes, pero tampoco después.

> **Variante útil:** el mismo catálogo puede exponerse con **dos nombres** si dos pantallas le hacen preguntas distintas. En este proyecto, `forma_pago` se expone como `/api/formas-pago` (para el proveedor: "qué formas acepta", N:M) y como `/api/condiciones-pago` (para la orden: "qué condición se pactó", una sola). Dos preguntas distintas sobre la misma tabla. Así cada pantalla llama al endpoint que entiende.

---

### Receta 2 — Listado con filtros {#receta-2-—-listado-con-filtros}

**Cuándo:** la pantalla principal de cualquier módulo.

#### El handler: leer y normalizar {#el-handler:-leer-y-normalizar}

export const GET \= withRoute(async ({ req }) \=\> {  
  const sp \= new URL(req.url).searchParams;

  return ok(  
    await service.listar({  
      busqueda: leerTexto(sp, "busqueda"),  
      estado: leerEstado(sp),  
      formaPagoId: leerEntero(sp, "formaPagoId"),  
    }),  
  );  
});

#### El repo: armar el WHERE dinámico {#el-repo:-armar-el-where-dinámico}

**Este es el patrón más importante de todo el manual.**

export async function findAll(f: FiltrosProveedor \= {}): Promise\<ProveedorRow\[\]\> {  
  const condiciones: string\[\] \= \[\];  
  const params: unknown\[\] \= \[\];

  if (f.busqueda) {  
    params.push(\`%${f.busqueda}%\`);  
    condiciones.push(\`(p.razon\_social ILIKE $${params.length} OR p.cuit ILIKE $${params.length})\`);  
  }

  if (f.estado) {  
    params.push(f.estado);  
    condiciones.push(\`p.estado \= $${params.length}\`);  
  }

  if (f.formaPagoId) {  
    params.push(f.formaPagoId);  
    condiciones.push(\`EXISTS (  
      SELECT 1 FROM proveedor\_forma\_pago pfp  
      WHERE pfp.proveedor\_id \= p.id AND pfp.forma\_pago\_id \= $${params.length}  
    )\`);  
  }

  const where \= condiciones.length ? \`WHERE ${condiciones.join(" AND ")}\` : "";

  return query\<ProveedorRow\>(  
    \`SELECT ${COLUMNAS} FROM proveedor p ${where} ORDER BY p.razon\_social\`,  
    params,  
  );  
}

#### Por qué esto es seguro {#por-qué-esto-es-seguro}

Lo que varía es **la estructura** (qué condiciones hay). El valor que escribió el usuario **siempre** viaja en el array `params` y se referencia por posición.

// ✅ BIEN — el valor va aparte  
params.push(\`%${f.busqueda}%\`);  
condiciones.push(\`p.razon\_social ILIKE $${params.length}\`);

// ❌ MAL — inyección SQL  
condiciones.push(\`p.razon\_social ILIKE '%${f.busqueda}%'\`);  
Con la versión mala, alguien escribe `' OR 1=1 --` en el buscador y se lleva la tabla entera. Con la buena, Postgres recibe el texto como **dato**, nunca como instrucción, y buscaría literalmente un proveedor llamado `' OR 1=1 --`.

**El truco del `$${params.length}`:** después de cada `push`, `params.length` es la posición del valor recién agregado. Así la numeración de placeholders sale sola, sin llevar un contador a mano.

#### Filtros que se ignoran {#filtros-que-se-ignoran}

El front suele mandar `"Todas"` o `"Todos"` como valor de "sin filtrar". Si se deja pasar, el `WHERE` busca un estado llamado "Todas" y la lista sale vacía:

const estado \= leerTexto(sp, "estado");  
// ...  
estado: estado \=== "Todas" ? undefined : estado,  
O, mejor, validando contra la lista real de valores:

const TIPOS: TipoMovimiento\[\] \= \["Ingreso", "Egreso", "Transferencia", "Ajuste"\];

/\*\* Un \`?tipo=\` que no sea de la lista se ignora, en vez de llegar al SQL. \*/  
function leerTipo(sp: URLSearchParams): TipoMovimiento | undefined {  
  const v \= leerTexto(sp, "tipo");  
  return TIPOS.find((t) \=\> t \=== v);  
}

#### Filtros de fecha: el error del día perdido {#filtros-de-fecha:-el-error-del-día-perdido}

if (f.fechaHasta) {  
  params.push(f.fechaHasta);  
  condiciones.push(\`c.fecha\_hora \< ($${params.length}::date \+ interval '1 day')\`);  
}  
**Por qué `< fecha + 1 día` y no `<= fecha`:** la columna es `timestamp`. Un `<= '2026-09-08'` se compara contra las **00:00** de ese día, así que deja afuera todo lo que pasó ese mismo día. El usuario filtra "hasta el 8" y no ve nada del 8\.

---

### Receta 3 — Listado paginado {#receta-3-—-listado-paginado}

**Cuándo:** el listado puede crecer a miles de filas. Recepciones, cuentas corrientes, movimientos.

**Lo que cambia respecto de la Receta 2:** la respuesta es un **objeto**, no un array pelado.

{ items: \[...\], total: 237, pagina: 1, porPagina: 50 }  
Sin `total`, el front no puede dibujar el paginador.

#### El patrón: compartir el FROM y el WHERE {#el-patrón:-compartir-el-from-y-el-where}

const FROM\_RECEPCION \= \`  
  FROM movimiento\_stock\_cab c  
  JOIN orden\_compra   oc ON oc.id \= c.origen\_entidad\_id  
  JOIN proveedor       p ON p.id  \= oc.proveedor\_id  
  ...  
\`;

function construirWhere(f: FiltrosRecepcion): { where: string; params: unknown\[\] } {  
  const condiciones: string\[\] \= \[\`c.origen\_id \= ${ORIGEN\_RECEPCION}\`\];  
  const params: unknown\[\] \= \[\];  
  // ... los if de siempre  
  return { where: \`WHERE ${condiciones.join(" AND ")}\`, params };  
}

export async function findAll(f: FiltrosRecepcion \= {}, ejecutor: Ejecutor \= pool) {  
  const { where, params } \= construirWhere(f);

  const pagina \= f.pagina ?? 1;  
  const porPagina \= f.porPagina ?? 50;  
  params.push(porPagina, (pagina \- 1\) \* porPagina);

  const { rows } \= await ejecutor.query\<RecepcionRow\>(  
    \`${SELECT\_RECEPCION} ${where}  
     ORDER BY c.fecha\_hora DESC, c.id DESC  
     LIMIT $${params.length \- 1} OFFSET $${params.length}\`,  
    params,  
  );  
  return rows;  
}

export async function contar(f: FiltrosRecepcion \= {}, ejecutor: Ejecutor \= pool) {  
  const { where, params } \= construirWhere(f);   // ← el MISMO where  
  // SELECT count(\*) ${FROM\_RECEPCION} ${where}  
}  
**Por qué el `FROM` y el `WHERE` se definen una sola vez:** si el listado y el contador filtraran distinto, el paginador mostraría "23 resultados" sobre una lista de 18 y **nadie entendería por qué**. Es el tipo de bug que se descubre tarde y cuesta horas.

**El `ORDER BY` lleva desempate.** `ORDER BY fecha_hora DESC` a secas, con dos filas de la misma fecha, puede devolverlas en orden distinto en cada consulta — y entonces una fila aparece en la página 1 y en la página 2, mientras otra no aparece nunca. Agregar `, c.id DESC` lo arregla.

---

### Receta 4 — Detalle por id {#receta-4-—-detalle-por-id}

// route.ts  
type Params \= { id: string };

export const GET \= withRoute\<Params\>(async ({ params }) \=\> {  
  const { id } \= await params;              // Next 16: params es Promise  
  return ok(await service.obtener(parseId(id)));  
});  
// service.ts  
export async function obtener(id: number): Promise\<Proveedor\> {  
  const row \= await repo.findById(id);  
  if (\!row) throw new NotFoundError("el proveedor", id);

  const formasPago \= await repo.formasPagoDe(\[id\]);  
  return mapper.toApi(row, formasPago.get(id) ?? \[\]);  
}  
**El `if (!row) throw`** es obligatorio. Sin él, el mapper recibe `undefined` y explota con un 500 en vez del 404 que corresponde.

---

### Receta 5 — Alta simple {#receta-5-—-alta-simple}

Ya vista en la Parte 3\. El esqueleto:

export async function crear(input: XInput, usuarioId: number): Promise\<X\> {  
  return withTransaction(async (client) \=\> {  
    await withAuditUser(client, usuarioId);       // 1\. auditoría

    const duplicado \= await repo.findActivoByCuit(input.cuit);   // 2\. reglas  
    if (duplicado) throw new ConflictError("CUIT\_DUPLICADO", "...", "cuit");

    const row \= await repo.insert(input, client); // 3\. escribir

    return mapper.toApi(row);                     // 4\. mapear  
  });  
}  
**¿Y si solo escribe una tabla? ¿Igual va la transacción?**

Sí, por dos motivos: necesitás el `client` para `withAuditUser`, y el día que agregues una segunda escritura no tenés que acordarte de envolverla.

---

### Receta 6 — Alta con relación N:M {#receta-6-—-alta-con-relación-n:m}

**Cuándo:** un proveedor tiene varias formas de pago. Un artículo tiene varias etiquetas.

**El modelo:** una tabla intermedia (`proveedor_forma_pago`) con las dos FKs.

const row \= await repo.insert(input, client);  
await repo.reemplazarFormasPago(row.id, input.formaPagoIds, client);  
**`reemplazar` y no `agregar`.** Al editar, el front manda la lista completa de lo que tiene que quedar. Es `DELETE` de todo lo viejo \+ `INSERT` de lo nuevo, dentro de la misma transacción. Calcular el diff (qué agregar, qué sacar) es más código y más casos borde para el mismo resultado.

**En el repo, con `unnest` para insertar N filas en una sola sentencia:**

export async function reemplazarFormasPago(  
  proveedorId: number,  
  formaPagoIds: number\[\],  
  client: PoolClient,  
): Promise\<void\> {  
  await client.query("DELETE FROM proveedor\_forma\_pago WHERE proveedor\_id \= $1", \[proveedorId\]);

  if (formaPagoIds.length \=== 0\) return;

  await client.query(  
    \`INSERT INTO proveedor\_forma\_pago (proveedor\_id, forma\_pago\_id)  
     SELECT $1, unnest($2::int\[\])\`,  
    \[proveedorId, formaPagoIds\],  
  );  
}  
`unnest($2::int[])` convierte el array en filas, así que el array entero viaja como **un solo parámetro** y no hace falta generar `($1,$2),($1,$3),($1,$4)...` a mano según cuántos ids vinieron. Es el equivalente del `= ANY(...)` de la Receta 15, pero para escribir.

El `if (formaPagoIds.length === 0) return;` no es opcional: sin él, `unnest` de un array vacío no inserta nada pero igual se paga el viaje a la base.

**En el schema:**

formaPagoIds: z  
  .array(z.number().int().positive())  
  .min(1, "Elegí al menos una forma de pago.")  
  .default(\[\]),  
**Para leer varios sin N+1:** ver Receta 15\.

---

### Receta 7 — Alta maestro-detalle (cabecera \+ líneas) {#receta-7-—-alta-maestro-detalle-(cabecera-+-líneas)}

**Cuándo:** una orden de compra con sus líneas. Una factura con sus ítems. Un movimiento de stock con sus artículos.

export async function crearEnTransaccion(  
  client: PoolClient,  
  input: CrearOrdenInput,  
  usuarioId: number,  
  cotizacionId: number | null,  
): Promise\<OrdenCompraApi\> {  
  const lineas \= normalizarLineas(input);

  // 1\. Validar TODO antes de escribir NADA  
  await validarProveedorActivo(input.proveedorId, client);  
  await validarArticulosActivos(lineas, client);  
  const formaPagoId \= await validarFormaPago(input.formaPagoId, client);  
  const depositoId \= await resolverDeposito(input.depositoEntregaId, client);

  // 2\. Calcular en el SERVER  
  const { subtotal, total } \= calcularTotales(lineas, input.descuento, input.gastosEnvio);

  // 3\. Resolver el estado inicial contra el catálogo  
  const pendiente \= await repo.findEstadoByNombre("pendiente", client);  
  if (\!pendiente) {  
    throw new Error("El catálogo estado\_orden\_compra no tiene 'Pendiente'. Correr db/seeds/01\_catalogos.sql.");  
  }

  // 4\. Cabecera  
  const ordenId \= await repo.insertCabecera({ /\* ... \*/ subtotal, total }, client);

  // 5\. Detalle  
  await repo.insertDetalles(ordenId, lineas, client);

  // 6\. Releer completo, DENTRO de la transacción  
  return leerEnTransaccion(ordenId, client);  
}  
**Los cinco puntos que hacen esto correcto:**

1. **Validar todo antes de escribir nada.** Si el artículo 3 de 5 está inactivo, mejor enterarse antes de haber insertado la cabecera. Igual la transacción haría `ROLLBACK`, pero el consumo de ids de secuencia no se deshace.  
2. **`insertDetalles` recibe el array completo**, no se llama en un loop.  
3. **El total se recalcula.** El que mandó el front se descarta, no se compara.  
4. **El error del catálogo vacío es un `Error` común, no un `AppError`.** No es culpa del usuario: falta correr el seed. Sale como 500 genérico y el detalle va al log, que es donde lo va a ver quien puede arreglarlo.  
5. **`leerEnTransaccion(ordenId, client)`**, con el client. Desde el pool, esas filas **todavía no existen** (falta el `COMMIT`) y la respuesta saldría vacía. Este error es sutil y confunde muchísimo: el POST devuelve 201 con datos incompletos, y si después recargás la página los datos están.

#### El bonus: reusar el alta desde otra operación {#el-bonus:-reusar-el-alta-desde-otra-operación}

Notá la firma: `crearEnTransaccion(client, input, usuarioId, cotizacionId)`. La función pública es un wrapper fino:

export async function crear(input: CrearOrdenInput, usuarioId: number) {  
  return withTransaction(async (client) \=\> {  
    await withAuditUser(client, usuarioId);  
    return crearEnTransaccion(client, input, usuarioId, null);  
  });  
}  
**Por qué partirla así:** adjudicar una solicitud de cotización crea **varias** órdenes (una por proveedor ganador), y todas tienen que nacer con las mismas validaciones —proveedor activo, artículos activos, totales recalculados— dentro de la misma transacción que marca la solicitud como adjudicada.

Sin esta separación, esas reglas estarían escritas dos veces y se irían separando con el tiempo.

**La convención:** `crear()` abre la transacción y llama a `withAuditUser`. `crearEnTransaccion()` asume que el llamador ya hizo las dos cosas.

---

### Receta 8 — Edición {#receta-8-—-edición}

Igual que el alta, más dos chequeos:

export async function editar(id: number, input: ProveedorInput, usuarioId: number) {  
  return withTransaction(async (client) \=\> {  
    await withAuditUser(client, usuarioId);

    // 1\. ¿Existe?  
    const actual \= await repo.findById(id);  
    if (\!actual) throw new NotFoundError("el proveedor", id);

    // 2\. ¿Se puede editar en su estado actual?  
    if (actual.estado \=== "inactivo") {  
      throw new BusinessRuleError(  
        "PROVEEDOR\_INACTIVO",  
        "No se puede editar un proveedor inactivo. Reactivalo primero.",  
      );  
    }

    // 3\. Duplicados, EXCLUYÉNDOSE a sí mismo  
    const duplicado \= await repo.findActivoByCuit(input.cuit, id);  
    if (duplicado) throw new ConflictError("CUIT\_DUPLICADO", "...", "cuit");

    const row \= await repo.update(id, input, client);  
    if (\!row) throw new NotFoundError("el proveedor", id);

    await repo.reemplazarFormasPago(id, input.formaPagoIds, client);  
    return mapper.toApi(row, await nombresFormasPago(id, client));  
  });  
}  
**El `excluirId` es el detalle que se olvida siempre.** Sin él, guardar un proveedor sin cambiarle el CUIT da "CUIT duplicado": **choca consigo mismo**.

En el repo se resuelve así:

WHERE p.cuit \= $1  
  AND p.estado \= 'activo'  
  AND ($2::int IS NULL OR p.id \<\> $2)  
El `($2::int IS NULL OR ...)` evita tener dos versiones de la misma query. El `::int` es necesario porque Postgres no puede inferir el tipo de un parámetro que solo aparece en una comparación con NULL.

**Sobre validar aunque el front ya valide:** el brief dice que el ícono de editar no aparece para proveedores inactivos. Eso es la UI. La validación va igual, porque el front puede tener un bug y **la API responde a cualquiera que sepa la URL**.

---

### Receta 9 — Baja lógica {#receta-9-—-baja-lógica}

**Regla del proyecto: no se borra nada.** El registro cambia de estado y conserva su historial.

**Endpoint propio, no un PATCH genérico:**

// app/api/proveedores/\[id\]/inactivar/route.ts  
export const PATCH \= withRoute\<Params\>(async ({ params, session }) \=\> {  
  const { id } \= await params;  
  return ok(await service.inactivar(parseId(id), session.usuarioId));  
});  
Y en `[id]/route.ts`, este comentario:

// No hay DELETE a propósito: la baja es LÓGICA y va por  
// PATCH /api/proveedores/:id/inactivar (criterio HU-PROV-01).  
**Por qué endpoint propio y no `PUT /:id` con `{ estado: "inactivo" }`:**

1. **La baja tiene reglas que la edición no tiene** (no se puede dar de baja un proveedor con órdenes abiertas). Con un PATCH genérico habría que **adivinar la intención** mirando qué campos vinieron.  
2. **Queda explícito en el log de acceso** qué operación se hizo.

**PATCH y no DELETE:** el registro no se borra, cambia de estado.

**La validación típica:**

const abiertas \= await repo.contarOrdenesAbiertas(id);  
if (abiertas \> 0\) {  
  throw new BusinessRuleError(  
    "PROVEEDOR\_CON\_ORDENES",  
    \`No se puede dar de baja: tiene ${abiertas} orden(es) de compra abierta(s).\`,  
  );  
}  
En el repo, "abierta" se define contra el catálogo, no contra una lista en el código:

SELECT count(\*)::text AS total  
FROM orden\_compra oc  
JOIN estado\_orden\_compra e ON e.id \= oc.estado\_id  
WHERE oc.proveedor\_id \= $1 AND e.es\_final \= false  
**El `::text` en el `count(*)`:** Postgres devuelve `count` como `bigint`, y el driver `pg` convierte los `bigint` a string para no perder precisión. Pedirlo como texto y convertir con `Number()` deja explícito lo que pasa.

---

### Receta 10 — Cambio de estado (máquina de estados) {#receta-10-—-cambio-de-estado-(máquina-de-estados)}

**Cuándo:** una orden de compra pasa de Pendiente a Enviada a Recibida. Un comprobante se anula.

#### 1\. Los estados viven en la base; las transiciones, en el código {#1.-los-estados-viven-en-la-base;-las-transiciones,-en-el-código}

const TRANSICIONES: Record\<string, string\[\]\> \= {  
  pendiente:        \["enviada", "cancelada"\],  
  enviada:          \["recibida\_parcial", "recibida\_total", "cancelada"\],  
  recibida\_parcial: \["recibida\_total", "cancelada"\],  
};

export function puedeTransicionar(estadoActual: string, esFinal: boolean, destino: string): boolean {  
  if (esFinal) return false;  
  return (TRANSICIONES\[estadoActual\] ?? \[\]).includes(destino);  
}  
**La columna `es_final` de la tabla corta cualquier transición desde un estado terminal.** Así, agregar un estado final nuevo al catálogo **no obliga a tocar este código**.

#### 2\. Una función privada para todos los cambios {#2.-una-función-privada-para-todos-los-cambios}

async function cambiarEstado(id: number, destino: string, usuarioId: number) {  
  return withTransaction(async (client) \=\> {  
    await withAuditUser(client, usuarioId);

    const actual \= await repo.findById(id, client);  
    if (\!actual) throw new NotFoundError("la orden de compra", id);

    // Idempotente: pedir el estado que ya tiene no es un error.  
    if (actual.estado\_nombre \=== destino) return leerEnTransaccion(id, client);

    if (\!puedeTransicionar(actual.estado\_nombre, actual.es\_final, destino)) {  
      throw new BusinessRuleError(  
        "TRANSICION\_INVALIDA",  
        \`No se puede pasar una orden ${actual.estado\_nombre} a ${destino}.\`,  
      );  
    }  
    // ... update  
  });  
}

export async function enviar(id: number, usuarioId: number)   { return cambiarEstado(id, "enviada", usuarioId); }  
export async function cancelar(id: number, usuarioId: number) { return cambiarEstado(id, "cancelada", usuarioId); }  
**La idempotencia importa.** Si el usuario hace doble click en "Enviar", el segundo request no tiene por qué fallar: el resultado que pidió ya está.

#### 3\. Un endpoint por acción {#3.-un-endpoint-por-acción}

PATCH /api/ordenes-compra/5/enviar  
PATCH /api/ordenes-compra/5/cancelar  
PATCH /api/ordenes-compra/5/pendiente-recepcion  
Mismo razonamiento que la baja lógica: cada transición tiene sus reglas, y queda explícito en el log qué se hizo.

**La bitácora la escribe el trigger**, que guarda la fila anterior y la nueva.

---

### Receta 11 — Operación concurrente con locks {#receta-11-—-operación-concurrente-con-locks}

**Cuándo:** dos personas pueden tocar la misma fila al mismo tiempo y el resultado depende del valor actual. El caso clásico: descontar stock.

#### El problema {#el-problema}

Hay 10 unidades. Dos egresos de 6 llegan al mismo tiempo.

Transacción A            Transacción B  
─────────────            ─────────────  
lee stock \= 10  
                         lee stock \= 10  
¿10 \>= 6? sí  
                         ¿10 \>= 6? sí  
escribe 10 \- 6 \= 4  
                         escribe 10 \- 6 \= 4

Resultado: stock \= 4\. Se entregaron 12 unidades de 10\.  
Los dos leyeron antes de que el otro escribiera. **Ninguna validación en JavaScript puede evitar esto**, porque el problema está entre la lectura y la escritura.

#### La solución: `SELECT ... FOR UPDATE` {#la-solución:-select-...-for-update}

export async function lockFicha(id: number, client: PoolClient): Promise\<FichaStockRow\> {  
  const { rows } \= await client.query\<FichaStockRow\>(  
    \`SELECT fs.id, fs.articulo\_id, fs.deposito\_id, fs.stock\_actual, ...  
     FROM ficha\_stock fs  
     JOIN articulo a ON a.id \= fs.articulo\_id  
     JOIN deposito d ON d.id \= fs.deposito\_id  
     WHERE fs.id \= $1  
     FOR UPDATE OF fs\`,  
    \[id\],  
  );  
  return rows\[0\];  
}  
`FOR UPDATE` bloquea esa fila hasta el `COMMIT`. La transacción B **espera** en su `SELECT` hasta que A termine, y cuando arranca lee 4, no 10\.

`FOR UPDATE OF fs` bloquea solo `ficha_stock`, no las tablas del JOIN. Sin el `OF`, también bloquearías `articulo` y `deposito`, que no hace falta y genera esperas innecesarias.

#### El detalle que evita un cuelgue: ordenar los ids {#el-detalle-que-evita-un-cuelgue:-ordenar-los-ids}

const idsFichas \= \[  
  ...fichasOrigen.map((f) \=\> f.ficha.id),  
  ...fichasDestino.map((f) \=\> f.id),  
\].sort((a, b) \=\> a \- b);          // ← ORDENADOS

for (const id of idsFichas) {  
  await repo.lockFicha(id, client);  
}  
**Por qué el orden importa:**

Transacción A: bloquea ficha 7, después quiere la 3  
Transacción B: bloquea ficha 3, después quiere la 7

A espera a B. B espera a A. Para siempre. → DEADLOCK  
Bloqueando **siempre en el mismo orden** (por id ascendente), la segunda transacción espera a la primera en el primer lock y después avanza sin problema.

### Y después: releer para las alertas {#y-después:-releer-para-las-alertas}

// Se releen las fichas DESPUÉS de insertar: para ese momento el trigger ya movió  
// el stock, así que el saldo es el real. Calcularlo en JS desde el snapshot previo  
// podía mentir.  
for (const id of idsFichas) {  
  const ficha \= await repo.findFichaById(id, client);  
  if (\!ficha) continue;  
  const alerta \= evaluarAlerta(ficha);  
  if (alerta) alertas.push(alerta);  
}  
---

### Receta 12 — Reglas en la base (triggers) {#receta-12-—-reglas-en-la-base-(triggers)}

**Cuándo:** la regla tiene que valer **siempre**, incluso si alguien escribe en la base desde el editor de Supabase o desde un script.

#### Qué va en la base y qué va en el service {#qué-va-en-la-base-y-qué-va-en-el-service}

| Va en la BASE (trigger / constraint) | Va en el SERVICE |
| :---- | :---- |
| Stock no puede quedar negativo | "No se puede editar una orden que ya fue enviada" |
| Un movimiento no se edita ni se borra | "El CUIT no puede repetirse entre activos" (mensaje lindo) |
| La suma imputada no puede exceder el pago | "No se puede dar de baja con órdenes abiertas" |
| El CUIT no se repite (índice `UNIQUE`) | Qué error HTTP corresponde |
| Numeración de documentos (`cod_ord`) | Cálculo de totales |
| La fila de auditoría | Orquestar la transacción |

**El criterio:** si la regla **no puede fallar nunca** o necesita ser atómica, va en la base. Si es una regla de proceso que puede cambiar con el negocio, va en el service.

#### Cómo hacer que el error del trigger llegue bien al usuario {#cómo-hacer-que-el-error-del-trigger-llegue-bien-al-usuario}

**En el trigger**, usá un SQLSTATE propio:

RAISE EXCEPTION 'stock insuficiente en la ficha %', v\_ficha\_id  
  USING ERRCODE \= 'HF001';  
**En `traducirErrorPostgres()`**, mapealo:

if (codigo \=== "HF001") {  
  return new BusinessRuleError(  
    "STOCK\_INSUFICIENTE",  
    "No hay stock suficiente para registrar este egreso.",  
  );  
}  
**Sin esto, un egreso sin stock devuelve un 500 genérico.** El service de movimientos ya no valida el stock —lo hace el trigger, que es quien puede hacerlo de forma atómica—, así que este mapeo es **lo único** que convierte esa regla en un 409 con mensaje útil.

#### Los códigos propios de este proyecto {#los-códigos-propios-de-este-proyecto}

| Código | Regla |
| :---- | :---- |
| `HF001` | Stock insuficiente |
| `HF002` | La ficha de stock no existe |
| `HF003` | Los movimientos no se editan ni se borran |
| `HF010` | La imputación excede el monto del pago |
| `HF011` | El comprobante ya está cancelado |
| `HF012` | El comprobante es de otro proveedor |
| `HF013` | A una Nota de Crédito no se le imputan pagos |
| `HF014` | El comprobante está anulado |

**Por qué existen:** los cuatro triggers de imputación levantaban `P0001` pelado, y el catch-all los convertía a todos en el mismo *"La operación fue rechazada por una regla de la base de datos"*. O sea que imputar $10.000 a una factura con $5.000 de saldo daba esa frase: sin el número, sin el comprobante, y sin decir cuál de las tres imputaciones falló.

**Al agregar un trigger nuevo, agregá su código a la tabla y su rama al mapeo. Es un paso que se olvida y cuesta una tarde de debugging.**

---

### Receta 13 — Cálculos de dinero {#receta-13-—-cálculos-de-dinero}

function round2(n: number): number {  
  return Math.round(n \* 100\) / 100;  
}

export function calcularTotales(lineas: LineaOrden\[\], descuentoPct: number, gastosEnvio: number) {  
  const subtotal \= round2(lineas.reduce((acc, l) \=\> acc \+ l.cantidad \* l.precioAcordado, 0));  
  const descuentoMonto \= round2((subtotal \* descuentoPct) / 100);  
  const total \= round2(subtotal \- descuentoMonto \+ gastosEnvio);  
  return { subtotal, descuentoMonto, total };  
}  
**Tres reglas:**

1. **Redondear en cada paso**, no solo al final. La base guarda `decimal(12,2)`: si el subtotal tiene 4 decimales en memoria y se redondea recién en el total, el número guardado no coincide con la suma de sus partes.  
2. **El total que manda el front se descarta**, no se compara. Si el front tuviera un bug de redondeo, o si alguien llamara la API a mano con un total inventado, la base igual guarda el número correcto.  
3. **`decimal`, nunca `float`**, en la base. `0.1 + 0.2` en punto flotante no da `0.3`, y con plata eso se acumula.

**Al leer:** el driver `pg` devuelve los `decimal` **como string**. El mapper los convierte con `Number()`. Si no, el front recibe `"1234.50"` y toda comparación numérica falla en silencio.

---

### Receta 14 — Consulta de reporte / agregación {#receta-14-—-consulta-de-reporte-/-agregación}

**Cuándo:** un listado que no sale de una tabla sino de sumas, saldos y estados derivados. Cuenta corriente de proveedores.

#### Decisión 1: el estado derivado se calcula en SQL, no en el mapper {#decisión-1:-el-estado-derivado-se-calcula-en-sql,-no-en-el-mapper}

CASE  
  WHEN bool\_or(v.estado\_vencimiento \= 'vencido')    THEN 'vencido'  
  WHEN bool\_or(v.estado\_vencimiento \= 'por\_vencer') THEN 'por\_vencer'  
  WHEN COALESCE(SUM(v.saldo\_pendiente), 0\) \< 0 THEN 'credito'  
  WHEN COALESCE(SUM(v.saldo\_pendiente), 0\) \= 0 THEN 'saldado'  
  ELSE 'pendiente'  
END  
**Por qué en SQL:** porque el listado **se filtra por ese estado**. Si el badge se derivara en JavaScript, el `?estado=Vencido` no podría entrar en el `WHERE` y habría que filtrar la página ya traída — con lo cual el contador devolvería un total que no corresponde a lo que se ve.

#### Decisión 2: `LEFT JOIN` cuando puede no haber filas relacionadas {#decisión-2:-left-join-cuando-puede-no-haber-filas-relacionadas}

FROM proveedor p  
LEFT JOIN vista\_cuenta\_corriente\_proveedor v ON v.proveedor\_id \= p.id  
**Arranca en `proveedor`, no en la vista.** La vista arranca en `comprobante_proveedor`, así que un proveedor **sin comprobantes** no tiene ni una fila. Con un `GROUP BY` sobre la vista, esos proveedores **desaparecen** del listado — justo la fila "Pet Food SA / $0 / Saldado" que el diseño pedía mostrar.

El `LEFT JOIN` los mantiene, con saldo 0 gracias al `COALESCE`.

#### Decisión 3: `FILTER` para agregar solo parte de las filas {#decisión-3:-filter-para-agregar-solo-parte-de-las-filas}

MIN(v.fecha\_vencimiento) FILTER (WHERE v.saldo\_pendiente \> 0\) AS proximo\_vencimiento  
Sin el `FILTER`, el "próximo vencimiento" saldría de una factura ya saldada.

#### Decisión 4: vistas para lo que se consulta muchas veces {#decisión-4:-vistas-para-lo-que-se-consulta-muchas-veces}

Cuando la misma agregación se usa en varios lugares, conviene una **vista** en la base (`vista_cuenta_corriente_proveedor`) en vez de repetir el SQL. El repo consulta la vista como si fuera una tabla.

---

### Receta 15 — Evitar el problema N+1 {#receta-15-—-evitar-el-problema-n+1}

**El problema:** el listado trae 50 proveedores y cada uno necesita sus formas de pago. La versión ingenua:

// ❌ 1 consulta del listado \+ 50 consultas de formas de pago \= 51 viajes a la base  
for (const p of proveedores) {  
  p.formasPago \= await repo.formasPagoDe(p.id);  
}  
Con 50 filas y 5 ms por consulta son 250 ms de puro ida y vuelta.

**La solución:** una sola consulta con todos los ids, devolviendo un `Map`.

export async function formasPagoDe(proveedorIds: number\[\]): Promise\<Map\<number, string\[\]\>\> {  
  const mapa \= new Map\<number, string\[\]\>();  
  if (proveedorIds.length \=== 0\) return mapa;    // ← sin esto, ANY($1) con array vacío

  const filas \= await query\<{ proveedor\_id: number; nombre: string }\>(  
    \`SELECT pfp.proveedor\_id, fp.nombre  
     FROM proveedor\_forma\_pago pfp  
     JOIN forma\_pago fp ON fp.id \= pfp.forma\_pago\_id  
     WHERE pfp.proveedor\_id \= ANY($1::int\[\])  
     ORDER BY fp.nombre\`,  
    \[proveedorIds\],  
  );

  for (const fila of filas) {  
    const actuales \= mapa.get(fila.proveedor\_id) ?? \[\];  
    actuales.push(fila.nombre);  
    mapa.set(fila.proveedor\_id, actuales);  
  }  
  return mapa;  
}  
Y en el service:

export async function listar(filtros: FiltrosProveedor \= {}): Promise\<Proveedor\[\]\> {  
  const rows \= await repo.findAll(filtros);  
  const formasPago \= await repo.formasPagoDe(rows.map((r) \=\> r.id));   // ← 2 consultas en total  
  return mapper.toApiList(rows, formasPago);  
}  
**`= ANY($1::int[])` en vez de `IN (...)`:** con `IN` habría que generar `$1, $2, $3...` dinámicamente según cuántos ids hay. Con `ANY` y un cast a array, el array entero viaja como **un solo parámetro**.

**La señal de alarma:** si ves un `await` adentro de un `for` o de un `.map()` que consulta la base, casi seguro tenés un N+1.

---

### Receta 16 — Endpoint público (login) {#receta-16-—-endpoint-público-(login)}

**Cuándo:** el endpoint no puede exigir sesión.

export const POST \= withPublicRoute(async ({ req }) \=\> {  
  const input \= await parseBody(req, loginSchema);  
  return ok(await service.login(input, ipDelRequest(req)));  
});  
**`ok` y no `created`:** no se creó un recurso.

**La IP se lee en el handler y se pasa como dato.** El service **no recibe el `Request` entero** a propósito: si lo recibiera, tendría una excusa para leer headers y tomar decisiones con ellos — y los headers de IP los puede poner el cliente. Así el service solo ve un dato de contexto para la bitácora.

#### Las decisiones de seguridad del login {#las-decisiones-de-seguridad-del-login}

Este es el endpoint con más decisiones sutiles del proyecto. Vale la pena entender cada una, porque se repiten en cualquier sistema con login.

**1\. Mensaje genérico, siempre.**

export class CredencialesInvalidasError extends AppError {  
  readonly status \= 401;  
  constructor() {  
    super("CREDENCIALES\_INVALIDAS", "Email o contraseña incorrectos.");  
  }  
}  
No dice cuál de los dos falló. Si el sistema contestara "ese email no existe", cualquiera podría averiguar quién trabaja en la empresa probando direcciones, y ya tendría la mitad de la credencial. **Distinguir los dos casos convierte el login en un buscador de usuarios válidos.**

Por eso este error **no lleva `campo`**: marcar el input de la contraseña en rojo diría, de hecho, que el email estaba bien.

**2\. Se llama al servicio de auth aunque sepamos que va a fallar.**

// Se llama a Supabase SIEMPRE, incluso cuando el email no existe en nuestra tabla.  
const resultado \= await verificarCredenciales(input.email, input.password);  
Si para un email inexistente contestáramos al instante y para uno existente tardáramos los \~300 ms de la llamada, **la diferencia de tiempo diría cuáles son los emails reales**. El mensaje genérico se cuidaría en el texto y se filtraría por el reloj.

**3\. Dos transacciones cortas con la llamada de red en el medio.**

1\. Leer al usuario y ver si está bloqueado.   ← transacción corta  
2\. Preguntarle la contraseña a Supabase.      ← HTTP, SIN transacción  
3\. Contar el resultado y escribir bitácora.   ← transacción corta  
Meter todo en una sola sería más simple de leer, pero mantendría abierta una transacción —y el lock de la fila del usuario— durante los hasta 8 segundos que puede tardar el servicio externo. Con dos personas entrando a la vez ya se nota; con el servicio degradado, se cae la aplicación.

**4\. El riesgo de partirlo se resuelve sumando en la base.**

const intentos \= await repo.sumarIntentoFallido(client, usuario.id);  
El UPDATE hace `intentos_fallidos = intentos_fallidos + 1`, no leer-sumar-escribir en JavaScript. Postgres serializa los dos UPDATE sobre la misma fila y ninguno se pierde.

**5\. El intento durante el bloqueo se registra pero NO suma al contador.** Si sumara, insistir estiraría el castigo para siempre y la cuenta **no se desbloquearía nunca**.

**6\. El contador se limpia cuando vence el bloqueo, antes de validar.** Si no, el usuario sale del bloqueo con 3 intentos ya gastados y el primer error de tipeo lo vuelve a bloquear 15 minutos.

**7\. Un fallo del servicio de auth no cuenta como intento fallido.** Si contara, una caída bloquearía a todo el mundo por 15 minutos.

**8\. El error no dice cuántos intentos quedan.** "Te queda 1 intento" ya confirma que el email existe. El número queda en la bitácora, que es donde sirve.

**9\. Se verifica que el uuid devuelto sea el de ESTE usuario.**

if (usuario.auth\_id && usuario.auth\_id \!== resultado.tokens.authId) { /\* rechazar \*/ }  
`usuario.auth_id` es lo único que ata nuestra tabla con `auth.users`, y podría no coincidir si alguien cambió un email en un lado y no en el otro. Sin este control, la contraseña de una cuenta podría abrir la sesión de otro empleado.

#### Los parámetros {#los-parámetros}

const MAX\_INTENTOS \= 3;  
const MINUTOS\_BLOQUEO \= 15;  
Constantes con nombre, arriba del archivo, no números sueltos en el medio del código.

---

### Receta 17 — Subida de archivos {#receta-17-—-subida-de-archivos}

**En el schema**, el campo es un string cualquiera (puede ser una data URL o una ruta ya guardada):

imagen: z.string().optional(),  
**En el service**, antes de escribir:

const imagenUrl \= await guardarImagenBase64(input.imagen);  
const row \= await repo.insert({ ...input, imagenUrl }, client);  
`guardarImagenBase64` valida el tipo y el tamaño, escribe el archivo con nombre UUID y devuelve la ruta. Si el tipo no está permitido o pesa más de 2 MB, lanza `ValidationError` con `campo: "imagen"` y el front pinta ese control en rojo.

**Lo que no hay que hacer:** guardar el base64 en la base. Ver §2.13.

---

### Receta 18 — Cuándo NO hace falta un módulo entero {#receta-18-—-cuándo-no-hace-falta-un-módulo-entero}

No todo necesita 5 archivos. La escala razonable:

| Situación | Qué crear |
| :---- | :---- |
| Catálogo de solo lectura, sin reglas | Solo el `route.ts` con la query adentro (Receta 1\) |
| Lectura con filtros, sin escrituras | `route.ts` \+ `repo.ts` \+ `mapper.ts` |
| CRUD con reglas | El módulo completo |
| Un endpoint que solo lee de otro módulo | Nada nuevo: una función más en ese service |

**El ejemplo del último caso:** `/api/condiciones-pago` no tiene módulo propio. Llama a `service.condicionesPago()` del módulo de compras, que son tres líneas en un service que ya existía.

**El criterio general:** agregá la capa cuando aparezca la primera regla, no antes. Pero tampoco después: el momento de crear el service es cuando escribís el primer `if` de negocio, no seis `if` más tarde.

---

# Paso 3\. Referencias, control y mantenimiento {#paso-3.-referencias,-control-y-mantenimiento}

## Parte 6 — El catálogo de errores {#parte-6-—-el-catálogo-de-errores}

### 6.1 Cuál lanzar {#6.1-cuál-lanzar}

¿El dato que llegó está mal formado o falta?  
   └─ sí → ValidationError (422)

¿El recurso no existe?  
   └─ sí → NotFoundError (404)

¿El dato ya existe / choca con un único?  
   └─ sí → ConflictError (409)

¿Existe, pero una regla del negocio prohíbe la operación?  
   └─ sí → BusinessRuleError (409)

¿No hay sesión?  
   └─ sí → UnauthorizedError (401)

¿Es un bug nuestro o falta configuración?  
   └─ sí → Error común → sale 500 genérico, detalle al log

### 6.2 Cómo agregar un error nuevo {#6.2-cómo-agregar-un-error-nuevo}

**1\. Si es un caso más de los existentes**, no agregues clase. Usá la que hay con un código nuevo:

throw new BusinessRuleError(  
  "RECEPCION\_EXCEDE\_PEDIDO",  
  \`No se puede recibir más de lo pedido: quedan ${pendiente} unidades.\`,  
  "cantidad",  
);  
**2\. Si necesita un status HTTP distinto o datos extra**, creá la clase:

export class LimiteExcedidoError extends AppError {  
  readonly status \= 429;  
  get datos() { return { reintentarEn: this.segundos }; }  
  constructor(readonly segundos: number) {  
    super("LIMITE\_EXCEDIDO", \`Demasiados intentos. Esperá ${segundos} segundos.\`);  
  }  
}  
**3\. Si viene de un trigger nuevo**, agregá el SQLSTATE al trigger y la rama a `traducirErrorPostgres()`.

### 6.3 Cómo escribir el mensaje {#6.3-cómo-escribir-el-mensaje}

| ❌ Malo | ✅ Bueno | Por qué |
| :---- | :---- | :---- |
| "Error" | "Ya existe un proveedor activo con el CUIT 30-12345678-9: Pet Food SA." | Dice qué pasó y con qué |
| "Invalid input" | "El CUIT debe tener el formato XX-XXXXXXXX-X." | Dice cómo arreglarlo |
| "constraint violation" | "No se puede dar de baja: tiene 3 órdenes abiertas." | No filtra el esquema, y da el número |
| "Error en la operación" | "Solo se puede editar una orden Pendiente. Esta está Enviada." | Dice por qué no se puede |

**Y siempre que se pueda, el `campo`**: es lo que le permite al front pintar el input correcto en rojo en vez de mostrar un cartel general.

---

## Parte 7 — Las reglas que no se negocian {#parte-7-—-las-reglas-que-no-se-negocian}

### 7.1 SQL parametrizado, siempre {#7.1-sql-parametrizado,-siempre}

// ✅  
condiciones.push(\`p.razon\_social ILIKE $${params.length}\`);

// ❌ inyección SQL  
condiciones.push(\`p.razon\_social ILIKE '%${busqueda}%'\`);

### 7.2 El `usuario_id` sale de la sesión {#7.2-el-usuario_id-sale-de-la-sesión}

// ✅  
export const POST \= withRoute(async ({ req, session }) \=\> {  
  const input \= await parseBody(req, schema);  
  return created(await service.crear(input, session.usuarioId));  
});

// ❌ cualquiera puede operar como otro  
return created(await service.crear(input, input.usuarioId));

### 7.3 Los montos se recalculan {#7.3-los-montos-se-recalculan}

El `total` que manda el front **se descarta**. No se compara, no se advierte: se descarta y se calcula de nuevo.

### 7.4 Validar en el back aunque el front valide {#7.4-validar-en-el-back-aunque-el-front-valide}

El front valida para dar **feedback rápido**. El back valida porque es **la única garantía**. La API responde a cualquiera que sepa la URL, y el front puede tener un bug o estar desactualizado.

> Del contexto del módulo de proveedores: *"Las validaciones que antes vivían acá (CUIT duplicado) las hace ahora el backend: el front no puede garantizarlas, porque su lista puede estar desactualizada y dos personas pueden guardar a la vez."*

### 7.5 No filtrar el esquema en los errores {#7.5-no-filtrar-el-esquema-en-los-errores}

if (codigo \=== "23502") {  
  const columna \= (e as { column?: string }).column;  
  console.error(\`\[api\] NOT NULL violado en la columna "${columna ?? "?"}". ...\`);   // ← al LOG  
  return new ValidationError(  
    "CAMPO\_OBLIGATORIO",  
    "Falta un dato obligatorio del formulario. Revisá que estén completos todos los campos marcados con \*.",  
  );                                                                                 // ← al CLIENTE  
}  
El nombre de la columna va al log del server. Al cliente le llega un mensaje que puede accionar.

### 7.6 Nada se borra {#7.6-nada-se-borra}

Baja lógica en todo. Los movimientos de stock, además, son **inmutables por trigger**: no se editan ni se borran. Si hay que corregir uno, se registra el movimiento inverso.

### 7.7 La transacción, siempre que haya más de una escritura {#7.7-la-transacción,-siempre-que-haya-más-de-una-escritura}

Y `withAuditUser` como primera línea.

---

## Parte 8 — La base de datos {#parte-8-—-la-base-de-datos}

### 8.1 La organización {#8.1-la-organización}

db/  
├── schema.sql        ← la estructura COMPLETA: tablas, tipos, funciones, triggers, vistas  
├── seeds/  
│   ├── 01\_catalogos.sql   ← datos que el sistema NECESITA para funcionar  
│   └── 02\_demo.sql        ← datos de ejemplo para desarrollar  
├── correcciones/  
│   ├── 15\_login.sql  
│   ├── 16\_fix\_pagos\_cliente.sql  
│   ├── 17\_ctacte\_proveedor.sql  
│   └── README.md          ← qué hace cada una y en qué orden aplicarlas  
└── dev/  
    └── truncate.sql       ← vaciar la base para volver a empezar

### 8.2 Estructura vs. datos — la confusión más común {#8.2-estructura-vs.-datos-—-la-confusión-más-común}

|  | Estructura | Datos |
| :---- | :---- | :---- |
| **Qué es** | Las tablas, columnas, triggers, vistas | Las filas |
| **Dónde vive** | `schema.sql` | `seeds/` |
| **Cuándo se aplica** | Una vez, al crear la base | Después del schema |
| **Si falta** | `42P01 undefined_table` o `42703 undefined_column` | Consultas que devuelven vacío |

**Dos tipos de datos, y la diferencia importa:**

- **Catálogos** (`01_catalogos.sql`): estados de orden, tipos de comprobante, formas de pago, orígenes de movimiento. **El sistema no funciona sin ellos.** Si falta el estado "Pendiente", no se puede crear ninguna orden — de hecho el service lanza un error explícito diciendo que hay que correr el seed.  
- **Demo** (`02_demo.sql`): proveedores y artículos de ejemplo. Se pueden borrar sin romper nada.

### 8.3 `correcciones/` — los parches {#8.3-correcciones/-—-los-parches}

Cuando la estructura ya está en producción y hay que cambiarla, se escribe un archivo numerado en `correcciones/` en vez de editar `schema.sql` y pedirle a todos que recreen la base.

**Cómo se nota que falta aplicar una corrección:** aparece un `42703` (`undefined_column`) o `42P01` (`undefined_table`). Por eso `responses.ts` tiene esto:

if (codigoPg \=== "42703" || codigoPg \=== "42P01") {  
  console.error(  
    "\[api\] ↑ la base no tiene esa columna/tabla. " \+  
      "Revisa si falta aplicar alguna correccion de db/correcciones/ (ver su README.md).",  
  );  
}  
Un mensaje en el log que te dice exactamente qué revisar, en vez de un 500 mudo.

> **Para el proyecto nuevo:** arrancá con `schema.sql` \+ `seeds/` y agregá `correcciones/` recién cuando la base ya esté en uso por más de una persona. Antes de eso, editar el schema y recrear es más simple.

### 8.4 Convenciones de nombres {#8.4-convenciones-de-nombres}

| Cosa | Convención | Ejemplo |
| :---- | :---- | :---- |
| Tablas | singular, snake\_case | `proveedor`, `orden_compra` |
| Columnas | snake\_case | `razon_social`, `plazo_entrega_dias` |
| FK | `<tabla>_id` | `proveedor_id`, `estado_id` |
| Tabla intermedia N:M | `<a>_<b>` | `proveedor_forma_pago` |
| Índice único | `uq_<tabla>_<columnas>` | `uq_proveedor_cuit_activo` |
| Función | `fn_<qué hace>` | `fn_actualizar_stock` |
| Trigger | `tg_<qué audita>` | `tg_auditar_orden_compra` |
| Vista | `vista_<qué muestra>` | `vista_cuenta_corriente_proveedor` |

**El nombre del índice único importa de verdad**, porque `traducirErrorPostgres()` lo matchea para elegir el mensaje:

if (constraint.includes("proveedor\_cuit")) {  
  return new ConflictError("CUIT\_DUPLICADO", "Ya existe un proveedor activo con ese CUIT.", "cuit");  
}

### 8.5 El índice único parcial {#8.5-el-índice-único-parcial}

CREATE UNIQUE INDEX uq\_proveedor\_cuit\_activo  
  ON proveedor (cuit)  
  WHERE estado \= 'activo';  
El `WHERE` al final es lo que lo hace **parcial**: el CUIT es único **solo entre los activos**. Un proveedor dado de baja libera su CUIT para que se pueda volver a usar.

Esto refleja exactamente el criterio del negocio: *"valida que el CUIT no se encuentre duplicado entre proveedores activos"*.

---

## Parte 9 — Checklist: agregar un módulo nuevo {#parte-9-—-checklist:-agregar-un-módulo-nuevo}

Supongamos que hay que agregar **Clientes**. Los pasos, en orden.

### ☐ 1\. Leer el criterio y anotar las reglas {#☐-1.-leer-el-criterio-y-anotar-las-reglas}

Antes de escribir código, listá en una línea cada regla que aparece en el requerimiento:

· el DNI no se repite entre clientes activos  
· la baja es lógica  
· no se puede dar de baja con turnos pendientes  
· el email es opcional pero si viene tiene que ser válido  
Esa lista es el índice del service.

### ☐ 2\. Confirmar la estructura en la base {#☐-2.-confirmar-la-estructura-en-la-base}

¿Existen las tablas? ¿Cómo se llaman las columnas exactamente? ¿Cuáles son NOT NULL sin default?

**Este paso se saltea y siempre se paga.** Un INSERT que omite una columna NOT NULL da `23502` y el usuario ve "Falta un dato obligatorio" sin saber cuál.

### ☐ 3\. `cliente.types.ts` {#☐-3.-cliente.types.ts}

export type ClienteRow \= { /\* lo que devuelve Postgres: snake\_case, nullables \*/ };  
export type FiltrosCliente \= { /\* lo que manda el componente de filtros \*/ };  
export type ClienteInput \= { /\* lo que valida el schema: camelCase \*/ };

### ☐ 4\. `cliente.schema.ts` {#☐-4.-cliente.schema.ts}

Un schema por operación (aunque al principio `editar` sea igual que `crear`).

export const crearClienteSchema \= z.object({ /\* ... \*/ });  
export const editarClienteSchema \= crearClienteSchema;  
export type CrearClienteInput \= z.infer\<typeof crearClienteSchema\>;

### ☐ 5\. `cliente.repo.ts` {#☐-5.-cliente.repo.ts}

- `const COLUMNAS` con la lista explícita.  
- `findAll(filtros)` con el WHERE dinámico.  
- `findById(id)`.  
- `findActivoByDni(dni, excluirId?)`.  
- `insert(data, client)` / `update(id, data, client)` / `inactivar(id, client)`.

### ☐ 6\. `cliente.mapper.ts` {#☐-6.-cliente.mapper.ts}

Importá el tipo de salida del front. Convertí `null` → default y `decimal` → `Number`.

### ☐ 7\. `cliente.service.ts` {#☐-7.-cliente.service.ts}

Una función por operación. Cada regla del paso 1 tiene que aparecer acá como un `if` con su error.

### ☐ 8\. Los `route.ts` {#☐-8.-los-route.ts}

app/api/clientes/route.ts                  → GET (listar), POST (crear)  
app/api/clientes/\[id\]/route.ts             → GET (detalle), PUT (editar)  
app/api/clientes/\[id\]/inactivar/route.ts   → PATCH (baja lógica)

### ☐ 9\. Los constraints en la base {#☐-9.-los-constraints-en-la-base}

Si hay una regla de unicidad, creá el índice y **agregá su rama a `traducirErrorPostgres()`**. El chequeo del service da el mensaje lindo; el índice es la garantía bajo concurrencia.

### ☐ 10\. Probar con curl {#☐-10.-probar-con-curl}

Ver la Parte 10\. Probá el camino feliz **y el error** de cada regla.

### ☐ 11\. Verificación técnica {#☐-11.-verificación-técnica}

npm run lint && npx tsc \--noEmit

### ☐ 12\. Conectar el front {#☐-12.-conectar-el-front}

Reemplazá el array hardcodeado por `apiGet`. El listado principal con `apiGet`, los catálogos con `apiGetOpcional`.

---

## Parte 10 — Probar sin front {#parte-10-—-probar-sin-front}

No hace falta esperar a que la pantalla esté lista, se puede probar en la terminar con los siguientes comandos.

**Listar todo:**

curl \-s "http://localhost:3000/api/proveedores" | jq

**Con filtros:**

curl \-s "http://localhost:3000/api/proveedores?busqueda=pet\&estado=activo" | jq

**Crear:**

curl \-s \-X POST "http://localhost:3000/api/proveedores" \-H "Content-Type: application/json" \-d '{"razonSocial":"Pet Food SA","cuit":"30-12345678-9","formaPagoIds":\[1,2\]}' | jq  
**Probar el error:** mandá el MISMO CUIT otra vez. Tiene que dar 409 con `CUIT_DUPLICADO`.

**Ver el status code además del body:**

curl \-s \-o /dev/null \-w "%{http\_code}\\n" "http://localhost:3000/api/proveedores/99999"  
**Editar:**

curl \-s \-X PUT "http://localhost:3000/api/proveedores/1" \-H "Content-Type: application/json" \-d '{"razonSocial":"Pet Food SRL","cuit":"30-12345678-9","formaPagoIds":\[1\]}' | jq  
**Baja lógica:**

curl \-s \-X PATCH "http://localhost:3000/api/proveedores/1/inactivar" | jq  
> Si no tenés `jq`, sacá el  `| jq` y leé el JSON crudo.

> Para que estos comandos funcionen sin login, tiene que estar puesta `SESSION_USUARIO_DNI` en el `.env.local`. Con el login activo, hace falta mandar la cookie.

**Qué probar de cada endpoint:**

1. El camino feliz.  
2. Cada regla de negocio, provocando su error.  
3. Un id que no existe → 404\.  
4. Un body al que le falta un campo obligatorio → 422 con el nombre del campo.

---

## Parte 11 — Los errores que todos cometen {#parte-11-—-los-errores-que-todos-cometen}

### 11.1 El campo que se pierde en silencio {#11.1-el-campo-que-se-pierde-en-silencio}

**Síntoma:** el alta falla con `23502 not_null_violation`, o el campo se guarda con el valor por defecto.

**Causa:** el schema de zod **no declara** ese campo. Un objeto de zod sin `.strict()` **descarta en silencio** lo que no conoce. El front lo manda, zod lo tira, nunca llega al INSERT.

**El caso real de este proyecto:** el front mandaba `razon_social` y el schema esperaba `razonSocial`. El server contestaba 422 `"Required"` — en inglés, sin decir qué campo. Y de paso `plazo_entrega_dias` también se perdía, así que aunque el alta hubiera pasado, el plazo se guardaba en el default.

**Cómo encontrarlo:** el log ya te lo dice. `traducirErrorPostgres` imprime:

\[api\] NOT NULL violado en la columna "presentacion\_id". Revisá que el schema de zod  
la declare: si no está, el valor que manda el front se descarta en silencio y nunca  
llega al INSERT.

### 11.2 El 401 en todos los endpoints {#11.2-el-401-en-todos-los-endpoints}

**Causa:** `SESSION_USUARIO_DNI` no coincide con ningún usuario **activo**, o no está puesta y no hay login.

`session.ts` avisa una sola vez al arrancar:

\[sesion\] SESSION\_USUARIO\_DNI="12345678" no coincide con ningún usuario activo.  
El fallback queda sin efecto: hace falta iniciar sesión.

### 11.3 "El login no hace nada" {#11.3-"el-login-no-hace-nada"}

**Causa:** lo contrario del anterior. `SESSION_USUARIO_DNI` **sí** está puesta, así que `requireSession()` nunca devuelve 401 y el front nunca redirige a `/login`.

**Solución:** sacar esa línea del `.env.local`.

### 11.4 El listado sale vacío con los filtros por defecto {#11.4-el-listado-sale-vacío-con-los-filtros-por-defecto}

**Causa:** el front manda `"Todas"` / `"Todos"` como valor de "sin filtrar", y llegó al `WHERE`.

**Solución:** normalizar en el handler (Receta 2).

### 11.5 El POST devuelve datos incompletos {#11.5-el-post-devuelve-datos-incompletos}

**Causa:** se leyó el resultado **desde el pool** en vez del `client` de la transacción. Las filas recién insertadas todavía no existen para nadie más: falta el `COMMIT`.

**Solución:** pasar el `client` a la lectura final.

// ❌  
return mapper.toApi(await repo.findById(ordenId));

// ✅  
return leerEnTransaccion(ordenId, client);

### 11.6 `42703 undefined_column` / `42P01 undefined_table` {#11.6-42703-undefined_column-/-42p01-undefined_table}

**Causa:** el código asume una corrección de `db/correcciones/` que no se aplicó en la base.

El log ya lo sugiere (ver §8.3).

### 11.7 El listado tarda tres segundos {#11.7-el-listado-tarda-tres-segundos}

**Causa:** N+1. Buscá un `await` que consulte la base adentro de un `for` o un `.map()`.

**Solución:** Receta 15\.

### 11.8 El paginador dice 23 y la lista tiene 18 {#11.8-el-paginador-dice-23-y-la-lista-tiene-18}

**Causa:** el listado y el contador filtran distinto.

**Solución:** compartir el `FROM` y el `WHERE` (Receta 3).

### 11.9 Un `decimal` que llega como texto {#11.9-un-decimal-que-llega-como-texto}

**Síntoma:** `precio > 100` da `false` con precio `"1500.00"`.

**Causa:** el driver `pg` devuelve los `decimal` como string. El mapper no lo convirtió.

**Solución:** `Number(row.precio)` en el mapper.

### 11.10 Deadlock al mover stock {#11.10-deadlock-al-mover-stock}

**Causa:** dos transacciones bloquean las mismas filas en orden distinto.

**Solución:** ordenar los ids antes de bloquear (Receta 11).

---

## Parte 12 — Glosario {#parte-12-—-glosario}

| Término | Qué es |
| :---- | :---- |
| **Route handler** | El archivo `route.ts` que Next convierte en un endpoint. Exporta funciones con el nombre del método HTTP. |
| **Pool de conexiones** | Un conjunto de conexiones a la base que se prestan y devuelven, en vez de abrir una por request. |
| **Transacción** | Un bloque "todo o nada". `BEGIN` … `COMMIT`, o `ROLLBACK` si algo falla. |
| **`ROLLBACK`** | Deshacer todo lo que pasó desde el `BEGIN`. |
| **SQL parametrizado** | Mandar los valores aparte del texto de la consulta, con `$1`, `$2`. La defensa contra inyección SQL. |
| **Inyección SQL** | Cuando el texto que escribe el usuario se interpreta como instrucción SQL en vez de como dato. |
| **Placeholder** | El `$1`, `$2` de la consulta. |
| **SQLSTATE** | El código de 5 caracteres con el que Postgres identifica cada tipo de error (`23505`, `23502`…). |
| **Constraint** | Una regla declarada en la base: `UNIQUE`, `CHECK`, `NOT NULL`, `FOREIGN KEY`. |
| **Índice único parcial** | Un `UNIQUE` con `WHERE`: el valor es único solo entre las filas que cumplen la condición. |
| **Trigger** | Código SQL que la base ejecuta sola cuando pasa algo (un INSERT, un UPDATE). |
| **`FOR UPDATE`** | Bloquea las filas leídas hasta el `COMMIT`, para que nadie más las toque mientras tanto. |
| **Deadlock** | Dos transacciones esperándose mutuamente. Ninguna avanza. |
| **Race condition** | Dos operaciones simultáneas cuyo resultado depende de cuál llegue primero. |
| **N+1** | Hacer una consulta por cada fila de un listado, en vez de una sola para todas. |
| **Baja lógica** | Marcar como inactivo en vez de borrar. |
| **Maestro-detalle** | Una cabecera (la orden) con sus líneas (el detalle). |
| **Idempotente** | Que hacerlo dos veces da el mismo resultado que hacerlo una. |
| **Mapper** | La función que traduce una fila de la base al objeto que espera el front. |
| **Schema (zod)** | La declaración de qué forma tiene que tener un input. |
| **`z.infer`** | El tipo de TypeScript derivado de un schema de zod. |
| **Seed** | Datos iniciales que se cargan en la base. |
| **HMAC** | Una firma criptográfica con clave secreta. Prueba que un dato no fue modificado. |
| **GoTrue** | El servicio de autenticación de Supabase. |

