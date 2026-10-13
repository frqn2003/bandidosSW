// src/components/alumnos/historial/TimelineItem.tsx
//
// Elemento individual de la Línea de Tiempo del Alumno (HU-ALU-03).
// Criterios obligatorios:
//  - Fecha y hora
//  - Tipo de evento con ícono de Lucide
//  - Materia y Profesor (si aplica)
//  - Detalle del evento
//  - Usuario responsable que lo registró
//  - Resaltado visual obligatorio para "Cancelación tardía" y "Ausente"
//  - Regla de seguridad: Observaciones de ausencias y Notas protegidas por rol

"use client";

import React from "react";
import {
  Calendar,
  CalendarClock,
  CheckCircle2,
  XCircle,
  Ban,
  StickyNote,
  AlertTriangle,
  User,
  BookOpen,
  Lock,
} from "lucide-react";
import type { EventoHistorialResponse } from "@/contracts/historial";

interface TimelineItemProps {
  evento: EventoHistorialResponse;
  puedeVerObservacionesYNotas: boolean;
  esUltimo?: boolean;
}

function formatearFechaHora(iso: string): { fecha: string; hora: string } {
  try {
    const d = new Date(iso);
    const fecha = d.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const hora = d.toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    return { fecha, hora: `${hora} hs` };
  } catch {
    return { fecha: iso, hora: "" };
  }
}

