// src/components/indicadores/profesor/ProfessorChartsAndTables.tsx
//
// Componente de Visualizaciones Gráficas y Tablas Analíticas (HU-IND-02):
//  1. Gráfico de barras de clases dictadas por semana (Recharts).
//  2. Distribución de clases por materia (Gráfico de Dona / Torta con Recharts).
//  3. Tabla "Alumnos con más ausencias" (Top 5 en orden descendente).
//
// Modo SOLO LECTURA. Sin información financiera o de pagos.

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
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Icon } from "@/components/ui/Icon";
import type {
  ClasesPorSemanaItem,
  ClasesPorMateriaItem,
  AlumnoAusenciasItem,
} from "@/contracts/indicadores-profesor";

interface ProfessorChartsAndTablesProps {
  clasesPorSemana: ClasesPorSemanaItem[];
  clasesPorMateria: ClasesPorMateriaItem[];
  alumnosConMasAusencias: AlumnoAusenciasItem[];
}

// Paleta de colores para materias en el gráfico de dona
const COLORES_DONA = [
  "#00236f", // Navy primary
  "#0058be", // Blue secondary
  "#3b82f6", // Light blue
  "#818cf8", // Indigo
  "#a855f7", // Purple
  "#06b6d4", // Cyan
  "#f59e0b", // Amber
];

/** "aaaa-mm-dd" → "dd/mm/aaaa" */
const aFechaCorta = (iso: string) => {
  const [, m, d] = iso.slice(0, 10).split("-");
  const y = iso.slice(0, 4);
  return `${d}/${m}/${y}`;
};

