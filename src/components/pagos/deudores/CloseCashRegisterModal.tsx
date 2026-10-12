// src/components/pagos/deudores/CloseCashRegisterModal.tsx
//
// Modal: Cerrar Caja (Diagrama 2 - HU-PAG-02).
// Solicita Efectivo Contado (obligatorio), autocalcula la Diferencia (no editable).
// Regla: Si la diferencia != 0, exige Observaciones (obligatorias, máx 250 car.).
// Botón Confirmar en verde, Cancelar en gris.

"use client";

import React, { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { formatearFecha } from "@/funciones/formato";

interface CloseCashRegisterModalProps {
  fecha: string;
  efectivoEsperado: number;
  onClose: () => void;
  onConfirmar: (efectivoContado: number, observaciones?: string) => Promise<void>;
}

export function CloseCashRegisterModal({
  fecha,
  efectivoEsperado,
  onClose,
  onConfirmar,
}: CloseCashRegisterModalProps) {
  const [efectivoContadoInput, setEfectivoContadoInput] = useState<string>("");
  const [observaciones, setObservaciones] = useState<string>("");
  const [errorObs, setErrorObs] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const formatoMoneda = (val: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2,
    }).format(val);

  const efectivoContadoNum =
    efectivoContadoInput.trim() === "" ? null : Number(efectivoContadoInput);

  const diferencia =
    efectivoContadoNum !== null ? efectivoContadoNum - efectivoEsperado : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (efectivoContadoNum === null || isNaN(efectivoContadoNum) || efectivoContadoNum < 0) {
      return;
    }

    // Regla: si diferencia != 0, Observaciones son OBLIGATORIAS
    if (diferencia !== 0 && observaciones.trim() === "") {
      setErrorObs("Al existir diferencia entre el efectivo esperado y contado, las observaciones son obligatorias.");
      return;
    }

    setErrorObs(null);
    setGuardando(true);
    try {
      await onConfirmar(efectivoContadoNum, observaciones.trim() || undefined);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-cierre-caja-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative flex w-full max-w-lg flex-col rounded-xl border border-slate-200 bg-white shadow-2xl">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <Icon name="lock" size={22} />
            </div>
            <div>
              <h2 id="modal-cierre-caja-title" className="text-lg font-bold text-slate-900">
                Confirmar Cierre de Caja
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                Fecha a conciliar: {formatearFecha(fecha)}
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
          {/* Resumen del Efectivo Esperado en el Sistema */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 flex items-center justify-between">
            <div>
              <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Efectivo registrado en sistema
              </span>
              <span className="text-xs text-slate-400">
                Cobros vigentes en efectivo ingresados hoy
              </span>
            </div>
            <span className="font-mono text-base font-bold text-slate-800">
              {formatoMoneda(efectivoEsperado)}
            </span>
          </div>

          {/* Input Efectivo Contado (Obligatorio) */}
          <div>
            <label
              htmlFor="efectivo-contado-input"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Efectivo contado físico (Arqueo) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                $
              </span>
              <input
                id="efectivo-contado-input"
                type="number"
                step="0.01"
                min="0"
                required
                value={efectivoContadoInput}
                onChange={(e) => {
                  setEfectivoContadoInput(e.target.value);
                  setErrorObs(null);
                }}
                placeholder="0.00"
                className="w-full rounded-md border border-slate-300 bg-white py-2 pl-7 pr-3 text-sm font-mono font-bold text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Ingresá el importe total del dinero en efectivo físicamente disponible en la caja.
            </p>
          </div>

          {/* Diferencia calculada automáticamente (No editable) */}
          {diferencia !== null && (
            <div
              className={`rounded-lg border p-3 flex items-center justify-between transition-colors ${
                diferencia === 0
                  ? "border-emerald-200 bg-emerald-50/60 text-emerald-900"
                  : diferencia > 0
                  ? "border-amber-200 bg-amber-50/60 text-amber-900"
                  : "border-red-200 bg-red-50/60 text-red-900"
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon
                  name={diferencia === 0 ? "check_circle" : "error"}
                  size={18}
                  className={
                    diferencia === 0
                      ? "text-emerald-600"
                      : diferencia > 0
                      ? "text-amber-600"
                      : "text-red-600"
                  }
                />
                <div>
                  <span className="block text-xs font-bold">
                    {diferencia === 0
                      ? "Caja Cuadrada"
                      : diferencia > 0
                      ? "Sobrante de caja"
                      : "Faltante de caja"}
                  </span>
                  <span className="text-[11px] opacity-80">
                    Diferencia (Contado menos Esperado)
                  </span>
                </div>
              </div>
              <span className="font-mono text-sm font-bold">
                {diferencia > 0 ? `+${formatoMoneda(diferencia)}` : formatoMoneda(diferencia)}
              </span>
            </div>
          )}

          {/* Campo Observaciones (Obligatorio si diferencia != 0) */}
          <div>
            <label
              htmlFor="observaciones-input"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Observaciones del cierre{" "}
              {diferencia !== 0 && diferencia !== null && (
                <span className="text-red-600 font-bold">* (Obligatorio por diferencia)</span>
              )}
            </label>
            <textarea
              id="observaciones-input"
              rows={3}
              maxLength={250}
              value={observaciones}
              onChange={(e) => {
                setObservaciones(e.target.value);
                if (errorObs) setErrorObs(null);
              }}
              placeholder={
                diferencia !== 0 && diferencia !== null
                  ? "Explicá el motivo del sobrante o faltante de caja..."
                  : "Notas opcionales del turno o cierre..."
              }
              className={`w-full rounded-md border bg-white p-2 text-xs text-slate-900 focus:outline-none focus:ring-1 ${
                errorObs
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                  : "border-slate-300 focus:border-emerald-600 focus:ring-emerald-600"
              }`}
            />
            <div className="flex justify-between items-center mt-0.5">
              {errorObs ? (
                <p className="text-[11px] text-red-600 font-medium">{errorObs}</p>
              ) : (
                <span />
              )}
              <span className="text-[10px] text-slate-400 font-mono">
                {observaciones.length}/250
              </span>
            </div>
          </div>

          {/* Botones de acción */}
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
              disabled={
                guardando ||
                efectivoContadoNum === null ||
                (diferencia !== 0 && observaciones.trim() === "")
              }
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {guardando ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Cerrando caja...
                </>
              ) : (
                <>
                  <Icon name="check" size={16} />
                  Confirmar Cierre de Caja
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
