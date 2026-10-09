// src/modules/indicadores/types.ts
//
// Tipos para el módulo "Indicadores y Tableros" (HU-IND-01).
// Basado estrictamente en:
// - docs/contratos/indicadores.md
// - src/contracts/indicadores.ts

import type {
  IndicadoresResponse,
  IndicadoresQuery,
  TurnosPorSemanaItem,
  RankingMateriaDemandaItem,
  RankingMateriaIngresosItem,
  ErrorIndicadores,
} from "@/contracts/indicadores";

export type {
  IndicadoresResponse,
  IndicadoresQuery,
  TurnosPorSemanaItem,
  RankingMateriaDemandaItem,
  RankingMateriaIngresosItem,
  ErrorIndicadores,
};

/**
 * Estado de filtros del Dashboard en la UI.
 */
export interface DashboardFiltersState {
  desde: string; // "yyyy-mm-dd"
  hasta: string; // "yyyy-mm-dd"
  materiaId: number | "Todas";
  profesorId: number | "Todos";
}

/**
 * Entidad simulada de Turno para el cálculo dinámico de métricas.
 */
export interface MockTurnoIndicador {
  id: number;
  fecha: string; // "yyyy-mm-dd"
  horaInicio: string; // "hh:mm"
  horaFin: string; // "hh:mm"
  duracionHoras: number; // ej: 1, 1.5, 2
  materiaId: number;
  materiaNombre: string;
  profesorId: number;
  profesorNombre: string;
  estado: "Reservado" | "Realizado" | "Cancelado";
  valorClase: number; // Monto en pesos
  pagado: boolean;
}

/**
 * Entidad simulada de Disponibilidad docente para el cálculo de % de ocupación.
 */
export interface MockDisponibilidadProfesor {
  id: number;
  profesorId: number;
  fecha: string; // "yyyy-mm-dd"
  horasDisponibles: number; // Horas que el profesor ofreció en su agenda ese día
}

/**
 * Entidad simulada de Alumno para métricas globales (Alumnos activos y Altas).
 */
export interface MockAlumnoIndicador {
  id: number;
  nombre: string;
  apellido: string;
  estado: "activo" | "inactivo";
  fechaAlta: string; // "yyyy-mm-dd"
}

/**
 * Entidad simulada de Cobro/Pago para ingresos.
 */
export interface MockPagoIndicador {
  id: number;
  turnoId: number;
  fechaPago: string; // "yyyy-mm-dd"
  monto: number;
  materiaId: number;
  profesorId: number;
}

/**
 * Información estructurada para cada tarjeta KPI del tablero.
 */
export interface KPICardData {
  id: "turnosGenerados" | "porcentajeCancelaciones" | "porcentajeOcupacion" | "alumnosActivos" | "ingresosCobrados";
  titulo: string;
  valorFormateado: string;
  subtitulo?: string;
  formula: string;
  explicacion: string;
  icono: string;
  colorAcento?: "primary" | "warning" | "success" | "info";
  esGlobal?: boolean; // Si es true, aclara que no es afectado por filtros de materia/profesor
  linkOrigen?: {
    href: string;
    label: string;
  };
}

/**
 * Opción de catálogo para selects de filtros.
 */
export interface OpcionCatalogo {
  id: number;
  nombre: string;
}
