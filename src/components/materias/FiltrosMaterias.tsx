"use client";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { NIVELES } from "@/data/materias";
import type { NivelMateria } from "@/data/materias";

export interface FiltrosMateriasState {
  busqueda: string;
  nivel: "" | NivelMateria;
  estado: "" | "activo" | "inactivo";
}

/** Filtros por defecto: solo activas (criterio obligatorio de la HU). */
export const FILTROS_MATERIAS_INICIALES: FiltrosMateriasState = {
  busqueda: "",
  nivel: "",
  estado: "activo",
};

interface FiltrosMateriasProps {
  estado: FiltrosMateriasState;
  onChange: (next: FiltrosMateriasState) => void;
  totalActivas: number;
  onExportarCsv: () => void;
  onExportarPdf: () => void;
  exportarDeshabilitado: boolean;
}

export function FiltrosMaterias({
  estado,
  onChange,
  totalActivas,
  onExportarCsv,
  onExportarPdf,
  exportarDeshabilitado,
}: FiltrosMateriasProps) {
  const set = (patch: Partial<FiltrosMateriasState>) => onChange({ ...estado, ...patch });

  const hayFiltros =
    estado.busqueda.trim() !== "" || estado.nivel !== "" || estado.estado !== "activo";

  return (
    <form
      className="flex flex-col gap-3 print:hidden"
      onSubmit={(e) => e.preventDefault()}
      aria-label="Filtros del listado de materias"
    >
      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-end">
        <div className="relative w-full md:max-w-xs">
          {/* BACKEND: búsqueda parcial por nombre → GET /api/materias?busqueda= */}
          <Input
            id="busqueda-materia"
            label="Buscar"
            placeholder="Nombre de la materia…"
            value={estado.busqueda}
            onChange={(e) => set({ busqueda: e.target.value })}
            className="pl-10"
          />
          <Icon
            name="search"
            size={16}
            className="pointer-events-none absolute left-3 top-[38px] text-on-surface-variant"
          />
        </div>

        <div className="w-full md:w-52">
          {/* BACKEND: GET /api/materias?nivel= (enum nivel_materia) */}
          <Select
            id="filtro-nivel"
            label="Nivel"
            value={estado.nivel}
            onChange={(e) => set({ nivel: e.target.value as FiltrosMateriasState["nivel"] })}
          >
            <option value="">Todos los niveles</option>
            {NIVELES.map((nivel) => (
              <option key={nivel} value={nivel}>
                {nivel}
              </option>
            ))}
          </Select>
        </div>

        <div className="w-full md:w-52">
          {/* BACKEND: GET /api/materias?estado= (enum estado_activo_inactivo) */}
          <Select
            id="filtro-estado-materia"
            label="Estado"
            value={estado.estado}
            onChange={(e) => set({ estado: e.target.value as FiltrosMateriasState["estado"] })}
          >
            <option value="activo">Solo activas</option>
            <option value="inactivo">Solo inactivas</option>
            <option value="">Todas (activas e inactivas)</option>
          </Select>
        </div>

        {hayFiltros && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => onChange(FILTROS_MATERIAS_INICIALES)}
            className="self-end"
          >
            <Icon name="close" size={16} />
            Borrar filtros
          </Button>
        )}

        <div className="flex items-end gap-2 md:ml-auto">
          <Button
            type="button"
            variant="outline"
            onClick={onExportarCsv}
            disabled={exportarDeshabilitado}
            title="Descarga un .csv que abre en Excel"
          >
            <Icon name="download" size={16} />
            Exportar CSV
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onExportarPdf}
            disabled={exportarDeshabilitado}
            title="Abre el diálogo de impresión: elegí «Guardar como PDF»"
          >
            <Icon name="print" size={16} />
            PDF
          </Button>
        </div>
      </div>
      <p className="text-xs font-medium text-on-surface-variant" aria-live="polite">
        {totalActivas} {totalActivas === 1 ? "materia activa" : "materias activas"}
      </p>
    </form>
  );
}
