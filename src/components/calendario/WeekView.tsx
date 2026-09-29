// src/components/calendario/WeekView.tsx
//
// Vista Semanal del Calendario (HU-CAL-02).
// Grilla con horas en el eje Y (09:00 - 16:00+) y días (LUN a SÁB) en el eje X.
// Renderiza tarjetas de turno con color por materia, apellido del alumno y profesor.
// Implementa lógica de desbordamiento (máx. 3 tarjetas visibles + botón "+N turnos más").
// Soporta interacción Drag & Drop para reprogramar turnos en franjas horarias libres.

"use client";

import React, { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import type { TurnoCalendario, ProfesorCalendario } from "./types";

interface WeekViewProps {
  diasSemana: { fecha: string; nombreDia: string; numeroDia: number; esHoy: boolean }[];
  turnos: TurnoCalendario[];
  profesores: ProfesorCalendario[];
  filtroProfesorId?: number;
  onSelectTurno: (turno: TurnoCalendario) => void;
  onIniciarReprogramacion?: (
    turnoId: number,
    nuevaFecha: string,
    nuevaHoraInicio: string,
    nuevoProfesorId: number
  ) => void;
  onReservarFranja?: (fecha: string, horaInicio: string) => void;
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

export function WeekView({
  diasSemana,
  turnos,
  profesores,
  filtroProfesorId,
  onSelectTurno,
  onIniciarReprogramacion,
  onReservarFranja,
  esProfesor = false,
}: WeekViewProps) {
  // Modal de desborde (+N turnos más)
  const [slotDesborde, setSlotDesborde] = useState<{
    fecha: string;
    hora: string;
    turnos: TurnoCalendario[];
  } | null>(null);

  // Arrastre activo para Drag & Drop
  const [arrastrandoTurnoId, setArrastrandoTurnoId] = useState<number | null>(null);
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);

  const hayMultiplesProfesores = filtroProfesorId === undefined;

  const getEstilosMateria = (materiaNombre: string, estado: string) => {
    if (estado === "Cancelado") {
      return {
        bg: "bg-red-50 border-red-200 text-red-950",
        accent: "text-red-700",
        badge: "text-red-700 font-bold",
      };
    }
    const lower = materiaNombre.toLowerCase();
    if (lower.includes("matem")) {
      return {
        bg: "bg-blue-50/90 border-blue-200 text-blue-950",
        accent: "text-blue-700",
        badge: "text-blue-800",
      };
    }
    if (lower.includes("físic") || lower.includes("fisic")) {
      return {
        bg: "bg-purple-50/90 border-purple-200 text-purple-950",
        accent: "text-purple-700",
        badge: "text-purple-800",
      };
    }
    if (lower.includes("quím") || lower.includes("quim")) {
      return {
        bg: "bg-emerald-50/90 border-emerald-200 text-emerald-950",
        accent: "text-emerald-700",
        badge: "text-emerald-800",
      };
    }
    if (lower.includes("ingl")) {
      return {
        bg: "bg-amber-50/90 border-amber-200 text-amber-950",
        accent: "text-amber-700",
        badge: "text-amber-800",
      };
    }
    return {
      bg: "bg-slate-100 border-slate-300 text-slate-900",
      accent: "text-slate-700",
      badge: "text-slate-800",
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

  const handleDragOver = (e: React.DragEvent, slotKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (hoveredSlot !== slotKey) {
      setHoveredSlot(slotKey);
    }
  };

  const handleDragLeave = () => {
    setHoveredSlot(null);
  };

  const handleDrop = (e: React.DragEvent, fecha: string, horaInicio: string) => {
    e.preventDefault();
    setHoveredSlot(null);
    const turnoIdStr = e.dataTransfer.getData("text/plain");
    const turnoId = Number(turnoIdStr);
    if (!turnoId || isNaN(turnoId)) return;

    const turno = turnos.find((t) => t.id === turnoId);
    if (!turno) return;

    // Asigna el profesor adecuado (si está filtrado usa ese, o busca el asignado en la lista)
    const profEncontrado = profesores.find((p) => p.id === turno.profesor.id);
    const profId = filtroProfesorId ?? (profEncontrado ? profEncontrado.id : turno.profesor.id);

    if (onIniciarReprogramacion) {
      onIniciarReprogramacion(turnoId, fecha, horaInicio, profId);
    }
    setArrastrandoTurnoId(null);
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          {/* Cabecera: Días de la semana */}
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-700">
              <th scope="col" className="w-16 py-3 px-3 text-center font-bold text-slate-400">
                HORA
              </th>
              {diasSemana.map((dia) => (
                <th
                  key={dia.fecha}
                  scope="col"
                  className={`py-3 px-3 text-center border-l border-slate-200 font-bold transition-colors ${
                    dia.esHoy ? "bg-blue-50/70" : ""
                  }`}
                >
                  <div className="flex flex-col items-center">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      {dia.nombreDia}
                    </span>
                    <span
                      className={`mt-0.5 text-base font-extrabold ${
                        dia.esHoy
                          ? "flex h-7 w-7 items-center justify-center rounded-full bg-blue-900 text-white shadow-2xs"
                          : "text-slate-900"
                      }`}
                    >
                      {dia.numeroDia}
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
                <td className="w-16 py-2 px-2 text-center font-mono text-[11px] font-semibold text-slate-400 bg-slate-50/40 select-none align-top">
                  {hora}
                </td>

                {/* Columnas de cada día (Eje X) */}
                {diasSemana.map((dia) => {
                  const slotKey = `${dia.fecha}_${hora}`;
                  const turnosEnFranja = turnos.filter(
                    (t) => t.fecha === dia.fecha && t.horaInicio === hora
                  );

                  const isSlotHovered = hoveredSlot === slotKey;
                  const MAX_VISIBLES = 3;
                  const tieneDesborde = turnosEnFranja.length > MAX_VISIBLES;
                  const visibles = tieneDesborde
                    ? turnosEnFranja.slice(0, MAX_VISIBLES)
                    : turnosEnFranja;
                  const sobrantes = turnosEnFranja.length - MAX_VISIBLES;

                  return (
                    <td
                      key={dia.fecha}
                      onDragOver={(e) => handleDragOver(e, slotKey)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, dia.fecha, hora)}
                      className={`h-24 p-1.5 align-top transition-colors relative group/slot ${
                        isSlotHovered
                          ? "bg-blue-50/80 ring-2 ring-inset ring-blue-500"
                          : dia.esHoy
                          ? "bg-blue-50/15"
                          : "hover:bg-slate-50/60"
                      }`}
                    >
                      <div className="flex flex-col gap-1.5 h-full">
                        {visibles.map((turno) => {
                          const estilos = getEstilosMateria(turno.materia.nombre, turno.estado);
                          const esArrastrado = arrastrandoTurnoId === turno.id;

                          return (
                            <div
                              key={turno.id}
                              draggable={!esProfesor && turno.puedeModificar}
                              onDragStart={(e) => handleDragStart(e, turno)}
                              onDragEnd={() => setArrastrandoTurnoId(null)}
                              onClick={() => onSelectTurno(turno)}
                              className={`rounded-md border p-1.5 shadow-2xs transition-all cursor-pointer select-none ${
                                estilos.bg
                              } ${
                                esArrastrado ? "opacity-40 scale-95" : "hover:shadow-xs hover:border-slate-400"
                              }`}
                              title={`${turno.materia.nombre} · ${turno.alumno.apellido} (${turno.profesor.apellido})`}
                            >
                              <div className="flex items-center justify-between gap-1 leading-tight">
                                <span className="font-bold text-[11px] truncate">
                                  {turno.materia.nombre}
                                </span>
                                {turno.estado === "Cancelado" && (
                                  <span className="text-[10px] font-bold text-red-700 uppercase">
                                    Cancelado
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] leading-tight truncate mt-0.5 opacity-90">
                                <span>{turno.alumno.apellido}, {turno.alumno.nombre[0]}.</span>
                                {hayMultiplesProfesores && (
                                  <span className="font-semibold ml-1">
                                    · {turno.profesor.apellido}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {/* Botón de Desborde (+N turnos más) */}
                        {tieneDesborde && (
                          <button
                            type="button"
                            onClick={() =>
                              setSlotDesborde({
                                fecha: dia.fecha,
                                hora,
                                turnos: turnosEnFranja,
                              })
                            }
                            className="mt-auto inline-flex items-center justify-center rounded-md bg-blue-50 border border-blue-200 px-2 py-1 text-[11px] font-bold text-blue-900 hover:bg-blue-100 transition-colors shadow-2xs cursor-pointer"
                          >
                            +{sobrantes} turnos más
                          </button>
                        )}

                        {/* Celda vacía con opción de reservar */}
                        {turnosEnFranja.length === 0 && (
                          <div
                            onClick={() => onReservarFranja && onReservarFranja(dia.fecha, hora)}
                            className="h-full w-full rounded flex items-center justify-center text-transparent hover:text-slate-400 hover:border hover:border-dashed hover:border-slate-300 hover:bg-white/80 cursor-pointer transition-all"
                            title={`Reservar turno para el ${dia.fecha} a las ${hora}`}
                          >
                            <span className="text-[10px] font-semibold flex items-center gap-1">
                              <Icon name="add" size={14} /> Libre
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal / Popover de Desborde (+N turnos más) */}
      {slotDesborde && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-2xs">
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Turnos en la franja ({slotDesborde.hora} hs)
                </h3>
                <p className="text-xs text-slate-500">
                  Fecha: {slotDesborde.fecha} · Total: {slotDesborde.turnos.length} turnos
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSlotDesborde(null)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <div className="mt-3 flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
              {slotDesborde.turnos.map((t) => {
                const estilos = getEstilosMateria(t.materia.nombre, t.estado);
                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      onSelectTurno(t);
                      setSlotDesborde(null);
                    }}
                    className={`rounded-md border p-2.5 transition-all cursor-pointer ${estilos.bg} hover:shadow-xs`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">{t.materia.nombre}</span>
                      <span className="font-mono text-xs font-semibold">{t.codigo}</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-700">
                      Alumno: <strong>{t.alumno.apellido}, {t.alumno.nombre}</strong> · Profesor: <strong>{t.profesor.apellido}</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
