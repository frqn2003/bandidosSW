// src/components/indicadores/DashboardPage.tsx
//
// Pantalla principal del Tablero de Indicadores de Gestión (HU-IND-01).
// - Sidebar global unificado a la izquierda (consistente con Alumnos, Usuarios y Turnos).
// - Encabezado: Título "Indicadores de gestión", badge "Solo lectura", botón "Exportar PDF".
// - Control de acceso de rol Gerente (con selector para simular otros roles y verificar Acceso Denegado).
// - Barra de filtros con validaciones temporales (hasta 12 meses).
// - Cuadrícula de 5 KPI Cards con fórmulas matemáticas en tooltip.
// - Gráficos analíticos (Recharts y barras horizontales) o Estado Vacío ("Sin datos para el período").

"use client";

import React from "react";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Sidebar } from "@/components/layout/Sidebar";
import { EncabezadoImpresion } from "@/components/layout/EncabezadoImpresion";
import { useDashboardMetrics } from "@/modules/indicadores/useDashboardMetrics";
import { DashboardFilters } from "./DashboardFilters";
import { KPIGrid } from "./KPIGrid";
import { DashboardCharts } from "./DashboardCharts";
import { EmptyStateDashboard } from "./EmptyStateDashboard";

export function DashboardPage() {
  const {
    filtros,
    cargando,
    errorValidacion,
    setFiltro,
    aplicarFiltros,
    limpiarFiltros,
    materias,
    profesores,
    metricas,
    kpiCards,
    exportarPDF,
  } = useDashboardMetrics();

  const materiaSeleccionada = materias.find((m) => m.id === filtros.materiaId)?.nombre;
  const profesorSeleccionado = profesores.find((p) => p.id === filtros.profesorId)?.nombre;

  const filtrosParaImpresion = [
    `Desde: ${filtros.desde}`,
    `Hasta: ${filtros.hasta}`,
    ...(materiaSeleccionada ? [`Materia: ${materiaSeleccionada}`] : []),
    ...(profesorSeleccionado ? [`Profesor: ${profesorSeleccionado}`] : []),
  ];

  return (
    <div className="flex min-h-screen bg-slate-50 print:block print:bg-white print:min-h-0">
      <div className="print:hidden">
        <Sidebar />
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto print:overflow-visible">
        <main className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto space-y-6 print:p-0 print:m-0 print:max-w-none print:w-full print:space-y-4">
          {/* ── ENCABEZADO DE IMPRESIÓN (PDF) ── */}
          <EncabezadoImpresion
            titulo="Indicadores de Gestión"
            subtitulo="Métricas analíticas del centro académico para la toma de decisiones directivas"
            filtrosAplicados={filtrosParaImpresion}
          />

          {/* ── 1. ENCABEZADO PRINCIPAL DE LA PÁGINA (PANTALLA) ── */}
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-outline-variant pb-5 print:hidden">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-md bg-primary-container/30 print:hidden">
                  <Icon name="analytics" size={24} className="text-primary" />
                </span>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h1 className="font-display text-2xl font-bold tracking-tight text-on-surface">
                      Indicadores de gestión
                    </h1>
                    <StatusBadge
                      variant="neutral"
                      icon="lock"
                      label="Solo lectura"
                    />
                  </div>
                  <p className="text-xs text-on-surface-variant">
                    Métricas analíticas del centro académico para la toma de decisiones directivas.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 print:hidden">
              <Button
                type="button"
                variant="outline"
                onClick={exportarPDF}
                className="gap-2 bg-white shadow-xs"
              >
                <Icon name="picture_as_pdf" size={18} className="text-secondary" />
                Exportar PDF
              </Button>
            </div>
          </header>

          {/* ── 2. BARRA DE FILTROS ── */}
          <div className="print:hidden">
            <DashboardFilters
              filtros={filtros}
              materias={materias}
              profesores={profesores}
              cargando={cargando}
              errorValidacion={errorValidacion}
              onFiltroChange={setFiltro}
              onActualizar={aplicarFiltros}
              onLimpiar={limpiarFiltros}
            />
          </div>

          {/* ── 3. CUADRÍCULA DE 5 TARJETAS DE INDICADORES (KPIs) ── */}
          <div>
            <KPIGrid cards={kpiCards} />
          </div>

          {/* ── 4. GRÁFICOS ANALÍTICOS O ESTADO VACÍO ── */}
          <div>
            {!metricas.sinDatos ? (
              <DashboardCharts
                turnosPorSemana={metricas.turnosPorSemana}
                rankingDemanda={metricas.rankingMateriasMasPedidas}
                rankingIngresos={metricas.rankingMateriasMayorIngreso}
              />
            ) : (
              <EmptyStateDashboard onLimpiarFiltros={limpiarFiltros} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
