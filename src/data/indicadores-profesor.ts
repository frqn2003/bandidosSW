// src/data/indicadores-profesor.ts
//
// Capa de datos para Indicadores de Actividad del Profesor (HU-IND-02).
// Conecta el frontend con el endpoint oficial GET /api/indicadores/profesor.
// Solo lectura. Sin información financiera o de pagos.

import {
  RUTA,
  type IndicadoresProfesorQuery,
  type IndicadoresProfesorResponse,
} from "@/contracts/indicadores-profesor";
import { mesEnCursoAR, rangoMenorA12Meses } from "@/contracts/indicadores";
import { apiGet, ApiError } from "@/lib/api-client";

export { RUTA };
export type { IndicadoresProfesorQuery, IndicadoresProfesorResponse };

// ── Fixture tipado según el contrato de HU-IND-02 ──────────────────────────
const FIXTURE_BASE: IndicadoresProfesorResponse = {
  periodo: {
    desde: "2026-10-01",
    hasta: "2026-10-31",
  },
  profesor: {
    id: 1,
    nombre: "Diego",
    apellido: "Funes",
  },
  sinDatos: false,
  materiasDictadas: [
    { id: 1, nombre: "Análisis Cuantitativo III" },
    { id: 2, nombre: "Física Cuántica Aplicada" },
    { id: 3, nombre: "Álgebra Lineal y Geometría" },
  ],
  // Tarjetas Numéricas
  clasesDictadas: 18,
  alumnosAtendidos: 12,
  horasDictadas: 24.5,
  porcentajeAsistencia: 88.5,
  porcentajeCancelaciones: 5.3,
  porcentajeOcupacion: 75.0,

  // Base de cálculo
  totalTurnos: 21,
  turnosAusentes: 2,
  turnosCancelados: 1,
  horasReservadas: 27.0,
  horasDisponibles: 36.0,

  // Gráfico de Barras: Clases dictadas por semana
  clasesPorSemana: [
    {
      fechaInicio: "2026-09-28",
      fechaFin: "2026-10-04",
      etiquetaSemana: "Semana del 28/09",
      cantidad: 4,
    },
    {
      fechaInicio: "2026-10-05",
      fechaFin: "2026-10-11",
      etiquetaSemana: "Semana del 05/10",
      cantidad: 5,
    },
    {
      fechaInicio: "2026-10-12",
      fechaFin: "2026-10-18",
      etiquetaSemana: "Semana del 12/10",
      cantidad: 6,
    },
    {
      fechaInicio: "2026-10-19",
      fechaFin: "2026-10-25",
      etiquetaSemana: "Semana del 19/10",
      cantidad: 3,
    },
  ],

  // Gráfico de Torta / Distribución por Materia
  clasesPorMateria: [
    {
      materiaId: 1,
      materiaNombre: "Análisis Cuantitativo III",
      clases: 10,
    },
    {
      materiaId: 2,
      materiaNombre: "Física Cuántica Aplicada",
      clases: 5,
    },
    {
      materiaId: 3,
      materiaNombre: "Álgebra Lineal y Geometría",
      clases: 3,
    },
  ],

  // Tabla: Alumnos con más ausencias (Top 5 descendente)
  alumnosConMasAusencias: [
    {
      alumnoId: 8,
      alumno: "Aguirre, Emiliano",
      ausencias: 3,
    },
    {
      alumnoId: 14,
      alumno: "Celaya, Pablo",
      ausencias: 2,
    },
    {
      alumnoId: 1,
      alumno: "Gómez, Tomás",
      ausencias: 2,
    },
    {
      alumnoId: 20,
      alumno: "Guerrero, Francis",
      ausencias: 1,
    },
    {
      alumnoId: 15,
      alumno: "Figueroa, Santiago",
      ausencias: 1,
    },
  ],
};

/**
 * Consulta los indicadores de actividad del profesor para el período y materia especificados.
 * BACKEND: GET /api/indicadores/profesor
 */
export async function consultarIndicadoresProfesor(
  filtros: IndicadoresProfesorQuery
): Promise<IndicadoresProfesorResponse> {
  const { desde, hasta, materiaId, profesorId } = filtros;

  // Validación previa de consistencia temporal
  if (desde && hasta && hasta < desde) {
    throw new ApiError(
      "RANGO_INVALIDO",
      "La fecha de fin no puede ser anterior a la de inicio.",
      "hasta",
      422
    );
  }

  if (desde && hasta && !rangoMenorA12Meses(desde, hasta)) {
    throw new ApiError(
      "RANGO_MAXIMO_EXCEDIDO",
      "El período seleccionado no puede superar los 12 meses.",
      "hasta",
      422
    );
  }

  const params = new URLSearchParams();
  if (desde) params.set("desde", desde);
  if (hasta) params.set("hasta", hasta);
  if (materiaId) params.set("materiaId", String(materiaId));
  if (profesorId) params.set("profesorId", String(profesorId));

  const url = `${RUTA}?${params.toString()}`;

  try {
    return await apiGet<IndicadoresProfesorResponse>(url);
  } catch (error) {
    if (error instanceof ApiError && error.status !== 404) {
      throw error;
    }

    // BACKEND: Fallback mientras el equipo de back publica el endpoint.
    // Simula filtrado por período y materia sobre el fixture
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Si el filtro de materia está aplicado, filtramos la distribución
    let clasesMateriaFiltradas = FIXTURE_BASE.clasesPorMateria;
    let clasesDictadas = FIXTURE_BASE.clasesDictadas;

    if (materiaId) {
      clasesMateriaFiltradas = FIXTURE_BASE.clasesPorMateria.filter(
        (m) => m.materiaId === materiaId
      );
      clasesDictadas = clasesMateriaFiltradas.reduce((acc, curr) => acc + curr.clases, 0);
    }

    return {
      ...FIXTURE_BASE,
      periodo: {
        desde: desde || mesEnCursoAR().primerDia,
        hasta: hasta || mesEnCursoAR().ultimoDia,
      },
      clasesDictadas,
      clasesPorMateria: clasesMateriaFiltradas,
    };
  }
}
