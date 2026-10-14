// src/components/indicadores/KPIGrid.tsx
//
// Cuadrícula de 5 tarjetas de indicadores de gestión (HU-IND-01).
// Cada tarjeta incluye el valor calculado, subtítulo, ícono semántico y un
// tooltip interactivo que expone la fórmula matemática y la explicación de negocio.

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import type { KPICardData } from "@/modules/indicadores/types";

interface KPIGridProps {
  cards: KPICardData[];
}

export function KPIGrid({ cards }: KPIGridProps) {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const isTooltipOpen = activeTooltip === card.id;

        // Variación porcentual
        const tieneVariacion =
          card.variacionPorcentual !== null &&
          card.variacionPorcentual !== undefined &&
          !Number.isNaN(card.variacionPorcentual);

        const variacionNum = tieneVariacion ? Number(card.variacionPorcentual) : null;
        const sube = variacionNum !== null && variacionNum > 0;
        const baja = variacionNum !== null && variacionNum < 0;

        // Color semántico según regla de negocio
        // card.mejora ya viene calculado del backend/contrato respetando menorEsMejor
        let colorVariacion = "text-slate-600 bg-slate-100 border-slate-200";
        if (card.mejora === true) {
          colorVariacion = "text-green-700 bg-green-50 border-green-200";
        } else if (card.mejora === false) {
          colorVariacion = "text-red-700 bg-red-50 border-red-200";
        }

        return (
          <div
            key={card.id}
            data-testid={`kpi-card-${card.id}`}
            className="relative flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-4 sm:p-5 shadow-xs transition-all hover:border-slate-300 hover:shadow-sm"
          >
            {/* Header de la tarjeta con título e ícono de info para tooltip */}
            <div className="flex items-start justify-between gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 leading-tight">
                {card.titulo}
              </span>

              {/* Botón de información con Tooltip en hover/focus */}
              <div
                className="relative shrink-0"
                onMouseEnter={() => setActiveTooltip(card.id)}
                onMouseLeave={() => setActiveTooltip(null)}
              >
                <button
                  type="button"
                  aria-label={`Ver fórmula de ${card.titulo}`}
                  className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
                  onClick={() => setActiveTooltip(isTooltipOpen ? null : card.id)}
                >
                  <Icon name="info" size={15} />
                </button>

                {/* Popover / Tooltip flotante con la fórmula matemática */}
                {isTooltipOpen && (
                  <div
                    role="tooltip"
                    className="absolute right-0 top-6 z-30 w-72 rounded-md border border-slate-200 bg-white p-3.5 shadow-lg text-left animate-in fade-in zoom-in-95 duration-100"
                  >
                    <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
                      Fórmula de cálculo:
                    </p>
                    <p className="mt-1 font-mono text-xs font-semibold text-slate-800 bg-slate-50 p-1.5 rounded-sm border border-slate-200">
                      {card.formula}
                    </p>
                    <p className="mt-2 text-[11px] leading-relaxed text-slate-600">
                      {card.explicacion}
                    </p>
                    {card.esGlobal && (
                      <div className="mt-2 flex items-center gap-1 rounded-xs bg-sky-50 px-1.5 py-0.5 text-[10px] font-bold text-sky-700 border border-sky-200">
                        <Icon name="public" size={12} />
                        Métrica global (no varía por materia/docente)
                      </div>
                    )}
                    {card.valorAnterior && (
                      <p className="mt-2 text-[10px] font-medium text-slate-500 border-t border-slate-100 pt-1.5">
                        Período anterior: <strong className="text-slate-700">{card.valorAnterior}</strong>
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Valor principal e Icono */}
            <div className="mt-2.5 flex items-baseline justify-between gap-2">
              <span className="font-display text-2xl sm:text-[26px] font-bold tracking-tight text-slate-900">
                {card.valorFormateado}
              </span>

              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${
                  card.colorAcento === "warning"
                    ? "bg-amber-50 text-amber-600 border border-amber-100"
                    : card.colorAcento === "success"
                    ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                    : card.colorAcento === "info"
                    ? "bg-sky-50 text-sky-600 border border-sky-100"
                    : card.colorAcento === "danger"
                    ? "bg-red-50 text-red-600 border border-red-100"
                    : "bg-primary/10 text-primary border border-primary/20"
                }`}
              >
                <Icon name={card.icono} size={20} />
              </div>
            </div>

            {/* Badge de Variación porcentual (HU-IND-03) */}
            <div className="mt-2.5 flex items-center gap-2">
              {tieneVariacion ? (
                <div
                  data-testid="badge-variacion"
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold tracking-tight ${colorVariacion}`}
                  title={
                    card.menorEsMejor
                      ? "En esta métrica, una baja representa una mejora"
                      : undefined
                  }
                >
                  <span>{sube ? "▲" : baja ? "▼" : "•"}</span>
                  <span>
                    {sube ? "+" : ""}
                    {variacionNum?.toFixed(1)}%
                  </span>
                </div>
              ) : (
                <div
                  data-testid="badge-variacion-vacia"
                  className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold text-slate-400 bg-slate-50 border-slate-200"
                  title="Sin datos comparables del período anterior"
                >
                  <span>—</span>
                </div>
              )}
              <span className="text-[11px] text-slate-500 font-medium">
                vs. período ant.
              </span>
            </div>

            {/* Subtítulo y acceso directo al listado de origen */}
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
              <span className="text-xs font-medium text-slate-500 truncate">
                {card.subtitulo || (card.valorAnterior ? `Ant: ${card.valorAnterior}` : "Período actual")}
              </span>
              {card.linkOrigen && (
                <Link
                  href={card.linkOrigen.href}
                  className="flex items-center gap-0.5 text-[11px] font-bold text-secondary hover:underline shrink-0"
                  title={`Ir a ${card.linkOrigen.label}`}
                >
                  <span>{card.linkOrigen.label}</span>
                  <Icon name="chevron_right" size={14} />
                </Link>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
