// src/data/historial.ts
//
// Capa de datos de Historial del Alumno: Línea de Tiempo y Notas (HU-ALU-03).
// Tipada con el contrato src/contracts/historial.ts.
// Sigue el patrón estándar documentado en docs/capa-de-datos-front.md y AGENTS.md.
// Cada función incluye comentarios // BACKEND: para la futura integración con endpoints.

import {
  rutaHistorial,
  rutaNotas,
  listarHistorialAlumnoQuery,
  crearNotaBody,
  type HistorialAlumnoResponse,
  type EventoHistorialResponse,
  type ResumenHistorialResponse,
  type NotaResponse,
  type ListarHistorialAlumnoQuery,
  type CrearNotaBody,
  type TipoEventoHistorial,
} from "@/contracts/historial";
import { ApiError } from "@/lib/api-client";

export type HistoryEvent = EventoHistorialResponse;

export {
  rutaHistorial,
  rutaNotas,
  type HistorialAlumnoResponse,
  type EventoHistorialResponse,
  type ResumenHistorialResponse,
  type NotaResponse,
  type ListarHistorialAlumnoQuery,
  type CrearNotaBody,
  type TipoEventoHistorial,
};

export interface SesionContexto {
  usuarioId?: number;
  nombreCompleto?: string;
  rol?: string;
  profesorId?: number;
}

const DEMORA_MS = 200;
const demorar = () => new Promise((resolve) => setTimeout(resolve, DEMORA_MS));

// ─── Memoria Local (Fixture) ──────────────────────────────────────────────────

type EventoEnMemoria = EventoHistorialResponse & { alumnoId: number };

