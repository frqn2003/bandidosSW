import type {
  DeudoresResponse,
  EstadoClaseCuenta,
  EstadoCuentaResponse,
  EstadoPagoCuenta,
  MovimientoEstadoCuenta,
} from "@/contracts/deuda";
import type { AlumnoCuentaRow, DeudorRow, MovimientoRow } from "./deuda.types";

const hhmm = (t: string) => t.slice(0, 5);

export function deudoresToApi(rows: DeudorRow[]): DeudoresResponse {
  return {
    items: rows.map((r) => ({
      alumno: {
        id: r.alumno_id,
        legajo: r.legajo,
        nombre: r.nombre,
        apellido: r.apellido,
        dni: r.dni,
      },
      clasesAdeudadas: Number(r.clases_adeudadas),
      montoAdeudado: Number(r.monto_adeudado),
      fechaClaseMasAntigua: r.fecha_mas_antigua.slice(0, 10),
      diasAntiguedad: Number(r.dias_antiguedad),
      semaforo: r.semaforo,
    })),
    // `fn_deudores` lo devuelve en cada fila (suma del listado ya filtrado).
    totalGeneral: rows.length > 0 ? Number(rows[0].total_general) : 0,
  };
}

function movimientoToApi(r: MovimientoRow): MovimientoEstadoCuenta {
  const base = {
    fecha: r.fecha.slice(0, 10),
    hora: hhmm(r.hora),
    detalle: r.detalle,
    cargo: Number(r.cargo),
    credito: Number(r.credito),
    afectaSaldo: Boolean(r.afecta_saldo),
    saldoAcumulado: Number(r.saldo_acumulado),
    referenciaId: r.referencia_id,
  };
  if (r.tipo === "Pago") {
    return {
      ...base,
      tipo: "Pago",
      referencia: r.referencia ?? `REC-${String(r.referencia_id).padStart(6, "0")}`,
      estado: r.estado as EstadoPagoCuenta,
    };
  }
  return {
    ...base,
    tipo: "Clase",
    referencia: r.referencia ?? `TUR-${String(r.referencia_id).padStart(6, "0")}`,
    estado: r.estado as EstadoClaseCuenta,
  };
}

export function estadoCuentaToApi(
  alumno: AlumnoCuentaRow,
  rows: MovimientoRow[],
): EstadoCuentaResponse {
  const movimientos = rows.map(movimientoToApi);
  return {
    alumno: {
      id: alumno.id,
      legajo: alumno.legajo,
      nombre: alumno.nombre,
      apellido: alumno.apellido,
      dni: alumno.dni,
    },
    movimientos,
    saldo: movimientos.length > 0 ? movimientos[movimientos.length - 1].saldoAcumulado : 0,
  };
}
