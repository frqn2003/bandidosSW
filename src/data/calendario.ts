// Capa de datos de Calendario de turnos (HU-CAL-01).
//
// El back todavía no publicó `/api/calendario/*`, así que este fixture se
// comporta como la vista `vw_agenda_profesional_dia`: para cada profesor y
// fecha arma la agenda (franjas de atención + bloques del profesor + turnos
// reservados) y descuenta los turnos no cancelados para calcular los huecos.
//
// Patrón y checklist: docs/capa-de-datos-front.md
// Contrato: src/contracts/calendario.ts · src/contracts/disponibilidad.ts

import {
  type AgendaDiaResponse,
  type HuecoResponse,
  type TurnoCalendarioResponse,
} from "@/contracts/calendario";
import type { DiaSemana } from "@/contracts/disponibilidad";
import type { EstadoProfesor } from "@/contracts/profesor";

export type { AgendaDiaResponse, HuecoResponse, TurnoCalendarioResponse };

// ─── Helpers de fecha/hora ────────────────────────────────────────────────

/** "2024-03-15" → Date local. */
function aDate(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

/** Date → "yyyy-mm-dd" local (sin UTC). */
function aISO(fecha: Date): string {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const d = String(fecha.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** "HH:MM" → minutos desde medianoche. */
function aMin(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

/** minutos → "HH:MM". */
function minAString(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** getDay() (0=domingo) → diaSemana ISO 1..6 (null si es domingo). */
function diaIsoDe(fecha: Date): DiaSemana | null {
  const d = fecha.getDay();
  return d === 0 ? null : (d as DiaSemana);
}

/** Lunes de la semana que contiene a la fecha. */
function lunesDe(iso: string): string {
  const f = aDate(iso);
  const suma = (f.getDay() + 6) % 7; // lun=0 … dom=6
  f.setDate(f.getDate() - suma);
  return aISO(f);
}

function sumarDias(iso: string, dias: number): string {
  const f = aDate(iso);
  f.setDate(f.getDate() + dias);
  return aISO(f);
}

// ─── Fixture: lo único que desaparece el día del back ────────────────────

export interface ProfesorCalendario {
  id: number; // profesor.id
  usuarioId: number; // FK → usuario.id (rol Profesor)
  nombre: string;
  apellido: string;
  estado: EstadoProfesor;
}

/**
 * Profesores activos para el combo del filtro.
 * BACKEND: GET /api/profesores?estado=activo (contrato src/contracts/profesor.ts).
 * `usuarioId` viene del JOIN con usuario: acá se usa para el rol Profesor, que
 * solo puede ver su propio calendario.
 */
const PROFESORES: ProfesorCalendario[] = [
  { id: 1, usuarioId: 1, nombre: "Juan", apellido: "Pérez", estado: "activo" },
  { id: 2, usuarioId: 2, nombre: "Ana", apellido: "González", estado: "activo" },
  { id: 3, usuarioId: 4, nombre: "Lucía", apellido: "Rodríguez", estado: "activo" },
  // El rol Profesor demo (Roberto Peralta, usuario.id 3) entra con el filtro ya
  // aplicado a su propia ficha: sin este registro la restricción por rol no se
  // podría probar.
  { id: 4, usuarioId: 3, nombre: "Roberto", apellido: "Peralta", estado: "activo" },
];

/**
 * Horario de atención del centro (tabla `agenda_semanal`): define los límites
 * de la grilla. BACKEND: GET /api/agenda?academiaId=1 (contrato src/contracts/agenda.ts).
 * El domingo no se atiende: diaSemana va de 1 (lun) a 6 (sáb).
 */
const FRANJAS_ATENCION: { id: number; diaSemana: DiaSemana; horaInicio: string; horaFin: string }[] = [
  { id: 1, diaSemana: 1, horaInicio: "08:00", horaFin: "13:00" },
  { id: 2, diaSemana: 1, horaInicio: "14:00", horaFin: "20:00" },
  { id: 3, diaSemana: 2, horaInicio: "08:00", horaFin: "13:00" },
  { id: 4, diaSemana: 2, horaInicio: "14:00", horaFin: "20:00" },
  { id: 5, diaSemana: 3, horaInicio: "08:00", horaFin: "13:00" },
  { id: 6, diaSemana: 3, horaInicio: "14:00", horaFin: "20:00" },
  { id: 7, diaSemana: 4, horaInicio: "08:00", horaFin: "13:00" },
  { id: 8, diaSemana: 4, horaInicio: "14:00", horaFin: "20:00" },
  { id: 9, diaSemana: 5, horaInicio: "08:00", horaFin: "13:00" },
  { id: 10, diaSemana: 5, horaInicio: "14:00", horaFin: "20:00" },
  { id: 11, diaSemana: 6, horaInicio: "08:00", horaFin: "12:00" },
];

/**
 * Bloques de disponibilidad de cada profesor (tabla `agenda_profesional`).
 * Caen SIEMPRE dentro de la franja de atención del día correspondiente.
 * BACKEND: GET /api/disponibilidad?profesorId= (contrato src/contracts/disponibilidad.ts).
 */
const BLOQUES: {
  id: number;
  profesorId: number;
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFin: string;
  franjaAtencionId: number; // agenda_semanal.id → la franja de la que cuelga
}[] = [
  // Juan Pérez (1): lunes a viernes mañana + tarde.
  { id: 1, profesorId: 1, diaSemana: 1, horaInicio: "09:00", horaFin: "13:00", franjaAtencionId: 1 },
  { id: 2, profesorId: 1, diaSemana: 1, horaInicio: "16:00", horaFin: "20:00", franjaAtencionId: 2 },
  { id: 3, profesorId: 1, diaSemana: 2, horaInicio: "09:00", horaFin: "13:00", franjaAtencionId: 3 },
  { id: 4, profesorId: 1, diaSemana: 2, horaInicio: "16:00", horaFin: "20:00", franjaAtencionId: 4 },
  { id: 5, profesorId: 1, diaSemana: 3, horaInicio: "08:30", horaFin: "12:30", franjaAtencionId: 5 },
  { id: 6, profesorId: 1, diaSemana: 3, horaInicio: "15:00", horaFin: "19:00", franjaAtencionId: 6 },
  { id: 7, profesorId: 1, diaSemana: 4, horaInicio: "09:00", horaFin: "13:00", franjaAtencionId: 7 },
  { id: 8, profesorId: 1, diaSemana: 5, horaInicio: "09:00", horaFin: "13:00", franjaAtencionId: 9 },
  { id: 9, profesorId: 1, diaSemana: 5, horaInicio: "15:00", horaFin: "19:00", franjaAtencionId: 10 },
  { id: 10, profesorId: 1, diaSemana: 6, horaInicio: "09:00", horaFin: "12:00", franjaAtencionId: 11 },
  // Ana González (2): martes y jueves toda la franja, sábado a la mañana.
  { id: 11, profesorId: 2, diaSemana: 2, horaInicio: "08:00", horaFin: "12:00", franjaAtencionId: 3 },
  { id: 12, profesorId: 2, diaSemana: 2, horaInicio: "14:00", horaFin: "18:00", franjaAtencionId: 4 },
  { id: 13, profesorId: 2, diaSemana: 4, horaInicio: "08:00", horaFin: "13:00", franjaAtencionId: 7 },
  { id: 14, profesorId: 2, diaSemana: 4, horaInicio: "14:00", horaFin: "18:00", franjaAtencionId: 8 },
  { id: 15, profesorId: 2, diaSemana: 6, horaInicio: "08:00", horaFin: "12:00", franjaAtencionId: 11 },
  // Lucía Rodríguez (3): lunes y viernes a la mañana.
  { id: 16, profesorId: 3, diaSemana: 1, horaInicio: "08:00", horaFin: "12:00", franjaAtencionId: 1 },
  { id: 17, profesorId: 3, diaSemana: 5, horaInicio: "09:00", horaFin: "13:00", franjaAtencionId: 9 },
  // Roberto Peralta (4): de miércoles, jueves y viernes, tarde.
  { id: 18, profesorId: 4, diaSemana: 3, horaInicio: "14:00", horaFin: "19:00", franjaAtencionId: 6 },
  { id: 19, profesorId: 4, diaSemana: 4, horaInicio: "14:00", horaFin: "19:00", franjaAtencionId: 8 },
  { id: 20, profesorId: 4, diaSemana: 5, horaInicio: "14:00", horaFin: "19:00", franjaAtencionId: 10 },
];

/** El fixture suma `fecha` (no viaja en TurnoCalendarioResponse: se agrupa por día). */
export type TurnoFixture = TurnoCalendarioResponse & { profesorId: number; fecha: string };

/**
 * Turnos reservados de los profesores (tabla `turno`).
 * Se generan sobre la semana REAL (la que contiene a hoy) para que el resaltado
 * del día actual y la navegación "Hoy" funcionen de verdad en cualquier momento.
 * BACKEND: GET /api/turnos?profesorId=&desde=&hasta= (contrato src/contracts/turno.ts).
 */
function turnosDeSemanaActual(): TurnoFixture[] {
  const lunes = lunesDe(new Date().toISOString().slice(0, 10));
  return [
    {
      id: 1,
      profesorId: 1,
      codigo: "TUR-000001",
      alumno: { id: 1, nombre: "María", apellido: "López" },
      materia: { id: 1, nombre: "Matemática" },
      fecha: lunes,
      horaInicio: "09:00",
      horaFin: "10:00",
      estado: "Reservado",
    },
    {
      id: 2,
      profesorId: 1,
      codigo: "TUR-000002",
      alumno: { id: 2, nombre: "Carlos", apellido: "Sosa" },
      materia: { id: 2, nombre: "Inglés" },
      fecha: lunes,
      horaInicio: "10:30",
      horaFin: "11:30",
      estado: "Reservado",
    },
    {
      id: 3,
      profesorId: 1,
      codigo: "TUR-000003",
      alumno: { id: 3, nombre: "Valentina", apellido: "Ríos" },
      materia: { id: 1, nombre: "Matemática" },
      fecha: sumarDias(lunes, 1),
      horaInicio: "10:00",
      horaFin: "11:00",
      estado: "Reservado",
    },
    {
      id: 4,
      profesorId: 1,
      codigo: "TUR-000004",
      alumno: { id: 4, nombre: "Tomás", apellido: "Ibarra" },
      materia: { id: 2, nombre: "Inglés" },
      fecha: sumarDias(lunes, 2),
      horaInicio: "15:00",
      horaFin: "16:00",
      estado: "Reservado",
    },
    // Cancelado: la vista no lo descuenta como ocupado (no bloquea el hueco).
    {
      id: 5,
      profesorId: 1,
      codigo: "TUR-000005",
      alumno: { id: 5, nombre: "Sofía", apellido: "Medina" },
      materia: { id: 1, nombre: "Matemática" },
      fecha: sumarDias(lunes, 2),
      horaInicio: "16:30",
      horaFin: "17:30",
      estado: "Cancelado",
    },
    // Turno de Ana González (2).
    {
      id: 6,
      profesorId: 2,
      codigo: "TUR-000006",
      alumno: { id: 6, nombre: "Bruno", apellido: "Acuña" },
      materia: { id: 3, nombre: "Química" },
      fecha: sumarDias(lunes, 3),
      horaInicio: "09:00",
      horaFin: "10:00",
      estado: "Reservado",
    },
    // Turno de Roberto Peralta (4) — su propio calendario al entrar como rol Profesor.
    {
      id: 7,
      profesorId: 4,
      codigo: "TUR-000007",
      alumno: { id: 7, nombre: "Camila", apellido: "Vega" },
      materia: { id: 4, nombre: "Historia" },
      fecha: sumarDias(lunes, 4),
      horaInicio: "15:00",
      horaFin: "16:00",
      estado: "Reservado",
    },
  ];
}

const TURNOS: TurnoFixture[] = turnosDeSemanaActual();

const DEMORA_MS = 350;
const demorar = () => new Promise((r) => setTimeout(r, DEMORA_MS));

// ─── API del módulo (firma final: no cambia cuando entra el back) ─────────

/** Profesores activos para el filtro del calendario. */
export async function listarProfesoresActivos(): Promise<ProfesorCalendario[]> {
  await demorar();
  // BACKEND: return apiGet<ProfesorResponse[]>(`/api/profesores?estado=activo`)
  return PROFESORES.filter((p) => p.estado === "activo").map((p) => ({ ...p }));
}

/** La ficha del profesor del usuario logueado (para el rol Profesor). */
export async function profesorDeUsuario(usuarioId: number): Promise<ProfesorCalendario | null> {
  await demorar();
  // BACKEND: GET /api/profesores?usuarioId=<id> — hoy no hay filtro por usuario;
  // PENDIENTE CONTRATO: acordar `profesor.usuario_id` como filtro del listado.
  return PROFESORES.find((p) => p.usuarioId === usuarioId && p.estado === "activo") ?? null;
}

/** Los límites de la grilla: min/max de las franjas de atención del día. */
export async function limiteAtencion(): Promise<{ min: number; max: number }> {
  await demorar();
  // BACKEND: GET /api/agenda?academiaId=1 → se toma el rango de `franjas`.
  let min = Infinity;
  let max = 0;
  for (const f of FRANJAS_ATENCION) {
    min = Math.min(min, aMin(f.horaInicio));
    max = Math.max(max, aMin(f.horaFin));
  }
  return { min, max };
}

/**
 * Agenda de UN día: bloques del profesor + turnos reservados + huecos libres.
 * BACKEND: return apiGet<AgendaDiaResponse>(`/api/calendario/agenda?profesorId=&fecha=`)
 */
export async function verAgendaDia(
  profesorId: number,
  fecha: string,
): Promise<AgendaDiaResponse> {
  await demorar();
  const dia = diaIsoDe(aDate(fecha));
  const bloquesFixture = BLOQUES.filter((b) => {
    const franja = FRANJAS_ATENCION.find((f) => f.id === b.franjaAtencionId);
    return b.profesorId === profesorId && franja?.diaSemana === dia;
  });

  const turnos = TURNOS.filter(
    (t) => t.profesorId === profesorId && t.fecha === fecha && t.estado === "Reservado",
  ).map((t) => {
    // `fecha` y `profesorId` son del fixture (la fecha no viaja en
    // TurnoCalendarioResponse y el profesor lo agrupa la vista).
    return {
      id: t.id,
      codigo: t.codigo,
      alumno: t.alumno,
      materia: t.materia,
      horaInicio: t.horaInicio,
      horaFin: t.horaFin,
      estado: t.estado,
    };
  });

  const huecos: HuecoResponse[] = generarHuecos(profesorId, fecha, bloquesFixture, turnos);

  const profesor = PROFESORES.find((p) => p.id === profesorId);
  return {
    profesor: { id: profesorId, nombre: profesor?.nombre ?? "", apellido: profesor?.apellido ?? "" },
    fecha,
    bloques: bloquesFixture.map((b) => ({ horaInicio: b.horaInicio, horaFin: b.horaFin })),
    turnos,
    huecos,
  };
}

/** La agenda de 6 días de una semana (lunes a sábado). */
export async function verAgendaSemana(
  profesorId: number,
  lunes: string,
): Promise<AgendaDiaResponse[]> {
  // BACKEND: 7 llamadas a /api/calendario/agenda (una por día) o un solo GET
  // a /api/calendario/huecos?profesorId=&desde=&hasta= proyectando la semana.
  const dias = Array.from({ length: 6 }, (_, i) => sumarDias(lunes, i));
  return Promise.all(dias.map((fecha) => verAgendaDia(profesorId, fecha)));
}

/**
 * Huecos libres del día: cada bloque del profesor descontando los turnos
 * no cancelados, como `vw_huecos_disponibles`: un hueco INTERNO entre turnos
 * consecutivos y un hueco FINAL entre el último turno y el cierre del bloque.
 * La duración es variable (no pasos fijos de 30') — ver `HuecoResponse`.
 */
function generarHuecos(
  profesorId: number,
  fecha: string,
  bloques: typeof BLOQUES,
  turnos: TurnoCalendarioResponse[],
): HuecoResponse[] {
  const profesor = PROFESORES.find((p) => p.id === profesorId);
  const datosProfesor = {
    id: profesorId,
    nombre: profesor?.nombre ?? "",
    apellido: profesor?.apellido ?? "",
  };
  const huecos: HuecoResponse[] = [];

  const nuevoHueco = (bloqueId: number, desde: number, hasta: number) =>
    huecos.push({
      agendaProfesionalId: bloqueId,
      profesor: { ...datosProfesor },
      fecha,
      horaInicio: minAString(desde),
      horaFin: minAString(hasta),
      duracionMinutos: hasta - desde,
    });

  for (const bloque of bloques) {
    const iniB = aMin(bloque.horaInicio);
    const finB = aMin(bloque.horaFin);
    const ocupados = turnos
      .filter((t) => {
        const tIni = aMin(t.horaInicio);
        const tFin = aMin(t.horaFin);
        return tFin > iniB && tIni < finB;
      })
      .sort((a, b) => aMin(a.horaInicio) - aMin(b.horaInicio));

    // Cursor recorre el bloque: hueco interno antes de cada turno + hueco final.
    let cursor = iniB;
    for (const t of ocupados) {
      const tIni = aMin(t.horaInicio);
      if (tIni > cursor) nuevoHueco(bloque.id, cursor, tIni);
      cursor = Math.max(cursor, aMin(t.horaFin));
    }
    if (cursor < finB) nuevoHueco(bloque.id, cursor, finB);
  }
  return huecos;
}
// ─── Solo fixture: puente con la reserva (HU-TUR-01) ─────────────────────
// `src/data/turnos.ts` necesita los mismos bloques y turnos que muestra la
// grilla para calcular las franjas libres, y la reserva tiene que aparecer en
// el calendario al volver. Con el back esto desaparece: la reserva escribe en
// `turno` y la vista `vw_huecos_disponibles` lee de la misma tabla.

/** Turno reservado reducido a lo que la reserva necesita para chequear cruces. */
export interface TurnoAgendaFixture {
  id: number;
  profesorId: number;
  alumnoId: number;
  materiaId: number;
  fecha: string;
  horaInicio: string;
  horaFin: string;
}

const aAgendaFixture = (t: TurnoFixture): TurnoAgendaFixture => ({
  id: t.id,
  profesorId: t.profesorId,
  alumnoId: t.alumno.id,
  materiaId: t.materia.id,
  fecha: t.fecha,
  horaInicio: t.horaInicio,
  horaFin: t.horaFin,
});

/** Bloques del profesor y turnos reservados de ese día (síncrono, sin demora). */
export function agendaFixture(
  profesorId: number,
  fecha: string,
): { bloques: { horaInicio: string; horaFin: string }[]; turnos: TurnoAgendaFixture[] } {
  const dia = diaIsoDe(aDate(fecha));
  const bloques = BLOQUES.filter((b) => {
    const franja = FRANJAS_ATENCION.find((f) => f.id === b.franjaAtencionId);
    return b.profesorId === profesorId && franja?.diaSemana === dia;
  }).map((b) => ({ horaInicio: b.horaInicio, horaFin: b.horaFin }));
  const turnos = TURNOS.filter(
    (t) => t.profesorId === profesorId && t.fecha === fecha && t.estado === "Reservado",
  ).map(aAgendaFixture);
  return { bloques, turnos };
}

/** Turnos reservados del alumno en esa fecha, con cualquier profesor. */
export function turnosDelAlumnoFixture(alumnoId: number, fecha: string): TurnoAgendaFixture[] {
  return TURNOS.filter(
    (t) => t.alumno.id === alumnoId && t.fecha === fecha && t.estado === "Reservado",
  ).map(aAgendaFixture);
}

/** Suma a la grilla un turno recién reservado desde HU-TUR-01. */
export function registrarTurnoFixture(turno: TurnoFixture): void {
  TURNOS.push({ ...turno });
}
