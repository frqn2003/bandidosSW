// src/components/alumnos/historial/TimelineList.tsx
//
// Lista vertical de eventos del Historial (HU-ALU-03).
// Ordenada por fecha y hora descendente.

"use client";

import React, { useMemo } from "react";
import { TimelineItem } from "./TimelineItem";
import type { EventoHistorialResponse } from "@/contracts/historial";
import { Clock, FilterX } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface TimelineListProps {
  eventos: EventoHistorialResponse[];
  puedeVerObservacionesYNotas: boolean;
  cargando?: boolean;
  onLimpiarFiltros?: () => void;
}

export function TimelineList({
  eventos,
  puedeVerObservacionesYNotas,
  cargando = false,
  onLimpiarFiltros,
}: TimelineListProps) {
  // Asegurar ordenamiento descendente por fecha y hora
  const eventosOrdenados = useMemo(() => {
    return [...eventos].sort(
      (a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime()
    );
  }, [eventos]);

  if (cargando) {
    return (
      <div className="space-y-4 py-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4 animate-pulse">
            <div className="h-8 w-8 rounded-full bg-slate-200 shrink-0" />
            <div className="flex-1 space-y-2 rounded-md border border-slate-200 bg-white p-4">
              <div className="h-4 w-1/4 rounded bg-slate-200" />
              <div className="h-3 w-3/4 rounded bg-slate-200" />
              <div className="h-3 w-1/2 rounded bg-slate-200" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (eventosOrdenados.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-outline-variant bg-white p-10 text-center shadow-xs">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
          <Clock className="h-6 w-6" />
        </div>
        <h4 className="text-sm font-bold text-on-surface">
          No se encontraron eventos en el historial
        </h4>
        <p className="mt-1 text-xs text-on-surface-variant max-w-sm mx-auto">
          No hay registros que coincidan con los filtros aplicados o no existen eventos para este alumno.
        </p>
        {onLimpiarFiltros && (
          <div className="mt-4">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={onLimpiarFiltros}
              className="text-xs gap-1.5"
            >
              <FilterX className="h-3.5 w-3.5" />
              Restablecer filtros
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="pt-2">
      <div className="mb-3 flex items-center justify-between text-xs text-on-surface-variant">
        <span className="font-semibold">
          Mostrando {eventosOrdenados.length}{" "}
          {eventosOrdenados.length === 1 ? "evento" : "eventos"}
        </span>
        <span className="font-medium">Ordenado: más reciente primero</span>
      </div>

      <div className="relative">
        {eventosOrdenados.map((evento, index) => (
          <TimelineItem
            key={`${evento.fechaHora}-${evento.tipo}-${index}`}
            evento={evento}
            puedeVerObservacionesYNotas={puedeVerObservacionesYNotas}
            esUltimo={index === eventosOrdenados.length - 1}
          />
        ))}
      </div>
    </div>
  );
}
