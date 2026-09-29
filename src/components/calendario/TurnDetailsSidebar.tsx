// src/components/calendario/TurnDetailsSidebar.tsx
//
// Panel lateral derecho con el detalle del turno en modo lectura (HU-CAL-02).
// Muestra código, estado, cantidad de modificaciones, alumno, materia, profesor, fecha, horario y observaciones.
// Si el rol es Profesor, las acciones de modificación y cancelación se ocultan.

"use client";

import React, { useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import type { TurnoCalendario } from "./types";

interface TurnDetailsSidebarProps {
  turno: TurnoCalendario;
  onClose: () => void;
  onModificar?: (turno: TurnoCalendario) => void;
  onCancelar?: (turno: TurnoCalendario) => void;
  esProfesor?: boolean;
}

export function TurnDetailsSidebar({
  turno,
  onClose,
  onModificar,
  onCancelar,
  esProfesor = false,
}: TurnDetailsSidebarProps) {
  const panelRef = useRef<HTMLElement>(null);
  const cerrarBtnRef = useRef<HTMLButtonElement>(null);

  // Foco al abrir y Escape para cerrar
  useEffect(() => {
    cerrarBtnRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Formato de fecha
  const fechaFormateada = (() => {
    try {
      const [y, m, d] = turno.fecha.split("-").map(Number);
      const dateObj = new Date(y, m - 1, d);
      return dateObj.toLocaleDateString("es-AR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return turno.fecha;
    }
  })();

  const esCancelado = turno.estado === "Cancelado";
  const puedeEditar = !esProfesor && !esCancelado && turno.puedeModificar !== false;
  const puedeCancelar = !esProfesor && !esCancelado && turno.puedeCancelar !== false;

  return (
    <aside
      ref={panelRef}
      role="complementary"
      aria-label={`Detalle del turno ${turno.codigo}`}
      className="flex w-full flex-col gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm print:hidden"
    >
      {/* Header */}
      <header className="flex items-start justify-between gap-3 border-b border-outline-variant/60 pb-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            Detalle del Turno
          </span>
          <h3 className="font-display text-xl font-bold tracking-tight text-on-surface">
            {turno.codigo}
          </h3>
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            {/* Badge de estado */}
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                esCancelado
                  ? "bg-red-100 text-red-800"
                  : "bg-emerald-100 text-emerald-800"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  esCancelado ? "bg-red-600" : "bg-emerald-600"
                }`}
              />
              {turno.estado}
            </span>

            {/* Modificaciones */}
            {(turno.cantidadModificaciones ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                <Icon name="history" size={13} />
                Modificado {turno.cantidadModificaciones}{" "}
                {turno.cantidadModificaciones === 1 ? "vez" : "veces"}
              </span>
            )}
          </div>
        </div>

        <Button
          ref={cerrarBtnRef}
          variant="ghost"
          size="icon"
          type="button"
          onClick={onClose}
          aria-label="Cerrar panel de detalle"
          className="text-on-surface-variant hover:text-on-surface"
        >
          <Icon name="close" size={20} />
        </Button>
      </header>

      {/* Datos en lista de definición */}
      <dl className="grid grid-cols-1 gap-3.5 text-sm sm:grid-cols-2">
        <div className="flex flex-col gap-0.5 sm:col-span-2">
          <dt className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
            Alumno
          </dt>
          <dd className="font-bold text-on-surface text-base">
            {turno.alumno.apellido}, {turno.alumno.nombre}
            {turno.alumno.legajo && (
              <span className="ml-2 text-xs font-semibold text-on-surface-variant">
                (Legajo: {turno.alumno.legajo})
              </span>
            )}
          </dd>
        </div>

        <div className="flex flex-col gap-0.5">
          <dt className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
            Materia
          </dt>
          <dd className="font-semibold text-on-surface flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-primary/70" />
            {turno.materia.nombre}
          </dd>
        </div>

        <div className="flex flex-col gap-0.5">
          <dt className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
            Profesor
          </dt>
          <dd className="font-semibold text-on-surface">
            {turno.profesor.apellido}, {turno.profesor.nombre}
          </dd>
        </div>

        <div className="flex flex-col gap-0.5 sm:col-span-2">
          <dt className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
            Fecha
          </dt>
          <dd className="font-semibold text-on-surface capitalize">
            {fechaFormateada}
          </dd>
        </div>

        <div className="flex flex-col gap-0.5">
          <dt className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
            Horario
          </dt>
          <dd className="font-bold text-primary flex items-center gap-1">
            <Icon name="schedule" size={16} />
            {turno.horaInicio} – {turno.horaFin}
            {turno.esSegundaHora && (
              <span className="ml-1 rounded bg-secondary/10 px-1 py-0.5 text-[10px] font-bold text-secondary">
                2.º hora
              </span>
            )}
          </dd>
        </div>

        <div className="flex flex-col gap-0.5">
          <dt className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
            Duración
          </dt>
          <dd className="font-medium text-on-surface">
            {turno.materia.duracionClaseMinutos ?? 60} minutos
          </dd>
        </div>

        <div className="flex flex-col gap-0.5 sm:col-span-2">
          <dt className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
            Observaciones
          </dt>
          <dd className="rounded-lg bg-surface-container-low p-2.5 text-xs font-medium text-on-surface-variant border border-outline-variant/40">
            {turno.observaciones || "Sin observaciones registradas."}
          </dd>
        </div>
      </dl>

      {/* Footer / Acciones */}
      <footer className="mt-auto flex flex-col gap-2 border-t border-outline-variant/60 pt-3">
        {esProfesor ? (
          <p className="text-xs text-on-surface-variant flex items-center gap-1.5">
            <Icon name="info" size={15} />
            Tu calendario es de solo lectura. Mesa de Entrada gestiona las reservas.
          </p>
        ) : esCancelado ? (
          <p className="text-xs text-red-700 flex items-center gap-1.5">
            <Icon name="cancel" size={15} />
            Este turno se encuentra cancelado.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button
              variant="outline"
              size="md"
              type="button"
              disabled={!puedeEditar}
              className="flex-1 font-bold text-secondary border-secondary/30 hover:bg-secondary/10"
              onClick={() => onModificar?.(turno)}
            >
              <Icon name="edit" size={16} />
              Modificar
            </Button>
            <Button
              variant="outline-danger"
              size="md"
              type="button"
              disabled={!puedeCancelar}
              className="flex-1 font-bold"
              onClick={() => onCancelar?.(turno)}
            >
              <Icon name="cancel" size={16} />
              Cancelar turno
            </Button>
          </div>
        )}
      </footer>
    </aside>
  );
}
