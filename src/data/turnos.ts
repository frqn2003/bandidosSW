// Capa de datos de Reserva de turnos (HU-TUR-01).
//
// El back todavía no publicó `/api/turnos`, así que este fixture se comporta
// como el service: calcula las franjas libres (disponibilidad del profesor
// menos turnos reservados), descuenta cupos, valida superposición del alumno y
// anticipación mínima, y genera el código TUR-000123.
//
// Patrón y checklist: docs/capa-de-datos-front.md
// Contrato: src/contracts/turno.ts · Brief: docs/briefs/HU-TUR-01.md
//
// Los catálogos (alumnos, materias, profesores) ya tienen endpoint real, pero
// acá se usa un fixture propio alineado con el del calendario (mismos ids)
// para que la precarga desde /calendario coincida. Cada función indica con
// `// BACKEND:` qué llamada real la reemplaza.

import {
  RUTA,
  type CrearTurnoBody,
  type ErrorTurno,
  type TurnoResponse,
} from "@/contracts/turno";
import type { AlumnoResponse } from "@/contracts/alumno";
import type { MateriaOpcion } from "@/contracts/materia";
import type { ProfesorOpcion } from "@/contracts/profesor";
import { ApiError } from "@/lib/api-client";
import { sesionActual } from "@/data/auth";
import {
  agendaFixture,
  registrarTurnoFixture,
  turnosDelAlumnoFixture,
} from "@/data/calendario";

export type { TurnoResponse };
export { RUTA };


// ─── Parámetros de negocio ───────────────────────────────────────────────

/**
 * Anticipación mínima respecto del inicio de la clase (parametrizable).
 * BACKEND: la fuente de verdad es el back (error ANTICIPACION_INSUFICIENTE).
 * PENDIENTE CONTRATO: exponer el parámetro (ej. GET /api/parametros) para que
 * el front no lo tenga fijo.
 */
export const ANTICIPACION_MINIMA_HORAS = 2;
/** La reserva se abre hasta 60 días hacia adelante. */
export const DIAS_MAXIMOS_RESERVA = 60;
/** turno.observaciones varchar(250). */
export const MAX_OBSERVACIONES = 250;
/** Las franjas arrancan cada 30' (agenda_profesional usa múltiplos de 30'). */
const PASO_FRANJA_MIN = 30;


// ─── Tipos de la pantalla ────────────────────────────────────────────────

/** Lo que el buscador necesita de cada alumno (subset de AlumnoResponse). */
export type AlumnoBusqueda = Pick<
  AlumnoResponse,
  "id" | "legajo" | "nombre" | "apellido" | "dni" | "email" | "responsable"
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
 * PENDIENTE CONTRATO: franjas libres de un profesor para una materia y fecha.
 * GET /api/turnos/franjas?profesorId=&materiaId=&fecha=&alumnoId=
 *
 * `cuposDisponibles` NO es una columna: el back lo calcula como
 * `profesor_materia.capacidad_maxima − turnos Reservado superpuestos`.
 * `alumnoId` es opcional: si viaja, el back marca las franjas donde ese alumno
 * ya tiene otro turno (prevención; el POST igual lo valida).
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

