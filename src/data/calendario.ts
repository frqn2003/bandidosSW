// Capa de datos de Calendario de turnos (HU-CAL-01 → HU-CAL-02).
//
// Consume los endpoints de la API mediante el cliente HTTP tipado con el contrato.
// Contratos: src/contracts/calendario.ts · src/contracts/agenda.ts · src/contracts/profesor.ts
// Patrón: docs/capa-de-datos-front.md
//
// ─── Lo que falta del lado del servidor (docs/briefs/HU-CAL-02.md §Backend) ──
//   B2  La agenda por rango (lunes→sábado) en UNA llamada: hoy son 6.
//   B3  Consulta SIN `profesorId` ("Todos los profesores"): el endpoint la exige.
//   B4  Los params `materiaId` y `verCancelados` en la agenda (hoy se filtran en
//       el navegador con `filtrarTurnosAgenda`).
//   B5  `GET /api/calendario/mes` (la ruta existe en el contrato, no en el back).
//   B6  Mapper: `observaciones`, `cantidadModificaciones`, `puedeModificar`,
//       `puedeCancelar`, `pagado`, `cancelacionTardia`, `bloques[].profesorId`.
//   B7  Cupo libre por franja, calculado por el servidor sobre
//       `profesor_materia.capacidad_maxima`.
// Mientras tanto, "Todos los profesores" y la vista Mes salen del fixture de
// diseño (`fixtures/calendario-multiprofesor.fixture.ts`), que se borra entero
// el día que el back cierre B3/B5. Cada función tiene el `// BACKEND:` puesto.

import {
  RUTA_AGENDA,
  RUTA_MES,
  type AgendaDiaResponse,
  type CalendarioMesResponse,
  type CalendarioMesQuery,
  type HuecoResponse,
  type TurnoCalendarioResponse,
} from "@/contracts/calendario";
import { RUTA as RUTA_AGENDA_CENTRO, type AgendaResponse } from "@/contracts/agenda";
import {
  RUTA as RUTA_PROFESORES,
  type EstadoProfesor,
  type ProfesorResponse,
} from "@/contracts/profesor";
import { RUTA as RUTA_TURNOS, type TurnoResponse } from "@/contracts/turno";
import { apiGet } from "@/lib/api-client";
import { aISO, aMin, sumarDias } from "@/funciones/fechas-calendario";

export type {
  AgendaDiaResponse,
  CalendarioMesResponse,
  HuecoResponse,
  TurnoCalendarioResponse,
  TurnoResponse,
};

// Los helpers de fecha viven en `funciones/fechas-calendario.ts` (lógica pura).
// Se reexportan acá porque varios componentes los piden desde la capa de datos.
export {
  aISO,
  aMin,
  celdasDelMes,
  diaCorto,
  fechaLarga,
  lunesDe,
  mesLargo,
  minAHora,
  primerDiaDelMes,
  sumarDias,
} from "@/funciones/fechas-calendario";

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

export async function verProximoTurno(profesorId: number): Promise<TurnoResponse | null> {
  const params = new URLSearchParams({
    profesorId: String(profesorId),
    estado: "Reservado",
    desde: aISO(new Date()),
  });
  const turnos = await apiGet<TurnoResponse[]>(`${RUTA_TURNOS}?${params.toString()}`);
  const ahora = Date.now();
  return turnos
    .filter((turno) =>
      turno.profesor.id === profesorId &&
      turno.estado === "Reservado" &&
      new Date(`${turno.fecha}T${turno.horaInicio}`).getTime() > ahora,
    )
    .sort((a, b) =>
      a.fecha.localeCompare(b.fecha) || a.horaInicio.localeCompare(b.horaInicio) || a.id - b.id,
    )[0] ?? null;
}

/** Todos los turnos del rango [desde, hasta], de TODOS los profesores, sin
 *  huecos disponibles. Lo usa la opción "Todos los profesores" del filtro.
 *  BACKEND: GET /api/turnos?desde=&hasta= (contrato listarTurnosQuery). */
export async function listarTurnosEnRango(desde: string, hasta: string): Promise<TurnoResponse[]> {
  const params = new URLSearchParams({ desde, hasta });
  const turnos = await apiGet<TurnoResponse[]>(`${RUTA_TURNOS}?${params.toString()}`);
  return turnos.sort(
    (a, b) => a.fecha.localeCompare(b.fecha) || a.horaInicio.localeCompare(b.horaInicio) || a.id - b.id,
  );
}

// ─── HU-CAL-02: filtros combinables, multiprofesor y vista Mes ────────────

