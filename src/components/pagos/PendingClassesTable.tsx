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
    <div className="flex flex-col">
      {/* Tabla con scroll horizontal en móviles */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
            <tr>
              <th scope="col" className="w-12 px-4 py-3 text-center">
                <button
                  type="button"
                  onClick={allSelected ? onClearSelection : onSelectAll}
                  className="flex h-5 w-5 items-center justify-center rounded text-blue-600 hover:text-blue-800 focus:outline-none"
                  title={allSelected ? "Desmarcar todas" : "Seleccionar todas"}
                  aria-label={allSelected ? "Desmarcar todas las clases" : "Seleccionar todas las clases"}
                >
                  {allSelected ? (
                    <Icon name="check_box" size={18} className="text-secondary" />
                  ) : someSelected ? (
                    <div className="h-3.5 w-3.5 rounded bg-blue-600" />
                  ) : (
                    <Icon name="check_box_outline_blank" size={18} className="text-slate-400" />
                  )}
                </button>
              </th>
              <th scope="col" className="px-3 py-3">Fecha y Horario</th>
              <th scope="col" className="px-3 py-3">Materia</th>
              <th scope="col" className="px-3 py-3">Profesor</th>
              <th scope="col" className="px-3 py-3 text-right">Importe</th>
              <th scope="col" className="px-4 py-3 text-center">Estado</th>
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
                    className="px-4 py-3 text-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect(item.id)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      aria-label={`Seleccionar clase de ${item.materia.nombre} del ${formatearFecha(item.fecha)}`}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-semibold text-slate-800">
                      {formatearFecha(item.fecha)}
                    </div>
                    <div className="text-xs text-slate-500 font-mono">
                      {item.horaInicio} - {item.horaFin}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-medium text-slate-900">
                      {item.materia.nombre}
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                      {item.codigo}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-slate-700">
                      {item.profesor.nombre} {item.profesor.apellido}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right font-semibold text-slate-900">
                    {formatMonto(item.importe)}
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 border border-amber-200 shadow-2xs">
                      <Icon name="schedule" size={13} className="text-amber-700" />
                      <span>Pendiente</span>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pie de tabla con resumen dinámico autocalculado */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-600">
            <strong>{selectedIds.length}</strong> de {classes.length} clases seleccionadas
          </span>
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={onClearSelection}
              className="text-xs text-slate-500 underline hover:text-slate-800 ml-2"
            >
              Limpiar selección
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">
            Total seleccionado:
          </span>
          <span className="text-base font-bold text-slate-900">
            {formatMonto(selectedTotal)}
          </span>
        </div>
      </div>
    </div>
  );
}
