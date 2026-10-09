// src/components/indicadores/DashboardCharts.tsx
//
// Componente de visualizaciones gráficas y rankings analíticos (HU-IND-01).
// - Gráfico de barras Recharts: "Turnos por semana".
// - Ranking Top 5: Materias más pedidas / mayor demanda horaria (barras horizontales con Tailwind).
// - Ranking Top 5: Materias con mayor generación de ingresos ($).

"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Icon } from "@/components/ui/Icon";
import type {
  TurnosPorSemanaItem,
  RankingMateriaDemandaItem,
  RankingMateriaIngresosItem,
} from "@/modules/indicadores/types";

interface DashboardChartsProps {
  turnosPorSemana: TurnosPorSemanaItem[];
  rankingDemanda: RankingMateriaDemandaItem[];
  rankingIngresos: RankingMateriaIngresosItem[];
}

export function DashboardCharts({
  turnosPorSemana,
  rankingDemanda,
  rankingIngresos,
}: DashboardChartsProps) {
  const maxTurnos = Math.max(...rankingDemanda.map((d) => d.turnos), 1);
  const maxIngresos = Math.max(...rankingIngresos.map((i) => i.ingresos), 1);

  const formatoMoneda = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* ── COLUMNA IZQUIERDA: GRÁFICO DE BARRAS RECHARTS (7 cols) ── */}
      <div className="flex flex-col rounded-md border border-outline-variant bg-surface-container-lowest p-5 shadow-card lg:col-span-7">
        <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-primary/10 text-primary">
              <Icon name="bar_chart" size={20} />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-on-surface">
                Turnos por semana
              </h3>
              <p className="text-xs text-on-surface-variant">
                Distribución cronológica de clases en el período
              </p>
            </div>
          </div>
          <span className="rounded-full bg-surface-container-high px-2.5 py-0.5 text-xs font-bold text-on-surface-variant">
            {turnosPorSemana.reduce((sum, item) => sum + item.cantidad, 0)} clases
          </span>
        </div>

        {/* Gráfico Recharts */}
        <div className="mt-4 h-72 w-full">
          {turnosPorSemana.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={turnosPorSemana}
                margin={{ top: 16, right: 16, left: -16, bottom: 24 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="etiquetaSemana"
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "#cbd5e1" }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: "rgba(0, 35, 111, 0.05)" }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as TurnosPorSemanaItem;
                      return (
                        <div className="rounded-md border border-outline-variant bg-surface-container-lowest p-2.5 shadow-modal text-xs">
                          <p className="font-bold text-on-surface">{data.etiquetaSemana}</p>
                          <p className="mt-1 font-semibold text-primary">
                            {data.cantidad} {data.cantidad === 1 ? "turno" : "turnos"}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="cantidad"
                  fill="#00236f"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-on-surface-variant">
              No hay turnos registrados en las semanas del período.
            </div>
          )}
        </div>
      </div>

      {/* ── COLUMNA DERECHA: DOS RANKINGS TOP 5 (5 cols) ── */}
      <div className="flex flex-col gap-6 lg:col-span-5">
        {/* TOP 5 MATERIAS MÁS PEDIDAS */}
        <div className="rounded-md border border-outline-variant bg-surface-container-lowest p-5 shadow-card">
          <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Icon name="trending_up" size={18} className="text-secondary" />
              <h3 className="font-display text-sm font-bold text-on-surface">
                Top 5 materias más pedidas
              </h3>
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
              Turnos / Horas
            </span>
          </div>

          <div className="space-y-3.5">
            {rankingDemanda.length > 0 ? (
              rankingDemanda.map((item, index) => {
                const porcentaje = Math.round((item.turnos / maxTurnos) * 100);

                return (
                  <div key={item.materiaId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-[11px] font-bold text-on-surface-variant font-mono">
                          {index + 1}
                        </span>
                        <span className="font-bold text-on-surface truncate">
                          {item.materiaNombre}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 text-on-surface-variant font-medium">
                        <span className="font-bold text-primary">{item.turnos}</span> clases
                        <span>·</span>
                        <span>{item.horasDictadas}h</span>
                      </div>
                    </div>

                    {/* Barra horizontal simulada con Tailwind */}
                    <div className="h-2 w-full rounded-full bg-surface-container-high overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-medium"
                        style={{ width: `${porcentaje}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="py-4 text-center text-xs text-on-surface-variant">
                Sin datos de demanda en el período.
              </p>
            )}
          </div>
        </div>

        {/* TOP 5 MATERIAS POR INGRESOS */}
        <div className="rounded-md border border-outline-variant bg-surface-container-lowest p-5 shadow-card">
          <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Icon name="payments" size={18} className="text-status-success-strong" />
              <h3 className="font-display text-sm font-bold text-on-surface">
                Top 5 materias por ingresos
              </h3>
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
              Facturación
            </span>
          </div>

          <div className="space-y-3.5">
            {rankingIngresos.length > 0 ? (
              rankingIngresos.map((item, index) => {
                const porcentaje = Math.round((item.ingresos / maxIngresos) * 100);

                return (
                  <div key={item.materiaId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[11px] font-bold text-emerald-700 font-mono">
                          {index + 1}
                        </span>
                        <span className="font-bold text-on-surface truncate">
                          {item.materiaNombre}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 font-semibold text-on-surface">
                        <span>{formatoMoneda.format(item.ingresos)}</span>
                        <span className="text-on-surface-variant font-normal text-[11px]">
                          ({item.turnos})
                        </span>
                      </div>
                    </div>

                    {/* Barra horizontal simulada con Tailwind */}
                    <div className="h-2 w-full rounded-full bg-surface-container-high overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-600 transition-all duration-medium"
                        style={{ width: `${porcentaje}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="py-4 text-center text-xs text-on-surface-variant">
                Sin cobros registrados en el período.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
