import type {
  ListarPagosQuery,
  ClasesPendientesQuery,
  CrearPagoInput,
} from "@/contracts/pago";

export type ClasePendientePagoRow = {
  id: number;
  codigo: string | null;
  alumno_id: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  materia_id: number;
  materia_nombre: string;
  profesor_id: number;
  profesor_nombre: string;
  profesor_apellido: string;
  valor_clase_congelado: string;
  pagado: boolean;
  estado: string;
};

export type PagoRow = {
  id: number;
  comprobante: string | null;
  alumno_id: number;
  alumno_legajo: string | null;
  alumno_nombre: string;
  alumno_apellido: string;
  alumno_dni: string;
  monto: string;
  fecha_pago: string;
  observaciones: string | null;
  usuario_id: number;
  usuario_nombre: string;
  usuario_apellido: string;
  created_at: Date | string;
};

export type PagoFormaPagoRow = {
  id: number;
  pago_id: number;
  forma_pago_id: number;
  forma_pago_nombre: string;
  nro_operacion: string | null;
};

export type PagoTurnoRow = {
  pago_id: number;
  turno_id: number;
  codigo: string | null;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  materia_nombre: string;
  profesor_nombre: string;
  profesor_apellido: string;
  importe: string;
};

export type FormaPagoValidacionRow = {
  id: number;
  nombre: string;
  requiere_nro_operacion: boolean;
  estado: string;
};

export type FiltrosListarPagos = ListarPagosQuery;
export type FiltrosClasesPendientes = ClasesPendientesQuery;
export type DatosCrearPago = CrearPagoInput;
