// src/components/asistencia/AttendanceCorrectionModal.tsx
//
// Lógica y Modal de Corrección de Registro de Asistencia (HU-ASI-01).
// Regla crítica de 24 horas:
//  - Si < 24 h: Profesor y Gerente editan libremente.
//  - Si > 24 h y NO es Gerente: Registro en modo LECTURA. Notificación: "solo el Gerente puede modificar".
//  - Si > 24 h y SÍ es Gerente: Edición habilitada con campo "Motivo de la corrección" obligatorio (máx 250 chars).

"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Textarea } from "@/components/ui/Textarea";
import { ConfirmarDialog } from "@/components/ui/ConfirmarDialog";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { ClaseDelDiaResponse } from "@/contracts/asistencia";
import {
  evaluarPlazoCorreccion,
  formatearFechaHoraRegistro,
} from "@/funciones/asistencia-reglas";

interface AttendanceCorrectionModalProps {
  open: boolean;
  clase: ClaseDelDiaResponse | null;
  rolUsuario?: string;
  tiempoSimulado?: Date;
  onClose: () => void;
  onConfirmCorrection: (data: {
    asistenciaId: number;
    presente: boolean;
    temaTrabajado?: string | null;
    observaciones?: string | null;
    motivoCorreccion?: string | null;
  }) => Promise<void>;
  onNotificarSoloGerente?: () => void;
}

