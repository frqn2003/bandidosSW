"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";

// Dialog de confirmación (regla Pet Bliss: acciones destructivas y cambios
// irreversibles siempre con confirmación). `tone` ajusta la semántica del
// botón de confirmar: danger (borrados/inhabilitaciones), success (estados que
// avanzan, ej: turno atendido), neutral (cambios de estado sin riesgo).
// Default "danger": mismo icono y variante que la versión original, para no
// romper a los consumidores existentes (NuevoTurnoModal, MascotaFormModal,
// ComprobantesContent, RegistrarPagoCtaCteModal).
export type ConfirmarTone = "danger" | "success" | "neutral";

interface ConfirmarDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: ConfirmarTone;
  onClose: () => void;
  onConfirm: () => void;
  /** Contenido opcional adicional (ej: aviso de cantidad de turnos en la baja). */
  children?: ReactNode;
  /**
   * true mientras se envía la confirmación: deshabilita los dos botones para no
   * mandar la operación dos veces (ej: reserva de turno, HU-TUR-01). Opcional.
   */
  confirmando?: boolean;
  /** Texto del botón mientras `confirmando` es true. Default: `confirmLabel`. */
  confirmandoLabel?: string;
}

const TONES: Record<
  ConfirmarTone,
  { icon: ReactNode; variant: "destructive" | "primary" | "secondary"; iconClass: string }
> = {
  danger: {
    icon: <Icon name="warning" size={20} />,
    variant: "destructive",
    iconClass: "text-error",
  },
  success: {
    icon: <Icon name="check_circle" size={20} />,
    variant: "primary",
    iconClass: "text-status-success-strong",
  },
  neutral: {
    icon: <Icon name="info" size={20} />,
    variant: "secondary",
    iconClass: "text-on-surface-variant",
  },
};

export function ConfirmarDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Volver",
  tone = "danger",
  onClose,
  onConfirm,
  children,
  confirmando = false,
  confirmandoLabel,
}: ConfirmarDialogProps) {
  const style = TONES[tone];
  // Mientras se envía no se puede cerrar (Escape / fondo): el resultado tiene
  // que llegar a una pantalla que lo muestre.
  const cerrar = () => {
    if (!confirmando) onClose();
  };
  return (
    <Modal
      open={open}
      onClose={cerrar}
      title={title}
      icon={<span className={style.iconClass}>{style.icon}</span>}
      maxWidth="max-w-md"
      footer={
        <>
          <Button type="button" variant="outline" onClick={cerrar} disabled={confirmando}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={style.variant}
            onClick={onConfirm}
            disabled={confirmando}
            aria-busy={confirmando || undefined}
          >
            {confirmando ? (confirmandoLabel ?? confirmLabel) : confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-on-surface-variant">{description}</p>
      {children}
    </Modal>
  );
}