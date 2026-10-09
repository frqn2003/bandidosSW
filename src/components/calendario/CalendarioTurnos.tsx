// src/components/calendario/CalendarioTurnos.tsx
//
// Módulo "Calendario de Turnos" refactorizado (HU-CAL-02).
// Arquitectura modular y limpia:
//  · useCalendar hook con estado reactivo, filtros, simulación en tiempo real (30s) y Drag & Drop.
//  · CalendarToolbar: selector de vista (Día, Semana, Mes), navegación temporal, filtros combinables.
//  · MonthView: grilla mensual con badges y barras por materia, navegación a vista Día al hacer clic.
//  · WeekView: franjas horarias y días de la semana, tarjetas con materia/alumno/profesor y desbordamiento.
//  · DayView: columnas agrupadas por profesor, indicación de "2.º hora", ranuras libres y Drag & Drop.
//  · TurnDetailsSidebar: panel lateral en modo lectura con datos completos del turno y permisos según rol.
//  · ReprogramarModal: confirmación de Drag & Drop con comparación "Antes" vs "Después".
//  · ReservaTurnoModal: agendamiento de nuevas clases en franjas disponibles.

"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useSesion } from "@/funciones/sesion";
import { CalendarToolbar } from "./CalendarToolbar";
import { MonthView } from "./MonthView";
import { WeekView } from "./WeekView";
import { DayView } from "./DayView";
import { TurnDetailsSidebar } from "./TurnDetailsSidebar";
import { ReprogramarModal } from "./ReprogramarModal";
import { ReservaTurnoModal } from "./ReservaTurnoModal";
import { useCalendar } from "./useCalendar";
import type { ProfesorCalendario as ProfesorCalendarioContrato } from "@/data/calendario";

interface CalendarioTurnosProps {
  profesores?: ProfesorCalendarioContrato[];
  profesorFijo?: ProfesorCalendarioContrato | null;
  profesorIdInicial?: string;
  materiaIdInicial?: string;
  fechaIdeal?: string;
  vistaInicial?: "dia" | "semana" | "mes";
}

