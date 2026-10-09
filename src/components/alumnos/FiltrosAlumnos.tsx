"use client";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

export interface FiltrosAlumnosState {
  busqueda: string;
  estado: "" | "activo" | "inactivo";
}

/** Por defecto solo activos (criterio obligatorio de la HU). */
export const FILTROS_ALUMNOS_INICIALES: FiltrosAlumnosState = {
  busqueda: "",
  estado: "activo",
};

interface FiltrosAlumnosProps {
  estado: FiltrosAlumnosState;
  onChange: (next: FiltrosAlumnosState) => void;
  totalActivos: number;
}

export function FiltrosAlumnos({ estado, onChange, totalActivos }: FiltrosAlumnosProps) {
  const set = (patch: Partial<FiltrosAlumnosState>) => onChange({ ...estado, ...patch });

  // Limpia el selector de estado; la búsqueda se mantiene (no depende de este botón).
  const borrarFiltros = () => onChange({ ...estado, estado: "activo" });

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => e.preventDefault()}
      aria-label="Filtros del listado de alumnos"
    >
      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-end">
        <div className="relative w-full md:max-w-md">
          {/* BACKEND: búsqueda parcial → GET /api/alumnos?busqueda= (legajo,
              nombre, apellido o DNI; el back la resuelve con ILIKE). */}
          <Input
            id="busqueda-alumno"
            label="Buscar"
            placeholder="Nombre, apellido, DNI o legajo…"
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
          {/* BACKEND: GET /api/alumnos?estado= (enum estado_activo_inactivo) */}
          <Select
            id="filtro-estado-alumno"
            label="Estado"
            value={estado.estado}
            onChange={(e) => set({ estado: e.target.value as FiltrosAlumnosState["estado"] })}
          >
            <option value="activo">Solo activos</option>
            <option value="inactivo">Solo inactivos</option>
            <option value="">Todos (activos e inactivos)</option>
          </Select>
        </div>

        <Button type="button" variant="outline" onClick={borrarFiltros} className="self-end">
          <Icon name="filter_alt_off" size={16} />
          Limpiar filtros
        </Button>
      </div>
      <p className="text-xs font-medium text-on-surface-variant" aria-live="polite">
        {totalActivos} {totalActivos === 1 ? "alumno activo" : "alumnos activos"}
      </p>
    </form>
  );
}
