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
  type CandidatoCreadoResponse,
  type CandidatoProfesorResponse,
  type CrearCandidatoBody,
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
  rutaInactivar as rutaInactivarBloque,
  type BloqueDisponibilidadResponse,
  type CrearBloqueBody,
} from "@/contracts/disponibilidad";
import {
  RUTA as RUTA_AGENDA,
  type AgendaResponse,
  type FranjaSemanalResponse,
} from "@/contracts/agenda";
import { ApiError, apiGet, apiGetOpcional, apiSend } from "@/lib/api-client";

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
  /** usuario.academia_id: define qué horario de atención (agenda) le aplica. */
  academiaId: number | null;

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
  academia: CandidatoProfesorResponse["academia"];
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
    academiaId: resp.academia?.id ?? null,
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
    academia: c.academia,
  }));
}

/**
 * Alta rápida de un usuario Profesor (solo Gerente). Devuelve el usuario ya
 * con la forma del combo y la contraseña temporal, que se muestra una sola vez.
 */
export async function crearCandidato(
  body: CrearCandidatoBody,
): Promise<{ usuario: UsuarioSinFicha; passwordTemporal: string }> {
  const r = await apiSend<CandidatoCreadoResponse>("POST", rutaCandidatos, body);
  return {
    usuario: { id: r.usuario.id, nombre: r.usuario.nombre, apellido: r.usuario.apellido, email: r.usuario.email, academia: r.usuario.academia },
    passwordTemporal: r.passwordTemporal,
  };
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
 * Franjas activas del horario de atención de la academia (`agenda_semanal`).
 * Sin academia se usa la agenda por defecto del centro.
 */
async function franjasDeAtencion(academiaId: number | null): Promise<FranjaSemanalResponse[]> {
  const agenda = await obtenerAgendaAcademia(academiaId);
  return agenda.estado === "activo" ? agenda.franjas.filter((f) => f.estado === "activo") : [];
}

export async function obtenerAgendaAcademia(academiaId: number | null): Promise<AgendaResponse> {
  if (!academiaId) {
    throw new ApiError("USUARIO_SIN_ACADEMIA", "El profesor no tiene una academia asignada.", "franjas", 422);
  }
  return apiGet<AgendaResponse>(`${RUTA_AGENDA}?academiaId=${academiaId}`);
}

/**
 * Guarda la disponibilidad semanal de un profesor: deja en `agenda_profesional`
 * exactamente los rangos de `bloquesPorDia`.
 *
 * Compara contra los bloques activos de la base: los que no cambiaron quedan,
 * los que sobran se inactivan (primero, para no chocar con el EXCLUDE de
 * superposición) y los nuevos se crean colgados de la franja de atención que
 * los contiene (`agendaSemanalId`). Devuelve el resumen tal como quedó en la base.
 */
export async function guardarDisponibilidad(
  profesorId: number,
  academiaId: number | null,
  bloquesPorDia: Record<number, string[]>,
): Promise<Record<number, string[]>> {
  const [actuales, franjas] = await Promise.all([
    apiGet<BloqueDisponibilidadResponse[]>(
      `${RUTA_DISPONIBILIDAD}?profesorId=${profesorId}&estado=activo`,
    ),
    franjasDeAtencion(academiaId),
  ]);

  const clave = (dia: number, inicio: string, fin: string) => `${dia}|${inicio}|${fin}`;
  const deseados = new Map<string, { dia: number; horaInicio: string; horaFin: string }>();
  for (const [dia, rangos] of Object.entries(bloquesPorDia)) {
    for (const rango of rangos) {
      const [horaInicio, horaFin] = rango.split("-");
      deseados.set(clave(Number(dia), horaInicio, horaFin), { dia: Number(dia), horaInicio, horaFin });
    }
  }

  const sobrantes = actuales.filter(
    (b) => !deseados.delete(clave(b.diaSemana, b.horaInicio, b.horaFin)),
  );

  // Se resuelve la franja de cada bloque nuevo ANTES de tocar la base: si alguno
  // cae fuera del horario de atención, no se guarda nada a medias.
  const nuevos: CrearBloqueBody[] = [...deseados.values()].map((d) => {
    const franja = franjas.find(
      (f) => f.diaSemana === d.dia && f.horaInicio <= d.horaInicio && f.horaFin >= d.horaFin,
    );
    if (!franja) {
      throw new ApiError(
        "FUERA_DE_HORARIO_ATENCION",
        `El bloque ${d.horaInicio}-${d.horaFin} del ${DIAS_LARGOS[d.dia - 1] ?? "día " + d.dia} queda fuera del horario de atención de la sede.`,
        "franjas",
        422,
      );
    }
    return { profesorId, agendaSemanalId: franja.id, horaInicio: d.horaInicio, horaFin: d.horaFin };
  });

  // BACKEND: POST /api/disponibilidad/:id/inactivar (baja lógica, no hay DELETE).
  for (const b of sobrantes) {
    await apiSend<BloqueDisponibilidadResponse>("POST", rutaInactivarBloque(b.id));
  }
  // BACKEND: POST /api/disponibilidad (uno por bloque; no hay alta en lote).
  const creados: BloqueDisponibilidadResponse[] = [];
  for (const body of nuevos) {
    creados.push(await apiSend<BloqueDisponibilidadResponse>("POST", RUTA_DISPONIBILIDAD, body));
  }

  const quedan = actuales.filter((b) => !sobrantes.includes(b));
  return bloquesPorDiaDesde([...quedan, ...creados]);
}

const DIAS_LARGOS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

/**
 * Turnos futuros reservados del profesor, para avisar antes de dar de baja.
 * No hay endpoint todavía: la validación real es el 409
 * PROFESOR_CON_TURNOS_FUTUROS que devuelve `inactivarProfesor`.
 */
export function turnosFuturosDe(profesorId?: number): number {
  void profesorId;
  return 0;
}


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
