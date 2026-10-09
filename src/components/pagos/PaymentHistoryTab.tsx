// src/components/pagos/PaymentHistoryTab.tsx
//
// Pestaña Historial de Pagos (HU-PAG-01).
// Muestra una tabla en modo solo lectura con los pagos pasados del alumno seleccionado,
// ordenados por fecha descendente.

"use client";

import React from "react";
import { Icon } from "@/components/ui/Icon";
import type { PagoResponse } from "@/modules/pagos/types";
import { formatearFecha } from "@/funciones/formato";

interface PaymentHistoryTabProps {
  history: PagoResponse[];
  onSelectReceipt: (receipt: PagoResponse) => void;
  onDownloadReceipt?: (receipt: PagoResponse) => void;
  selectedStudentName?: string;
}

export function PaymentHistoryTab({
  history,
  onSelectReceipt,
  onDownloadReceipt,
  selectedStudentName,
}: PaymentHistoryTabProps) {
  const formatMonto = (valor: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2,
    }).format(valor);

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
          <Icon name="history" size={24} />
        </div>
        <h3 className="font-bold text-slate-800 text-base">
          Sin pagos registrados
        </h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          {selectedStudentName
            ? `No se encontraron comprobantes previos para ${selectedStudentName}.`
            : "Todavía no se han registrado cobros en el sistema."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
            <tr>
              <th scope="col" className="px-4 py-3">N° Comprobante</th>
              <th scope="col" className="px-3 py-3">Fecha de Pago</th>
              <th scope="col" className="px-3 py-3">Alumno</th>
              <th scope="col" className="px-3 py-3">Clases Abonadas</th>
              <th scope="col" className="px-3 py-3">Medio de Pago</th>
              <th scope="col" className="px-3 py-3 text-right">Monto</th>
              <th scope="col" className="px-3 py-3">Registrado Por</th>
              <th scope="col" className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {history.map((pago) => {
              const forma = pago.formasPago[0];
              return (
                <tr
                  key={pago.id}
                  className="hover:bg-slate-50/80 transition-colors"
                >
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => onSelectReceipt(pago)}
                      className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-blue-900 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded border border-blue-200 cursor-pointer transition-colors"
                      title="Ver ticket detallado"
                    >
                      <Icon name="receipt_long" size={15} className="text-secondary" />
                      {pago.comprobante}
                    </button>
                  </td>
                  <td className="px-3 py-3 font-medium text-slate-800">
                    {formatearFecha(pago.fechaPago)}
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-semibold text-slate-900">
                      {pago.alumno.apellido}, {pago.alumno.nombre}
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                      {pago.alumno.legajo}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-700">
                    <span className="font-semibold text-slate-900">
                      {pago.clases.length} {pago.clases.length === 1 ? "clase" : "clases"}
                    </span>
                    <span className="text-slate-400 block truncate max-w-xs">
                      {pago.clases.map((c) => c.materiaNombre).join(", ")}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs">
                    <span className="font-semibold text-slate-800">
                      {forma?.nombre ?? "Efectivo"}
                    </span>
                    {forma?.nroOperacion && (
                      <span className="block text-slate-400 font-mono">
                        Ref: {forma.nroOperacion}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right font-bold text-slate-900">
                    {formatMonto(pago.monto)}
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-600">
                    {pago.registradoPor.nombre} {pago.registradoPor.apellido}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => onSelectReceipt(pago)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 shadow-2xs hover:border-secondary hover:text-secondary hover:bg-secondary/5 transition-all cursor-pointer"
                        title="Ver factura / comprobante"
                        aria-label={`Ver comprobante ${pago.comprobante}`}
                      >
                        <Icon name="visibility" size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onDownloadReceipt
                            ? onDownloadReceipt(pago)
                            : onSelectReceipt(pago)
                        }
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 shadow-2xs hover:border-secondary hover:text-secondary hover:bg-secondary/5 transition-all cursor-pointer"
                        title="Descargar comprobante en PDF"
                        aria-label={`Descargar comprobante ${pago.comprobante}`}
                      >
                        <Icon name="download" size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
