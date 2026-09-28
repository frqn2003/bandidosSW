"use client";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { EstadoTurnoBadge } from "@/components/turnos/EstadoTurnoBadge";
import { ContadorModificaciones } from "@/components/turnos/ContadorModificaciones";
import { estadoVisibleDe } from "@/funciones/estado-turno";
import { formatearFecha } from "@/funciones/formato";
import { formatearValor } from "@/data/materias";
import type { TurnoResponse } from "@/data/turnos";

// Listado de turnos de /turnos (HU-TUR-02).
//
// Columnas del criterio: Código · Alumno · Materia · Profesor · Fecha ·
// Precio · Estado · Modificaciones · Acciones.
//
// La fila NO vuelve a calcular reglas: los flags `puedeModificar`/`puedeCancelar`
// llegan calculados por el back/fixture. El estado visible (Finalizado derivado)
// sí es del front (decisión 1 del brief).

interface TurnosTableProps {
  turnos: TurnoResponse[];
  maxModificaciones: number;
  onVer: (turno: TurnoResponse) => void;
  onModificar: (turno: TurnoResponse) => void;
  onCancelar: (turno: TurnoResponse) => void;
}

export function TurnosTable({ turnos, maxModificaciones, onVer, onModificar, onCancelar }: TurnosTableProps) {
  return (
    <div className="overflow-x-auto rounded-md border border-outline-variant bg-surface-container-lowest shadow-card">
      <table className="w-full min-w-[1080px] border-collapse text-left">
        <caption className="sr-only">
          Listado de turnos con código, alumno, materia, profesor, fecha, precio, estado, modificaciones y acciones
        </caption>
        <thead>
          <tr className="border-b border-outline-variant bg-surface-container-low">
            {[
              "Turno",
              "Alumno",
              "Materia",
              "Profesor",
              "Fecha",
              "Precio",
              "Estado",
              "Modificaciones",
              "",
            ].map((col) => (
              <th
                key={col || "acciones"}
                scope="col"
                className={`px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant`}
              >
                {col || "Acciones"}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/60">
          {turnos.map((t) => {
            const nombreAlumno = `${t.alumno.apellido}, ${t.alumno.nombre}`;
            const estadoVisible = estadoVisibleDe(t);
            return (
              <tr
                key={t.id}
                className="align-top transition-colors duration-fast ease-out hover:bg-surface-container-low/50"
              >
                <td className="px-4 py-3">
                  <span className="font-mono text-xs font-bold text-primary">{t.codigo}</span>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm font-bold text-on-surface">{nombreAlumno}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm font-semibold text-on-surface">{t.materia.nombre}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm font-semibold text-on-surface">
                    {t.profesor.apellido}, {t.profesor.nombre}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm font-semibold tabular-nums text-on-surface">
                    {formatearFecha(t.fecha).slice(0, 5)} - {t.horaInicio}
                  </p>
                </td>
                <td className="px-4 py-3 text-sm font-semibold tabular-nums text-on-surface">
                  {formatearValor(t.valorClaseCongelado)}
                </td>
                <td className="px-4 py-3">
                  <EstadoTurnoBadge estado={estadoVisible} />
                </td>
                <td className="px-4 py-3 text-center">
                  <ContadorModificaciones
                    cantidad={t.cantidadModificaciones}
                    maxModificaciones={maxModificaciones}
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Ver turno ${t.codigo} de ${nombreAlumno}`}
                      onClick={() => onVer(t)}
                    >
                      <Icon name="visibility" size={20} />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Modificar turno ${t.codigo} de ${nombreAlumno}`}
                      disabled={!t.puedeModificar}
                      onClick={() => onModificar(t)}
                    >
                      <Icon name="edit_calendar" size={20} />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-status-danger hover:bg-status-danger/10"
                      aria-label={`Cancelar turno ${t.codigo} de ${nombreAlumno}`}
                      disabled={!t.puedeCancelar}
                      onClick={() => onCancelar(t)}
                    >
                      <Icon name="event_busy" size={20} />
                    </Button>
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