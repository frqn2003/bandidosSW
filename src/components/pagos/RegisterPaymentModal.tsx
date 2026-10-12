// src/components/pagos/RegisterPaymentModal.tsx
//
// Modal enfocado para registrar cobros de clases dictadas (HU-PAG-01).
// Libera el espacio en pantalla principal para tener una tabla de alumnos a ancho completo.
// Contiene la selección de clases pendientes a la izquierda y el formulario de cobro a la derecha.

"use client";

import React from "react";
import { Icon } from "@/components/ui/Icon";
import type { StudentPaymentSummary, PendingClass, FormaPagoResponse } from "@/modules/pagos/types";
import { PendingClassesTable } from "./PendingClassesTable";
import { PaymentForm, type PaymentFormData } from "./PaymentForm";

interface RegisterPaymentModalProps {
  open: boolean;
  student: StudentPaymentSummary | null;
  pendingClasses: PendingClass[];
  selectedClassIds: number[];
  onToggleSelectClass: (id: number) => void;
  onSelectAllClasses: () => void;
  onClearClassSelection: () => void;
  selectedTotal: number;
  selectedCount: number;
  formasPagoCatalogo: FormaPagoResponse[];
  onIniciarRegistro: (data: PaymentFormData) => void;
  onClose: () => void;
}

export function RegisterPaymentModal({
  open,
  student,
  pendingClasses,
  selectedClassIds,
  onToggleSelectClass,
  onSelectAllClasses,
  onClearClassSelection,
  selectedTotal,
  selectedCount,
  formasPagoCatalogo,
  onIniciarRegistro,
  onClose,
}: RegisterPaymentModalProps) {
  if (!open || !student) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="register-payment-title"
    >
      <div className="relative w-full max-w-5xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header del Modal */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-5 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
              <Icon name="payments" size={20} />
            </div>
            <div>
              <h2 id="register-payment-title" className="text-base font-bold text-slate-900">
                Registrar Cobro de Clases
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-bold text-slate-900 text-xs">
                  {student.apellido}, {student.nombre}
                </span>
                <span className="text-[11px] text-slate-400">
                  DNI: {student.dni}
                </span>
                <span className="font-mono text-xs font-semibold text-slate-700 rounded bg-slate-100 px-2 py-0.5 border border-slate-200">
                  {student.legajo}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors cursor-pointer"
            aria-label="Cerrar ventana"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* Cuerpo del Modal: 2 Columnas sin scroll forzado */}
        <div className="p-4 sm:p-5">
          {pendingClasses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-2.5">
                <Icon name="verified" size={24} />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                El alumno está al día
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                {student.apellido}, {student.nombre} no tiene clases dictadas pendientes de cobro en este momento.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-4 rounded-md bg-slate-100 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
              {/* Columna Izquierda: Clases pendientes */}
              <div className="lg:col-span-7 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <Icon name="event_available" size={15} className="text-blue-600" />
                    <span>Selección de Clases a Cobrar ({pendingClasses.length})</span>
                  </div>
                  {selectedCount > 0 && (
                    <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                      {selectedCount} de {pendingClasses.length} seleccionadas
                    </span>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 overflow-hidden shadow-2xs flex-1 flex flex-col bg-white">
                  <PendingClassesTable
                    classes={pendingClasses}
                    selectedIds={selectedClassIds}
                    onToggleSelect={onToggleSelectClass}
                    onSelectAll={onSelectAllClasses}
                    onClearSelection={onClearClassSelection}
                    selectedTotal={selectedTotal}
                  />
                </div>
              </div>

              {/* Columna Derecha: Formulario de Pago */}
              <div className="lg:col-span-5 flex flex-col gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <Icon name="credit_card" size={15} className="text-blue-600" />
                  <span>Detalle y Medio de Pago</span>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 shadow-2xs flex-1 flex flex-col">
                  <PaymentForm
                    montoCalculado={selectedTotal}
                    clasesSeleccionadasCount={selectedCount}
                    formasPagoCatalogo={formasPagoCatalogo}
                    onIniciarRegistro={onIniciarRegistro}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
