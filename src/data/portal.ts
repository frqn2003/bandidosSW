// src/data/portal.ts
//
// Capa de datos del Portal del Alumno (HU-POR-01).
// Tipada con el contrato src/contracts/portal.ts y src/contracts/alumno.ts.
// Sigue el estándar docs/capa-de-datos-front.md y AGENTS.md.
// Cada función incluye comentarios // BACKEND: para swapear con los endpoints de la API.

import {
  RUTA_TURNOS,
  RUTA_MATERIAS,
  RUTA_PROFESORES,
  type MisTurnosResponse,
  type TurnoPortalResponse,
  type MateriaPortalResponse,
  type ProfesorPortalResponse,
  type ReservarTurnoPortalBody,
} from "@/contracts/portal";
import {
  rutaHabilitarPortal,
  type HabilitarPortalResponse,
} from "@/contracts/alumno";
import { ApiError, apiGet, apiSend } from "@/lib/api-client";
import { listarMaterias } from "@/data/materias";
import { listarProfesores } from "@/data/profesores";

export {
  RUTA_TURNOS,
  RUTA_MATERIAS,
  RUTA_PROFESORES,
  type MisTurnosResponse,
  type TurnoPortalResponse,
  type MateriaPortalResponse,
  type ProfesorPortalResponse,
  type ReservarTurnoPortalBody,
  type HabilitarPortalResponse,
};

const DEMORA_MS = 250;
const demorar = () => new Promise((resolve) => setTimeout(resolve, DEMORA_MS));

// ─── Fixtures de desarrollo para Portal del Alumno ───────────────────────────

let siguienteCodigoTurno = 124;

// Turnos iniciales del alumno en el portal
let turnosPortalMemoria: TurnoPortalResponse[] = [
  {
    id: 101,
    codigo: "TUR-000101",
    fecha: "2026-10-18",
    horaInicio: "15:00",
    horaFin: "16:00",
    materia: { id: 1, nombre: "Matemática" },
    profesor: { id: 3, nombre: "Roberto", apellido: "Peralta" },
    estado: "Reservado",
    observaciones: "Repaso de derivadas y límites",
    fechaCreacion: "2026-10-10T14:20:00.000Z",
  },
  {
    id: 102,
    codigo: "TUR-000102",
    fecha: "2026-10-22",
    horaInicio: "17:00",
    horaFin: "18:00",
    materia: { id: 2, nombre: "Física" },
    profesor: { id: 4, nombre: "Martín", apellido: "Gómez" },
    estado: "Reservado",
    observaciones: "Cinemática y movimiento uniforme",
    fechaCreacion: "2026-10-11T09:15:00.000Z",
  },
  {
    id: 95,
    codigo: "TUR-000095",
    fecha: "2026-10-05",
    horaInicio: "10:00",
    horaFin: "11:00",
    materia: { id: 1, nombre: "Matemática" },
    profesor: { id: 3, nombre: "Roberto", apellido: "Peralta" },
    estado: "Asistió",
    observaciones: "Ecuaciones cuadráticas",
    fechaCreacion: "2026-10-01T11:00:00.000Z",
  },
  {
    id: 90,
    codigo: "TUR-000090",
    fecha: "2026-09-28",
    horaInicio: "16:00",
    horaFin: "17:00",
    materia: { id: 4, nombre: "Inglés" },
    profesor: { id: 1, nombre: "Juan", apellido: "Pérez" },
    estado: "Ausente",
    observaciones: "Inasistencia justificada",
    fechaCreacion: "2026-09-20T10:30:00.000Z",
  },
];

// Límite parametrizable (default 5, configurable por Gerente)
let limiteTurnosFuturosMemoria = 5;

// Variables para testing / auto-testing en vivo
let modoAlumnoInactivo = false;

export function setModoAlumnoInactivo(inactivo: boolean) {
  modoAlumnoInactivo = inactivo;
}

export function isModoAlumnoInactivo(): boolean {
  return modoAlumnoInactivo;
}

export function setLimiteTurnosFuturos(limite: number) {
  limiteTurnosFuturosMemoria = limite;
}

