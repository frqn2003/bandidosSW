import type {
  AsistenciaResponse,
  ClaseDelDiaResponse,
  HistorialAsistenciaItem,
  HistorialAsistenciaResponse,
} from "@/contracts/asistencia";
import type { ClaseRow, HistorialRow, ResumenRow } from "./asistencia.types";

const hhmm = (t: string) => t.slice(0, 5);
const iso = (d: Date | string) => (d instanceof Date ? d : new Date(d)).toISOString();

/** Quién mira la lista: los flags dependen del rol y de si el turno es suyo. */
export type Visor = { rol: string; profesorId: number | null };

export function asistenciaToApi(row: ClaseRow): AsistenciaResponse | null {
  if (row.a_id === null) return null;
  return {
    id: row.a_id,
    turnoId: row.turno_id,
    presente: Boolean(row.a_presente),
    temaTrabajado: row.a_tema_trabajado,
    observaciones: row.a_observaciones,
    registradoPor: {
      id: row.a_usuario_id!,
      nombre: row.a_usuario_nombre ?? "",
      apellido: row.a_usuario_apellido ?? "",
    },
    registradoAt: iso(row.a_registrado_at!),
    modificadoAt: row.a_modificado_at ? iso(row.a_modificado_at) : null,
    modificadoPor:
      row.a_modificado_por !== null
        ? {
            id: row.a_modificado_por,
            nombre: row.a_modificado_por_nombre ?? "",
            apellido: row.a_modificado_por_apellido ?? "",
          }
        : null,
    motivoCorreccion: row.a_motivo_correccion,
  };
}

/**
 * Flags de los botones. Mismas reglas que `fn_asistencia_validar`:
 *  · Registrar: solo el Profesor del turno, turno Reservado sin asistencia y
 *    dentro de la ventana horaria.
 *  · Corregir: dentro del plazo, solo el Profesor del turno; pasado el plazo,
 *    solo el Gerente (con motivo, que pide el front al ver `registradoAt`).
 */
export function calcularFlags(
  row: ClaseRow,
  visor: Visor,
): Pick<ClaseDelDiaResponse, "puedeRegistrar" | "puedeCorregir" | "motivoDeshabilitado"> {
  const esSuyo = visor.rol === "Profesor" && visor.profesorId === row.profesor_id;

  if (row.a_id === null) {
    if (row.estado !== "Reservado") {
      return {
        puedeRegistrar: false,
        puedeCorregir: false,
        motivoDeshabilitado: `El turno está en estado "${row.estado}".`,
      };
    }
    if (!esSuyo) {
      return {
        puedeRegistrar: false,
        puedeCorregir: false,
        motivoDeshabilitado: "Solo el profesor del turno puede registrar la asistencia.",
      };
    }
    if (row.antes_de_ventana) {
      return {
        puedeRegistrar: false,
        puedeCorregir: false,
        motivoDeshabilitado: `Se habilita ${row.minutos_antes} minutos antes del inicio (${row.ventana_desde}).`,
      };
    }
    if (row.despues_de_ventana) {
      return {
        puedeRegistrar: false,
        puedeCorregir: false,
        motivoDeshabilitado: "La jornada del turno ya finalizó.",
      };
    }
    return { puedeRegistrar: true, puedeCorregir: false, motivoDeshabilitado: null };
  }

  // Dentro del plazo corrige solo el Profesor del turno; pasado el plazo, solo el Gerente.
  if (row.dentro_plazo) {
    if (esSuyo) return { puedeRegistrar: false, puedeCorregir: true, motivoDeshabilitado: null };
    return {
      puedeRegistrar: false,
      puedeCorregir: false,
      motivoDeshabilitado:
        visor.rol === "Gerente"
          ? `Dentro de las ${row.horas_correccion} horas solo el Profesor puede corregir el registro.`
          : visor.rol === "Mesa de Entrada"
            ? "Mesa de Entrada no tiene permisos para modificar asistencias."
            : "Solo el profesor del turno puede corregir la asistencia.",
    };
  }
  if (visor.rol === "Gerente") {
    return { puedeRegistrar: false, puedeCorregir: true, motivoDeshabilitado: null };
  }
  return {
    puedeRegistrar: false,
    puedeCorregir: false,
    motivoDeshabilitado: `Pasaron más de ${row.horas_correccion} horas desde el registro: solo el Gerente puede modificarlo.`,
  };
}

export function claseToApi(row: ClaseRow, visor: Visor): ClaseDelDiaResponse {
  return {
    turnoId: row.turno_id,
    codigo: row.codigo,
    profesor: { id: row.profesor_id, nombre: row.profesor_nombre, apellido: row.profesor_apellido },
    alumno: {
      id: row.alumno_id,
      legajo: row.alumno_legajo,
      nombre: row.alumno_nombre,
      apellido: row.alumno_apellido,
    },
    materia: { id: row.materia_id, nombre: row.materia_nombre },
    fecha: row.fecha.slice(0, 10),
    horaInicio: hhmm(row.hora_inicio),
    horaFin: hhmm(row.hora_fin),
    estado: row.estado,
    asistencia: asistenciaToApi(row),
    ...calcularFlags(row, visor),
  };
}

export function historialItemToApi(row: HistorialRow): HistorialAsistenciaItem {
  return {
    turnoId: row.turno_id,
    codigo: row.codigo,
    fecha: row.fecha.slice(0, 10),
    horaInicio: hhmm(row.hora_inicio),
    materia: { id: row.materia_id, nombre: row.materia_nombre },
    profesor: { id: row.profesor_id, nombre: row.profesor_nombre, apellido: row.profesor_apellido },
    estado: row.estado,
    // Contrato: null si estuvo ausente o canceló.
    temaTrabajado: row.estado === "Asistió" ? row.tema_trabajado : null,
  };
}

export function historialToApi(rows: HistorialRow[], resumen: ResumenRow): HistorialAsistenciaResponse {
  return {
    items: rows.map(historialItemToApi),
    resumen: {
      clasesAsistio: Number(resumen.clases_asistio),
      clasesAusente: Number(resumen.clases_ausente),
      clasesCanceladas: Number(resumen.clases_canceladas),
      porcentajeAsistencia:
        resumen.porcentaje_asistencia === null ? null : Number(resumen.porcentaje_asistencia),
    },
  };
}
