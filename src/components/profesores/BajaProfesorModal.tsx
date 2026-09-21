"use client";

import { useState } from "react";
import type { Profesor } from "@/data/profesores";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";

const MOTIVOS_BAJA = [
  "Renuncia",
  "Jubilación",
  "Baja de la institución",
  "Vencimiento de contrato",
  "Otro",
];

interface BajaProfesorModalProps {
  profesor: Profesor | null;
  turnosFuturos: number;
  open: boolean;
  onClose: () => void;
  onConfirmar: (motivo: string, observaciones: string) => void;
}

/**
 * Baja lógica de profesor (HU-PRO-01): estado → "inactivo".
 * Si hay turnos futuros `Reservado` (turno.fecha >= hoy) la baja queda
 * BLOQUEADA y el botón de confirmar se deshabilita. BACKEND: PATCH
 * /api/profesores/:id { "estado": "inactivo", "motivo_baja", "observaciones" }
 * (auditoría vía trigger sobre profesor).
 */
export function BajaProfesorModal({
  profesor,
  turnosFuturos,
  open,
  onClose,
  onConfirmar,
}: BajaProfesorModalProps) {
  const [motivo, setMotivo] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [envio, setEnvio] = useState(false);

  // Se reinician los campos al abrir (mismo modal reutilizado).
  const [initialized, setInitialized] = useState(false);
  if (open && !initialized) {
    setMotivo("");
    setObservaciones("");
    setEnvio(false);
    setInitialized(true);
  }
  if (!open && initialized) setInitialized(false);

  if (!profesor) return null;

  const bloqueada = turnosFuturos > 0;
  const errorMotivo =
    envio && motivo === "" ? "Seleccioná el motivo de la desactivación" : undefined;

  const confirmar = () => {
    setEnvio(true);
    if (bloqueada || motivo === "") return;
    onConfirmar(motivo, observaciones.trim());
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Confirmar Baja de Profesor"
      icon={<Icon name="warning" size={22} className="text-error" />}
      maxWidth="max-w-lg"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" variant="destructive" disabled={bloqueada} onClick={confirmar}>
            <Icon name={bloqueada ? "lock" : "check"} size={16} />
            {bloqueada
              ? `Tiene ${turnosFuturos} turnos futuros reservados — resuélvalos antes de dar de baja`
              : "Confirmar Desactivación"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm font-medium text-on-surface">
          Está a punto de desactivar al docente{" "}
          <span className="font-bold">
            {profesor.nombre} {profesor.apellido}
          </span>
          .
        </p>

        <div className="flex items-start gap-3 rounded-sm border border-status-warning/40 bg-status-warning/10 px-4 py-3">
          <Icon name="info" size={18} className="mt-0.5 shrink-0 text-status-warning-strong" />
          <div className="flex flex-col gap-1.5 text-xs font-medium text-on-surface">
            <p className="font-bold text-status-warning-strong">Condiciones de la operación</p>
            <p>
              La baja es LÓGICA: se conserva íntegro el historial de clases, asistencias y
              bitácora de auditoría.
            </p>
            <p className={bloqueada ? "font-bold text-status-warning-strong" : ""}>
              Validación de turnos futuros:{" "}
              {bloqueada
                ? `${turnosFuturos} ${turnosFuturos === 1 ? "turno activo pendiente" : "turnos activos pendientes"} en la agenda.`
                : "No registra turnos activos pendientes en la agenda."}
            </p>
            <p>
              El docente no podrá ser seleccionado para nuevas reservas ni asignaciones horarias.
            </p>
          </div>
        </div>

        {/* BACKEND: profesor.estado + motivo de auditoría en PATCH /api/profesores/:id */}
        <Select
          id="motivo-baja"
          label="Motivo de la desactivación"
          requiredMark
          error={errorMotivo}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
        >
          <option value="">Seleccionar motivo…</option>
          {MOTIVOS_BAJA.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </Select>

        <Textarea
          id="observaciones-baja"
          label="Observaciones de auditoría"
          placeholder="Detalle administrativo..."
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
        />
      </div>
    </Modal>
  );
}