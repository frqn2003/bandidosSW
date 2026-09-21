"use client";

import type { MateriaRef } from "@/data/profesores";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

const DIAS_FILTRO = [
  { value: "1", label: "Lunes" },
  { value: "2", label: "Martes" },
  { value: "3", label: "Miércoles" },
  { value: "4", label: "Jueves" },
  { value: "5", label: "Viernes" },
  { value: "6", label: "Sábado" },
];

export interface FiltrosProfesoresState {
  busqueda: string;
  materiaId: string;
  dia: string; // "" | "1".."6"
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
    onChange({ ...estado, materiaId: "", dia: "", estado: "activo" });

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
            className="text-sm"
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
          {/* BACKEND: filtro por dia_semana (1-6) de agenda_profesional */}
          <Select
            id="filtro-dia"
            label="Día"
            value={estado.dia}
            onChange={(e) => set({ dia: e.target.value })}
            className="text-sm"
          >
            <option value="">Cualquier día</option>
            {DIAS_FILTRO.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
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
            className="text-sm"
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