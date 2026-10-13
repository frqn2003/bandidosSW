// src/components/portal/StudentMyTurns.tsx
//
// Componente "Mis Turnos" en el Portal del Alumno (HU-POR-01).
// Respeta el flujo del diagrama:
// 1. Muestra lista/tabla de turnos propios (Fecha, Hora, Materia, Profesor, Código, Estado con color).
// 2. Por defecto: solo próximos turnos ordenados de forma ascendente.
// 3. Botón / toggle "Ver historial": al activarse, incluye también los turnos pasados y cancelados.

"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { obtenerMisTurnos, type TurnoPortalResponse } from "@/data/portal";

export function StudentMyTurns() {
  const { showToast } = useToast();

  const [turnos, setTurnos] = useState<TurnoPortalResponse[]>([]);
  const [turnosFuturosCount, setTurnosFuturosCount] = useState(0);
  const [limiteMaximo, setLimiteMaximo] = useState(5);
  const [cargando, setCargando] = useState(true);

  // Toggle "Ver historial" (por defecto false -> solo próximos turnos)
  const [verHistorial, setVerHistorial] = useState(false);

  useEffect(() => {
    let cancelado = false;
    obtenerMisTurnos(verHistorial)
      .then((res) => {
        if (cancelado) return;
        setTurnos(res.turnos);
        setTurnosFuturosCount(res.turnosFuturosReservados);
        setLimiteMaximo(res.limiteTurnosFuturos);
      })
      .catch(() => {
        if (!cancelado) {
          showToast("error", "Error al consultar tus turnos.");
        }
      })
      .finally(() => {
        if (!cancelado) {
          setCargando(false);
        }
      });

    return () => {
      cancelado = true;
    };
  }, [verHistorial, showToast]);

  const toggleHistorial = () => {
    setCargando(true);
    setVerHistorial((prev) => !prev);
  };

  // Mapeo de estilos y badges según estado (colores del calendario)
  const renderEstadoBadge = (estado: TurnoPortalResponse["estado"]) => {
    switch (estado) {
      case "Reservado":
        return (
          <span className="inline-flex items-center gap-1 rounded-sm bg-blue-100 px-2 py-0.5 text-xs font-bold text-secondary">
            <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
            Reservado
          </span>
        );
      case "Asistió":
        return (
          <span className="inline-flex items-center gap-1 rounded-sm bg-status-success-strong/15 px-2 py-0.5 text-xs font-bold text-status-success-strong">
            <span className="h-1.5 w-1.5 rounded-full bg-status-success-strong" />
            Asistió
          </span>
        );
      case "Ausente":
        return (
          <span className="inline-flex items-center gap-1 rounded-sm bg-status-warning-strong/15 px-2 py-0.5 text-xs font-bold text-status-warning-strong">
            <span className="h-1.5 w-1.5 rounded-full bg-status-warning-strong" />
            Ausente
          </span>
        );
      case "Cancelado":
        return (
          <span className="inline-flex items-center gap-1 rounded-sm bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
            <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
            Cancelado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-sm bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
            {estado}
          </span>
        );
    }
  };

  return (
    <div className="space-y-5">
      {/* Encabezado y Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Mis Turnos de Clase
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {verHistorial
              ? "Mostrando historial completo de clases (próximas, pasadas y canceladas)"
              : "Mostrando únicamente tus próximas clases reservadas (orden cronológico)"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Badge del límite parametrizable */}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 border border-slate-200">
            <Icon name="event_available" size={15} />
            {turnosFuturosCount} de {limiteMaximo} turnos futuros activos
          </span>

          {/* Botón / Toggle "Ver historial" */}
          <Button
            variant={verHistorial ? "secondary" : "outline"}
            size="sm"
            type="button"
            onClick={toggleHistorial}
            className="gap-1.5"
          >
            <Icon name={verHistorial ? "history" : "history_toggle_drop_down"} size={16} />
            {verHistorial ? "Ver solo próximos" : "Ver historial completo"}
          </Button>

          {/* Botón Reservar nuevo turno */}
          <Link href="/portal/reservar">
            <Button
              variant="primary"
              size="sm"
              type="button"
              className="gap-1.5 bg-secondary hover:bg-secondary/90 text-white"
            >
              <Icon name="add" size={16} />
              Reservar turno
            </Button>
          </Link>
        </div>
      </div>

      {/* Contenido: Tabla de Turnos */}
      {cargando ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <Icon name="progress_activity" size={28} className="animate-spin text-secondary mb-2" />
          <p className="text-xs font-semibold">Cargando tus turnos...</p>
        </div>
      ) : turnos.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-white p-12 text-center text-slate-500 shadow-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
            <Icon name="event_busy" size={28} />
          </div>
          <h3 className="font-bold text-slate-800 text-base">
            {verHistorial ? "Sin registros en el historial" : "No tenés turnos próximos reservados"}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            {verHistorial
              ? "Todavía no registrás clases cursadas ni turnos cancelados en el sistema."
              : "Actualmente no tenés clases programadas. Podés agendar una clase de apoyo cuando lo necesites."}
          </p>
          <div className="mt-5">
            <Link href="/portal/reservar">
              <Button variant="secondary" size="sm" type="button" className="gap-1.5">
                <Icon name="event_available" size={16} />
                Reservar mi primera clase
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[760px] border-collapse text-left text-xs text-slate-700">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3.5">Código</th>
                <th className="px-4 py-3.5">Fecha</th>
                <th className="px-4 py-3.5">Horario</th>
                <th className="px-4 py-3.5">Materia</th>
                <th className="px-4 py-3.5">Profesor</th>
                <th className="px-4 py-3.5">Estado</th>
                <th className="px-4 py-3.5">Observaciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {turnos.map((t) => (
                <tr key={t.id} className="transition-colors hover:bg-slate-50/70">
                  <td className="px-4 py-3.5 font-mono font-bold text-primary">
                    {t.codigo}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap font-medium text-slate-900">
                    {t.fecha}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap font-semibold text-slate-800">
                    {t.horaInicio} – {t.horaFin} hs
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="font-bold text-slate-900">{t.materia.nombre}</span>
                  </td>
                  <td className="px-4 py-3.5 font-medium text-slate-800">
                    {t.profesor.apellido}, {t.profesor.nombre}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    {renderEstadoBadge(t.estado)}
                  </td>
                  <td className="px-4 py-3.5 text-slate-500 max-w-[200px] truncate">
                    {t.observaciones || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
