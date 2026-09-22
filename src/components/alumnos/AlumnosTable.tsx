"use client";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { EstadoAlumnoBadge } from "@/components/alumnos/EstadoAlumnoBadge";
import { inicialesDe, formatearTelefono, tonoAvatarDe } from "@/lib/formato";
import type { AlumnoResponse } from "@/data/alumnos";

interface AlumnosTableProps {
  alumnos: AlumnoResponse[];
  onVer: (alumno: AlumnoResponse) => void;
}

/**
 * Listado de alumnos (HU-ALU-01).
 *
 * Columnas exactas del criterio: N° de legajo · Apellido y Nombre · DNI ·
 * Nivel educativo · Teléfono. El badge de estado va junto al nombre (criterio
 * opcional incluido).
 *
 * El orden (Apellido y luego Nombre, A-Z) lo resuelve la capa de datos, igual
 * que lo hará el back con el índice `(apellido, nombre)`: la tabla solo pinta.
 * En este incremento la única acción es **Ver** — Editar y Baja llegan con
 * HU-ALU-02.
 */
export function AlumnosTable({ alumnos, onVer }: AlumnosTableProps) {
  return (
    <div className="overflow-x-auto rounded-md border border-outline-variant bg-surface-container-lowest shadow-card">
      <table className="w-full min-w-[840px] border-collapse text-left">
        <caption className="sr-only">
          Listado de alumnos con legajo, DNI, nivel educativo, teléfono y estado
        </caption>
        <thead>
          <tr className="border-b border-outline-variant bg-surface-container-low">
            {["N° de legajo", "Apellido y Nombre", "DNI", "Nivel educativo", "Teléfono"].map(
              (col) => (
                <th
                  key={col}
                  scope="col"
                  className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant"
                >
                  {col}
                </th>
              ),
            )}
            <th
              scope="col"
              className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-on-surface-variant"
            >
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/60">
          {alumnos.map((alumno) => (
            <tr
              key={alumno.id}
              className="transition-colors duration-fast ease-out hover:bg-surface-container-low/50"
            >
              <td className="px-4 py-3">
                <span className="font-mono text-xs font-semibold text-on-surface-variant">
                  {alumno.legajo}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${tonoAvatarDe(alumno.id)}`}
                  >
                    {inicialesDe(alumno.nombre, alumno.apellido)}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-on-surface">
                      {alumno.apellido}, {alumno.nombre}
                    </p>
                    <EstadoAlumnoBadge estado={alumno.estado} />
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-sm font-medium tabular-nums text-on-surface">
                {alumno.dni}
              </td>
              <td className="px-4 py-3 text-sm font-medium text-on-surface">
                {alumno.nivelEducativo}
              </td>
              <td className="px-4 py-3 text-sm font-medium tabular-nums text-on-surface">
                {formatearTelefono(alumno.telefono)}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Ver la ficha de ${alumno.apellido}, ${alumno.nombre}`}
                    onClick={() => onVer(alumno)}
                  >
                    <Icon name="visibility" size={16} />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
