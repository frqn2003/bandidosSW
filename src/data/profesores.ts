// Capa de datos de Cuerpo Docente (HU-PRO-01).
//
// Consume los endpoints de la API mediante el cliente HTTP tipado con el contrato.
// Contrato: src/contracts/profesor.ts · Guía de uso: docs/contratos/profesor.md
//
// La disponibilidad horaria NO es parte del contrato de profesor: vive en
// src/contracts/disponibilidad.ts (tabla agenda_profesional) y se pide aparte,
// por profesor. Acá se ofrece la lectura (`listarBloquesDe`) porque la tabla, la
// ficha y la agenda necesitan la carga horaria semanal.

import {
  RUTA,
  rutaCandidatos,
  rutaInactivar,
  rutaProfesor,
  type CandidatoProfesorResponse,
  type CrearProfesorBody,
  type EditarProfesorBody,
  type EstadoProfesor,
  type ListarProfesoresQuery,
  type MateriaDictadaResponse,
  type NivelMateria,
  type ProfesorResponse,
} from "@/contracts/profesor";
import {
  RUTA as RUTA_MATERIAS,
  type MateriaResponse,
} from "@/contracts/materia";
import {
  RUTA as RUTA_DISPONIBILIDAD,
  type BloqueDisponibilidadResponse,
} from "@/contracts/disponibilidad";
import { apiGet, apiGetOpcional, apiSend } from "@/lib/api-client";

export type {
  CandidatoProfesorResponse,
  EstadoProfesor,
  MateriaDictadaResponse,
  NivelMateria,
  ProfesorResponse,
};

// Las rutas del contrato se re-exportan para que la pantalla no las importe de
// dos lados distintos.
export { RUTA, rutaCandidatos, rutaInactivar, rutaProfesor };


// ─── Modelo de la pantalla ───────────────────────────────────────────────
// `ProfesorResponse` trae al usuario anidado y no sabe nada de disponibilidad.
// La tabla, la ficha y la agenda trabajan con esta vista plana, que junta las
// dos cosas. La traducción vive acá (`aProfesor`) y en ningún componente.

export interface MateriaRef {
  id: number; // materia.id
  nombre: string;
  nivel: NivelMateria;
  duracionClaseMinutos: number;
  /**
   * Precio por clase que va a `precio_clase.precio` al guardar.
   * Del catálogo sale `materia.valor_clase`; de la ficha de un profesor sale el
   * precio que ya tenía asignado, que es el que se respeta al editar.
   */
  valorClase: number;
}

export interface MateriaAsignada {
  /** profesor_materia.id */
  profesorMateriaId: number;
  materia: MateriaRef;
  capacidadMaxima: number; // profesor_materia.capacidad_maxima (1-10)
  precio: number; // precio_clase.precio
}

export interface Profesor {
  id: number; // profesor.id
  usuarioId: number; // FK → usuario.id (rol Profesor, UNIQUE 1 a 1)
  nombre: string; // usuario.nombre
  apellido: string; // usuario.apellido
  email: string; // usuario.email
  telefono: string; // profesor.telefono ^[0-9]{10,11}$
  tituloEspecialidad: string | null; // profesor.titulo_especialidad varchar(100)
  materias: MateriaAsignada[];
  estado: EstadoProfesor; // profesor.estado
  fechaCreacion: string; // "YYYY-MM-DD", para "Alta en sistema"

  /** Resumen semanal armado desde `agenda_profesional` (ver `listarBloquesDe`). */
  bloquesPorDia: Record<number, string[]>;

  // ── Campos de las tarjetas de estadísticas de la ficha ─────────────────
  // Todavía no hay endpoint de turnos (src/contracts/turno.ts está escrito, la
  // ruta no existe): quedan sin valor y la ficha muestra "—".
  turnosProgramados?: number;
  presentismo?: number; // porcentaje (0-100)

  /** Capacidad global elegida en el formulario; en la base vive por materia. */
  capacidadDefault?: number;
}

/** Usuario con rol Profesor, activo y sin ficha (Combobox "Usuario asociado"). */
export interface UsuarioSinFicha {
  id: number; // usuario.id
  nombre: string;
  apellido: string;
  email: string;
}

