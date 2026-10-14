// src/data/asistencia.ts
//
// Capa de datos de Asistencia (HU-ASI-01).
// Tipada con el contrato src/contracts/asistencia.ts.
// Sigue el patrón estándar documentado en docs/capa-de-datos-front.md y AGENTS.md.
// Cada punto de integración lleva su comentario // BACKEND: para el equipo de backend.

import {
  RUTA,
  RUTA_CLASES_DEL_DIA,
  rutaAsistencia,
  rutaHistorialAlumno,
  registrarAsistenciaBody,
  corregirAsistenciaBody,
  listarClasesDelDiaQuery,
  listarHistorialQuery,
  type ClaseDelDiaResponse,
  type AsistenciaResponse,
  type HistorialAsistenciaResponse,
  type HistorialAsistenciaItem,
  type ResumenAsistencia,
  type RegistrarAsistenciaBody,
  type CorregirAsistenciaBody,
  type ListarClasesDelDiaQuery,
  type ListarHistorialQuery,
  type ErrorAsistencia,
  type EstadoClase,
} from "@/contracts/asistencia";
import { ApiError } from "@/lib/api-client";
import {
  evaluarVentanaRegistro,
  evaluarPlazoCorreccion,
  calcularPorcentajeAsistencia,
  fechaAISO,
} from "@/funciones/asistencia-reglas";
import {
  CLASES_DEL_DIA_FIXTURE,
  HISTORIAL_ALUMNOS_FIXTURE,
  PROFESOR_DEMO,
  GERENTE_DEMO,
  PROFESORES_ASISTENCIA,
} from "@/data/fixtures/asistencia.fixture";

export {
  RUTA,
  RUTA_CLASES_DEL_DIA,
  rutaAsistencia,
  rutaHistorialAlumno,
  PROFESORES_ASISTENCIA,
  type ClaseDelDiaResponse,
  type AsistenciaResponse,
  type HistorialAsistenciaResponse,
  type HistorialAsistenciaItem,
  type ResumenAsistencia,
  type RegistrarAsistenciaBody,
  type CorregirAsistenciaBody,
  type ListarClasesDelDiaQuery,
  type ListarHistorialQuery,
  type ErrorAsistencia,
};

// ─── Memoria local (Fixture que se reemplaza con fetch el día del backend) ────
const memoriaClases = CLASES_DEL_DIA_FIXTURE.map((c) => ({
  ...c,
  asistencia: c.asistencia ? { ...c.asistencia } : null,
}));

const memoriaHistorial = HISTORIAL_ALUMNOS_FIXTURE.map((h) => ({ ...h }));

let siguienteAsistenciaId = 600;

const DEMORA_MS = 250;
const demorar = () => new Promise((resolve) => setTimeout(resolve, DEMORA_MS));

// ─── API del módulo ──────────────────────────────────────────────────────────

export interface SesionContexto {
  usuarioId?: number;
  rol?: string;
  profesorId?: number;
}

/**
 * Consulta las clases del día para el profesor logueado (o todas si es Gerente / Mesa de Entrada).
 * Ordenadas por hora de inicio ascendente.
 */
