// src/components/calendario/DayView.tsx
//
// Vista Diaria del Calendario (HU-CAL-02).
// Columnas dinámicas agrupadas por Profesor (eje X) y franjas horarias (eje Y).
// Cada columna muestra en su cabecera el apellido del profesor y un badge con la cantidad de turnos del día.
// Soporta tarjetas de turno con estado y "2.º hora", celdas con estado "Libre", y Drag & Drop.

"use client";

import React, { useState } from "react";
import type { TurnoCalendario, ColumnaProfesorDia } from "./types";

interface DayViewProps {
  fecha: string;
  columnas: ColumnaProfesorDia[];
  onSelectTurno: (turno: TurnoCalendario) => void;
  onIniciarReprogramacion?: (
    turnoId: number,
    nuevaFecha: string,
    nuevaHoraInicio: string,
    nuevoProfesorId: number
  ) => void;
  onReservarFranja?: (fecha: string, horaInicio: string, profesorId: number) => void;
  esProfesor?: boolean;
}

const FRANJAS_HORARIAS = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
];

export function DayView({
  fecha,
  columnas,
  onSelectTurno,
  onIniciarReprogramacion,
  onReservarFranja,
  esProfesor = false,
}: DayViewProps) {
  const [arrastrandoTurnoId, setArrastrandoTurnoId] = useState<number | null>(null);
  const [hoveredCellKey, setHoveredCellKey] = useState<string | null>(null);

  const getEstilosMateria = (materiaNombre: string, estado: string) => {
    if (estado === "Cancelado") {
      return {
        bg: "bg-red-50/90 border-red-200 text-red-950",
        materiaText: "text-red-800 font-bold",
        alumnoText: "text-red-900 font-medium",
        badge: "text-red-700 font-bold",
      };
    }
    const lower = materiaNombre.toLowerCase();
    if (lower.includes("matem")) {
      return {
        bg: "bg-blue-50/90 border-blue-200 text-blue-950",
        materiaText: "text-blue-800 font-bold",
        alumnoText: "text-blue-900 font-medium",
        badge: "text-blue-700",
      };
    }
    if (lower.includes("físic") || lower.includes("fisic")) {
      return {
        bg: "bg-purple-50/90 border-purple-200 text-purple-950",
        materiaText: "text-purple-800 font-bold",
        alumnoText: "text-purple-900 font-medium",
        badge: "text-purple-700",
      };
    }
    if (lower.includes("quím") || lower.includes("quim")) {
      return {
        bg: "bg-emerald-50/90 border-emerald-200 text-emerald-950",
        materiaText: "text-emerald-800 font-bold",
        alumnoText: "text-emerald-900 font-medium",
        badge: "text-emerald-700",
      };
    }
    if (lower.includes("ingl")) {
      return {
        bg: "bg-amber-50/90 border-amber-200 text-amber-950",
        materiaText: "text-amber-800 font-bold",
        alumnoText: "text-amber-900 font-medium",
        badge: "text-amber-700",
      };
    }
    return {
      bg: "bg-slate-100 border-slate-300 text-slate-900",
      materiaText: "text-slate-800 font-bold",
      alumnoText: "text-slate-900 font-medium",
      badge: "text-slate-700",
    };
  };

  const handleDragStart = (e: React.DragEvent, turno: TurnoCalendario) => {
    if (esProfesor || !turno.puedeModificar) {
      e.preventDefault();
      return;
    }
    setArrastrandoTurnoId(turno.id);
    e.dataTransfer.setData("text/plain", String(turno.id));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, cellKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (hoveredCellKey !== cellKey) {
      setHoveredCellKey(cellKey);
    }
  };

  const handleDragLeave = () => {
    setHoveredCellKey(null);
  };

  const handleDrop = (e: React.DragEvent, horaInicio: string, profesorId: number) => {
    e.preventDefault();
    setHoveredCellKey(null);
    const turnoIdStr = e.dataTransfer.getData("text/plain");
    const turnoId = Number(turnoIdStr);
    if (!turnoId || isNaN(turnoId)) return;

    if (onIniciarReprogramacion) {
      onIniciarReprogramacion(turnoId, fecha, horaInicio, profesorId);
    }
    setArrastrandoTurnoId(null);
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          {/* Cabecera: Columnas dinámicas agrupadas por Profesor */}
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-700">
              <th scope="col" className="w-16 py-3.5 px-3 text-center font-bold text-slate-400">
                HORA
              </th>
              {columnas.map((col) => (
                <th
                  key={col.profesor.id}
                  scope="col"
                  className="py-3 px-4 border-l border-slate-200 min-w-[11rem]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-extrabold text-sm text-slate-900">
                      {col.profesor.apellido}
                    </span>
                    <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-900 border border-blue-200 shadow-2xs">
                      {col.turnosCount} {col.turnosCount === 1 ? "turno" : "turnos"}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Filas de horas */}
          <tbody className="divide-y divide-slate-100">
            {FRANJAS_HORARIAS.map((hora) => (
              <tr key={hora} className="divide-x divide-slate-100">
                {/* Columna de Hora (Eje Y) */}
                <td className="w-16 py-2 px-2 text-center font-mono text-[11px] font-semibold text-slate-400 bg-slate-50/40 select-none align-middle">
                  {hora}
                </td>

                {/* Celdas por cada profesor */}
                {columnas.map((col) => {
                  const cellKey = `${col.profesor.id}_${hora}`;
                  const turno = col.turnos.find((t) => t.horaInicio === hora);
                  const isHovered = hoveredCellKey === cellKey;
                  const esFranjaLibre = !turno;

                  return (
                    <td
                      key={col.profesor.id}
                      onDragOver={(e) => esFranjaLibre && handleDragOver(e, cellKey)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => esFranjaLibre && handleDrop(e, hora, col.profesor.id)}
                      className={`h-20 p-2 align-middle transition-colors relative ${
                        isHovered ? "bg-blue-50/80 ring-2 ring-inset ring-blue-500" : ""
                      }`}
                    >
                      {turno ? (
                        (() => {
                          const estilos = getEstilosMateria(turno.materia.nombre, turno.estado);
                          const esArrastrado = arrastrandoTurnoId === turno.id;

                          return (
                            <div
                              draggable={!esProfesor && turno.puedeModificar}
                              onDragStart={(e) => handleDragStart(e, turno)}
                              onDragEnd={() => setArrastrandoTurnoId(null)}
                              onClick={() => onSelectTurno(turno)}
                              className={`h-full w-full rounded-md border p-2.5 shadow-2xs flex flex-col justify-center transition-all cursor-pointer select-none ${
                                estilos.bg
                              } ${
                                esArrastrado
                                  ? "opacity-40 scale-95"
                                  : "hover:shadow-xs hover:border-slate-400"
                              }`}
                              title={`${turno.materia.nombre} - ${turno.alumno.apellido}, ${turno.alumno.nombre}`}
                            >
                              <div className="flex items-center justify-between">
                                <span className={`text-xs ${estilos.materiaText}`}>
                                  {turno.materia.nombre}
                                </span>
                                {turno.estado === "Cancelado" && (
                                  <span className="text-[10px] font-extrabold text-red-700 uppercase">
                                    Cancelado
                                  </span>
                                )}
                              </div>
                              <div className="text-xs mt-0.5 font-medium truncate">
                                <span>{turno.alumno.apellido}, {turno.alumno.nombre}</span>
                              </div>
                              {turno.esSegundaHora && (
                                <div className="text-[10px] font-semibold text-slate-500 mt-0.5">
                                  2.º hora
                                </div>
                              )}
                            </div>
                          );
                        })()
                      ) : (
                        /* Franja Libre (Dashed border, clickable) */
                        <div
                          onClick={() =>
                            onReservarFranja && onReservarFranja(fecha, hora, col.profesor.id)
                          }
                          className="h-full w-full rounded-md border border-dashed border-slate-200 bg-white/70 flex items-center justify-center text-slate-400 font-medium text-xs hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/40 cursor-pointer transition-all shadow-2xs"
                          title={`Franja libre para ${col.profesor.apellido} a las ${hora}. Clic para reservar o arrastre un turno aquí para reprogramar.`}
                        >
                          <span>Libre</span>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
