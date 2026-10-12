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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
      {/* 1. Clases Dictadas */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Clases Dictadas
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
            <Icon name="school" size={17} />
          </div>
        </div>
        <div className="mt-2.5">
          <div className="text-2xl font-bold text-slate-900 tracking-tight tabular-nums">
            {clasesDictadas}
          </div>
          <p className="mt-0.5 text-[11px] text-slate-400">
            Turnos con estado &quot;Asistió&quot;
          </p>
        </div>
      </div>

      {/* 2. Alumnos Atendidos */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Alumnos Atendidos
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
            <Icon name="groups" size={17} />
          </div>
        </div>
        <div className="mt-2.5">
          <div className="text-2xl font-bold text-slate-900 tracking-tight tabular-nums">
            {alumnosAtendidos}
          </div>
          <p className="mt-0.5 text-[11px] text-slate-400">
            Alumnos distintos atendidos
          </p>
        </div>
      </div>

      {/* 3. Horas Dictadas */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Horas Dictadas
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
            <Icon name="schedule" size={17} />
          </div>
        </div>
        <div className="mt-2.5">
          <div className="text-2xl font-bold text-slate-900 tracking-tight tabular-nums">
            {formatoHoras(horasDictadas)}
          </div>
          <p className="mt-0.5 text-[11px] text-slate-400">
            Suma de duración de clases
          </p>
        </div>
      </div>

      {/* 4. % de Asistencia */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            % Asistencia
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
            <Icon name="check_circle" size={17} />
          </div>
        </div>
        <div className="mt-2.5">
          <div
            className={`text-2xl font-bold tracking-tight tabular-nums ${
              textoAsistencia === "—"
                ? "text-slate-400"
                : "text-emerald-700"
            }`}
          >
            {textoAsistencia}
          </div>
          <p className="mt-0.5 text-[11px] text-slate-400">
            {denominadorAsistencia === 0
              ? "Sin turnos dictados/ausentes"
              : `Sobre ${denominadorAsistencia} clases`}
          </p>
        </div>
      </div>

      {/* 5. % de Cancelaciones */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            % Cancelaciones
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
            <Icon name="event_busy" size={17} />
          </div>
        </div>
        <div className="mt-2.5">
          <div
            className={`text-2xl font-bold tracking-tight tabular-nums ${
              textoCancelaciones === "—"
                ? "text-slate-400"
                : "text-amber-700"
            }`}
          >
            {textoCancelaciones}
          </div>
          <p className="mt-0.5 text-[11px] text-slate-400">
            {totalTurnos === 0
              ? "Sin turnos registrados"
              : `Sobre ${totalTurnos} turnos`}
          </p>
        </div>
      </div>

      {/* 6. % de Ocupación */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            % Ocupación
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
            <Icon name="pie_chart" size={17} />
          </div>
        </div>
        <div className="mt-2.5">
          <div
            className={`text-2xl font-bold tracking-tight tabular-nums ${
              textoOcupacion === "—"
                ? "text-slate-400"
                : "text-violet-700"
            }`}
          >
            {textoOcupacion}
          </div>
          <p className="mt-0.5 text-[11px] text-slate-400">
            {horasDisponibles === 0
              ? "Sin disponibilidad ofertada"
              : `${horasDisponibles} h disponibles`}
          </p>
        </div>
      </div>
    </div>
  );
}