export async function listarClasesDelDia(
  query: ListarClasesDelDiaQuery = {},
  sesion?: SesionContexto,
  tiempoSimulado?: Date,
): Promise<ClaseDelDiaResponse[]> {
  await demorar();
  const queryValida = listarClasesDelDiaQuery.parse(query);
  const fecha = queryValida.fecha ?? fechaAISO(tiempoSimulado ?? new Date());

  // BACKEND: return apiGet<ClaseDelDiaResponse[]>(`${RUTA_CLASES_DEL_DIA}?fecha=${fecha}`);

  const ahora = tiempoSimulado ?? new Date();
  const rol = sesion?.rol ?? "Profesor";
  if (rol !== "Profesor" && rol !== "Gerente" && rol !== "Mesa de Entrada") {
    // Solo roles autorizados pueden ver las clases
    return [];
  }

  let filtradas = memoriaClases.filter((c) => c.fecha === fecha);

  if (rol === "Profesor") {
    const profesorId = sesion?.profesorId ?? PROFESOR_DEMO.id;
    // El profesor solo ve sus propios turnos
    filtradas = filtradas.filter((c) => c.profesorId === profesorId);
  } else {
    // Gerente y Mesa de Entrada: ven todos o filtran por profesor si vino en la query
    if (queryValida.profesorId) {
      filtradas = filtradas.filter((c) => c.profesorId === queryValida.profesorId);
    }
  }

  // Recalcular flags de ventana de registro y plazo de corrección en vivo
  return filtradas
    .map((clase) => {
      const ventana = evaluarVentanaRegistro(clase.fecha, clase.horaInicio, clase.estado, ahora);
      const correccion = evaluarPlazoCorreccion(clase.asistencia, rol, ahora);

      // Solo el profesor asignado al turno puede registrar asistencia
      const esDocenteAsignado =
        rol === "Profesor" && clase.profesorId === (sesion?.profesorId ?? PROFESOR_DEMO.id);
      const puedeRegistrar = esDocenteAsignado && ventana.puedeRegistrar;

      return {
        turnoId: clase.turnoId,
        codigo: clase.codigo,
        profesor: clase.profesor,
        alumno: { ...clase.alumno },
        materia: { ...clase.materia },
        fecha: clase.fecha,
        horaInicio: clase.horaInicio,
        horaFin: clase.horaFin,
        estado: clase.estado,
        asistencia: clase.asistencia ? { ...clase.asistencia } : null,
        puedeRegistrar,
        puedeCorregir: correccion.puedeCorregir,
        motivoDeshabilitado: clase.asistencia
          ? correccion.motivoDeshabilitado
          : !esDocenteAsignado
            ? "Solo el profesor asignado puede registrar la asistencia."
            : ventana.motivoDeshabilitado,
      };
    })
    .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
}

/**
 * Registra la asistencia (Presente o Ausente) para un turno Reservado.
 */
export async function registrarAsistencia(
  body: RegistrarAsistenciaBody,
  sesion?: SesionContexto,
  tiempoSimulado?: Date,
): Promise<AsistenciaResponse> {
  await demorar();

  // Validación estricta con el contrato Zod
  const input = registrarAsistenciaBody.parse(body);

  // BACKEND: return apiSend<AsistenciaResponse>("POST", RUTA, input);

  const claseIndex = memoriaClases.findIndex((c) => c.turnoId === input.turnoId);
  if (claseIndex === -1) {
    throw new ApiError("NO_ENCONTRADO", "Turno no encontrado.", "turnoId", 404);
  }

  const clase = memoriaClases[claseIndex];

  // Regla: El Profesor solo puede registrar asistencia de sus propios turnos
  const profesorId = sesion?.profesorId ?? sesion?.usuarioId ?? PROFESOR_DEMO.id;
  if (clase.profesorId !== profesorId) {
    throw new ApiError(
      "TURNO_NO_PROPIO",
      "Solo podés registrar asistencia en turnos asignados a vos.",
      "turnoId",
      403,
    );
  }

  if (clase.estado !== "Reservado") {
    throw new ApiError(
      "TURNO_NO_RESERVADO",
      `El turno está en estado "${clase.estado}": solo se registra sobre turnos Reservados.`,
      "turnoId",
      409,
    );
  }

  if (clase.asistencia) {
    throw new ApiError(
      "ASISTENCIA_YA_REGISTRADA",
      "El turno ya tiene asistencia registrada: debe corregirse.",
      "turnoId",
      409,
    );
  }

  const ahora = tiempoSimulado ?? new Date();
  const ventana = evaluarVentanaRegistro(clase.fecha, clase.horaInicio, clase.estado, ahora);
  if (!ventana.puedeRegistrar) {
    throw new ApiError(
      "FUERA_DE_VENTANA_HORARIA",
      ventana.motivoDeshabilitado || "La clase está fuera de la ventana horaria permitida.",
      undefined,
      422,
    );
  }

  const nuevoEstado: EstadoClase = input.presente ? "Asistió" : "Ausente";
  const registradoPor =
    sesion?.rol === "Gerente"
      ? GERENTE_DEMO
      : { id: sesion?.usuarioId ?? PROFESOR_DEMO.id, nombre: "Roberto", apellido: "Peralta" };

  const nuevaAsistencia: AsistenciaResponse = {
    id: siguienteAsistenciaId++,
    turnoId: clase.turnoId,
    presente: input.presente,
    temaTrabajado: input.temaTrabajado ?? null,
    observaciones: input.observaciones ?? null,
    registradoPor,
    registradoAt: ahora.toISOString(),
    modificadoAt: null,
    modificadoPor: null,
    motivoCorreccion: null,
  };

  // Actualizar turno en memoria
  memoriaClases[claseIndex] = {
    ...clase,
    estado: nuevoEstado,
    asistencia: nuevaAsistencia,
    puedeRegistrar: false,
    puedeCorregir: true,
    motivoDeshabilitado: null,
  };

  // Agregar al historial de asistencia del alumno
  memoriaHistorial.unshift({
    alumnoId: clase.alumno.id,
    turnoId: clase.turnoId,
    codigo: clase.codigo,
    fecha: clase.fecha,
    horaInicio: clase.horaInicio,
    materia: { ...clase.materia },
    profesor: registradoPor,
    estado: nuevoEstado,
    temaTrabajado: nuevaAsistencia.temaTrabajado,
  });

  return { ...nuevaAsistencia };
}

