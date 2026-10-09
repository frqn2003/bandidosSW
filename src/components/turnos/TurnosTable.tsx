"use client";

import { MenuAcciones } from "@/components/ui/MenuAcciones";
import { EstadoTurnoBadge } from "@/components/turnos/EstadoTurnoBadge";
import { ContadorModificaciones } from "@/components/turnos/ContadorModificaciones";
import { estadoVisibleDe } from "@/funciones/estado-turno";
import type { TurnoResponse } from "@/data/turnos";

// Listado de turnos de /turnos (HU-TUR-02).
//
// Columnas del criterio: Código · Alumno · Materia · Profesor · Fecha y hora ·
// Estado · Modif. · Acciones.
//
// Formato de fecha y hora: `Lun 28/09 · 15:00` (criterio específico de HU-TUR-02).
// Las acciones van agrupadas en un `MenuAcciones` para evitar desbordes y estandarizar
// el menú desplegable (Ver · Modificar · Cancelar).

interface TurnosTableProps {
  turnos: TurnoResponse[];
  maxModificaciones: number;
  onVer: (turno: TurnoResponse) => void;
  onModificar: (turno: TurnoResponse) => void;
  onCancelar: (turno: TurnoResponse) => void;
}

const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function formatearFechaHoraTurno(fechaIso: string, hora: string): string {
  const soloFecha = fechaIso.slice(0, 10);
  const d = new Date(`${soloFecha}T00:00:00`);
  if (Number.isNaN(d.getTime())) return `${fechaIso} · ${hora}`;
  const weekday = DIAS_CORTOS[d.getDay()] ?? "";
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  return `${weekday} ${dia}/${mes} · ${hora}`;
}

export function TurnosTable({ turnos, maxModificaciones, onVer, onModificar, onCancelar }: TurnosTableProps) {
  return (
    <div className="overflow-x-auto rounded-md border border-outline-variant bg-surface-container-lowest shadow-card">
      <table className="w-full min-w-[1020px] border-collapse text-left">
        <caption className="sr-only">
          Listado de turnos con código, alumno, materia, profesor, fecha y hora, estado, modificaciones y acciones
        </caption>
        <thead>
          <tr className="border-b border-outline-variant bg-surface-container-low">
            {[
              "Código",
              "Alumno",
              "Materia",
              "Profesor",
              "Fecha y hora",
              "Estado",
              "Modif.",
              "Acciones",
            ].map((col) => (
              <th
                key={col}
                scope="col"
                className={`px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant ${
                  col === "Acciones" ? "text-right" : col === "Modif." ? "text-center" : ""
                }`}
              >
                {col}
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
                className="align-middle transition-colors duration-fast ease-out hover:bg-surface-container-low/50"
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
                    {formatearFechaHoraTurno(t.fecha, t.horaInicio)}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <EstadoTurnoBadge estado={estadoVisible} />
                </td>
                <td className="px-4 py-3 text-center">
                  {t.estado === "Cancelado" ? (
                    <span className="text-sm font-medium text-on-surface-variant/60" aria-label="Sin modificaciones aplicables">
                      —
                    </span>
                  ) : (
                    <ContadorModificaciones
                      cantidad={t.cantidadModificaciones}
                      maxModificaciones={maxModificaciones}
                    />
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end">
                    <MenuAcciones
                      ariaLabel={`Acciones para el turno ${t.codigo} de ${nombreAlumno}`}
                      acciones={[
                        {
                          label: "Ver",
                          icon: "visibility",
                          onSelect: () => onVer(t),
                        },
                        {
                          label: "Modificar",
                          icon: "edit_calendar",
                          disabled: !t.puedeModificar,
                          title: !t.puedeModificar ? (t.motivoDeshabilitado ?? "No se puede modificar este turno") : undefined,
                          onSelect: () => onModificar(t),
                        },
                        {
                          label: "Cancelar",
                          icon: "event_busy",
                          peligro: true,
                          disabled: !t.puedeCancelar,
                          title: !t.puedeCancelar ? (t.motivoDeshabilitado ?? "No se puede cancelar este turno") : undefined,
                          onSelect: () => onCancelar(t),
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