"use client";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { EstadoMateriaBadge } from "@/components/materias/EstadoMateriaBadge";
import {
  codigoMateria,
  formatearFecha,
  formatearValor,
  type MateriaResponse,
} from "@/data/materias";

export type OrdenMaterias = "nombre" | "nivel" | "valor" | "duracion";

interface MateriasTableProps {
  materias: MateriaResponse[];
  orden: OrdenMaterias;
  onOrdenChange: (orden: OrdenMaterias) => void;
  onVer: (materia: MateriaResponse) => void;
  onEditar: (materia: MateriaResponse) => void;
  onBaja: (materia: MateriaResponse) => void;
}

/** Encabezado clickeable: ordena por esa columna. */
function ThOrden({
  label,
  activo,
  onClick,
  alineacion = "left",
}: {
  label: string;
  activo: boolean;
  onClick: () => void;
  alineacion?: "left" | "right";
}) {
  return (
    <th scope="col" className={`px-4 py-0 ${alineacion === "right" ? "text-right" : ""}`}>
      <button
        type="button"
        onClick={onClick}
        aria-pressed={activo}
        className={`inline-flex h-11 cursor-pointer items-center gap-1 text-[11px] font-bold uppercase tracking-wider transition-colors duration-fast ease-out hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary ${
          activo ? "text-on-surface" : "text-on-surface-variant"
        }`}
      >
        {label} <Icon name="swap_vert" size={14} />
      </button>
    </th>
  );
}

export function MateriasTable({
  materias,
  orden,
  onOrdenChange,
  onVer,
  onEditar,
  onBaja,
}: MateriasTableProps) {
  // Orden por defecto: alfabético por nombre A-Z (criterio obligatorio).
  // `localeCompare` con es-AR para que los acentos ordenen bien (Álgebra antes
  // que Análisis).
  const ordenadas = [...materias].sort((a, b) => {
    if (orden === "nivel") return a.nivel.localeCompare(b.nivel, "es-AR");
    if (orden === "valor") return b.valorClase - a.valorClase;
    if (orden === "duracion") return a.duracionClaseMinutos - b.duracionClaseMinutos;
    return a.nombre.localeCompare(b.nombre, "es-AR");
  });

  return (
    <div className="overflow-x-auto rounded-md border border-outline-variant bg-surface-container-lowest shadow-card">
      <table className="w-full min-w-[880px] border-collapse text-left">
        <caption className="sr-only">
          Listado de materias con nivel, duración de clase, valor y estado
        </caption>
        <thead>
          <tr className="border-b border-outline-variant bg-surface-container-low">
            <th
              scope="col"
              className="px-4 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant"
            >
              Código
            </th>
            <ThOrden
              label="Materia"
              activo={orden === "nombre"}
              onClick={() => onOrdenChange("nombre")}
            />
            <ThOrden
              label="Nivel"
              activo={orden === "nivel"}
              onClick={() => onOrdenChange("nivel")}
            />
            <ThOrden
              label="Duración"
              activo={orden === "duracion"}
              onClick={() => onOrdenChange("duracion")}
            />
            <ThOrden
              label="Valor por clase"
              activo={orden === "valor"}
              onClick={() => onOrdenChange("valor")}
              alineacion="right"
            />
            <th
              scope="col"
              className="px-4 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant"
            >
              Estado
            </th>
            <th
              scope="col"
              className="px-4 text-right text-[11px] font-bold uppercase tracking-wider text-on-surface-variant print:hidden"
            >
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/60">
          {ordenadas.map((materia) => {
            const inactiva = materia.estado === "inactivo";
            return (
              <tr
                key={materia.id}
                className="transition-colors duration-fast ease-out hover:bg-surface-container-low/50"
              >
                <td className="px-4 py-3">
                  <span className="font-mono text-xs font-semibold text-on-surface-variant">
                    {codigoMateria(materia.id)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm font-bold text-on-surface">{materia.nombre}</p>
                  {materia.descripcion && (
                    <p className="max-w-[320px] truncate text-xs font-medium text-on-surface-variant">
                      {materia.descripcion}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-on-surface">{materia.nivel}</td>
                <td className="px-4 py-3 text-sm font-medium text-on-surface">
                  {materia.duracionClaseMinutos} min
                </td>
                <td className="px-4 py-3 text-right text-sm font-bold tabular-nums text-on-surface">
                  {formatearValor(materia.valorClase)}
                </td>
                <td className="px-4 py-3">
                  <EstadoMateriaBadge estado={materia.estado} />
                </td>
                <td className="px-4 py-3 print:hidden">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Ver la materia ${materia.nombre}`}
                      onClick={() => onVer(materia)}
                    >
                      <Icon name="visibility" size={16} />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Editar la materia ${materia.nombre}`}
                      onClick={() => onEditar(materia)}
                    >
                      <Icon name="edit" size={16} />
                    </Button>
                    {/* Baja LÓGICA: el ícono es "block", no un tacho — la
                        materia no se borra, queda inactiva. */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={inactiva}
                      aria-label={
                        inactiva
                          ? `${materia.nombre} ya está inactiva`
                          : `Dar de baja la materia ${materia.nombre}`
                      }
                      title={inactiva ? "Ya está inactiva" : "Dar de baja"}
                      onClick={() => onBaja(materia)}
                    >
                      <Icon
                        name="block"
                        size={16}
                        className={inactiva ? undefined : "text-status-danger"}
                      />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="sr-only">
        Última actualización de cada materia disponible en el detalle (ícono Ver).
      </p>
      <span className="hidden print:block px-4 py-2 text-xs text-on-surface-variant">
        {materias.length} materias · generado el {formatearFecha(new Date().toISOString())}
      </span>
    </div>
  );
}