/**
 * Corrige un registro de asistencia existente (con regla de 24h y motivo obligatorio para Gerente).
 */
export async function corregirAsistencia(
  asistenciaId: number,
  body: CorregirAsistenciaBody,
  sesion?: SesionContexto,
  tiempoSimulado?: Date,
): Promise<AsistenciaResponse> {
  await demorar();

  const input = corregirAsistenciaBody.parse(body);

  // BACKEND: return apiSend<AsistenciaResponse>("PUT", rutaAsistencia(asistenciaId), input);

  const claseIndex = memoriaClases.findIndex((c) => c.asistencia?.id === asistenciaId);
  if (claseIndex === -1) {
    throw new ApiError("NO_ENCONTRADO", "Asistencia no encontrada.", undefined, 404);
  }

  const clase = memoriaClases[claseIndex];

  // Regla: El Profesor solo puede corregir asistencia de sus propios turnos
  const rol = sesion?.rol ?? "Profesor";
  if (rol === "Profesor") {
    const profesorId = sesion?.profesorId ?? sesion?.usuarioId ?? PROFESOR_DEMO.id;
    if (clase.profesorId !== profesorId) {
      throw new ApiError(
        "TURNO_NO_PROPIO",
        "Solo podés corregir asistencia en turnos asignados a vos.",
        "turnoId",
        403,
      );
    }
  } else if (rol === "Mesa de Entrada") {
    throw new ApiError(
      "SIN_PERMISOS",
      "Mesa de Entrada no tiene permisos para modificar asistencias.",
      undefined,
      403,
    );
  } else if (rol !== "Gerente") {
    throw new ApiError(
      "SIN_PERMISOS",
      "No tenés permisos para corregir asistencias.",
      undefined,
      403,
    );
  }

  const asistenciaActual = clase.asistencia!;
  const ahora = tiempoSimulado ?? new Date();

  const correccion = evaluarPlazoCorreccion(asistenciaActual, rol, ahora);

  if (!correccion.puedeCorregir) {
    throw new ApiError(
      "PLAZO_CORRECCION_INVALIDO",
      correccion.motivoDeshabilitado || "No se puede corregir la asistencia.",
      undefined,
      409,
    );
  }

  if (correccion.requiereMotivo && !input.motivoCorreccion) {
    throw new ApiError(
      "MOTIVO_CORRECCION_REQUERIDO",
      "Debe indicar el motivo de la corrección al modificar fuera del plazo de 24 horas.",
      "motivoCorreccion",
      422,
    );
  }

  const nuevoEstado: EstadoClase = input.presente ? "Asistió" : "Ausente";
  const modificadoPor =
    rol === "Gerente"
      ? GERENTE_DEMO
      : { id: sesion?.usuarioId ?? PROFESOR_DEMO.id, nombre: "Roberto", apellido: "Peralta" };

  const asistenciaActualizada: AsistenciaResponse = {
    ...asistenciaActual,
    presente: input.presente,
    temaTrabajado: input.temaTrabajado ?? null,
    observaciones: input.observaciones ?? null,
    modificadoAt: ahora.toISOString(),
    modificadoPor,
    motivoCorreccion: input.motivoCorreccion ?? null,
  };

  memoriaClases[claseIndex] = {
    ...clase,
    estado: nuevoEstado,
    asistencia: asistenciaActualizada,
  };

  // Sincronizar en historial
  const histIndex = memoriaHistorial.findIndex((h) => h.turnoId === clase.turnoId);
  if (histIndex !== -1) {
    memoriaHistorial[histIndex] = {
      ...memoriaHistorial[histIndex],
      estado: nuevoEstado,
      temaTrabajado: asistenciaActualizada.temaTrabajado,
    };
  }

  return { ...asistenciaActualizada };
}

