// Capa de datos de Calendario de turnos (HU-CAL-01).
//
// Consume los endpoints de la API mediante el cliente HTTP tipado con el contrato.
// Contratos: src/contracts/calendario.ts · src/contracts/agenda.ts · src/contracts/profesor.ts
// Patrón: docs/capa-de-datos-front.md

import {
  RUTA_AGENDA,
  type AgendaDiaResponse,
  type HuecoResponse,
  type TurnoCalendarioResponse,
} from "@/contracts/calendario";
import { RUTA as RUTA_AGENDA_CENTRO, type AgendaResponse } from "@/contracts/agenda";
import {
  RUTA as RUTA_PROFESORES,
  type EstadoProfesor,
  type ProfesorResponse,
} from "@/contracts/profesor";
import { apiGet } from "@/lib/api-client";

export type { AgendaDiaResponse, HuecoResponse, TurnoCalendarioResponse };

// ─── Helpers de fecha/hora ────────────────────────────────────────────────

function aDate(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

function aISO(fecha: Date): string {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const d = String(fecha.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function aMin(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

function sumarDias(iso: string, dias: number): string {
  const f = aDate(iso);
  f.setDate(f.getDate() + dias);
  return aISO(f);
}

// ─── Modelo de la pantalla ────────────────────────────────────────────────

export interface ProfesorCalendario {
  id: number; // profesor.id
  usuarioId: number; // FK → usuario.id (rol Profesor)
  nombre: string;
  apellido: string;
  estado: EstadoProfesor;
}

const aProfesorCalendario = (p: ProfesorResponse): ProfesorCalendario => ({
  id: p.id,
  usuarioId: p.usuario.id,
  nombre: p.usuario.nombre,
  apellido: p.usuario.apellido,
  estado: p.estado,
});

// ─── API del módulo ───────────────────────────────────────────────────────

/** Profesores activos para el filtro del calendario. */
export async function listarProfesoresActivos(): Promise<ProfesorCalendario[]> {
  const lista = await apiGet<ProfesorResponse[]>(`${RUTA_PROFESORES}?estado=activo`);
  return lista
    .map(aProfesorCalendario)
    .sort((a, b) => a.apellido.localeCompare(b.apellido));
}

/** La ficha del profesor del usuario logueado (para el rol Profesor). */
export async function profesorDeUsuario(usuarioId: number): Promise<ProfesorCalendario | null> {
  const lista = await apiGet<ProfesorResponse[]>(
    `${RUTA_PROFESORES}?usuarioId=${usuarioId}&estado=activo`,
  );
  return lista[0] ? aProfesorCalendario(lista[0]) : null;
}

/** Los límites de la grilla: min/max de las franjas de atención activas del centro. */
export async function limiteAtencion(): Promise<{ min: number; max: number }> {
  const agenda = await apiGet<AgendaResponse>(RUTA_AGENDA_CENTRO);
  const activas = agenda.franjas.filter((f) => f.estado === "activo");
  if (activas.length === 0) return { min: 8 * 60, max: 20 * 60 };
  let min = Infinity;
  let max = 0;
  for (const f of activas) {
    min = Math.min(min, aMin(f.horaInicio));
    max = Math.max(max, aMin(f.horaFin));
  }
  return { min, max };
}

/** Agenda de UN día: bloques del profesor + turnos + huecos libres. */
export async function verAgendaDia(profesorId: number, fecha: string): Promise<AgendaDiaResponse> {
  return apiGet<AgendaDiaResponse>(`${RUTA_AGENDA}?profesorId=${profesorId}&fecha=${fecha}`);
}

/** La agenda de 6 días de una semana (lunes a sábado). */
export async function verAgendaSemana(
  profesorId: number,
  lunes: string,
): Promise<AgendaDiaResponse[]> {
  // Una llamada por día: el back expone la agenda diaria; la semana se arma acá.
  const dias = Array.from({ length: 6 }, (_, i) => sumarDias(lunes, i));
  return Promise.all(dias.map((fecha) => verAgendaDia(profesorId, fecha)));
}
