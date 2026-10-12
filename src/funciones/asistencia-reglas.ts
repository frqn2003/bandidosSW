// src/funciones/asistencia-reglas.ts
//
// Reglas de negocio y utilidades de tiempo para el módulo de Asistencia (HU-ASI-01).
// Alineado con el contrato src/contracts/asistencia.ts y db/migrations/01b_asi01_asistencia.sql.

import type { EstadoClase, AsistenciaResponse } from "@/contracts/asistencia";

export const MINUTOS_ANTES_ASISTENCIA = 15;
export const HORAS_CORRECCION_ASISTENCIA = 24;

/**
 * Convierte "HH:MM" a minutos desde medianoche (ej: "10:30" -> 630).
 */
export function horaAMinutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Obtiene la fecha local en formato "yyyy-mm-dd".
 */
export function fechaAISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Formatea una fecha ISO a "dd/mm/aaaa hh:mm" (según contrato y HU-ASI-01).
 */
export function formatearFechaHoraRegistro(isoString?: string | null): string {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const dia = String(d.getDate()).padStart(2, "0");
    const mes = String(d.getMonth() + 1).padStart(2, "0");
    const anio = d.getFullYear();
    const horas = String(d.getHours()).padStart(2, "0");
    const minutos = String(d.getMinutes()).padStart(2, "0");
    return `${dia}/${mes}/${anio} ${horas}:${minutos}`;
  } catch {
    return isoString;
  }
}

/**
 * Formatea una fecha "yyyy-mm-dd" a "dd/mm/aaaa".
 */
export function formatearFechaCorta(fechaIso: string): string {
  if (!fechaIso) return "—";
  const partes = fechaIso.split("-");
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }
  return fechaIso;
}

export type EvaluacionVentanaRegistro = {
  puedeRegistrar: boolean;
  motivoDeshabilitado: string | null;
  minutosRestantesParaHabilitar?: number;
};

/**
 * Evalúa si la hora actual está dentro del rango permitido para registrar asistencia:
 * Desde 15 minutos antes del inicio del turno hasta el final de la jornada (23:59:59).
 */
export function evaluarVentanaRegistro(
  fechaTurno: string,
  horaInicioTurno: string,
  estado: EstadoClase,
  ahora: Date = new Date(),
): EvaluacionVentanaRegistro {
  if (estado !== "Reservado") {
    return {
      puedeRegistrar: false,
      motivoDeshabilitado:
        estado === "Cancelado"
          ? "El turno está cancelado."
          : "La asistencia ya fue registrada.",
    };
  }

  const fechaHoy = fechaAISO(ahora);

  // Si la fecha del turno es anterior a hoy, la jornada ya finalizó
  if (fechaTurno < fechaHoy) {
    return {
      puedeRegistrar: false,
      motivoDeshabilitado: "La jornada del turno ya finalizó.",
    };
  }

  // Si la fecha del turno es futura (más de hoy), aún no se habilita
  if (fechaTurno > fechaHoy) {
    return {
      puedeRegistrar: false,
      motivoDeshabilitado: "El turno es de una jornada futura.",
    };
  }

  // Mismo día: evaluar minutos respecto a la hora de inicio
  const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();
  const minutosInicio = horaAMinutos(horaInicioTurno);
  const minutosApertura = minutosInicio - MINUTOS_ANTES_ASISTENCIA;

  if (minutosAhora < minutosApertura) {
    const faltan = minutosApertura - minutosAhora;
    return {
      puedeRegistrar: false,
      motivoDeshabilitado: `Habilitado desde 15 minutos antes del inicio (en ${faltan} min).`,
      minutosRestantesParaHabilitar: faltan,
    };
  }

  // Dentro de la ventana (desde 15 min antes hasta medianoche de hoy)
  return {
    puedeRegistrar: true,
    motivoDeshabilitado: null,
  };
}

export type EvaluacionCorreccion = {
  puedeCorregir: boolean;
  pasaronMasDe24hs: boolean;
  horasTranscurridas: number;
  requiereMotivo: boolean;
  motivoDeshabilitado: string | null;
};

/**
 * Evalúa si el usuario puede corregir una asistencia ya guardada:
 * - Menos de 24 horas: Profesor y Gerente pueden editar libremente.
 * - Más de 24 horas: Profesor pasa a modo LECTURA; solo Gerente puede editar y exige motivo obligatorio.
 */
export function evaluarPlazoCorreccion(
  asistencia: AsistenciaResponse | null,
  rolUsuario?: string,
  ahora: Date = new Date(),
): EvaluacionCorreccion {
  if (!asistencia) {
    return {
      puedeCorregir: false,
      pasaronMasDe24hs: false,
      horasTranscurridas: 0,
      requiereMotivo: false,
      motivoDeshabilitado: "No existe registro de asistencia para este turno.",
    };
  }

  const registradoDate = new Date(asistencia.registradoAt);
  const diffMs = ahora.getTime() - registradoDate.getTime();
  const horasTranscurridas = Math.max(0, diffMs / (1000 * 60 * 60));
  const pasaronMasDe24hs = horasTranscurridas > HORAS_CORRECCION_ASISTENCIA;
  const esGerente = rolUsuario === "Gerente";

  if (!pasaronMasDe24hs) {
    return {
      puedeCorregir: true,
      pasaronMasDe24hs: false,
      horasTranscurridas,
      requiereMotivo: false,
      motivoDeshabilitado: null,
    };
  }

  // Pasaron más de 24 horas
  if (esGerente) {
    return {
      puedeCorregir: true,
      pasaronMasDe24hs: true,
      horasTranscurridas,
      requiereMotivo: true,
      motivoDeshabilitado: null,
    };
  }

  return {
    puedeCorregir: false,
    pasaronMasDe24hs: true,
    horasTranscurridas,
    requiereMotivo: false,
    motivoDeshabilitado: "Notificación: solo el Gerente puede modificar",
  };
}

/**
 * Calcula el porcentaje de asistencia según la fórmula:
 * Asistió / (Asistió + Ausente), formateado con 1 decimal.
 * Las clases canceladas no cuentan.
 */
export function calcularPorcentajeAsistencia(
  clasesAsistio: number,
  clasesAusente: number,
): number | null {
  const totalValidas = clasesAsistio + clasesAusente;
  if (totalValidas === 0) return null;
  return Number(((clasesAsistio / totalValidas) * 100).toFixed(1));
}
