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
  IndicadorTarjetaResponse,
  RankingProfesorItem,
  ClaveTarjeta,
  MapaCalorResponse,
  MapaCalorCeldaResponse,
  MapaCalorQuery,
  ErrorIndicadores,
} from "@/contracts/indicadores";

export type {
  IndicadoresResponse,
  IndicadoresQuery,
  TurnosPorSemanaItem,
  RankingMateriaDemandaItem,
  RankingMateriaIngresosItem,
  IndicadorTarjetaResponse,
  RankingProfesorItem,
  ClaveTarjeta,
  MapaCalorResponse,
  MapaCalorCeldaResponse,
  MapaCalorQuery,
  ErrorIndicadores,
};

export type NivelFiltro = "Todos" | "Primario" | "Secundario" | "Universitario";

/**
 * Estado de filtros globales del Dashboard de Dirección en la UI (HU-IND-03).
 */
export interface DashboardFiltersState {
  desde: string; // "yyyy-mm-dd"
  hasta: string; // "yyyy-mm-dd"
  materiaId: number | "Todas";
  profesorId: number | "Todos";
  nivel: NivelFiltro;
}

/**
 * Estado de filtros locales exclusivos del Mapa de Calor de Demanda.
 */
export interface HeatmapFiltersState {
  materiaId: number | "Todas";
  profesorId: number | "Todos";
  horaDesde: string; // "HH:MM" o ""
  horaHasta: string; // "HH:MM" o ""
}

/**
 * Información estructurada para cada tarjeta KPI del tablero con variación porcentual.
 */
export interface KPICardData {
  id:
    | "turnos_generados"
    | "porcentaje_cancelaciones"
    | "porcentaje_ocupacion"
    | "porcentaje_asistencia"
    | "alumnos_activos"
    | "altas_alumnos"
    | "ingresos_cobrados"
    | "deuda_pendiente_total"
    | "turnosGenerados"
    | "porcentajeCancelaciones"
    | "porcentajeOcupacion"
    | "alumnosActivos"
    | "ingresosCobrados";
  titulo: string;
  valorFormateado: string;
  subtitulo?: string;
  formula: string;
  explicacion: string;
  icono: string;
  colorAcento?: "primary" | "warning" | "success" | "info" | "danger";
  esGlobal?: boolean; // Si es true, aclara que no es afectado por filtros de materia/profesor
  variacionPorcentual?: number | null;
  valorAnterior?: string | null;
  mejora?: boolean | null;
  menorEsMejor?: boolean;
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

/**
 * Entidad simulada de Turno para el cálculo dinámico de métricas (compatibilidad).
 */
export interface MockTurnoIndicador {
  id: number;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  duracionHoras: number;
  materiaId: number;
  materiaNombre: string;
  profesorId: number;
  profesorNombre: string;
  estado: "Reservado" | "Realizado" | "Cancelado";
  valorClase: number;
  pagado: boolean;
}

/**
 * Entidad simulada de Disponibilidad docente para el cálculo de % de ocupación.
 */
export interface MockDisponibilidadProfesor {
  id: number;
  profesorId: number;
  fecha: string;
  horasDisponibles: number;
}

/**
 * Entidad simulada de Alumno para métricas globales.
 */
export interface MockAlumnoIndicador {
  id: number;
  nombre: string;
  apellido: string;
  estado: "activo" | "inactivo";
  fechaAlta: string;
}

/**
 * Entidad simulada de Cobro/Pago para ingresos.
 */
export interface MockPagoIndicador {
  id: number;
  turnoId: number;
  fechaPago: string;
  monto: number;
  materiaId: number;
  profesorId: number;
}

