// src/components/asistencia/TodaysClassesPage.tsx
//
// Vista principal "Mis clases del día" (HU-ASI-01).
// Muestra la lista de turnos ordenados por hora de inicio ascendente.
// Regla de tiempo de 15 minutos: botones Presente/Ausente deshabilitados fuera de ventana con notificación.
// Regla de 24 horas: corrección de registros pasados con control de rol (Profesor vs Gerente).
// Integra PresentModal, AbsentModal, AttendanceCorrectionModal y consulta de historial de alumno.

"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useSesion } from "@/funciones/sesion";
import {
  listarClasesDelDia,
  registrarAsistencia,
  corregirAsistencia,
  type ClaseDelDiaResponse,
} from "@/data/asistencia";
import {
  fechaAISO,
  formatearFechaHoraRegistro,
} from "@/funciones/asistencia-reglas";
import { inicialesDe, tonoAvatarDe } from "@/funciones/formato";
import { PresentModal } from "./PresentModal";
import { AbsentModal } from "./AbsentModal";
import { AttendanceCorrectionModal } from "./AttendanceCorrectionModal";
import { StudentAttendanceHistory } from "./StudentAttendanceHistory";

export function TodaysClassesPage() {
  const { sesion } = useSesion();
  const { showToast } = useToast();

  const [fechaBase] = useState(() => new Date());
  const [fechaSeleccionada, setFechaSeleccionada] = useState(() => fechaAISO(new Date()));
  const [clases, setClases] = useState<ClaseDelDiaResponse[]>([]);
  const [cargando, setCargando] = useState(true);
  const [recargaVersion, setRecargaVersion] = useState(0);

  // Rol activo (permite conmutar en desarrollo/testing para verificar regla Gerente vs Profesor)
  const rolReal = sesion?.usuario.rol.nombre ?? "Profesor";
  const [rolSimulado, setRolSimulado] = useState<string>(rolReal);

  // Simulación de tiempo para pruebas de la ventana de 15 minutos y 24 horas
  const [tiempoSimuladoOffsetMinutos, setTiempoSimuladoOffsetMinutos] = useState<number>(0);

  const tiempoActualEfectivo = useMemo(() => {
    return new Date(fechaBase.getTime() + tiempoSimuladoOffsetMinutos * 60 * 1000);
  }, [fechaBase, tiempoSimuladoOffsetMinutos]);

  // Modales
  const [presentClase, setPresentClase] = useState<ClaseDelDiaResponse | null>(null);
  const [absentClase, setAbsentClase] = useState<ClaseDelDiaResponse | null>(null);
  const [correctClase, setCorrectClase] = useState<ClaseDelDiaResponse | null>(null);
  const [historialStudent, setHistorialStudent] = useState<{
    id: number;
    nombre: string;
  } | null>(null);

  // Cargar clases del día
  useEffect(() => {
    let cancelado = false;
    listarClasesDelDia(
      { fecha: fechaSeleccionada },
      {
        usuarioId: sesion?.usuario.id,
        rol: rolSimulado,
        profesorId: sesion?.usuario.id,
      },
      tiempoActualEfectivo,
    )
      .then((data) => {
        if (cancelado) return;
        setClases(data);
        setCargando(false);
      })
      .catch(() => {
        if (!cancelado) {
          setCargando(false);
          showToast("error", "Error al cargar las clases del día.");
        }
      });

    return () => {
      cancelado = true;
    };
  }, [fechaSeleccionada, sesion, rolSimulado, tiempoActualEfectivo, showToast, recargaVersion]);

  // Manejo de clicks en botones bloqueados fuera de la ventana de 15 minutos
  const handleIntentoBotonBloqueado = (clase: ClaseDelDiaResponse) => {
    const motivo =
      clase.motivoDeshabilitado ||
      "Notificación: Botones Presente/ausente deshabilitados (habilitado desde 15 minutos antes del inicio)";
    showToast("error", `Notificación: Botones Presente/ausente deshabilitados. ${motivo}`);
  };

  // Guardar Presente
  const handleConfirmarPresente = async (data: {
    temaTrabajado: string;
    observaciones?: string | null;
  }) => {
    if (!presentClase) return;
    try {
      await registrarAsistencia(
        {
          turnoId: presentClase.turnoId,
          presente: true,
          temaTrabajado: data.temaTrabajado,
          observaciones: data.observaciones,
        },
        {
          usuarioId: sesion?.usuario.id,
          rol: rolSimulado,
        },
        tiempoActualEfectivo,
      );
      showToast(
        "success",
        `Asistencia registrada con éxito para ${presentClase.alumno.nombre} ${presentClase.alumno.apellido}.`,
      );
      setPresentClase(null);
      setCargando(true);
      setRecargaVersion((v) => v + 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al registrar asistencia.";
      showToast("error", msg);
    }
  };

  // Guardar Ausente
  const handleConfirmarAusente = async (data: { observaciones?: string | null }) => {
    if (!absentClase) return;
    try {
      await registrarAsistencia(
        {
          turnoId: absentClase.turnoId,
          presente: false,
          temaTrabajado: null,
          observaciones: data.observaciones,
        },
        {
          usuarioId: sesion?.usuario.id,
          rol: rolSimulado,
        },
        tiempoActualEfectivo,
      );
      showToast(
        "success",
        `Inasistencia registrada para ${absentClase.alumno.nombre} ${absentClase.alumno.apellido}.`,
      );
      setAbsentClase(null);
      setCargando(true);
      setRecargaVersion((v) => v + 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al registrar inasistencia.";
      showToast("error", msg);
    }
  };

  // Guardar Corrección
  const handleConfirmarCorreccion = async (data: {
    asistenciaId: number;
    presente: boolean;
    temaTrabajado?: string | null;
    observaciones?: string | null;
    motivoCorreccion?: string | null;
  }) => {
    try {
      await corregirAsistencia(
        data.asistenciaId,
        {
          presente: data.presente,
          temaTrabajado: data.temaTrabajado,
          observaciones: data.observaciones,
          motivoCorreccion: data.motivoCorreccion,
        },
        {
          usuarioId: sesion?.usuario.id,
          rol: rolSimulado,
        },
        tiempoActualEfectivo,
      );
      showToast("success", "Registro de asistencia actualizado exitosamente.");
      setCorrectClase(null);
      setCargando(true);
      setRecargaVersion((v) => v + 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al corregir asistencia.";
      showToast("error", msg);
    }
  };

  // Resumen del día
  const totalClases = clases.length;
  const clasesRegistradas = clases.filter((c) => c.estado !== "Reservado").length;
  const clasesPendientes = clases.filter((c) => c.estado === "Reservado").length;

  return (
    <div className="space-y-6">
      {/* Header de la vista */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-md bg-primary-container/30">
            <Icon name="how_to_reg" size={24} className="text-primary" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold text-on-surface">
              Mis clases del día
            </h1>
            <p className="text-sm font-medium text-on-surface-variant">
              Registro y control de asistencia para tus turnos programados.
            </p>
          </div>
        </div>

        {/* Selector de Fecha */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => setFechaSeleccionada(fechaAISO(new Date()))}
            className="text-xs font-bold"
          >
            Hoy
          </Button>
          <input
            type="date"
            value={fechaSeleccionada}
            onChange={(e) => setFechaSeleccionada(e.target.value)}
            className="rounded-sm border border-outline-variant bg-surface-container-lowest px-2.5 py-1.5 text-xs font-medium text-on-surface shadow-sm focus:border-secondary focus:outline-none"
          />
        </div>
      </header>

      {/* Barra de KPIs rápidos del día */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-md border border-outline-variant bg-surface-container-lowest p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Total Clases
            </span>
            <p className="font-display text-2xl font-bold text-on-surface mt-1">
              {totalClases}
            </p>
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/10 text-secondary">
            <Icon name="calendar_today" size={20} />
          </span>
        </div>

        <div className="rounded-md border border-outline-variant bg-surface-container-lowest p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Pendientes de Registro
            </span>
            <p className="font-display text-2xl font-bold text-on-surface mt-1">
              {clasesPendientes}
            </p>
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-status-warning/15 text-status-warning-strong">
            <Icon name="pending_actions" size={20} />
          </span>
        </div>

        <div className="rounded-md border border-outline-variant bg-surface-container-lowest p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Registradas
            </span>
            <p className="font-display text-2xl font-bold text-status-success-strong mt-1">
              {clasesRegistradas}
            </p>
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-status-success/15 text-status-success-strong">
            <Icon name="fact_check" size={20} />
          </span>
        </div>
      </div>

      {/* PANEL DE AUTO-TESTING Y SIMULACIÓN (Requisito 4 de HU-ASI-01) */}
      <div className="rounded-md border border-secondary/30 bg-surface-container-lowest p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Icon name="science" size={20} className="text-secondary" />
            <h3 className="font-display text-xs font-bold uppercase tracking-wider text-on-surface">
              Auto-Testing de Reglas Críticas (15 min y 24 hs)
            </h3>
          </div>
          <span className="text-[11px] text-on-surface-variant">
            Hora de simulación: <strong>{tiempoActualEfectivo.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</strong> · Rol: <strong>{rolSimulado}</strong>
          </span>
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-outline-variant/60">
          <Button
            variant="outline"
            size="sm"
            type="button"
            className="text-xs justify-start gap-1.5 h-8"
            onClick={() => {
              setTiempoSimuladoOffsetMinutos(0);
              showToast("success", "Simulación reestablecida a hora actual en tiempo real.");
            }}
          >
            <Icon name="schedule" size={16} className="text-secondary" />
            Hora normal (En vivo)
          </Button>

          <Button
            variant="outline"
            size="sm"
            type="button"
            className="text-xs justify-start gap-1.5 h-8"
            onClick={() => {
              // Adelantar 15 minutos para habilitar el turno que empieza en 20 minutos
              setTiempoSimuladoOffsetMinutos(15);
              showToast("success", "Simulado: reloj adelantado 15 min (ventana habilitada).");
            }}
          >
            <Icon name="fast_forward" size={16} className="text-status-success-strong" />
            Simular +15 min (Habilitar turno)
          </Button>

          <Button
            variant="outline"
            size="sm"
            type="button"
            className="text-xs justify-start gap-1.5 h-8"
            onClick={() => {
              const nuevoRol = rolSimulado === "Gerente" ? "Profesor" : "Gerente";
              setRolSimulado(nuevoRol);
              showToast("success", `Rol de prueba cambiado a: ${nuevoRol}`);
            }}
          >
            <Icon name="swap_horiz" size={16} className="text-secondary" />
            Alternar rol ({rolSimulado === "Gerente" ? "Cambiar a Profesor" : "Cambiar a Gerente"})
          </Button>
        </div>
      </div>

      {/* Tabla de Mis Clases del Día */}
      <div className="rounded-md border border-outline-variant bg-surface-container-lowest shadow-sm overflow-hidden">
        <div className="p-4 border-b border-outline-variant flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-base font-bold text-on-surface">
              Clases Programadas
            </h2>
            <span className="text-xs font-semibold text-on-surface-variant">
              ({clases.length} {clases.length === 1 ? "turno" : "turnos"})
            </span>
          </div>
          <span className="text-xs text-on-surface-variant">
            Ordenado por hora de inicio ascendente
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low font-bold tracking-wider text-on-surface-variant uppercase text-[11px]">
                <th className="px-3 py-2.5">Código</th>
                <th className="px-3 py-2.5">Horario</th>
                <th className="px-3 py-2.5">Alumno</th>
                <th className="px-3 py-2.5">Materia</th>
                <th className="px-3 py-2.5">Estado</th>
                <th className="px-3 py-2.5">Registro</th>
                <th className="px-3 py-2.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/60 text-on-surface">
              {cargando ? (
                <tr>
                  <td colSpan={7} className="px-3 py-12 text-center text-on-surface-variant">
                    <span className="inline-flex items-center gap-2">
                      <Icon name="progress_activity" size={20} className="animate-spin text-secondary" />
                      Cargando turnos del día...
                    </span>
                  </td>
                </tr>
              ) : clases.length > 0 ? (
                clases.map((clase) => {
                  const tieneAsistencia = !!clase.asistencia;
                  const puedeRegistrar = clase.puedeRegistrar;
                  const puedeCorregir = clase.puedeCorregir;

                  return (
                    <tr
                      key={clase.turnoId}
                      className="hover:bg-surface-container-low/50 transition-colors"
                    >
                      {/* Código */}
                      <td className="px-3 py-2.5 whitespace-nowrap font-mono font-semibold text-on-surface">
                        {clase.codigo}
                      </td>

                      {/* Horario */}
                      <td className="px-3 py-2.5 whitespace-nowrap tabular-nums">
                        <span className="font-bold text-on-surface">
                          {clase.horaInicio} - {clase.horaFin}
                        </span>
                      </td>

                      {/* Alumno */}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${tonoAvatarDe(
                              clase.alumno.id,
                            )}`}
                          >
                            {inicialesDe(clase.alumno.nombre, clase.alumno.apellido)}
                          </span>
                          <div>
                            <span className="block font-bold text-on-surface">
                              {clase.alumno.apellido}, {clase.alumno.nombre}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setHistorialStudent({
                                  id: clase.alumno.id,
                                  nombre: `${clase.alumno.nombre} ${clase.alumno.apellido}`,
                                })
                              }
                              className="text-[11px] text-secondary hover:underline cursor-pointer flex items-center gap-1"
                            >
                              <Icon name="history" size={13} />
                              Ver historial
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Materia */}
                      <td className="px-3 py-2.5 whitespace-nowrap font-medium text-on-surface">
                        {clase.materia.nombre}
                      </td>

                      {/* Estado */}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <StatusBadge
                          variant={
                            clase.estado === "Asistió"
                              ? "success"
                              : clase.estado === "Ausente"
                                ? "warning"
                                : clase.estado === "Reservado"
                                  ? "info"
                                  : "danger"
                          }
                          label={clase.estado}
                          icon={
                            clase.estado === "Asistió"
                              ? "check_circle"
                              : clase.estado === "Ausente"
                                ? "cancel"
                                : clase.estado === "Reservado"
                                  ? "event_available"
                                  : "block"
                          }
                        />
                      </td>

                      {/* Detalle del Registro */}
                      <td className="px-3 py-2.5 text-xs max-w-xs">
                        {clase.asistencia ? (
                          <div className="space-y-0.5 text-[11px]">
                            <span className="block text-on-surface-variant font-medium">
                              {formatearFechaHoraRegistro(clase.asistencia.registradoAt)}
                            </span>
                            {clase.asistencia.temaTrabajado && (
                              <p
                                className="text-on-surface truncate font-semibold"
                                title={clase.asistencia.temaTrabajado}
                              >
                                {clase.asistencia.temaTrabajado}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-on-surface-variant italic">
                            Pendiente
                          </span>
                        )}
                      </td>

                      {/* Botones de Acción */}
                      <td className="px-3 py-2.5 whitespace-nowrap text-right">
                        {!tieneAsistencia ? (
                          <div className="inline-flex items-center gap-1">
                            {/* Botón Presente */}
                            <div
                              onClick={() => {
                                if (!puedeRegistrar) handleIntentoBotonBloqueado(clase);
                              }}
                              className="inline-block"
                            >
                              <Button
                                variant="outline"
                                size="xs"
                                type="button"
                                disabled={!puedeRegistrar}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPresentClase(clase);
                                }}
                                className={`gap-1 border-status-success-strong text-status-success-strong hover:bg-status-success/15 ${
                                  !puedeRegistrar
                                    ? "opacity-50 cursor-not-allowed pointer-events-none"
                                    : ""
                                }`}
                                title={
                                  !puedeRegistrar
                                    ? clase.motivoDeshabilitado ||
                                      "Notificación: Botones Presente/ausente deshabilitados"
                                    : "Marcar Presente"
                                }
                              >
                                <Icon name="check_circle" size={14} />
                                Presente
                              </Button>
                            </div>

                            {/* Botón Ausente */}
                            <div
                              onClick={() => {
                                if (!puedeRegistrar) handleIntentoBotonBloqueado(clase);
                              }}
                              className="inline-block"
                            >
                              <Button
                                variant="outline"
                                size="xs"
                                type="button"
                                disabled={!puedeRegistrar}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAbsentClase(clase);
                                }}
                                className={`gap-1 border-status-warning-strong text-status-warning-strong hover:bg-status-warning/15 ${
                                  !puedeRegistrar
                                    ? "opacity-50 cursor-not-allowed pointer-events-none"
                                    : ""
                                }`}
                                title={
                                  !puedeRegistrar
                                    ? clase.motivoDeshabilitado ||
                                      "Notificación: Botones Presente/ausente deshabilitados"
                                    : "Marcar Ausente"
                                }
                              >
                                <Icon name="person_off" size={14} />
                                Ausente
                              </Button>
                            </div>
                          </div>
                        ) : (
                          /* Botón Corregir / Ver Registro */
                          <Button
                            variant="outline"
                            size="xs"
                            type="button"
                            onClick={() => setCorrectClase(clase)}
                            className="gap-1 text-secondary"
                            title={
                              puedeCorregir
                                ? "Corregir registro de asistencia"
                                : "Ver registro (Modo lectura)"
                            }
                          >
                            <Icon name={puedeCorregir ? "edit_calendar" : "visibility"} size={14} />
                            {puedeCorregir ? "Corregir" : "Ver registro"}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-on-surface-variant">
                    <Icon name="event_busy" size={36} className="mx-auto text-on-surface-variant/40 mb-2" />
                    <p className="font-bold text-sm text-on-surface">
                      No hay clases programadas para esta fecha.
                    </p>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      Seleccioná otro día o consultá el calendario general.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALES DEL FLUJO */}
      {/* 1. Modal Presente */}
      <PresentModal
        open={!!presentClase}
        clase={presentClase}
        onClose={() => setPresentClase(null)}
        onConfirmPresent={handleConfirmarPresente}
      />

      {/* 2. Modal Ausente */}
      <AbsentModal
        open={!!absentClase}
        clase={absentClase}
        onClose={() => setAbsentClase(null)}
        onConfirmAbsent={handleConfirmarAusente}
      />

      {/* 3. Modal Corrección de Asistencia */}
      <AttendanceCorrectionModal
        open={!!correctClase}
        clase={correctClase}
        rolUsuario={rolSimulado}
        tiempoSimulado={tiempoActualEfectivo}
        onClose={() => setCorrectClase(null)}
        onConfirmCorrection={handleConfirmarCorreccion}
        onNotificarSoloGerente={() => {
          showToast("error", "Notificación: solo el Gerente puede modificar");
        }}
      />

      {/* 4. Modal para ver Historial de Asistencia del Alumno */}
      {historialStudent && (
        <Modal
          open={!!historialStudent}
          onClose={() => setHistorialStudent(null)}
          title={`Historial de Asistencia · ${historialStudent.nombre}`}
          maxWidth="max-w-4xl"
          icon={<Icon name="history_edu" size={24} className="text-secondary" />}
          subtitle="Modo LECTURA · Registros sincrónicos de clases asistidas, ausencias y cancelaciones"
        >
          <StudentAttendanceHistory
            alumnoId={historialStudent.id}
            alumnoNombre={historialStudent.nombre}
          />
        </Modal>
      )}
    </div>
  );
}
