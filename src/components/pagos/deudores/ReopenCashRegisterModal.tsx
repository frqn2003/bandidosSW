// src/components/pagos/deudores/ReopenCashRegisterModal.tsx
//
// Modal: Reabrir Caja Cerrada (Diagrama 2 - HU-PAG-02).
// Exclusivo para rol Gerente. Exige Motivo de reapertura obligatorio (máx 250 car.).

"use client";

import React, { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { formatearFecha } from "@/funciones/formato";

interface ReopenCashRegisterModalProps {
  cierreId: number;
  fecha: string;
  onClose: () => void;
  onConfirmar: (motivo: string) => Promise<void>;
}

export function ReopenCashRegisterModal({
  cierreId,
  fecha,
  onClose,
  onConfirmar,
}: ReopenCashRegisterModalProps) {
  const [motivo, setMotivo] = useState("");
  const [errorMotivo, setErrorMotivo] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (motivo.trim() === "") {
      setErrorMotivo("El motivo de la reapertura es obligatorio.");
      return;
    }

    setErrorMotivo(null);
    setGuardando(true);
    try {
      await onConfirmar(motivo.trim());
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-reabrir-caja-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative flex w-full max-w-md flex-col rounded-xl border border-slate-200 bg-white shadow-2xl">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <Icon name="lock_open" size={22} />
            </div>
            <div>
              <h2 id="modal-reabrir-caja-title" className="text-lg font-bold text-slate-900">
                Reabrir Caja Diario
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                Fecha: {formatearFecha(fecha)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <div className="flex items-start gap-2">
              <Icon name="warning" size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <p>
                La reapertura habilitará nuevamente el registro y la anulación de pagos para la
                fecha seleccionada. Esta acción quedará registrada en la bitácora de auditoría.
              </p>
            </div>
          </div>

          <div>
            <label
              htmlFor="motivo-reapertura-input"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Motivo de la reapertura <span className="text-red-500">*</span>
            </label>
            <textarea
              id="motivo-reapertura-input"
              rows={3}
              maxLength={250}
              required
              value={motivo}
              onChange={(e) => {
                setMotivo(e.target.value);
                if (errorMotivo) setErrorMotivo(null);
              }}
              placeholder="Indicá por qué es necesario reabrir la caja (ej: corrección de cobranza tardía)..."
              className={`w-full rounded-md border bg-white p-2 text-xs text-slate-900 focus:outline-none focus:ring-1 ${
                errorMotivo
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                  : "border-slate-300 focus:border-blue-600 focus:ring-blue-600"
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

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={guardando}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando || motivo.trim() === ""}
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {guardando ? "Reabriendo..." : "Confirmar Reapertura"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
