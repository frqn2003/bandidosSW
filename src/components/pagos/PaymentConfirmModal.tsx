// src/components/pagos/PaymentConfirmModal.tsx
//
// Modal de confirmación para el registro de pago (HU-PAG-01).
// Presenta fondo oscuro, detalle de clases a cobrar, medios de pago,
// total autocalculado, botón "Confirmar" (Verde) y "Cancelar" (Gris).

"use client";

import React from "react";
import { Icon } from "@/components/ui/Icon";
import type { StudentPaymentSummary, PendingClass } from "@/modules/pagos/types";
import type { PaymentFormData } from "./PaymentForm";
import { formatearFecha } from "@/funciones/formato";

interface PaymentConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  confirmando: boolean;
  student: StudentPaymentSummary;
  selectedClasses: PendingClass[];
  formData: PaymentFormData;
  total: number;
}

export function PaymentConfirmModal({
  open,
  onClose,
  onConfirm,
  confirmando,
  student,
  selectedClasses,
  formData,
  total,
}: PaymentConfirmModalProps) {
  if (!open) return null;

  const formatMonto = (valor: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2,
    }).format(valor);

  const medioPago = formData.formasPago[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay oscuro */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={confirmando ? undefined : onClose}
        aria-hidden="true"
      />

      {/* Panel del modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-confirmar-pago-title"
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-lg bg-white shadow-xl transition-all"
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-700">
              <Icon name="check_circle" filled size={20} className="text-secondary" />
            </div>
            <div>
              <h3
                id="modal-confirmar-pago-title"
                className="text-base font-bold text-slate-900"
              >
                Confirmar Registro de Pago
              </h3>
              <p className="text-xs text-slate-500">
                Verifica los datos antes de emitir el comprobante
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={confirmando}
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* Cuerpo del modal con el resumen */}
        <div className="space-y-4 px-6 py-5 text-sm text-slate-600">
          {/* Datos del alumno */}
          <div className="rounded-md border border-slate-200 bg-slate-50/70 p-3.5">
            <span className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Alumno
            </span>
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 text-sm">
                  {student.apellido}, {student.nombre}
                </span>
                <span className="ml-2 font-mono text-xs text-slate-500">
                  {student.legajo} · DNI {student.dni}
                </span>
              </div>
            </div>
          </div>

          {/* Detalle de clases seleccionadas */}
          <div>
            <span className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Clases a cobrar ({selectedClasses.length})
            </span>
            <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 rounded-md border border-slate-200 bg-white">
              {selectedClasses.map((clase) => (
                <div key={clase.id} className="flex items-center justify-between px-3.5 py-2 text-xs">
                  <div>
                    <span className="font-semibold text-slate-800">
                      {clase.materia.nombre}
                    </span>
                    <span className="text-slate-400 ml-1.5">
                      · {formatearFecha(clase.fecha)} ({clase.horaInicio})
                    </span>
                  </div>
                  <span className="font-medium text-slate-700">
                    {formatMonto(clase.importe)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Datos del pago */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-md border border-slate-200 p-3 bg-slate-50/40">
              <span className="block font-semibold text-slate-500 mb-0.5">Medio de pago</span>
              <span className="font-bold text-slate-800 text-sm">
                {medioPago?.nombre}
              </span>
              {medioPago?.nroOperacion && (
                <span className="block text-slate-500 font-mono mt-0.5">
                  Ref: {medioPago.nroOperacion}
                </span>
              )}
            </div>

            <div className="rounded-md border border-slate-200 p-3 bg-slate-50/40">
              <span className="block font-semibold text-slate-500 mb-0.5">Fecha de pago</span>
              <span className="font-bold text-slate-800 text-sm">
                {formatearFecha(formData.fechaPago)}
              </span>
            </div>
          </div>

          {/* Total Destacado */}
          <div className="flex items-center justify-between rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3">
            <span className="text-sm font-bold text-emerald-900">Total a registrar:</span>
            <span className="text-xl font-extrabold text-emerald-700">
              {formatMonto(total)}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Icon name="warning" size={16} className="shrink-0 text-amber-500" />
            <span>Al confirmar, las clases pasarán a estado &quot;Pagada&quot; y se generará el comprobante fiscal REC.</span>
          </div>
        </div>

        {/* Footer con botones: Confirmar (Verde) y Cancelar (Gris) */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            disabled={confirmando}
            onClick={onClose}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-xs hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={confirmando}
            onClick={onConfirm}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-5 py-2 text-sm font-bold text-white shadow-xs hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 cursor-pointer disabled:opacity-50"
          >
            {confirmando ? "Registrando..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
