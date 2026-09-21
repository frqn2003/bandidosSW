"use client";

import type { Profesor } from "@/data/profesores";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { EstadoProfesorBadge } from "@/components/profesores/EstadoProfesorBadge";

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export type OrdenProfesores = "nombre" | "materias" | "fechaAlta";

interface ProfesoresTableProps {
  profesores: Profesor[];
  orden: OrdenProfesores;
  onOrdenChange: (orden: OrdenProfesores) => void;
  onVer: (profesor: Profesor) => void;
  onEditar: (profesor: Profesor) => void;
  onVerDisponibilidad: (profesor: Profesor) => void;
  onBaja: (profesor: Profesor) => void;
}

export function ProfesoresTable({
  profesores,
  orden,
  onOrdenChange,
  onVer,
  onEditar,
  onVerDisponibilidad,
  onBaja,
}: ProfesoresTableProps) {
  const ordenados = [...profesores].sort((a, b) => {
    if (orden === "materias") return b.materias.length - a.materias.length;
    if (orden === "fechaAlta") return b.fechaCreacion.localeCompare(a.fechaCreacion);
    return `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`);
  });

  // Resumen semanal compacto: "Lun 8-10 · Mar 8-12".
  const resumenSemanal = (p: Profesor) =>
    DIAS.map((d, i) => (p.bloquesPorDia[i + 1]?.length ? `${d} ${p.bloquesPorDia[i + 1].join(", ")}` : null))
      .filter(Boolean)
      .join(" · ");

  return (
    <div className="overflow-x-auto rounded-md border border-outline-variant bg-surface-container-lowest shadow-card">
      <table className="w-full min-w-[880px] border-collapse text-left">
        <caption className="sr-only">
          Listado de profesores con materias asignadas, disponibilidad semanal y estado
        </caption>
        <thead>
          <tr className="border-b border-outline-variant bg-surface-container-low">
            <th scope="col" className="px-4 py-0">
              <button
                type="button"
                onClick={() => onOrdenChange("nombre")}
                aria-pressed={orden === "nombre"}
                className="inline-flex h-11 cursor-pointer items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant transition-colors duration-fast ease-out hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
              >
                Profesor <Icon name="swap_vert" size={14} />
              </button>
            </th>
            <th scope="col" className="px-4 py-0">
              <button
                type="button"
                onClick={() => onOrdenChange("materias")}
                aria-pressed={orden === "materias"}
                className="inline-flex h-11 cursor-pointer items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant transition-colors duration-fast ease-out hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
              >
                Materias <Icon name="swap_vert" size={14} />
              </button>
            </th>
            <th scope="col" className="px-4 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
              Disponibilidad
            </th>
            <th scope="col" className="px-4 py-0">
              <button
                type="button"
                onClick={() => onOrdenChange("fechaAlta")}
                aria-pressed={orden === "fechaAlta"}
                className="inline-flex h-11 cursor-pointer items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant transition-colors duration-fast ease-out hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
              >
                Alta <Icon name="swap_vert" size={14} />
              </button>
            </th>
            <th scope="col" className="px-4 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
              Estado
            </th>
            <th scope="col" className="px-4 text-right text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/60">
          {ordenados.map((profesor) => (
            <tr key={profesor.id} className="transition-colors duration-fast ease-out hover:bg-surface-container-low/50">
              <td className="px-4 py-3">
                <p className="text-sm font-bold text-on-surface">
                  {profesor.apellido}, {profesor.nombre}
                </p>
                <p className="text-xs font-medium text-on-surface-variant">{profesor.email}</p>
              </td>
              <td className="px-4 py-3">
                <ul className="flex flex-col gap-0.5">
                  {profesor.materias.map((m) => (
                    <li key={m.materia.id} className="text-sm font-medium text-on-surface">
                      {m.materia.nombre}
                      <span className="ml-1 text-xs font-semibold text-on-surface-variant">
                        (cap. {m.capacidadMaxima})
                      </span>
                    </li>
                  ))}
                </ul>
              </td>
              <td className="px-4 py-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onVerDisponibilidad(profesor)}
                  className="justify-start px-2 text-left"
                >
                  <Icon name="calendar_clock" size={16} />
                  <span className="max-w-[220px] truncate text-xs font-semibold">
                    {resumenSemanal(profesor) || "Sin horarios"}
                  </span>
                </Button>
              </td>
              <td className="px-4 py-3 text-xs font-medium text-on-surface-variant">
                {new Date(profesor.fechaCreacion + "T00:00:00").toLocaleDateString("es-AR", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </td>
              <td className="px-4 py-3">
                <EstadoProfesorBadge estado={profesor.estado} />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Ver ficha de ${profesor.apellido}, ${profesor.nombre}`}
                    onClick={() => onVer(profesor)}
                  >
                    <Icon name="visibility" size={16} />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Editar ${profesor.apellido}, ${profesor.nombre}`}
                    onClick={() => onEditar(profesor)}
                  >
                    <Icon name="edit" size={16} />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Dar de baja ${profesor.apellido}, ${profesor.nombre}`}
                    onClick={() => onBaja(profesor)}
                  >
                    <Icon name="delete" size={16} className="text-status-danger" />
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