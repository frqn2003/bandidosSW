import type { EstadoTurno, NivelMateria } from "@/contracts/turno";

/** Turno del alumno sin precios ni datos de pago. */
export type TurnoPortalRow = {
  id: number;
  codigo: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  materia_id: number;
  materia_nombre: string;
  profesor_id: number;
  profesor_nombre: string;
  profesor_apellido: string;
  estado: EstadoTurno;
  observaciones: string | null;
  created_at: Date;
};

export type MateriaPortalRow = {
  id: number;
  nombre: string;
  nivel: NivelMateria;
  duracion_clase_minutos: number;
};

export type ProfesorPortalRow = { id: number; nombre: string; apellido: string };
