"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmarDialog } from "@/components/ui/ConfirmarDialog";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { ResumenReserva, type DatoReserva } from "@/components/turnos/ResumenReserva";
import type { MotivoCancelacionResponse } from "@/contracts/catalogo";
import { mensajeDeError } from "@/lib/api-client";
import { formatearFecha } from "@/funciones/formato";
import { cancelarTurno, listarMotivosCancelacion, type TurnoResponse } from "@/data/turnos";

// Cancelación de turno con motivo (HU-TUR-02).
// El modal exige un motivo activo (y detalle si el motivo lo pide), avisa la
// regla de cancelación tardía (< 24 h) y confirma la acción destructiva en un
// segundo paso (ConfirmarDialog `danger`): el botón rojo no cancela directo,
// pide confirmación (Regla Pet Bliss). El back (acá el fixture en data/turnos)
// revalida pago/estado/vencimiento y calcula `cancelacionTardia`.
//
// El contenido se remonta con `key={turno.id}` para resetear el formulario al
// cambiar de turno sin setState en effect (la regla de lint lo prohíbe).

interface CancelarTurnoModalProps {
  turno: TurnoResponse | null;
  open: boolean;
  onClose: () => void;
  /** El turno que devolvió cancelarTurno (ya en estado Cancelado). */
  onCancelado: (turno: TurnoResponse) => void;
}

export function CancelarTurnoModal({ turno, open, onClose, onCancelado }: CancelarTurnoModalProps) {
  if (!turno) return null;
  return (
    <CancelarTurnoContenido key={turno.id} turno={turno} open={open} onClose={onClose} onCancelado={onCancelado} />
  );
}

interface ContenidoProps {
  turno: TurnoResponse;
  open: boolean;
  onClose: () => void;
  onCancelado: (turno: TurnoResponse) => void;
}

