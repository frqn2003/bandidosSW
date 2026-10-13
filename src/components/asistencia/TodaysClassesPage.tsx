// src/components/asistencia/TodaysClassesPage.tsx
//
// Vista principal "Mis clases del día" (HU-ASI-01).
// Muestra la lista de turnos ordenados por hora de inicio ascendente.
// Regla de tiempo de 15 minutos: botones Presente/Ausente deshabilitados fuera de ventana con notificación.
// Regla de 24 horas: corrección de registros pasados con control de rol (Profesor vs Gerente).
// Integra PresentModal, AbsentModal, AttendanceCorrectionModal y consulta de historial de alumno.

"use client";

import React, { useState, useEffect } from "react";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useSesion } from "@/funciones/sesion";
import { AccesoDenegado } from "@/components/auth/AccesoDenegado";
import {
  listarClasesDelDia,
  registrarAsistencia,
  corregirAsistencia,
  PROFESORES_ASISTENCIA,
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
import { StudentHistoryTab } from "@/components/alumnos/historial/StudentHistoryTab";
import type { StudentUI } from "@/modules/alumnos/types";

export function TodaysClassesPage() {
  const { sesion } = useSesion();
  const { showToast } = useToast();

  const rolUsuario = sesion?.usuario.rol.nombre ?? "Profesor";
  const esProfesor = rolUsuario === "Profesor";

  const [fechaSeleccionada, setFechaSeleccionada] = useState(() => fechaAISO(new Date()));
  const [profesorFiltro, setProfesorFiltro] = useState<string>("todos");
  const [clases, setClases] = useState<ClaseDelDiaResponse[]>([]);
  const [cargando, setCargando] = useState(true);
  const [recargaVersion, setRecargaVersion] = useState(0);

  // Modales
  const [presentClase, setPresentClase] = useState<ClaseDelDiaResponse | null>(null);
  const [absentClase, setAbsentClase] = useState<ClaseDelDiaResponse | null>(null);
  const [correctClase, setCorrectClase] = useState<ClaseDelDiaResponse | null>(null);
  const [historialStudent, setHistorialStudent] = useState<{
    id: number;
    nombre: string;
    legajo?: string;
  } | null>(null);
  const [pestanaHistorialModal, setPestanaHistorialModal] = useState<"timeline" | "asistencia">("timeline");

  // Cargar clases del día según rol y filtro de profesor
  useEffect(() => {
    let cancelado = false;
    const profesorIdQuery = esProfesor
      ? sesion?.usuario.id
      : profesorFiltro !== "todos"
        ? Number(profesorFiltro)
        : undefined;

    listarClasesDelDia(
      {
        fecha: fechaSeleccionada,
        profesorId: profesorIdQuery,
      },
      {
        usuarioId: sesion?.usuario.id,
        rol: rolUsuario,
        profesorId: esProfesor ? sesion?.usuario.id : undefined,
      },
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
  }, [fechaSeleccionada, profesorFiltro, sesion, showToast, recargaVersion, esProfesor, rolUsuario]);

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
          rol: "Profesor",
          profesorId: sesion?.usuario.id,
        },
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
          rol: "Profesor",
          profesorId: sesion?.usuario.id,
        },
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
          rol: rolUsuario,
          profesorId: esProfesor ? sesion?.usuario.id : undefined,
        },
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

  // Acceso al módulo: Profesor, Gerente y Mesa de Entrada
  if (sesion && !["Profesor", "Gerente", "Mesa de Entrada"].includes(sesion.usuario.rol.nombre)) {
    return <AccesoDenegado rol={sesion.usuario.rol.nombre} />;
  }

  return (
    <div className="space-y-6">
      {/* Header de la vista */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-md bg-primary-container/30">
            <Icon name={esProfesor ? "how_to_reg" : "groups"} size={24} className="text-primary" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold text-on-surface">
              {esProfesor ? "Mis clases del día" : "Clases de los profesores"}
            </h1>
            <p className="text-sm font-medium text-on-surface-variant">
              {esProfesor
                ? "Registro y control de asistencia para tus turnos programados."
                : "Seguimiento y control de asistencia de las clases del centro académico."}
            </p>
          </div>
        </div>

        {/* Filtro por Profesor (Gerente y Mesa de Entrada) y Selector de Fecha */}
        <div className="flex flex-wrap items-center gap-2">
          {!esProfesor && (
            <Select
              id="filtro-profesor"
              compact
              value={profesorFiltro}
              onChange={(e) => setProfesorFiltro(e.target.value)}
              wrapperClassName="w-48"
            >
              <option value="todos">Todos los profesores</option>
              {PROFESORES_ASISTENCIA.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.apellido}, {p.nombre}
                </option>
              ))}
            </Select>
          )}
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
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low font-bold tracking-wider text-on-surface-variant uppercase text-[11px]">
                <th className="px-2.5 py-2">Código</th>
                <th className="px-2.5 py-2">Horario</th>
                {!esProfesor && <th className="px-2.5 py-2">Profesor</th>}
                <th className="px-2.5 py-2">Alumno</th>
                <th className="px-2.5 py-2">Materia</th>
                <th className="px-2.5 py-2">Estado</th>
                <th className="px-2.5 py-2">Registro</th>
                <th className="px-2.5 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/60 text-on-surface">
              {cargando ? (
                <tr>
                  <td colSpan={!esProfesor ? 8 : 7} className="px-3 py-12 text-center text-on-surface-variant">
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
                      <td className="px-2.5 py-2 whitespace-nowrap font-mono font-semibold text-on-surface">
                        {clase.codigo}
                      </td>

                      {/* Horario */}
                      <td className="px-2.5 py-2 whitespace-nowrap tabular-nums">
                        <span className="font-bold text-on-surface">
                          {clase.horaInicio} - {clase.horaFin}
                        </span>
                      </td>

                      {/* Profesor (para Gerente y Mesa de Entrada) */}
                      {!esProfesor && (
                        <td className="px-2.5 py-2 whitespace-nowrap">
                          <span className="font-semibold text-on-surface">
                            {clase.profesor ? `${clase.profesor.apellido}, ${clase.profesor.nombre}` : "—"}
                          </span>
                        </td>
                      )}

                      {/* Alumno */}
                      <td className="px-2.5 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${tonoAvatarDe(
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
                                  legajo: clase.alumno.legajo,
                                })
                              }
                              className="text-[10.5px] text-secondary hover:underline cursor-pointer flex items-center gap-1"
                            >
                              <Icon name="history" size={12} />
                              Ver historial
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Materia */}
                      <td className="px-2.5 py-2 whitespace-nowrap font-medium text-on-surface">
                        {clase.materia.nombre}
                      </td>

                      {/* Estado */}
                      <td className="px-2.5 py-2 whitespace-nowrap">
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
                      <td className="px-2.5 py-2 text-xs max-w-[180px]">
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
                      <td className="px-2.5 py-2 whitespace-nowrap text-right">
                        {!tieneAsistencia ? (
                          esProfesor ? (
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
                            <span className="text-[11px] text-on-surface-variant italic">
                              Pendiente
                            </span>
                          )
                        ) : (
                          /* Botón Corregir / Ver Registro */
                          <Button
                            variant="outline"
                            size="xs"
                            type="button"
                            onClick={() => setCorrectClase(clase)}
                            className={`h-6.5 px-2 py-0 text-[11px] gap-1 shrink-0 ${
                              puedeCorregir
                                ? "text-secondary border-secondary/60 hover:bg-secondary/10"
                                : "text-on-surface-variant border-outline-variant hover:bg-surface-container-high"
                            }`}
                            title={
                              puedeCorregir
                                ? "Corregir registro de asistencia"
                                : "Ver registro (Modo lectura)"
                            }
                          >
                            <Icon name={puedeCorregir ? "edit_calendar" : "visibility"} size={13} />
                            {puedeCorregir ? "Corregir" : "Ver registro"}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={!esProfesor ? 8 : 7} className="px-4 py-12 text-center text-on-surface-variant">
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
        rolUsuario={rolUsuario}
        onClose={() => setCorrectClase(null)}
        onConfirmCorrection={handleConfirmarCorreccion}
        onNotificarSoloGerente={() => {
          showToast("error", "Notificación: solo el Gerente puede modificar");
        }}
      />

      {/* 4. Modal para ver Historial del Alumno (HU-ALU-03 y HU-ASI-01) */}
      {historialStudent && (
        <Modal
          open={!!historialStudent}
          onClose={() => {
            setHistorialStudent(null);
            setPestanaHistorialModal("timeline");
          }}
          title={`Historial · ${historialStudent.nombre}`}
          maxWidth="max-w-5xl"
          icon={<Icon name="history_edu" size={24} className="text-secondary" />}
          subtitle="Modo LECTURA · Línea de tiempo unificada, notas y asistencias"
        >
          <div className="space-y-4">
            <div className="border-b border-outline-variant">
              <nav aria-label="Vistas del historial" className="flex gap-4 -mb-px text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setPestanaHistorialModal("timeline")}
                  className={`pb-2 border-b-2 transition-colors cursor-pointer ${
                    pestanaHistorialModal === "timeline"
                      ? "border-primary text-primary"
                      : "border-transparent text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  Línea de tiempo y Notas
                </button>
                <button
                  type="button"
                  onClick={() => setPestanaHistorialModal("asistencia")}
                  className={`pb-2 border-b-2 transition-colors cursor-pointer ${
                    pestanaHistorialModal === "asistencia"
                      ? "border-primary text-primary"
                      : "border-transparent text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  Registro de Asistencias
                </button>
              </nav>
            </div>

            {pestanaHistorialModal === "timeline" ? (
              <StudentHistoryTab
                student={
                  {
                    id: historialStudent.id,
                    legajo:
                      historialStudent.legajo ||
                      `ALU-${historialStudent.id.toString().padStart(4, "0")}`,
                    nombre: historialStudent.nombre.split(" ")[0] || "",
                    apellido:
                      historialStudent.nombre.split(" ").slice(1).join(" ") || "",
                    dni: "",
                    fechaNacimiento: "",
                    nivelEducativo: "Secundario",
                    estado: "activo",
                    fechaCreacion: "",
                    fechaActualizacion: "",
                  } as StudentUI
                }
              />
            ) : (
              <StudentAttendanceHistory
                alumnoId={historialStudent.id}
                alumnoNombre={historialStudent.nombre}
              />
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
