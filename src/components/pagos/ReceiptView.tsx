// src/components/pagos/ReceiptView.tsx
//
// Comprobante de pago generado estilo ticket (HU-PAG-01).
// Incluye banner verde de éxito, número de comprobante REC-000123,
// detalle de clases, alumno, medio de pago, usuario que registró el cobro
// y botones de acción ("Imprimir", "Enviar por email", "Descargar PDF").

"use client";

import React, { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import type { PaymentReceipt } from "@/modules/pagos/types";
import { formatearFecha } from "@/funciones/formato";
import { useToast } from "@/components/ui/Toast";
import { EncabezadoImpresion } from "@/components/layout/EncabezadoImpresion";

interface ReceiptViewProps {
  receipt: PaymentReceipt;
  onVolver: () => void;
}

export function ReceiptView({ receipt, onVolver }: ReceiptViewProps) {
  const { showToast } = useToast();
  const [enviandoEmail, setEnviandoEmail] = useState(false);

  const formatMonto = (valor: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2,
    }).format(valor);

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = `${receipt.comprobante} - Comprobante de Pago`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  const handleEnviarEmail = () => {
    setEnviandoEmail(true);
    setTimeout(() => {
      setEnviandoEmail(false);
      showToast("success", `Comprobante ${receipt.comprobante} enviado con éxito.`);
    }, 600);
  };

  const handleDescargarPdf = () => {
    // Sigue la misma lógica de impresión (Guardar como PDF) asignando el nombre del archivo
    const originalTitle = document.title;
    document.title = `${receipt.comprobante}_${receipt.alumno.apellido}_${receipt.alumno.nombre}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  const formaPago = receipt.formasPago[0];

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto print:max-w-none print:w-full print:m-0 print:p-0">
      {/* Banner Verde de Éxito con amplio espaciado (Oculto en impresión) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 sm:gap-12 rounded-lg border border-emerald-200 bg-emerald-50 p-5 sm:p-6 shadow-xs print:hidden">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xs">
            <Icon name="check_circle" filled size={26} className="text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-emerald-950">
              ¡Pago registrado exitosamente!
            </h2>
            <p className="text-xs text-emerald-700 mt-0.5">
              Se ha generado el comprobante fiscal y actualizado el estado de las clases.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onVolver}
          className="shrink-0 inline-flex items-center gap-2 rounded-md border border-emerald-300 bg-white px-4 py-2 text-xs font-bold text-emerald-800 shadow-2xs hover:bg-emerald-100/60 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Icon name="arrow_back" size={16} />
          Registrar otro pago
        </button>
      </div>

      {/* Ticket / Comprobante Imprimible */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden print:border-none print:shadow-none print:rounded-none print:m-0 print:p-0 print:w-full print:max-w-none">
        {/* Encabezado institucional para impresión / PDF */}
        <EncabezadoImpresion
          titulo={`Comprobante de Pago · ${receipt.comprobante}`}
          subtitulo={`Alumno: ${receipt.alumno.apellido}, ${receipt.alumno.nombre} · Legajo: ${receipt.alumno.legajo}`}
          filtrosAplicados={[
            `DNI: ${receipt.alumno.dni}`,
            `Medio: ${formaPago?.nombre ?? "Efectivo"}${formaPago?.nroOperacion ? ` (${formaPago.nroOperacion})` : ""}`,
            `Fecha de pago: ${formatearFecha(receipt.fechaPago)}`,
          ]}
        />

        {/* Cabecera del ticket (pantalla) */}
        <div className="border-b border-slate-200 bg-slate-50/70 p-6 flex flex-wrap items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-900 text-white">
              <Icon name="school" size={24} />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Centro Académico
              </span>
              <h1 className="text-lg font-bold text-slate-900">
                Comprobante de Pago
              </h1>
            </div>
          </div>

          <div className="text-right">
            <span className="block text-xs font-semibold text-slate-500">N° de Comprobante</span>
            <span className="text-xl font-extrabold text-blue-900 font-mono tracking-tight">
              {receipt.comprobante}
            </span>
            <span className="block text-xs text-slate-400 mt-0.5">
              Fecha de emisión: {formatearFecha(receipt.fechaPago)}
            </span>
          </div>
        </div>

        {/* Datos del Alumno y Operador */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 border-b border-slate-100 text-xs text-slate-600 bg-white">
          <div>
            <span className="font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Datos del Alumno
            </span>
            <p className="text-sm font-bold text-slate-900">
              {receipt.alumno.apellido}, {receipt.alumno.nombre}
            </p>
            <p className="text-slate-500 mt-0.5">
              Legajo: <span className="font-mono font-semibold">{receipt.alumno.legajo}</span> · DNI: {receipt.alumno.dni}
            </p>
          </div>

          <div className="md:text-right">
            <span className="font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Registro del Cobro
            </span>
            <p className="text-slate-700">
              Operador: <span className="font-semibold text-slate-900">{receipt.registradoPor.nombre} {receipt.registradoPor.apellido}</span>
            </p>
            <p className="text-slate-500 mt-0.5">
              Medio: <strong className="text-slate-800">{formaPago?.nombre ?? "Efectivo"}</strong>
              {formaPago?.nroOperacion ? ` (Ref: ${formaPago.nroOperacion})` : ""}
            </p>
          </div>
        </div>

        {/* Tabla de Clases Abonadas */}
        <div className="p-6">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-3">
            Detalle de Clases Abonadas ({receipt.clases.length})
          </span>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th scope="col" className="py-2.5 px-3">Código</th>
                  <th scope="col" className="py-2.5 px-3">Fecha y Horario</th>
                  <th scope="col" className="py-2.5 px-3">Materia</th>
                  <th scope="col" className="py-2.5 px-3">Profesor</th>
                  <th scope="col" className="py-2.5 px-3 text-right">Importe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {receipt.clases.map((clase) => (
                  <tr key={clase.turnoId}>
                    <td className="py-2.5 px-3 font-mono text-slate-500">{clase.codigo}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">
                      {formatearFecha(clase.fecha)} ({clase.horaInicio} - {clase.horaFin})
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{clase.materiaNombre}</td>
                    <td className="py-2.5 px-3 text-slate-600">{clase.profesorNombre}</td>
                    <td className="py-2.5 px-3 text-right font-semibold text-slate-900">
                      {formatMonto(clase.importe)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Observaciones si las hay */}
          {receipt.observaciones && (
            <div className="mt-4 rounded-md bg-slate-50 p-3 text-xs text-slate-600">
              <span className="font-bold text-slate-700 block mb-0.5">Observaciones:</span>
              <span>{receipt.observaciones}</span>
            </div>
          )}

          {/* Total Abonado */}
          <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4">
            <div className="flex items-center gap-2 text-xs text-emerald-700 font-semibold">
              <Icon name="verified" size={18} className="text-emerald-600" />
              <span>Comprobante emitido válidamente</span>
            </div>
            <div className="text-right">
              <span className="block text-xs font-semibold text-slate-500">Monto Total Abonado</span>
              <span className="text-2xl font-extrabold text-blue-900">
                {formatMonto(receipt.monto)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Acciones: Imprimir, Enviar por email, Descargar PDF */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <button
          type="button"
          onClick={onVolver}
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <Icon name="arrow_back" size={18} />
          Volver a Cobros
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Icon name="print" size={18} className="text-slate-500" />
            Imprimir
          </button>
          <button
            type="button"
            disabled={enviandoEmail}
            onClick={handleEnviarEmail}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Icon name="mail" size={18} className="text-slate-500" />
            {enviandoEmail ? "Enviando..." : "Enviar por email"}
          </button>
          <button
            type="button"
            onClick={handleDescargarPdf}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <Icon name="download" size={18} />
            Descargar PDF
          </button>
        </div>
      </div>
    </div>
  );
}
