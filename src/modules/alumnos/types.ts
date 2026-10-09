// src/modules/alumnos/types.ts
//
// Tipos del módulo Alumnos (HU-ALU-02), estrictamente basados en los contratos
// oficiales de backend:
// - src/contracts/alumno.ts
// - src/contracts/auditoria.ts

import type {
  AlumnoResponse,
  NivelEducativo,
  EstadoAlumno,
  CrearAlumnoBody,
  EditarAlumnoBody,
  ListarAlumnosQuery,
} from "@/contracts/alumno";
import type { OperacionAuditoria } from "@/contracts/auditoria";

export type {
  AlumnoResponse,
  NivelEducativo,
  EstadoAlumno,
  CrearAlumnoBody,
  EditarAlumnoBody,
  ListarAlumnosQuery,
};

/**
 * Detalle simulado de turnos futuros de un alumno (para HU-ALU-02 / HU-TUR-02).
 */
export interface TurnoFuturoResumen {
  id: string; // ej: "TUR-004512"
  turnoId?: number;
  fecha?: string; // "aaaa-mm-dd"
  fechaHora: string; // ej: "Lun 28/09 · 15:00"
  materia: string; // ej: "Matemática"
  estado: "Reservado" | "Confirmado";
}

/**
 * Detalle simulado de deuda pendiente de un alumno.
 */
export interface DeudaResumen {
  clasesSinPagar: number; // ej: 2
  montoTotal: number; // ej: 36000
  descripcion?: string; // ej: "2 clases sin pagar · $ 36.000,00"
}

/**
 * Interfaz extendida para la capa UI de Alumnos.
 * Extiende estrictamente `AlumnoResponse` del contrato sin contaminar el modelo real.
 */
export interface StudentUI extends AlumnoResponse {
  // Propiedades opcionales para simular y testear reglas de negocio de la baja en UI:
  futureTurnsCount?: number;
  hasPendingDebt?: boolean;
  turnosFuturos?: TurnoFuturoResumen[];
  detalleDeuda?: DeudaResumen;
}

/**
 * Registro de bitácora de auditoría para la ficha del alumno.
 * Basado en `src/contracts/auditoria.ts`.
 */
export interface StudentAuditLog {
  id: number;
  alumnoId: number;
  fecha: string; // "12/07/2026"
  hora: string; // "11:20"
  responsable: string; // "Laura Gómez"
  accion: "Alta" | "Modificación" | "Baja" | "Reactivación";
  campo: string; // "Estado", "Materias de interés", etc.
  valorAnterior: string; // "Activo", "—"
  valorNuevo: string; // "Inactivo", "Secundario"
  operacion: OperacionAuditoria;
}

/**
 * Estado de filtros para el listado de alumnos en la UI.
 */
export interface StudentFilters {
  busqueda: string;
  nivelEducativo: NivelEducativo | "Todos";
  materiaInteres: string | "Todas";
  estado: EstadoAlumno | "Todos";
  verInactivos: boolean;
}