function CancelarTurnoContenido({ turno, open, onClose, onCancelado }: ContenidoProps) {
  const [motivos, setMotivos] = useState<MotivoCancelacionResponse[] | null>(null);
  const [motivoId, setMotivoId] = useState("");
  const [detalle, setDetalle] = useState("");
  const [errorMotivo, setErrorMotivo] = useState<string | undefined>(undefined);
  const [errorDetalle, setErrorDetalle] = useState<string | undefined>(undefined);
  const [errorGlobal, setErrorGlobal] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [confirmarOpen, setConfirmarOpen] = useState(false);

  // BACKEND: GET /api/motivos-cancelacion?soloActivos=true
  useEffect(() => {
    if (!open) return;
    let cancelado = false;
    listarMotivosCancelacion()
      .then((lista) => {
        if (!cancelado) setMotivos(lista);
      })
      .catch(() => {
        if (!cancelado) setMotivos([]);
      });
    return () => {
      cancelado = true;
    };
  }, [open]);

  const datos: DatoReserva[] = [
    { label: "Alumno", valor: `${turno.alumno.apellido}, ${turno.alumno.nombre}`, icon: "person" },
    { label: "Materia", valor: turno.materia.nombre, icon: "school" },
    { label: "Día", valor: formatearFecha(turno.fecha), icon: "calendar_month" },
    { label: "Horario", valor: `${turno.horaInicio} – ${turno.horaFin}`, icon: "schedule" },
  ];

  const motivo = motivos?.find((m) => String(m.id) === motivoId) ?? null;

  const pedirConfirmacion = () => {
    const errMotivo = motivo ? undefined : "Elegí el motivo de la cancelación.";
    const errDetalle =
      motivo && motivo.requiereDetalle && detalle.trim() === "" ? "Este motivo requiere un detalle." : undefined;
    setErrorMotivo(errMotivo);
    setErrorDetalle(errDetalle);
    if (errMotivo || errDetalle) return;
    setConfirmarOpen(true);
  };

  const ejecutar = async () => {
    setConfirmando(true);
    setErrorGlobal(null);
    try {
      const actualizado = await cancelarTurno(turno.id, {
        motivoCancelacionId: Number(motivoId),
        detalleCancelacion: detalle.trim() === "" ? null : detalle.trim(),
      });
      setConfirmarOpen(false);
      onCancelado(actualizado);
      onClose();
    } catch (e) {
      setConfirmarOpen(false);
      setErrorGlobal(mensajeDeError(e));
    } finally {
      setConfirmando(false);
    }
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={`Cancelar turno ${turno.codigo}`}
        icon={<Icon name="event_busy" size={22} className="text-error" />}
        subtitle={`${turno.alumno.apellido}, ${turno.alumno.nombre} · ${turno.materia.nombre}`}
        maxWidth="max-w-md"
      >
        <div className="flex flex-col gap-5">
          <div className="rounded-sm border border-outline-variant bg-surface-container-low p-4">
            <ResumenReserva datos={datos} variante="grid" />
          </div>

          {!motivos ? (
            <p className="text-sm font-medium text-on-surface-variant">Cargando motivos…</p>
          ) : motivos.length === 0 ? (
            <p role="alert" className="text-sm font-semibold text-error">
              No pudimos cargar los motivos de cancelación.
            </p>
          ) : (
            <div className="flex flex-col gap-5">
              <Select
                id="motivo-cancelacion"
                label="Motivo"
                requiredMark
                value={motivoId}
                error={errorMotivo}
                onChange={(e) => {
                  setMotivoId(e.target.value);
                  setErrorMotivo(undefined);
                  setErrorDetalle(undefined);
                }}
              >
                <option value="">Seleccioná un motivo…</option>
                {motivos.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                  </option>
                ))}
              </Select>

              {motivo?.requiereDetalle && (
                <Textarea
                  id="detalle-cancelacion"
                  label="Detalle"
                  requiredMark
                  maxLength={200}
                  hint={`${motivo.nombre} requiere explicar el motivo.`}
                  value={detalle}
                  error={errorDetalle}
                  onChange={(e) => {
                    setDetalle(e.target.value);
                    setErrorDetalle(undefined);
                  }}
                />
              )}

              <p className="flex items-start gap-1.5 text-xs font-medium text-on-surface-variant">
                <Icon name="info" size={14} className="mt-0.5 shrink-0 text-status-info-strong" />
                Si faltan menos de 24 horas para la clase, la cancelación se marca como
                tardía en el historial.
              </p>

              {errorGlobal && (
                <p role="alert" className="rounded-sm border border-error/40 bg-error/5 px-3 py-2 text-sm font-semibold text-error">
                  {errorGlobal}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 border-t border-outline-variant pt-4">
                <Button type="button" variant="outline" onClick={onClose} disabled={confirmando}>
                  Volver
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={pedirConfirmacion}
                  disabled={confirmando}
                >
                  <Icon name="event_busy" size={16} />
                  Cancelar turno
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      <ConfirmarDialog
        open={confirmarOpen}
        tone="danger"
        title={`Confirmar cancelación ${turno.codigo}`}
        description="Esta acción no se puede deshacer."
        confirmLabel="Sí, cancelar turno"
        cancelLabel="Volver"
        confirmando={confirmando}
        confirmandoLabel="Cancelando…"
        onClose={() => {
          if (!confirmando) setConfirmarOpen(false);
        }}
        onConfirm={ejecutar}
      >
        <ul className="mt-3 flex flex-col gap-1.5 rounded-sm bg-surface-container px-3 py-2 text-sm">
          {motivo && (
            <li className="flex gap-1.5">
              <span className="font-bold text-on-surface">Motivo:</span>
              <span className="font-medium text-on-surface">{motivo.nombre}</span>
            </li>
          )}
          {detalle.trim() !== "" && (
            <li className="flex gap-1.5">
              <span className="font-bold text-on-surface">Detalle:</span>
              <span className="font-medium text-on-surface">{detalle.trim()}</span>
            </li>
          )}
          <li className="flex items-start gap-1.5 pt-1 text-xs font-medium text-on-surface-variant">
            <Icon name="info" size={14} className="mt-0.5 shrink-0 text-status-info-strong" />
            Si faltan menos de 24 horas para la clase, la cancelación se marca como tardía en el historial.
          </li>
        </ul>
      </ConfirmarDialog>
    </>
  );
}