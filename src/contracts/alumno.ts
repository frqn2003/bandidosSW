// src/contracts/alumno.ts
//
// CONTRATO DE ALUMNO.
//
// Dos cosas propias de este módulo:
//  · Menor de 18 ⇒ los tres datos del responsable son obligatorios. La base lo
//    fuerza (ck_alumno_responsable_menor) y acá se valida igual, porque los dos
//    datos (fecha de nacimiento y responsable) están en el mismo body: el front
//    puede avisar sin ir al servidor.
//  · El posible duplicado (mismo nombre + apellido + fecha de nacimiento) NO es
//    un error: es un aviso de UX. Por eso tiene endpoint propio y no un código
//    de error — el alta se puede confirmar igual.

import { z } from "zod";


// ─── 1. Rutas ────────────────────────────────────────────────────────────
//   GET    RUTA                    → listar (acepta los filtros de abajo)
//   POST   RUTA                    → crear
//   GET    rutaAlumno(id)          → detalle
//   PUT    rutaAlumno(id)          → editar
//   POST   rutaInactivar(id)       → baja lógica (estado = 'inactivo')
//   GET    RUTA_POSIBLES_DUPLICADOS→ aviso antes de confirmar el alta

export const RUTA = "/api/alumnos";
export const rutaAlumno = (id: number) => `${RUTA}/${id}`;
export const rutaInactivar = (id: number) => `${RUTA}/${id}/inactivar`;
export const RUTA_POSIBLES_DUPLICADOS = "/api/alumnos/posibles-duplicados";


// ─── 2a. Request: filtros del listado ────────────────────────────────────

export const listarAlumnosQuery = z
  .object({
    busqueda: z.string().trim().optional(),          // legajo, nombre, apellido o dni
    nivelEducativo: z.enum(["Primario", "Secundario", "Universitario"]).optional(),
    estado: z.enum(["activo", "inactivo"]).optional(),
  })
  .strict();


// ─── 2b. Request: aviso de posible duplicado ─────────────────────────────
// Se llama antes de confirmar el alta. Devuelve los alumnos que coinciden; si
// el array viene vacío, no hay nada que avisar.

export const posiblesDuplicadosQuery = z
  .object({
    nombre: z.string().trim().min(1),
    apellido: z.string().trim().min(1),
    fechaNacimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .strict();


// ─── 2c. Request: alta y edición ─────────────────────────────────────────
// `fechaNacimiento` viaja como "yyyy-mm-dd" (lo que produce un <input
// type="date">), no como timestamp: es una fecha, no un instante.
// Los tres campos del responsable son nullable: el front manda null cuando el
// alumno es mayor y el formulario ni siquiera muestra esa sección.

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const TELEFONO = /^\d{10,11}$/;
const DOCUMENTO = /^\d{7,8}$/;

/** Años cumplidos a la fecha de hoy. Misma cuenta que `age()` en la base. */
function edad(fechaNacimiento: string): number {
  const nacimiento = new Date(`${fechaNacimiento}T00:00:00`);
  const hoy = new Date();
  let anios = hoy.getFullYear() - nacimiento.getFullYear();
  const mes = hoy.getMonth() - nacimiento.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) anios--;
  return anios;
}

const camposAlumno = z
  .object({
    nombre: z.string().trim().min(1).max(50),
    apellido: z.string().trim().min(1).max(50),
    dni: z.string().trim().regex(DOCUMENTO, "El DNI debe tener 7 u 8 dígitos."),
    fechaNacimiento: z
      .string()
      .regex(FECHA, "La fecha debe tener formato aaaa-mm-dd.")
      .refine((v) => v <= new Date().toISOString().slice(0, 10), {
        message: "La fecha de nacimiento no puede ser futura.",
      }),
    telefono: z
      .string()
      .trim()
      .regex(TELEFONO, "El teléfono debe tener 10 u 11 dígitos, sin guiones."),
    email: z.string().trim().max(120).email().nullable().default(null),
    nivelEducativo: z.enum(["Primario", "Secundario", "Universitario"]),
    responsableNombre: z.string().trim().max(100).nullable().default(null),
    responsableDni: z.string().trim().regex(DOCUMENTO).nullable().default(null),
    responsableTelefono: z.string().trim().regex(TELEFONO).nullable().default(null),
  })
  .strict()
  // ck_alumno_responsable_menor, del lado del front. El `path` hace que el
  // error caiga en el input que falta, no en el formulario entero.
  .superRefine((v, ctx) => {
    if (edad(v.fechaNacimiento) >= 18) return;
    const obligatorios = [
      ["responsableNombre", v.responsableNombre],
      ["responsableDni", v.responsableDni],
      ["responsableTelefono", v.responsableTelefono],
    ] as const;
    for (const [campo, valor] of obligatorios) {
      if (!valor) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [campo],
          message: "Dato obligatorio para un alumno menor de edad.",
        });
      }
    }
  });

export const crearAlumnoBody = camposAlumno;
export const editarAlumnoBody = camposAlumno;


// ─── 3. Tipos derivados ──────────────────────────────────────────────────

export type CrearAlumnoBody = z.input<typeof crearAlumnoBody>;
export type CrearAlumnoInput = z.output<typeof crearAlumnoBody>;
export type EditarAlumnoBody = z.input<typeof editarAlumnoBody>;
export type EditarAlumnoInput = z.output<typeof editarAlumnoBody>;
export type ListarAlumnosQuery = z.output<typeof listarAlumnosQuery>;
export type PosiblesDuplicadosQuery = z.output<typeof posiblesDuplicadosQuery>;


// ─── 4. Response ─────────────────────────────────────────────────────────
// `legajo` lo genera la base (ALU-000123): no se manda en el body, vuelve en la
// response. Por eso el front pinta lo que devolvió la API y no su borrador.
// El responsable viaja agrupado en un objeto (o null): las tres columnas de la
// base son un solo concepto en pantalla.

export type NivelEducativo = "Primario" | "Secundario" | "Universitario";
export type EstadoAlumno = "activo" | "inactivo";

export type AlumnoResponse = {
  id: number;
  /** Generado por la base: "ALU-000123". */
  legajo: string;
  nombre: string;
  apellido: string;
  dni: string;
  /** "yyyy-mm-dd" */
  fechaNacimiento: string;
  telefono: string;
  email: string | null;
  nivelEducativo: NivelEducativo;
  responsable: { nombre: string; dni: string; telefono: string } | null;
  estado: EstadoAlumno;
  /** ISO 8601. */
  fechaCreacion: string;
  /** ISO 8601. */
  fechaActualizacion: string;
};

/** Lo que devuelve el combo de alumnos (alta de turno). */
export type AlumnoOpcion = Pick<AlumnoResponse, "id" | "legajo" | "nombre" | "apellido">;


// ─── 5. Errores de dominio ───────────────────────────────────────────────

export type ErrorAlumno =
  | "DNI_DUPLICADO"              // 409, uq_alumno_dni_activo
  | "RESPONSABLE_REQUERIDO"      // 422, menor de 18 sin datos del responsable
  | "FECHA_NACIMIENTO_INVALIDA"  // 422, futura
  | "ALUMNO_CON_TURNOS_FUTUROS"  // 409, al inactivar
  | "NO_ENCONTRADO"              // 404
  | "DATOS_INVALIDOS";           // 422