/** `ProfesorResponse` + sus bloques → la vista que consumen los componentes. */
export function aProfesor(
  resp: ProfesorResponse,
  bloquesPorDia: Record<number, string[]> = {},
): Profesor {
  const materias = resp.materias.map(
    (m): MateriaAsignada => ({
      profesorMateriaId: m.id,
      materia: {
        id: m.materia.id,
        nombre: m.materia.nombre,
        nivel: m.materia.nivel,
        duracionClaseMinutos: m.materia.duracionClaseMinutos,
        valorClase: m.precio,
      },
      capacidadMaxima: m.capacidadMaxima,
      precio: m.precio,
    }),
  );

  return {
    id: resp.id,
    usuarioId: resp.usuario.id,
    nombre: resp.usuario.nombre,
    apellido: resp.usuario.apellido,
    email: resp.usuario.email,
    telefono: resp.telefono,
    tituloEspecialidad: resp.tituloEspecialidad,
    materias,
    estado: resp.estado,
    // La API manda ISO 8601 completo; la ficha muestra solo la fecha.
    fechaCreacion: resp.fechaCreacion.slice(0, 10),
    bloquesPorDia,
    capacidadDefault:
      materias.length > 0 ? Math.max(...materias.map((m) => m.capacidadMaxima)) : undefined,
  };
}

/** Bloques de `agenda_profesional` → `{ 1: ["08:00-12:00"], … }`. */
export function bloquesPorDiaDesde(
  bloques: BloqueDisponibilidadResponse[],
): Record<number, string[]> {
  const porDia: Record<number, string[]> = {};
  for (const b of bloques) {
    if (b.estado !== "activo") continue;
    (porDia[b.diaSemana] ??= []).push(`${b.horaInicio}-${b.horaFin}`);
  }
  for (const rangos of Object.values(porDia)) rangos.sort();
  return porDia;
}


// ─── API del módulo ──────────────────────────────────────────────────────

/**
 * Listado de profesores con los filtros del contrato.
 *
 * Los filtros estructurales (materia, día, estado) van al servidor: el día sale
 * de `agenda_profesional`, que el front no tiene cargada. La búsqueda por texto
 * se resuelve en memoria sobre el resultado, para no pegarle a la API en cada
 * tecla.
 */
export async function listarProfesores(
  filtros: ListarProfesoresQuery = {},
): Promise<ProfesorResponse[]> {
  const params = new URLSearchParams();
  if (filtros.busqueda) params.set("busqueda", filtros.busqueda);
  if (filtros.materiaId) params.set("materiaId", String(filtros.materiaId));
  if (filtros.academiaId) params.set("academiaId", String(filtros.academiaId));
  if (filtros.diaSemana) params.set("diaSemana", String(filtros.diaSemana));
  if (filtros.estado) params.set("estado", filtros.estado);
  const qs = params.toString();
  return apiGet<ProfesorResponse[]>(qs ? `${RUTA}?${qs}` : RUTA);
}

/** Detalle de un profesor con sus materias y precios. */
export async function obtenerProfesor(id: number): Promise<ProfesorResponse> {
  return apiGet<ProfesorResponse>(rutaProfesor(id));
}

/** Alta de la ficha profesional (usuario existente con rol Profesor). */
export async function crearProfesor(body: CrearProfesorBody): Promise<ProfesorResponse> {
  return apiSend<ProfesorResponse>("POST", RUTA, body);
}

/** Edición de la ficha. `materias` es la lista completa: reemplaza a la anterior. */
export async function editarProfesor(
  id: number,
  body: EditarProfesorBody,
): Promise<ProfesorResponse> {
  return apiSend<ProfesorResponse>("PUT", rutaProfesor(id), body);
}

/** Baja lógica. Devuelve 409 PROFESOR_CON_TURNOS_FUTUROS si tiene turnos reservados. */
export async function inactivarProfesor(id: number): Promise<ProfesorResponse> {
  return apiSend<ProfesorResponse>("POST", rutaInactivar(id));
}

/**
 * Usuarios con rol Profesor, activos y sin ficha (combo del alta).
 * Catálogo: si falla, el resto de la pantalla sigue funcionando.
 */