export function simularLlenarLimiteTurnos() {
  // Asegura tener 5 turnos futuros en estado Reservado
  const base = turnosPortalMemoria.filter((t) => t.estado === "Reservado");
  const faltantes = 5 - base.length;
  for (let i = 0; i < faltantes; i++) {
    const id = 110 + i;
    turnosPortalMemoria.unshift({
      id,
      codigo: `TUR-000${id}`,
      fecha: `2026-10-${24 + i}`,
      horaInicio: "16:00",
      horaFin: "17:00",
      materia: { id: 1, nombre: "Matemática" },
      profesor: { id: 3, nombre: "Roberto", apellido: "Peralta" },
      estado: "Reservado",
      observaciones: "Turno de prueba",
      fechaCreacion: new Date().toISOString(),
    });
  }
}

export function resetearTurnosPortalMemoria() {
  turnosPortalMemoria = turnosPortalMemoria.slice(0, 4);
}

// ─── API del Módulo Portal del Alumno ────────────────────────────────────────

/**
 * Consulta los turnos del alumno logueado (HU-POR-01).
 * Sin `verHistorial`, devuelve solo turnos futuros en estado "Reservado" (orden cronológico ascendente).
 * Con `verHistorial = true`, devuelve todos los turnos (futuros, pasados, asistencias, ausencias, cancelados)
 * ordenados por fecha y hora descendente.
 */
export async function obtenerMisTurnos(verHistorial = false): Promise<MisTurnosResponse> {
  try {
    // BACKEND: return await apiGet<MisTurnosResponse>(`${RUTA_TURNOS}?verHistorial=${verHistorial}`);
    const res = await apiGet<MisTurnosResponse>(`${RUTA_TURNOS}?verHistorial=${verHistorial}`);
    return res;
  } catch {
    await demorar();

    const hoy = new Date().toISOString().slice(0, 10);

    // Contar cuántos turnos futuros en estado "Reservado" posee
    const turnosFuturosReservados = turnosPortalMemoria.filter(
      (t) => t.estado === "Reservado" && t.fecha >= hoy
    ).length;

    let lista = [...turnosPortalMemoria];

    if (!verHistorial) {
      // Solo turnos futuros en estado Reservado, orden ASCENDENTE
      lista = lista
        .filter((t) => t.estado === "Reservado" && t.fecha >= hoy)
        .sort((a, b) => `${a.fecha}T${a.horaInicio}`.localeCompare(`${b.fecha}T${b.horaInicio}`));
    } else {
      // Todo el historial (pasados, cancelados, asistencias), orden DESCENDENTE
      lista.sort((a, b) => `${b.fecha}T${b.horaInicio}`.localeCompare(`${a.fecha}T${a.horaInicio}`));
    }

    return {
      turnos: lista,
      turnosFuturosReservados,
      limiteTurnosFuturos: limiteTurnosFuturosMemoria,
    };
  }
}

/**
 * Registra una nueva reserva de turno desde el portal del alumno (HU-POR-01).
 * Valida que no supere el límite de 5 turnos futuros en estado "Reservado".
 * El origen queda fijo como "Portal del Alumno" y el código generado es "TUR-000123".
 */
export async function reservarTurnoPortal(
  body: ReservarTurnoPortalBody
): Promise<TurnoPortalResponse> {
  try {
    // BACKEND: return await apiSend<TurnoPortalResponse>("POST", RUTA_TURNOS, body);
    return await apiSend<TurnoPortalResponse>("POST", RUTA_TURNOS, body);
  } catch {
    await demorar();

    const hoy = new Date().toISOString().slice(0, 10);
    const futuros = turnosPortalMemoria.filter(
      (t) => t.estado === "Reservado" && t.fecha >= hoy
    ).length;

    // Validación crítica del límite parametrizable
    if (futuros >= limiteTurnosFuturosMemoria) {
      throw new ApiError(
        "LIMITE_TURNOS_FUTUROS",
        `Alcanzaste el límite de ${limiteTurnosFuturosMemoria} turnos futuros reservados.`,
        undefined,
        409,
        { limite: limiteTurnosFuturosMemoria }
      );
    }

    // Obtener datos de materia y profesor
    const materias = await listarMateriasPortal();
    const profesores = await listarProfesoresPortal(body.materiaId);

    const mat = materias.find((m) => m.id === body.materiaId) ?? {
      id: body.materiaId,
      nombre: "Clase de Apoyo",
      nivel: "Secundario" as const,
      duracionClaseMinutos: 60,
    };

    const prof = profesores.find((p) => p.id === body.profesorId) ?? {
      id: body.profesorId,
      nombre: "Profesor",
      apellido: "Asignado",
    };

    const horaFin = calcularHoraFin(body.horaInicio, mat.duracionClaseMinutos);

    const nuevoTurno: TurnoPortalResponse = {
      id: siguienteCodigoTurno,
      codigo: `TUR-${String(siguienteCodigoTurno).padStart(6, "0")}`,
      fecha: body.fecha,
      horaInicio: body.horaInicio,
      horaFin,
      materia: { id: mat.id, nombre: mat.nombre },
      profesor: { id: prof.id, nombre: prof.nombre, apellido: prof.apellido },
      estado: "Reservado",
      observaciones: typeof body.observaciones === "string" ? body.observaciones : null,
      fechaCreacion: new Date().toISOString(),
    };

    siguienteCodigoTurno++;
    turnosPortalMemoria.unshift(nuevoTurno);

    return nuevoTurno;
  }
}

