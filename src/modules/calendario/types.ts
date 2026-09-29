// src/modules/calendario/types.ts
//
// Tipos e interfaces de frontend para el módulo "Calendario de Turnos" (HU-CAL-02).
// Basado estrictamente en los contratos de src/contracts/calendario.ts, turno.ts, profesor.ts y materia.ts.

import type {
  TurnoCalendarioResponse,
  AgendaDiaResponse,
  CalendarioMesResponse,
  HuecoResponse,
} from "@/contracts/calendario";

export type VistaCalendario = "dia" | "semana" | "mes";

/**
 * Entidad de Turno para el calendario.
 * Extiende TurnoCalendarioResponse enriqueciendo `alumno`, `materia` y asegurando
 * `fecha` ("yyyy-mm-dd") para agrupamientos precisos en vistas Semana, Día y Mes.
 */
export interface TurnoCalendario extends Omit<TurnoCalendarioResponse, "alumno" | "materia"> {
  fecha: string;
  alumno: {
    id: number;
    nombre: string;
    apellido: string;
    dni?: string;
    legajo?: string;
  };
  materia: {
    id: number;
    nombre: string;
    duracionClaseMinutos?: number;
  };
  esSegundaHora?: boolean;
}

export interface ProfesorCalendario {
  id: number;
  nombre: string;
  apellido: string;
  usuarioId?: number;
  materiasIds?: number[];
}

export interface MateriaCalendario {
  id: number;
  nombre: string;
  color: string;
  duracionMinutos?: number;
}

export interface FiltrosCalendario {
  profesorId?: number;
  materiaId?: number;
  verCancelados: boolean;
  soloConCupo: boolean;
}

/**
 * Resumen de un día para la vista mensual (MonthView).
 */
export interface DiaResumenMes {
  fecha: string; // "yyyy-mm-dd"
  numeroDia: number;
  esMesActual: boolean;
  esHoy: boolean;
  cantidadTurnos: number;
  materiasConTurnos: {
    materiaId: number;
    color: string;
    nombre: string;
  }[];
}

/**
 * Franja libre para reservar turno haciendo clic en un hueco disponible.
 */
export interface FranjaLibreData {
  fecha: string; // "yyyy-mm-dd"
  horaInicio: string; // "HH:MM"
  horaFin: string; // "HH:MM"
  profesorId: number;
  profesorNombre: string;
}

/**
 * Datos necesarios para confirmar la reprogramación de un turno (Drag and Drop).
 */
export interface ReprogramarTurnoData {
  turno: TurnoCalendario;
  fechaNueva: string;
  horaInicioNueva: string;
  horaFinNueva: string;
  profesorNuevo: {
    id: number;
    nombre: string;
    apellido: string;
  };
  fechaAnterior: string;
  horaInicioAnterior: string;
  profesorAnterior: {
    id: number;
    nombre: string;
    apellido: string;
  };
}

/**
 * Agrupación de turnos por profesor para la vista diaria (DayView).
 */
export interface ColumnaProfesorDia {
  profesor: ProfesorCalendario;
  turnos: TurnoCalendario[];
  turnosCount: number;
  franjasLibres: {
    horaInicio: string;
    horaFin: string;
  }[];
}

export type {
  AgendaDiaResponse,
  CalendarioMesResponse,
  HuecoResponse,
};
