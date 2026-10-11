// src/contracts/indicadores-profesor.ts
//
// CONTRATO DE INDICADORES DE ACTIVIDAD DEL PROFESOR (HU-IND-02). Solo lectura.
//
// Casi todo el cálculo ya está en la base; el back solo arma la respuesta:
//   fn_indicadores_profesor     → tarjetas (clases, alumnos, horas, % asistencia, % cancelaciones, % ocupación)
//   fn_profesor_clases_por_semana → gráfico de barras por semana
//   fn_profesor_clases_por_materia → distribución por materia
//   fn_profesor_top_ausencias   → "Alumnos con más ausencias" (top 5)
// Las cuatro validan el período (máx. 12 meses) y reciben el profesor de la sesión.
//
// Reglas de negocio del módulo (las aplica el back; el front no las duplica):
//  · Acceso: el Profesor ve únicamente sus propios datos: el back usa el profesor de la sesión
//    (`fn_profesor_id_actual`) y, si manda otro `profesorId`, devuelve ACCESO_DENEGADO.
//    El Gerente puede ver los de cualquier profesor activo y DEBE indicar `profesorId`
//    (si no, PROFESOR_REQUERIDO). Mesa de Entrada y otros roles → ACCESO_DENEGADO.
//    (El tablero global del centro es HU-IND-01, `indicadores.ts`.)
//  · Sin información de pagos.
//  · Se calcula sobre los turnos y la asistencia (HU-ASI-01): 'Asistió', 'Ausente' y 'Cancelado'.
//  · Clases dictadas = turnos 'Asistió'. Horas dictadas = suma de su duración. Alumnos atendidos
//    = alumnos distintos en esas clases.
//  · % de asistencia = Asistió / (Asistió + Ausente), 1 decimal (misma fórmula que HU-ASI-01).
//  · % de cancelaciones = Cancelados / total de turnos del período, 1 decimal.
//  · % de ocupación = horas reservadas / horas disponibles del período, 1 decimal
//    (las fechas bloqueadas no cuentan como disponibles).
//  · Escala 0–100. Si el denominador es 0 el porcentaje llega `null` y el front pinta "—".
//    (HU-IND-01 usa 2 decimales; acá la base devuelve 1, igual que el historial de asistencia.)
//  · Si no hubo turnos en el período, `sinDatos = true` y el front muestra
//    "Sin datos para el período seleccionado".
//  · Período por defecto: mes en curso. Máximo 12 meses.

import { z } from "zod";
import { mesEnCursoAR, rangoMenorA12Meses } from "./indicadores";

const FECHA = /^\d{4}-\d{2}-\d{2}$/;


// ─── 1. Rutas ────────────────────────────────────────────────────────────
//   GET  RUTA  → indicadores de actividad de un profesor (el logueado, o el elegido por el Gerente)

export const RUTA = "/api/indicadores/profesor";


// ─── 2. Request: filtros ─────────────────────────────────────────────────

export const indicadoresProfesorQuery = z
  .object({
    desde: z
      .string()
      .regex(FECHA, "Formato: aaaa-mm-dd.")
      .optional()
      .default(() => mesEnCursoAR().primerDia),
    hasta: z
      .string()
      .regex(FECHA, "Formato: aaaa-mm-dd.")
      .optional()
      .default(() => mesEnCursoAR().ultimoDia),
    /** Obligatorio para el Gerente. El Profesor lo omite (se usa el suyo). */
    profesorId: z.coerce.number().int().positive().optional(),
    /** Opcional; tiene que ser una materia que dicta ese profesor. */
    materiaId: z.coerce.number().int().positive().optional(),
  })
  .strict()
  .refine((v) => v.hasta >= v.desde, {
    message: "La fecha de fin no puede ser anterior a la de inicio.",
    path: ["hasta"],
  })
  .refine((v) => rangoMenorA12Meses(v.desde, v.hasta), {
    message: "El período seleccionado no puede superar los 12 meses.",
    path: ["hasta"],
  });


// ─── 3. Tipos derivados ──────────────────────────────────────────────────

export type IndicadoresProfesorQuery = z.output<typeof indicadoresProfesorQuery>;


// ─── 4. Response ─────────────────────────────────────────────────────────

export type ClasesPorSemanaItem = {
  /** "yyyy-mm-dd", lunes de la semana (clave inequívoca). */
  fechaInicio: string;
  /** "yyyy-mm-dd", domingo de la semana. */
  fechaFin: string;
  /** Etiqueta para el eje, ej. "Semana del 15/09". La arma el back. */
  etiquetaSemana: string;
  /** Clases 'Asistió' de la semana, dentro del período. Las semanas sin clases vienen con 0. */
  cantidad: number;
};

export type ClasesPorMateriaItem = {
  materiaId: number;
  materiaNombre: string;
  clases: number;
};

export type AlumnoAusenciasItem = {
  alumnoId: number;
  /** "Apellido, Nombre" */
  alumno: string;
  ausencias: number;
};

export type IndicadoresProfesorResponse = {
  periodo: {
    /** "yyyy-mm-dd" (ya resueltos si se usó el mes en curso). */
    desde: string;
    hasta: string;
  };
  /** Profesor al que pertenecen las cifras (el Gerente lo ve para saber de quién son). */
  profesor: { id: number; nombre: string; apellido: string };
  /** true si no hubo ningún turno en el período. */
  sinDatos: boolean;
  /** Materias que el profesor dicta: alimentan el combo del filtro. */
  materiasDictadas: { id: number; nombre: string }[];

  // Tarjetas numéricas
  clasesDictadas: number;
  alumnosAtendidos: number;
  /** Horas, 2 decimales. */
  horasDictadas: number;
  /** 0–100, 1 decimal; null si no hay clases Asistió ni Ausente. */
  porcentajeAsistencia: number | null;
  /** 0–100, 1 decimal; null si no hay turnos. */
  porcentajeCancelaciones: number | null;
  /** 0–100, 1 decimal; null si no hay horas disponibles. */
  porcentajeOcupacion: number | null;

  // Base de cálculo de los porcentajes (para el tooltip con la fórmula, opcional)
  totalTurnos: number;
  turnosAusentes: number;
  turnosCancelados: number;
  horasReservadas: number;
  horasDisponibles: number;

  // Gráficos y tabla
  /** Gráfico de barras, orden cronológico. */
  clasesPorSemana: ClasesPorSemanaItem[];
  /** Distribución por materia, de mayor a menor. */
  clasesPorMateria: ClasesPorMateriaItem[];
  /** Top 5, por ausencias descendente. */
  alumnosConMasAusencias: AlumnoAusenciasItem[];
};


// ─── 5. Errores de dominio ───────────────────────────────────────────────

export type ErrorIndicadoresProfesor =
  | "ACCESO_DENEGADO"        // 403, rol no habilitado, o Profesor pidiendo los datos de otro
  | "PROFESOR_REQUERIDO"     // 422, el Gerente no indicó profesorId
  | "RANGO_INVALIDO"         // 422, hasta < desde
  | "RANGO_MAXIMO_EXCEDIDO"  // 422, más de 12 meses
  | "REFERENCIA_INVALIDA"    // 422, profesorId inexistente/inactivo o materiaId que ese profesor no dicta
  | "DATOS_INVALIDOS";       // 422
