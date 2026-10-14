import type { EstadoBloqueo, ListarBloqueosQuery } from "@/contracts/bloqueo";

export type BloqueoRow = {
  id: number;
  fecha_desde: string;
  fecha_hasta: string;
  profesor_id: number | null;
  profesor_nombre: string | null;
  profesor_apellido: string | null;
  motivo: string;
  estado: EstadoBloqueo;
  usuario_id: number;
  usuario_nombre: string;
  usuario_apellido: string;
  created_at: Date;
  fecha_baja: Date | null;
  usuario_baja_id: number | null;
  baja_nombre: string | null;
  baja_apellido: string | null;
};

export type TurnoAfectadoRow = {
  id: number;
  codigo: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  alumno_id: number;
  alumno_legajo: string;
  alumno_nombre: string;
  alumno_apellido: string;
  profesor_id: number;
  profesor_nombre: string;
  profesor_apellido: string;
  materia_id: number;
  materia_nombre: string;
};

export type FiltrosBloqueo = ListarBloqueosQuery;
