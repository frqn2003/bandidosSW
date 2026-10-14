// src/components/alumnos/historial/HistoryFilters.tsx
//
// Filtros combinables para la Línea de Tiempo del Alumno (HU-ALU-03).
// Criterios obligatorios:
//  - Rango de fechas (dd/mm/aaaa)
//  - Tipo de evento
//  - Materia
//  - Profesor
// Criterio opcional / deseable:
//  - Filtro rápido "Solo notas"

"use client";

import React from "react";
import { Filter, StickyNote, RotateCcw } from "lucide-react";
import { RangoFechas } from "@/components/ui/RangoFechas";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";

interface HistoryFiltersProps {
  desde: string;
  hasta: string;
  onRangoChange: (rango: { desde: string; hasta: string }) => void;
  tipoEvento: string;
  onTipoEventoChange: (tipo: string) => void;
  materiaId: string;
  onMateriaChange: (materia: string) => void;
  profesorId: string;
  onProfesorChange: (profesor: string) => void;
  soloNotas: boolean;
  onToggleSoloNotas: () => void;
  onLimpiarFiltros: () => void;
  materiasDisponibles: Array<{ id: number; nombre: string }>;
  profesoresDisponibles: Array<{ id: number; nombre: string }>;
}

export function HistoryFilters({
  desde,
  hasta,
  onRangoChange,
  tipoEvento,
  onTipoEventoChange,
  materiaId,
  onMateriaChange,
  profesorId,
  onProfesorChange,
  soloNotas,
  onToggleSoloNotas,
  onLimpiarFiltros,
  materiasDisponibles,
  profesoresDisponibles,
}: HistoryFiltersProps) {
  const hayFiltrosActivos =
    Boolean(desde) ||
    Boolean(hasta) ||
    tipoEvento !== "todos" ||
    materiaId !== "todas" ||
    profesorId !== "todos" ||
    soloNotas;

  return (
    <div className="rounded-md border border-outline-variant bg-white p-4 shadow-sm space-y-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant/60 pb-2.5">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
          <Filter className="h-3.5 w-3.5 text-primary" />
          <span>Filtros combinables</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Filtro rápido: Solo notas */}
          <button
            type="button"
            onClick={onToggleSoloNotas}
            className={`inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer border ${
              soloNotas
                ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                : "bg-surface-container-low text-on-surface hover:bg-surface-container-high border-outline-variant"
            }`}
            title="Mostrar únicamente notas registradas en la bitácora"
          >
            <StickyNote className="h-3.5 w-3.5" />
            Solo notas
          </button>

          {/* Botón limpiar */}
          {hayFiltrosActivos && (
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={onLimpiarFiltros}
              className="text-xs h-7 px-2 text-on-surface-variant hover:text-error gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              Limpiar
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        {/* 1. Rango de Fechas */}
        <div className="shrink-0">
          <RangoFechas
            id="filtro-historial"
            desde={desde}
            hasta={hasta}
            onChange={onRangoChange}
            compact
          />
        </div>

        {/* 2. Tipo de Evento */}
        <Select
          label="Tipo de evento"
          compact
          wrapperClassName="min-w-[140px] flex-1"
          value={soloNotas ? "Nota" : tipoEvento}
          disabled={soloNotas}
          onChange={(e) => onTipoEventoChange(e.target.value)}
        >
          <option value="todos">Todos los tipos</option>
          <option value="Reservado">Turno reservado</option>
          <option value="Modificado">Turno modificado</option>
          <option value="Cancelado">Cancelación</option>
          <option value="Asistió">Asistió</option>
          <option value="Ausente">Ausente</option>
          <option value="Nota">Nota</option>
        </Select>

        {/* 3. Materia */}
        <Select
          label="Materia"
          compact
          wrapperClassName="min-w-[140px] flex-1"
          value={materiaId}
          disabled={soloNotas}
          onChange={(e) => onMateriaChange(e.target.value)}
        >
          <option value="todas">Todas las materias</option>
          {materiasDisponibles.map((m) => (
            <option key={m.id} value={String(m.id)}>
              {m.nombre}
            </option>
          ))}
        </Select>

        {/* 4. Profesor */}
        <Select
          label="Profesor"
          compact
          wrapperClassName="min-w-[140px] flex-1"
          value={profesorId}
          disabled={soloNotas}
          onChange={(e) => onProfesorChange(e.target.value)}
        >
          <option value="todos">Todos los profesores</option>
          {profesoresDisponibles.map((p) => (
            <option key={p.id} value={String(p.id)}>
              {p.nombre}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