export interface FiltrosAgenda {
  /** Ausente = todos los profesores. */
  profesorId?: number;
  /** Ausente = todas las materias. */
  materiaId?: number;
  verCancelados: boolean;
}

/**
 * Filtro de materia + cancelados en memoria. Es EXACTAMENTE lo que hará el
 * back cuando acepte `materiaId` y `verCancelados` (B4); se deja acá para que el
 * swap sea borrar la llamada.
 */
export function filtrarTurnosAgenda(
  turnos: TurnoCalendarioResponse[],
  filtros: Pick<FiltrosAgenda, "materiaId" | "verCancelados">,
): TurnoCalendarioResponse[] {
  return turnos.filter((t) => {
    if (filtros.materiaId !== undefined && t.materia.id !== filtros.materiaId) return false;
    if (!filtros.verCancelados && t.estado === "Cancelado") return false;
    return true;
  });
}

/**
 * Agenda de un rango (lunes→sábado) con los filtros combinables aplicados.
 *
 * · Con `profesorId` → API real: una llamada por día (B2 lo baja a una sola).
 * · Sin `profesorId` ("Todos los profesores") → fixture de diseño, porque la
 *   API real exige `profesorId` (B3).
 *
 * BACKEND: GET /api/calendario/agenda?profesorId=&materiaId=&desde=&hasta=&verCancelados=
 *   (rango en una llamada + `profesorId` opcional). Cuando exista, el cuerpo de
 *   esta función pasa a ser un `apiGet<AgendaDiaResponse[]>` y se borra el fixture.
 */
export async function verAgendaRango(
  desde: string,
  hasta: string,
  filtros: FiltrosAgenda,
): Promise<AgendaDiaResponse[]> {
  const params = new URLSearchParams({ desde, hasta });
  if (filtros.profesorId !== undefined) params.set("profesorId", String(filtros.profesorId));
  if (filtros.materiaId !== undefined) params.set("materiaId", String(filtros.materiaId));
  if (filtros.verCancelados !== undefined) params.set("verCancelados", String(filtros.verCancelados));

  const agenda = await apiGet<AgendaDiaResponse>(`${RUTA_AGENDA}?${params.toString()}`);
  const dias: AgendaDiaResponse[] = [];
  let curr = desde;
  while (curr <= hasta) {
    const fecha = curr;
    dias.push({
      ...agenda,
      fecha,
      turnos: agenda.turnos.filter((t) => t.fecha === fecha),
      huecos: agenda.huecos.filter((h) => h.fecha === fecha),
    });
    curr = sumarDias(curr, 1);
  }
  return dias;
}

/** Agenda de un solo día, con los filtros combinables aplicados. */
export async function verAgendaRangoDia(fecha: string, filtros: FiltrosAgenda): Promise<AgendaDiaResponse> {
  const params = new URLSearchParams({ fecha });
  if (filtros.profesorId !== undefined) params.set("profesorId", String(filtros.profesorId));
  if (filtros.materiaId !== undefined) params.set("materiaId", String(filtros.materiaId));
  if (filtros.verCancelados !== undefined) params.set("verCancelados", String(filtros.verCancelados));
  return apiGet<AgendaDiaResponse>(`${RUTA_AGENDA}?${params.toString()}`);
}

/**
 * Vista Mes: cantidad de turnos por día del mes.
 */
export async function verResumenMes(filtros: CalendarioMesQuery): Promise<CalendarioMesResponse> {
  const params = new URLSearchParams({
    anio: String(filtros.anio),
    mes: String(filtros.mes),
  });
  if (filtros.profesorId !== undefined) params.set("profesorId", String(filtros.profesorId));
  if (filtros.materiaId !== undefined) params.set("materiaId", String(filtros.materiaId));
  if (filtros.verCancelados !== undefined) params.set("verCancelados", String(filtros.verCancelados));
  return apiGet<CalendarioMesResponse>(`${RUTA_MES}?${params.toString()}`);
}

/** Ruta del endpoint mensual. */
export const RUTA_CALENDARIO_MES = RUTA_MES;

/**
 * Cupo máximo por `(profesor, materia)` — la fuente del filtro "Solo franjas con
 * cupo disponible".
 */
export async function listarCapacidadesPorProfesorMateria(): Promise<Map<string, number>> {
  const mapa = new Map<string, number>();
  const profesores = await apiGet<ProfesorResponse[]>(`${RUTA_PROFESORES}?estado=activo`);
  for (const p of profesores) {
    if (p.estado !== "activo") continue;
    for (const pm of p.materias) {
      mapa.set(`${p.id}:${pm.materia.id}`, pm.capacidadMaxima);
    }
  }
  return mapa;
}

