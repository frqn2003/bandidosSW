"use client";

import type { MateriaRef } from "@/data/profesores";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

export interface FiltrosProfesoresState {
  busqueda: string;
  materiaId: string;
  estado: "" | "activo" | "inactivo";
}

interface FiltrosProfesoresProps {
  estado: FiltrosProfesoresState;
  onChange: (next: FiltrosProfesoresState) => void;
  materiasCatalogo: MateriaRef[];
  totalActivos: number;
}

export function FiltrosProfesores({
  estado,
  onChange,
  materiasCatalogo,
  totalActivos,
}: FiltrosProfesoresProps) {
  const set = (patch: Partial<FiltrosProfesoresState>) => onChange({ ...estado, ...patch });

  // Limpia los selectores; la búsqueda se mantiene (no depende de este botón).
  const borrarFiltros = () =>
    onChange({ ...estado, materiaId: "", estado: "activo" });

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => e.preventDefault()}
      aria-label="Filtros del listado"
    >
      <div className="flex flex-wrap items-end gap-2">
        <div className="relative w-full md:min-w-0 md:flex-1">
          {/* BACKEND: búsqueda por nombre, apellido o título contra GET /api/profesores?q= */}
          <Input
            id="busqueda-profesor"
            label="Buscar"
            placeholder="Buscar por nombre y apellido"
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
        <div className="w-full md:w-40">
          {/* BACKEND: GET /api/materias?estado=activo (catálogo para el filtro) */}
          <Select
            id="filtro-materia"
            label="Materia"
            value={estado.materiaId}
            onChange={(e) => set({ materiaId: e.target.value })}
            className="w-full min-w-0 truncate text-sm"
          >
            <option value="">Todas las materias</option>
            {materiasCatalogo.map((m) => (
              <option key={m.id} value={String(m.id)}>
                {m.nombre}
              </option>
            ))}
          </Select>
        </div>

        <div className="w-full md:w-36">
          {/* BACKEND: filtro por profesor.estado (activo/inactivo) */}
          <Select
            id="filtro-estado"
            label="Estado"
            value={estado.estado}
            onChange={(e) => set({ estado: e.target.value as FiltrosProfesoresState["estado"] })}
            className="w-full min-w-0 truncate text-sm"
          >
            <option value="activo">Solo activos</option>
            <option value="inactivo">Solo inactivos</option>
            <option value="">Todos (activos e inactivos)</option>
          </Select>
        </div>

        <Button type="button" variant="outline" onClick={borrarFiltros}>
          <Icon name="filter_alt_off" size={16} />
          Limpiar filtros
        </Button>
      </div>

      <p className="text-xs font-medium text-on-surface-variant" aria-live="polite">
        {totalActivos} {totalActivos === 1 ? "profesor activo" : "profesores activos"}
      </p>
    </form>
  );
}