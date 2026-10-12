// src/components/indicadores/profesor/ActivityFilters.tsx
//
// Barra de Filtros para Indicadores de Actividad del Profesor (HU-IND-02).
// Filtros:
//  · Rango de Período (desde y hasta en formato aaaa-mm-dd, defecto mes en curso).
//  · Select de Materia (solo materias que dicta el docente).
//  · Validación crítica: período no puede superar los 12 meses. Si es inválido,
//    muestra error en rojo bajo el filtro de período y bloquea la petición.
//  · Botón "Actualizar".

"use client";

import React from "react";
import { Icon } from "@/components/ui/Icon";

interface MateriaDictada {
  id: number;
  nombre: string;
}

interface ActivityFiltersProps {
  desde: string;
  hasta: string;
  materiaId: number | undefined;
  materias: MateriaDictada[];
  errorPeriodo: string | null;
  cargando: boolean;
  onCambioDesde: (val: string) => void;
  onCambioHasta: (val: string) => void;
  onCambioMateria: (val: number | undefined) => void;
  onActualizar: () => void;
  onLimpiar: () => void;
}

export function ActivityFilters({
  desde,
  hasta,
  materiaId,
  materias,
  errorPeriodo,
  cargando,
  onCambioDesde,
  onCambioHasta,
  onCambioMateria,
  onActualizar,
  onLimpiar,
}: ActivityFiltersProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onActualizar();
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5 items-end">
          {/* 1. Fecha Desde */}
          <div className="lg:col-span-3">
            <label
              htmlFor="filter-desde"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Fecha Desde
            </label>
            <div className="relative">
              <input
                id="filter-desde"
                type="date"
                value={desde}
                onChange={(e) => onCambioDesde(e.target.value)}
                className={`w-full rounded-md border bg-white px-3 py-1.5 text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 cursor-pointer ${
                  errorPeriodo
                    ? "border-red-400 focus:border-red-600 focus:ring-red-600 bg-red-50/20"
                    : "border-slate-300 focus:border-blue-600 focus:ring-blue-600"
                }`}
              />
            </div>
          </div>

          {/* 2. Fecha Hasta */}
          <div className="lg:col-span-3">
            <label
              htmlFor="filter-hasta"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Fecha Hasta
            </label>
            <div className="relative">
              <input
                id="filter-hasta"
                type="date"
                value={hasta}
                onChange={(e) => onCambioHasta(e.target.value)}
                className={`w-full rounded-md border bg-white px-3 py-1.5 text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 cursor-pointer ${
                  errorPeriodo
                    ? "border-red-400 focus:border-red-600 focus:ring-red-600 bg-red-50/20"
                    : "border-slate-300 focus:border-blue-600 focus:ring-blue-600"
                }`}
              />
            </div>
          </div>

          {/* 3. Materia que dicta */}
          <div className="lg:col-span-4">
            <label
              htmlFor="filter-materia"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Materia Asignada
            </label>
            <select
              id="filter-materia"
              value={materiaId ?? ""}
              onChange={(e) =>
                onCambioMateria(e.target.value ? Number(e.target.value) : undefined)
              }
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer"
            >
              <option value="">Todas las materias asignadas ({materias.length})</option>
              {materias.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Acciones: Actualizar y Limpiar */}
          <div className="lg:col-span-2 flex items-center gap-2">
            <button
              type="submit"
              disabled={cargando}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-60 cursor-pointer"
            >
              <Icon
                name="refresh"
                size={15}
                className={cargando ? "animate-spin" : ""}
              />
              <span>Actualizar</span>
            </button>

            <button
              type="button"
              onClick={onLimpiar}
              className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white p-1.5 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              title="Restablecer al mes en curso"
            >
              <Icon name="restart_alt" size={17} />
            </button>
          </div>
        </div>

        {/* VALIDACIÓN CRÍTICA: Error en rojo en el filtro de período */}
        {errorPeriodo && (
          <div
            id="error-periodo"
            role="alert"
            className="flex items-center gap-1.5 text-xs font-semibold text-red-600 animate-in fade-in duration-150 pt-0.5"
          >
            <Icon name="error" size={15} className="shrink-0 text-red-600" />
            <span>{errorPeriodo}</span>
          </div>
        )}
      </form>
    </div>
  );
}
