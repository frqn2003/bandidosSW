// src/components/portal/StudentTurnReservation.tsx
//
// Componente "Reservar Turno" en el Portal del Alumno (HU-POR-01).
// Respeta el flujo del diagrama:
// 1. Consulta cuántos turnos futuros tiene el alumno. Si tiene 5 (o límite parametrizable):
//    -> "Mensaje en rojo: límite de turnos alcanzado" y bloquea el formulario.
// 2. Si no superó el límite: formulario (materia, profesor, fecha, horario con cupos).
// 3. REGLA CRÍTICA: El campo del Alumno está FIJO con los datos del usuario logueado y NO es editable.
// 4. Modal de resumen -> Genera código de turno (TUR-000123) -> Comprobante en pantalla con éxito.

"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useSesion } from "@/funciones/sesion";
import {
  obtenerMisTurnos,
  listarMateriasPortal,
  listarProfesoresPortal,
  reservarTurnoPortal,
  listarHorariosPortal,
  sugerirProximoHorarioPortal,
  type HorarioPortal,
  type SugerenciaPortal,
  type MateriaPortalResponse,
  type ProfesorPortalResponse,
  type TurnoPortalResponse,
} from "@/data/portal";
import { formatearFecha } from "@/funciones/formato";
import { sumarDias } from "@/funciones/fechas-calendario";

const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const diaCorto = (iso: string) => DIAS[new Date(`${iso}T00:00:00`).getDay()];

