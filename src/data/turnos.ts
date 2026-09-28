// Capa de datos de Reserva de turnos (HU-TUR-01).
//
// Consume los endpoints de la API mediante el cliente HTTP tipado con el contrato.
// Contrato: src/contracts/turno.ts · Brief: docs/briefs/HU-TUR-01.md
// Patrón: docs/capa-de-datos-front.md
//
// El back no expone un endpoint de franjas con cupos: se arman acá con lo que
// sí existe, con la MISMA regla que usa el service al reservar
// (turno.service.reservar):
//   · franjas = bloques del profesor (GET /api/calendario/agenda) cada 30',
//     de duración = la de la materia;
//   · cupo = profesor_materia.capacidad_maxima (GET /api/profesores/:id) menos
//     los turnos Reservado del profesor que se superponen (cualquier materia);
//   · superposición del alumno = sus turnos Reservado de ese día (GET /api/turnos);
//   · anticipación mínima de 2 h.
// El back vuelve a validar todo en el POST (con FOR UPDATE para el cupo), así
// que lo de acá es prevención visual, no la fuente de verdad.

import {
  RUTA,
  type CrearTurnoBody,
  type ErrorTurno,
  type TurnoResponse,
} from "@/contracts/turno";
import {
  RUTA_AGENDA,
  RUTA_HUECOS,
  type AgendaDiaResponse,
  type HuecoResponse,
} from "@/contracts/calendario";
import type { AlumnoResponse } from "@/contracts/alumno";
import type { MateriaOpcion } from "@/contracts/materia";
import {
  RUTA as RUTA_PROFESORES,
  rutaProfesor,
  type ProfesorOpcion,
  type ProfesorResponse,
} from "@/contracts/profesor";
import { ApiError, apiGet, apiSend } from "@/lib/api-client";
import { listarAlumnos } from "@/data/alumnos";
import { listarMaterias } from "@/data/materias";

export type { TurnoResponse };
export { RUTA };


// ─── Parámetros de negocio ───────────────────────────────────────────────

/**
 * Anticipación mínima respecto del inicio de la clase. Tiene que coincidir con
 * `faltanMenosDe(2, …)` de turno.service.
 * PENDIENTE CONTRATO: exponer el parámetro para que no esté fijo en dos lados.
 */
export const ANTICIPACION_MINIMA_HORAS = 2;
/** La reserva se abre hasta 60 días hacia adelante (lo que proyecta la vista). */
export const DIAS_MAXIMOS_RESERVA = 60;
/** turno.observaciones varchar(250). */
export const MAX_OBSERVACIONES = 250;
/** Las franjas arrancan cada 30' (agenda_profesional usa múltiplos de 30'). */
const PASO_FRANJA_MIN = 30;


// ─── Tipos de la pantalla ────────────────────────────────────────────────

/** Lo que el buscador necesita de cada alumno (subset de AlumnoResponse). */
export type AlumnoBusqueda = Pick<
  AlumnoResponse,
  "id" | "legajo" | "nombre" | "apellido" | "dni" | "email" | "responsable" | "nivelEducativo"
>;

/**
 * Profesor que dicta la materia elegida, con los datos de `profesor_materia`
 * que la reserva necesita: capacidad (N del cupo) y precio vigente.
 */
export type ProfesorDeMateria = ProfesorOpcion & {
  capacidadMaxima: number;
  precio: number;
};

/**
 * Franja reservable. `cuposDisponibles` NO es una columna: se calcula como
 * `profesor_materia.capacidad_maxima − turnos Reservado superpuestos`.
 * PENDIENTE CONTRATO (opcional): si el back publica
 * GET /api/turnos/franjas?profesorId=&materiaId=&fecha=&alumnoId=, esta forma es
 * la respuesta esperada y `listarFranjas` pasa a ser un apiGet.
 */
export type MotivoFranja =
  | "SIN_CUPO"
  | "ANTICIPACION_INSUFICIENTE"
  | "ALUMNO_CON_TURNO_SUPERPUESTO";

