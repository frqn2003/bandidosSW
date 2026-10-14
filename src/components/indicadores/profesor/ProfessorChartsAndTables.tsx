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
        <div className="lg:col-span-7 flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                <Icon name="bar_chart" size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Clases Dictadas por Semana
                </h3>
                <p className="text-[11px] text-slate-400">
                  Evolución cronológica de turnos en estado &quot;Asistió&quot;
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
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
                            <p className="text-slate-500 text-[11px]">
                              {data.fechaInicio} al {data.fechaFin}
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
        <div className="lg:col-span-5 flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                <Icon name="donut_large" size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Distribución por Materia
                </h3>
                <p className="text-[11px] text-slate-400">
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
      <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-red-100 text-red-600">
              <Icon name="person_off" size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Alumnos con más ausencias (Top 5)
              </h3>
              <p className="text-[11px] text-slate-400">
                Estudiantes con mayor cantidad de inasistencias en clases del docente
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            Top {alumnosConMasAusencias.length} en orden descendente
          </span>
        </div>

        {alumnosConMasAusencias.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-2">
              <Icon name="check_circle" size={20} />
            </div>
            <p className="text-xs font-bold text-slate-800">
              ¡Sin ausencias registradas!
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Todos los alumnos registraron asistencia perfecta en el período consultado.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th scope="col" className="w-12 px-4 py-3 text-center">#</th>
                  <th scope="col" className="px-4 py-3">Alumno</th>
                  <th scope="col" className="px-4 py-3 text-center">Inasistencias</th>
                  <th scope="col" className="px-4 py-3 text-right">Nivel de Ausentismo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {alumnosConMasAusencias.map((alumno, index) => {
                  const maxAusencias = Math.max(...alumnosConMasAusencias.map((a) => a.ausencias), 1);
                  const porcentajeRelativo = Math.min((alumno.ausencias / maxAusencias) * 100, 100);

                  return (
                    <tr key={alumno.alumnoId} className="hover:bg-slate-50/60 transition-colors">
                      {/* Puesto en el Ranking */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                            index === 0
                              ? "bg-red-100 text-red-700 font-extrabold"
                              : index === 1
                              ? "bg-orange-100 text-orange-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {index + 1}
                        </span>
                      </td>

                      {/* Datos del Alumno */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700 text-xs">
                            {alumno.alumno.split(",")[0]?.[0] ?? "A"}
                            {alumno.alumno.split(",")[1]?.trim()?.[0] ?? ""}
                          </div>
                          <span className="font-bold text-slate-900 text-xs">
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
