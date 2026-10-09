// src/components/calendario/MonthView.tsx
//
// Vista Mensual del Calendario (HU-CAL-02).
// Muestra la cuadrícula clásica de mes (LUN a DOM).
// Cada celda muestra únicamente la cantidad total de turnos del día (pastilla "14 turnos")
// y barras de color por materia.
// Al hacer click en cualquier día, navega automáticamente a la vista Día (DayView) para esa fecha.

"use client";

import React from "react";
import type { DiaResumenMes } from "./types";

interface MonthViewProps {
  diasMes: DiaResumenMes[];
  onSelectDay: (fecha: string) => void;
}

export function MonthView({ diasMes, onSelectDay }: MonthViewProps) {
  const DIAS_SEMANA_HEADERS = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-xs overflow-hidden">
      {/* Cabecera de días de la semana */}
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-bold uppercase tracking-wider text-slate-500">
        {DIAS_SEMANA_HEADERS.map((dia) => (
          <div key={dia} className="py-3 border-r border-slate-200 last:border-r-0">
            {dia}
          </div>
        ))}
      </div>

      {/* Grilla de celdas del mes */}
      <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
        {diasMes.map((dia) => {
          const tieneTurnos = dia.cantidadTurnos > 0;

          return (
            <div
              key={dia.fecha}
              onClick={() => onSelectDay(dia.fecha)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  onSelectDay(dia.fecha);
                }
              }}
              className={`min-h-[6.5rem] p-2.5 sm:p-3 flex flex-col justify-between transition-colors cursor-pointer outline-none focus-visible:bg-blue-50/70 group ${
                !dia.esMesActual
                  ? "bg-slate-50/60 opacity-60"
                  : "bg-white hover:bg-blue-50/40"
              }`}
              title={`Ver detalle del día ${dia.fecha} (${dia.cantidadTurnos} turnos)`}
            >
              {/* Número del día */}
              <div className="flex items-center justify-between">
                {dia.esHoy ? (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-900 text-xs font-bold text-white shadow-2xs">
                    {dia.numeroDia}
                  </span>
                ) : (
                  <span
                    className={`text-sm font-bold ${
                      dia.esMesActual
                        ? "text-slate-900 group-hover:text-blue-700"
                        : "text-slate-400"
                    }`}
                  >
                    {dia.numeroDia}
                  </span>
                )}
              </div>

              {/* Centro de la celda: Badge tipo pastilla con cantidad de turnos */}
              <div className="my-1.5 flex justify-start">
                {tieneTurnos ? (
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-900 border border-blue-200/80 shadow-2xs group-hover:bg-blue-100 group-hover:border-blue-300 transition-colors">
                    {dia.cantidadTurnos} {dia.cantidadTurnos === 1 ? "turno" : "turnos"}
                  </span>
                ) : (
                  <span className="text-[11px] font-medium text-slate-400 italic">
                    Sin turnos
                  </span>
                )}
              </div>

              {/* Barras de color por materia en la parte inferior */}
              {tieneTurnos ? (
                <div className="flex items-center gap-1 mt-auto pt-1">
                  {dia.materiasConTurnos.map((m) => (
                    <span
                      key={m.materiaId}
                      style={{ backgroundColor: m.color }}
                      className="h-1 flex-1 rounded-full"
                      title={m.nombre}
                    />
                  ))}
                </div>
              ) : (
                <div className="h-1" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
