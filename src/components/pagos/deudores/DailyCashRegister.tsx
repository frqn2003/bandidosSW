// src/components/pagos/deudores/DailyCashRegister.tsx
//
// Pestaña: Cierre de Caja Diario (Diagrama 2 - HU-PAG-02).
// Selector de fecha (defecto hoy, bloquea futuras).
// Pagos vigentes agrupados por Efectivo y Transferencia (subtotales y total general).
// Pagos anulados listados aparte en texto rojo.
// Modo LECTURA estricto si la caja está cerrada; solo Gerente puede reabrirla.

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Icon } from "@/components/ui/Icon";
import { hoyAR } from "@/contracts/alumno";
import { formatearFecha } from "@/funciones/formato";
import { useSesion } from "@/funciones/sesion";
import { useToast } from "@/components/ui/Toast";
import { obtenerCajaDelDia, cerrarCaja, reabrirCaja, listarHistorialCierres } from "@/data/caja";
import { mensajeDeError } from "@/lib/api-client";
import type { CajaDelDiaResponse, CierreCajaResponse } from "@/contracts/caja";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CloseCashRegisterModal } from "./CloseCashRegisterModal";
import { ReopenCashRegisterModal } from "./ReopenCashRegisterModal";

export function DailyCashRegister() {
  const { sesion } = useSesion();
  const esGerente = sesion?.usuario.rol.nombre === "Gerente";
  const { showToast } = useToast();

  const fechaHoy = hoyAR();
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>(fechaHoy);
  const [caja, setCaja] = useState<CajaDelDiaResponse | null>(null);
  const [cargando, setCargando] = useState<boolean>(true);
  const [errorFechaFutura, setErrorFechaFutura] = useState<boolean>(false);

  // Historial de Cierres
  const [historialCierres, setHistorialCierres] = useState<CierreCajaResponse[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState<boolean>(true);

  // Modales
  const [modalCerrarOpen, setModalCerrarOpen] = useState(false);
  const [modalReabrirOpen, setModalReabrirOpen] = useState(false);

  const cargarHistorial = useCallback(() => {
    setCargandoHistorial(true);
    listarHistorialCierres()
      .then((data) => setHistorialCierres(data))
      .catch((err) => {
        console.error("Error al cargar historial de cierres:", err);
      })
      .finally(() => setCargandoHistorial(false));
  }, []);

  const cargarCaja = useCallback((fecha: string) => {
    if (fecha > fechaHoy) {
      setErrorFechaFutura(true);
      setCaja(null);
      return;
    }
    setErrorFechaFutura(false);
    setCargando(true);
    obtenerCajaDelDia(fecha)
      .then((res) => setCaja(res))
      .catch((err) => {
        console.error("Error al cargar caja diaria:", err);
        showToast("error", mensajeDeError(err));
      })
      .finally(() => setCargando(false));
  }, [fechaHoy, showToast]);

  useEffect(() => {
    cargarCaja(fechaSeleccionada);
  }, [fechaSeleccionada, cargarCaja]);

  useEffect(() => {
    cargarHistorial();
  }, [cargarHistorial]);

  const handleCambioFecha = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nuevaFecha = e.target.value;
    setFechaSeleccionada(nuevaFecha);
    if (nuevaFecha > fechaHoy) {
      setErrorFechaFutura(true);
      setCaja(null);
    } else {
      setErrorFechaFutura(false);
      cargarCaja(nuevaFecha);
    }
  };

  const handleConfirmarCierre = async (efectivoContado: number, observaciones?: string) => {
    try {
      await cerrarCaja({
        fecha: fechaSeleccionada,
        efectivoContado,
        observaciones,
      });
      showToast("success", `Caja del día ${formatearFecha(fechaSeleccionada)} cerrada exitosamente.`);
      setModalCerrarOpen(false);
      cargarCaja(fechaSeleccionada);
      cargarHistorial();
    } catch (err) {
      // OBSERVACIONES_REQUERIDAS, CAJA_YA_CERRADA, FECHA_FUTURA: el back manda el mensaje.
      showToast("error", mensajeDeError(err));
      cargarCaja(fechaSeleccionada);
    }
  };

  const handleConfirmarReapertura = async (motivo: string) => {
    if (!caja?.cierre?.id) return;
    try {
      await reabrirCaja(caja.cierre.id, { motivo });
      showToast("success", `Caja reabierta exitosamente.`);
      setModalReabrirOpen(false);
      cargarCaja(fechaSeleccionada);
      cargarHistorial();
    } catch (err) {
      showToast("error", mensajeDeError(err));
      cargarCaja(fechaSeleccionada);
    }
  };

  const formatoMoneda = (val: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2,
    }).format(val);

  const pagosEfectivo = caja?.pagos.filter((p) => p.medio.toLowerCase().includes("efectivo")) ?? [];
  const pagosTransferencia = caja?.pagos.filter((p) => !p.medio.toLowerCase().includes("efectivo")) ?? [];

  const subtotalEfectivo = pagosEfectivo.reduce((acc, p) => acc + p.monto, 0);
  const subtotalTransferencia = pagosTransferencia.reduce((acc, p) => acc + p.monto, 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Barra Superior: Selector de Fecha y Estado de Caja */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Selector de Fecha */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Icon name="calendar_today" size={20} />
          </div>
          <div>
            <label htmlFor="fecha-caja" className="block text-xs font-semibold text-slate-700">
              Fecha de Caja
            </label>
            <input
              id="fecha-caja"
              type="date"
              max={fechaHoy}
              value={fechaSeleccionada}
              onChange={handleCambioFecha}
              className="mt-0.5 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer"
            />
          </div>
        </div>

        {/* Estado y Acciones principales */}
        <div className="flex flex-wrap items-center gap-3">
          {caja && !errorFechaFutura && (
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                  caja.cerrada
                    ? "bg-slate-200 text-slate-800 border border-slate-300"
                    : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                }`}
              >
                <Icon name={caja.cerrada ? "lock" : "lock_open"} size={14} />
                {caja.cerrada ? "Caja Cerrada (Modo Lectura)" : "Caja Abierta"}
              </span>

              {/* Botón Reabrir Caja (Solo si cerrada y el usuario es Gerente) */}
              {caja.cerrada && esGerente && (
                <button
                  type="button"
                  onClick={() => setModalReabrirOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-amber-700 transition-colors cursor-pointer"
                  title="Reabrir caja para registrar o anular pagos"
                >
                  <Icon name="lock_open" size={14} />
                  Reabrir Caja
                </button>
              )}

              {/* Botón Cerrar Caja (Solo si abierta) */}
              {!caja.cerrada && (
                <button
                  type="button"
                  onClick={() => setModalCerrarOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  <Icon name="lock" size={14} />
                  Cerrar Caja
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Alerta de Fecha Futura */}
      {errorFechaFutura && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-800 flex items-center gap-2">
          <Icon name="error" size={18} className="text-red-600 shrink-0" />
          <span>
            <strong>Fecha futura no permitida:</strong> No es posible consultar ni cerrar la caja de una fecha posterior a hoy ({formatearFecha(fechaHoy)}).
          </span>
        </div>
      )}

      {/* Banner Informativo si la Caja está Cerrada */}
      {caja?.cerrada && caja.cierre && (
        <div className="rounded-xl border border-slate-300 bg-slate-100/90 p-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Icon name="info" size={18} className="text-slate-600" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Información del Cierre Realizado
              </span>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              Cerrado por: {caja.cierre.cerradoPor.apellido}, {caja.cierre.cerradoPor.nombre}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 text-xs">
            <div>
              <span className="text-slate-500 block">Efectivo Esperado:</span>
              <span className="font-mono font-bold text-slate-800">
                {formatoMoneda(caja.cierre.efectivoRegistrado)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Efectivo Contado:</span>
              <span className="font-mono font-bold text-slate-800">
                {formatoMoneda(caja.cierre.efectivoContado)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Diferencia:</span>
              <span
                className={`font-mono font-bold ${
                  caja.cierre.diferencia === 0
                    ? "text-emerald-700"
                    : caja.cierre.diferencia > 0
                    ? "text-amber-700"
                    : "text-red-700"
                }`}
              >
                {caja.cierre.diferencia === 0
                  ? "$0,00 (Cuadrada)"
                  : formatoMoneda(caja.cierre.diferencia)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Observaciones:</span>
              <span className="text-slate-700 italic">
                {caja.cierre.observaciones || "Sin observaciones"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Contenido de Pagos si hay fecha válida */}
      {!errorFechaFutura && (
        <>
          {cargando ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mb-3" />
              <p className="text-sm">Cargando conciliación de caja...</p>
            </div>
          ) : !caja ? null : (
            <div className="space-y-6">
              {/* Tarjetas Resumen de Totales */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">
                    <span>Efectivo ({pagosEfectivo.length} pagos)</span>
                    <Icon name="payments" size={16} className="text-emerald-600" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900 tracking-tight tabular-nums">
                    {formatoMoneda(subtotalEfectivo)}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">
                    <span>Transferencia ({pagosTransferencia.length} pagos)</span>
                    <Icon name="account_balance" size={16} className="text-blue-600" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900 tracking-tight tabular-nums">
                    {formatoMoneda(subtotalTransferencia)}
                  </div>
                </div>

                <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 shadow-2xs">
                  <div className="flex items-center justify-between text-xs text-blue-700 font-bold uppercase tracking-wider mb-1">
                    <span>Total General del Día</span>
                    <Icon name="point_of_sale" size={16} className="text-blue-600" />
                  </div>
                  <div className="text-2xl font-bold text-blue-900 tracking-tight tabular-nums">
                    {formatoMoneda(caja.totalGeneral)}
                  </div>
                </div>
              </div>

              {/* Grupo 1: Cobros en Efectivo */}
              <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-5 py-3">
                  <div className="flex items-center gap-2 font-bold text-xs text-slate-800 uppercase tracking-wider">
                    <Icon name="payments" size={16} className="text-emerald-600" />
                    Cobranzas en Efectivo ({pagosEfectivo.length})
                  </div>
                  <span className="text-xs font-bold text-slate-900 tabular-nums">
                    Subtotal: {formatoMoneda(subtotalEfectivo)}
                  </span>
                </div>

                {pagosEfectivo.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    Sin cobros en efectivo registrados para esta fecha.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-600">
                      <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="px-4 py-2.5">Comprobante</th>
                          <th className="px-3 py-2.5">Alumno</th>
                          <th className="px-3 py-2.5">Registrado por</th>
                          <th className="px-4 py-2.5 text-right">Monto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {pagosEfectivo.map((p) => (
                          <tr key={p.pagoId} className="hover:bg-slate-50/50">
                            <td className="px-4 py-2.5 whitespace-nowrap">
                              <span className="font-mono text-xs font-semibold text-slate-700 rounded bg-slate-100 px-2 py-0.5 border border-slate-200 inline-block">
                                {p.comprobante}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 font-bold text-slate-900">
                              {p.alumno.apellido}, {p.alumno.nombre}
                            </td>
                            <td className="px-3 py-2.5 text-slate-500 font-normal">
                              {p.registradoPor.apellido}, {p.registradoPor.nombre}
                            </td>
                            <td className="px-4 py-2.5 text-right font-bold text-slate-900 tabular-nums whitespace-nowrap">
                              {formatoMoneda(p.monto)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Grupo 2: Cobros por Transferencia */}
              <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-5 py-3">
                  <div className="flex items-center gap-2 font-bold text-xs text-slate-800 uppercase tracking-wider">
                    <Icon name="account_balance" size={16} className="text-blue-600" />
                    Cobranzas por Transferencia ({pagosTransferencia.length})
                  </div>
                  <span className="text-xs font-bold text-slate-900 tabular-nums">
                    Subtotal: {formatoMoneda(subtotalTransferencia)}
                  </span>
                </div>

                {pagosTransferencia.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    Sin cobros por transferencia registrados para esta fecha.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-600">
                      <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="px-4 py-2.5">Comprobante</th>
                          <th className="px-3 py-2.5">Alumno</th>
                          <th className="px-3 py-2.5">Registrado por</th>
                          <th className="px-4 py-2.5 text-right">Monto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {pagosTransferencia.map((p) => (
                          <tr key={p.pagoId} className="hover:bg-slate-50/50">
                            <td className="px-4 py-2.5 whitespace-nowrap">
                              <span className="font-mono text-xs font-semibold text-slate-700 rounded bg-slate-100 px-2 py-0.5 border border-slate-200 inline-block">
                                {p.comprobante}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 font-bold text-slate-900">
                              {p.alumno.apellido}, {p.alumno.nombre}
                            </td>
                            <td className="px-3 py-2.5 text-slate-500 font-normal">
                              {p.registradoPor.apellido}, {p.registradoPor.nombre}
                            </td>
                            <td className="px-4 py-2.5 text-right font-bold text-slate-900 tabular-nums whitespace-nowrap">
                              {formatoMoneda(p.monto)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Sección Aparte: Pagos Anulados (en texto rojo) */}
              <div className="rounded-xl border border-red-200 bg-white shadow-2xs overflow-hidden">
                <div className="flex items-center justify-between border-b border-red-100 bg-red-50/60 px-5 py-3">
                  <div className="flex items-center gap-2 font-bold text-xs text-red-800 uppercase tracking-wider">
                    <Icon name="cancel" size={16} className="text-red-600" />
                    Pagos Anulados de la Fecha ({caja.anulados.length})
                  </div>
                  <span className="text-[11px] font-medium text-red-600 italic">
                    Listados aparte · No suman al total de caja
                  </span>
                </div>

                {caja.anulados.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    No se registran pagos anulados en esta fecha.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-red-700">
                      <thead className="border-b border-red-200 bg-red-50 text-[11px] font-bold uppercase tracking-wider text-red-600">
                        <tr>
                          <th className="px-4 py-2.5">Comprobante</th>
                          <th className="px-3 py-2.5">Alumno</th>
                          <th className="px-3 py-2.5">Medio</th>
                          <th className="px-3 py-2.5">Motivo de Anulación</th>
                          <th className="px-4 py-2.5 text-right">Monto Anulado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-red-100/60">
                        {caja.anulados.map((a) => (
                          <tr key={a.pagoId} className="hover:bg-red-50/40">
                            <td className="px-4 py-2.5 whitespace-nowrap">
                              <span className="font-mono text-xs font-semibold text-red-700 rounded bg-red-100/70 px-2 py-0.5 border border-red-200 inline-block line-through">
                                {a.comprobante}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 font-bold text-slate-900">
                              {a.alumno.apellido}, {a.alumno.nombre}
                            </td>
                            <td className="px-3 py-2.5 text-xs text-slate-600">{a.medio}</td>
                            <td className="px-3 py-2.5 italic text-red-600 text-xs">
                              {a.motivoAnulacion || "Sin motivo especificado"}
                            </td>
                            <td className="px-4 py-2.5 text-right font-bold text-slate-400 line-through tabular-nums whitespace-nowrap">
                              {formatoMoneda(a.monto)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Sección: Historial de Cierres de Caja */}
      <section
        aria-labelledby="titulo-historial-cierres"
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs flex flex-col gap-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Icon name="history" size={20} />
            </div>
            <div>
              <h2 id="titulo-historial-cierres" className="text-sm font-bold text-slate-900">
                Historial de Cierres de Caja
              </h2>
              <p className="text-xs text-slate-500">
                Registro histórico ordenado por fecha descendente
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {historialCierres.length} {historialCierres.length === 1 ? "cierre registrado" : "cierres registrados"}
          </span>
        </div>

        {cargandoHistorial ? (
          <div className="py-8 text-center text-xs text-slate-500 animate-pulse">
            Cargando historial de cierres…
          </div>
        ) : historialCierres.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No se registran cierres de caja previos en el sistema.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <tr>
                  <th scope="col" className="px-4 py-3">Fecha</th>
                  <th scope="col" className="px-3 py-3">Usuario</th>
                  <th scope="col" className="px-3 py-3 text-right">Total Registrado</th>
                  <th scope="col" className="px-3 py-3 text-right">Diferencia</th>
                  <th scope="col" className="px-3 py-3 text-center">Estado</th>
                  <th scope="col" className="px-3 py-3">Observaciones</th>
                  <th scope="col" className="px-4 py-3 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historialCierres.map((c) => {
                  const tieneDiferencia = Math.abs(c.diferencia) > 0.001;
                  const esSobrante = c.diferencia > 0;

                  return (
                    <tr
                      key={c.id}
                      className={`hover:bg-slate-50/60 transition-colors ${
                        c.fecha === fechaSeleccionada ? "bg-blue-50/40" : ""
                      }`}
                    >
                      <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          <Icon name="event" size={14} className="text-slate-400" />
                          {formatearFecha(c.fecha)}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-medium text-slate-800">
                        <div>
                          <span>
                            {c.cerradoPor.apellido}, {c.cerradoPor.nombre}
                          </span>
                          {c.estado === "Reabierta" && c.reabiertoPor && (
                            <span className="block text-[10px] text-amber-700 font-medium">
                              Reabierto por: {c.reabiertoPor.apellido}, {c.reabiertoPor.nombre}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-slate-900 tabular-nums whitespace-nowrap">
                        {formatoMoneda(c.totalRegistrado)}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold tabular-nums whitespace-nowrap">
                        {!tieneDiferencia ? (
                          <span className="text-slate-500">$ 0,00</span>
                        ) : esSobrante ? (
                          <span className="text-emerald-700 font-bold">
                            +{formatoMoneda(c.diferencia)}
                            <span className="block text-[10px] font-medium text-emerald-600">Sobrante</span>
                          </span>
                        ) : (
                          <span className="text-red-700 font-bold">
                            {formatoMoneda(c.diferencia)}
                            <span className="block text-[10px] font-medium text-red-600">Faltante</span>
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <div className="inline-flex justify-center">
                          <StatusBadge
                            variant={c.estado === "Cerrada" ? "neutral" : "warning"}
                            label={c.estado}
                            icon={c.estado === "Cerrada" ? "lock" : "lock_open"}
                          />
                        </div>
                      </td>
                      <td className="px-3 py-3 text-slate-600 max-w-xs truncate" title={c.observaciones || c.motivoReapertura || ""}>
                        {c.observaciones || c.motivoReapertura || (
                          <span className="text-slate-400 italic">Sin observaciones</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            setFechaSeleccionada(c.fecha);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                          title={`Ver conciliación del ${formatearFecha(c.fecha)}`}
                        >
                          <Icon name="visibility" size={14} />
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal de Cierre de Caja */}
      {modalCerrarOpen && caja && (
        <CloseCashRegisterModal
          fecha={fechaSeleccionada}
          efectivoEsperado={subtotalEfectivo}
          onClose={() => setModalCerrarOpen(false)}
          onConfirmar={handleConfirmarCierre}
        />
      )}

      {/* Modal de Reapertura de Caja (Gerente) */}
      {modalReabrirOpen && caja?.cierre && (
        <ReopenCashRegisterModal
          cierreId={caja.cierre.id}
          fecha={fechaSeleccionada}
          onClose={() => setModalReabrirOpen(false)}
          onConfirmar={handleConfirmarReapertura}
        />
      )}
    </div>
  );
}
