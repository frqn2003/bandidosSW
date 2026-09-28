// src/contracts/indicadores.ts
//
// CONTRATO DE INDICADORES DE GESTIÓN (HU-IND-01).
//
// Reglas de negocio del módulo:
//  · Acceso exclusivo: rol Gerente (otros roles reciben ACCESO_DENEGADO 403).
//  · Escala de porcentajes: todos los porcentajes se devuelven en escala de 0 a 100 con 2 decimales
//    (ej: 75.50 representa 75.50%). Si el denominador es 0, devuelven `null` para pintar "—".
//  · Período por defecto: si el front no envía `desde` y `hasta`, el backend toma el primer y último
//    día del mes en curso en huso horario de Argentina. Rango máximo permitido: 12 meses (366 días).
//  · Filtros independientes: `materiaId` y `profesorId` aplican a turnos, ocupación, ingresos y rankings,
//    pero NO a `alumnosActivos` ni a `altasAlumnos` (indicadores globales del centro).
//  · Ocupación: se calcula como (horas dictadas de turnos no cancelados / horas de disponibilidad ofertada
//    por agenda_profesional en el período) * 100.
//  · Rankings: separados en materias más pedidas (por cantidad de turnos y horas) y con mayor ingreso ($).

import { z } from "zod";

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Devuelve el primer y último día del mes actual en Argentina. */
function mesEnCursoAR(): { primerDia: string; ultimoDia: string } {
  const hoyStr = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
  const [y, m] = hoyStr.split("-").map(Number);
  const primerDia = `${y}-${String(m).padStart(2, "0")}-01`;
  const ultimoDiaNum = new Date(y, m, 0).getDate();
  const ultimoDia = `${y}-${String(m).padStart(2, "0")}-${String(ultimoDiaNum).padStart(2, "0")}`;
  return { primerDia, ultimoDia };
}

/** Valida que el rango no supere los 366 días (~12 meses). */
function rangoMenorA12Meses(desde: string, hasta: string): boolean {
  const d1 = new Date(`${desde}T00:00:00Z`);
  const d2 = new Date(`${hasta}T00:00:00Z`);
  const diffDias = (d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24);
  return diffDias >= 0 && diffDias <= 366;
}


// ─── 1. Rutas ────────────────────────────────────────────────────────────
export const RUTA = "/api/indicadores";


// ─── 2. Request ──────────────────────────────────────────────────────────

export const indicadoresQuery = z
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
    profesorId: z.coerce.number().int().positive().optional(),
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

export type IndicadoresQuery = z.output<typeof indicadoresQuery>;


// ─── 4. Response ─────────────────────────────────────────────────────────

export type TurnosPorSemanaItem = {
  /** "yyyy-mm-dd" correspondiente al lunes/inicio de semana (clave inequívoca). */
  fechaInicio: string;
  /** Etiqueta para ejes de gráficos (ej: "Semana del 15/09"). */
  etiquetaSemana: string;
  cantidad: number;
};

export type RankingMateriaDemandaItem = {
  materiaId: number;
  materiaNombre: string;
  turnos: number;
  horasDictadas: number;
};

export type RankingMateriaIngresosItem = {
  materiaId: number;
  materiaNombre: string;
  ingresos: number;
  turnos: number;
};

export type IndicadoresResponse = {
  periodo: {
    desde: string; // "yyyy-mm-dd"
    hasta: string; // "yyyy-mm-dd"
  };
  /** Turnos totales generados en el período (incluye cancelados). */
  turnosGenerados: number;
  /** Porcentaje de cancelaciones en escala 0–100 (ej: 12.50). null si turnosGenerados == 0. */
  porcentajeCancelaciones: number | null;
  /** Porcentaje de ocupación en escala 0–100 (ej: 68.20). null si no hay disponibilidad. */
  porcentajeOcupacion: number | null;
  /** Alumnos activos a la fecha (métrica global del centro). */
  alumnosActivos: number;
  /** Alumnos dados de alta en el período (métrica global del centro). */
  altasAlumnos: number;
  /** Suma de cobros registrados en el período ($). */
  ingresosCobrados: number;
  /** Distribución de turnos por semana (gráfico de barras). */
  turnosPorSemana: TurnosPorSemanaItem[];
  /** Top 5 materias más pedidas / con más horas de clase. */
  rankingMateriasMasPedidas: RankingMateriaDemandaItem[];
  /** Top 5 materias con mayor generación de ingresos. */
  rankingMateriasMayorIngreso: RankingMateriaIngresosItem[];
  /** True si no hubo actividad de turnos ni cobros en el período. */
  sinDatos: boolean;
};


// ─── 5. Errores de dominio ───────────────────────────────────────────────

export type ErrorIndicadores =
  | "RANGO_INVALIDO"         // 422, hasta < desde
  | "RANGO_MAXIMO_EXCEDIDO"  // 422, rango > 12 meses
  | "ACCESO_DENEGADO"        // 403, exclusivo rol Gerente
  | "DATOS_INVALIDOS";       // 422
