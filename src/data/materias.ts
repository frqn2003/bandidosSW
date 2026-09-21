// Capa de datos de Materias (HU-MAT-01) — front hardcodeado.
//
// La pantalla NO ve este array: habla con las funciones de abajo, que ya tienen
// la firma final (async, tipos del contrato, errores del contrato). El día que
// el back publique los endpoints, el cuerpo de cada función pasa a una línea de
// `apiGet`/`apiSend` y la pantalla no se toca.
//
// El patrón completo y la checklist para las próximas HUs están en
// docs/capa-de-datos-front.md.
//
// Contrato: src/contracts/materia.ts · Guía de uso: docs/contratos/materia.md

import {
  RUTA,
  rutaInactivar,
  rutaMateria,
  type CrearMateriaBody,
  type DuracionClase,
  type EditarMateriaBody,
  type ListarMateriasQuery,
  type MateriaResponse,
  type NivelMateria,
} from "@/contracts/materia";
import { ApiError } from "@/lib/api-client";

export type { DuracionClase, MateriaResponse, NivelMateria };
export type EstadoMateria = MateriaResponse["estado"];

// Las rutas del contrato se re-exportan para que la pantalla no las importe de
// dos lados distintos; hoy solo las usan los comentarios `// BACKEND:`.
export { RUTA, rutaInactivar, rutaMateria };


// ─── Helpers de presentación ─────────────────────────────────────────────

/** Niveles del enum `nivel_materia` de la base, para combos y filtros. */
export const NIVELES: NivelMateria[] = ["Primario", "Secundario", "Universitario"];

/**
 * Código abreviado de la materia.
 *
 * NO es una columna de la base: se deriva del `id`, con la misma convención que
 * `alumno.legajo` (ALU-000123) y `turno.codigo` (TUR-000123), que sí son
 * columnas generadas.
 * BACKEND: si la DBA agrega una columna generada `codigo` a `materia`, este
 * helper se reemplaza por el campo del Response.
 */
export const codigoMateria = (id: number) => `MAT-${String(id).padStart(6, "0")}`;

/** Formato de importe es-AR con 2 decimales: 12500 → "$ 12.500,00". */
export const formatearValor = (valor: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);

/** Fecha ISO → "15 mar 2026". */
export const formatearFecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

/**
 * Normaliza un nombre para comparar duplicados igual que la base:
 * `uq_materia_nombre_activa` es UNIQUE sobre `lower(btrim(nombre))` WHERE
 * estado = 'activo'. Ojo: `lower()` de Postgres NO ignora tildes, así que acá
 * tampoco se ignoran.
 */
export const normalizarNombre = (nombre: string) => nombre.trim().toLowerCase();


// ─── Fixture: lo único que desaparece el día del back ────────────────────

const FIXTURE: MateriaResponse[] = [
  {
    id: 1,
    nombre: "Álgebra Lineal",
    nivel: "Universitario",
    descripcion: "Matrices, determinantes y espacios vectoriales.",
    duracionClaseMinutos: 90,
    valorClase: 12500.0,
    estado: "activo",
    fechaCreacion: "2026-03-01T12:00:00.000Z",
    fechaActualizacion: "2026-03-01T12:00:00.000Z",
  },
  {
    id: 2,
    nombre: "Análisis Matemático I",
    nivel: "Universitario",
    descripcion: "Límites, derivadas e integrales de una variable.",
    duracionClaseMinutos: 90,
    valorClase: 12500.0,
    estado: "activo",
    fechaCreacion: "2026-03-01T12:30:00.000Z",
    fechaActualizacion: "2026-03-12T10:15:00.000Z",
  },
  {
    id: 3,
    nombre: "Física I",
    nivel: "Secundario",
    descripcion: "Cinemática y dinámica.",
    duracionClaseMinutos: 60,
    valorClase: 9000.0,
    estado: "activo",
    fechaCreacion: "2026-03-02T12:00:00.000Z",
    fechaActualizacion: "2026-03-02T12:00:00.000Z",
  },
  {
    id: 4,
    nombre: "Matemática",
    nivel: "Secundario",
    descripcion: null,
    duracionClaseMinutos: 60,
    valorClase: 8500.0,
    estado: "activo",
    fechaCreacion: "2026-03-03T09:00:00.000Z",
    fechaActualizacion: "2026-03-10T09:30:00.000Z",
  },
  {
    id: 5,
    nombre: "Química General",
    nivel: "Universitario",
    descripcion: "Estructura atómica, enlaces y estequiometría.",
    duracionClaseMinutos: 120,
    valorClase: 14000.0,
    estado: "activo",
    fechaCreacion: "2026-03-04T11:00:00.000Z",
    fechaActualizacion: "2026-03-04T11:00:00.000Z",
  },
  {
    id: 6,
    nombre: "Lengua y Literatura",
    nivel: "Primario",
    descripcion: "Comprensión lectora y producción escrita.",
    duracionClaseMinutos: 45,
    valorClase: 7200.0,
    estado: "inactivo",
    fechaCreacion: "2026-02-20T12:00:00.000Z",
    fechaActualizacion: "2026-03-15T16:00:00.000Z",
  },
  {
    id: 7,
    nombre: "Inglés Inicial",
    nivel: "Primario",
    descripcion: "Vocabulario básico y conversación guiada.",
    duracionClaseMinutos: 30,
    valorClase: 6000.0,
    estado: "inactivo",
    fechaCreacion: "2026-02-22T12:00:00.000Z",
    fechaActualizacion: "2026-03-18T14:20:00.000Z",
  },
];