/**
 * Consulta el catálogo de materias activas reservables para el alumno.
 */
export async function listarMateriasPortal(): Promise<MateriaPortalResponse[]> {
  try {
    // BACKEND: return await apiGet<MateriaPortalResponse[]>(RUTA_MATERIAS);
    return await apiGet<MateriaPortalResponse[]>(RUTA_MATERIAS);
  } catch {
    await demorar();
    const mats = await listarMaterias({ estado: "activo" }).catch(() => []);
    if (mats.length > 0) {
      return mats.map((m) => ({
        id: m.id,
        nombre: m.nombre,
        nivel: m.nivel,
        duracionClaseMinutos: m.duracionClaseMinutos,
      }));
    }

    return [
      { id: 1, nombre: "Matemática", nivel: "Secundario", duracionClaseMinutos: 60 },
      { id: 2, nombre: "Física", nivel: "Secundario", duracionClaseMinutos: 60 },
      { id: 3, nombre: "Química", nivel: "Secundario", duracionClaseMinutos: 60 },
      { id: 4, nombre: "Inglés", nivel: "Secundario", duracionClaseMinutos: 60 },
      { id: 5, nombre: "Lengua", nivel: "Secundario", duracionClaseMinutos: 60 },
    ];
  }
}

/**
 * Consulta los profesores activos que dictan la materia especificada.
 */
export async function listarProfesoresPortal(materiaId: number): Promise<ProfesorPortalResponse[]> {
  try {
    // BACKEND: return await apiGet<ProfesorPortalResponse[]>(`${RUTA_PROFESORES}?materiaId=${materiaId}`);
    return await apiGet<ProfesorPortalResponse[]>(`${RUTA_PROFESORES}?materiaId=${materiaId}`);
  } catch {
    await demorar();
    const profs = await listarProfesores({ estado: "activo" }).catch(() => []);
    if (profs.length > 0) {
      const filtrados = profs.filter((p) => p.materias.some((m) => m.materia.id === materiaId));
      if (filtrados.length > 0) {
        return filtrados.map((p) => ({
          id: p.id,
          nombre: p.usuario.nombre,
          apellido: p.usuario.apellido,
        }));
      }
    }

    return [
      { id: 3, nombre: "Roberto", apellido: "Peralta" },
      { id: 4, nombre: "Martín", apellido: "Gómez" },
      { id: 1, nombre: "Juan", apellido: "Pérez" },
    ];
  }
}

/**
 * Habilitar acceso al portal para un alumno desde la administración (Mesa de Entrada o Gerente).
 * Requiere que la ficha tenga Email cargado y que no posea una cuenta previa activa.
 */
export async function habilitarAccesoPortal(alumnoId: number): Promise<HabilitarPortalResponse> {
  return await apiSend<HabilitarPortalResponse>("POST", rutaHabilitarPortal(alumnoId), {});
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calcularHoraFin(horaInicio: string, duracionMinutos: number): string {
  const [h, m] = horaInicio.split(":").map(Number);
  const totalMin = (h || 0) * 60 + (m || 0) + duracionMinutos;
  const resH = Math.floor(totalMin / 60) % 24;
  const resM = totalMin % 60;
  return `${String(resH).padStart(2, "0")}:${String(resM).padStart(2, "0")}`;
}
