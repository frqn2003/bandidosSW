// src/components/indicadores/KPIGrid.tsx
//
// Cuadrícula de 5 tarjetas de indicadores de gestión (HU-IND-01).
// Cada tarjeta incluye el valor calculado, subtítulo, ícono semántico y un
// tooltip interactivo que expone la fórmula matemática y la explicación de negocio.

"use client";

import React, { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import type { KPICardData } from "@/modules/indicadores/types";

interface KPIGridProps {
  cards: KPICardData[];
}

export function KPIGrid({ cards }: KPIGridProps) {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {cards.map((card) => {
        const isTooltipOpen = activeTooltip === card.id;

        return (
          <div
            key={card.id}
            className="relative flex flex-col justify-between rounded-md border border-outline-variant bg-surface-container-lowest p-4 sm:p-4.5 shadow-card transition-all duration-fast hover:border-outline hover:shadow-modal"
          >
            {/* Header de la tarjeta con título e ícono de info para tooltip */}
            <div className="flex items-start justify-between gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant leading-tight">
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
                  className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
                  onClick={() => setActiveTooltip(isTooltipOpen ? null : card.id)}
                >
                  <Icon name="info" size={15} />
                </button>

                {/* Popover / Tooltip flotante con la fórmula matemática */}
                {isTooltipOpen && (
                  <div
                    role="tooltip"
                    className="absolute right-0 top-6 z-30 w-64 rounded-md border border-outline-variant bg-surface-container-lowest p-3 shadow-modal text-left animate-in fade-in zoom-in-95 duration-100"
                  >
                    <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
                      Fórmula de cálculo:
                    </p>
                    <p className="mt-1 font-mono text-xs font-semibold text-on-surface bg-surface-container-low p-1.5 rounded-sm">
                      {card.formula}
                    </p>
                    <p className="mt-2 text-[11px] leading-relaxed text-on-surface-variant">
                      {card.explicacion}
                    </p>
                    {card.esGlobal && (
                      <div className="mt-2 flex items-center gap-1 rounded-xs bg-status-info/10 px-1.5 py-0.5 text-[10px] font-bold text-secondary">
                        <Icon name="public" size={12} />
                        Métrica global (no varía por materia/docente)
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Valor principal */}
            <div className="mt-3 flex items-center justify-between gap-1.5">
              <span className="font-display text-xl sm:text-2xl xl:text-[22px] 2xl:text-[26px] font-bold tracking-tight text-on-surface">
                {card.valorFormateado}
              </span>

              <div
                className={`flex h-8 w-8 sm:h-8.5 sm:w-8.5 shrink-0 items-center justify-center rounded-md ${
                  card.colorAcento === "warning"
                    ? "bg-amber-50 text-amber-600"
                    : card.colorAcento === "success"
                    ? "bg-emerald-50 text-emerald-600"
                    : card.colorAcento === "info"
                    ? "bg-sky-50 text-sky-600"
                    : "bg-primary/10 text-primary"
                }`}
              >
                <Icon name={card.icono} size={18} />
              </div>
            </div>

            {/* Subtítulo o detalle contextual */}
            <div className="mt-3 border-t border-outline-variant/50 pt-2.5">
              <span className="text-xs font-medium text-on-surface-variant">
                {card.subtitulo || "Período actual"}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
