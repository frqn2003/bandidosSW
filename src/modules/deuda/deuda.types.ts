import type { ListarDeudoresQuery, SemaforoDeuda } from "@/contracts/deuda";

/** Fila de `fn_deudores`. */
export type DeudorRow = {
  alumno_id: number;
  legajo: string;
  apellido: string;
  nombre: string;
  dni: string;
  clases_adeudadas: string;
  monto_adeudado: string;
  fecha_mas_antigua: string;
  dias_antiguedad: number;
  semaforo: SemaforoDeuda;
  total_general: string;
};

/** Fila de `fn_estado_cuenta`. */
export type MovimientoRow = {
  fecha: string;
  hora: string;
  tipo: "Clase" | "Pago";
  referencia_id: number;
  referencia: string | null;
  detalle: string;
  estado: string;
  cargo: string;
  credito: string;
  afecta_saldo: boolean;
  saldo_acumulado: string;
};

export type AlumnoCuentaRow = {
  id: number;
  legajo: string;
  nombre: string;
  apellido: string;
  dni: string;
};

export type FiltrosDeudores = ListarDeudoresQuery;
