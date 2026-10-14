// src/data/portal.ts
//
// Capa de datos del Portal del Alumno (HU-POR-01).
//
// Consume los endpoints de la API mediante el cliente HTTP tipado con el contrato.
// Contratos: src/contracts/portal.ts y src/contracts/alumno.ts · Guía: docs/contratos/portal.md
//
// El alumno nunca viaja en la request: el back lo toma de la sesión.

import {
  RUTA_TURNOS,
  RUTA_MATERIAS,
  RUTA_PROFESORES,
  RUTA_HUECOS,
  type MisTurnosResponse,
  type TurnoPortalResponse,
  type MateriaPortalResponse,
  type ProfesorPortalResponse,
  type ReservarTurnoPortalBody,
} from "@/contracts/portal";
import type { HuecoResponse } from "@/contracts/calendario";
import {
  rutaHabilitarPortal,
  type HabilitarPortalResponse,
} from "@/contracts/alumno";
import { sumarDias } from "@/funciones/fechas-calendario";
import { apiGet, apiSend } from "@/lib/api-client";

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

/** Un horario que el alumno puede elegir en el combo. */
export type HorarioPortal = { horaInicio: string; horaFin: string };

/**
 * Turnos del alumno logueado. Sin `verHistorial`: próximos "Reservado", ascendente.
 * Con `verHistorial = true`: todos (pasados y cancelados), descendente.
 */
export async function obtenerMisTurnos(verHistorial = false): Promise<MisTurnosResponse> {
  return apiGet<MisTurnosResponse>(`${RUTA_TURNOS}?verHistorial=${verHistorial}`);
}

/**
 * Reserva para el alumno de la sesión. Errores: los de HU-TUR-01 y
 * LIMITE_TURNOS_FUTUROS (con `datos.limite`).
 */
export async function reservarTurnoPortal(
  body: ReservarTurnoPortalBody
): Promise<TurnoPortalResponse> {
  return apiSend<TurnoPortalResponse>("POST", RUTA_TURNOS, body);
}

/** Materias que el alumno puede reservar. */
export async function listarMateriasPortal(): Promise<MateriaPortalResponse[]> {
  return apiGet<MateriaPortalResponse[]>(RUTA_MATERIAS);
}

/** Profesores activos que dictan la materia. */
export async function listarProfesoresPortal(materiaId: number): Promise<ProfesorPortalResponse[]> {
  return apiGet<ProfesorPortalResponse[]>(`${RUTA_PROFESORES}?materiaId=${materiaId}`);
}

/**
 * Horarios libres de un profesor en una fecha para una clase de `duracionMinutos`,
 * a partir de los huecos de la agenda (`RUTA_HUECOS`, sin precios ni datos de
 * otros alumnos). Cada hueco se parte en inicios cada 30 minutos donde entra la
 * clase completa. Cupo, anticipación y fecha bloqueada los vuelve a validar el back.
 */
export async function listarHorariosPortal(
  profesorId: number,
  fecha: string,
  duracionMinutos: number,
): Promise<HorarioPortal[]> {
  const params = new URLSearchParams({
    profesorId: String(profesorId),
    desde: fecha,
    hasta: fecha,
    duracionMinutos: String(duracionMinutos),
  });
  const huecos = await apiGet<HuecoResponse[]>(`${RUTA_HUECOS}?${params.toString()}`);

  const horarios: HorarioPortal[] = [];
  for (const h of huecos) {
    for (let inicio = aMin(h.horaInicio); inicio + duracionMinutos <= aMin(h.horaFin); inicio += 30) {
      horarios.push({ horaInicio: aHora(inicio), horaFin: aHora(inicio + duracionMinutos) });
    }
  }
  return horarios;
}

export interface SugerenciaPortal {
  fecha: string;
  horaInicio: string;
  horaFin: string;
  cuposDisponibles?: number;
  capacidad?: number;
}

/**
 * Próximo horario libre para una materia y profesor en el portal del alumno.
 * Consulta RUTA_HUECOS en un rango de hasta 60 días desde `desde` y devuelve
 * el primer hueco que admite la clase respetando la anticipación mínima de 2 horas.
 */
export async function sugerirProximoHorarioPortal(
  profesorId: number,
  materiaId: number,
  duracionMinutos: number,
  desde: string,
): Promise<SugerenciaPortal | null> {
  const hoy = new Date().toISOString().slice(0, 10);
  const fechaDesde = !desde || desde < hoy ? hoy : desde;
  const hasta = sumarDias(fechaDesde, 60);

  const params = new URLSearchParams({
    profesorId: String(profesorId),
    materiaId: String(materiaId),
    desde: fechaDesde,
    hasta,
    duracionMinutos: String(duracionMinutos),
  });

  const huecos = await apiGet<HuecoResponse[]>(`${RUTA_HUECOS}?${params.toString()}`).catch(() => []);
  if (!huecos || huecos.length === 0) {
    if (fechaDesde > hoy) {
      return sugerirProximoHorarioPortal(profesorId, materiaId, duracionMinutos, hoy);
    }
    return null;
  }

  const ahora = Date.now();
  const limiteAnticipacion = ahora + 2 * 3_600_000;

  for (const h of huecos) {
    const finHueco = aMin(h.horaFin);
    for (let ini = aMin(h.horaInicio); ini + duracionMinutos <= finHueco; ini += 30) {
      const fechaHora = new Date(`${h.fecha}T${aHora(ini)}:00`).getTime();
      if (fechaHora < limiteAnticipacion) continue;

      return {
        fecha: h.fecha,
        horaInicio: aHora(ini),
        horaFin: aHora(ini + duracionMinutos),
        cuposDisponibles: 5,
        capacidad: 5,
      };
    }
  }

  if (fechaDesde > hoy) {
    return sugerirProximoHorarioPortal(profesorId, materiaId, duracionMinutos, hoy);
  }

  return null;
}

/** Habilita el acceso al portal desde la ficha del alumno (Mesa de Entrada / Gerente). */
export async function habilitarAccesoPortal(alumnoId: number): Promise<HabilitarPortalResponse> {
  return await apiSend<HabilitarPortalResponse>("POST", rutaHabilitarPortal(alumnoId), {});
}

const aMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

const aHora = (min: number) =>
  `${String(Math.floor(min / 60) % 24).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