export function TimelineItem({
  evento,
  puedeVerObservacionesYNotas,
  esUltimo = false,
}: TimelineItemProps) {
  const { fecha, hora } = formatearFechaHora(evento.fechaHora);

  // Configuración visual por tipo de evento
  const esAusente = evento.tipo === "Ausente";
  const esCancelado = evento.tipo === "Cancelado";
  const esCancelacionTardia = esCancelado && evento.cancelacionTardia;

  let iconoNodo = <Calendar className="h-4 w-4" />;
  let colorNodo = "bg-blue-100 text-blue-700 border-blue-300";
  let badgeColor = "bg-blue-50 text-blue-700 border-blue-200";

  switch (evento.tipo) {
    case "Reservado":
      iconoNodo = <Calendar className="h-4 w-4" />;
      colorNodo = "bg-blue-100 text-blue-700 border-blue-300";
      badgeColor = "bg-blue-50 text-blue-700 border-blue-200";
      break;
    case "Modificado":
      iconoNodo = <CalendarClock className="h-4 w-4" />;
      colorNodo = "bg-amber-100 text-amber-700 border-amber-300";
      badgeColor = "bg-amber-50 text-amber-700 border-amber-200";
      break;
    case "Asistió":
      iconoNodo = <CheckCircle2 className="h-4 w-4" />;
      colorNodo = "bg-emerald-100 text-emerald-700 border-emerald-300";
      badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
      break;
    case "Ausente":
      iconoNodo = <XCircle className="h-4 w-4" />;
      colorNodo = "bg-rose-100 text-rose-700 border-rose-300 ring-2 ring-rose-400/40";
      badgeColor = "bg-rose-100 text-rose-800 border-rose-300 font-bold";
      break;
    case "Cancelado":
      iconoNodo = <Ban className="h-4 w-4" />;
      colorNodo = esCancelacionTardia
        ? "bg-rose-100 text-rose-700 border-rose-400 ring-2 ring-rose-400/50"
        : "bg-slate-100 text-slate-700 border-slate-300";
      badgeColor = esCancelacionTardia
        ? "bg-rose-50 text-rose-800 border-rose-200"
        : "bg-slate-100 text-slate-700 border-slate-200";
      break;
    case "Nota":
      iconoNodo = <StickyNote className="h-4 w-4" />;
      colorNodo = "bg-purple-100 text-purple-700 border-purple-300";
      badgeColor = "bg-purple-50 text-purple-700 border-purple-200";
      break;
  }

  // Estilos de tarjeta con resaltado obligatorio
  let cardBorderClass = "border-outline-variant hover:border-slate-300";
  let cardBgClass = "bg-white";

  if (esAusente) {
    // Resaltado obligatorio para "Ausente": borde izquierdo rojo y sutil fondo
    cardBorderClass = "border-rose-300 border-l-4 border-l-rose-500 shadow-rose-100";
    cardBgClass = "bg-rose-50/20";
  } else if (esCancelacionTardia) {
    // Resaltado obligatorio para "Cancelación tardía": borde izquierdo rojo
    cardBorderClass = "border-rose-300 border-l-4 border-l-rose-500 shadow-rose-100";
    cardBgClass = "bg-rose-50/20";
  }

  return (
    <div className="relative flex items-start gap-4 pb-6 group">
      {/* Línea conectora vertical del timeline */}
      {!esUltimo && (
        <span
          className="absolute left-4 top-8 -bottom-1 w-0.5 bg-outline-variant group-hover:bg-slate-300 transition-colors"
          aria-hidden="true"
        />
      )}

      {/* Ícono de nodo */}
      <div
        className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border shadow-xs transition-transform group-hover:scale-105 ${colorNodo}`}
        title={evento.tipo}
      >
        {iconoNodo}
      </div>

      {/* Tarjeta de Contenido */}
      <div
        className={`flex-1 rounded-md border p-4 shadow-sm transition-all ${cardBorderClass} ${cardBgClass}`}
      >
        {/* Cabecera del ítem */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant/60 pb-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {/* Tipo de evento Badge */}
            <span
              className={`inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-xs font-bold ${badgeColor}`}
            >
              {evento.tipo}
            </span>

            {/* OBLIGATORIO: Resaltado visual claro para Cancelación tardía */}
            {esCancelacionTardia && (
              <span className="inline-flex items-center gap-1 rounded-sm bg-rose-600 px-2 py-0.5 text-xs font-bold text-white shadow-xs animate-pulse">
                <AlertTriangle className="h-3 w-3" />
                Cancelación tardía
              </span>
            )}

            {/* Responsable de cancelación si aplica */}
            {esCancelado && evento.responsableCancelacion && (
              <span className="text-[11px] font-medium text-slate-500">
                (Por: {evento.responsableCancelacion})
              </span>
            )}
          </div>

          {/* Fecha y Hora */}
          <div className="text-right text-xs font-semibold text-slate-600">
            <span>{fecha}</span>
            <span className="text-slate-400 mx-1">·</span>
            <span className="tabular-nums font-bold text-slate-700">{hora}</span>
          </div>
        </div>

        {/* Metadatos: Materia y Profesor */}
        {(evento.materia || evento.profesor) && (
          <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs text-slate-600">
            {evento.materia && (
              <div className="inline-flex items-center gap-1 rounded-xs bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                <BookOpen className="h-3.5 w-3.5 text-primary" />
                <span>{evento.materia.nombre}</span>
              </div>
            )}
            {evento.profesor && (
              <div className="inline-flex items-center gap-1 rounded-xs bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                <User className="h-3.5 w-3.5 text-secondary" />
                <span>Prof. {evento.profesor.nombreCompleto}</span>
              </div>
            )}
          </div>
        )}

        {/* Detalle del evento */}
        <div className="mt-2 text-xs leading-relaxed text-on-surface">
          <p className="whitespace-pre-wrap">{evento.detalle}</p>
        </div>

        {/* REGLA DE SEGURIDAD: Observaciones de ausencias */}
        {evento.tipo === "Ausente" && (
          <div className="mt-2.5 rounded-sm bg-slate-50 border border-slate-200 p-2.5 text-xs">
            {puedeVerObservacionesYNotas ? (
              <div>
                <span className="block font-bold text-slate-700 mb-0.5">
                  Observaciones de la inasistencia:
                </span>
                <p className="text-slate-600 italic">
                  {evento.observaciones || "Sin observaciones registradas."}
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-slate-500 italic">
                <Lock className="h-3.5 w-3.5 text-slate-400" />
                <span>Observaciones reservadas (solo visibles para Mesa de Entrada, Gerente y Profesor a cargo).</span>
              </div>
            )}
          </div>
        )}

        {/* REGLA DE SEGURIDAD: Notas si el usuario no tiene permisos */}
        {evento.tipo === "Nota" && !puedeVerObservacionesYNotas && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 italic rounded-sm bg-slate-50 p-2 border border-slate-200">
            <Lock className="h-3.5 w-3.5 text-slate-400" />
            <span>Nota confidencial (solo visible para Mesa de Entrada, Gerente y Profesor a cargo).</span>
          </div>
        )}

        {/* Pie: Usuario responsable que lo registró */}
        <div className="mt-3 flex items-center justify-between border-t border-outline-variant/40 pt-2 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1">
            <span className="font-medium">Registrado por:</span>{" "}
            <strong className="text-slate-700">
              {evento.usuario ? evento.usuario.nombreCompleto : "Sistema"}
            </strong>
          </span>
          <span className="text-[10px] uppercase tracking-wide text-slate-400 font-bold">
            {evento.usuario ? `ID #${evento.usuario.id}` : "Automático"}
          </span>
        </div>
      </div>
    </div>
  );
}