export function ProfessorChartsAndTables({
  clasesPorSemana,
  clasesPorMateria,
  alumnosConMasAusencias,
}: ProfessorChartsAndTablesProps) {
  // Total de clases en la distribución para calcular porcentajes en el tooltip de dona
  const totalClasesMaterias = clasesPorMateria.reduce((sum, item) => sum + item.clases, 0);

  // Formato para tooltip del gráfico de torta
  const pieData = clasesPorMateria.map((m) => ({
    name: m.materiaNombre,
    value: m.clases,
    porcentaje: totalClasesMaterias > 0 ? ((m.clases / totalClasesMaterias) * 100).toFixed(1) : "0",
  }));

  return (
    <div className="flex flex-col gap-6">
      {/* ── FILA SUPERIOR: 2 GRÁFICOS ANALÍTICOS (BARRAS Y DONA) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* 1. Gráfico de Barras: Clases dictadas por semana (7 columnas en lg) */}
        <div className="lg:col-span-7 flex flex-col rounded-md border border-outline-variant bg-surface-container-lowest p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Icon name="bar_chart" size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-on-surface">
                  Clases Dictadas por Semana
                </h3>
                <p className="text-xs text-on-surface-variant">
                  Evolución cronológica de turnos en estado &quot;Asistió&quot;
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold text-on-surface-variant bg-surface-container-low px-2.5 py-1 rounded-sm border border-outline-variant">
              {clasesPorSemana.reduce((sum, s) => sum + s.cantidad, 0)} clases totales
            </span>
          </div>

          <div className="mt-4 h-64 w-full">
            {clasesPorSemana.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-slate-400">
                No hay semanas con clases registradas en este período.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={clasesPorSemana}
                  margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="etiquetaSemana"
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    axisLine={{ stroke: "#e2e8f0" }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    axisLine={{ stroke: "#e2e8f0" }}
                    tickLine={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload as ClasesPorSemanaItem;
                        return (
                          <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-md text-xs">
                            <p className="font-bold text-slate-900">{data.etiquetaSemana}</p>
                            <p className="text-on-surface-variant text-[11px]">
                              {aFechaCorta(data.fechaInicio)} al {aFechaCorta(data.fechaFin)}
                            </p>
                            <p className="mt-1 font-semibold text-blue-600">
                              {data.cantidad} {data.cantidad === 1 ? "clase dictada" : "clases dictadas"}
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
                    maxBarSize={45}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* 2. Gráfico de Torta / Dona: Distribución de clases por materia (5 columnas en lg) */}
        <div className="lg:col-span-5 flex flex-col rounded-md border border-outline-variant bg-surface-container-lowest p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-indigo-50 text-indigo-700">
                <Icon name="donut_large" size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-on-surface">
                  Distribución por Materia
                </h3>
                <p className="text-xs text-on-surface-variant">
                  Proporción de clases impartidas por asignatura
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 h-64 w-full flex items-center justify-center">
            {pieData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-slate-400">
                Sin clases por materia registradas en este período.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="48%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={`cell-${entry.name}`}
                        fill={COLORES_DONA[index % COLORES_DONA.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload as {
                          name: string;
                          value: number;
                          porcentaje: string;
                        };
                        return (
                          <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-md text-xs">
                            <p className="font-bold text-slate-900">{data.name}</p>
                            <p className="mt-0.5 font-semibold text-blue-600">
                              {data.value} {data.value === 1 ? "clase" : "clases"} ({data.porcentaje}%)
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => (
                      <span className="text-[11px] font-medium text-slate-700">
                        {value}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ── FILA INFERIOR: TABLA TOP 5 ALUMNOS CON MÁS AUSENCIAS ── */}
      <div className="rounded-md border border-outline-variant bg-surface-container-lowest shadow-xs overflow-hidden">
        <div className="flex items-center justify-between border-b border-outline-variant/60 bg-surface-container-low px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-error-container/30 text-error">
              <Icon name="person_off" size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-on-surface">
                Alumnos con más ausencias (Top 5)
              </h3>
              <p className="text-xs text-on-surface-variant">
                Estudiantes con mayor cantidad de inasistencias en clases del docente
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-on-surface-variant bg-surface-container px-2.5 py-1 rounded-sm border border-outline-variant">
            Top {alumnosConMasAusencias.length} en orden descendente
          </span>
        </div>

        {alumnosConMasAusencias.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-on-surface-variant">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-2">
              <Icon name="check_circle" size={24} />
            </div>
            <p className="text-sm font-bold text-on-surface">
              ¡Sin ausencias registradas!
            </p>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Todos los alumnos registraron asistencia perfecta en el período consultado.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-on-surface">
              <thead className="border-b border-outline-variant bg-surface-container-low text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                <tr>
                  <th scope="col" className="w-12 px-4 py-3 text-center">#</th>
                  <th scope="col" className="px-4 py-3">Alumno</th>
                  <th scope="col" className="px-4 py-3 text-center">Inasistencias</th>
                  <th scope="col" className="px-4 py-3 text-right">Nivel de Ausentismo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60">
                {alumnosConMasAusencias.map((alumno, index) => {
                  const maxAusencias = Math.max(...alumnosConMasAusencias.map((a) => a.ausencias), 1);
                  const porcentajeRelativo = Math.min((alumno.ausencias / maxAusencias) * 100, 100);

                  return (
                    <tr key={alumno.alumnoId} className="hover:bg-surface-container-low/60 transition-colors">
                      {/* Puesto en el Ranking */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                            index === 0
                              ? "bg-red-100 text-red-700 font-extrabold"
                              : index === 1
                              ? "bg-orange-100 text-orange-700"
                              : "bg-surface-container text-on-surface-variant"
                          }`}
                        >
                          {index + 1}
                        </span>
                      </td>

                      {/* Datos del Alumno */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary text-xs">
                            {alumno.alumno.split(",")[0]?.[0] ?? "A"}
                            {alumno.alumno.split(",")[1]?.trim()?.[0] ?? ""}
                          </div>
                          <span className="font-bold text-on-surface text-sm">
                            {alumno.alumno}
                          </span>
                        </div>
                      </td>

                      {/* Inasistencias */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 border border-red-200 px-2.5 py-0.5 text-xs font-semibold text-red-800">
                          <Icon name="event_busy" size={13} className="text-red-700" />
                          <span>
                            {alumno.ausencias} {alumno.ausencias === 1 ? "ausencia" : "ausencias"}
                          </span>
                        </span>
                      </td>

                      {/* Barra Visual de Nivel de Ausentismo */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2 w-36">
                          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-red-500 transition-all duration-300"
                              style={{ width: `${porcentajeRelativo}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-semibold text-slate-600 tabular-nums w-8 text-right">
                            {alumno.ausencias}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