/**
 * Consulta el historial de asistencias de un alumno (modo LECTURA).
 * Control de acceso: Profesor solo ve sus alumnos atendidos; Gerente/Mesa de Entrada ven todos.
 */
export async function obtenerHistorialAlumno(
  alumnoId: number,
  query: ListarHistorialQuery = {},
  sesion?: SesionContexto,
): Promise<HistorialAsistenciaResponse> {
  await demorar();

  const filtros = listarHistorialQuery.parse(query);

  // BACKEND: const sp = new URLSearchParams(...); return apiGet<HistorialAsistenciaResponse>(`${rutaHistorialAlumno(alumnoId)}?${sp}`);

  const rol = sesion?.rol ?? "Profesor";
  const profesorId =
    sesion?.profesorId ?? sesion?.usuarioId ?? (rol === "Profesor" ? PROFESOR_DEMO.id : undefined);

  // Validación de acceso para rol Profesor: solo alumnos que atiende (en historial o en clases asignadas)
  if (rol === "Profesor" && profesorId) {
    const atiendeAlAlumno =
      memoriaHistorial.some(
        (h) => h.alumnoId === alumnoId && h.profesor.id === profesorId,
      ) ||
      memoriaClases.some(
        (c) => c.alumno.id === alumnoId && c.profesorId === profesorId,
      );
    if (!atiendeAlAlumno) {
      throw new ApiError(
        "SIN_PERMISO",
        "El profesor solo puede consultar el historial de los alumnos que asisten a sus clases.",
        undefined,
        403,
      );
    }
  }

  let items = memoriaHistorial.filter((h) => h.alumnoId === alumnoId);

  if (filtros.desde) {
    items = items.filter((h) => h.fecha >= filtros.desde!);
  }
  if (filtros.hasta) {
    items = items.filter((h) => h.fecha <= filtros.hasta!);
  }
  if (filtros.materiaId) {
    items = items.filter((h) => h.materia.id === filtros.materiaId);
  }
  if (filtros.profesorId) {
    items = items.filter((h) => h.profesor.id === filtros.profesorId);
  }
  if (filtros.estado) {
    items = items.filter((h) => h.estado === filtros.estado);
  }

  // Orden fijo: fecha descendente, luego hora inicio descendente
  items.sort((a, b) => {
    const cmpFecha = b.fecha.localeCompare(a.fecha);
    if (cmpFecha !== 0) return cmpFecha;
    return b.horaInicio.localeCompare(a.horaInicio);
  });

  const clasesAsistio = items.filter((i) => i.estado === "Asistió").length;
  const clasesAusente = items.filter((i) => i.estado === "Ausente").length;
  const clasesCanceladas = items.filter((i) => i.estado === "Cancelado").length;
  const porcentajeAsistencia = calcularPorcentajeAsistencia(clasesAsistio, clasesAusente);

  return {
    items: items.map((i) => ({
      turnoId: i.turnoId,
      codigo: i.codigo,
      fecha: i.fecha,
      horaInicio: i.horaInicio,
      materia: { ...i.materia },
      profesor: { ...i.profesor },
      estado: i.estado,
      temaTrabajado: i.temaTrabajado,
    })),
    resumen: {
      clasesAsistio,
      clasesAusente,
      clasesCanceladas,
      porcentajeAsistencia,
    },
  };
}