const memoriaEventos: EventoEnMemoria[] = [
  // Alumno 1: Sofía Ramírez (ID 1)
  {
    alumnoId: 1,
    tipo: "Nota",
    fechaHora: "2026-10-12T11:30:00",
    materia: null,
    profesor: null,
    detalle: "El alumno presentó certificado médico justificando inasistencia de la semana pasada por consulta odontológica.",
    observaciones: null,
    cancelacionTardia: false,
    responsableCancelacion: null,
    usuario: { id: 2, nombreCompleto: "Gómez, Ana" },
    turnoId: null,
    fechaClase: null,
    horaClase: null,
  },
  {
    alumnoId: 1,
    tipo: "Ausente",
    fechaHora: "2026-10-11T10:00:00",
    materia: { id: 3, nombre: "Química" },
    profesor: { id: 3, nombreCompleto: "Peralta, Roberto" },
    detalle: "Clase 11/10/2026 10:00-11:00 · TUR-000104",
    observaciones: "Aviso telefónico con anticipación por turno médico.",
    cancelacionTardia: false,
    responsableCancelacion: null,
    usuario: { id: 3, nombreCompleto: "Peralta, Roberto" },
    turnoId: 104,
    fechaClase: "2026-10-11",
    horaClase: "10:00",
  },
  {
    alumnoId: 1,
    tipo: "Asistió",
    fechaHora: "2026-10-08T15:00:00",
    materia: { id: 1, nombre: "Matemática" },
    profesor: { id: 3, nombreCompleto: "Peralta, Roberto" },
    detalle: "Clase 08/10/2026 15:00-16:00 · TUR-000098",
    observaciones: "Logaritmos y propiedades operativas. Buen desempeño.",
    cancelacionTardia: false,
    responsableCancelacion: null,
    usuario: { id: 3, nombreCompleto: "Peralta, Roberto" },
    turnoId: 98,
    fechaClase: "2026-10-08",
    horaClase: "15:00",
  },
  {
    alumnoId: 1,
    tipo: "Modificado",
    fechaHora: "2026-10-04T16:20:00",
    materia: { id: 1, nombre: "Matemática" },
    profesor: { id: 3, nombreCompleto: "Peralta, Roberto" },
    detalle: "Reprogramado: 04/10/2026 15:00 → 05/10/2026 16:00 · Solicitado por el alumno",
    observaciones: null,
    cancelacionTardia: false,
    responsableCancelacion: null,
    usuario: { id: 2, nombreCompleto: "Gómez, Ana" },
    turnoId: 95,
    fechaClase: "2026-10-05",
    horaClase: "16:00",
  },
  {
    alumnoId: 1,
    tipo: "Asistió",
    fechaHora: "2026-10-05T16:00:00",
    materia: { id: 1, nombre: "Matemática" },
    profesor: { id: 3, nombreCompleto: "Peralta, Roberto" },
    detalle: "Clase 05/10/2026 16:00-17:00 · TUR-000095",
    observaciones: "Funciones exponenciales y asíntotas.",
    cancelacionTardia: false,
    responsableCancelacion: null,
    usuario: { id: 3, nombreCompleto: "Peralta, Roberto" },
    turnoId: 95,
    fechaClase: "2026-10-05",
    horaClase: "16:00",
  },
  {
    alumnoId: 1,
    tipo: "Cancelado",
    fechaHora: "2026-09-28T08:30:00",
    materia: { id: 1, nombre: "Matemática" },
    profesor: { id: 3, nombreCompleto: "Peralta, Roberto" },
    detalle: "Motivo: Problemas familiares informados con 1.5 horas de antelación · Clase 28/09/2026 10:00",
    observaciones: null,
    cancelacionTardia: true,
    responsableCancelacion: "Alumno",
    usuario: { id: 2, nombreCompleto: "Gómez, Ana" },
    turnoId: 85,
    fechaClase: "2026-09-28",
    horaClase: "10:00",
  },
  {
    alumnoId: 1,
    tipo: "Reservado",
    fechaHora: "2026-09-25T12:00:00",
    materia: { id: 1, nombre: "Matemática" },
    profesor: { id: 3, nombreCompleto: "Peralta, Roberto" },
    detalle: "Reserva de clase individual presencial · TUR-000085",
    observaciones: null,
    cancelacionTardia: false,
    responsableCancelacion: null,
    usuario: { id: 2, nombreCompleto: "Gómez, Ana" },
    turnoId: 85,
    fechaClase: "2026-09-28",
    horaClase: "10:00",
  },

  // Alumno 2: Lucas Benítez (ID 2)
  {
    alumnoId: 2,
    tipo: "Asistió",
    fechaHora: "2026-10-09T11:00:00",
    materia: { id: 2, nombre: "Física" },
    profesor: { id: 3, nombreCompleto: "Peralta, Roberto" },
    detalle: "Clase 09/10/2026 11:00-12:00 · TUR-000099",
    observaciones: "Leyes de Newton y diagrama de cuerpo libre.",
    cancelacionTardia: false,
    responsableCancelacion: null,
    usuario: { id: 3, nombreCompleto: "Peralta, Roberto" },
    turnoId: 99,
    fechaClase: "2026-10-09",
    horaClase: "11:00",
  },
  {
    alumnoId: 2,
    tipo: "Ausente",
    fechaHora: "2026-10-04T11:00:00",
    materia: { id: 2, nombre: "Física" },
    profesor: { id: 3, nombreCompleto: "Peralta, Roberto" },
    detalle: "Clase 04/10/2026 11:00-12:00 · TUR-000094",
    observaciones: "Sin aviso previo.",
    cancelacionTardia: false,
    responsableCancelacion: null,
    usuario: { id: 3, nombreCompleto: "Peralta, Roberto" },
    turnoId: 94,
    fechaClase: "2026-10-04",
    horaClase: "11:00",
  },
  {
    alumnoId: 2,
    tipo: "Nota",
    fechaHora: "2026-10-02T16:00:00",
    materia: null,
    profesor: null,
    detalle: "Se coordinó con el responsable reforzar los ejercicios prácticos previo al examen trimestral.",
    observaciones: null,
    cancelacionTardia: false,
    responsableCancelacion: null,
    usuario: { id: 1, nombreCompleto: "González, María" },
    turnoId: null,
    fechaClase: null,
    horaClase: null,
  },

  // Alumno 3: Valentina Herrera (ID 3)
  {
    alumnoId: 3,
    tipo: "Asistió",
    fechaHora: "2026-10-12T15:41:00",
    materia: { id: 1, nombre: "Matemática" },
    profesor: { id: 3, nombreCompleto: "Peralta, Roberto" },
    detalle: "Clase 12/10/2026 15:41-16:41 · TUR-000103",
    observaciones: "Ecuaciones cuadráticas y factorización por método de Gauss.",
    cancelacionTardia: false,
    responsableCancelacion: null,
    usuario: { id: 3, nombreCompleto: "Peralta, Roberto" },
    turnoId: 103,
    fechaClase: "2026-10-12",
    horaClase: "15:41",
  },
  {
    alumnoId: 3,
    tipo: "Asistió",
    fechaHora: "2026-10-06T16:00:00",
    materia: { id: 1, nombre: "Matemática" },
    profesor: { id: 3, nombreCompleto: "Peralta, Roberto" },
    detalle: "Clase 06/10/2026 16:00-17:00 · TUR-000087",
    observaciones: "Polinomios y regla de Ruffini.",
    cancelacionTardia: false,
    responsableCancelacion: null,
    usuario: { id: 3, nombreCompleto: "Peralta, Roberto" },
    turnoId: 87,
    fechaClase: "2026-10-06",
    horaClase: "16:00",
  },

  // Alumno 4: Mateo Ríos (ID 4 - Inactivo)
  {
    alumnoId: 4,
    tipo: "Asistió",
    fechaHora: "2026-10-02T09:00:00",
    materia: { id: 4, nombre: "Inglés" },
    profesor: { id: 1, nombreCompleto: "Pérez, Juan" },
    detalle: "Clase 02/10/2026 09:00-10:00 · TUR-000091",
    observaciones: "Conditional sentences Type 1 & 2.",
    cancelacionTardia: false,
    responsableCancelacion: null,
    usuario: { id: 1, nombreCompleto: "Pérez, Juan" },
    turnoId: 91,
    fechaClase: "2026-10-02",
    horaClase: "09:00",
  },
];