function aMin(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

function minAString(total: number): string {
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

const seSuperponen = (aIni: number, aFin: number, bIni: number, bFin: number) =>
  aIni < bFin && bIni < aFin;

/** Minúsculas y sin acentos, para la coincidencia parcial del buscador. */
const normalizar = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();


// ─── Fixture: lo único que desaparece el día del back ────────────────────

/** Los ids 1..7 coinciden con los alumnos de los turnos del calendario. */
const ALUMNOS: (AlumnoBusqueda & { estado: AlumnoResponse["estado"] })[] = [
  { id: 1, legajo: "ALU-000001", nombre: "María", apellido: "López", dni: "45123456", email: "maria.lopez@mail.com", responsable: { nombre: "Graciela López", dni: "22345678", telefono: "3874112233" }, estado: "activo" },
  { id: 2, legajo: "ALU-000002", nombre: "Carlos", apellido: "Sosa", dni: "44987321", email: null, responsable: null, estado: "activo" },
  { id: 3, legajo: "ALU-000003", nombre: "Valentina", apellido: "Ríos", dni: "46555012", email: "vale.rios@mail.com", responsable: { nombre: "Pablo Ríos", dni: "25111222", telefono: "3874556677" }, estado: "activo" },
  { id: 4, legajo: "ALU-000004", nombre: "Tomás", apellido: "Ibarra", dni: "43210987", email: "tomas.ibarra@mail.com", responsable: null, estado: "activo" },
  { id: 5, legajo: "ALU-000005", nombre: "Sofía", apellido: "Medina", dni: "47001234", email: "sofi.medina@mail.com", responsable: { nombre: "Laura Medina", dni: "27888999", telefono: "3875001122" }, estado: "activo" },
  { id: 6, legajo: "ALU-000006", nombre: "Bruno", apellido: "Acuña", dni: "42876543", email: "bruno.acuna@mail.com", responsable: null, estado: "activo" },
  { id: 7, legajo: "ALU-000007", nombre: "Camila", apellido: "Vega", dni: "45678901", email: null, responsable: null, estado: "activo" },
  { id: 8, legajo: "ALU-000008", nombre: "Julieta", apellido: "Acosta", dni: "46123789", email: "juli.acosta@mail.com", responsable: { nombre: "Marcelo Acosta", dni: "24333444", telefono: "3874998877" }, estado: "activo" },
  { id: 9, legajo: "ALU-000009", nombre: "Martín", apellido: "Herrera", dni: "41555666", email: "martin.herrera@mail.com", responsable: null, estado: "inactivo" },
  { id: 10, legajo: "ALU-000010", nombre: "Lucas", apellido: "Fernández", dni: "44321654", email: "lucas.fernandez@mail.com", responsable: null, estado: "activo" },
];

/** Los ids 1..4 coinciden con las materias de los turnos del calendario. */
const MATERIAS: (MateriaOpcion & { estado: "activo" | "inactivo" })[] = [
  { id: 1, nombre: "Matemática", nivel: "Secundario", duracionClaseMinutos: 60, estado: "activo" },
  { id: 2, nombre: "Inglés", nivel: "Secundario", duracionClaseMinutos: 60, estado: "activo" },
  { id: 3, nombre: "Química", nivel: "Secundario", duracionClaseMinutos: 60, estado: "activo" },
  { id: 4, nombre: "Historia", nivel: "Secundario", duracionClaseMinutos: 60, estado: "activo" },
  { id: 5, nombre: "Física", nivel: "Universitario", duracionClaseMinutos: 90, estado: "activo" },
  { id: 6, nombre: "Lengua", nivel: "Primario", duracionClaseMinutos: 45, estado: "activo" },
  { id: 7, nombre: "Latín", nivel: "Secundario", duracionClaseMinutos: 60, estado: "inactivo" },
];

/** Los ids 1..4 coinciden con los profesores del calendario (mismos bloques). */
const PROFESORES: {
  id: number;
  nombre: string;
  apellido: string;
  estado: "activo" | "inactivo";
  // profesor_materia (capacidad_maxima) + precio_clase (precio)
  materias: { materiaId: number; capacidadMaxima: number; precio: number }[];
}[] = [
  {
    id: 1, nombre: "Juan", apellido: "Pérez", estado: "activo",
    materias: [
      { materiaId: 1, capacidadMaxima: 3, precio: 8500 },
      { materiaId: 2, capacidadMaxima: 4, precio: 7800 },
      { materiaId: 5, capacidadMaxima: 2, precio: 11000 },
    ],
  },
  {
    id: 2, nombre: "Ana", apellido: "González", estado: "activo",
    materias: [
      { materiaId: 3, capacidadMaxima: 4, precio: 9200 },
      { materiaId: 1, capacidadMaxima: 2, precio: 8800 },
    ],
  },
  {
    id: 3, nombre: "Lucía", apellido: "Rodríguez", estado: "activo",
    materias: [
      { materiaId: 6, capacidadMaxima: 5, precio: 6500 },
      { materiaId: 2, capacidadMaxima: 3, precio: 7500 },
    ],
  },
  {
    id: 4, nombre: "Roberto", apellido: "Peralta", estado: "activo",
    materias: [{ materiaId: 4, capacidadMaxima: 4, precio: 7000 }],
  },
  // Inactivo: dicta Matemática pero NO debe aparecer en el combo.
  {
    id: 5, nombre: "Diego", apellido: "Luna", estado: "inactivo",
    materias: [{ materiaId: 1, capacidadMaxima: 3, precio: 8000 }],
  },
];

/**
 * Próximo lunes o viernes (desde mañana): el día en que Juan Pérez y Lucía
 * Rodríguez atienden a la vez a la mañana. Ahí caen los turnos de demo:
 *  · Juan / Matemática 11:00–12:00 con el cupo lleno (3 de 3) → franjas en gris.
 *  · Juan / Matemática 09:00–10:00 con 1 alumno → "Cupos disponibles 2 de 3".
 *  · María López con Lucía 10:00–10:45 → reservar a María con Juan a las 10:00
 *    rechaza por superposición.
 */
function fechaDemo(): string {
  let f = sumarDias(hoyISO(), 1);
  for (let i = 0; i < 7; i++) {
    const dia = new Date(`${f}T00:00:00`).getDay();
    if (dia === 1 || dia === 5) return f;
    f = sumarDias(f, 1);
  }
  return f;
}

/** Turnos futuros sembrados para la demo (tabla `turno`). */
type TurnoSemilla = {
  id: number;
  profesorId: number;
  alumnoId: number;
  materiaId: number;
  fecha: string;
  horaInicio: string;
  horaFin: string;
};

function semillas(): TurnoSemilla[] {
  const f = fechaDemo();
  return [
    { id: 120, profesorId: 1, alumnoId: 8, materiaId: 1, fecha: f, horaInicio: "11:00", horaFin: "12:00" },
    { id: 121, profesorId: 1, alumnoId: 10, materiaId: 1, fecha: f, horaInicio: "11:00", horaFin: "12:00" },
    { id: 122, profesorId: 1, alumnoId: 6, materiaId: 1, fecha: f, horaInicio: "11:00", horaFin: "12:00" },
    { id: 123, profesorId: 1, alumnoId: 3, materiaId: 1, fecha: f, horaInicio: "09:00", horaFin: "10:00" },
    { id: 118, profesorId: 3, alumnoId: 1, materiaId: 6, fecha: f, horaInicio: "10:00", horaFin: "10:45" },
  ];
}

const memoria: TurnoSemilla[] = semillas();
/** El próximo turno es TUR-000124 (la base genera el código desde el id). */
let proximoId = 124;
/** turnoId → alumnoId de las reservas hechas en esta sesión (para el email). */
const memoriaReservas = new Map<number, number>();
/** `?demo=concurrencia`: la primera confirmación simula que otro operador tomó el cupo. */
let concurrenciaSimulada = false;

const DEMORA_MS = 350;
const demorar = () => new Promise((r) => setTimeout(r, DEMORA_MS));

const demo = (clave: string) =>
  typeof window !== "undefined" && window.location.search.includes(`demo=${clave}`);

const error = (codigo: ErrorTurno, mensaje: string, status: number, campo?: string) =>
  new ApiError(codigo, mensaje, campo, status);

export const MENSAJES_ERROR: Partial<Record<ErrorTurno, string>> = {
  SIN_CUPO: "El horario ya no está disponible.",
  ALUMNO_CON_TURNO_SUPERPUESTO:
    "El alumno ya tiene otro turno reservado que se superpone con este horario.",
  ANTICIPACION_INSUFICIENTE: `La clase tiene que reservarse con al menos ${ANTICIPACION_MINIMA_HORAS} horas de anticipación.`,
  FUERA_DE_DISPONIBILIDAD: "El horario no está dentro de la disponibilidad del profesor.",
};

/** Turnos reservados del profesor en esa fecha (calendario + sembrados). */
function ocupacionDe(profesorId: number, fecha: string) {
  const { turnos } = agendaFixture(profesorId, fecha);
  return [
    ...turnos,
    ...memoria.filter((t) => t.profesorId === profesorId && t.fecha === fecha),
  ];
}

/** Turnos reservados del alumno en esa fecha, con cualquier profesor. */
function turnosDelAlumno(alumnoId: number, fecha: string) {
  return [
    ...turnosDelAlumnoFixture(alumnoId, fecha),
    ...memoria.filter((t) => t.alumnoId === alumnoId && t.fecha === fecha),
  ];
}

/** Lo mismo que hará el back en GET /api/turnos/franjas (sin demora). */
function calcularFranjas(q: FranjasQuery, ahora: Date): FranjaTurnoResponse[] {
  const profesor = PROFESORES.find((p) => p.id === q.profesorId && p.estado === "activo");
  const pm = profesor?.materias.find((m) => m.materiaId === q.materiaId);
  const materia = MATERIAS.find((m) => m.id === q.materiaId);
  if (!profesor || !pm || !materia) return [];

  const duracion = materia.duracionClaseMinutos;
  const { bloques } = agendaFixture(q.profesorId, q.fecha);
  const ocupados = ocupacionDe(q.profesorId, q.fecha);
  const delAlumno = q.alumnoId ? turnosDelAlumno(q.alumnoId, q.fecha) : [];
  const limiteAnticipacion = ahora.getTime() + ANTICIPACION_MINIMA_HORAS * 3_600_000;

  const franjas: FranjaTurnoResponse[] = [];
  for (const bloque of bloques) {
    const finBloque = aMin(bloque.horaFin);
    for (let ini = aMin(bloque.horaInicio); ini + duracion <= finBloque; ini += PASO_FRANJA_MIN) {
      const fin = ini + duracion;
      const inicio = new Date(`${q.fecha}T${minAString(ini)}:00`);
      // Las franjas que ya empezaron no se ofrecen.
      if (inicio.getTime() <= ahora.getTime()) continue;

      const cruzados = ocupados.filter((t) =>
        seSuperponen(ini, fin, aMin(t.horaInicio), aMin(t.horaFin)),
      );
      // El cupo es de la clase de ESA materia: si el profesor ya da otra
      // materia en ese horario, la franja no tiene lugar (no puede dar dos).
      // BACKEND: regla a confirmar con el back (se valida en el service).
      const otraMateria = cruzados.some((t) => t.materiaId !== q.materiaId);
      const cuposDisponibles = otraMateria ? 0 : Math.max(0, pm.capacidadMaxima - cruzados.length);
      const alumnoOcupado = delAlumno.some((t) =>
        seSuperponen(ini, fin, aMin(t.horaInicio), aMin(t.horaFin)),
      );

      let motivo: MotivoFranja | null = null;
      if (inicio.getTime() < limiteAnticipacion) motivo = "ANTICIPACION_INSUFICIENTE";
      else if (cuposDisponibles === 0) motivo = "SIN_CUPO";
      else if (alumnoOcupado) motivo = "ALUMNO_CON_TURNO_SUPERPUESTO";

      franjas.push({
        horaInicio: minAString(ini),
        horaFin: minAString(fin),
        capacidad: pm.capacidadMaxima,
        cuposDisponibles,
        disponible: motivo === null,
        motivo,
      });
    }
  }
  return franjas;
}


// ─── API del módulo (firma final: no cambia cuando entra el back) ─────────

/**
 * Buscador de alumnos: DNI, nombre, apellido o legajo, coincidencia parcial,
 * solo activos.
 * BACKEND: return listarAlumnos({ busqueda, estado: "activo" }) de
 * `@/data/alumnos` → GET /api/alumnos?busqueda=&estado=activo.
 */
export async function buscarAlumnosActivos(busqueda: string): Promise<AlumnoBusqueda[]> {
  await demorar();
  if (demo("error")) throw new ApiError("ERROR_DESCONOCIDO", "No pudimos buscar alumnos.", undefined, 500);
  const q = normalizar(busqueda);
  if (!q) return [];
  return ALUMNOS.filter((a) => a.estado === "activo")
    .filter((a) =>
      [a.dni, a.legajo, a.nombre, a.apellido, `${a.nombre} ${a.apellido}`, `${a.apellido} ${a.nombre}`]
        .map(normalizar)
        .some((campo) => campo.includes(q)),
    )
    .slice(0, 8)
    .map((a) => ({
      id: a.id,
      legajo: a.legajo,
      nombre: a.nombre,
      apellido: a.apellido,
      dni: a.dni,
      email: a.email,
      responsable: a.responsable ? { ...a.responsable } : null,
    }));
}

/**
 * Materias activas para el combo.
 * BACKEND: return listarMaterias({ estado: "activo" }) de `@/data/materias`
 * → GET /api/materias?estado=activo (se usan los campos de MateriaOpcion).
 */
export async function listarMateriasActivas(): Promise<MateriaOpcion[]> {
  await demorar();
  if (demo("error")) throw new ApiError("ERROR_DESCONOCIDO", "No pudimos cargar las materias.", undefined, 500);
  return MATERIAS.filter((m) => m.estado === "activo").map((m) => ({
    id: m.id,
    nombre: m.nombre,
    nivel: m.nivel,
    duracionClaseMinutos: m.duracionClaseMinutos,
  }));
}

/**
 * Profesores activos que dictan la materia, con capacidad y precio.
 * BACKEND: return listarProfesores({ materiaId, estado: "activo" }) de
 * `@/data/profesores` → GET /api/profesores?materiaId=&estado=activo, y de
 * `ProfesorResponse.materias[]` se toma la fila de esa materia
 * (capacidadMaxima, precio).
 */
export async function listarProfesoresDeMateria(materiaId: number): Promise<ProfesorDeMateria[]> {
  await demorar();
  return PROFESORES.filter((p) => p.estado === "activo")
    .flatMap((p) => {
      const pm = p.materias.find((m) => m.materiaId === materiaId);
      return pm
        ? [{ id: p.id, nombre: p.nombre, apellido: p.apellido, capacidadMaxima: pm.capacidadMaxima, precio: pm.precio }]
        : [];
    })
    .sort((a, b) => a.apellido.localeCompare(b.apellido));
}

/**
 * Franjas del profesor para la fecha, con cupos.
 * BACKEND: return apiGet<FranjaTurnoResponse[]>(`${RUTA}/franjas?profesorId=&materiaId=&fecha=&alumnoId=`)
 * PENDIENTE CONTRATO: agregar la ruta y `FranjaTurnoResponse` a src/contracts/turno.ts.
 */
export async function listarFranjas(q: FranjasQuery): Promise<FranjaTurnoResponse[]> {
  await demorar();
  if (demo("error")) throw new ApiError("ERROR_DESCONOCIDO", "No pudimos cargar los horarios.", undefined, 500);
  return calcularFranjas(q, new Date());
}

/**
 * Próximo horario libre del profesor desde `desde` (inclusive), dentro de los
 * 60 días de la ventana de reserva. null si no hay ninguno.
 * BACKEND: return apiGet<SugerenciaFranja | null>(`${RUTA}/proxima-franja?profesorId=&materiaId=&alumnoId=&desde=`)
 * PENDIENTE CONTRATO: ruta de sugerencia (deseable de la HU).
 */
export async function sugerirProximaFranja(
  q: Omit<FranjasQuery, "fecha"> & { desde: string },
): Promise<SugerenciaFranja | null> {
  await demorar();
  const ahora = new Date();
  const limite = sumarDias(hoyISO(), DIAS_MAXIMOS_RESERVA);
  for (let fecha = q.desde; fecha <= limite; fecha = sumarDias(fecha, 1)) {
    const libre = calcularFranjas({ ...q, fecha }, ahora).find((f) => f.disponible);
    if (libre) return { ...libre, fecha };
  }
  return null;
}

/**
 * Reserva el turno.
 * BACKEND: return apiSend<TurnoResponse>("POST", RUTA, body)
 * El back valida cupo, superposición del alumno (EXCLUDE
 * ex_turno_alumno_sin_superposicion), anticipación y disponibilidad; calcula
 * horaFin, copia valor_clase_congelado de precio_clase, toma usuario_id de la
 * sesión y la base genera el código. BACKEND: en la misma transacción registra
 * la reserva en `auditoria` (usuario responsable, fecha/hora y datos del
 * turno) — el front no escribe la bitácora.
 */
export async function reservarTurno(body: CrearTurnoBody): Promise<TurnoResponse> {
  await demorar();

  const alumno = ALUMNOS.find((a) => a.id === body.alumnoId);
  const profesor = PROFESORES.find((p) => p.id === body.profesorId);
  const materia = MATERIAS.find((m) => m.id === body.materiaId);
  const pm = profesor?.materias.find((m) => m.materiaId === body.materiaId);
  if (!alumno || !profesor || !materia) throw error("REFERENCIA_INVALIDA", "Revisá alumno, profesor y materia.", 422);
  if (alumno.estado !== "activo") throw error("ALUMNO_INACTIVO", "El alumno está inactivo.", 422, "alumnoId");
  if (profesor.estado !== "activo") throw error("PROFESOR_INACTIVO", "El profesor está inactivo.", 422, "profesorId");
  if (!pm) throw error("PROFESOR_NO_DICTA_MATERIA", "El profesor no dicta esa materia.", 422, "profesorId");

  const ahora = new Date();
  const ini = aMin(body.horaInicio);
  const fin = ini + materia.duracionClaseMinutos;
  const franja = calcularFranjas(
    { profesorId: body.profesorId, materiaId: body.materiaId, fecha: body.fecha },
    ahora,
  ).find((f) => f.horaInicio === body.horaInicio);

  if (!franja) throw error("FUERA_DE_DISPONIBILIDAD", MENSAJES_ERROR.FUERA_DE_DISPONIBILIDAD!, 422, "horaInicio");
  if (franja.motivo === "ANTICIPACION_INSUFICIENTE")
    throw error("ANTICIPACION_INSUFICIENTE", MENSAJES_ERROR.ANTICIPACION_INSUFICIENTE!, 422, "horaInicio");

  // Demo de concurrencia: otro operador tomó los cupos que quedaban mientras
  // se completaba el formulario.
  if (demo("concurrencia") && !concurrenciaSimulada && franja.cuposDisponibles > 0) {
    concurrenciaSimulada = true;
    for (let i = 0; i < franja.cuposDisponibles; i++) {
      memoria.push({
        id: 900 + i,
        profesorId: body.profesorId,
        alumnoId: 900 + i,
        materiaId: body.materiaId,
        fecha: body.fecha,
        horaInicio: body.horaInicio,
        horaFin: minAString(fin),
      });
    }
    throw error("SIN_CUPO", MENSAJES_ERROR.SIN_CUPO!, 409, "horaInicio");
  }
  if (franja.cuposDisponibles === 0) throw error("SIN_CUPO", MENSAJES_ERROR.SIN_CUPO!, 409, "horaInicio");

  const cruce = turnosDelAlumno(body.alumnoId, body.fecha).some((t) =>
    seSuperponen(ini, fin, aMin(t.horaInicio), aMin(t.horaFin)),
  );
  if (cruce)
    throw error("ALUMNO_CON_TURNO_SUPERPUESTO", MENSAJES_ERROR.ALUMNO_CON_TURNO_SUPERPUESTO!, 409, "alumnoId");

  // usuario_id sale de la sesión (en el back, de la cookie; nunca del body).
  let registradoPor = { id: 0, nombre: "Mesa de", apellido: "Entrada" };
  try {
    const sesion = await sesionActual();
    if (sesion) registradoPor = { id: sesion.usuario.id, nombre: sesion.usuario.nombre, apellido: sesion.usuario.apellido };
  } catch {
    // Sin sesión resuelta el fixture igual devuelve el comprobante.
  }

  const id = proximoId++;
  const codigo = `TUR-${String(id).padStart(6, "0")}`;
  const turno: TurnoResponse = {
    id,
    codigo,
    alumno: { id: alumno.id, legajo: alumno.legajo, nombre: alumno.nombre, apellido: alumno.apellido },
    profesor: { id: profesor.id, nombre: profesor.nombre, apellido: profesor.apellido },
    materia: { id: materia.id, nombre: materia.nombre, nivel: materia.nivel, duracionClaseMinutos: materia.duracionClaseMinutos },
    fecha: body.fecha,
    horaInicio: body.horaInicio,
    horaFin: minAString(fin),
    valorClaseCongelado: pm.precio,
    estado: "Reservado",
    observaciones: body.observaciones?.trim() ? body.observaciones.trim() : null,
    registradoPor,
    fechaCreacion: ahora.toISOString(),
  };

  memoriaReservas.set(id, alumno.id);

  // Aparece en /calendario al volver (misma sesión del navegador).
  registrarTurnoFixture({
    id,
    codigo,
    profesorId: profesor.id,
    fecha: body.fecha,
    alumno: { id: alumno.id, nombre: alumno.nombre, apellido: alumno.apellido },
    materia: { id: materia.id, nombre: materia.nombre },
    horaInicio: turno.horaInicio,
    horaFin: turno.horaFin,
    estado: "Reservado",
  });

  return { ...turno, alumno: { ...turno.alumno }, profesor: { ...turno.profesor }, materia: { ...turno.materia }, registradoPor: { ...registradoPor } };
}

/** Email del alumno para el comprobante (null si no tiene cargado). */
export function emailDelAlumno(alumnoId: number): string | null {
  return ALUMNOS.find((a) => a.id === alumnoId)?.email ?? null;
}

// OPCIONAL: envío del comprobante por email (deseable de la HU). Si no se
// quiere, se borra esta función y el botón "Enviar por email" de
// ComprobanteTurno / la página.
/**
 * BACKEND: return apiSend<void>("POST", `${RUTA}/${turnoId}/enviar-comprobante`, {})
 * PENDIENTE CONTRATO: ruta de envío. Se manda al email del alumno.
 * PENDIENTE DBA: `alumno` no tiene email del responsable (solo nombre, DNI y
 * teléfono); para enviarlo al responsable hace falta `responsable_email`.
 */
export async function enviarComprobantePorEmail(turnoId: number): Promise<{ destinatario: string }> {
  await demorar();
  const turno = memoriaReservas.get(turnoId);
  const email = turno ? emailDelAlumno(turno) : null;
  if (!email) throw new ApiError("DATOS_INVALIDOS", "El alumno no tiene email cargado.", undefined, 422);
  return { destinatario: email };
}
