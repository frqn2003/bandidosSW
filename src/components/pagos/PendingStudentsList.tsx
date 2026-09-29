// src/components/pagos/PendingStudentsList.tsx
//
// Listado de alumnos con clases dictadas impagas y pagos pendientes.
// Se muestra en la sección de clases pendientes cuando no hay un alumno preseleccionado.
// Al clickear en cualquier alumno o en "Cobrar", se selecciona para proceder al registro.

"use client";

import React from "react";
import { Icon } from "@/components/ui/Icon";
import type { StudentPaymentSummary } from "@/modules/pagos/types";

interface PendingStudentsListProps {
  studentsWithDebt: StudentPaymentSummary[];
  onSelectStudent: (student: StudentPaymentSummary) => void;
}

export function PendingStudentsList({
  studentsWithDebt,
  onSelectStudent,
}: PendingStudentsListProps) {
  const formatMonto = (valor: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2,
    }).format(valor);

  if (studentsWithDebt.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500 p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-3">
          <Icon name="groups" size={24} />
        </div>
        <h3 className="font-bold text-slate-800 text-base">
          ¡Excelente! No hay alumnos con pagos pendientes
        </h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          Todos los alumnos activos se encuentran al día con sus clases dictadas.
        </p>
      </div>
    );
  }

  const totalGlobalDeuda = studentsWithDebt.reduce(
    (acc, curr) => acc + curr.totalDeudaPendiente,
    0
  );

  return (
    <div className="flex flex-col">
      {/* Aviso superior informativo */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3 text-xs">
        <div className="flex items-center gap-2 text-slate-600">
          <Icon name="groups" size={16} className="text-secondary" />
          <span>
            Mostrando <strong>{studentsWithDebt.length}</strong> alumnos con deuda acumulada
          </span>
        </div>
        <div className="text-right text-slate-500">
          Deuda total en mora: <strong className="text-slate-800 font-semibold">{formatMonto(totalGlobalDeuda)}</strong>
        </div>
      </div>

      {/* Tabla de alumnos con deuda */}
      <div className="overflow-x-auto scrollbar-none">
        <table className="w-full text-left text-xs sm:text-sm text-slate-600">
          <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <tr>
              <th scope="col" className="px-3 py-2.5">Alumno</th>
              <th scope="col" className="px-2 py-2.5 text-center whitespace-nowrap">Legajo</th>
              <th scope="col" className="px-2 py-2.5 text-center whitespace-nowrap">Clases Impagas</th>
              <th scope="col" className="px-2.5 py-2.5 text-right whitespace-nowrap">Deuda Pendiente</th>
              <th scope="col" className="px-3 py-2.5 text-right whitespace-nowrap">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {studentsWithDebt.map((student) => (
              <tr
                key={student.id}
                onClick={() => onSelectStudent(student)}
                className="cursor-pointer transition-colors hover:bg-blue-50/60 group"
              >
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700 text-xs group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      {student.nombre[0]}
                      {student.apellido[0]}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors truncate">
                        {student.apellido}, {student.nombre}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        DNI: {student.dni}
                      </div>
                    </div>
                  </div>
                </td>

                <td className="px-2 py-2.5 text-center whitespace-nowrap">
                  <span className="font-mono text-xs font-semibold text-slate-700 rounded bg-slate-100 px-2 py-0.5 border border-slate-200 whitespace-nowrap inline-block">
                    {student.legajo}
                  </span>
                </td>

                <td className="px-2 py-2.5 text-center whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200 shadow-2xs">
                    <Icon name="schedule" size={13} className="text-amber-700 shrink-0" />
                    <span className="whitespace-nowrap">
                      {student.clasesPendientesCount} {student.clasesPendientesCount === 1 ? "clase" : "clases"}
                    </span>
                  </span>
                </td>

                <td className="px-2.5 py-2.5 text-right font-bold text-slate-900 text-xs sm:text-sm whitespace-nowrap tabular-nums">
                  {formatMonto(student.totalDeudaPendiente)}
                </td>

                <td className="px-3 py-2.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => onSelectStudent(student)}
                    className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-2.5 py-1 text-xs font-bold text-white shadow-2xs hover:bg-blue-700 transition-colors cursor-pointer"
                  >
                    <Icon name="payments" size={14} />
                    Cobrar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