export async function listarCandidatos(): Promise<UsuarioSinFicha[]> {
  const candidatos = await apiGetOpcional<CandidatoProfesorResponse[]>(rutaCandidatos, []);
  return candidatos.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    apellido: c.apellido,
    email: c.email,
  }));
}

/** Catálogo de materias activas (filtro del listado y checkboxes del formulario). */
export async function listarMateriasCatalogo(): Promise<MateriaRef[]> {
  const materias = await apiGetOpcional<MateriaResponse[]>(
    `${RUTA_MATERIAS}?estado=activo`,
    [],
  );
  return materias.map((m) => ({
    id: m.id,
    nombre: m.nombre,
    nivel: m.nivel,
    duracionClaseMinutos: m.duracionClaseMinutos,
    valorClase: m.valorClase,
  }));
}

/**
 * Bloques de disponibilidad activos de UN profesor.
 *
 * Contrato aparte (src/contracts/disponibilidad.ts) y un pedido por profesor:
 * `listarDisponibilidadQuery` exige `profesorId`. La pantalla los trae solo para
 * las filas visibles.
 */
export async function listarBloquesDe(
  profesorId: number,
): Promise<BloqueDisponibilidadResponse[]> {
  return apiGetOpcional<BloqueDisponibilidadResponse[]>(
    `${RUTA_DISPONIBILIDAD}?profesorId=${profesorId}&estado=activo`,
    [],
  );
}

/**
 * Turnos futuros reservados del profesor, para avisar antes de dar de baja.
 * No hay endpoint todavía: la validación real es el 409
 * PROFESOR_CON_TURNOS_FUTUROS que devuelve `inactivarProfesor`.
 */
export function turnosFuturosDe(profesorId?: number): number {
  void profesorId;
  return 0;
}


// ─── Datos demo que todavía no tienen endpoint ───────────────────────────
// La grilla de AgendaSemanalModal muestra los turnos de la semana. El contrato
// de turnos existe (src/contracts/turno.ts) pero la ruta /api/turnos no, así que
// esta parte sigue hardcodeada hasta HU-TUR-01.

export interface TurnoSemana {
  id: number; // turno.id
  profesorId: number; // FK → profesor.id
  dia: number; // 1-6 (ISO, Lun-Sáb)
  horaInicio: string; // "HH:MM"
  alumno: string;
  materia: string;
  cuposUsados: number;
  cuposMax: number;
}

export const TURNOS_SEMANA: TurnoSemana[] = [
  { id: 1, profesorId: 1, dia: 1, horaInicio: "08:30", alumno: "Camila Ross", materia: "Análisis Matemático I", cuposUsados: 3, cuposMax: 4 },
  { id: 2, profesorId: 1, dia: 2, horaInicio: "08:30", alumno: "M. Fernández", materia: "Física II", cuposUsados: 1, cuposMax: 4 },
  { id: 3, profesorId: 1, dia: 3, horaInicio: "14:00", alumno: "Martina Paz", materia: "Análisis Matemático I", cuposUsados: 2, cuposMax: 4 },
  { id: 4, profesorId: 1, dia: 4, horaInicio: "08:30", alumno: "Joaquín Soler", materia: "Física I", cuposUsados: 4, cuposMax: 4 },
  { id: 5, profesorId: 1, dia: 5, horaInicio: "10:00", alumno: "L. Gutiérrez", materia: "Análisis Matemático I", cuposUsados: 3, cuposMax: 4 },
  { id: 6, profesorId: 1, dia: 5, horaInicio: "16:00", alumno: "Facundo Ortiz", materia: "Física II", cuposUsados: 2, cuposMax: 4 },
];

export const SEMANA_DEMO = {
  fechas: "21 al 26 de Octubre, 2025",
  horasDisponibles: 11.5, // horas reservables expuestas por la grilla demo
};


// ─── Copys de los estados vacíos ─────────────────────────────────────────

export const VACIO_COPY = {
  sinDatos: {
    title: "Todavía no hay docentes cargados",
    description:
      "Alta tu primer profesor para empezar a asignar materias y disponibilidad.",
    cta: "Nuevo profesor",
  },
  sinResultados: {
    title: "Ningún profesor coincide con los filtros",
    description: "Probá con otro nombre, cambiá la materia o el día, o mostrá también los inactivos.",
    cta: "Limpiar filtros",
  },
};
