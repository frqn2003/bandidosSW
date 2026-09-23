"use client";

import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { formatearFecha } from "@/lib/formato";
import type { TurnoCalendarioResponse } from "@/contracts/calendario";
import { TurnoCalendarioBadge } from "./TurnoCalendarioBadge";

// Detalle del turno en modo LECTURA (HU-CAL-01 → reusa el criterio de HU-TUR-02):
// campos deshabilitados/en gris y sin acciones de edición. La reserva y el cambio
// de estado no se tocan desde acá: son de la pantalla de turnos.

interface TurnoDetalleModalProps {
  open: boolean;
  turno: TurnoCalendarioResponse | null;
  /** "yyyy-mm-dd" del día al que pertenece el turno (la fecha no viaja en el contrato). */
  fecha: string;
  profesorNombre: string;
  onClose: () => void;
}

function DatoDetalle({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
        {label}
      </span>
      <span className="text-sm font-bold text-on-surface">{valor}</span>
    </div>
  );
}

export function TurnoDetalleModal({
  open,
  turno,
  fecha,
  profesorNombre,
  onClose,
}: TurnoDetalleModalProps) {
  return (
    <Modal
      open={open && turno !== null}
      onClose={onClose}
      title="Detalle del turno"
      subtitle={turno ? `Profesor: ${profesorNombre}` : undefined}
      icon={
        <span className="flex h-11 w-11 items-center justify-center rounded-md bg-primary-container/30">
          <Icon name="event_note" size={22} className="text-primary" />
        </span>
      }
      maxWidth="max-w-xl"
      footer={
        <Button variant="outline" type="button" onClick={onClose}>
          Volver
        </Button>
      }
    >
      {turno && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 rounded-sm border border-outline-variant bg-surface-container-lowest p-4 sm:grid-cols-2">
            <DatoDetalle label="Turno" valor={turno.codigo} />
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                Estado
              </span>
              <TurnoCalendarioBadge estado={turno.estado} />
            </div>
            <DatoDetalle
              label="Fecha y hora"
              valor={`${formatearFecha(fecha)} · ${turno.horaInicio} – ${turno.horaFin}`}
            />
            <DatoDetalle
              label="Alumno"
              valor={`${turno.alumno.apellido}, ${turno.alumno.nombre}`}
            />
            <DatoDetalle label="Materia" valor={turno.materia.nombre} />
          </div>
        </div>
      )}
    </Modal>
  );
}