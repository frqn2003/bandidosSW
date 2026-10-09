# Contratos de API.

Los contratos de API, el como se manejan los datos tanto para el front como para el back se van a escribir de la siguiente forma:

# /contracts/

// src/contracts/proveedor.ts  
//  
// Lo importan las DOS mitades. Se escribe ANTES de que exista la pantalla o el  
// service: es el acuerdo, no la documentación del acuerdo.  
//  
// Va: ruta, request, response, errores. No va: SQL, reglas de negocio,  
// componentes. Tiene que leerse entero en dos minutos.

import { z } from "zod";

// ─── Rutas ───────────────────────────────────────────────────────────────  
export const RUTA \= "/api/proveedores";  
export const rutaProveedor \= (id: number) \=\> \`\${RUTA}/\${id}\`;  
export const rutaInactivar \= (id: number) \=\> \`\${RUTA}/\${id}/inactivar\`;

// ─── Request: filtros del listado ────────────────────────────────────────  
export const listarProveedoresQuery \= z  
 .object({  
   busqueda: z.string().trim().optional(),  
   estado: z.enum(\["activo", "inactivo"\]).optional(),  
   formaPagoId: z.coerce.number().int().positive().optional(),  
 })  
 .strict();

// ─── Request: alta y edición ─────────────────────────────────────────────  
export const crearProveedorBody \= z  
 .object({  
   razonSocial: z.string().trim().min(1).max(150),  
   cuit: z.string().trim().regex(/^\\d{2}\-?\\d{8}\-?\\d\$/,  
     "El CUIT debe tener el formato XX-XXXXXXXX-X."),  
   direccion: z.string().trim().max(255).optional(),  
   telefono: z.string().trim().max(30).optional(),  
   email: z.string().trim().max(120).email().optional(),  
   contacto: z.string().trim().max(100).optional(),  
   plazoEntregaDias: z.number().int().min(0).max(365).optional(),  
   formaPagoIds: z.array(z.number().int().positive()).min(1),  
 })  
 .strict();

export const editarProveedorBody \= crearProveedorBody;

export type CrearProveedorBody \= z.input\<typeof crearProveedorBody\>;  
export type CrearProveedorInput \= z.output\<typeof crearProveedorBody\>;

// ─── Response ────────────────────────────────────────────────────────────  
export type EstadoProveedor \= "activo" | "inactivo";

export type ProveedorResponse \= {  
 id: number;  
 razonSocial: string;  
 cuit: string;  
 direccion: string | null;  
 telefono: string | null;  
 email: string | null;  
 contacto: string | null;  
 plazoEntregaDias: number | null;  
 formasPago: { id: number; nombre: string }\[\];  
 estado: EstadoProveedor;  
};

// ─── Errores de dominio ──────────────────────────────────────────────────  
export type ErrorProveedor \=  
 | "CUIT\_DUPLICADO"                    // 409  
 | "PROVEEDOR\_CON\_ORDENES\_ABIERTAS"    // 409, al inactivar  
 | "NO\_ENCONTRADO"                     // 404  
 | "DATOS\_INVALIDOS";     

# Back-end.

## 1\. Ruta real.

export const GET \= withRoute(async ({ req }) \=\> {  
 const sp \= new URL(req.url).searchParams;  
 const filtros \= listarProveedoresQuery.parse(Object.fromEntries(sp));  
 return ok(await service.listar(filtros));  
});

export const POST \= withRoute(async ({ req, session }) \=\> {  
 const input \= await parseBody(req, crearProveedorBody);  
 return created(await service.crear(input, session.usuarioId));  
});

Fijate que usuarioId sale de session, no del body. Por eso no está en el contrato.

## 2\. El [mapper.ts](http://mapper.ts): acá se traducen los nombres de la base para ser usados en el proyecto.

import type { ProveedorResponse } from "@/contracts/proveedor";  
import type { ProveedorRow } from "./proveedor.types";

export function toApi(row: ProveedorRow, formasPago: FormaPago\[\]): ProveedorResponse {  
 return {  
   id: row.id,  
   razonSocial: row.razon\_social,          // ← snake\_case → camelCase, acá y en ningún otro lado  
   cuit: row.cuit,  
   direccion: row.direccion,  
   telefono: row.telefono,  
   email: row.email,  
   contacto: row.contacto,  
   plazoEntregaDias: row.plazo\_entrega\_dias,  
   formasPago,  
   estado: row.estado,  
 };  
}

Ojo con las columnas numeric: pg las devuelve como string. Si el contrato dice number, el mapper tiene que hacer Number(row.calificacion) — y si te olvidás, no compila. Ese es el valor de tener los dos extremos tipados.

## 3\. El [service.ts](http://service.ts)

import type { CrearProveedorInput, ProveedorResponse } from "@/contracts/proveedor";

export async function crear(  
 input: CrearProveedorInput,  
 usuarioId: number,  
): Promise\<ProveedorResponse\> {  
 return withTransaction(async (client) \=\> {  
   await withAuditUser(client, usuarioId);

   if (await repo.existeCuit(input.cuit, client)) {  
     throw new ConflictError("CUIT\_DUPLICADO", "Ya existe un proveedor con ese CUIT.");  
   }

   const row \= await repo.insert(input, client);  
   return toApi(row, await repo.formasPagoDe(row.id, client));  
 });  
}

CrearProveedorInput, no ...Body — el service recibe lo ya validado, después de los defaults.

## Opcional: datos stub (de borrador o harcodeados), sino se reemplaza con la parte de ruta real.

// src/app/api/proveedores/route.ts  
import { withRoute } from "@/lib/http/handler";  
import { ok } from "@/lib/http/responses";  
import type { ProveedorResponse } from "@/contracts/proveedor";

const FIXTURE: ProveedorResponse\[\] \= \[  
  {  
    id: 1, razonSocial: "Distribuidora Norte S.A.", cuit: "30-11223344-5",  
    direccion: null, telefono: null, email: null, contacto: null,  
    plazoEntregaDias: 3, formasPago: \[{ id: 1, nombre: "Contado" }\],  
    estado: "activo",  
  },  
\];

export const GET \= withRoute(async () \=\> ok(FIXTURE));

# Front

## 1\. Importar del contrato, nunca tipear la URL

import {  
 RUTA,  
 type CrearProveedorBody,  
 type ProveedorResponse,  
 type ErrorProveedor,  
} from "@/contracts/proveedor";

## 

## 2\. Armar el body tipado

const body: CrearProveedorBody \= {  
 razonSocial: razonSocial.trim(),  
 cuit: cuit.trim(),  
 email: email.trim() || undefined,        // "" no es un email válido: se omite  
 plazoEntregaDias: Number(plazo),  
 formaPagoIds: \[Number(formaPagoId)\],  
};

Declarar el tipo acá y no en el apiSend es lo que importa: el error del compilador te señala la línea del campo mal escrito, no la de la llamada.

## 

## 3\. Llamar y tipar la respuesta

const creado \= await apiSend\<ProveedorResponse\>("POST", RUTA, body);  
setProveedores((prev) \=\> \[...prev, creado\]);

Se agrega lo que devolvió la API, no el borrador local: trae el id real y lo que la base haya completado por default.

## 

## 4\. Manejar los errores que el contrato declara

try {  
 const creado \= await apiSend\<ProveedorResponse\>("POST", RUTA, body);  
 ...  
} catch (e) {  
 const codigo \= codigoDeError(e) as ErrorProveedor | undefined;

 if (codigo \=== "CUIT\_DUPLICADO") {  
   setErrores({ cuit: "Ya existe un proveedor con ese CUIT." });  
 } else {  
   setErrorGlobal(mensajeDeError(e));   // 422, 500, red caída  
 }  
