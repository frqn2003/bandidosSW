import type {
  EventoHistorialResponse,
  HistorialAlumnoResponse,
  NotaResponse,
  TipoEventoHistorial,
} from "@/contracts/historial";
import type { EventoRow, NotaRow, ResumenRow } from "./historial.types";

/**
 * @param verObservaciones  false si el rol no puede ver las observaciones de la
 *                          asistencia: van en null.
 */
function eventoToApi(r: EventoRow, verObservaciones: boolean): EventoHistorialResponse {
  return {
    tipo: r.tipo as TipoEventoHistorial,
    fechaHora: r.fecha_hora,
    materia: r.materia_id !== null ? { id: r.materia_id, nombre: r.materia ?? "" } : null,
    profesor: r.profesor_id !== null ? { id: r.profesor_id, nombreCompleto: r.profesor ?? "" } : null,
    detalle: r.detalle,
    observaciones: verObservaciones ? r.observaciones : null,
    cancelacionTardia: Boolean(r.cancelacion_tardia),
    responsableCancelacion: r.responsable as EventoHistorialResponse["responsableCancelacion"],
    usuario: r.usuario_id !== null ? { id: r.usuario_id, nombreCompleto: r.usuario ?? "" } : null,
    turnoId: r.turno_id,
    fechaClase: r.fecha_clase ? r.fecha_clase.slice(0, 10) : null,
    horaClase: r.hora_clase,
  };
}

export function historialToApi(
  eventos: EventoRow[],
  resumen: ResumenRow,
  alumnoInactivo: boolean,
  verObservaciones: boolean,
): HistorialAlumnoResponse {
  return {
    eventos: eventos.map((e) => eventoToApi(e, verObservaciones)),
    resumen: {
      clasesAsistidas: Number(resumen.clases_asistidas),
      ausencias: Number(resumen.ausencias),
      cancelaciones: Number(resumen.cancelaciones),
      porcentajeAsistencia:
        resumen.porcentaje_asistencia === null ? null : Number(resumen.porcentaje_asistencia),
      fechaUltimaClase: resumen.fecha_ultima_clase ? resumen.fecha_ultima_clase.slice(0, 10) : null,
    },
    alumnoInactivo,
  };
}

export function notaToApi(r: NotaRow): NotaResponse {
  return {
    id: r.id,
    alumnoId: r.alumno_id,
    texto: r.texto,
    registradoPor: { id: r.usuario_id, nombre: r.usuario_nombre, apellido: r.usuario_apellido },
    fechaCreacion: (r.created_at instanceof Date ? r.created_at : new Date(r.created_at)).toISOString(),
  };
}