export function CalendarioTurnos({
  profesorFijo,
  profesorIdInicial,
  materiaIdInicial,
  fechaIdeal,
  vistaInicial,
}: CalendarioTurnosProps) {
  const router = useRouter();
  const { sesion } = useSesion();

  // El rol Profesor tiene restringidas las modificaciones directas y el selector de profesor
  const esProfesor =
    sesion?.usuario.rol.nombre === "Profesor" || Boolean(profesorFijo);

  const initialProfesorId = profesorFijo?.id
    ? profesorFijo.id
    : profesorIdInicial
    ? Number(profesorIdInicial)
    : undefined;

  const initialMateriaId = materiaIdInicial
    ? Number(materiaIdInicial)
    : undefined;

  // Hook centralizado con estado y lógica de negocio
  const {
    vista,
    fechaSeleccionada,
    filtros,
    tituloPeriodo,
    segundosActualizado,
    isRefreshing,
    error,
    profesores,
    materias,
    bloques,
    turnos,
    diasSemana,
    columnasDia,
    diasMes,
    turnoSeleccionado,
    reprogramacionPendiente,
    cambiarVista,
    seleccionarFecha,
    irAHoy,
    anterior,
    siguiente,
    setProfesorFiltro,
    setMateriaFiltro,
    toggleVerCancelados,
    toggleSoloConCupo,
    seleccionarTurno,
    cerrarDetalle,
    iniciarReprogramacion,
    confirmarReprogramacion,
    cancelarReprogramacion,
    cancelarTurno,
  } = useCalendar({
    vistaInicial,
    fechaInicial: fechaIdeal,
    profesorIdInicial: initialProfesorId,
    materiaIdInicial: initialMateriaId,
  });

  // Estado del modal para reservar turno en un hueco libre
  const [reservaModal, setReservaModal] = useState<{
    open: boolean;
    fecha: string;
    horaInicio: string;
    horaFin: string;
    profesorId?: number;
  }>({
    open: false,
    fecha: fechaSeleccionada,
    horaInicio: "10:00",
    horaFin: "11:00",
  });

  const abrirReserva = (fecha: string, horaInicio: string, profId?: number) => {
    const [h, m] = horaInicio.split(":").map(Number);
    const finMin = h * 60 + m + 60;
    const horaFin = `${String(Math.floor(finMin / 60)).padStart(2, "0")}:${String(
      finMin % 60
    ).padStart(2, "0")}`;

    setReservaModal({
      open: true,
      fecha,
      horaInicio,
      horaFin,
      profesorId: profId ?? (filtros.profesorId || undefined),
    });
  };

  const profesorParaReserva = reservaModal.profesorId
    ? profesores.find((p) => p.id === reservaModal.profesorId) ?? null
    : null;

  return (
    <div className="flex w-full min-w-0 flex-col gap-5">
      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900 shadow-sm">
          <span className="material-symbols-outlined text-amber-600">warning</span>
          <div className="text-sm font-medium">{error}</div>
        </div>
      )}
      {/* Barra de herramientas superior */}
      <CalendarToolbar
        vista={vista}
        onCambiarVista={cambiarVista}
        tituloPeriodo={tituloPeriodo}
        segundosActualizado={segundosActualizado}
        isRefreshing={isRefreshing}
        onIrAHoy={irAHoy}
        onAnterior={anterior}
        onSiguiente={siguiente}
        onReservarTurno={() => {
          const params = new URLSearchParams();
          if (filtros.profesorId) params.set("profesorId", String(filtros.profesorId));
          if (filtros.materiaId) params.set("materiaId", String(filtros.materiaId));
          router.push(`/turnos/reservas${params.toString() ? `?${params.toString()}` : ""}`);
        }}
        profesores={profesores}
        materias={materias}
        filtros={filtros}
        onSetProfesor={setProfesorFiltro}
        onSetMateria={setMateriaFiltro}
        onToggleVerCancelados={toggleVerCancelados}
        onToggleSoloConCupo={toggleSoloConCupo}
        profesorFijo={
          profesorFijo
            ? {
                id: profesorFijo.id,
                nombre: profesorFijo.nombre,
                apellido: profesorFijo.apellido,
              }
            : null
        }
      />

      {/* Contenedor principal con Vistas y Panel Lateral */}
      <div className="flex w-full min-w-0 flex-col items-start gap-5 lg:flex-row">
        {/* Grilla de calendario según vista activa */}
        <div className="w-full min-w-0 flex-1 overflow-hidden transition-all duration-200">
          {vista === "dia" && (
            <DayView
              fecha={fechaSeleccionada}
              columnas={columnasDia}
              onSelectTurno={seleccionarTurno}
              onIniciarReprogramacion={esProfesor ? undefined : iniciarReprogramacion}
              onReservarFranja={(fecha, hora, profId) => abrirReserva(fecha, hora, profId)}
              esProfesor={esProfesor}
            />
          )}

          {vista === "semana" && (
            <WeekView
              diasSemana={diasSemana}
              turnos={turnos}
              profesores={profesores}
              bloques={bloques}
              filtroProfesorId={filtros.profesorId}
              onSelectTurno={seleccionarTurno}
              onIniciarReprogramacion={esProfesor ? undefined : iniciarReprogramacion}
              onReservarFranja={(fecha, hora) => abrirReserva(fecha, hora)}
              esProfesor={esProfesor}
            />
          )}

          {vista === "mes" && (
            <MonthView
              diasMes={diasMes}
              onSelectDay={(fecha) => {
                seleccionarFecha(fecha);
                cambiarVista("dia");
              }}
            />
          )}
        </div>

        {/* Panel lateral derecho de Detalle del Turno */}
        {turnoSeleccionado && (
          <aside className="w-full shrink-0 animate-in slide-in-from-right-4 duration-200 lg:sticky lg:top-4 lg:w-96">
            <TurnDetailsSidebar
              turno={turnoSeleccionado}
              onClose={cerrarDetalle}
              onModificar={(t) => {
                router.push(`/turnos?turnoId=${t.id}&accion=modificar`);
              }}
              onCancelar={(t) => {
                cancelarTurno(t.id, "Cancelado por el usuario");
              }}
              esProfesor={esProfesor}
            />
          </aside>
        )}
      </div>

      {/* Modal de confirmación para Drag & Drop (Reprogramación) */}
      <ReprogramarModal
        datos={reprogramacionPendiente}
        onConfirmar={confirmarReprogramacion}
        onCancelar={cancelarReprogramacion}
      />

      {/* Modal para agendar turno en franjas disponibles */}
      <ReservaTurnoModal
        open={reservaModal.open}
        fecha={reservaModal.fecha}
        huecoInicio={reservaModal.horaInicio}
        huecoFin={reservaModal.horaFin}
        profesor={
          profesorParaReserva
            ? {
                id: profesorParaReserva.id,
                nombre: profesorParaReserva.nombre,
                apellido: profesorParaReserva.apellido,
                usuarioId: profesorParaReserva.usuarioId ?? profesorParaReserva.id,
                estado: "activo",
              }
            : null
        }
        onClose={() => setReservaModal((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}
