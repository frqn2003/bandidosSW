// src/components/alumnos/historial/HistorySummary.tsx
//
// Tarjetas de Resumen superior del Historial del Alumno (HU-ALU-03).
// Muestra métricas clave:
//  - Clases asistidas
//  - Ausencias
//  - Cancelaciones
//  - Porcentaje de asistencia (Asistió / (Asistió + Ausente), 1 decimal)
//  - Fecha de la última clase

"use client";

import React from "react";
import { CheckCircle2, XCircle, Ban, Award, Calendar } from "lucide-react";
import type { ResumenHistorialResponse } from "@/contracts/historial";

interface HistorySummaryProps {
  resumen: ResumenHistorialResponse | null;
  cargando?: boolean;
}

function formatearFecha(iso?: string | null): string {
  if (!iso) return "Sin registros";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function HistorySummary({ resumen, cargando = false }: HistorySummaryProps) {
  if (cargando) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-md border border-outline-variant bg-white p-4 shadow-sm"
          >
            <div className="h-4 w-20 rounded bg-surface-container-high mb-2" />
            <div className="h-7 w-12 rounded bg-surface-container-high" />
          </div>
        ))}
      </div>
    );
  }

  const asistidas = resumen?.clasesAsistidas ?? 0;
  const ausencias = resumen?.ausencias ?? 0;
  const cancelaciones = resumen?.cancelaciones ?? 0;
  
  // Fórmula: Asistió / (Asistió + Ausente)
  const totalClases = asistidas + ausencias;
  const porcentajeCalculado =
    totalClases > 0 ? ((asistidas / totalClases) * 100).toFixed(1) : null;
  const porcentajeTexto =
    resumen?.porcentajeAsistencia !== null && resumen?.porcentajeAsistencia !== undefined
      ? `${resumen.porcentajeAsistencia.toFixed(1)}%`
      : porcentajeCalculado !== null
      ? `${porcentajeCalculado}%`
      : "—";

  const fechaUltimaClase = formatearFecha(resumen?.fechaUltimaClase);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 print:grid-cols-5 print:gap-2">
      {/* 1. Clases Asistidas */}
      <div className="rounded-md border border-outline-variant bg-white p-4 shadow-sm transition-all hover:border-emerald-300 print:shadow-none print:p-2.5">
        <div className="flex items-center justify-between text-on-surface-variant">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Asistidas
          </span>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
          </span>
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="font-display text-2xl font-bold text-on-surface">
            {asistidas}
          </span>
          <span className="text-xs text-on-surface-variant">clases</span>
        </div>
      </div>

      {/* 2. Ausencias */}
      <div className="rounded-md border border-outline-variant bg-white p-4 shadow-sm transition-all hover:border-rose-300 print:shadow-none print:p-2.5">
        <div className="flex items-center justify-between text-on-surface-variant">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Ausencias
          </span>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-50 text-rose-600">
            <XCircle className="h-4 w-4" />
          </span>
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="font-display text-2xl font-bold text-on-surface">
            {ausencias}
          </span>
          <span className="text-xs text-on-surface-variant">clases</span>
        </div>
      </div>

      {/* 3. Cancelaciones */}
      <div className="rounded-md border border-outline-variant bg-white p-4 shadow-sm transition-all hover:border-amber-300 print:shadow-none print:p-2.5">
        <div className="flex items-center justify-between text-on-surface-variant">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Canceladas
          </span>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <Ban className="h-4 w-4" />
          </span>
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="font-display text-2xl font-bold text-on-surface">
            {cancelaciones}
          </span>
          <span className="text-xs text-on-surface-variant">turnos</span>
        </div>
      </div>

      {/* 4. Porcentaje de asistencia */}
      <div className="rounded-md border border-outline-variant bg-white p-4 shadow-sm transition-all hover:border-blue-300 print:shadow-none print:p-2.5">
        <div className="flex items-center justify-between text-on-surface-variant">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            % Asistencia
          </span>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <Award className="h-4 w-4" />
          </span>
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="font-display text-2xl font-bold text-primary">
            {porcentajeTexto}
          </span>
          {porcentajeTexto !== "—" && (
            <span className="text-[10px] text-on-surface-variant font-medium">
              (asistió/total)
            </span>
          )}
        </div>
      </div>

      {/* 5. Fecha de la última clase */}
      <div className="col-span-2 sm:col-span-1 print:col-span-1 rounded-md border border-outline-variant bg-white p-4 shadow-sm transition-all hover:border-indigo-300 print:shadow-none print:p-2.5">
        <div className="flex items-center justify-between text-on-surface-variant">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Última Clase
          </span>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
            <Calendar className="h-4 w-4" />
          </span>
        </div>
        <div className="mt-2">
          <span className="text-sm font-bold text-on-surface">
            {fechaUltimaClase}
          </span>
        </div>
      </div>
    </div>
  );
}
