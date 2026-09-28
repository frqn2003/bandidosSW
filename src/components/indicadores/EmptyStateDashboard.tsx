// src/components/indicadores/EmptyStateDashboard.tsx
//
// Componente de estado vacío cuando no hay datos en el período filtrado (HU-IND-01).
// Muestra el mensaje "Sin datos para el período seleccionado" y el botón para limpiar filtros.

"use client";

import React from "react";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";

interface EmptyStateDashboardProps {
  onLimpiarFiltros: () => void;
}

export function EmptyStateDashboard({ onLimpiarFiltros }: EmptyStateDashboardProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-outline-variant bg-surface-container-lowest p-12 text-center shadow-card">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant mb-4">
        <Icon name="query_stats" size={32} />
      </div>

      <h3 className="font-display text-lg font-bold text-on-surface">
        Sin datos para el período seleccionado
      </h3>

      <p className="mt-1.5 max-w-md text-sm text-on-surface-variant">
        No se encontraron turnos generados ni cobros registrados para el rango de fechas y filtros aplicados.
      </p>

      <div className="mt-6 flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onLimpiarFiltros}
          className="gap-2"
        >
          <Icon name="filter_alt_off" size={18} />
          Restablecer filtros al mes actual
        </Button>
      </div>
    </div>
  );
}