/**
 * Turnos futuros con estado "Reservado" por materia.
 * BACKEND: lo resuelve el service al inactivar (error MATERIA_CON_TURNOS_FUTUROS).
 * Acá alimenta el aviso previo del modal de baja.
 */
const TURNOS_FUTUROS_POR_MATERIA: Record<number, number> = { 2: 3 };

/** Copia del fixture que muta en memoria mientras no haya API. */
let memoria: MateriaResponse[] = FIXTURE.map((m) => ({ ...m }));

/** Latencia simulada, para que los estados de carga se vean de verdad. */
const DEMORA_MS = 300;
const demorar = () => new Promise((r) => setTimeout(r, DEMORA_MS));

/** `?demo=error` fuerza el estado de error del listado, sin backend. */
const fallaForzada = () =>
  typeof window !== "undefined" && window.location.search.includes("demo=error");

const buscarEnMemoria = (id: number) => memoria.find((m) => m.id === id);

/** Cuántos turnos futuros reservados tiene la materia (0 si no tiene). */
export const turnosFuturosDe = (id: number) => TURNOS_FUTUROS_POR_MATERIA[id] ?? 0;


// ─── API del módulo (firma final: no cambia cuando entra el back) ────────

/**
 * Listado de materias.
 *
 * BACKEND: `return apiGet<MateriaResponse[]>(\`${RUTA}?${new URLSearchParams(...)}\`)`
 * — los filtros son los de `listarMateriasQuery` del contrato.
 */
