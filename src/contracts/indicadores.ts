// src/contracts/indicadores.ts
//
// CONTRATO DE INDICADORES DE GESTIÓN (HU-IND-01) Y TABLERO DE DIRECCIÓN (HU-IND-03).
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
//
// HU-IND-03 (se conserva todo lo anterior; lo nuevo es aditivo):
//  · Filtro `nivel` (Primario | Secundario | Universitario), combinable con los demás. Aplica a
//    turnos, ocupación, ingresos, deuda y rankings, y también a `alumnosActivos` / `altasAlumnos`
//    (por el nivel educativo del alumno). `materiaId` y `profesorId` siguen sin aplicar a esos dos.
//  · `tarjetas`: las 8 tarjetas numéricas con su comparación contra el período inmediato anterior
//    de igual duración, calculada por la base (`fn_indicadores_direccion`). Incluye lo nuevo:
//    % de asistencia global = Asistió / (Asistió + Ausente), deuda pendiente total (definición de
//    HU-PAG-02, calculada al corte = el menor entre `hasta` y hoy) e ingresos cobrados (pagos
//    vigentes; excluye anulados). El back no recalcula nada: la variación y si "mejora" vienen
//    resueltos (en Deuda pendiente total y % de cancelaciones, menos es mejor).
//  · Ranking de profesores: top 5 por clases dictadas ('Asistió').
//  · Mapa de calor: endpoint aparte (`RUTA_MAPA_CALOR`) porque tiene un filtro propio de horario.
//  · Los campos planos de HU-IND-01 (`porcentajeCancelaciones`, etc.) se mantienen; las `tarjetas`
//    son la fuente para el tablero completo. La base devuelve porcentajes con 1 decimal.

import { z } from "zod";

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const nivelFiltro = z.enum(["Primario", "Secundario", "Universitario"]);

/** Devuelve el primer y último día del mes actual en Argentina. */
export function mesEnCursoAR(): { primerDia: string; ultimoDia: string } {
  const hoyStr = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
  const [y, m] = hoyStr.split("-").map(Number);
  const primerDia = `${y}-${String(m).padStart(2, "0")}-01`;
  const ultimoDiaNum = new Date(y, m, 0).getDate();
  const ultimoDia = `${y}-${String(m).padStart(2, "0")}-${String(ultimoDiaNum).padStart(2, "0")}`;
  return { primerDia, ultimoDia };
}

/** Valida que el rango no supere los 366 días (~12 meses). */
export function rangoMenorA12Meses(desde: string, hasta: string): boolean {
  const d1 = new Date(`${desde}T00:00:00Z`);
  const d2 = new Date(`${hasta}T00:00:00Z`);
  const diffDias = (d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24);
  return diffDias >= 0 && diffDias <= 366;
}


// ─── 1. Rutas ────────────────────────────────────────────────────────────
//   GET  RUTA             → tablero de dirección (tarjetas, gráficos, rankings)
//   GET  RUTA_MAPA_CALOR  → mapa de calor de demanda por materia y franja horaria (HU-IND-03)
export const RUTA = "/api/indicadores";
export const RUTA_MAPA_CALOR = "/api/indicadores/mapa-calor";


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
    /** HU-IND-03: nivel de la materia. Combinable con los demás filtros. */
    nivel: nivelFiltro.optional(),
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

/** Mapa de calor: mismos filtros + franja horaria (sobre la hora de inicio; `horaHasta` excluyente). */
export const mapaCalorQuery = z
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
    nivel: nivelFiltro.optional(),
    horaDesde: z.string().regex(HORA, "Formato: HH:MM.").optional(),
    horaHasta: z.string().regex(HORA, "Formato: HH:MM.").optional(),
  })
  .strict()
  .refine((v) => v.hasta >= v.desde, {
    message: "La fecha de fin no puede ser anterior a la de inicio.",
    path: ["hasta"],
  })
  .refine((v) => rangoMenorA12Meses(v.desde, v.hasta), {
    message: "El período seleccionado no puede superar los 12 meses.",
    path: ["hasta"],
  })
  .refine((v) => !v.horaDesde || !v.horaHasta || v.horaHasta > v.horaDesde, {
    message: "La hora hasta tiene que ser posterior a la hora desde.",
    path: ["horaHasta"],
  });


