import type {
  ClasePendientePagoResponse,
  PagoFormaPagoResponse,
  PagoTurnoItemResponse,
  PagoResponse,
} from "@/contracts/pago";
import type {
  ClasePendientePagoRow,
  PagoFormaPagoRow,
  PagoTurnoRow,
  PagoRow,
} from "./pago.types";

const hhmm = (t: string) => t.slice(0, 5);

export function clasePendienteToApi(row: ClasePendientePagoRow): ClasePendientePagoResponse {
  return {
    id: row.id,
    codigo: row.codigo ?? `TUR-${String(row.id).padStart(6, "0")}`,
    alumnoId: row.alumno_id,
    alumno: row.alumno_nombre && row.alumno_apellido
      ? {
          id: row.alumno_id,
          legajo: row.alumno_legajo ?? `ALU-${String(row.alumno_id).padStart(6, "0")}`,
          nombre: row.alumno_nombre,
          apellido: row.alumno_apellido,
          dni: row.alumno_dni ?? "",
        }
      : undefined,
    fecha: row.fecha.slice(0, 10),
    horaInicio: hhmm(row.hora_inicio),
    horaFin: hhmm(row.hora_fin),
    materia: {
      id: row.materia_id,
      nombre: row.materia_nombre,
    },
    profesor: {
      id: row.profesor_id,
      nombre: row.profesor_nombre,
      apellido: row.profesor_apellido,
    },
    importe: Number(row.valor_clase_congelado),
    pagado: row.pagado,
  };
}

export function pagoFormaPagoToApi(row: PagoFormaPagoRow): PagoFormaPagoResponse {
  return {
    id: row.id,
    formaPagoId: row.forma_pago_id,
    nombre: row.forma_pago_nombre,
    nroOperacion: row.nro_operacion,
  };
}

export function pagoTurnoToApi(row: PagoTurnoRow): PagoTurnoItemResponse {
  return {
    turnoId: row.turno_id,
    codigo: row.codigo ?? `TUR-${String(row.turno_id).padStart(6, "0")}`,
    fecha: row.fecha.slice(0, 10),
    horaInicio: hhmm(row.hora_inicio),
    horaFin: hhmm(row.hora_fin),
    materiaNombre: row.materia_nombre,
    profesorNombre: `${row.profesor_nombre} ${row.profesor_apellido}`,
    importe: Number(row.importe),
  };
}

export function pagoToApi(
  pago: PagoRow,
  formasPago: PagoFormaPagoRow[],
  clases: PagoTurnoRow[],
): PagoResponse {
  const fechaCreacionStr =
    pago.created_at instanceof Date
      ? pago.created_at.toISOString()
      : new Date(pago.created_at).toISOString();

  return {
    id: pago.id,
    comprobante: pago.comprobante ?? `REC-${String(pago.id).padStart(6, "0")}`,
    alumno: {
      id: pago.alumno_id,
      legajo: pago.alumno_legajo ?? `ALU-${String(pago.alumno_id).padStart(6, "0")}`,
      nombre: pago.alumno_nombre,
      apellido: pago.alumno_apellido,
      dni: pago.alumno_dni,
    },
    monto: Number(pago.monto),
    fechaPago: pago.fecha_pago.slice(0, 10),
    observaciones: pago.observaciones,
    formasPago: formasPago.map(pagoFormaPagoToApi),
    clases: clases.map(pagoTurnoToApi),
    registradoPor: {
      id: pago.usuario_id,
      nombre: pago.usuario_nombre,
      apellido: pago.usuario_apellido,
    },
    fechaCreacion: fechaCreacionStr,
  };
}