let siguienteNotaId = 800;

// Lista de profesores que atienden a cada alumno (para validación de rol Profesor)
const asignacionesProfesor: Record<number, number[]> = {
  1: [3],    // Sofía Ramírez atendida por Roberto Peralta (id 3)
  2: [3, 4], // Lucas Benítez atendido por Roberto Peralta (3) y Martín Gómez (4)
  3: [3],    // Valentina Herrera atendida por Roberto Peralta (3)
  4: [1],    // Mateo Ríos atendido por Juan Pérez (1)
};

// ─── API del Módulo ──────────────────────────────────────────────────────────

/**
 * Consulta la línea de tiempo completa y resumen del alumno (HU-ALU-03).
 */
export async function obtenerHistorialAlumno(
  alumnoId: number,
  query: ListarHistorialAlumnoQuery = {},
  sesion?: SesionContexto,
): Promise<HistorialAlumnoResponse> {
  await demorar();

  const filtros = listarHistorialAlumnoQuery.parse(query);

  // BACKEND: const sp = new URLSearchParams(...); return apiGet<HistorialAlumnoResponse>(`${rutaHistorial(alumnoId)}?${sp}`);

  const rol = sesion?.rol ?? "Mesa de Entrada";
  const profesorId = sesion?.profesorId ?? sesion?.usuarioId;

  // Validación de acceso: si es Profesor, solo puede acceder a alumnos que atiende
  if (rol === "Profesor" && profesorId) {
    const profesoresQueAtienden = asignacionesProfesor[alumnoId] ?? [];
    if (!profesoresQueAtienden.includes(profesorId)) {
      throw new ApiError(
        "PROFESOR_NO_ATIENDE_ALUMNO",
        "El profesor solo puede consultar el historial de los alumnos que asisten a sus clases.",
        undefined,
        403,
      );
    }
  }

  // Filtrado de eventos del alumno
  let eventos = memoriaEventos
    .filter((e) => e.alumnoId === alumnoId)
    .map((e) => ({ ...e }));

  // Aplicar filtros de fecha y hora
  if (filtros.desde) {
    const fechaDesde = filtros.desde;
    eventos = eventos.filter((e) => e.fechaHora.slice(0, 10) >= fechaDesde);
  }
  if (filtros.hasta) {
    const fechaHasta = filtros.hasta;
    eventos = eventos.filter((e) => e.fechaHora.slice(0, 10) <= fechaHasta);
  }
  if (filtros.tipo) {
    eventos = eventos.filter((e) => e.tipo === filtros.tipo);
  }
  if (filtros.materiaId) {
    // Las notas no tienen materia: al filtrar por materia no aparecen
    eventos = eventos.filter((e) => e.materia?.id === filtros.materiaId);
  }
  if (filtros.profesorId) {
    // Las notas no tienen profesor: al filtrar por profesor no aparecen
    eventos = eventos.filter((e) => e.profesor?.id === filtros.profesorId);
  }

  // Orden: fecha y hora descendente
  eventos.sort((a, b) => b.fechaHora.localeCompare(a.fechaHora));

  // Regla de permisos sobre observaciones sensibles:
  // Solo visibles para Mesa de Entrada, Gerente y Profesor que atiende al alumno
  const puedeVerObservaciones =
    rol === "Mesa de Entrada" ||
    rol === "Gerente" ||
    (rol === "Profesor" && profesorId && (asignacionesProfesor[alumnoId] ?? []).includes(profesorId));

  const eventosSanitizados = eventos.map((e) => ({
    ...e,
    observaciones: puedeVerObservaciones ? e.observaciones : null,
  }));

  // Cálculo de resumen del alumno (sobre la totalidad histórica del alumno, no cambia con filtros)
  const todosEventosAlumno = memoriaEventos.filter((e) => e.alumnoId === alumnoId);
  const clasesAsistidas = todosEventosAlumno.filter((e) => e.tipo === "Asistió").length;
  const ausencias = todosEventosAlumno.filter((e) => e.tipo === "Ausente").length;
  const cancelaciones = todosEventosAlumno.filter((e) => e.tipo === "Cancelado").length;
  const totalClases = clasesAsistidas + ausencias;
  const porcentajeAsistencia =
    totalClases > 0 ? Number(((clasesAsistidas / totalClases) * 100).toFixed(1)) : null;

  // Fecha de la última clase con asistencia/ausencia
  const clasesConcurridas = todosEventosAlumno
    .filter((e) => (e.tipo === "Asistió" || e.tipo === "Ausente") && e.fechaClase)
    .sort((a, b) => (b.fechaClase ?? "").localeCompare(a.fechaClase ?? ""));
  const fechaUltimaClase = clasesConcurridas.length > 0 ? clasesConcurridas[0].fechaClase : null;

  // Alumno inactivo (ejemplo alumno 4 es inactivo)
  const alumnoInactivo = alumnoId === 4;

  return {
    eventos: eventosSanitizados,
    resumen: {
      clasesAsistidas,
      ausencias,
      cancelaciones,
      porcentajeAsistencia,
      fechaUltimaClase,
    },
    alumnoInactivo,
  };
}

