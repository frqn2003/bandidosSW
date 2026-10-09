// src/components/alumnos/DeactivateStudentModal.tsx
//
// Modal de Baja Lógica de Alumno con Reglas de Negocio (HU-ALU-02).
// Utiliza el componente estándar Modal del Design System.

"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import type { StudentUI, TurnoFuturoResumen } from "@/modules/alumnos/types";

interface DeactivateStudentModalProps {
  open: boolean;
  student: StudentUI | null;
  onClose: () => void;
  onConfirm: (studentId: number, options?: { confirmarConDeuda?: boolean }) => Promise<void>;
  onNavigateToCancelTurns?: (student: StudentUI, turno?: TurnoFuturoResumen) => void;
}

export function DeactivateStudentModal({
  open,
  student,
  onClose,
  onConfirm,
  onNavigateToCancelTurns,
}: DeactivateStudentModalProps) {
  const [submitting, setSubmitting] = useState(false);

  if (!student) return null;

  const futureTurns = student.futureTurnsCount ?? 0;
  const hasDebt = Boolean(student.hasPendingDebt || student.deudaPendiente);
  const isBlocked = futureTurns > 0;

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm(student.id, { confirmarConDeuda: hasDebt });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        isBlocked
          ? `No se puede dar de baja a ${student.nombre} ${student.apellido}`
          : `Dar de baja a ${student.nombre} ${student.apellido}`
      }
      subtitle={
        isBlocked
          ? undefined
          : "La baja es lógica: se conserva todo su historial de turnos, asistencias y pagos. No aparecerá en combos ni buscadores de otros módulos."
      }
      icon={
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${isBlocked ? "bg-error/15 text-error" : "bg-error/10 text-error"
            }`}
        >
          <Icon name={isBlocked ? "block" : "person_remove"} size={24} />
        </span>
      }
      footer={
        isBlocked ? (
          <div className="flex w-full items-center justify-end gap-3">
            <Button variant="outline" type="button" onClick={onClose}>
              Cerrar
            </Button>
            <Button
              variant="primary"
              type="button"
              onClick={() => {
                onClose();
                onNavigateToCancelTurns?.(student);
              }}
            >
              <Icon name="event_busy" size={18} />
              Ir a cancelar turnos
            </Button>
          </div>
        ) : (
          <div className="flex w-full items-center justify-end gap-3">
            <Button variant="outline" type="button" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              type="button"
              onClick={handleConfirm}
              disabled={submitting}
            >
              <Icon name="person_remove" size={18} />
              {submitting ? "Confirmando..." : "Confirmar baja"}
            </Button>
          </div>
        )
      }
    >
      <div className="space-y-4">
        {/* Resumen del Alumno */}
        <div className="grid grid-cols-3 gap-2 rounded-md bg-surface-container-low p-3 text-center border border-outline-variant">
          <div>
            <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block">
              Legajo
            </span>
            <span className="font-mono font-bold text-sm text-on-surface">
              {student.legajo}
            </span>
          </div>
          <div>
            <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block">
              DNI
            </span>
            <span className="font-mono font-bold text-sm text-on-surface">{student.dni}</span>
          </div>
          <div>
            <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block">
              Turnos futuros
            </span>
            <span
              className={`font-mono font-bold text-sm ${futureTurns > 0 ? "text-error" : "text-on-surface"
                }`}
            >
              {futureTurns}
            </span>
          </div>
        </div>

        {/* CASO A: BLOQUEO POR TURNOS FUTUROS */}
        {isBlocked ? (
          <div className="space-y-4">
            <div className="rounded-md border border-error/30 bg-error/5 p-3 text-sm text-on-surface">
              <p>
                Tiene{" "}
                <strong className="font-bold text-error">{futureTurns} turnos futuros</strong> en
                estado Reservado. Cancelalos antes de continuar con la baja.
              </p>
            </div>

            {student.turnosFuturos && student.turnosFuturos.length > 0 && (
              <div className="rounded-md border border-outline-variant bg-surface-container-low p-2 divide-y divide-outline-variant/60">
                {student.turnosFuturos.map((turno) => (
                  <div
                    key={turno.id}
                    className="flex items-center justify-between py-2.5 px-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-on-surface">{turno.id}</span>
                      <span className="text-on-surface-variant font-medium">
                        {turno.fechaHora} · {turno.materia}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-sm bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                        {turno.estado}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onNavigateToCancelTurns?.(student, turno);
                        }}
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-error hover:bg-error/10 transition-colors"
                        title={`Ir a cancelar ${turno.id}`}
                      >
                        <Icon name="cancel" size={14} />
                        Cancelar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* CASO B: Alerta de Deuda Pendiente */
          hasDebt && (
            <div className="rounded-md border border-status-warning/40 bg-status-warning/10 p-3.5 text-on-surface">
              <div className="flex items-start gap-2.5">
                <Icon
                  name="warning"
                  size={20}
                  className="text-status-warning-strong shrink-0 mt-0.5"
                />
                <div>
                  <h4 className="text-xs font-bold text-on-surface">Tiene deuda pendiente</h4>
                  <p className="mt-0.5 text-xs text-on-surface-variant font-medium leading-relaxed">
                    {student.detalleDeuda?.descripcion ||
                      "Registra clases impagas. Podés continuar con la baja; la deuda queda registrada."}
                  </p>
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </Modal>
  );
}
