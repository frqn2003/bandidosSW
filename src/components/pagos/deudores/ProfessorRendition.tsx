// src/components/pagos/deudores/ProfessorRendition.tsx
//
// Pestaña: Rendición por Profesor (Diagrama 3 - HU-PAG-02).
// Reglas:
//  · Gerente: Profesor obligatorio, Período (defecto mes en curso, máx 12 meses), Materia opcional.
//  · Profesor: Solo su propia rendición en modo LECTURA con filtros de Período y Materia.
//  · Mesa de Entrada: Deniega el acceso a la rendición.
//  · Clases dictadas cobradas agrupadas por materia con subtotales y total rendido.
//  · Sección inferior informativa con clases dictadas pendientes de cobro (no suma al total).

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Icon } from "@/components/ui/Icon";
import { formatearFecha } from "@/funciones/formato";
import { useSesion } from "@/funciones/sesion";
import { useToast } from "@/components/ui/Toast";
import { obtenerRendicion, getRangoMesActual } from "@/data/rendicion";
import { listarMaterias } from "@/data/materias";
import { listarProfesores } from "@/data/profesores";
import type { RendicionResponse } from "@/contracts/rendicion";
import type { MateriaResponse } from "@/contracts/materia";
import type { ProfesorResponse } from "@/contracts/profesor";

