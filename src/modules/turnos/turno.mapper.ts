import type { TurnoResponse } from "@/contracts/turno";
import type { TurnoDetalleRow } from "./turno.types";

const hhmm = (t: string) => t.slice(0, 5);

/**
 * Tope de modificaciones que los flags usan para deshabilitar el botón.
 * BACKEND: leer `fn_parametro('max_modificaciones_turno')` en vez de esta
 * constante (el front ya lo hace con GET /api/parametros).
 */
const MAX_MODIFICACIONES = 2;

function yaOcurrio(fecha: string, hora: string): boolean {
  const [hh, mm] = hora.slice(0, 5).split(":").map(Number);
  const [y, m, d] = fecha.split("-").map(Number);
  const inicio = new Date(y, m - 1, d, hh, mm, 0);
  return inicio.getTime() < Date.now();
}

/**
 * Calcula `puedeModificar` / `puedeCancelar` / `motivoDeshabilitado` en el
 * backend (contrato: el front NO recalcula estas reglas). El turno se modifica
 * o se cancela solo si está Reservado, no ocurrió, no está cobrado y (para
 * modificar) no agotó sus modificaciones.
 */
function acciones(row: TurnoDetalleRow) {
  const reservado = row.estado === "Reservado";
  const pasado = yaOcurrio(row.fecha, row.hora_inicio);

  if (row.pagado) {
    return {
      puedeModificar: false,
      puedeCancelar: false,
      motivoDeshabilitado: "El turno ya fue cobrado.",
    };
  }
  if (!reservado) {
    return {
      puedeModificar: false,
      puedeCancelar: false,
      motivoDeshabilitado: "El turno está cancelado.",
    };
  }
  if (pasado) {
    return {
      puedeModificar: false,
      puedeCancelar: false,
      motivoDeshabilitado: "El turno ya ocurrió.",
    };
  }

  const puedeModificar = row.cantidad_modificaciones < MAX_MODIFICACIONES;
  return {
    puedeModificar,
    puedeCancelar: true,
    motivoDeshabilitado: puedeModificar
      ? null
      : `Este turno alcanzó el máximo de ${MAX_MODIFICACIONES} modificaciones. Cancelalo y reservá uno nuevo.`,
  };
}

export function toApi(row: TurnoDetalleRow): TurnoResponse {
  return {
    id: row.id,
    codigo: row.codigo ?? `TUR-${String(row.id).padStart(6, "0")}`,
    alumno: {
      id: row.alumno_id,
      legajo: row.alumno_legajo ?? `ALU-${String(row.alumno_id).padStart(6, "0")}`,
      nombre: row.alumno_nombre,
      apellido: row.alumno_apellido,
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
    cantidadModificaciones: row.cantidad_modificaciones,
    ...acciones(row),
    registradoPor: {
      id: row.usuario_id,
      nombre: row.usuario_nombre,
      apellido: row.usuario_apellido,
    },
    fechaCreacion: row.created_at.toISOString(),
  };
}

export function toApiList(rows: TurnoDetalleRow[]): TurnoResponse[] {
  return rows.map(toApi);
}
