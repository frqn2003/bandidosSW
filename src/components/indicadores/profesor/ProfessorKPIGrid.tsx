// src/components/indicadores/profesor/ProfessorKPIGrid.tsx
//
// Cuadrícula de 6 Tarjetas de Indicadores (KPIs) del Profesor (HU-IND-02):
//  1. Clases dictadas (estado "Asistió").
//  2. Alumnos distintos atendidos.
//  3. Horas dictadas (suma de duración en horas).
//  4. % de asistencia (Asistió / (Asistió + Ausente)).
//  5. % de cancelaciones (Cancelados / total de turnos).
//  6. % de ocupación (Horas reservadas / horas disponibles).
//
// REGLA MATEMÁTICA: Si el denominador es 0 o el valor es null, muestra "—"
// en lugar de NaN o Infinity. Sin datos financieros o de pagos.

"use client";

import React from "react";
import { Icon } from "@/components/ui/Icon";

interface ProfessorKPIGridProps {
  clasesDictadas: number;
  alumnosAtendidos: number;
  horasDictadas: number;
  porcentajeAsistencia: number | null;
  porcentajeCancelaciones: number | null;
  porcentajeOcupacion: number | null;
  // Denominadores y base para verificación matemática
  totalTurnos: number;
  turnosAusentes: number;
  horasDisponibles: number;
}

export function ProfessorKPIGrid({
  clasesDictadas,
  alumnosAtendidos,
  horasDictadas,
  porcentajeAsistencia,
  porcentajeCancelaciones,
  porcentajeOcupacion,
  totalTurnos,
  turnosAusentes,
  horasDisponibles,
}: ProfessorKPIGridProps) {
  // REGLA MATEMÁTICA: si denominador es 0 o porcentaje es null/undefined, devuelve "—"
  const formatearPorcentaje = (
    valor: number | null | undefined,
    denominador: number
  ): string => {
    if (denominador === 0 || valor === null || valor === undefined || Number.isNaN(valor)) {
      return "—";
    }
    return `${valor.toFixed(1)}%`;
  };

  // Denominador de asistencia: Asistió + Ausente
  const denominadorAsistencia = clasesDictadas + turnosAusentes;
  const textoAsistencia = formatearPorcentaje(porcentajeAsistencia, denominadorAsistencia);

  // Denominador de cancelaciones: Total turnos
  const textoCancelaciones = formatearPorcentaje(porcentajeCancelaciones, totalTurnos);

  // Denominador de ocupación: Horas disponibles
  const textoOcupacion = formatearPorcentaje(porcentajeOcupacion, horasDisponibles);

  // Formato para horas con 1 o 2 decimales
  const formatoHoras = (val: number) => {
    return Number.isInteger(val) ? `${val} h` : `${val.toFixed(1)} h`;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* 1. Clases Dictadas */}
      <div className="rounded-md border border-outline-variant bg-surface-container-lowest p-5 shadow-xs flex flex-col justify-between transition-all hover:border-outline">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
            Clases Dictadas
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon name="school" size={20} />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl sm:text-[26px] font-bold text-on-surface tracking-tight tabular-nums">
            {clasesDictadas}
          </div>
          <p className="mt-1 text-xs text-on-surface-variant">
            Turnos con estado &quot;Asistió&quot;
          </p>
        </div>
      </div>

      {/* 2. Alumnos Atendidos */}
      <div className="rounded-md border border-outline-variant bg-surface-container-lowest p-5 shadow-xs flex flex-col justify-between transition-all hover:border-outline">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
            Alumnos Atendidos
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-indigo-50 text-indigo-700">
            <Icon name="groups" size={20} />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl sm:text-[26px] font-bold text-on-surface tracking-tight tabular-nums">
            {alumnosAtendidos}
          </div>
          <p className="mt-1 text-xs text-on-surface-variant">
            Alumnos distintos atendidos
          </p>
        </div>
      </div>

      {/* 3. Horas Dictadas */}
      <div className="rounded-md border border-outline-variant bg-surface-container-lowest p-5 shadow-xs flex flex-col justify-between transition-all hover:border-outline">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
            Horas Dictadas
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-sky-50 text-sky-700">
            <Icon name="schedule" size={20} />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl sm:text-[26px] font-bold text-on-surface tracking-tight tabular-nums">
            {formatoHoras(horasDictadas)}
          </div>
          <p className="mt-1 text-xs text-on-surface-variant">
            Suma de duración de clases
          </p>
        </div>
      </div>

      {/* 4. % de Asistencia */}
      <div className="rounded-md border border-outline-variant bg-surface-container-lowest p-5 shadow-xs flex flex-col justify-between transition-all hover:border-outline">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
            % Asistencia
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
            <Icon name="check_circle" size={20} />
          </div>
        </div>
        <div className="mt-3">
          <div
            className={`text-2xl sm:text-[26px] font-bold tracking-tight tabular-nums ${
              textoAsistencia === "—"
                ? "text-on-surface-variant"
                : "text-emerald-700"
            }`}
          >
            {textoAsistencia}
          </div>
          <p className="mt-1 text-xs text-on-surface-variant">
            {denominadorAsistencia === 0
              ? "Sin turnos dictados/ausentes"
              : `Sobre ${denominadorAsistencia} clases`}
          </p>
        </div>
      </div>

      {/* 5. % de Cancelaciones */}
      <div className="rounded-md border border-outline-variant bg-surface-container-lowest p-5 shadow-xs flex flex-col justify-between transition-all hover:border-outline">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
            % Cancelaciones
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-amber-50 text-amber-700">
            <Icon name="event_busy" size={20} />
          </div>
        </div>
        <div className="mt-3">
          <div
            className={`text-2xl sm:text-[26px] font-bold tracking-tight tabular-nums ${
              textoCancelaciones === "—"
                ? "text-on-surface-variant"
                : "text-amber-700"
            }`}
          >
            {textoCancelaciones}
          </div>
          <p className="mt-1 text-xs text-on-surface-variant">
            {totalTurnos === 0
              ? "Sin turnos registrados"
              : `Sobre ${totalTurnos} turnos`}
          </p>
        </div>
      </div>

      {/* 6. % de Ocupación */}
      <div className="rounded-md border border-outline-variant bg-surface-container-lowest p-5 shadow-xs flex flex-col justify-between transition-all hover:border-outline">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
            % Ocupación
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-violet-50 text-violet-700">
            <Icon name="pie_chart" size={20} />
          </div>
        </div>
        <div className="mt-3">
          <div
            className={`text-2xl sm:text-[26px] font-bold tracking-tight tabular-nums ${
              textoOcupacion === "—"
                ? "text-on-surface-variant"
                : "text-violet-700"
            }`}
          >
            {textoOcupacion}
          </div>
          <p className="mt-1 text-xs text-on-surface-variant">
            {horasDisponibles === 0
              ? "Sin disponibilidad ofertada"
              : `${horasDisponibles} h disponibles`}
          </p>
        </div>
      </div>
    </div>
  );
}
