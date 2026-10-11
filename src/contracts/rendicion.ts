// src/contracts/rendicion.ts
//
// CONTRATO DE RENDICIÓN POR PROFESOR (HU-PAG-02). Solo lectura.
//
// Reglas de negocio del módulo (las aplica el back; el front no las duplica):
//  · El Gerente consulta la rendición de cualquier profesor activo (`profesorId` obligatorio).
//    El Profesor ve únicamente la propia: el back usa el profesor de la sesión y devuelve
//    ACCESO_DENEGADO si pide otro.
//  · Período por defecto: el mes en curso. Máximo 12 meses.
//  · Se rinde solo lo efectivamente cobrado: clases no canceladas (Asistió o Ausente) con pago
//    VIGENTE cuya fecha de pago cae en el período. Agrupadas por materia, con subtotal por
//    materia y total rendido. Se siguió la base (`fn_rendicion_detalle`): una clase 'Ausente'
//    cobrada también se rinde; cada fila trae `estadoClase` para distinguirla.
//  · Las clases dictadas pendientes de cobro se listan aparte (`pendientes`), solo informativas:
//    no suman al total rendido.
//  · Las cifras coinciden con HU-PAG-01 y con los indicadores de ingresos y deuda (HU-IND-03).

import { z } from "zod";


// ─── 1. Rutas ────────────────────────────────────────────────────────────
//   GET  RUTA  → rendición de un profesor en un período

export const RUTA = "/api/rendicion";


// ─── 2. Request: filtros ─────────────────────────────────────────────────

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

export const rendicionQuery = z
  .object({
    /** Obligatorio para el Gerente. El Profesor puede omitirlo (se usa el suyo). */
    profesorId: z.coerce.number().int().positive().optional(),
    /** Sin `desde`/`hasta` el back usa el mes en curso. */
    desde: z.string().regex(FECHA, "Formato: aaaa-mm-dd.").optional(),
    hasta: z.string().regex(FECHA, "Formato: aaaa-mm-dd.").optional(),
    materiaId: z.coerce.number().int().positive().optional(),
  })
  .strict();


// ─── 3. Tipos derivados ──────────────────────────────────────────────────

export type RendicionQuery = z.output<typeof rendicionQuery>;


// ─── 4. Response ─────────────────────────────────────────────────────────

export type EstadoClaseRendicion = "Reservado" | "Asistió" | "Ausente";

type AlumnoResumen = { id: number; nombre: string; apellido: string };

/** Una clase dictada y cobrada. */
export type RendicionItemResponse = {
  turnoId: number;
  /** "yyyy-mm-dd" */
  fechaClase: string;
  alumno: AlumnoResumen;
  /** Importe cobrado de esta clase, en pesos. */
  importeCobrado: number;
  /** "Efectivo", "Transferencia" o "Efectivo + Transferencia". */
  medioPago: string;
  /** "REC-000123" */
  comprobante: string;
  /** "yyyy-mm-dd" */
  fechaPago: string;
  estadoClase: "Asistió" | "Ausente";
};

export type RendicionMateriaResponse = {
  materia: { id: number; nombre: string };
  clases: number;
  subtotal: number;
  items: RendicionItemResponse[];
};

/** Clase dictada todavía sin cobrar. Informativa: no suma al total rendido. */
export type RendicionPendienteResponse = {
  turnoId: number;
  /** "yyyy-mm-dd" */
  fechaClase: string;
  alumno: AlumnoResumen;
  materia: { id: number; nombre: string };
  importePendiente: number;
  estadoClase: EstadoClaseRendicion;
};

export type RendicionResponse = {
  profesor: { id: number; nombre: string; apellido: string };
  /** "yyyy-mm-dd", ya resueltos (también si se usó el mes en curso). */
  desde: string;
  hasta: string;
  /** Ordenadas por nombre de materia. */
  materias: RendicionMateriaResponse[];
  /** Suma de los subtotales por materia. */
  totalRendido: number;
  pendientes: RendicionPendienteResponse[];
  /** Suma de `pendientes`; informativo. */
  totalPendiente: number;
};


// ─── 5. Errores de dominio ───────────────────────────────────────────────

export type ErrorRendicion =
  | "ACCESO_DENEGADO"           // 403, Mesa de Entrada, o Profesor pidiendo la de otro
  | "PROFESOR_REQUERIDO"        // 422, el Gerente no indicó profesor
  | "RANGO_INVALIDO"            // 422, hasta < desde
  | "PERIODO_DEMASIADO_AMPLIO"  // 422, más de 12 meses
  | "REFERENCIA_INVALIDA"       // 422, profesorId o materiaId inexistente
  | "NO_ENCONTRADO"             // 404
  | "DATOS_INVALIDOS";          // 422
