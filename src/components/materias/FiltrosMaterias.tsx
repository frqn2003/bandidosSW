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
}

export function FiltrosMaterias({ estado, onChange, totalActivas }: FiltrosMateriasProps) {
  const set = (patch: Partial<FiltrosMateriasState>) => onChange({ ...estado, ...patch });

  // Limpia los selectores; la búsqueda se mantiene (no depende de este botón).
  const borrarFiltros = () => onChange({ ...estado, nivel: "", estado: "activo" });

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

        <Button type="button" variant="outline" onClick={borrarFiltros} className="self-end">
          <Icon name="filter_alt_off" size={16} />
          Limpiar filtros
        </Button>
      </div>
      <p className="text-xs font-medium text-on-surface-variant" aria-live="polite">
        {totalActivas} {totalActivas === 1 ? "materia activa" : "materias activas"}
      </p>
    </form>
  );
}