export function StudentTurnReservation() {
  const { sesion } = useSesion();
  const { showToast } = useToast();

  const [cargando, setCargando] = useState(true);
  const [turnosFuturosCount, setTurnosFuturosCount] = useState(0);
  const [limiteMaximo, setLimiteMaximo] = useState(5);

  // Catálogos
  const [materias, setMaterias] = useState<MateriaPortalResponse[]>([]);
  const [profesores, setProfesores] = useState<ProfesorPortalResponse[]>([]);
  const [cargandoProfesores, setCargandoProfesores] = useState(false);

  // Formulario
  const [materiaId, setMateriaId] = useState<number | "">("");
  const [profesorId, setProfesorId] = useState<number | "">("");
  const [fecha, setFecha] = useState<string>("");
  const [horaInicio, setHoraInicio] = useState<string>("");
  const [observaciones, setObservaciones] = useState<string>("");
  const [horariosCarga, setHorariosCarga] = useState<{ clave: string; lista: HorarioPortal[] } | null>(null);
  const [sugerencia, setSugerencia] = useState<{ clave: string; valor: SugerenciaPortal | null } | null>(null);

  // Modales y flujo de éxito
  const [modalResumenOpen, setModalResumenOpen] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [turnoReservadoExitoso, setTurnoReservadoExitoso] = useState<TurnoPortalResponse | null>(null);

  // Datos fijos del alumno logueado
  const nombreAlumno = sesion?.usuario
    ? `${sesion.usuario.nombre || ""} ${sesion.usuario.apellido || ""}`.trim() || "Alumno Registrado"
    : "Alumno Registrado";
  const emailAlumno = sesion?.usuario?.email || "alumno@centro.edu.ar";

  // Fecha mínima y máxima (máximo 60 días)
  const hoyIso = new Date().toISOString().slice(0, 10);
  const fechaMax = sumarDias(hoyIso, 60);

  useEffect(() => {
    let cancelado = false;
    Promise.all([
      obtenerMisTurnos(false),
      listarMateriasPortal(),
    ])
      .then(([misTurnos, mats]) => {
        if (cancelado) return;
        setTurnosFuturosCount(misTurnos.turnosFuturosReservados);
        setLimiteMaximo(misTurnos.limiteTurnosFuturos);
        setMaterias(mats);
      })
      .catch(() => {
        if (!cancelado) {
          showToast("error", "Error al consultar turnos previos y catálogo.");
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
  }, [showToast]);

  const recargarTurnosYCatalogo = async () => {
    setCargando(true);
    try {
      const [misTurnos, mats] = await Promise.all([
        obtenerMisTurnos(false),
        listarMateriasPortal(),
      ]);
      setTurnosFuturosCount(misTurnos.turnosFuturosReservados);
      setLimiteMaximo(misTurnos.limiteTurnosFuturos);
      setMaterias(mats);
    } finally {
      setCargando(false);
    }
  };

  // Al cambiar la materia, cargar profesores que la dictan
  const handleMateriaChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value ? Number(e.target.value) : "";
    setMateriaId(val);
    setProfesorId("");
    setFecha("");
    setHoraInicio("");

    if (val) {
      setCargandoProfesores(true);
      try {
        const profs = await listarProfesoresPortal(val);
        setProfesores(profs);
      } catch {
        setProfesores([]);
      } finally {
        setCargandoProfesores(false);
      }
    } else {
      setProfesores([]);
    }
  };

  const handleProfesorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value ? Number(e.target.value) : "";
    setProfesorId(val);
    setHoraInicio("");
  };

  const handleFechaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFecha(e.target.value);
    setHoraInicio("");
  };

  // Horarios libres del profesor en la fecha elegida (huecos de su agenda)
  const duracionMateria = materias.find((m) => m.id === materiaId)?.duracionClaseMinutos;

  // Sugerencia del próximo horario libre desde la fecha elegida o hoy
  const desdeSugerencia = fecha && fecha >= hoyIso ? fecha : hoyIso;
  const claveSugerencia =
    materiaId && profesorId && duracionMateria
      ? `${materiaId}|${profesorId}|${duracionMateria}|${desdeSugerencia}`
      : null;

  useEffect(() => {
    if (!claveSugerencia) return;
    const [m, p, d, f] = claveSugerencia.split("|");
    let cancelado = false;
    sugerirProximoHorarioPortal(Number(p), Number(m), Number(d), f)
      .then((valor) => {
        if (!cancelado) setSugerencia({ clave: claveSugerencia, valor });
      })
      .catch(() => {
        if (!cancelado) setSugerencia({ clave: claveSugerencia, valor: null });
      });
    return () => {
      cancelado = true;
    };
  }, [claveSugerencia]);

  const claveHorarios =
    profesorId && fecha && duracionMateria
      ? `${profesorId}|${fecha}|${duracionMateria}`
      : null;

  useEffect(() => {
    if (!claveHorarios) return;
    const [p, f, d] = claveHorarios.split("|");
    let cancelado = false;
    listarHorariosPortal(Number(p), f, Number(d))
      .then((lista) => {
        if (!cancelado) setHorariosCarga({ clave: claveHorarios, lista });
      })
      .catch(() => {
        if (!cancelado) setHorariosCarga({ clave: claveHorarios, lista: [] });
      });
    return () => {
      cancelado = true;
    };
  }, [claveHorarios]);

  const cargandoHorarios = Boolean(claveHorarios && horariosCarga?.clave !== claveHorarios);
  const horarios = !cargandoHorarios && horariosCarga?.clave === claveHorarios ? horariosCarga.lista : [];

  const primeraFranjaLibre = horarios.length > 0 ? horarios[0] : null;
  const sugerenciaDesdeBack = sugerencia?.clave === claveSugerencia ? sugerencia.valor : null;

  // Si en la fecha elegida ya hay franjas disponibles, la más próxima es la primera disponible de ese día.
  // Si en esa fecha no hay disponibilidad (o aún no se eligió fecha), se usa la sugerencia del back.
  const sugerenciaActual: SugerenciaPortal | null =
    fecha && primeraFranjaLibre && duracionMateria
      ? {
          fecha,
          horaInicio: primeraFranjaLibre.horaInicio,
          horaFin: primeraFranjaLibre.horaFin,
          cuposDisponibles: 5,
          capacidad: 5,
        }
      : sugerenciaDesdeBack;

  const horaValida =
    Boolean(horaInicio && horarios.some((h) => h.horaInicio === horaInicio));

  const mostrarSugerencia =
    Boolean(sugerenciaActual && !horaValida && !cargandoHorarios);

  const handleUsarSugerencia = (s: SugerenciaPortal) => {
    setFecha(s.fecha);
    setHoraInicio(s.horaInicio);
  };

  // ¿Límite alcanzado?
  const limiteAlcanzado = turnosFuturosCount >= limiteMaximo;

  // Validación previa a abrir modal de resumen
  const handleIniciarGuardado = (e: React.FormEvent) => {
    e.preventDefault();
    if (limiteAlcanzado) {
      showToast("error", "No podés reservar: límite de turnos futuros alcanzado.");
      return;
    }
    if (!materiaId || !profesorId || !fecha || !horaInicio) {
      showToast("error", "Completá todos los campos obligatorios para continuar.");
      return;
    }
    setModalResumenOpen(true);
  };

  // Confirmar y generar reserva
  const handleConfirmarReserva = async () => {
    setGuardando(true);
    try {
      const nuevo = await reservarTurnoPortal({
        materiaId: Number(materiaId),
        profesorId: Number(profesorId),
        fecha,
        horaInicio,
        observaciones: observaciones.trim() || null,
      });

      setTurnoReservadoExitoso(nuevo);
      setModalResumenOpen(false);
      setTurnosFuturosCount((prev) => prev + 1);
      showToast("success", `¡Turno ${nuevo.codigo} reservado con éxito!`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al procesar la reserva.";
      showToast("error", msg);
    } finally {
      setGuardando(false);
    }
  };

  const handleNuevaReserva = () => {
    setTurnoReservadoExitoso(null);
    setMateriaId("");
    setProfesorId("");
    setFecha("");
    setHoraInicio("");
    setObservaciones("");
    setHorariosCarga(null);
    setSugerencia(null);
    recargarTurnosYCatalogo();
  };

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <Icon name="progress_activity" size={28} className="animate-spin text-secondary mb-2" />
        <p className="text-xs font-semibold">Verificando disponibilidad y límite de turnos...</p>
      </div>
    );
  }

  // ─── PANTALLA DE COMPROBANTE TRAS RESERVA EXITOSA ──────────────────────────
  if (turnoReservadoExitoso) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="rounded-lg border border-slate-200 bg-white p-6 sm:p-8 shadow-sm text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-status-success-strong/15 text-status-success-strong mb-4">
            <Icon name="check_circle" size={34} />
          </div>

          <span className="rounded bg-status-success-strong/10 px-2.5 py-0.5 text-xs font-bold text-status-success-strong uppercase tracking-wider">
            Reserva Confirmada
          </span>

          <h2 className="mt-2 font-display text-2xl font-bold text-slate-900">
            ¡Tu turno fue reservado con éxito!
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Comprobante de reserva generado por el Portal del Alumno
          </p>

          {/* Tarjeta del Comprobante */}
          <div className="mt-6 rounded-md border border-slate-200 bg-slate-50 p-5 text-left text-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="block text-[11px] font-bold text-slate-400 uppercase">
                  Código de Turno
                </span>
                <span className="font-mono text-base font-bold text-primary">
                  {turnoReservadoExitoso.codigo}
                </span>
              </div>
              <span className="rounded-sm bg-blue-100 px-2 py-0.5 font-bold text-secondary text-xs">
                {turnoReservadoExitoso.estado}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <span className="block text-[11px] font-bold text-slate-400">Alumno</span>
                <span className="font-semibold text-slate-800">{nombreAlumno}</span>
              </div>
              <div>
                <span className="block text-[11px] font-bold text-slate-400">Materia</span>
                <span className="font-semibold text-slate-800">
                  {turnoReservadoExitoso.materia.nombre}
                </span>
              </div>
              <div>
                <span className="block text-[11px] font-bold text-slate-400">Profesor</span>
                <span className="font-semibold text-slate-800">
                  {turnoReservadoExitoso.profesor.apellido}, {turnoReservadoExitoso.profesor.nombre}
                </span>
              </div>
              <div>
                <span className="block text-[11px] font-bold text-slate-400">Fecha y Horario</span>
                <span className="font-semibold text-slate-800">
                  {turnoReservadoExitoso.fecha} · {turnoReservadoExitoso.horaInicio} a{" "}
                  {turnoReservadoExitoso.horaFin} hs
                </span>
              </div>
            </div>

            {turnoReservadoExitoso.observaciones && (
              <div className="border-t border-slate-200 pt-2">
                <span className="block text-[11px] font-bold text-slate-400">Observaciones</span>
                <p className="text-slate-600 mt-0.5">{turnoReservadoExitoso.observaciones}</p>
              </div>
            )}
          </div>

          {/* Acciones */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => window.print()}
              className="gap-1.5"
            >
              <Icon name="print" size={16} />
              Imprimir comprobante
            </Button>

            <Link href="/portal/mis-turnos">
              <Button variant="secondary" size="sm" type="button" className="gap-1.5">
                <Icon name="event_note" size={16} />
                Ver mis turnos
              </Button>
            </Link>

            {!limiteAlcanzado && (
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={handleNuevaReserva}
                className="text-slate-600 hover:text-slate-900"
              >
                Reservar otro turno
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── FORMULARIO DE RESERVA ─────────────────────────────────────────────────
  const matSeleccionada = materias.find((m) => m.id === materiaId);
  const profSeleccionado = profesores.find((p) => p.id === profesorId);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Encabezado de la Pantalla */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Reservar Turno de Apoyo
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Seleccioná la materia, profesor y el horario disponible que prefieras.
          </p>
        </div>

        {/* Contador de turnos activos */}
        <div
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border ${
            limiteAlcanzado
              ? "bg-red-50 text-red-700 border-red-200"
              : "bg-slate-100 text-slate-700 border-slate-200"
          }`}
        >
          <Icon name="event_available" size={15} />
          {turnosFuturosCount} de {limiteMaximo} turnos futuros reservados
        </div>
      </div>

      {/* ─── MENSAJE EN ROJO: LÍMITE DE TURNOS ALCANZADO (Diagrama de flujo) ─── */}
      {limiteAlcanzado && (
        <div
          role="alert"
          className="flex items-start gap-3.5 rounded-lg border-2 border-red-500 bg-red-50/90 p-4 shadow-xs text-red-800"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-600 text-white shadow-xs">
            <Icon name="error" size={22} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-red-900">
              Mensaje en rojo: límite de turnos alcanzado
            </h3>
            <p className="mt-1 text-xs text-red-700 leading-relaxed font-medium">
              Alcanzaste el cupo máximo de <strong>{limiteMaximo} turnos futuros reservados</strong>{" "}
              permitidos por el Centro Académico. Para poder agendar una nueva clase, debés esperar
              a que se dicte una de tus clases reservadas o consultar con Mesa de Entrada.
            </p>
            <div className="mt-3">
              <Link href="/portal/mis-turnos">
                <Button
                  variant="primary"
                  size="xs"
                  type="button"
                  className="bg-red-700 text-white hover:bg-red-800 gap-1"
                >
                  <Icon name="event_note" size={14} />
                  Ver mis turnos reservados
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Tarjeta del Formulario */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <form onSubmit={handleIniciarGuardado} className="space-y-5">
          {/* 1. REGLA CRÍTICA: Campo de Alumno FIJO y NO EDITABLE */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Alumno
            </label>
            <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-slate-700 font-bold text-[11px]">
                  {nombreAlumno.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <span className="font-bold text-slate-800 block">{nombreAlumno}</span>
                  <span className="text-[11px] text-slate-500">{emailAlumno}</span>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 bg-slate-200/60 rounded px-2 py-0.5">
                <Icon name="lock" size={13} />
                No editable
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              La reserva se emitirá estrictamente a nombre de tu ficha personal.
            </p>
          </div>

          {/* 2. Selector de Materia */}
          <div>
            <label
              htmlFor="materia-select"
              className="block text-xs font-bold text-slate-700 mb-1"
            >
              Materia de apoyo <span className="text-red-500">*</span>
            </label>
            <select
              id="materia-select"
              required
              disabled={limiteAlcanzado}
              value={materiaId}
              onChange={handleMateriaChange}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value="">Seleccioná una materia...</option>
              {materias.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre} ({m.nivel}) — {m.duracionClaseMinutos} min
                </option>
              ))}
            </select>
          </div>

          {/* 3. Selector de Profesor (dependiente de la materia) */}
          <div>
            <label
              htmlFor="profesor-select"
              className="block text-xs font-bold text-slate-700 mb-1"
            >
              Profesor docente <span className="text-red-500">*</span>
            </label>
            <select
              id="profesor-select"
              required
              disabled={limiteAlcanzado || !materiaId || cargandoProfesores}
              value={profesorId}
              onChange={handleProfesorChange}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value="">
                {!materiaId
                  ? "Primero seleccioná una materia..."
                  : cargandoProfesores
                  ? "Cargando docentes..."
                  : "Seleccioná un profesor..."}
              </option>
              {profesores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.apellido}, {p.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Componente "Próximo horario libre" */}
          {mostrarSugerencia && sugerenciaActual && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-tertiary/40 bg-tertiary/5 px-3.5 py-2.5 text-xs text-on-surface">
              <div className="flex items-center gap-2">
                <Icon name="bolt" size={18} className="text-tertiary shrink-0" />
                <p className="font-medium text-slate-800">
                  Próximo horario libre:{" "}
                  <strong className="font-bold">
                    {diaCorto(sugerenciaActual.fecha)} {formatearFecha(sugerenciaActual.fecha)} ·{" "}
                    {sugerenciaActual.horaInicio} – {sugerenciaActual.horaFin}
                  </strong>{" "}
                  <span className="text-on-surface-variant">
                    ({sugerenciaActual.cuposDisponibles ?? 5} de {sugerenciaActual.capacidad ?? 5} cupos)
                  </span>
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-9 font-bold"
                onClick={() => handleUsarSugerencia(sugerenciaActual)}
              >
                Usar este horario
              </Button>
            </div>
          )}

          {/* 4. Selector de Fecha y 5. Selector de Horarios */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="fecha-input"
                className="block text-xs font-bold text-slate-700 mb-1"
              >
                Fecha de la clase <span className="text-red-500">*</span>
              </label>
              <input
                id="fecha-input"
                type="date"
                required
                min={hoyIso}
                max={fechaMax}
                disabled={limiteAlcanzado}
                value={fecha}
                onChange={handleFechaChange}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary disabled:bg-slate-100 disabled:text-slate-400"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                dd/mm/aaaa · de hoy al {formatearFecha(fechaMax)}.
              </span>
            </div>

            <div>
              <label
                htmlFor="horario-select"
                className="block text-xs font-bold text-slate-700 mb-1"
              >
                Horario disponible <span className="text-red-500">*</span>
              </label>
              <select
                id="horario-select"
                required
                disabled={limiteAlcanzado || !profesorId || !fecha || cargandoHorarios || horarios.length === 0}
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="">
                  {!profesorId
                    ? "Primero seleccioná un profesor..."
                    : !fecha
                    ? "Elegí una fecha para ver horarios..."
                    : cargandoHorarios
                    ? "Cargando horarios disponibles..."
                    : horarios.length === 0
                    ? "Sin horarios disponibles este día"
                    : "Seleccioná una franja horaria..."}
                </option>
                {horarios.map((h) => (
                  <option key={h.horaInicio} value={h.horaInicio}>
                    {h.horaInicio} a {h.horaFin} hs
                  </option>
                ))}
              </select>
              {cargandoHorarios && (
                <span className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                  <Icon name="progress_activity" size={13} className="animate-spin text-secondary" />
                  Buscando franjas libres...
                </span>
              )}
            </div>
          </div>

          {/* Aviso contextual cuando no hay fecha o cuando el día elegido no tiene horarios */}
          {!fecha && profesorId && materiaId && (
            <p className="rounded-md border border-dashed border-slate-300 bg-slate-50/70 p-3 text-xs font-medium text-slate-500 text-center">
              Completá materia, profesor y fecha para ver los horarios libres.
            </p>
          )}

          {fecha && !cargandoHorarios && horarios.length === 0 && (
            <div className="flex items-start gap-2 rounded-md border border-dashed border-amber-300 bg-amber-50/70 p-3 text-xs text-amber-900">
              <Icon name="event_busy" size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <p>
                El profesor no tiene horarios libres el{" "}
                <strong>{diaCorto(fecha)} {formatearFecha(fecha)}</strong>. Elegí otra fecha en el calendario o usá el próximo horario libre sugerido.
              </p>
            </div>
          )}

          {/* 6. Observaciones Opcionales */}
          <div>
            <label
              htmlFor="obs-input"
              className="block text-xs font-bold text-slate-700 mb-1"
            >
              Tema de consulta u observaciones (opcional)
            </label>
            <textarea
              id="obs-input"
              rows={2}
              maxLength={250}
              disabled={limiteAlcanzado}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Ej: Ejercicios de funciones trigonométricas para examen trimestral"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary disabled:bg-slate-100 disabled:text-slate-400"
            />
            <span className="text-[11px] text-slate-400 text-right block">
              {observaciones.length}/250 caracteres
            </span>
          </div>

          {/* Botón de Enviar */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-3">
            <Link href="/portal/mis-turnos">
              <Button variant="ghost" size="sm" type="button">
                Cancelar
              </Button>
            </Link>

            <Button
              variant="primary"
              size="sm"
              type="submit"
              disabled={limiteAlcanzado || !materiaId || !profesorId || !fecha || !horaInicio}
              className="gap-1.5 bg-secondary hover:bg-secondary/90 text-white"
            >
              <Icon name="check" size={16} />
              Revisar y confirmar reserva
            </Button>
          </div>
        </form>
      </div>

      {/* ─── MODAL DE RESUMEN ANTES DE GUARDAR (Diagrama de flujo) ──────────── */}
      {modalResumenOpen && (
        <Modal
          open={modalResumenOpen}
          onClose={() => !guardando && setModalResumenOpen(false)}
          title="Resumen de Reserva de Turno"
          maxWidth="max-w-md"
        >
          <div className="space-y-4 text-xs text-slate-700">
            <p className="text-slate-500">
              Revisá los datos antes de confirmar tu turno. Al guardar, quedará registrado con origen{" "}
              <strong>Portal del Alumno</strong>.
            </p>

            <div className="rounded-md border border-slate-200 bg-slate-50 p-4 space-y-2.5">
              <div className="flex justify-between">
                <span className="font-bold text-slate-500">Alumno:</span>
                <span className="font-bold text-slate-900">{nombreAlumno}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-slate-500">Materia:</span>
                <span className="font-bold text-primary">{matSeleccionada?.nombre}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-slate-500">Profesor:</span>
                <span className="font-bold text-slate-900">
                  {profSeleccionado?.apellido}, {profSeleccionado?.nombre}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-slate-500">Fecha:</span>
                <span className="font-semibold text-slate-900">{fecha}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-slate-500">Horario:</span>
                <span className="font-semibold text-slate-900">{horaInicio} hs</span>
              </div>
              {observaciones && (
                <div className="pt-2 border-t border-slate-200">
                  <span className="block font-bold text-slate-500 mb-0.5">Observaciones:</span>
                  <p className="text-slate-700 italic">{observaciones}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                disabled={guardando}
                onClick={() => setModalResumenOpen(false)}
              >
                Volver a editar
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="button"
                disabled={guardando}
                onClick={handleConfirmarReserva}
                className="gap-1.5 bg-secondary hover:bg-secondary/90 text-white"
              >
                <Icon
                  name={guardando ? "progress_activity" : "check"}
                  size={16}
                  className={guardando ? "animate-spin" : ""}
                />
                {guardando ? "Confirmando..." : "Confirmar reserva"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
