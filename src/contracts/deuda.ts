// src/contracts/deuda.ts
//
// CONTRATO DE DEUDA (HU-PAG-02): listado de deudores y estado de cuenta del alumno.
// Solo lectura. Los datos se piden al entrar a la pantalla y con el botón "Actualizar".
//
// Reglas de negocio del módulo (las aplica el back; el front no las duplica):
//  · Solo acceden Gerente y Mesa de Entrada. El Profesor no (→ ACCESO_DENEGADO).
//  · Qué es una clase adeudada: la define la base (`vw_deuda_clase` / `fn_turno_cobrable`):
//    turno no pagado en estado 'Asistió' o 'Ausente'. Los 'Reservado' y 'Cancelado' no generan
//    deuda ni cargos. Cumple el criterio de la HU.
//  · Deudores: solo alumnos con deuda > 0, por monto adeudado descendente.
//  · Antigüedad = días desde la clase impaga más antigua. Semáforo: hasta 30 amarillo,
//    31–60 naranja, más de 60 rojo (lo calcula el back).
//  · `totalGeneral` es la suma del listado ya filtrado (no de toda la deuda).
//  · Estado de cuenta: clases (cargos) y pagos (créditos) en orden cronológico con saldo
//    acumulado. Las clases canceladas y los pagos anulados se listan pero NO suman al saldo
//    (`afectaSaldo = false`).
//  · Las cifras coinciden con HU-PAG-01 y los indicadores de ingresos y deuda (HU-IND-03).

import { z } from "zod";


// ─── 1. Rutas ────────────────────────────────────────────────────────────
//   GET  RUTA_DEUDORES               → listado de deudores + total general
//   GET  rutaEstadoCuenta(alumnoId)  → movimientos y saldo del alumno

export const RUTA_DEUDORES = "/api/deudores";
export const rutaEstadoCuenta = (alumnoId: number) => `/api/alumnos/${alumnoId}/estado-cuenta`;


// ─── 2. Request: filtros del listado ─────────────────────────────────────
// `antiguedad`: "0-30" | "31-60" | "mas-60" (días de la clase impaga más antigua).

export const listarDeudoresQuery = z
  .object({
    /** Nombre, apellido, DNI o legajo; parcial y sin distinguir mayúsculas. */
    busqueda: z.string().trim().optional(),
    antiguedad: z.enum(["0-30", "31-60", "mas-60"]).optional(),
    materiaId: z.coerce.number().int().positive().optional(),
    profesorId: z.coerce.number().int().positive().optional(),
  })
  .strict();


// ─── 3. Tipos derivados ──────────────────────────────────────────────────

export type ListarDeudoresQuery = z.output<typeof listarDeudoresQuery>;


// ─── 4. Response ─────────────────────────────────────────────────────────

export type SemaforoDeuda = "amarillo" | "naranja" | "rojo";

export type DeudorResponse = {
  alumno: { id: number; legajo: string; nombre: string; apellido: string; dni: string };
  clasesAdeudadas: number;
  montoAdeudado: number;
  /** "yyyy-mm-dd" */
  fechaClaseMasAntigua: string;
  diasAntiguedad: number;
  semaforo: SemaforoDeuda;
};

export type DeudoresResponse = {
  /** Orden: monto adeudado descendente. */
  items: DeudorResponse[];
  /** Suma de `montoAdeudado` de los items filtrados. */
  totalGeneral: number;
};

export type EstadoClaseCuenta = "Reservado" | "Asistió" | "Ausente" | "Cancelado";
export type EstadoPagoCuenta = "Vigente" | "Anulado";

type MovimientoBase = {
  /** "yyyy-mm-dd" */
  fecha: string;
  /** "HH:MM" */
  hora: string;
  /** Texto listo para mostrar: materia y profesor, o los medios de pago. */
  detalle: string;
  /** Cargo (clase) en pesos; 0 en los pagos. */
  cargo: number;
  /** Crédito (pago) en pesos; 0 en las clases. */
  credito: number;
  /** false en clases canceladas y pagos anulados: se distinguen visualmente y no suman. */
  afectaSaldo: boolean;
  /** Saldo luego de este movimiento (solo suman los que `afectaSaldo`). */
  saldoAcumulado: number;
};

export type MovimientoEstadoCuenta =
  | (MovimientoBase & {
      tipo: "Clase";
      /** turno.id */
      referenciaId: number;
      /** turno.codigo, "TUR-000123" */
      referencia: string;
      estado: EstadoClaseCuenta;
    })
  | (MovimientoBase & {
      tipo: "Pago";
      /** pago.id: abre el comprobante con `rutaPago` de pago.ts. */
      referenciaId: number;
      /** pago.comprobante, "REC-000123" */
      referencia: string;
      estado: EstadoPagoCuenta;
    });

export type EstadoCuentaResponse = {
  alumno: { id: number; legajo: string; nombre: string; apellido: string; dni: string };
  /** Cronológico ascendente. */
  movimientos: MovimientoEstadoCuenta[];
  /** Saldo final (deuda pendiente). 0 si no hay movimientos. */
  saldo: number;
};


// ─── 5. Errores de dominio ───────────────────────────────────────────────

export type ErrorDeuda =
  | "ACCESO_DENEGADO"   // 403, el Profesor no accede
  | "NO_ENCONTRADO"     // 404, alumno inexistente
  | "DATOS_INVALIDOS";  // 422
