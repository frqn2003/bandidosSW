"use client";

import { ConfirmarDialog } from "@/components/ui/ConfirmarDialog";
import { formatearFecha } from "@/funciones/formato";
import type { AlumnoResponse } from "@/data/alumnos";

interface DuplicadosModalProps {
  /** Coincidencias por nombre + apellido + fecha de nacimiento. */
  duplicados: AlumnoResponse[];
  open: boolean;
  onClose: () => void;
  /** "Cargar igual": el alta sigue. */
  onConfirmar: () => void;
}

/**
 * Aviso de posible duplicado (HU-ALU-01, criterio opcional).
 *
 * **No es un rechazo.** La base no tiene una restricción de unicidad por
 * nombre + apellido + fecha de nacimiento: dos personas pueden coincidir en los
 * tres datos. Por eso el botón principal es "Cargar igual" y el tono es
 * neutral, no destructivo.
 *
 * BACKEND: las coincidencias salen de GET /api/alumnos/posibles-duplicados
 * (`RUTA_POSIBLES_DUPLICADOS` del contrato).
 */
export function DuplicadosModal({
  duplicados,
  open,
  onClose,
  onConfirmar,
}: DuplicadosModalProps) {
  if (duplicados.length === 0) return null;

  return (
    <ConfirmarDialog
      open={open}
      title="¿Es la misma persona?"
      description={
        duplicados.length === 1
          ? "Ya hay un alumno registrado con ese nombre, apellido y fecha de nacimiento. Puede ser un duplicado, o dos personas distintas."
          : `Ya hay ${duplicados.length} alumnos registrados con ese nombre, apellido y fecha de nacimiento. Pueden ser duplicados, o personas distintas.`
      }
      confirmLabel="Cargar igual"
      cancelLabel="Cancelar"
      tone="neutral"
      onClose={onClose}
      onConfirm={onConfirmar}
    >
      <ul className="mt-3 flex flex-col gap-2">
        {duplicados.map((a) => (
          <li
            key={a.id}
            className="rounded-sm border border-outline-variant bg-surface-container-low px-3 py-2"
          >
            <p className="text-sm font-bold text-on-surface">
              {a.apellido}, {a.nombre}
            </p>
            <p className="text-xs font-medium text-on-surface-variant">
              <span className="font-mono font-semibold">{a.legajo}</span> · DNI {a.dni} ·{" "}
              {formatearFecha(a.fechaNacimiento)} · {a.nivelEducativo}
            </p>
          </li>
        ))}
      </ul>
    </ConfirmarDialog>
  );
}
