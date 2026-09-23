"use client";

import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { formatearFecha } from "@/lib/formato";
import type { ProfesorCalendario } from "@/data/calendario";

// Reserva de turno (HU-TUR-01, proyecto aparte). Acá SOLO se precarga el hueco
// elegido en la grilla; el formulario de la reserva vive en la pantalla de
// turnos. El chip "Próx." deja claro que todavía no existe ese flujo.
// BACKEND: cuando HU-TUR-01 exista, este modal navega a la reserva con
// Profesor/Fecha/Horario como query del form (o este click llama a un callback).

interface ReservaTurnoModalProps {
  open: boolean;
  fecha: string;
  huecoInicio: string;
  huecoFin: string;
  profesor: ProfesorCalendario | null;
  onClose: () => void;
}

export function ReservaTurnoModal({
  open,
  fecha,
  huecoInicio,
  huecoFin,
  profesor,
  onClose,
}: ReservaTurnoModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Reservar turno"
      subtitle="HU-TUR-01 · Reserva de clases"
      icon={
        <span className="flex h-11 w-11 items-center justify-center rounded-md bg-tertiary-container/30">
          <Icon name="add_circle" size={22} className="text-tertiary" />
        </span>
      }
      titleExtra={
        <span className="rounded-full bg-surface-container-high px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
          Próx.
        </span>
      }
      maxWidth="max-w-md"
      footer={
        <Button variant="outline" type="button" onClick={onClose}>
          Volver a la grilla
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm font-medium text-on-surface-variant">
          Este horario libre va a pasar al formulario de reserva de clases con el
          profesor, la fecha y el horario ya cargados:
        </p>
        <dl className="grid grid-cols-1 gap-3 rounded-sm border border-outline-variant bg-surface-container-lowest p-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <dt className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
              Profesor
            </dt>
            <dd className="text-sm font-bold text-on-surface">
              {profesor ? `${profesor.apellido}, ${profesor.nombre}` : "—"}
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
              Fecha
            </dt>
            <dd className="text-sm font-bold text-on-surface">{formatearFecha(fecha)}</dd>
          </div>
          <div className="flex flex-col gap-1 sm:col-span-2">
            <dt className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
              Horario
            </dt>
            <dd className="text-sm font-bold text-on-surface">
              {huecoInicio} – {huecoFin}
            </dd>
          </div>
        </dl>
      </div>
    </Modal>
  );
}