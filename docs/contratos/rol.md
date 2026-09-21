# Cómo usar el contrato `rol`

Contrato: [`src/contracts/rol.ts`](../../src/contracts/rol.ts). Catálogo de **solo lectura**: `rol` es carga inicial de la base (Gerente, Profesor, Mesa de Entrada) y no tiene ABM.

Existe igual porque el `<select>` de roles del alta de usuario necesita ids **reales** de la base. Un array fijo en el front con ids inventados guarda el rol equivocado sin avisar — está explicado en [`src/lib/use-catalogo.ts`](../../src/lib/use-catalogo.ts).

Archivos que toca cada equipo:

```
src/contracts/rol.ts                ← el acuerdo (ya existe)
src/app/api/roles/route.ts          ← back: GET listar
src/server/roles/rol.repo.ts        ← back: SQL (sin service: no hay reglas)
```

---

# Back-end

## 1. Ruta real

```ts
// src/app/api/roles/route.ts
import { withRoute } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import type { RolResponse } from "@/contracts/rol";
import * as repo from "@/server/roles/rol.repo";

export const GET = withRoute(async () => ok<RolResponse[]>(await repo.listar()));
```

Sin `service.ts` ni `mapper.ts`: la fila de la base ya es `{ id, nombre }`, no hay nada que traducir ni ninguna regla que aplicar. Un mapper de identidad es ruido.

Tampoco hay POST, PUT ni DELETE: los roles se cargan con el script de seed. Si mañana hace falta un rol nuevo, se agrega ahí **y** se actualiza `NombreRol` en el contrato — si no, el front no lo puede distinguir.

## 2. Datos stub

```ts
const FIXTURE: RolResponse[] = [
  { id: 1, nombre: "Gerente" },
  { id: 2, nombre: "Profesor" },
  { id: 3, nombre: "Mesa de Entrada" },
];

export const GET = withRoute(async () => ok(FIXTURE));
```

Los ids del fixture son los de la carga inicial, no inventados: cuando entra la ruta real, el front no ve ninguna diferencia.

---

# Front

## 1. Traer el catálogo

```ts
import { RUTA, type RolResponse, type NombreRol } from "@/contracts/rol";
import { useCatalogo } from "@/lib/use-catalogo";

const roles = useCatalogo<RolResponse>(RUTA);
```

`useCatalogo` usa `apiGetOpcional`: si el endpoint falla, el `<select>` queda vacío en vez de tirar abajo la pantalla.

## 2. Usar el NOMBRE del rol para las reglas de UI, no el id

```ts
const rolElegido = roles.find((r) => r.id === Number(rolId));
const esProfesor = rolElegido?.nombre === "Profesor";

// El campo academia solo se muestra (y es obligatorio) para el rol Profesor.
{esProfesor && <SelectAcademia obligatorio />}
```

`NombreRol` es la unión cerrada `"Gerente" | "Profesor" | "Mesa de Entrada"`. Comparar contra `rolId === 2` funciona hasta que alguien recrea la base y los identity arrancan distinto; comparar contra el nombre, no se rompe.

La regla de fondo (Profesor ⇒ academia obligatoria) la valida igual el back con `ACADEMIA_REQUERIDA`; lo de acá es solo para que el formulario avise antes de enviar. Ver [`usuario.md`](usuario.md).

## 3. Gatear la UI por el rol de la sesión

```ts
const rol = sesion.rol.nombre satisfies NombreRol;
const puedeAdministrar = rol === "Gerente";
```

Esto es solo UI: esconder un botón no es seguridad. El permiso real lo valida el back en cada endpoint, y un intento contra un endpoint prohibido queda registrado como `acceso_denegado` en la bitácora de sesiones → [`auditoria.md`](auditoria.md).
