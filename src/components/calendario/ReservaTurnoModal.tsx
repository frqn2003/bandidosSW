"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { formatearFecha } from "@/funciones/formato";
import type { ProfesorCalendario } from "@/data/calendario";
import { hoyISO } from "@/data/turnos";

// Puente del calendario a la reserva (HU-TUR-01). Muestra el hueco elegido y
// lleva a /turnos/reservas con Profesor/Fecha/Horario como query: allá se
// completan alumno y materia (el profesor queda elegido si dicta la materia).

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
  const params = new URLSearchParams({ fecha, hora: huecoInicio });
  if (profesor) params.set("profesorId", String(profesor.id));
  const hrefReserva = `/turnos/reservas?${params.toString()}`;
  // Un hueco de un día que ya pasó se ve en la grilla pero no se reserva.
  const [hoy] = useState(() => hoyISO());
  const pasado = fecha !== "" && fecha < hoy;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Reservar turno"
      subtitle="Clase de apoyo en este horario libre"
      icon={
        <span className="flex h-11 w-11 items-center justify-center rounded-md bg-tertiary-container/30">
          <Icon name="add_circle" size={22} className="text-tertiary" />
        </span>
      }
      maxWidth="max-w-md"
      footer={
        <>
          <Button variant="outline" type="button" onClick={onClose}>
            Volver a la grilla
          </Button>
          {/* Link con estilo de Button primario: `ui/Button` es un <button> y no navega. */}
          {!pasado && (
            <Link
              href={hrefReserva}
              className="inline-flex h-11 min-h-11 items-center justify-center gap-2 rounded-sm bg-secondary px-5 text-sm font-bold text-on-secondary transition-all duration-fast ease-out hover:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2"
            >
              <Icon name="event_available" size={18} />
              Continuar con la reserva
            </Link>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {pasado && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-sm border border-status-warning/40 bg-status-warning/10 px-3 py-2.5 text-sm font-semibold text-on-surface"
          >
            <Icon name="history" size={18} className="mt-0.5 shrink-0 text-status-warning-strong" />
            Este día ya pasó: no se puede reservar. Elegí un horario libre de hoy en adelante.
          </p>
        )}
        <p className="text-sm font-medium text-on-surface-variant">
          {pasado
            ? "Horario libre seleccionado:"
            : "El formulario de reserva se abre con el profesor, la fecha y el horario ya cargados:"}
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
              Horario libre
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
