// src/components/pagos/deudores/AccountStatementModal.tsx
//
// Modal: Estado de Cuenta del Alumno (Diagrama 1 y 4 - HU-PAG-02).
// Modo LECTURA. Muestra los movimientos cronológicos (cargos y pagos) y el saldo acumulado.
// Regla: Los elementos cancelados y pagos anulados se distinguen, tienen estilo atenuado/tachado
// y no suman al saldo acumulado (afectaSaldo = false).

"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { formatearFecha } from "@/funciones/formato";
import { obtenerEstadoCuenta } from "@/data/deuda";
import type { EstadoCuentaResponse, MovimientoEstadoCuenta } from "@/contracts/deuda";

interface AccountStatementModalProps {
  alumnoId: number;
  alumnoNombre: string;
  onClose: () => void;
  onAnularPago?: (pagoId: number, comprobante: string) => void;
}

export function AccountStatementModal({
  alumnoId,
  alumnoNombre,
  onClose,
  onAnularPago,
}: AccountStatementModalProps) {
  const [data, setData] = useState<EstadoCuentaResponse | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    obtenerEstadoCuenta(alumnoId)
      .then((res) => {
        if (activo) setData(res);
      })
      .catch((err) => {
        console.error("Error al cargar el estado de cuenta:", err);
        if (activo) setData(null);
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, [alumnoId]);

  const formatoMoneda = (val: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2,
    }).format(val);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-estado-cuenta-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col rounded-xl border border-slate-200 bg-white shadow-2xl">
        {/* Cabecera del modal */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
              <Icon name="account_balance_wallet" size={22} />
            </div>
            <div>
              <h2 id="modal-estado-cuenta-title" className="text-lg font-bold text-slate-900">
                Estado de Cuenta — {alumnoNombre}
              </h2>
              {data && (
                <p className="text-xs text-slate-500 font-mono">
                  Legajo: {data.alumno.legajo} · DNI: {data.alumno.dni}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* Resumen de Saldo */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-6 py-3">
          <div className="text-xs text-slate-600">
            Modo <strong className="font-semibold text-slate-800">LECTURA</strong>: movimientos
            cronológicos de cargos por clases y créditos por cobranzas.
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Saldo Pendiente Actual:
            </span>
            <span
              className={`text-base font-bold font-mono px-2.5 py-0.5 rounded ${
                (data?.saldo ?? 0) > 0
                  ? "bg-red-100 text-red-800 border border-red-200"
                  : "bg-emerald-100 text-emerald-800 border border-emerald-200"
              }`}
            >
              {data ? formatoMoneda(data.saldo) : "..."}
            </span>
          </div>
        </div>

        {/* Tabla de movimientos */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {cargando ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mb-3" />
              <p className="text-sm">Cargando movimientos de la cuenta...</p>
            </div>
          ) : !data || data.movimientos.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <Icon name="receipt_long" size={36} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-medium text-slate-700">Sin movimientos registrados</p>
              <p className="text-xs text-slate-400">Este alumno no posee cargos ni pagos en su historial.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th scope="col" className="px-3 py-2.5">Fecha / Hora</th>
                    <th scope="col" className="px-3 py-2.5">Tipo</th>
                    <th scope="col" className="px-3 py-2.5">Referencia</th>
                    <th scope="col" className="px-3 py-2.5">Detalle / Concepto</th>
                    <th scope="col" className="px-3 py-2.5 text-right">Cargo (+)</th>
                    <th scope="col" className="px-3 py-2.5 text-right">Crédito (-)</th>
                    <th scope="col" className="px-3 py-2.5 text-right">Saldo Acumulado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {data.movimientos.map((mov, idx) => {
                    const noSuma = !mov.afectaSaldo;

                    return (
                      <tr
                        key={`${mov.tipo}-${mov.referenciaId}-${idx}`}
                        className={`transition-colors ${
                          noSuma
                            ? "bg-slate-50/60 text-slate-400 opacity-70"
                            : "hover:bg-slate-50/80"
                        }`}
                      >
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className={noSuma ? "line-through" : "font-medium text-slate-800"}>
                            {formatearFecha(mov.fecha)}
                          </span>
                          <span className="block text-[10px] text-slate-400 font-mono">
                            {mov.hora} hs
                          </span>
                        </td>

                        <td className="px-3 py-2.5 whitespace-nowrap">
                          {mov.tipo === "Clase" ? (
                            <span
                              className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                mov.estado === "Cancelado"
                                  ? "bg-slate-200 text-slate-600 line-through"
                                  : "bg-blue-50 text-blue-700 border border-blue-200"
                              }`}
                            >
                              <Icon name="event" size={12} />
                              {mov.estado}
                            </span>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                mov.estado === "Anulado"
                                  ? "bg-red-50 text-red-700 border border-red-200 line-through"
                                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              }`}
                            >
                              <Icon name="payments" size={12} />
                              {mov.estado === "Anulado" ? "Pago Anulado" : "Pago"}
                            </span>
                          )}
                        </td>

                        <td className="px-3 py-2.5 font-mono text-[11px] font-bold">
                          <span className={noSuma ? "line-through text-slate-400" : "text-slate-800"}>
                            {mov.referencia}
                          </span>
                          {noSuma && (
                            <span className="block text-[9px] font-normal text-amber-700 not-italic">
                              (No afecta saldo)
                            </span>
                          )}
                        </td>

                        <td className="px-3 py-2.5">
                          <div className={noSuma ? "line-through text-slate-400" : "font-medium text-slate-900"}>
                            {mov.detalle}
                          </div>
                        </td>

                        <td className="px-3 py-2.5 text-right font-mono font-medium text-slate-800">
                          {mov.cargo > 0 ? (
                            <span className={noSuma ? "line-through text-slate-400" : "text-slate-900"}>
                              {formatoMoneda(mov.cargo)}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>

                        <td className="px-3 py-2.5 text-right font-mono font-medium text-emerald-700">
                          {mov.credito > 0 ? (
                            <span className={noSuma ? "line-through text-slate-400" : "text-emerald-700"}>
                              {formatoMoneda(mov.credito)}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>

                        <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900">
                          {formatoMoneda(mov.saldoAcumulado)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pie del modal */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3.5 bg-slate-50">
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-slate-300" />
              Tachado: Clase cancelada o pago anulado
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Volver al listado
          </button>
        </div>
      </div>
    </div>
  );
}
