# Capa de datos del front (`src/data/<entidad>.ts`)

Cómo se conectan las pantallas hardcodeadas a los datos, para que el día que el back publique los endpoints **no haya que reescribir la pantalla**.

Implementado por primera vez en HU-MAT-01 ([`src/data/materias.ts`](../src/data/materias.ts) + [`src/app/materias/page.tsx`](../src/app/materias/page.tsx)). Este documento es el patrón a repetir en las próximas HUs.

---

## El problema que evita

La forma "natural" de hacer una pantalla hardcodeada es exportar un array y usarlo en el componente:

```tsx
// ❌ Lo que NO hacemos
import { MATERIAS } from "@/data/materias";
const [materias, setMaterias] = useState(MATERIAS);      // dato sincrónico
setMaterias((prev) => [...prev, { id: 99, ...borrador }]); // alta inventada en el front
```

Funciona, pero el día que existe la API hay que tocar **todo**: el estado pasa a ser asincrónico, aparecen estados de carga y error que no estaban, el alta deja de inventar el `id`, y hay que agregar el manejo de errores del contrato. Eso es reescribir la pantalla, no conectarla.

## La regla

> **La pantalla nunca ve el array.** Habla con `src/data/<entidad>.ts`, que expone funciones `async` con la **firma final**: tipos del contrato, errores del contrato. Hoy resuelven contra un fixture en memoria; mañana, contra `fetch`.

Lo único que cambia el día del back es el **cuerpo** de esas funciones. La pantalla, los componentes y los tipos quedan igual.

```
src/contracts/<entidad>.ts   ← el acuerdo con el back (rutas, request, response, errores)
        ↓ importa tipos y rutas
src/data/<entidad>.ts        ← capa de datos: hoy fixture, mañana fetch
        ↓ importa funciones
src/app/<ruta>/page.tsx      ← la pantalla: no sabe de dónde salen los datos
```

---

## Plantilla

```ts
// src/data/<entidad>.ts
import {
  RUTA,
  rutaEntidad,
  rutaInactivar,
  type Crear<Entidad>Body,
  type Editar<Entidad>Body,
  type Listar<Entidad>Query,
  type <Entidad>Response,
} from "@/contracts/<entidad>";
import { ApiError } from "@/lib/api-client";

// ── Fixture: lo único que desaparece el día del back ──────────────────────
const FIXTURE: <Entidad>Response[] = [ /* … */ ];
let memoria = FIXTURE.map((x) => ({ ...x }));

const DEMORA_MS = 300;                                   // para ver los estados de carga
const demorar = () => new Promise((r) => setTimeout(r, DEMORA_MS));

// ── API del módulo (la firma NO cambia cuando entra el back) ──────────────

export async function listar<Entidad>(
  filtros: Listar<Entidad>Query = {},
): Promise<<Entidad>Response[]> {
  await demorar();
  // BACKEND: return apiGet<...>(`${RUTA}?${new URLSearchParams(...)}`)
  return memoria.filter(/* los mismos filtros del contrato */).map((x) => ({ ...x }));
}

export async function crear<Entidad>(body: Crear<Entidad>Body): Promise<<Entidad>Response> {
  await demorar();
  exigirReglas(body);                                     // las que el back valida
  // BACKEND: return apiSend<...>("POST", RUTA, body)
  const creado = { id: siguienteId(), ...normalizar(body), /* defaults de la base */ };
  memoria = [...memoria, creado];
  return { ...creado };
}
```

Las cuatro reglas de la plantilla:

1. **`async` siempre**, aunque hoy resuelva al instante. Si la firma es sincrónica, la pantalla se escribe sincrónica y hay que rehacerla.
2. **Los tipos salen del contrato**, nunca se redefinen. Entra `…Body`, sale `…Response`.
3. **Devolver copias** (`{ ...x }`), no referencias al fixture: si la pantalla muta el objeto, no debe corromper el "servidor".
4. **Los errores son `ApiError` con los códigos del contrato** (ver abajo).

## Los errores son parte del contrato

Un fixture que nunca falla produce una pantalla que no sabe fallar. Cada regla de negocio que el back va a validar se lanza acá, con el **mismo código** que declara el contrato:

```ts
throw new ApiError(
  "NOMBRE_DUPLICADO",                                  // código del union ErrorMateria
  "Ya existe una materia activa con ese nombre.",      // mensaje que ve el usuario
  "nombre",                                            // campo → el input se marca en rojo
  409,                                                 // status
);
```

Y la pantalla los maneja como los va a manejar en producción:

