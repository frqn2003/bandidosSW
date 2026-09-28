"use client";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { BarraModificaciones } from "@/components/turnos/BarraModificaciones";
import { EstadoTurnoBadge } from "@/components/turnos/EstadoTurnoBadge";
import { ResumenReserva, type DatoReserva } from "@/components/turnos/ResumenReserva";
import { estadoVisibleDe } from "@/funciones/estado-turno";
import { formatearFecha } from "@/funciones/formato";
import { formatearValor } from "@/data/materias";
import type { TurnoResponse } from "@/data/turnos";

// Ficha de lectura de un turno (HU-TUR-02) — la abre la acción "Ver".
// Muestra todo lo que la base conoce sobre el turno, incluido el historial de
// modificaciones (contador) y, si está cancelado, el motivo + detalle + la
// marca de cancelación tardía.

interface DetalleTurnoModalProps {
  turno: TurnoResponse | null;
  open: boolean;
  onClose: () => void;
  maxModificaciones: number;
}

export function DetalleTurnoModal({ turno, open, onClose, maxModificaciones }: DetalleTurnoModalProps) {
  if (!turno) return null;

  const datos: DatoReserva[] = [
    { label: "Alumno", valor: `${turno.alumno.apellido}, ${turno.alumno.nombre} (legajo ${turno.alumno.legajo})`, icon: "person" },
    { label: "Materia", valor: `${turno.materia.nombre} · ${turno.materia.nivel}`, icon: "school" },
    { label: "Profesor", valor: `${turno.profesor.apellido}, ${turno.profesor.nombre}`, icon: "badge" },
    { label: "Fecha", valor: formatearFecha(turno.fecha), icon: "calendar_month" },
    { label: "Horario", valor: `${turno.horaInicio} – ${turno.horaFin}`, icon: "schedule" },
    {
      label: "Valor de la clase",
      valor: formatearValor(turno.valorClaseCongelado),
      icon: "payments",
    },
  ];

  if (turno.observaciones) {
    datos.push({ label: "Observaciones", valor: turno.observaciones, icon: "notes", ancho: true });
  }
  if (turno.motivoCancelacion) {
    datos.push({
      label: "Cancelación",
      valor: `${turno.motivoCancelacion.nombre}${turno.cancelacionTardia ? " · cancelación tardía" : ""}`,
      icon: "event_busy",
    });
  }
  if (turno.detalleCancelacion) {
    datos.push({ label: "Detalle de la cancelación", valor: turno.detalleCancelacion, icon: "notes", ancho: true });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Turno ${turno.codigo}`}
      icon={<Icon name="event_note" size={22} className="text-primary" />}
      titleExtra={<EstadoTurnoBadge estado={estadoVisibleDe(turno)} />}
      subtitle={`Registrado por ${turno.registradoPor.nombre} ${turno.registradoPor.apellido} el ${formatearFecha(turno.fechaCreacion)}`}
      maxWidth="max-w-2xl"
      footer={
        <Button type="button" variant="outline" onClick={onClose}>
          Cerrar
        </Button>
      }
    >
      <div className="flex flex-col gap-5">
        <ResumenReserva datos={datos} variante="grid" />

        <div className="border-t border-outline-variant pt-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
              Historial de modificaciones
            </p>
            <span className="text-xs font-semibold text-on-surface-variant">
              Modificado {turno.cantidadModificaciones} {turno.cantidadModificaciones === 1 ? "vez" : "veces"}
            </span>
          </div>
          {/* Mismo componente que en EditarTurnoModal: el contador y la barra
              salen de la misma fuente, así que acá no se duplica el "1/2". */}
          <BarraModificaciones
            cantidad={turno.cantidadModificaciones}
            maxModificaciones={maxModificaciones}
          />
        </div>
      </div>
    </Modal>
  );
}