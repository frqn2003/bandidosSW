// src/components/pagos/PaymentForm.tsx
//
// Formulario de Cobro (HU-PAG-01).
// Permite seleccionar el medio de pago (Efectivo / Transferencia).
// Monto de solo lectura autocalculado de las clases seleccionadas.
// N° de operación obligatorio si la forma de pago lo requiere.
// Fecha de pago por defecto hoy, validada sin fechas futuras.
// Observaciones opcionales (máx 200 caracteres).
// Botón principal "Registrar pago" en Azul.

"use client";

import React, { useState, useId } from "react";
import { Icon } from "@/components/ui/Icon";
import { hoyAR } from "@/contracts/pago";
import type { FormaPagoResponse } from "@/modules/pagos/types";

export interface PaymentFormData {
  formasPago: {
    formaPagoId: number;
    nombre: string;
    nroOperacion: string | null;
  }[];
  fechaPago: string;
  observaciones: string | null;
}

interface PaymentFormProps {
  montoCalculado: number;
  clasesSeleccionadasCount: number;
  formasPagoCatalogo: FormaPagoResponse[];
  onIniciarRegistro: (data: PaymentFormData) => void;
}

export function PaymentForm({
  montoCalculado,
  clasesSeleccionadasCount,
  formasPagoCatalogo,
  onIniciarRegistro,
}: PaymentFormProps) {
  const montoInputId = useId();
  const nroOperacionInputId = useId();
  const fechaInputId = useId();
  const obsInputId = useId();

  const fechaHoy = hoyAR();

  // Estados del formulario
  // Por defecto seleccionamos "Efectivo" si está disponible, o el primer medio
  const [selectedFormaPagoId, setSelectedFormaPagoId] = useState<number>(() => {
    const efectivo = formasPagoCatalogo.find((f) => f.nombre.toLowerCase().includes("efectivo"));
    return efectivo?.id ?? formasPagoCatalogo[0]?.id ?? 1;
  });

  const [nroOperacion, setNroOperacion] = useState("");
  const [fechaPago, setFechaPago] = useState(fechaHoy);
  const [observaciones, setObservaciones] = useState("");
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);

  const selectedCatalogo = formasPagoCatalogo.find((f) => f.id === selectedFormaPagoId);
  const requiereNroOperacion = selectedCatalogo?.requiereNroOperacion ?? false;

  const formatMonto = (valor: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2,
    }).format(valor);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorValidacion(null);

    if (clasesSeleccionadasCount === 0) {
      setErrorValidacion("Debe seleccionar al menos una clase pendiente de la tabla.");
      return;
    }

    if (requiereNroOperacion && !nroOperacion.trim()) {
      setErrorValidacion(
        `El N° de operación o referencia es obligatorio para pagos por ${selectedCatalogo?.nombre ?? "Transferencia"}.`
      );
      return;
    }

    if (fechaPago > fechaHoy) {
      setErrorValidacion("La fecha de pago no puede ser futura.");
      return;
    }

    onIniciarRegistro({
      formasPago: [
        {
          formaPagoId: selectedFormaPagoId,
          nombre: selectedCatalogo?.nombre ?? "Medio de Pago",
          nroOperacion: requiereNroOperacion ? nroOperacion.trim() : null,
        },
      ],
      fechaPago,
      observaciones: observaciones.trim() || null,
    });
  };

  const isFormDisabled = clasesSeleccionadasCount === 0;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Aviso de validación */}
      {errorValidacion && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <Icon name="error" size={16} className="shrink-0 mt-0.5 text-status-danger" />
          <span>{errorValidacion}</span>
        </div>
      )}

      {/* Monto Autocalculado (Solo Lectura) */}
      <div>
        <label
          htmlFor={montoInputId}
          className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600"
        >
          Monto a Cobrar (Autocalculado)
        </label>
        <div className="relative">
          <input
            id={montoInputId}
            type="text"
            readOnly
            disabled
            value={formatMonto(montoCalculado)}
            className="w-full rounded-md border border-slate-300 bg-slate-100 px-3.5 py-2.5 text-base font-bold text-slate-800 shadow-xs cursor-not-allowed focus:outline-none"
          />
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {clasesSeleccionadasCount === 0
            ? "Selecciona al menos una clase en la tabla para habilitar el pago"
            : `Suma total de las ${clasesSeleccionadasCount} ${clasesSeleccionadasCount === 1 ? "clase seleccionada" : "clases seleccionadas"}`}
        </p>
      </div>

      {/* Medio de pago */}
      <div>
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">
          Medio de pago <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 gap-2.5">
          {formasPagoCatalogo.map((forma) => {
            const isSelected = selectedFormaPagoId === forma.id;
            const isEfectivo = forma.nombre.toLowerCase().includes("efectivo");
            return (
              <button
                key={forma.id}
                type="button"
                onClick={() => {
                  setSelectedFormaPagoId(forma.id);
                  setErrorValidacion(null);
                }}
                className={`flex items-center justify-center gap-2 rounded-md border p-3 text-sm font-semibold transition-all ${
                  isSelected
                    ? "border-blue-600 bg-blue-50 text-blue-700 shadow-xs ring-1 ring-blue-600"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {isEfectivo ? (
                  <Icon name="payments" size={18} />
                ) : (
                  <Icon name="credit_card" size={18} />
                )}
                <span>{forma.nombre}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* N° de operación (Obligatorio en Transferencia) */}
      {requiereNroOperacion && (
        <div>
          <label
            htmlFor={nroOperacionInputId}
            className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600"
          >
            N° de Operación / Referencia <span className="text-red-500">*</span>
          </label>
          <input
            id={nroOperacionInputId}
            type="text"
            required={requiereNroOperacion}
            maxLength={30}
            value={nroOperacion}
            onChange={(e) => {
              setNroOperacion(e.target.value.replace(/[^A-Za-z0-9]/g, ""));
              setErrorValidacion(null);
            }}
            placeholder="Ej. TRF981248"
            className="w-full rounded-md border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-xs focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none font-mono"
          />
          <p className="mt-1 text-xs text-slate-500">
            Obligatorio para pagos electrónicos. Máximo 30 caracteres alfanuméricos.
          </p>
        </div>
      )}

      {/* Fecha de pago */}
      <div>
        <label
          htmlFor={fechaInputId}
          className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600"
        >
          Fecha de pago <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            id={fechaInputId}
            type="date"
            max={fechaHoy}
            value={fechaPago}
            onChange={(e) => {
              setFechaPago(e.target.value);
              setErrorValidacion(null);
            }}
            className="w-full rounded-md border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-xs focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
          />
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Fecha en que se percibió el cobro (no admite fechas futuras).
        </p>
      </div>

      {/* Observaciones */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label
            htmlFor={obsInputId}
            className="block text-xs font-bold uppercase tracking-wider text-slate-600"
          >
            Observaciones (Opcional)
          </label>
          <span className="text-xs text-slate-400">
            {observaciones.length}/200
          </span>
        </div>
        <textarea
          id={obsInputId}
          rows={2}
          maxLength={200}
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          placeholder="Notas adicionales sobre el cobro (ej. Pago presencial en recepción)..."
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-xs focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none resize-none"
        />
      </div>

      {/* Botón Principal "Registrar pago" (Azul) */}
      <button
        type="submit"
        disabled={isFormDisabled}
        className={`mt-2 flex w-full items-center justify-center gap-2 rounded-md py-3 px-4 text-sm font-bold text-white shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
          isFormDisabled
            ? "bg-slate-300 cursor-not-allowed opacity-75"
            : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 cursor-pointer"
        }`}
      >
        <Icon name="payments" size={18} />
        Registrar pago
      </button>
    </form>
  );
}