export type FranjaTurnoResponse = {
  /** "HH:MM" */
  horaInicio: string;
  /** "HH:MM" — inicio + duración de la materia. */
  horaFin: string;
  /** N: capacidad del profesor para esa materia. */
  capacidad: number;
  /** X: cupos libres en esa franja. */
  cuposDisponibles: number;
  disponible: boolean;
  motivo: MotivoFranja | null;
};

export type FranjasQuery = {
  profesorId: number;
  materiaId: number;
  /** "yyyy-mm-dd" */
  fecha: string;
  alumnoId?: number;
};

/** Sugerencia del próximo horario libre (deseable de la HU). */
export type SugerenciaFranja = FranjaTurnoResponse & { fecha: string };


// ─── Helpers de fecha/hora ───────────────────────────────────────────────

function aISO(fecha: Date): string {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const d = String(fecha.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function sumarDias(iso: string, dias: number): string {
  const f = new Date(`${iso}T00:00:00`);
  f.setDate(f.getDate() + dias);
  return aISO(f);
}

/** Hoy en "yyyy-mm-dd" local (no UTC). */
export const hoyISO = () => aISO(new Date());

/** "HH:MM" o "HH:MM:SS" → minutos desde medianoche. */
function aMin(hora: string): number {
  const [h, m] = hora.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

function minAString(total: number): string {
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

const seSuperponen = (aIni: number, aFin: number, bIni: number, bFin: number) =>
  aIni < bFin && bIni < aFin;

const inicioDe = (fecha: string, minutos: number) =>
  new Date(`${fecha}T${minAString(minutos)}:00`).getTime();


// ─── Lecturas de apoyo ───────────────────────────────────────────────────

/** Capacidad, precio y duración de la clase de ese profesor para esa materia. */
async function datosProfesorMateria(profesorId: number, materiaId: number) {
  const profesor = await apiGet<ProfesorResponse>(rutaProfesor(profesorId));
  const pm = profesor.materias.find((m) => m.materia.id === materiaId);
  return pm
    ? { capacidad: pm.capacidadMaxima, duracion: pm.materia.duracionClaseMinutos }
    : null;
}

/** Turnos Reservado del alumno en el rango (inclusive), con cualquier profesor. */
async function turnosReservadosDelAlumno(alumnoId: number, desde: string, hasta: string) {
  const params = new URLSearchParams({ alumnoId: String(alumnoId), estado: "Reservado", desde, hasta });
  return apiGet<TurnoResponse[]>(`${RUTA}?${params.toString()}`);
}

/** Arma las franjas de un día con las mismas reglas que valida el back. */
function calcularFranjas(
  fecha: string,
  agenda: AgendaDiaResponse,
  capacidad: number,
  duracion: number,
  turnosAlumno: Pick<TurnoResponse, "fecha" | "horaInicio" | "horaFin">[],
  ahora: number,
): FranjaTurnoResponse[] {
  const reservados = agenda.turnos.filter((t) => t.estado === "Reservado");
  const delAlumno = turnosAlumno.filter((t) => t.fecha === fecha);
  const limiteAnticipacion = ahora + ANTICIPACION_MINIMA_HORAS * 3_600_000;

  const franjas: FranjaTurnoResponse[] = [];
  for (const bloque of agenda.bloques) {
    const finBloque = aMin(bloque.horaFin);
    for (let ini = aMin(bloque.horaInicio); ini + duracion <= finBloque; ini += PASO_FRANJA_MIN) {
      const fin = ini + duracion;
      const inicio = inicioDe(fecha, ini);
      // Las franjas que ya empezaron no se ofrecen.
      if (inicio <= ahora) continue;

      const usados = reservados.filter((t) =>
        seSuperponen(ini, fin, aMin(t.horaInicio), aMin(t.horaFin)),
      ).length;
      const cuposDisponibles = Math.max(0, capacidad - usados);
      const alumnoOcupado = delAlumno.some((t) =>
        seSuperponen(ini, fin, aMin(t.horaInicio), aMin(t.horaFin)),
      );

      let motivo: MotivoFranja | null = null;
      if (inicio < limiteAnticipacion) motivo = "ANTICIPACION_INSUFICIENTE";
      else if (cuposDisponibles === 0) motivo = "SIN_CUPO";
      else if (alumnoOcupado) motivo = "ALUMNO_CON_TURNO_SUPERPUESTO";

      franjas.push({
        horaInicio: minAString(ini),
        horaFin: minAString(fin),
        capacidad,
        cuposDisponibles,
        disponible: motivo === null,
        motivo,
      });
    }
  }
  return franjas;
}


// ─── API del módulo ──────────────────────────────────────────────────────

/**
 * Buscador de alumnos: DNI, nombre, apellido o legajo, coincidencia parcial
 * (ILIKE en alumno.repo), solo activos.
 */
export async function buscarAlumnosActivos(busqueda: string): Promise<AlumnoBusqueda[]> {
  const q = busqueda.trim();
  if (!q) return [];
  const lista = await listarAlumnos({ busqueda: q, estado: "activo" });
  return lista.slice(0, 8).map((a) => ({
    id: a.id,
    legajo: a.legajo,
    nombre: a.nombre,
    apellido: a.apellido,
    dni: a.dni,
    email: a.email,
    responsable: a.responsable,
    nivelEducativo: a.nivelEducativo,
  }));
}

/** Materias activas que tienen al menos un profesor activo que las dicte. */
export async function listarMateriasActivas(): Promise<MateriaOpcion[]> {
  const [materias, profesores] = await Promise.all([
    listarMaterias({ estado: "activo" }),
    apiGet<ProfesorResponse[]>(`${RUTA_PROFESORES}?estado=activo`),
  ]);

  const materiasConProfesor = new Set<number>();
  for (const p of profesores) {
    if (p.estado === "activo") {
      for (const pm of p.materias) {
        materiasConProfesor.add(pm.materia.id);
      }
    }
  }

  return materias
    .filter((m) => materiasConProfesor.has(m.id))
    .map((m) => ({ id: m.id, nombre: m.nombre, nivel: m.nivel, duracionClaseMinutos: m.duracionClaseMinutos }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}

/**
 * Profesores activos que dictan la materia, con capacidad y precio
 * (GET /api/profesores?materiaId=&estado=activo → fila de esa materia).
 */
export async function listarProfesoresDeMateria(materiaId: number): Promise<ProfesorDeMateria[]> {
  const lista = await apiGet<ProfesorResponse[]>(
    `${RUTA_PROFESORES}?materiaId=${materiaId}&estado=activo`,
  );
  return lista
    .flatMap((p) => {
      const pm = p.materias.find((m) => m.materia.id === materiaId);
      return pm
        ? [{ id: p.id, nombre: p.usuario.nombre, apellido: p.usuario.apellido, capacidadMaxima: pm.capacidadMaxima, precio: pm.precio }]
        : [];
    })
    .sort((a, b) => a.apellido.localeCompare(b.apellido));
}

/**
 * Franjas del profesor para la fecha, con cupos.
 * GET /api/calendario/agenda + GET /api/profesores/:id + GET /api/turnos?alumnoId=
 */
export async function listarFranjas(q: FranjasQuery): Promise<FranjaTurnoResponse[]> {
  const [agenda, pm, turnosAlumno] = await Promise.all([
    apiGet<AgendaDiaResponse>(`${RUTA_AGENDA}?profesorId=${q.profesorId}&fecha=${q.fecha}`),
    datosProfesorMateria(q.profesorId, q.materiaId),
    q.alumnoId ? turnosReservadosDelAlumno(q.alumnoId, q.fecha, q.fecha) : Promise.resolve([]),
  ]);
  if (!pm) return [];
  return calcularFranjas(q.fecha, agenda, pm.capacidad, pm.duracion, turnosAlumno, Date.now());
}

/**
 * Próximo horario libre del profesor desde `desde`, dentro de los 60 días.
 * Usa los huecos de la vista `vw_huecos_disponibles` (GET /api/calendario/huecos):
 * un hueco no tiene NINGÚN turno, así que la sugerencia es siempre una franja
 * con el cupo completo. null si no hay ninguno.
 */
export async function sugerirProximaFranja(
  q: Omit<FranjasQuery, "fecha"> & { desde: string },
): Promise<SugerenciaFranja | null> {
  const hasta = sumarDias(hoyISO(), DIAS_MAXIMOS_RESERVA);
  const pm = await datosProfesorMateria(q.profesorId, q.materiaId);
  if (!pm) return null;

  const params = new URLSearchParams({
    profesorId: String(q.profesorId),
    desde: q.desde,
    hasta,
    duracionMinutos: String(pm.duracion),
  });
  const [huecos, turnosAlumno] = await Promise.all([
    apiGet<HuecoResponse[]>(`${RUTA_HUECOS}?${params.toString()}`),
    q.alumnoId ? turnosReservadosDelAlumno(q.alumnoId, q.desde, hasta) : Promise.resolve([]),
  ]);

  const ahora = Date.now();
  const limite = ahora + ANTICIPACION_MINIMA_HORAS * 3_600_000;
  const ordenados = [...huecos].sort((a, b) =>
    a.fecha === b.fecha ? aMin(a.horaInicio) - aMin(b.horaInicio) : a.fecha.localeCompare(b.fecha),
  );

  for (const h of ordenados) {
    const finHueco = aMin(h.horaFin);
    // Alineado a 30' (los bloques arrancan en :00 o :30).
    let ini = Math.ceil(aMin(h.horaInicio) / PASO_FRANJA_MIN) * PASO_FRANJA_MIN;
    for (; ini + pm.duracion <= finHueco; ini += PASO_FRANJA_MIN) {
      if (inicioDe(h.fecha, ini) < limite) continue;
      const fin = ini + pm.duracion;
      const cruza = turnosAlumno.some(
        (t) => t.fecha === h.fecha && seSuperponen(ini, fin, aMin(t.horaInicio), aMin(t.horaFin)),
      );
      if (cruza) continue;
      return {
        fecha: h.fecha,
        horaInicio: minAString(ini),
        horaFin: minAString(fin),
        capacidad: pm.capacidad,
        cuposDisponibles: pm.capacidad,
        disponible: true,
        motivo: null,
      };
    }
  }
  return null;
}

/**
 * Reserva el turno (POST /api/turnos).
 * El back valida cupo (FOR UPDATE), superposición del alumno (EXCLUDE
 * ex_turno_alumno_sin_superposicion), anticipación y disponibilidad; calcula
 * horaFin, copia valor_clase_congelado de precio_clase, toma usuario_id de la
 * sesión y la base genera el código. La bitácora la escribe el back
 * (`withAuditUser` + triggers de auditoría) en la misma transacción.
 */
export async function reservarTurno(body: CrearTurnoBody): Promise<TurnoResponse> {
  return apiSend<TurnoResponse>("POST", RUTA, body);
}

/** Mensajes del front para los códigos que la pantalla trata aparte. */
export const MENSAJES_ERROR: Partial<Record<ErrorTurno, string>> = {
  SIN_CUPO: "El horario ya no está disponible.",
};

// OPCIONAL: envío del comprobante por email (deseable de la HU). Si no se
// quiere, se borra esta función y el botón "Enviar por email" de la página.
/**
 * PENDIENTE CONTRATO: el back todavía no tiene la ruta de envío
 * (POST /api/turnos/:id/enviar-comprobante). Cuando exista:
 *   return apiSend<{ destinatario: string }>("POST", `${RUTA}/${turnoId}/enviar-comprobante`, {})
 * PENDIENTE DBA: `alumno` no tiene email del responsable.
 */
export async function enviarComprobantePorEmail(turnoId: number): Promise<{ destinatario: string }> {
  void turnoId;
  throw new ApiError(
    "NO_DISPONIBLE",
    "El envío por email todavía no está disponible.",
    undefined,
    501,
  );
}