/**
 * Agrega una nota de texto libre al historial del alumno (HU-ALU-03).
 */
export async function agregarNotaAlumno(
  alumnoId: number,
  body: CrearNotaBody,
  sesion?: SesionContexto,
): Promise<NotaResponse> {
  await demorar();

  const input = crearNotaBody.parse(body);

  // BACKEND: return apiSend<NotaResponse>("POST", rutaNotas(alumnoId), input);

  // Alumno inactivo no permite agregar notas (409)
  if (alumnoId === 4) {
    throw new ApiError(
      "ALUMNO_INACTIVO",
      "No es posible agregar notas a un alumno inactivo.",
      undefined,
      409,
    );
  }

  const rol = sesion?.rol ?? "Mesa de Entrada";
  const profesorId = sesion?.profesorId ?? sesion?.usuarioId;

  if (rol === "Profesor" && profesorId) {
    const profesoresQueAtienden = asignacionesProfesor[alumnoId] ?? [];
    if (!profesoresQueAtienden.includes(profesorId)) {
      throw new ApiError(
        "PROFESOR_NO_ATIENDE_ALUMNO",
        "El profesor solo puede agregar notas a los alumnos que atiende.",
        undefined,
        403,
      );
    }
  }

  const ahora = new Date();
  const anio = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, "0");
  const dia = String(ahora.getDate()).padStart(2, "0");
  const horas = String(ahora.getHours()).padStart(2, "0");
  const minutos = String(ahora.getMinutes()).padStart(2, "0");
  const segundos = String(ahora.getSeconds()).padStart(2, "0");
  const fechaHoraIso = `${anio}-${mes}-${dia}T${horas}:${minutos}:${segundos}`;

  const nombreUsuario =
    sesion?.nombreCompleto ??
    (rol === "Gerente" ? "González, María" : "Gómez, Ana");

  const nuevoEvento: EventoEnMemoria = {
    alumnoId,
    tipo: "Nota",
    fechaHora: fechaHoraIso,
    materia: null,
    profesor: null,
    detalle: input.texto,
    observaciones: null,
    cancelacionTardia: false,
    responsableCancelacion: null,
    usuario: { id: sesion?.usuarioId ?? 2, nombreCompleto: nombreUsuario },
    turnoId: null,
    fechaClase: null,
    horaClase: null,
  };

  memoriaEventos.unshift(nuevoEvento);

  return {
    id: siguienteNotaId++,
    alumnoId,
    texto: input.texto,
    registradoPor: {
      id: sesion?.usuarioId ?? 2,
      nombre: nombreUsuario.split(",")[1]?.trim() ?? "Usuario",
      apellido: nombreUsuario.split(",")[0]?.trim() ?? "Sistema",
    },
    fechaCreacion: ahora.toISOString(),
  };
}
