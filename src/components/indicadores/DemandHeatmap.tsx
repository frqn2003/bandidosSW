// src/components/indicadores/DemandHeatmap.tsx
//
// Componente independiente: Mapa de Calor de Demanda por Materia y Franja Horaria (HU-IND-03).
// - Eje Y: Materias.
// - Eje X: Franjas horarias (08:00 a 22:00 o franja personalizada).
// - Filtros locales independientes (Profesor, Materia, Horario).
//   REGLA DE AISLAMIENTO: Las modificaciones a estos filtros afectan ÚNICAMENTE a este componente
//   sin refrescar ni alterar el estado global de KPIs ni los demás gráficos del tablero.

"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import {
  consultarMapaCalor,
  type MapaCalorResponse,
} from "@/data/indicadores";
import type { NivelFiltro, OpcionCatalogo } from "@/modules/indicadores/types";

interface DemandHeatmapProps {
  periodo: {
    desde: string;
    hasta: string;
  };
  materias: OpcionCatalogo[];
  profesores: OpcionCatalogo[];
  nivelGlobal?: NivelFiltro;
}

const OPCIONES_HORARIOS = [
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
  "21:00",
  "22:00",
];

export function DemandHeatmap({
  periodo,
  materias,
  profesores,
  nivelGlobal,
}: DemandHeatmapProps) {
  // ── ESTADO LOCAL AISLADO (NO ALTERA KPIS GLOBALES) ──
  const [localMateriaId, setLocalMateriaId] = useState<number | "Todas">("Todas");
  const [localProfesorId, setLocalProfesorId] = useState<number | "Todos">("Todos");
  const [localHoraDesde, setLocalHoraDesde] = useState<string>("08:00");
  const [localHoraHasta, setLocalHoraHasta] = useState<string>("21:00");

  const [cargando, setCargando] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const [mapaData, setMapaData] = useState<MapaCalorResponse | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Estado para Tooltip flotante interactivo
  const [tooltip, setTooltip] = useState<{
    materia: string;
    franja: string;
    turnos: number;
    x: number;
    y: number;
    posicionAbajo?: boolean;
  } | null>(null);

  // Validación de rango horario local
  const horaInvalida = useMemo(() => {
    return localHoraHasta <= localHoraDesde;
  }, [localHoraDesde, localHoraHasta]);

  // Carga de datos local exclusiva
  const cargarMapa = useCallback(async () => {
    if (horaInvalida) {
      setErrorLocal("La hora hasta debe ser posterior a la hora desde.");
      return;
    }
    setCargando(true);
    setErrorLocal(null);

    try {
      // BACKEND: GET /api/indicadores/mapa-calor?...
      const res = await consultarMapaCalor({
        desde: periodo.desde,
        hasta: periodo.hasta,
        materiaId: localMateriaId !== "Todas" ? localMateriaId : undefined,
        profesorId: localProfesorId !== "Todos" ? localProfesorId : undefined,
        nivel: nivelGlobal && nivelGlobal !== "Todos" ? nivelGlobal : undefined,
        horaDesde: localHoraDesde || undefined,
        horaHasta: localHoraHasta || undefined,
      });
      setMapaData(res);
    } catch {
      setErrorLocal("No se pudieron cargar los datos del mapa de calor.");
    } finally {
      setCargando(false);
    }
  }, [
    periodo.desde,
    periodo.hasta,
    localMateriaId,
    localProfesorId,
    nivelGlobal,
    localHoraDesde,
    localHoraHasta,
    horaInvalida,
  ]);

  useEffect(() => {
    cargarMapa();
  }, [cargarMapa]);

  // Generar lista de horas según filtro local
  const horasColumnas = useMemo(() => {
    const hInicio = parseInt(localHoraDesde.split(":")[0], 10);
    const hFin = parseInt(localHoraHasta.split(":")[0], 10);
    const resultado: number[] = [];
    for (let h = hInicio; h < hFin; h++) {
      resultado.push(h);
    }
    return resultado;
  }, [localHoraDesde, localHoraHasta]);

  // Obtener lista de materias a mostrar en el eje Y
  const materiasFilas = useMemo(() => {
    if (localMateriaId !== "Todas") {
      const encontrada = materias.find((m) => m.id === localMateriaId);
      return [
        {
          id: localMateriaId,
          nombre: encontrada ? encontrada.nombre : `Materia #${localMateriaId}`,
        },
      ];
    }

    // Si está en "Todas", extraemos las materias que tienen actividad en el mapa
    const celdas = mapaData?.celdas || [];
    const materiasMap = new Map<number, string>();
    for (const c of celdas) {
      materiasMap.set(c.materiaId, c.materiaNombre);
    }

    if (materiasMap.size === 0) {
      // Si no hay datos, mostrar hasta 5 materias del catálogo como referencia
      return materias.slice(0, 5);
    }

    return Array.from(materiasMap.entries()).map(([id, nombre]) => ({
      id,
      nombre,
    }));
  }, [localMateriaId, materias, mapaData]);

  // Diccionario rápido de búsqueda: `${materiaId}-${franjaHora}` -> turnos
  const celdasMap = useMemo(() => {
    const map = new Map<string, number>();
    if (!mapaData?.celdas) return map;
    for (const c of mapaData.celdas) {
      map.set(`${c.materiaId}-${c.franjaHora}`, c.turnos);
    }
    return map;
  }, [mapaData]);

  const maxTurnos = Math.max(mapaData?.maxTurnos || 1, 1);

  // Selector de color e intensidad basado en la escala térmica clásica (Opción A)
  const obtenerEstiloCelda = (turnos: number) => {
    if (turnos === 0) {
      return "bg-slate-50 text-slate-300 border-slate-200/50 hover:bg-slate-100 hover:border-slate-300";
    }
    const ratio = turnos / maxTurnos;
    if (ratio <= 0.25) {
      return "bg-amber-100 text-amber-950 border-amber-200 font-semibold hover:bg-amber-200";
    }
    if (ratio <= 0.5) {
      return "bg-orange-300 text-orange-950 border-orange-400 font-bold hover:bg-orange-400";
    }
    if (ratio <= 0.75) {
      return "bg-orange-600 text-white border-orange-700 font-extrabold hover:bg-orange-700 shadow-xs";
    }
    return "bg-red-800 text-white border-red-900 font-extrabold hover:bg-red-900 shadow-xs ring-1 ring-red-950/20";
  };

  const handleRestablecerFiltros = () => {
    setLocalMateriaId("Todas");
    setLocalProfesorId("Todos");
    setLocalHoraDesde("08:00");
    setLocalHoraHasta("21:00");
    setErrorLocal(null);
  };

  const totalTurnosMapa = useMemo(() => {
    if (!mapaData?.celdas) return 0;
    return mapaData.celdas.reduce((sum, c) => sum + c.turnos, 0);
  }, [mapaData]);

  return (
    <div className="rounded-md border border-outline-variant bg-surface-container-lowest p-5 shadow-card space-y-5">
      {/* ── ENCABEZADO Y BADGES ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-outline-variant/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-primary/10 text-primary">
            <Icon name="grid_view" size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-base font-bold text-on-surface">
                Mapa de calor de demanda
              </h3>
              <span className="rounded-full bg-secondary/10 px-2 py-0.5 text-[11px] font-bold text-secondary">
                Interactivo
              </span>
            </div>
            <p className="text-xs text-on-surface-variant">
              Distribución de clases por materia y franja horaria (Eje Y: Materia · Eje X: Franja Horaria)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-sm bg-surface-container-high px-2.5 py-1 text-xs font-semibold text-on-surface-variant">
            Demanda total: <strong className="text-on-surface">{totalTurnosMapa}</strong> clases
          </span>
        </div>
      </div>

      {/* ── BARRA DE FILTROS LOCALES INDEPENDIENTES ── */}
      <div className="rounded-md bg-slate-50 p-3.5 border border-slate-200/80">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <Icon name="tune" size={16} className="text-secondary" />
            <span>Filtros locales del mapa:</span>
            <span className="text-[11px] font-normal text-slate-500">
              (Afectan sólo a esta vista)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 flex-1 lg:max-w-3xl">
            {/* Filtro local Materia */}
            <div>
              <label
                htmlFor="mapa-materia"
                className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1"
              >
                Materia
              </label>
              <select
                id="mapa-materia"
                value={localMateriaId}
                onChange={(e) =>
                  setLocalMateriaId(
                    e.target.value === "Todas" ? "Todas" : Number(e.target.value)
                  )
                }
                className="w-full h-8 rounded-sm border border-slate-300 bg-white px-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
              >
                <option value="Todas">Todas las materias</option>
                {materias.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro local Profesor */}
            <div>
              <label
                htmlFor="mapa-profesor"
                className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1"
              >
                Profesor
              </label>
              <select
                id="mapa-profesor"
                value={localProfesorId}
                onChange={(e) =>
                  setLocalProfesorId(
                    e.target.value === "Todos" ? "Todos" : Number(e.target.value)
                  )
                }
                className="w-full h-8 rounded-sm border border-slate-300 bg-white px-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
              >
                <option value="Todos">Todos los profesores</option>
                {profesores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro local Horario Desde */}
            <div>
              <label
                htmlFor="mapa-hora-desde"
                className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1"
              >
                Hora Desde
              </label>
              <select
                id="mapa-hora-desde"
                value={localHoraDesde}
                onChange={(e) => setLocalHoraDesde(e.target.value)}
                className={`w-full h-8 rounded-sm border bg-white px-2 text-xs font-medium text-slate-800 shadow-2xs focus:outline-none focus:ring-1 ${
                  horaInvalida
                    ? "border-red-500 text-red-700 focus:ring-red-500"
                    : "border-slate-300 focus:border-secondary focus:ring-secondary"
                }`}
              >
                {OPCIONES_HORARIOS.slice(0, -1).map((h) => (
                  <option key={h} value={h}>
                    {h} hs
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro local Horario Hasta */}
            <div>
              <label
                htmlFor="mapa-hora-hasta"
                className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1"
              >
                Hora Hasta
              </label>
              <select
                id="mapa-hora-hasta"
                value={localHoraHasta}
                onChange={(e) => setLocalHoraHasta(e.target.value)}
                className={`w-full h-8 rounded-sm border bg-white px-2 text-xs font-medium text-slate-800 shadow-2xs focus:outline-none focus:ring-1 ${
                  horaInvalida
                    ? "border-red-500 text-red-700 focus:ring-red-500"
                    : "border-slate-300 focus:border-secondary focus:ring-secondary"
                }`}
              >
                {OPCIONES_HORARIOS.slice(1).map((h) => (
                  <option key={h} value={h}>
                    {h} hs
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRestablecerFiltros}
              className="h-8 gap-1 text-xs border-slate-300 text-slate-600 bg-white"
            >
              <Icon name="refresh" size={14} />
              Restablecer
            </Button>
          </div>
        </div>

        {errorLocal && (
          <p className="mt-2 text-xs font-semibold text-red-600 flex items-center gap-1">
            <Icon name="error" size={14} />
            {errorLocal}
          </p>
        )}
      </div>

      {/* ── GRID DEL MAPA DE CALOR (HEATMAP) ── */}
      <div className="relative overflow-x-auto rounded-sm border border-slate-200">
        {cargando ? (
          <div className="flex h-64 items-center justify-center gap-2 bg-slate-50 text-xs font-medium text-slate-500">
            <Icon name="sync" size={18} className="animate-spin text-secondary" />
            Cargando mapa de calor de demanda…
          </div>
        ) : materiasFilas.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 bg-slate-50 p-6 text-center text-xs text-slate-500">
            <Icon name="inbox" size={28} className="text-slate-400" />
            <p className="font-semibold text-slate-700">Sin datos de demanda</p>
            <p>No se registraron turnos en las franjas horarias seleccionadas.</p>
          </div>
        ) : (
          <div className="min-w-[700px] p-2 bg-white">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-white p-2 text-[11px] font-bold text-slate-600 uppercase tracking-wider w-44 min-w-44 border-b border-slate-200">
                    Materia
                  </th>
                  {horasColumnas.map((hora) => (
                    <th
                      key={hora}
                      className="p-1 text-center text-[11px] font-bold text-slate-500 border-b border-slate-200 min-w-10"
                    >
                      {String(hora).padStart(2, "0")}:00
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {materiasFilas.map((materia) => (
                  <tr key={materia.id} className="hover:bg-slate-50/50">
                    <td className="sticky left-0 z-10 bg-white p-2 text-xs font-bold text-slate-800 border-b border-slate-100 truncate max-w-44">
                      {materia.nombre}
                    </td>
                    {horasColumnas.map((hora) => {
                      const count = celdasMap.get(`${materia.id}-${hora}`) ?? 0;
                      const estilo = obtenerEstiloCelda(count);
                      const franjaTexto = `${String(hora).padStart(2, "0")}:00 - ${String(
                        hora + 1
                      ).padStart(2, "0")}:00`;

                      return (
                        <td
                          key={hora}
                          className="p-1 border-b border-slate-100 text-center"
                        >
                          <div
                            onMouseEnter={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const mostrarAbajo = rect.top < 70;
                              setTooltip({
                                materia: materia.nombre,
                                franja: franjaTexto,
                                turnos: count,
                                x: rect.left + rect.width / 2,
                                y: mostrarAbajo ? rect.bottom : rect.top,
                                posicionAbajo: mostrarAbajo,
                              });
                            }}
                            onMouseLeave={() => setTooltip(null)}
                            className={`h-9 w-full min-w-8 flex items-center justify-center rounded-xs border text-xs cursor-pointer transition-all duration-150 ${estilo}`}
                          >
                            {count > 0 ? count : ""}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── REFERENCIA / LEYENDA DEL MAPA ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 pt-2 border-t border-outline-variant/40">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">Intensidad de demanda:</span>
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="flex items-center gap-1">
              <span className="h-3.5 w-5 rounded-xs border border-slate-200 bg-slate-50" />
              0
            </span>
            <span className="flex items-center gap-1">
              <span className="h-3.5 w-5 rounded-xs border border-amber-200 bg-amber-100" />
              Baja
            </span>
            <span className="flex items-center gap-1">
              <span className="h-3.5 w-5 rounded-xs border border-orange-400 bg-orange-300" />
              Media
            </span>
            <span className="flex items-center gap-1">
              <span className="h-3.5 w-5 rounded-xs border border-orange-700 bg-orange-600" />
              Alta
            </span>
            <span className="flex items-center gap-1">
              <span className="h-3.5 w-5 rounded-xs border border-red-900 bg-red-800" />
              Pico
            </span>
          </div>
        </div>

        <span className="text-[11px] text-slate-500">
          Valores numéricos indican clases programadas en la franja
        </span>
      </div>

      {/* ── TOOLTIP FLOTANTE INTERACTIVO (PORTAL A BODY PARA EVITAR LAYOUT SHIFT / REBOTE) ── */}
      {mounted &&
        tooltip &&
        createPortal(
          <div
            className="fixed z-50 pointer-events-none rounded-md border border-slate-700 bg-slate-900/95 px-3 py-2 text-white shadow-xl text-xs"
            style={{
              left: `${tooltip.x}px`,
              top: tooltip.posicionAbajo
                ? `${tooltip.y + 8}px`
                : `${tooltip.y - 8}px`,
              transform: tooltip.posicionAbajo
                ? "translate(-50%, 0)"
                : "translate(-50%, -100%)",
            }}
          >
            <p className="font-bold text-slate-100">{tooltip.materia}</p>
            <div className="mt-1 flex items-center justify-between gap-4 text-slate-300 text-[11px]">
              <span>Franja: {tooltip.franja}</span>
              <span className="font-bold text-sky-400">
                {tooltip.turnos} {tooltip.turnos === 1 ? "clase" : "clases"}
              </span>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