```ts
const codigo = (e instanceof ApiError ? e.codigo : undefined) as ErrorMateria | undefined;
if (codigo === "NOMBRE_DUPLICADO") setErrorRemoto({ campo: "nombre", mensaje: "…" });
else setErrorGlobal(mensajeDeError(e));
```

**Código nuevo = se agrega primero al contrato**, después se lanza acá.

## Validación local vs. error del servidor

Las dos conviven, y no es redundancia:

| | Para qué | Ejemplo |
|---|---|---|
| **Validación local** (zod / `validar()` del formulario) | Feedback inmediato, sin ida y vuelta | El duplicado se avisa al salir del campo |
| **Error de la API** | La verdad. Puede llegar igual, porque otro operador guardó primero | `NOMBRE_DUPLICADO` (409) al guardar |

Por eso el formulario acepta un `errorRemoto` que pisa al local (ver `MateriaFormModal`): el back es la autoridad.

Lo mismo con los avisos previos: el modal de baja muestra "tiene 3 turnos futuros" con lo que el front sabe, pero **quien decide es el 409** `MATERIA_CON_TURNOS_FUTUROS` que devuelve `inactivarMateria`.

## Cuando el contrato no alcanza: `// PENDIENTE CONTRATO:`

Si la HU pide algo que el contrato no cubre, **no se inventa la ruta**: se implementa contra el fixture y se marca.

```ts
/**
 * PENDIENTE CONTRATO: el contrato tiene `rutaInactivar` pero no una ruta para
 * volver a activar, y `editarMateriaBody` no incluye `estado`. La HU-MAT-01 sí
 * pide el switch Activo/Inactivo. Antes de conectar hay que acordar con el back
 * `POST /api/materias/:id/activar` y agregarlo al contrato PRIMERO.
 */
export async function reactivarMateria(id: number) { /* … */ }
```

Se busca con `grep -rn "PENDIENTE CONTRATO" src/` y se lleva a la reunión con el back.

---

## El día del back: qué se toca

Solo el cuerpo de las funciones de `src/data/<entidad>.ts`:

```ts
// Antes                                    // Después
export async function listarMaterias(f) {   export async function listarMaterias(f) {
  await demorar();                            const qs = new URLSearchParams(
  return memoria.filter(...);                   Object.entries(f).map(([k, v]) => [k, String(v)]));
}                                             return apiGet<MateriaResponse[]>(`${RUTA}?${qs}`);
                                            }
```

Y se borran: el `FIXTURE`, `memoria`, `demorar()` y los helpers internos (`exigirNombreLibre`, etc. — eso pasa a ser el `service.ts` del back).

**No se toca:** la pantalla, los componentes, los tipos, ni el manejo de errores.

---

## Checklist para la próxima HU

Antes de codear la pantalla:

- [ ] ¿Existe el contrato en `src/contracts/`? Si no, primero `/contract` (ver [`docs/api-contracts.md`](api-contracts.md)).
- [ ] `src/data/<entidad>.ts` creado con las funciones `async` que necesita la HU (listar / crear / editar / inactivar / lo que pida).
- [ ] Los tipos vienen del contrato: el fixture está tipado como `<Entidad>Response[]` (si el contrato cambia, no compila).
- [ ] Cada regla de negocio del contrato se lanza como `ApiError` con su código.
- [ ] `// BACKEND:` en cada función, con la llamada real que la va a reemplazar.
- [ ] `// PENDIENTE CONTRATO:` en lo que la HU pide y el contrato no cubre.

En la pantalla:

- [ ] Estados `cargando` / `error` / `vacío` / `con datos` (existen porque la carga es asincrónica de verdad).
- [ ] El body se declara con el tipo del contrato (`const body: CrearXBody = {...}`), **en su propia variable**: así el error del compilador señala el campo, no la llamada.
- [ ] Se guarda en el estado **lo que devolvió la función**, no el borrador local (trae el `id` real y los defaults de la base).
- [ ] `try/catch` con los códigos del contrato + `mensajeDeError(e)` como fallback.
- [ ] Botón de guardar deshabilitado mientras se espera (`guardando`), para no duplicar el alta.

---

## Referencias

- Contratos y su formato: [`docs/api-contracts.md`](api-contracts.md) · guías por módulo en [`docs/contratos/`](contratos/)
- Cliente HTTP: [`src/lib/api-client.ts`](../src/lib/api-client.ts) (`apiGet`, `apiGetOpcional`, `apiSend`, `ApiError`, `mensajeDeError`)
- Catálogos para `<select>`: [`src/lib/use-catalogo.ts`](../src/lib/use-catalogo.ts)
- Ejemplo completo: [`src/data/materias.ts`](../src/data/materias.ts)