export function ProfessorRendition() {
  const { sesion } = useSesion();
  const rol = sesion?.usuario.rol.nombre;
  const esProfesor = rol === "Profesor";
  const esGerente = rol === "Gerente";
  const esMesa = rol === "Mesa de Entrada";
  const { showToast } = useToast();

  const rangoDefecto = getRangoMesActual();

  // Estados de Filtros
  const [profesores, setProfesores] = useState<ProfesorResponse[]>([]);
  const [materias, setMaterias] = useState<MateriaResponse[]>([]);
  const [profesorId, setProfesorId] = useState<number | undefined>(undefined);
  const [desde, setDesde] = useState<string>(rangoDefecto.desde);
  const [hasta, setHasta] = useState<string>(rangoDefecto.hasta);
  const [materiaId, setMateriaId] = useState<number | undefined>(undefined);

  // Estados de Consulta
  const [rendicion, setRendicion] = useState<RendicionResponse | null>(null);
  const [cargando, setCargando] = useState<boolean>(false);
  const [errorPeriodo, setErrorPeriodo] = useState<string | null>(null);
  const [errorProfesor, setErrorProfesor] = useState<string | null>(null);

  // Carga inicial de catálogos
  useEffect(() => {
    Promise.all([
      listarProfesores({ estado: "activo" }).catch(() => []),
      listarMaterias({ estado: "activo" }).catch(() => []),
    ]).then(([profs, mats]) => {
      setProfesores(profs);
      setMaterias(mats);

      // Si es profesor, buscar su profesorId asociado
      if (esProfesor && profs.length > 0) {
        // En front de desarrollo toma el primer profesor si no hay mapeo específico
        setProfesorId(profs[0].id);
      }
    });
  }, [esProfesor]);

  const validarPeriodo = (d: string, h: string): boolean => {
    if (!d || !h) {
      setErrorPeriodo("Debe indicar ambas fechas del período.");
      return false;
    }
    if (d > h) {
      setErrorPeriodo("La fecha inicial no puede ser posterior a la fecha final.");
      return false;
    }

    const diffDias = (new Date(h).getTime() - new Date(d).getTime()) / (1000 * 3600 * 24);
    if (diffDias > 366) {
      setErrorPeriodo("El período máximo de consulta no puede superar 12 meses.");
      return false;
    }

    setErrorPeriodo(null);
    return true;
  };

  const consultarRendicion = useCallback(() => {
    if (esMesa) return;

    if (esGerente && !profesorId) {
      setErrorProfesor("Debe seleccionar un profesor para consultar la liquidación.");
      setRendicion(null);
      return;
    }
    setErrorProfesor(null);

    if (!validarPeriodo(desde, hasta)) {
      setRendicion(null);
      return;
    }

    setCargando(true);
    obtenerRendicion({
      profesorId,
      desde,
      hasta,
      materiaId,
    })
      .then((res) => {
        setRendicion(res);
      })
      .catch((err) => {
        console.error("Error al obtener rendición:", err);
        showToast("error", "Error al consultar la rendición docente.");
      })
      .finally(() => setCargando(false));
  }, [esMesa, esGerente, profesorId, desde, hasta, materiaId, showToast]);

  useEffect(() => {
    if ((esProfesor && profesorId) || (esGerente && profesorId)) {
      consultarRendicion();
    }
  }, [profesorId, consultarRendicion, esProfesor, esGerente]);

  const formatoMoneda = (val: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2,
    }).format(val);

  // REGLA: Mesa de Entrada no tiene acceso a rendición
  if (esMesa) {
    return (
      <div className="rounded-xl border border-red-200 bg-white p-8 text-center shadow-2xs">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 mb-3">
          <Icon name="lock" size={24} />
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-1">Acceso denegado</h3>
        <p className="text-xs text-slate-600 max-w-md mx-auto">
          El rol <strong className="font-semibold text-slate-800">Mesa de Entrada</strong> no
          posee permisos para consultar las liquidaciones de honorarios ni rendiciones docentes.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Panel de Filtros */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Selector de Profesor (Solo editable para Gerente; fijo para Profesor) */}
          <div>
            <label
              htmlFor="filtro-profesor"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Profesor {esGerente && <span className="text-red-500">*</span>}
            </label>
            {esProfesor ? (
              <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-800">
                <Icon name="badge" size={16} className="text-slate-500" />
                <span>
                  {sesion?.usuario.apellido}, {sesion?.usuario.nombre}
                </span>
                <span className="ml-auto text-[10px] text-slate-400 font-normal">(Tu cuenta)</span>
              </div>
            ) : (
              <div>
                <select
                  id="filtro-profesor"
                  value={profesorId ?? ""}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : undefined;
                    setProfesorId(val);
                    if (val) setErrorProfesor(null);
                  }}
                  className={`w-full rounded-md border bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 ${
                    errorProfesor
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                      : "border-slate-300 focus:border-blue-600 focus:ring-blue-600"
                  }`}
                >
                  <option value="">-- Seleccione un profesor --</option>
                  {profesores.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.usuario.apellido}, {p.usuario.nombre}
                    </option>
                  ))}
                </select>
                {errorProfesor && (
                  <p className="text-[11px] text-red-600 mt-1 font-medium">{errorProfesor}</p>
                )}
              </div>
            )}
          </div>

          {/* Período Desde */}
          <div>
            <label htmlFor="periodo-desde" className="block text-xs font-semibold text-slate-700 mb-1">
              Período Desde
            </label>
            <input
              id="periodo-desde"
              type="date"
              value={desde}
              onChange={(e) => {
                setDesde(e.target.value);
                validarPeriodo(e.target.value, hasta);
              }}
              className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>

          {/* Período Hasta */}
          <div>
            <label htmlFor="periodo-hasta" className="block text-xs font-semibold text-slate-700 mb-1">
              Período Hasta
            </label>
            <input
              id="periodo-hasta"
              type="date"
              value={hasta}
              onChange={(e) => {
                setHasta(e.target.value);
                validarPeriodo(desde, e.target.value);
              }}
              className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>

          {/* Materia (Opcional) */}
          <div>
            <label htmlFor="filtro-materia-rend" className="block text-xs font-semibold text-slate-700 mb-1">
              Materia (Opcional)
            </label>
            <select
              id="filtro-materia-rend"
              value={materiaId ?? ""}
              onChange={(e) =>
                setMateriaId(e.target.value ? Number(e.target.value) : undefined)
              }
              className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="">Todas las materias</option>
              {materias.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Error de Período en rojo si aplica */}
        {errorPeriodo && (
          <div className="mt-3 flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 p-2 text-xs font-medium text-red-700">
            <Icon name="error" size={16} className="text-red-600 shrink-0" />
            <span>{errorPeriodo}</span>
          </div>
        )}

        {/* Acciones de la barra */}
        <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 text-xs">
          <span className="text-slate-500">
            Período máximo de consulta: 12 meses (366 días)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setDesde(rangoDefecto.desde);
                setHasta(rangoDefecto.hasta);
                setMateriaId(undefined);
                if (esGerente) setProfesorId(undefined);
                setRendicion(null);
                setErrorPeriodo(null);
                setErrorProfesor(null);
              }}
              className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Finalizar / Limpiar consulta
            </button>
            <button
              type="button"
              onClick={consultarRendicion}
              className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3.5 py-1 font-semibold text-white shadow-2xs hover:bg-blue-700 transition-colors cursor-pointer"
            >
              <Icon name="search" size={14} />
              Consultar Rendición
            </button>
          </div>
        </div>
      </div>

      {/* Resultados de la Rendición */}
      {cargando ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mb-3" />
          <p className="text-sm">Generando rendición docente...</p>
        </div>
      ) : !rendicion ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-500 shadow-2xs">
          <Icon name="manage_search" size={36} className="mx-auto text-slate-300 mb-2" />
          <p className="text-sm font-semibold text-slate-700">
            {esGerente
              ? "Seleccioná un profesor y presioná 'Consultar Rendición'"
              : "Seleccioná el período y presioná 'Consultar Rendición'"}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Los datos reflejarán únicamente las clases dictadas que ya cuentan con pago vigente.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Banner de Resumen */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Profesor liquidado
              </span>
              <h2 className="text-lg font-bold text-slate-900">
                {rendicion.profesor.apellido}, {rendicion.profesor.nombre}
              </h2>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Período: {formatearFecha(rendicion.desde)} al {formatearFecha(rendicion.hasta)}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-right">
                <span className="block text-[11px] font-semibold text-slate-500">
                  Pendiente de cobro
                </span>
                <span className="font-mono text-sm font-bold text-slate-700">
                  {formatoMoneda(rendicion.totalPendiente)}
                </span>
              </div>

              <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 text-right">
                <span className="block text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                  Total Rendido (Cobrado)
                </span>
                <span className="font-mono text-xl font-extrabold text-emerald-900">
                  {formatoMoneda(rendicion.totalRendido)}
                </span>
              </div>
            </div>
          </div>

          {/* Clases Dictadas Cobradas */}
          {rendicion.materias.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-500 shadow-2xs">
              <Icon name="event_busy" size={36} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-bold text-slate-800">
                Sin clases cobradas para el período seleccionado
              </p>
              <p className="text-xs text-slate-400 mt-1">
                No se registraron clases dictadas con cobranzas vigentes en las fechas indicadas.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
                Detalle de Clases Cobradas por Materia
              </h3>

              {rendicion.materias.map((mat) => (
                <div
                  key={mat.materia.id}
                  className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden"
                >
                  {/* Cabecera de Materia */}
                  <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-5 py-3">
                    <div className="flex items-center gap-2">
                      <Icon name="menu_book" size={16} className="text-blue-600" />
                      <span className="text-xs font-bold text-slate-900">
                        {mat.materia.nombre}
                      </span>
                      <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-[10px] font-bold text-slate-700 font-mono">
                        {mat.clases} {mat.clases === 1 ? "clase" : "clases"}
                      </span>
                    </div>
                    <span className="font-mono text-xs font-bold text-slate-900">
                      Subtotal: {formatoMoneda(mat.subtotal)}
                    </span>
                  </div>

                  {/* Tabla de clases de la materia */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-600">
                      <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="px-4 py-2.5">Fecha Clase</th>
                          <th className="px-3 py-2.5">Alumno</th>
                          <th className="px-3 py-2.5">Asistencia</th>
                          <th className="px-3 py-2.5">Medio de Pago</th>
                          <th className="px-3 py-2.5">Comprobante</th>
                          <th className="px-3 py-2.5">Fecha Cobro</th>
                          <th className="px-4 py-2.5 text-right">Importe</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {mat.items.map((it) => (
                          <tr key={it.turnoId} className="hover:bg-slate-50/60">
                            <td className="px-4 py-2.5 font-semibold text-slate-800">
                              {formatearFecha(it.fechaClase)}
                            </td>
                            <td className="px-3 py-2.5 font-bold text-slate-900">
                              {it.alumno.apellido}, {it.alumno.nombre}
                            </td>
                            <td className="px-3 py-2.5">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                  it.estadoClase === "Asistió"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-amber-50 text-amber-700 border border-amber-200"
                                }`}
                              >
                                {it.estadoClase}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-slate-600">{it.medioPago}</td>
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              <span className="font-mono text-xs font-semibold text-slate-700 rounded bg-slate-100 px-2 py-0.5 border border-slate-200 inline-block">
                                {it.comprobante}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-slate-500 font-normal">
                              {formatearFecha(it.fechaPago)}
                            </td>
                            <td className="px-4 py-2.5 text-right font-bold text-slate-900 tabular-nums whitespace-nowrap">
                              {formatoMoneda(it.importeCobrado)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Sección Inferior: Clases Dictadas Pendientes de Cobro (Informativa) */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-5 py-3">
              <div className="flex items-center gap-2">
                <Icon name="pending_actions" size={16} className="text-amber-600" />
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Clases Dictadas Pendientes de Cobro ({rendicion.pendientes.length})
                </span>
              </div>
              <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
                Sección solo informativa · No suma al total rendido
              </span>
            </div>

            {rendicion.pendientes.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                No hay clases dictadas impagas para este período.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-2.5">Fecha Clase</th>
                      <th className="px-3 py-2.5">Alumno</th>
                      <th className="px-3 py-2.5">Materia</th>
                      <th className="px-3 py-2.5">Estado</th>
                      <th className="px-4 py-2.5 text-right">Importe Pendiente</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rendicion.pendientes.map((p) => (
                      <tr key={p.turnoId} className="hover:bg-slate-50/50">
                        <td className="px-4 py-2.5 font-semibold text-slate-800">
                          {formatearFecha(p.fechaClase)}
                        </td>
                        <td className="px-3 py-2.5 font-bold text-slate-900">
                          {p.alumno.apellido}, {p.alumno.nombre}
                        </td>
                        <td className="px-3 py-2.5 text-slate-700">{p.materia.nombre}</td>
                        <td className="px-3 py-2.5">
                          <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                            {p.estadoClase}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-bold text-slate-700 tabular-nums whitespace-nowrap">
                          {formatoMoneda(p.importePendiente)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-slate-200 bg-slate-50/60 font-semibold text-slate-700">
                    <tr>
                      <td colSpan={4} className="px-4 py-2 text-xs">
                        Total adeudado por alumnos de estas clases:
                      </td>
                      <td className="px-4 py-2 text-right text-xs font-bold text-slate-900 tabular-nums">
                        {formatoMoneda(rendicion.totalPendiente)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
