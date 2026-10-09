// src/components/alumnos/StudentsTable.tsx
//
// Tabla de listado de alumnos con las acciones, estilos e iconografía idéntica
// al módulo de Usuarios.

"use client";

import React from "react";
import { Icon } from "@/components/ui/Icon";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { inicialesDe, tonoAvatarDe } from "@/funciones/formato";
import type { StudentUI } from "@/modules/alumnos/types";

interface StudentsTableProps {
  students: StudentUI[];
  onView: (student: StudentUI) => void;
  onEdit: (student: StudentUI) => void;
  onDeactivate: (student: StudentUI) => void;
  onReactivate: (student: StudentUI) => void;
  reactivatingId?: number | null;
}

export function StudentsTable({
  students,
  onView,
  onEdit,
  onDeactivate,
  onReactivate,
  reactivatingId,
}: StudentsTableProps) {
  if (students.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-outline-variant bg-surface-container-lowest p-12 text-center shadow-card">
        <Icon name="search_off" size={40} className="text-on-surface-variant/60 mb-2" />
        <p className="text-base font-bold text-on-surface">
          No se encontraron alumnos con los filtros seleccionados
        </p>
        <p className="mt-1 text-sm text-on-surface-variant">
          Probá ajustando la búsqueda o mostrando también los inactivos.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-md border border-outline-variant bg-surface-container-lowest shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] border-collapse text-left">
          <thead>
            <tr className="border-b border-outline-variant bg-surface-container-low text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
              <th scope="col" className="px-4 py-3">
                Legajo
              </th>
              <th scope="col" className="px-4 py-3">
                Apellido y Nombre
              </th>
              <th scope="col" className="px-4 py-3">
                DNI
              </th>
              <th scope="col" className="px-4 py-3">
                Nivel
              </th>
              <th scope="col" className="px-4 py-3">
                Materias de interés
              </th>
              <th scope="col" className="px-4 py-3">
                Estado
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/60 text-sm">
            {students.map((student) => {
              const isActive = student.estado === "activo";
              const isReactivating = reactivatingId === student.id;

              return (
                <tr
                  key={student.id}
                  className="transition-colors duration-fast ease-out hover:bg-surface-container-low/50"
                >
                  {/* Legajo */}
                  <td className="px-4 py-3 font-mono text-xs font-bold text-on-surface whitespace-nowrap">
                    {student.legajo}
                  </td>

                  {/* Apellido y Nombre con Avatar y Badge de Estado */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <span
                        aria-hidden="true"
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${tonoAvatarDe(
                          student.id
                        )}`}
                      >
                        {inicialesDe(student.nombre, student.apellido)}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-on-surface">
                          {student.apellido}, {student.nombre}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                            isActive
                              ? "bg-status-success/15 text-status-success-strong"
                              : "bg-surface-container-high text-on-surface-variant"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isActive ? "bg-status-success" : "bg-on-surface-variant/50"
                            }`}
                          />
                          {isActive ? "Activo" : "Inactivo"}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* DNI */}
                  <td className="px-4 py-3 font-mono text-xs text-on-surface-variant tabular-nums whitespace-nowrap">
                    {student.dni}
                  </td>

                  {/* Nivel Educativo */}
                  <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">
                    {student.nivelEducativo}
                  </td>

                  {/* Materias de Interés: estilo de caja idéntico a la captura provista */}
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {student.materiasInteres && student.materiasInteres.length > 0 ? (
                        student.materiasInteres.map((materia) => (
                          <span
                            key={materia.id}
                            className="inline-flex items-center rounded-xs border border-[#d6def4] bg-[#f0f4fd] px-2.5 py-0.5 text-xs font-semibold text-[#3b558c]"
                          >
                            {materia.nombre}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-on-surface-variant/50">—</span>
                      )}
                    </div>
                  </td>

                  {/* Estado */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <StatusBadge
                      variant={isActive ? "success" : "neutral"}
                      icon={isActive ? "check_circle" : "cancel"}
                      label={isActive ? "Activo" : "Inactivo"}
                    />
                  </td>

                  {/* Acciones */}
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="inline-grid grid-cols-3 gap-2.5 items-center w-[136px]">
                      {/* Ver - Siempre en el primer slot */}
                      <div className="flex justify-center">
                        <button
                          type="button"
                          onClick={() => onView(student)}
                          title="Ver ficha completa"
                          aria-label={`Ver ficha de ${student.apellido}, ${student.nombre}`}
                          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-secondary transition-colors duration-fast hover:bg-primary/10 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
                        >
                          <Icon name="visibility" size={20} />
                        </button>
                      </div>

                      {isActive ? (
                        <>
                          {/* Editar - Segundo slot */}
                          <div className="flex justify-center">
                            <button
                              type="button"
                              onClick={() => onEdit(student)}
                              title="Editar ficha"
                              aria-label={`Editar ficha de ${student.apellido}, ${student.nombre}`}
                              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-secondary transition-colors duration-fast hover:bg-primary/10 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
                            >
                              <Icon name="edit" size={20} />
                            </button>
                          </div>

                          {/* Dar de baja - Tercer slot */}
                          <div className="flex justify-center">
                            <button
                              type="button"
                              onClick={() => onDeactivate(student)}
                              title="Dar de baja alumno"
                              aria-label={`Dar de baja alumno ${student.apellido}, ${student.nombre}`}
                              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-error transition-colors duration-fast hover:bg-error/10 hover:text-error focus:outline-none focus-visible:ring-2 focus-visible:ring-error"
                            >
                              <Icon name="delete" size={20} />
                            </button>
                          </div>
                        </>
                      ) : (
                        /* Reactivar - Ocupa exactamente los slots 2 y 3 */
                        <div className="col-span-2">
                          <button
                            type="button"
                            disabled={isReactivating}
                            onClick={() => onReactivate(student)}
                            title="Reactivar alumno"
                            aria-label={`Reactivar alumno ${student.apellido}, ${student.nombre}`}
                            className="inline-flex h-8 w-full cursor-pointer items-center justify-center gap-1.5 rounded-sm border border-secondary bg-white px-2 text-xs font-bold text-secondary shadow-xs transition-colors duration-fast hover:bg-secondary/10 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
                          >
                            <Icon
                              name="restart_alt"
                              size={16}
                              className={isReactivating ? "animate-spin shrink-0" : "shrink-0"}
                            />
                            <span>Reactivar</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
