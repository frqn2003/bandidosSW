// src/components/indicadores/DashboardFilters.tsx
//
// Barra de filtros del Dashboard de Indicadores (HU-IND-01).
// Inputs: Fecha Desde, Fecha Hasta, Select Materia, Select Profesor, Botón Actualizar.
// Validación: Período máximo de 12 meses (366 días) y fecha fin >= fecha inicio.

"use client";

import React from "react";
import { Icon } from "@/components/ui/Icon";
import type { DashboardFiltersState, OpcionCatalogo } from "@/modules/indicadores/types";

interface DashboardFiltersProps {
  filtros: DashboardFiltersState;
  materias: OpcionCatalogo[];
  profesores: OpcionCatalogo[];
  errorValidacion: string | null;
  cargando?: boolean;
  onFiltroChange: <K extends keyof DashboardFiltersState>(
    campo: K,
    valor: DashboardFiltersState[K]
  ) => void;
  onActualizar?: () => void;
  onLimpiar: () => void;
}

export function DashboardFilters({
  filtros,
  materias,
  profesores,
  errorValidacion,
  cargando = false,
  onFiltroChange,
  onActualizar,
  onLimpiar,
}: DashboardFiltersProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onActualizar) {
      onActualizar();
    }
  };

  return (
    <div className="rounded-md border border-outline-variant bg-surface-container-lowest p-5 shadow-card">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12 items-end">
          {/* Fecha Desde */}
          <div className="flex flex-col gap-1.5 lg:col-span-2">
            <label
              htmlFor="filtro-desde"
              className="text-xs font-bold uppercase tracking-wider text-on-surface-variant"
            >
              Desde
            </label>
            <input
              id="filtro-desde"
              type="date"
              value={filtros.desde}
              onChange={(e) => onFiltroChange("desde", e.target.value)}
              className="h-11 rounded-sm border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface focus:border-secondary focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary/20"
            />
          </div>

          {/* Fecha Hasta */}
          <div className="flex flex-col gap-1.5 lg:col-span-2">
            <label
              htmlFor="filtro-hasta"
              className="text-xs font-bold uppercase tracking-wider text-on-surface-variant"
            >
              Hasta
            </label>
            <input
              id="filtro-hasta"
              type="date"
              value={filtros.hasta}
              onChange={(e) => onFiltroChange("hasta", e.target.value)}
              className="h-11 rounded-sm border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface focus:border-secondary focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary/20"
            />
          </div>

          {/* Select Materia */}
          <div className="flex flex-col gap-1.5 lg:col-span-3">
            <label
              htmlFor="filtro-materia"
              className="text-xs font-bold uppercase tracking-wider text-on-surface-variant"
            >
              Materia
            </label>
            <select
              id="filtro-materia"
              value={filtros.materiaId}
              onChange={(e) => {
                const val = e.target.value;
                onFiltroChange("materiaId", val === "Todas" ? "Todas" : Number(val));
              }}
              className="h-11 rounded-sm border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface focus:border-secondary focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary/20"
            >
              <option value="Todas">Todas las materias</option>
              {materias.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Select Profesor */}
          <div className="flex flex-col gap-1.5 lg:col-span-3">
            <label
              htmlFor="filtro-profesor"
              className="text-xs font-bold uppercase tracking-wider text-on-surface-variant"
            >
              Profesor
            </label>
            <select
              id="filtro-profesor"
              value={filtros.profesorId}
              onChange={(e) => {
                const val = e.target.value;
                onFiltroChange("profesorId", val === "Todos" ? "Todos" : Number(val));
              }}
              className="h-11 rounded-sm border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface focus:border-secondary focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary/20"
            >
              <option value="Todos">Todos los profesores</option>
              {profesores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Botones Actualizar y Limpiar filtros */}
          <div className="flex items-center gap-2 lg:col-span-2">
            <button
              type="submit"
              disabled={cargando}
              className="flex h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-sm bg-primary px-3 text-sm font-bold text-white shadow-xs transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
            >
              <Icon
                name={cargando ? "progress_activity" : "refresh"}
                size={18}
                className={cargando ? "animate-spin" : ""}
              />
              <span>{cargando ? "Actualizando…" : "Actualizar"}</span>
            </button>
            <button
              type="button"
              disabled={cargando}
              onClick={onLimpiar}
              title="Restablecer filtros al mes actual"
              className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-sm border border-secondary bg-white text-secondary hover:bg-secondary/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
            >
              <Icon name="filter_alt_off" size={18} />
            </button>
          </div>
        </div>

        {/* Mensaje de error de validación */}
        {errorValidacion && (
          <div className="flex items-center gap-2 rounded-sm bg-error/10 px-3.5 py-2 text-xs font-medium text-error">
            <Icon name="error" size={16} className="shrink-0" />
            <span>{errorValidacion}</span>
          </div>
        )}
      </form>
    </div>
  );
}
