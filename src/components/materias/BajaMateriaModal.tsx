"use client";

import { ConfirmarDialog } from "@/components/ui/ConfirmarDialog";
import { codigoMateria, type MateriaResponse } from "@/data/materias";

interface BajaMateriaModalProps {
  materia: MateriaResponse | null;
  /** Turnos futuros con estado "Reservado" de esa materia. */
  turnosFuturos: number;
  open: boolean;
  onClose: () => void;
  onConfirmar: () => void;
}

/**
 * Baja LÓGICA de una materia (HU-MAT-01): estado → "inactivo". La fila no se
 * borra: deja de aparecer en el listado (que filtra activas por defecto) y no
 * se puede seleccionar en combos de otros módulos ni asignar a nuevos
 * profesores.
 *
 * Si hay turnos futuros reservados la baja queda BLOQUEADA, igual que el
 * error MATERIA_CON_TURNOS_FUTUROS del contrato.
 *
 * BACKEND: POST /api/materias/:id/inactivar (ver `rutaInactivar` en
 * src/contracts/materia.ts). La bitácora del cambio la escribe el trigger
 * fn_auditoria() sobre la tabla `materia`.
 */
export function BajaMateriaModal({
  materia,
  turnosFuturos,
  open,
  onClose,
  onConfirmar,
}: BajaMateriaModalProps) {
  if (!materia) return null;
  const bloqueada = turnosFuturos > 0;

  return (
    <ConfirmarDialog
      open={open}
      title={`¿Dar de baja "${materia.nombre}"?`}
      description={
        bloqueada
          ? "Esta materia tiene turnos futuros reservados: no se puede dar de baja hasta que se cancelen o reprogramen."
          : "La materia queda inactiva: no se podrá seleccionar en combos de otros módulos ni asignarse a nuevos profesores. Los turnos ya reservados no se modifican."
      }
      confirmLabel={bloqueada ? "Entendido" : "Confirmar"}
      cancelLabel="Cancelar"
      tone={bloqueada ? "neutral" : "danger"}
      onClose={onClose}
      onConfirm={() => {
        if (!bloqueada) onConfirmar();
        onClose();
      }}
    >
      <p className="mt-3 rounded-sm bg-surface-container-low px-3 py-2 text-xs font-semibold text-on-surface-variant">
        {codigoMateria(materia.id)} · {materia.nivel} · {materia.duracionClaseMinutos} min
      </p>
      {bloqueada && (
        <p
          role="alert"
          className="mt-2 rounded-sm border border-status-warning/40 bg-status-warning/10 px-3 py-2 text-sm font-semibold text-status-warning-strong"
        >
          Tiene {turnosFuturos} {turnosFuturos === 1 ? "turno futuro" : "turnos futuros"} reservados
          — la baja queda bloqueada.
        </p>
      )}
    </ConfirmarDialog>
  );
}
