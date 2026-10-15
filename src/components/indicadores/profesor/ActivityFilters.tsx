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
    <div className="rounded-md border border-outline-variant bg-surface-container-lowest p-5 shadow-xs">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
          {/* 1. Fecha Desde */}
          <div className="lg:col-span-3">
            <label
              htmlFor="filter-desde"
              className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5"
            >
              Fecha Desde
            </label>
            <div className="relative">
              <input
                id="filter-desde"
                type="date"
                value={desde}
                onChange={(e) => onCambioDesde(e.target.value)}
                className={`w-full rounded-sm border bg-surface-container-lowest px-3 py-2 text-sm font-medium text-on-surface focus:outline-none focus:ring-1 cursor-pointer ${
                  errorPeriodo
                    ? "border-error focus:border-error focus:ring-error bg-error-container/20"
                    : "border-outline-variant focus:border-secondary focus:ring-secondary"
                }`}
              />
            </div>
          </div>

          {/* 2. Fecha Hasta */}
          <div className="lg:col-span-3">
            <label
              htmlFor="filter-hasta"
              className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5"
            >
              Fecha Hasta
            </label>
            <div className="relative">
              <input
                id="filter-hasta"
                type="date"
                value={hasta}
                onChange={(e) => onCambioHasta(e.target.value)}
                className={`w-full rounded-sm border bg-surface-container-lowest px-3 py-2 text-sm font-medium text-on-surface focus:outline-none focus:ring-1 cursor-pointer ${
                  errorPeriodo
                    ? "border-error focus:border-error focus:ring-error bg-error-container/20"
                    : "border-outline-variant focus:border-secondary focus:ring-secondary"
                }`}
              />
            </div>
          </div>

          {/* 3. Materia que dicta */}
          <div className="lg:col-span-4">
            <label
              htmlFor="filter-materia"
              className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5"
            >
              Materia Asignada
            </label>
            <select
              id="filter-materia"
              value={materiaId ?? ""}
              onChange={(e) =>
                onCambioMateria(e.target.value ? Number(e.target.value) : undefined)
              }
              className="w-full rounded-sm border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary cursor-pointer"
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
              className="inline-flex w-full h-[38px] items-center justify-center gap-1.5 rounded-sm bg-primary px-3 text-xs font-bold uppercase tracking-wider text-on-primary shadow-xs hover:bg-secondary active:bg-secondary transition-colors disabled:opacity-60 cursor-pointer"
            >
              <Icon
                name="refresh"
                size={16}
                className={cargando ? "animate-spin" : ""}
              />
              <span>Actualizar</span>
            </button>

            <button
              type="button"
              onClick={onLimpiar}
              className="inline-flex h-[38px] w-10 shrink-0 items-center justify-center rounded-sm border border-outline-variant bg-surface-container-lowest p-1.5 text-on-surface-variant shadow-xs hover:bg-surface-container-low hover:text-on-surface transition-colors cursor-pointer"
              title="Restablecer al mes en curso"
            >
              <Icon name="restart_alt" size={18} />
            </button>
          </div>
        </div>

        {/* VALIDACIÓN CRÍTICA: Error en rojo en el filtro de período */}
        {errorPeriodo && (
          <div
            id="error-periodo"
            role="alert"
            className="flex items-center gap-1.5 text-xs font-semibold text-error animate-in fade-in duration-150 pt-0.5"
          >
            <Icon name="error" size={15} className="shrink-0 text-error" />
            <span>{errorPeriodo}</span>
          </div>
        )}
      </form>
    </div>
  );
}
