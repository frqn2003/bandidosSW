// src/components/calendario/ReprogramarModal.tsx
//
// Diálogo de confirmación para reprogramar un turno luego de una acción de Drag & Drop (HU-CAL-02).
// Muestra con claridad la comparación "Antes" vs "Después" de Fecha, Horario y Profesor asignado.

"use client";

import React, { useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import type { ReprogramarTurnoData } from "./types";

interface ReprogramarModalProps {
  datos: ReprogramarTurnoData | null;
  onConfirmar: () => void;
  onCancelar: () => void;
}

export function ReprogramarModal({
  datos,
  onConfirmar,
  onCancelar,
}: ReprogramarModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const confirmarBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!datos) return;
    confirmarBtnRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancelar();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [datos, onCancelar]);

  if (!datos) return null;

  const {
    turno,
    fechaNueva,
    horaInicioNueva,
    horaFinNueva,
    profesorNuevo,
    fechaAnterior,
    horaInicioAnterior,
    profesorAnterior,
  } = datos;

  const formatearFecha = (f: string) => {
    try {
      const [y, m, d] = f.split("-").map(Number);
      return new Date(y, m - 1, d).toLocaleDateString("es-AR", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });
    } catch {
      return f;
    }
  };

  const hayCambioFecha = fechaAnterior !== fechaNueva;
  const hayCambioHora = horaInicioAnterior !== horaInicioNueva;
  const hayCambioProfesor = profesorAnterior.id !== profesorNuevo.id;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-reprogramar"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        ref={modalRef}
        className="w-full max-w-lg rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xl animate-in zoom-in-95 duration-150"
      >
        {/* Cabecera */}
        <div className="flex items-center gap-3 border-b border-outline-variant/60 pb-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
            <Icon name="event_repeat" size={24} />
          </div>
          <div>
            <h2 id="titulo-reprogramar" className="text-lg font-bold text-on-surface">
              Confirmar Reprogramación de Turno
            </h2>
            <p className="text-xs font-semibold text-on-surface-variant">
              Turno {turno.codigo} · {turno.alumno.apellido}, {turno.alumno.nombre} ({turno.materia.nombre})
            </p>
          </div>
        </div>

        {/* Comparación Antes vs Después */}
        <div className="my-5 flex flex-col gap-3">
          <p className="text-xs font-medium text-on-surface-variant">
            Se actualizarán los siguientes datos del turno. Verifique los cambios antes de confirmar:
          </p>

          <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-low">
            <div className="grid grid-cols-2 divide-x divide-outline-variant/60 border-b border-outline-variant/60 bg-surface-container-high/60 px-4 py-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              <div>Estado Anterior</div>
              <div className="pl-3 text-secondary">Nueva Asignación</div>
            </div>

            {/* Fecha */}
            <div className="grid grid-cols-2 divide-x divide-outline-variant/60 p-3 text-sm">
              <div className="flex flex-col">
                <span className="text-[11px] font-bold uppercase text-on-surface-variant">Fecha</span>
                <span className={`font-semibold ${hayCambioFecha ? "line-through text-on-surface-variant/70" : "text-on-surface"}`}>
                  {formatearFecha(fechaAnterior)}
                </span>
              </div>
              <div className="flex flex-col pl-3">
                <span className="text-[11px] font-bold uppercase text-secondary">Nueva Fecha</span>
                <span className={`font-bold ${hayCambioFecha ? "text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded w-fit" : "text-on-surface"}`}>
                  {formatearFecha(fechaNueva)}
                </span>
              </div>
            </div>

            {/* Horario */}
            <div className="grid grid-cols-2 divide-x divide-outline-variant/60 border-t border-outline-variant/40 p-3 text-sm">
              <div className="flex flex-col">
                <span className="text-[11px] font-bold uppercase text-on-surface-variant">Horario</span>
                <span className={`font-semibold ${hayCambioHora ? "line-through text-on-surface-variant/70" : "text-on-surface"}`}>
                  {horaInicioAnterior} – {turno.horaFin}
                </span>
              </div>
              <div className="flex flex-col pl-3">
                <span className="text-[11px] font-bold uppercase text-secondary">Nuevo Horario</span>
                <span className={`font-bold ${hayCambioHora ? "text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded w-fit" : "text-on-surface"}`}>
                  {horaInicioNueva} – {horaFinNueva}
                </span>
              </div>
            </div>

            {/* Profesor */}
            <div className="grid grid-cols-2 divide-x divide-outline-variant/60 border-t border-outline-variant/40 p-3 text-sm">
              <div className="flex flex-col">
                <span className="text-[11px] font-bold uppercase text-on-surface-variant">Profesor</span>
                <span className={`font-semibold ${hayCambioProfesor ? "line-through text-on-surface-variant/70" : "text-on-surface"}`}>
                  {profesorAnterior.apellido}, {profesorAnterior.nombre}
                </span>
              </div>
              <div className="flex flex-col pl-3">
                <span className="text-[11px] font-bold uppercase text-secondary">Nuevo Profesor</span>
                <span className={`font-bold ${hayCambioProfesor ? "text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded w-fit" : "text-on-surface"}`}>
                  {profesorNuevo.apellido}, {profesorNuevo.nombre}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-surface-container p-2.5 text-xs text-on-surface-variant">
            <Icon name="info" size={16} />
            <span>
              La cantidad de modificaciones del turno aumentará a{" "}
              <strong>{(turno.cantidadModificaciones ?? 0) + 1}</strong>.
            </span>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            variant="ghost"
            size="md"
            type="button"
            onClick={onCancelar}
            className="font-bold text-on-surface-variant hover:text-on-surface"
          >
            Cancelar
          </Button>
          <Button
            ref={confirmarBtnRef}
            variant="primary"
            size="md"
            type="button"
            onClick={onConfirmar}
            className="gap-1.5 font-bold shadow-sm"
          >
            <Icon name="check" size={18} />
            Confirmar reprogramación
          </Button>
        </div>
      </div>
    </div>
  );
}
