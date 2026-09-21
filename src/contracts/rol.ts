// src/contracts/rol.ts
//
// CONTRATO DE ROL — catálogo de solo lectura.
//
// `rol` es carga inicial de la base (Gerente, Profesor, Mesa de Entrada): no
// tiene ABM, así que este contrato es corto a propósito. Existe igual porque el
// `<select>` de roles del alta de usuario necesita ids reales de la base, y
// esos ids no se hardcodean en el front (ver src/lib/use-catalogo.ts).

import { z } from "zod";


// ─── 1. Rutas ────────────────────────────────────────────────────────────
//   GET  RUTA  → listar los roles

export const RUTA = "/api/roles";


// ─── 2. Request ──────────────────────────────────────────────────────────
// Sin filtros: son tres filas. Se declara igual para que `.strict()` rechace
// una query string inventada en vez de ignorarla.

export const listarRolesQuery = z.object({}).strict();


// ─── 3. Tipos derivados ──────────────────────────────────────────────────

export type ListarRolesQuery = z.output<typeof listarRolesQuery>;


// ─── 4. Response ─────────────────────────────────────────────────────────
// `NombreRol` es la lista cerrada de la carga inicial. El front la usa para
// decidir qué mostrar por rol (y para la regla "Profesor ⇒ academia obligatoria"
// del alta de usuario), sin comparar contra un id hardcodeado.

export type NombreRol = "Gerente" | "Profesor" | "Mesa de Entrada";

export type RolResponse = {
  id: number;
  nombre: NombreRol;
};


// ─── 5. Errores de dominio ───────────────────────────────────────────────

export type ErrorRol = "DATOS_INVALIDOS"; // 422