export async function listarMaterias(
  filtros: ListarMateriasQuery = {},
): Promise<MateriaResponse[]> {
  await demorar();
  if (fallaForzada()) {
    throw new ApiError("ERROR_DESCONOCIDO", "No se pudo cargar el listado.", undefined, 500);
  }

  const busqueda = filtros.busqueda?.trim().toLowerCase() ?? "";
  return memoria
    .filter((m) => {
      if (filtros.estado && m.estado !== filtros.estado) return false;
      if (filtros.nivel && m.nivel !== filtros.nivel) return false;
      if (busqueda && !m.nombre.toLowerCase().includes(busqueda)) return false;
      return true;
    })
    .map((m) => ({ ...m }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es-AR"));
}

/**
 * Alta.
 * BACKEND: `return apiSend<MateriaResponse>("POST", RUTA, body)`.
 */
export async function crearMateria(body: CrearMateriaBody): Promise<MateriaResponse> {
  await demorar();
  exigirNombreLibre(body.nombre);

  // El `id` y las fechas los pone la base: acá se simulan.
  const ahora = new Date().toISOString();
  const creada: MateriaResponse = {
    id: memoria.reduce((max, m) => Math.max(max, m.id), 0) + 1,
    ...normalizarBody(body),
    estado: "activo", // default de la columna `estado`
    fechaCreacion: ahora,
    fechaActualizacion: ahora,
  };
  memoria = [...memoria, creada];
  return { ...creada };
}

/**
 * Edición.
 * BACKEND: `return apiSend<MateriaResponse>("PUT", rutaMateria(id), body)`.
 */
export async function editarMateria(
  id: number,
  body: EditarMateriaBody,
): Promise<MateriaResponse> {
  await demorar();
  const actual = exigirMateria(id);
  exigirNombreLibre(body.nombre, id);

  const editada: MateriaResponse = {
    ...actual,
    ...normalizarBody(body),
    fechaActualizacion: new Date().toISOString(),
  };
  memoria = memoria.map((m) => (m.id === id ? editada : m));
  return { ...editada };
}

/**
 * Baja lógica.
 * BACKEND: `return apiSend<MateriaResponse>("POST", rutaInactivar(id))`.
 */
export async function inactivarMateria(id: number): Promise<MateriaResponse> {
  await demorar();
  const actual = exigirMateria(id);

  if (turnosFuturosDe(id) > 0) {
    throw new ApiError(
      "MATERIA_CON_TURNOS_FUTUROS",
      "No se puede dar de baja: hay turnos reservados de esta materia.",
      undefined,
      409,
    );
  }

  // `fechaActualizacion` la pone el trigger trg_materia_updated_at.
  const baja: MateriaResponse = {
    ...actual,
    estado: "inactivo",
    fechaActualizacion: new Date().toISOString(),
  };
  memoria = memoria.map((m) => (m.id === id ? baja : m));
  return { ...baja };
}

/**
 * Reactivación de una materia inactiva.
 *
 * PENDIENTE CONTRATO: `src/contracts/materia.ts` tiene `rutaInactivar` pero no
 * una ruta para volver a activar, y `editarMateriaBody` no incluye `estado`
 * (el estado no es un campo del formulario para el back). Como la HU-MAT-01 sí
 * pide el switch Activo/Inactivo, acá queda implementado contra el fixture y
 * marcado: antes de conectar hay que acordar con el back
 * `POST /api/materias/:id/activar` (o que el body de edición acepte `estado`)
 * y agregarlo al contrato PRIMERO.
 */
export async function reactivarMateria(id: number): Promise<MateriaResponse> {
  await demorar();
  const actual = exigirMateria(id);
  exigirNombreLibre(actual.nombre, id); // al volver a activa, el UNIQUE aplica

  const activa: MateriaResponse = {
    ...actual,
    estado: "activo",
    fechaActualizacion: new Date().toISOString(),
  };
  memoria = memoria.map((m) => (m.id === id ? activa : m));
  return { ...activa };
}


// ─── Interno: lo que el día de mañana hace el service del back ───────────

/** El body llega con `descripcion` opcional (default null en el contrato). */
function normalizarBody(body: CrearMateriaBody | EditarMateriaBody) {
  return {
    nombre: body.nombre.trim(),
    nivel: body.nivel as NivelMateria,
    descripcion: body.descripcion ?? null,
    duracionClaseMinutos: body.duracionClaseMinutos as DuracionClase,
    valorClase: body.valorClase,
  };
}

function exigirMateria(id: number): MateriaResponse {
  const materia = buscarEnMemoria(id);
  if (!materia) {
    throw new ApiError("NO_ENCONTRADO", `No se encontró la materia con id ${id}.`, undefined, 404);
  }
  return materia;
}

/** uq_materia_nombre_activa: único entre ACTIVAS, comparando lower(btrim(...)). */
function exigirNombreLibre(nombre: string, idQueSeEdita?: number): void {
  const buscado = normalizarNombre(nombre);
  const chocado = memoria.some(
    (m) => m.estado === "activo" && m.id !== idQueSeEdita && normalizarNombre(m.nombre) === buscado,
  );
  if (chocado) {
    throw new ApiError(
      "NOMBRE_DUPLICADO",
      "Ya existe una materia activa con ese nombre.",
      "nombre",
      409,
    );
  }
}


// ─── Copys de los estados vacíos ─────────────────────────────────────────

export const VACIO_COPY = {
  sinDatos: {
    title: "Todavía no hay materias cargadas",
    description:
      "Creá la primera materia para poder asignarla a un profesor y reservar turnos.",
    cta: "Nueva materia",
  },
  sinResultados: {
    title: "Ninguna materia coincide con los filtros",
    description:
      "Probá con otro nombre, cambiá el nivel o mostrá también las inactivas.",
    cta: "Borrar filtros",
  },
};
