import type { TurnoResponse } from "@/contracts/turno";
import type { TurnoDetalleRow } from "./turno.types";

const hhmm = (t: string) => t.slice(0, 5);

/**
 * Calcula dinámicamente si el turno puede ser modificado o cancelado, y por qué razón.
 */
export function calcularAcciones(
  turno: TurnoDetalleRow,
  ahora: Date = new Date(),
): { puedeModificar: boolean; puedeCancelar: boolean; motivoDeshabilitado?: string | null } {
  if (turno.estado === "Cancelado") {
    return {
      puedeModificar: false,
      puedeCancelar: false,
      motivoDeshabilitado: "El turno ya se encuentra cancelado.",
    };
  }

  if (turno.pagado) {
    return {
      puedeModificar: false,
      puedeCancelar: false,
      motivoDeshabilitado: "No se puede modificar ni cancelar un turno que ya fue cobrado.",
    };
  }

  const [hh, mm] = turno.hora_inicio.slice(0, 5).split(":").map(Number);
  const [y, m, d] = turno.fecha.slice(0, 10).split("-").map(Number);
  const fechaTurno = new Date(y, m - 1, d, hh, mm, 0);

  if (fechaTurno.getTime() <= ahora.getTime()) {
    return {
      puedeModificar: false,
      puedeCancelar: false,
      motivoDeshabilitado: "El turno ya ocurrió o está en curso.",
    };
  }

  // Modificación: máximo 2 modificaciones y mínimo 2 horas de anticipación
  const diffHoras = (fechaTurno.getTime() - ahora.getTime()) / (1000 * 60 * 60);

  if (turno.cantidad_modificaciones >= 2) {
    return {
      puedeModificar: false,
      puedeCancelar: true,
      motivoDeshabilitado: "Alcanzó el máximo de 2 modificaciones. Debe cancelar y reservar nuevamente.",
    };
  }

  if (diffHoras < 2) {
    return {
      puedeModificar: false,
      puedeCancelar: true,
      motivoDeshabilitado: "Faltan menos de 2 horas para el inicio del turno.",
    };
  }

  return {
    puedeModificar: true,
    puedeCancelar: true,
    motivoDeshabilitado: null,
  };
}

export function toApi(row: TurnoDetalleRow): TurnoResponse {
  const acciones = calcularAcciones(row);
  const fechaCancelacionStr = row.fecha_cancelacion
    ? (row.fecha_cancelacion instanceof Date
        ? row.fecha_cancelacion.toISOString()
        : new Date(row.fecha_cancelacion).toISOString())
    : null;

  return {
    id: row.id,
    codigo: row.codigo ?? `TUR-${String(row.id).padStart(6, "0")}`,
    alumno: {
      id: row.alumno_id,
      legajo: row.alumno_legajo ?? `ALU-${String(row.alumno_id).padStart(6, "0")}`,
      nombre: row.alumno_nombre,
      apellido: row.alumno_apellido,
      dni: row.alumno_dni,
    },
    profesor: {
      id: row.profesor_id,
      nombre: row.profesor_nombre,
      apellido: row.profesor_apellido,
    },
    materia: {
      id: row.materia_id,
      nombre: row.materia_nombre,
      nivel: row.materia_nivel,
      duracionClaseMinutos: row.duracion_clase_minutos,
    },
    fecha: row.fecha.slice(0, 10),
    horaInicio: hhmm(row.hora_inicio),
    horaFin: hhmm(row.hora_fin),
    valorClaseCongelado: Number(row.valor_clase_congelado),
    estado: row.estado,
    observaciones: row.observaciones,
    cantidadModificaciones: Number(row.cantidad_modificaciones ?? 0),
    puedeModificar: acciones.puedeModificar,
    puedeCancelar: acciones.puedeCancelar,
    motivoDeshabilitado: acciones.motivoDeshabilitado,
    motivoCancelacion: row.motivo_cancelacion_id
      ? {
          id: row.motivo_cancelacion_id,
          nombre: row.motivo_cancelacion_nombre ?? "",
        }
      : null,
    detalleCancelacion: row.detalle_cancelacion ?? null,
    fechaCancelacion: fechaCancelacionStr,
    cancelacionTardia: Boolean(row.cancelacion_tardia),
    pagado: Boolean(row.pagado),
    registradoPor: {
      id: row.usuario_id,
      nombre: row.usuario_nombre,
      apellido: row.usuario_apellido,
    },
    fechaCreacion:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : new Date(row.created_at).toISOString(),
  };
}

export function toApiList(rows: TurnoDetalleRow[]): TurnoResponse[] {
  return rows.map(toApi);
}
