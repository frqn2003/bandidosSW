"use client";

import type { Profesor } from "@/data/profesores";
import { ConfirmarDialog } from "@/components/ui/ConfirmarDialog";

interface BajaProfesorModalProps {
  profesor: Profesor | null;
  turnosFuturos: number;
  open: boolean;
  onClose: () => void;
  onConfirmar: () => void;
}

/**
 * Baja lógica de profesor (HU-PRO-01): estado → "inactivo".
 * Si hay turnos futuros `Reservado` (turno.fecha >= hoy) la baja queda
 * BLOQUEADA y se muestra la cantidad — el docente no puede dejar de recibir
 * alumnos que ya tienen clase reservada. BACKEND: PATCH /api/profesores/:id
 * { "estado": "inactivo" } (auditoría vía trigger).
 */
export function BajaProfesorModal({
  profesor,
  turnosFuturos,
  open,
  onClose,
  onConfirmar,
}: BajaProfesorModalProps) {
  if (!profesor) return null;
  const bloqueada = turnosFuturos > 0;

  return (
    <ConfirmarDialog
      open={open}
      title={`Dar de baja a ${profesor.apellido}, ${profesor.nombre}?`}
      description={
        bloqueada
          ? "Este docente tiene turnos futuros reservados y no puede darse de baja hasta que los resuelva (cancelados o reasignados)."
          : "Al confirmar, el docente queda inactivo y no podrá recibir nuevas clases."
      }
      confirmLabel={bloqueada ? "Entendido" : "Confirmar baja"}
      tone={bloqueada ? "neutral" : "danger"}
      onClose={onClose}
      onConfirm={() => {
        if (!bloqueada) onConfirmar();
        onClose();
      }}
    >
      {turnosFuturos > 0 && (
        <p
          role="alert"
          className="mt-3 rounded-sm border border-status-warning/40 bg-status-warning/10 px-3 py-2 text-sm font-semibold text-status-warning-strong"
        >
          ⚠ Tiene {turnosFuturos} {turnosFuturos === 1 ? "turno futuro" : "turnos futuros"}{" "}
          reservados — la baja queda bloqueada.
        </p>
      )}
    </ConfirmarDialog>
  );
}