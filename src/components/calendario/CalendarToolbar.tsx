// src/components/calendario/CalendarToolbar.tsx
//
// Cabecera principal y barra de controles del Calendario (HU-CAL-02).
// Contiene:
//  · Título dinámico del período + indicador "En vivo · actualizado hace X s" + botón "+ Reservar turno".
//  · Selector de vista (Día, Semana predeterminada, Mes).
//  · Navegación temporal (<, Hoy, >).
//  · Filtros combinables (Profesor, Materia).
//  · Toggles (Ver cancelados, Solo con cupo).
//  · Leyenda de materias en vista Mes.

"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Switch } from "@/components/ui/Switch";
import type {
  VistaCalendario,
  ProfesorCalendario,
  MateriaCalendario,
  FiltrosCalendario,
} from "./types";

interface CalendarToolbarProps {
  vista: VistaCalendario;
  onCambiarVista: (vista: VistaCalendario) => void;
  tituloPeriodo: string;
  segundosActualizado: number;
  isRefreshing: boolean;
  onIrAHoy: () => void;
  onAnterior: () => void;
  onSiguiente: () => void;
  onReservarTurno?: () => void;

  profesores: ProfesorCalendario[];
  materias: MateriaCalendario[];
  filtros: FiltrosCalendario;
  onSetProfesor: (profesorId?: number) => void;
  onSetMateria: (materiaId?: number) => void;
  onToggleVerCancelados: () => void;
  onToggleSoloConCupo: () => void;
  profesorFijo?: ProfesorCalendario | null;
}

export function CalendarToolbar({
  vista,
  onCambiarVista,
  tituloPeriodo,
  segundosActualizado,
  isRefreshing,
  onIrAHoy,
  onAnterior,
  onSiguiente,
  onReservarTurno,
  profesores,
  materias,
  filtros,
  onSetProfesor,
  onSetMateria,
  onToggleVerCancelados,
  onToggleSoloConCupo,
  profesorFijo,
}: CalendarToolbarProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* ─── Fila Superior: Título + Estado en vivo + CTA Reservar Turno ─── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {tituloPeriodo}
          </h1>

          {/* Indicador de actualización en vivo (polling silencioso) */}
          <div
            className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200"
            title="Sincronización en segundo plano cada 30 segundos"
          >
            <span
              className={`h-2 w-2 rounded-full bg-emerald-500 ${
                isRefreshing ? "animate-ping" : "animate-pulse"
              }`}
            />
            <span>
              En vivo · actualizado hace {segundosActualizado} s
            </span>
          </div>
        </div>

        {/* Botón "+ Reservar turno" */}
        <Button
          type="button"
          variant="primary"
          onClick={onReservarTurno}
          className="gap-2 shadow-xs"
        >
          <Icon name="add" size={18} />
          Reservar turno
        </Button>
      </div>

      {/* ─── Fila Inferior: Controles de Vista, Navegación y Filtros ─── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-3 shadow-xs">
        {/* Izquierda: Selector de vistas y navegación de fechas */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Selector de Vistas: Día | Semana | Mes */}
          <div
            role="group"
            aria-label="Selector de vista del calendario"
            className="inline-flex rounded-md border border-slate-200 bg-slate-50/80 p-0.5 shadow-2xs"
          >
            <button
              type="button"
              onClick={() => onCambiarVista("dia")}
              className={`rounded px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                vista === "dia"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
              }`}
            >
              Día
            </button>
            <button
              type="button"
              onClick={() => onCambiarVista("semana")}
              className={`rounded px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                vista === "semana"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
              }`}
            >
              Semana
            </button>
            <button
              type="button"
              onClick={() => onCambiarVista("mes")}
              className={`rounded px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                vista === "mes"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
              }`}
            >
              Mes
            </button>
          </div>

          {/* Navegación de Fechas: < | Hoy | > */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onAnterior}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer"
              title="Período anterior"
              aria-label="Ir al período anterior"
            >
              <Icon name="chevron_left" size={18} />
            </button>
            <button
              type="button"
              onClick={onIrAHoy}
              className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={onSiguiente}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer"
              title="Período siguiente"
              aria-label="Ir al período siguiente"
            >
              <Icon name="chevron_right" size={18} />
            </button>
          </div>
        </div>

        {/* Derecha: Filtros de Profesor, Materia y Toggles */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Filtro Profesor */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="filter-profesor" className="text-xs font-semibold text-slate-500">
              Profesor:
            </label>
            {profesorFijo ? (
              <span className="rounded-md border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
                {profesorFijo.apellido}, {profesorFijo.nombre}
              </span>
            ) : (
              <select
                id="filter-profesor"
                value={filtros.profesorId ?? ""}
                onChange={(e) =>
                  onSetProfesor(e.target.value ? Number(e.target.value) : undefined)
                }
                className="h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-800 shadow-2xs focus:border-blue-600 focus:outline-none cursor-pointer"
              >
                <option value="">Todos los profesores</option>
                {profesores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.apellido}, {p.nombre}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Filtro Materia */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="filter-materia" className="text-xs font-semibold text-slate-500">
              Materia:
            </label>
            <select
              id="filter-materia"
              value={filtros.materiaId ?? ""}
              onChange={(e) =>
                onSetMateria(e.target.value ? Number(e.target.value) : undefined)
              }
              className="h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-800 shadow-2xs focus:border-blue-600 focus:outline-none cursor-pointer"
            >
              <option value="">Todas las materias</option>
              {materias.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Toggle: Ver cancelados */}
          <div className="flex items-center gap-2">
            <Switch
              checked={filtros.verCancelados}
              onChange={onToggleVerCancelados}
              ariaLabel="Ver turnos cancelados"
            />
            <span
              onClick={onToggleVerCancelados}
              className="text-xs font-semibold text-slate-700 cursor-pointer select-none"
            >
              Ver cancelados
            </span>
          </div>

          {/* Toggle: Solo con cupo */}
          <div className="flex items-center gap-2">
            <Switch
              checked={filtros.soloConCupo}
              onChange={onToggleSoloConCupo}
              ariaLabel="Solo con cupo disponible"
            />
            <span
              onClick={onToggleSoloConCupo}
              className="text-xs font-semibold text-slate-700 cursor-pointer select-none"
            >
              Solo con cupo
            </span>
          </div>
        </div>
      </div>

      {/* ─── Leyenda en Vista Mes (Matemática, Física, Química, Inglés) ─── */}
      {vista === "mes" && (
        <div className="flex flex-wrap items-center justify-end gap-4 text-xs font-semibold text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-blue-600" />
            <span>Matemática</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-purple-600" />
            <span>Física</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-emerald-600" />
            <span>Química</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-amber-600" />
            <span>Inglés</span>
          </div>
        </div>
      )}
    </div>
  );
}