// ─── 3. Tipos derivados ──────────────────────────────────────────────────

export type IndicadoresQuery = z.output<typeof indicadoresQuery>;
export type MapaCalorQuery = z.output<typeof mapaCalorQuery>;


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

/** Clave de cada tarjeta numérica del tablero de dirección. */
export type ClaveTarjeta =
  | "turnos_generados"
  | "porcentaje_cancelaciones"
  | "porcentaje_ocupacion"
  | "porcentaje_asistencia"
  | "alumnos_activos"
  | "altas_alumnos"
  | "ingresos_cobrados"
  | "deuda_pendiente_total";

export type IndicadorTarjetaResponse = {
  clave: ClaveTarjeta;
  /** Texto listo para mostrar, ej. "% de asistencia global". */
  etiqueta: string;
  unidad: "cantidad" | "porcentaje" | "pesos";
  /** Valor del período. null si no hay base de cálculo (porcentaje con denominador 0): se muestra "—". */
  valor: number | null;
  /** Valor del período inmediato anterior de igual duración. */
  valorAnterior: number | null;
  /** Variación porcentual contra el período anterior, 1 decimal. null si no es comparable (anterior en 0 o sin dato). */
  variacionPorcentual: number | null;
  /**
   * true = mejora (▲/▼ verde), false = empeora (rojo), null = sin cambio o no comparable (sin flecha).
   * Ya considera `menorEsMejor`: el front no decide el color por el signo.
   */
  mejora: boolean | null;
  /** true en deuda pendiente y % de cancelaciones: que baje es mejorar. */
  menorEsMejor: boolean;
};

export type RankingProfesorItem = {
  profesorId: number;
  /** "Apellido, Nombre" */
  profesor: string;
  /** Turnos 'Asistió' del período. */
  clasesDictadas: number;
  horasDictadas: number;
};

export type IndicadoresResponse = {
  periodo: {
    desde: string; // "yyyy-mm-dd"
    hasta: string; // "yyyy-mm-dd"
  };
  /** HU-IND-03: período inmediato anterior de igual duración, contra el que se compara. */
  periodoAnterior?: {
    desde: string; // "yyyy-mm-dd"
    hasta: string; // "yyyy-mm-dd"
  };
  /** HU-IND-03: las 8 tarjetas con su comparación, en el orden en que se muestran. */
  tarjetas?: IndicadorTarjetaResponse[];
  /** HU-IND-03: top 5 profesores por clases dictadas. */
  rankingProfesores?: RankingProfesorItem[];
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


/** Una celda del mapa de calor: demanda de una materia en una franja de una hora. */
export type MapaCalorCeldaResponse = {
  materiaId: number;
  materiaNombre: string;
  /** Hora de inicio de la franja, 0–23. */
  franjaHora: number;
  /** "14:00-15:00" */
  franja: string;
  /** Turnos no cancelados cuya hora de inicio cae en la franja. */
  turnos: number;
};

export type MapaCalorResponse = {
  periodo: { desde: string; hasta: string };
  /** Solo celdas con demanda (turnos > 0); el front completa con 0 las que faltan. */
  celdas: MapaCalorCeldaResponse[];
  /** Mayor `turnos` de las celdas, para escalar los colores. 0 si no hay celdas. */
  maxTurnos: number;
};


// ─── 5. Errores de dominio ───────────────────────────────────────────────

export type ErrorIndicadores =
  | "RANGO_INVALIDO"         // 422, hasta < desde
  | "RANGO_MAXIMO_EXCEDIDO"  // 422, rango > 12 meses
  | "HORARIO_INVALIDO"       // 422, horaHasta <= horaDesde (mapa de calor)
  | "REFERENCIA_INVALIDA"    // 422, profesorId o materiaId inexistente
  | "ACCESO_DENEGADO"        // 403, exclusivo rol Gerente
  | "DATOS_INVALIDOS";       // 422
