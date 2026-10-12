// src/components/asistencia/PresentModal.tsx
//
// Modal para registrar asistencia como "Presente" (HU-ASI-01).
// Campo "Tema trabajado": OBLIGATORIO, máx 250 caracteres.
// Campo "Observaciones": OPCIONAL, máx 500 caracteres.
// Al guardar muestra ventana de confirmación -> Pasa a estado "Asistió" (verde).

"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Textarea } from "@/components/ui/Textarea";
import { ConfirmarDialog } from "@/components/ui/ConfirmarDialog";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { ClaseDelDiaResponse } from "@/contracts/asistencia";

interface PresentModalProps {
  open: boolean;
  clase: ClaseDelDiaResponse | null;
  onClose: () => void;
  onConfirmPresent: (data: {
    temaTrabajado: string;
    observaciones?: string | null;
  }) => Promise<void>;
}

export function PresentModal({
  open,
  clase,
  onClose,
  onConfirmPresent,
}: PresentModalProps) {
  const [temaTrabajado, setTemaTrabajado] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [errorTema, setErrorTema] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [guardando, setGuardando] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  // Reset al abrir/cambiar clase
  React.useEffect(() => {
    if (open) {
      setTemaTrabajado("");
      setObservaciones("");
      setErrorTema(null);
      setShowConfirm(false);
    }
  }, [open, clase?.turnoId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!clase) return null;

  const handleIntentarGuardar = (e: React.FormEvent) => {
    e.preventDefault();
    const temaTrim = temaTrabajado.trim();
    if (!temaTrim) {
      setErrorTema("El tema trabajado es obligatorio para registrar la presencia.");
      return;
    }
    if (temaTrim.length > 250) {
      setErrorTema("El tema trabajado no puede superar los 250 caracteres.");
      return;
    }
    setErrorTema(null);
    setShowConfirm(true);
  };

  const handleConfirmar = async () => {
    setGuardando(true);
    try {
      await onConfirmPresent({
        temaTrabajado: temaTrabajado.trim(),
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
        title="Registrar Presente"
        maxWidth="max-w-lg"
        icon={<Icon name="check_circle" size={24} className="text-status-success-strong" />}
        titleExtra={
          <StatusBadge
            variant="success"
            label="Asistió"
            icon="check_circle"
          />
        }
        subtitle={`Turno ${clase.codigo} · ${clase.horaInicio} - ${clase.horaFin}`}
      >
        <form onSubmit={handleIntentarGuardar} className="space-y-4">
          {/* Ficha rápida del turno */}
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

          {/* Campo obligatorio: Tema trabajado */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="tema-trabajado"
                className="text-xs font-bold text-on-surface flex items-center gap-1"
              >
                Tema trabajado <span className="text-error font-bold">*</span>
              </label>
              <span
                className={`text-[11px] ${
                  temaTrabajado.length > 250
                    ? "text-error font-bold"
                    : "text-on-surface-variant"
                }`}
              >
                {temaTrabajado.length} / 250
              </span>
            </div>
            <Textarea
              id="tema-trabajado"
              rows={3}
              value={temaTrabajado}
              maxLength={250}
              placeholder="Describí los contenidos o ejercitación trabajada en la clase..."
              onChange={(e) => {
                setTemaTrabajado(e.target.value);
                if (errorTema && e.target.value.trim()) {
                  setErrorTema(null);
                }
              }}
              error={errorTema || undefined}
              required
            />
          </div>

          {/* Campo opcional: Observaciones */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="observaciones-presente"
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
              id="observaciones-presente"
              rows={3}
              value={observaciones}
              maxLength={500}
              placeholder="Notas pedagógicas, conducta o acuerdos para la próxima clase..."
              onChange={(e) => setObservaciones(e.target.value)}
            />
          </div>

          {/* Footer de acciones */}
          <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-outline-variant">
            <Button variant="ghost" type="button" onClick={onClose} disabled={guardando}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={guardando || !temaTrabajado.trim()}
              className="bg-status-success-strong hover:opacity-90 text-white"
            >
              <Icon name="check_circle" size={18} />
              Guardar asistencia
            </Button>
          </div>
        </form>
      </Modal>

      {/* Ventana de confirmación previa a registrar */}
      <ConfirmarDialog
        open={showConfirm}
        tone="success"
        title="Confirmar Registro de Asistencia"
        description={`¿Confirmás que ${clase.alumno.nombre} ${clase.alumno.apellido} estuvo presente en la clase de ${clase.materia.nombre}?`}
        confirmLabel="Sí, marcar Presente"
        cancelLabel="Volver a revisar"
        confirmando={guardando}
        confirmandoLabel="Registrando..."
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmar}
      >
        <div className="mt-2 text-xs bg-surface-container-low p-2.5 rounded-sm border border-outline-variant">
          <p className="font-semibold text-on-surface">Tema a registrar:</p>
          <p className="text-on-surface-variant italic mt-0.5">&quot;{temaTrabajado}&quot;</p>
        </div>
      </ConfirmarDialog>
    </>
  );
}
