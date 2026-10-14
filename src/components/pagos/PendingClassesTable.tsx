// src/components/pagos/PendingClassesTable.tsx
//
// Tabla interactiva de clases pendientes de pago (HU-PAG-01).
// Muestra las clases pasadas no pagadas del alumno con selección múltiple (checkbox),
// datos de fecha, materia, profesor, importe y badge de estado "Pendiente".
// En el pie, autocalcula la cantidad seleccionada y el monto total en pesos.

"use client";

import React from "react";
import { Icon } from "@/components/ui/Icon";
import type { PendingClass } from "@/modules/pagos/types";
import { formatearFecha } from "@/funciones/formato";

interface PendingClassesTableProps {
  classes: PendingClass[];
  selectedIds: number[];
  onToggleSelect: (id: number) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  selectedTotal: number;
}

export function PendingClassesTable({
  classes,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  selectedTotal,
}: PendingClassesTableProps) {
  const allSelected = classes.length > 0 && selectedIds.length === classes.length;
  const someSelected = selectedIds.length > 0 && !allSelected;

  const formatMonto = (valor: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2,
    }).format(valor);

  return (
    <div className="flex flex-col h-full justify-between">
      <div className="overflow-hidden">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <tr>
              <th scope="col" className="w-9 px-2 py-2.5 text-center">
                <button
                  type="button"
                  onClick={allSelected ? onClearSelection : onSelectAll}
                  className="flex h-4 w-4 items-center justify-center rounded text-blue-600 hover:text-blue-800 focus:outline-none mx-auto cursor-pointer"
                  title={allSelected ? "Desmarcar todas" : "Seleccionar todas"}
                  aria-label={allSelected ? "Desmarcar todas las clases" : "Seleccionar todas las clases"}
                >
                  {allSelected ? (
                    <Icon name="check_box" size={16} className="text-blue-600" />
                  ) : someSelected ? (
                    <div className="h-3 w-3 rounded bg-blue-600" />
                  ) : (
                    <Icon name="check_box_outline_blank" size={16} className="text-slate-400" />
                  )}
                </button>
              </th>
              <th scope="col" className="px-3 py-2.5 whitespace-nowrap">Fecha y Horario</th>
              <th scope="col" className="px-3 py-2.5">Materia</th>
              <th scope="col" className="px-3 py-2.5">Profesor</th>
              <th scope="col" className="px-3 py-2.5 text-right whitespace-nowrap">Importe</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {classes.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              return (
                <tr
                  key={item.id}
                  onClick={() => onToggleSelect(item.id)}
                  className={`cursor-pointer transition-colors ${
                    isSelected ? "bg-blue-50/70" : "hover:bg-slate-50/80"
                  }`}
                >
                  <td
                    className="px-2 py-2.5 text-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect(item.id)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer align-middle"
                      aria-label={`Seleccionar clase de ${item.materia.nombre} del ${formatearFecha(item.fecha)}`}
                    />
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <div className="font-semibold text-slate-800 text-xs">
                      {formatearFecha(item.fecha)}
                    </div>
                    <div className="text-[11px] text-slate-400 font-normal">
                      {item.horaInicio} - {item.horaFin}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="font-semibold text-slate-900 text-xs truncate max-w-[150px]" title={item.materia.nombre}>
                      {item.materia.nombre}
                    </div>
                    <span className="font-mono text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200 inline-block mt-0.5">
                      {item.codigo}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    <span className="text-slate-700 font-normal truncate block max-w-[130px]" title={`${item.profesor.nombre} ${item.profesor.apellido}`}>
                      {item.profesor.nombre} {item.profesor.apellido}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-bold text-slate-900 whitespace-nowrap text-xs tabular-nums">
                    {formatMonto(item.importe)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pie de tabla con resumen dinámico autocalculado */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-3 py-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-600">
            <strong>{selectedIds.length}</strong> de {classes.length} seleccionadas
          </span>
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={onClearSelection}
              className="text-slate-500 underline hover:text-slate-800 text-[11px] cursor-pointer"
            >
              Limpiar
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 font-medium">
            Total:
          </span>
          <span className="text-sm font-bold text-slate-900 tabular-nums">
            {formatMonto(selectedTotal)}
          </span>
        </div>
      </div>
    </div>
  );
}
