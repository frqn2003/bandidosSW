// src/components/asistencia/AbsentModal.tsx
//
// Modal para registrar inasistencia como "Ausente" (HU-ASI-01).
// Campo "Observaciones": OPCIONAL, máx 500 caracteres.
// Al guardar muestra ventana de confirmación -> Pasa a estado "Ausente" (naranja).

"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Textarea } from "@/components/ui/Textarea";
import { ConfirmarDialog } from "@/components/ui/ConfirmarDialog";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { ClaseDelDiaResponse } from "@/contracts/asistencia";

interface AbsentModalProps {
  open: boolean;
  clase: ClaseDelDiaResponse | null;
  onClose: () => void;
  onConfirmAbsent: (data: { observaciones?: string | null }) => Promise<void>;
}

export function AbsentModal({
  open,
  clase,
  onClose,
  onConfirmAbsent,
}: AbsentModalProps) {
  const [observaciones, setObservaciones] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [guardando, setGuardando] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  React.useEffect(() => {
    if (open) {
      setObservaciones("");
      setShowConfirm(false);
    }
  }, [open, clase?.turnoId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!clase) return null;

  const handleIntentarGuardar = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirm(true);
  };

  const handleConfirmar = async () => {
    setGuardando(true);
    try {
      await onConfirmAbsent({
        observaciones: observaciones.trim() || null,
      });
      setShowConfirm(false);
      onClose();
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <Modal
        open={open && !showConfirm}
        onClose={onClose}
        title="Registrar Ausente"
        maxWidth="max-w-lg"
        icon={<Icon name="person_off" size={24} className="text-status-warning-strong" />}
        titleExtra={
          <StatusBadge
            variant="warning"
            label="Ausente"
            icon="cancel"
          />
        }
        subtitle={`Turno ${clase.codigo} · ${clase.horaInicio} - ${clase.horaFin}`}
      >
        <form onSubmit={handleIntentarGuardar} className="space-y-4">
          {/* Ficha informativa del turno */}
          <div className="rounded-md border border-outline-variant bg-surface-container-low p-3.5 text-xs text-on-surface">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="block font-medium text-on-surface-variant">Alumno</span>
                <span className="font-bold text-sm">
                  {clase.alumno.apellido}, {clase.alumno.nombre}
                </span>
                <span className="block text-[11px] text-on-surface-variant font-mono">
                  {clase.alumno.legajo}
                </span>
              </div>
              <div>
                <span className="block font-medium text-on-surface-variant">Materia</span>
                <span className="font-bold text-sm">{clase.materia.nombre}</span>
                <span className="block text-[11px] text-on-surface-variant">
                  {clase.fecha} ({clase.horaInicio} a {clase.horaFin})
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-sm border border-status-warning-strong/30 bg-status-warning/10 p-3 text-xs text-on-surface flex items-start gap-2">
            <Icon name="info" size={18} className="text-status-warning-strong shrink-0 mt-0.5" />
            <p>
              El alumno quedará registrado como <strong>Ausente</strong>. Podés indicar el motivo del aviso o detalles relevantes en las observaciones.
            </p>
          </div>

          {/* Campo opcional: Observaciones */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="observaciones-ausente"
                className="text-xs font-bold text-on-surface-variant"
              >
                Observaciones (opcional)
              </label>
              <span
                className={`text-[11px] ${
                  observaciones.length > 500
                    ? "text-error font-bold"
                    : "text-on-surface-variant"
                }`}
              >
                {observaciones.length} / 500
              </span>
            </div>
            <Textarea
              id="observaciones-ausente"
              rows={3}
              value={observaciones}
              maxLength={500}
              placeholder="Ej: Avisó con anticipación por certificado médico, sin aviso previo..."
              onChange={(e) => setObservaciones(e.target.value)}
            />
          </div>

          {/* Footer de acciones */}
          <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-outline-variant">
            <Button variant="ghost" type="button" onClick={onClose} disabled={guardando}>
              Cancelar
            </Button>
            <Button
              variant="secondary"
              type="submit"
              disabled={guardando}
              className="bg-status-warning-strong hover:opacity-90 text-white"
            >
              <Icon name="person_off" size={18} />
              Guardar inasistencia
            </Button>
          </div>
        </form>
      </Modal>

      {/* Ventana de confirmación previa a guardar */}
      <ConfirmarDialog
        open={showConfirm}
        tone="neutral"
        title="Confirmar Registro de Ausencia"
        description={`¿Estás seguro de registrar a ${clase.alumno.nombre} ${clase.alumno.apellido} como AUSENTE para la clase de ${clase.materia.nombre}?`}
        confirmLabel="Sí, marcar Ausente"
        cancelLabel="Volver a revisar"
        confirmando={guardando}
        confirmandoLabel="Registrando..."
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmar}
      />
    </>
  );
}
