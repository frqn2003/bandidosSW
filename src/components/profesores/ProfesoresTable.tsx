"use client";

import type { Profesor } from "@/data/profesores";
import { Icon } from "@/components/ui/Icon";
import { MenuAcciones } from "@/components/ui/MenuAcciones";
import { EstadoProfesorBadge } from "@/components/profesores/EstadoProfesorBadge";
import {
  cargaHorariaSemanal,
  formatearTelefono,
  inicialesDe,
  tonoAvatarDe,
} from "@/funciones/profesores";

interface ProfesoresTableProps {
  profesores: Profesor[];
  onVer: (profesor: Profesor) => void;
  onEditar: (profesor: Profesor) => void;
  onVerAgenda: (profesor: Profesor) => void;
  onBaja: (profesor: Profesor) => void;
}

export function ProfesoresTable({
  profesores,
  onVer,
  onEditar,
  onVerAgenda,
  onBaja,
}: ProfesoresTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] border-collapse text-left">
        <caption className="sr-only">
          Listado de profesores con especialidad, contacto, materias asignadas, carga horaria y estado
        </caption>
        <thead>
          <tr className="border-b border-outline-variant bg-surface-container-low">
            <th scope="col" className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
              Docente
            </th>
            <th scope="col" className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
              Especialidad/Título
            </th>
            <th scope="col" className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
              Contacto
            </th>
            <th scope="col" className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
              Materias
            </th>
            <th scope="col" className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
              Carga
            </th>
            <th scope="col" className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
              Estado
            </th>
            <th scope="col" className="w-16 px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/60">
          {profesores.map((profesor) => {
            const carga = cargaHorariaSemanal(profesor);
            const restantesMaterias = profesor.materias.length - 2;
            return (
              <tr
                key={profesor.id}
                className="transition-colors duration-fast ease-out hover:bg-surface-container-low/50"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${tonoAvatarDe(profesor.id)}`}
                    >
                      {inicialesDe(profesor.nombre, profesor.apellido)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-on-surface">
                        {profesor.nombre} {profesor.apellido}
                      </p>
                      <p className="truncate text-xs font-medium text-on-surface-variant">{profesor.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="max-w-[180px] truncate text-sm font-semibold text-on-surface">
                    {profesor.tituloEspecialidad ?? "—"}
                  </p>
                </td>
                <td className="px-4 py-3">
                  {/* El email ya se muestra bajo el nombre, en la columna Docente. */}
                  <span className="flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-on-surface-variant">
                    <Icon name="call" size={14} className="text-secondary" />
                    {formatearTelefono(profesor.telefono)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <ul className="flex flex-col gap-0.5">
                    {profesor.materias.slice(0, 2).map((m) => (
                      <li key={m.materia.id} className="text-sm font-medium text-on-surface">
                        {m.materia.nombre}
                      </li>
                    ))}
                    {restantesMaterias > 0 && (
                      <li>
                        <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-xs font-bold text-on-surface-variant">
                          +{restantesMaterias}
                        </span>
                      </li>
                    )}
                  </ul>
                </td>
                <td className="px-4 py-3">
                  {carga > 0 ? (
                    <p className="text-sm font-semibold text-on-surface">
                      {carga.toFixed(1)} h sem
                    </p>
                  ) : (
                    <p className="text-xs font-medium text-on-surface-variant">Sin horarios</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <EstadoProfesorBadge estado={profesor.estado} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    <MenuAcciones
                      ariaLabel={`Acciones para ${profesor.nombre} ${profesor.apellido}`}
                      acciones={[
                        { label: "Ver ficha", icon: "visibility", onSelect: () => onVer(profesor) },
                        { label: "Editar", icon: "edit", onSelect: () => onEditar(profesor) },
                        {
                          label: "Agenda y disponibilidad",
                          icon: "calendar_clock",
                          onSelect: () => onVerAgenda(profesor),
                        },
                        {
                          label: "Dar de baja",
                          icon: "delete",
                          peligro: true,
                          disabled: profesor.estado === "inactivo",
                          onSelect: () => onBaja(profesor),
                        },
                      ]}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}