// src/components/pagos/AnnulPaymentModal.tsx
//
// Modal: Confirmación de Anulación de Pago (Diagrama 4 - HU-PAG-02).
// Muestra el detalle del comprobante REC a anular y exige Motivo obligatorio.
// Botón Confirmar en verde, Cancelar en gris.

"use client";

import React, { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { formatearFecha } from "@/funciones/formato";
import type { PagoResponse } from "@/contracts/pago";

interface AnnulPaymentModalProps {
  pago: PagoResponse;
  onClose: () => void;
  onConfirmar: (motivo: string) => Promise<void>;
}

export function AnnulPaymentModal({
  pago,
  onClose,
  onConfirmar,
}: AnnulPaymentModalProps) {
  const [motivo, setMotivo] = useState("");
  const [errorMotivo, setErrorMotivo] = useState<string | null>(null);
  const [anulando, setAnulando] = useState(false);

  const formatoMoneda = (val: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2,
    }).format(val);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (motivo.trim() === "") {
      setErrorMotivo("El motivo de la anulación es obligatorio.");
      return;
    }

    setErrorMotivo(null);
    setAnulando(true);
    try {
      await onConfirmar(motivo.trim());
    } finally {
      setAnulando(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-anular-pago-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative flex w-full max-w-lg flex-col rounded-xl border border-slate-200 bg-white shadow-2xl">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-700">
              <Icon name="cancel" size={22} />
            </div>
            <div>
              <h2 id="modal-anular-pago-title" className="text-lg font-bold text-slate-900">
                Anular Pago Registrado
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                Comprobante: {pago.comprobante}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={anulando}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Advertencia de impacto de negocio */}
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            <div className="flex items-start gap-2">
              <Icon name="warning" size={16} className="text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">Esta acción no puede deshacerse:</p>
                <ul className="list-disc pl-4 space-y-0.5 text-[11px] opacity-90">
                  <li>El comprobante {pago.comprobante} quedará anulado y no se reutiliza.</li>
                  <li>Las clases asociadas volverán al estado impago, reactivando la deuda del alumno.</li>
                  <li>La anulación quedará asentada en la bitácora de auditoría con tu usuario.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Detalle del comprobante a anular */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Alumno:</span>
              <span className="font-bold text-slate-800">
                {pago.alumno.apellido}, {pago.alumno.nombre} ({pago.alumno.legajo})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Fecha de pago:</span>
              <span className="font-medium text-slate-800 font-mono">
                {formatearFecha(pago.fechaPago)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Clases incluidas ({pago.clases.length}):</span>
              <span className="font-medium text-slate-700 truncate max-w-xs">
                {pago.clases.map((c) => c.materiaNombre).join(", ")}
              </span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-200">
              <span className="font-bold text-slate-700">Monto total abonado:</span>
              <span className="font-mono text-sm font-extrabold text-slate-900">
                {formatoMoneda(pago.monto)}
              </span>
            </div>
          </div>

          {/* Campo Motivo (Obligatorio) */}
          <div>
            <label
              htmlFor="motivo-anulacion-input"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Motivo de la anulación <span className="text-red-500">*</span>
            </label>
            <textarea
              id="motivo-anulacion-input"
              rows={3}
              maxLength={250}
              required
              value={motivo}
              onChange={(e) => {
                setMotivo(e.target.value);
                if (errorMotivo) setErrorMotivo(null);
              }}
              placeholder="Indicá el motivo exacto por el cual se anula el comprobante (ej: error en medio de pago, clase incorrecta)..."
              className={`w-full rounded-md border bg-white p-2 text-xs text-slate-900 focus:outline-none focus:ring-1 ${
                errorMotivo
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                  : "border-slate-300 focus:border-emerald-600 focus:ring-emerald-600"
              }`}
            />
            <div className="flex justify-between items-center mt-0.5">
              {errorMotivo ? (
                <p className="text-[11px] text-red-600 font-medium">{errorMotivo}</p>
              ) : (
                <span />
              )}
              <span className="text-[10px] text-slate-400 font-mono">{motivo.length}/250</span>
            </div>
          </div>

          {/* Botones de acción (Confirmar verde, Cancelar gris según Diagrama 4) */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={anulando}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={anulando || motivo.trim() === ""}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {anulando ? "Anulando comprobante..." : "Confirmar anulación"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