export function AttendanceCorrectionModal({
  open,
  clase,
  rolUsuario = "Profesor",
  tiempoSimulado,
  onClose,
  onConfirmCorrection,
  onNotificarSoloGerente,
}: AttendanceCorrectionModalProps) {
  const asistencia = clase?.asistencia ?? null;

  // Evaluar regla de 24h
  const evaluacion = evaluarPlazoCorreccion(
    asistencia,
    rolUsuario,
    tiempoSimulado ?? new Date(),
  );

  const [presente, setPresente] = useState(asistencia?.presente ?? true);
  const [temaTrabajado, setTemaTrabajado] = useState(asistencia?.temaTrabajado ?? "");
  const [observaciones, setObservaciones] = useState(asistencia?.observaciones ?? "");
  const [motivoCorreccion, setMotivoCorreccion] = useState("");
  const [errorTema, setErrorTema] = useState<string | null>(null);
  const [errorMotivo, setErrorMotivo] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [guardando, setGuardando] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  // Inicializar estado cuando se abre el modal
  useEffect(() => {
    if (open && asistencia) {
      setPresente(asistencia.presente);
      setTemaTrabajado(asistencia.temaTrabajado ?? "");
      setObservaciones(asistencia.observaciones ?? "");
      setMotivoCorreccion(asistencia.motivoCorreccion ?? "");
      setErrorTema(null);
      setErrorMotivo(null);
      setShowConfirm(false);

      // Si pasaron más de 24 horas y no es gerente, disparar notificación
      if (evaluacion.pasaronMasDe24hs && rolUsuario !== "Gerente") {
        onNotificarSoloGerente?.();
      }
    }
  }, [open, asistencia, evaluacion.pasaronMasDe24hs, rolUsuario, onNotificarSoloGerente]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!clase || !asistencia) return null;

  const esModoLectura = !evaluacion.puedeCorregir;

  const handleIntentarGuardar = (e: React.FormEvent) => {
    e.preventDefault();
    if (esModoLectura) return;

    let hasError = false;

    if (presente) {
      const temaTrim = temaTrabajado.trim();
      if (!temaTrim) {
        setErrorTema("El tema trabajado es obligatorio cuando el alumno estuvo presente.");
        hasError = true;
      } else if (temaTrim.length > 250) {
        setErrorTema("El tema trabajado no puede superar los 250 caracteres.");
        hasError = true;
      } else {
        setErrorTema(null);
      }
    } else {
      setErrorTema(null);
    }

    if (evaluacion.requiereMotivo) {
      const motivoTrim = motivoCorreccion.trim();
      if (!motivoTrim) {
        setErrorMotivo("Debe indicar el motivo de la corrección fuera del plazo de 24 horas.");
        hasError = true;
      } else if (motivoTrim.length > 250) {
        setErrorMotivo("El motivo no puede superar los 250 caracteres.");
        hasError = true;
      } else {
        setErrorMotivo(null);
      }
    }

    if (hasError) return;

    setShowConfirm(true);
  };

  const handleConfirmar = async () => {
    setGuardando(true);
    try {
      await onConfirmCorrection({
        asistenciaId: asistencia.id,
        presente,
        temaTrabajado: presente ? temaTrabajado.trim() : null,
        observaciones: observaciones.trim() || null,
        motivoCorreccion: evaluacion.requiereMotivo ? motivoCorreccion.trim() : null,
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
        title={esModoLectura ? "Ver Registro de Asistencia" : "Corregir Asistencia"}
        maxWidth="max-w-lg"
        icon={
          <Icon
            name={esModoLectura ? "visibility" : "edit_calendar"}
            size={24}
            className={esModoLectura ? "text-on-surface-variant" : "text-secondary"}
          />
        }
        titleExtra={
          <div className="flex items-center gap-1.5">
            <StatusBadge
              variant={presente ? "success" : "warning"}
              label={presente ? "Asistió" : "Ausente"}
              icon={presente ? "check_circle" : "cancel"}
            />
            {esModoLectura && (
              <span className="inline-flex items-center rounded-sm bg-surface-container-high px-2 py-0.5 text-xs font-bold text-on-surface-variant">
                Modo LECTURA
              </span>
            )}
          </div>
        }
        subtitle={`Turno ${clase.codigo} · ${clase.fecha} (${clase.horaInicio} - ${clase.horaFin})`}
      >
        <form onSubmit={handleIntentarGuardar} className="space-y-4">
          {/* Banner de regla de 24h cuando venció el plazo */}
          {evaluacion.pasaronMasDe24hs && (
            <div
              className={`rounded-sm border p-3 text-xs flex items-start gap-2.5 ${
                rolUsuario === "Gerente"
                  ? "border-secondary/40 bg-secondary/10 text-on-surface"
                  : "border-error/40 bg-error/10 text-on-surface"
              }`}
            >
              <Icon
                name={rolUsuario === "Gerente" ? "admin_panel_settings" : "lock_clock"}
                size={20}
                className={rolUsuario === "Gerente" ? "text-secondary shrink-0 mt-0.5" : "text-error shrink-0 mt-0.5"}
              />
              <div>
                <p className="font-bold">
                  {rolUsuario === "Gerente"
                    ? "Corrección fuera de plazo (> 24 hs)"
                    : "Notificación: solo el Gerente puede modificar"}
                </p>
                <p className="mt-0.5 text-on-surface-variant">
                  {rolUsuario === "Gerente"
                    ? "Como Gerente tenés permiso para corregir este registro ingresando un motivo obligatorio de auditoría."
                    : "Han transcurrido más de 24 horas desde que se guardó el registro original. Solo un usuario con rol Gerente puede modificarlo."}
                </p>
              </div>
            </div>
          )}

          {/* Banner para Gerente dentro de las primeras 24hs */}
          {!evaluacion.pasaronMasDe24hs && rolUsuario === "Gerente" && (
            <div className="rounded-sm border border-secondary/40 bg-secondary/10 p-3 text-xs flex items-start gap-2.5 text-on-surface">
              <Icon name="info" size={20} className="text-secondary shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Dentro del plazo de 24 horas</p>
                <p className="mt-0.5 text-on-surface-variant">
                  El registro fue realizado hace menos de 24 horas. Durante este plazo la corrección corresponde al Profesor. El Gerente solo puede modificar registros una vez vencido el plazo de 24 horas, con motivo obligatorio.
                </p>
              </div>
            </div>
          )}

          {/* Banner para Mesa de Entrada (solo lectura) */}
          {rolUsuario === "Mesa de Entrada" && (
            <div className="rounded-sm border border-outline-variant bg-surface-container-low p-3 text-xs flex items-start gap-2.5 text-on-surface">
              <Icon name="visibility" size={20} className="text-secondary shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Acceso en modo LECTURA</p>
                <p className="mt-0.5 text-on-surface-variant">
                  Mesa de Entrada cuenta con permisos de solo lectura para los registros de asistencia.
                </p>
              </div>
            </div>
          )}

          {/* Datos del registro original */}
          <div className="rounded-md border border-outline-variant bg-surface-container-low p-3.5 text-xs text-on-surface">
            <div className="grid grid-cols-2 gap-2 pb-2 mb-2 border-b border-outline-variant/60">
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
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-on-surface-variant">
              <span>
                <strong>Registrado:</strong> {formatearFechaHoraRegistro(asistencia.registradoAt)} por{" "}
                {asistencia.registradoPor.nombre} {asistencia.registradoPor.apellido}
              </span>
              {asistencia.modificadoAt && (
                <span>
                  <strong>Última modif:</strong> {formatearFechaHoraRegistro(asistencia.modificadoAt)}
                </span>
              )}
            </div>
          </div>

          {/* Selector de estado (Presente / Ausente) */}
          <div>
            <label className="block text-xs font-bold text-on-surface mb-1.5">
              Condición de asistencia
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={esModoLectura}
                onClick={() => {
                  setPresente(true);
                  setErrorTema(null);
                }}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-sm border text-xs font-bold transition-colors cursor-pointer ${
                  presente
                    ? "border-status-success-strong bg-status-success/15 text-on-surface ring-2 ring-status-success-strong/30"
                    : "border-outline-variant bg-surface-container hover:bg-surface-container-high text-on-surface-variant"
                } ${esModoLectura ? "cursor-not-allowed opacity-80" : ""}`}
              >
                <Icon
                  name="check_circle"
                  size={18}
                  className={presente ? "text-status-success-strong" : "text-on-surface-variant"}
                />
                Presente (Asistió)
              </button>

              <button
                type="button"
                disabled={esModoLectura}
                onClick={() => {
                  setPresente(false);
                  setErrorTema(null);
                }}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-sm border text-xs font-bold transition-colors cursor-pointer ${
                  !presente
                    ? "border-status-warning-strong bg-status-warning/15 text-on-surface ring-2 ring-status-warning-strong/30"
                    : "border-outline-variant bg-surface-container hover:bg-surface-container-high text-on-surface-variant"
                } ${esModoLectura ? "cursor-not-allowed opacity-80" : ""}`}
              >
                <Icon
                  name="person_off"
                  size={18}
                  className={!presente ? "text-status-warning-strong" : "text-on-surface-variant"}
                />
                Ausente
              </button>
            </div>
          </div>

          {/* Campo Tema trabajado (solo si presente) */}
          {presente && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="corregir-tema"
                  className="text-xs font-bold text-on-surface flex items-center gap-1"
                >
                  Tema trabajado {!esModoLectura && <span className="text-error font-bold">*</span>}
                </label>
                {!esModoLectura && (
                  <span
                    className={`text-[11px] ${
                      temaTrabajado.length > 250
                        ? "text-error font-bold"
                        : "text-on-surface-variant"
                    }`}
                  >
                    {temaTrabajado.length} / 250
                  </span>
                )}
              </div>
              <Textarea
                id="corregir-tema"
                rows={3}
                value={temaTrabajado}
                maxLength={250}
                disabled={esModoLectura}
                placeholder="Contenidos dictados o ejercitación trabajada..."
                onChange={(e) => {
                  setTemaTrabajado(e.target.value);
                  if (errorTema && e.target.value.trim()) setErrorTema(null);
                }}
                error={errorTema || undefined}
                required={!esModoLectura}
              />
            </div>
          )}

          {/* Campo Observaciones */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="corregir-observaciones"
                className="text-xs font-bold text-on-surface-variant"
              >
                Observaciones {esModoLectura ? "" : "(opcional)"}
              </label>
              {!esModoLectura && (
                <span
                  className={`text-[11px] ${
                    observaciones.length > 500
                      ? "text-error font-bold"
                      : "text-on-surface-variant"
                  }`}
                >
                  {observaciones.length} / 500
                </span>
              )}
            </div>
            <Textarea
              id="corregir-observaciones"
              rows={2}
              value={observaciones}
              maxLength={500}
              disabled={esModoLectura}
              placeholder="Notas u observaciones sobre la clase..."
              onChange={(e) => setObservaciones(e.target.value)}
            />
          </div>

          {/* Campo Motivo de la corrección (OBLIGATORIO para Gerente pasadas las 24 horas) */}
          {evaluacion.requiereMotivo && (
            <div className="rounded-md border border-secondary/30 bg-surface-container-low p-3 space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="motivo-correccion"
                  className="text-xs font-bold text-secondary flex items-center gap-1.5"
                >
                  <Icon name="history_edu" size={16} />
                  Motivo de la corrección <span className="text-error font-bold">*</span>
                </label>
                <span
                  className={`text-[11px] ${
                    motivoCorreccion.length > 250
                      ? "text-error font-bold"
                      : "text-on-surface-variant"
                  }`}
                >
                  {motivoCorreccion.length} / 250
                </span>
              </div>
              <p className="text-[11px] text-on-surface-variant">
                Al corregir pasadas las 24 horas, la auditoría exige justificar el motivo del cambio.
              </p>
              <Textarea
                id="motivo-correccion"
                rows={2}
                value={motivoCorreccion}
                maxLength={250}
                placeholder="Explicá por qué se realiza esta modificación fuera de término..."
                onChange={(e) => {
                  setMotivoCorreccion(e.target.value);
                  if (errorMotivo && e.target.value.trim()) setErrorMotivo(null);
                }}
                error={errorMotivo || undefined}
                required
              />
            </div>
          )}

          {/* Si ya tenía un motivo de corrección previo, mostrarlo */}
          {asistencia.motivoCorreccion && !evaluacion.requiereMotivo && (
            <div className="rounded-sm bg-surface-container-high p-2.5 text-xs text-on-surface-variant">
              <strong>Motivo de corrección anterior:</strong> {asistencia.motivoCorreccion}
            </div>
          )}

          {/* Footer de acciones */}
          <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-outline-variant">
            <Button variant="ghost" type="button" onClick={onClose} disabled={guardando}>
              {esModoLectura ? "Cerrar" : "Cancelar"}
            </Button>
            {!esModoLectura && (
              <Button
                variant="primary"
                type="submit"
                disabled={
                  guardando ||
                  (presente && !temaTrabajado.trim()) ||
                  (evaluacion.requiereMotivo && !motivoCorreccion.trim())
                }
              >
                <Icon name="save" size={18} />
                Guardar corrección
              </Button>
            )}
          </div>
        </form>
      </Modal>

      {/* Ventana de confirmación previa a guardar */}
      <ConfirmarDialog
        open={showConfirm}
        tone="neutral"
        title="Confirmar Modificación de Asistencia"
        description={`¿Deseas guardar los cambios en la asistencia de ${clase.alumno.nombre} ${clase.alumno.apellido}? El estado pasará a "${presente ? "Asistió" : "Ausente"}".`}
        confirmLabel="Confirmar y Guardar"
        cancelLabel="Volver a revisar"
        confirmando={guardando}
        confirmandoLabel="Guardando cambios..."
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmar}
      />
    </>
  );
}
