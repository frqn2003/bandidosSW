// src/components/profesores/MiFichaPage.tsx
//
// Pantalla "Mi Ficha" para el rol Profesor (HU-PRO-01 / HU-SIS-01).
// - Datos personales y académicos en modo LECTURA.
// - Capacidad de editar sus propios bloques de disponibilidad horaria semanal.
// - Sigue la misma estética, paleta de colores y componentes de Cuerpo Docente.

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EstadoProfesorBadge } from "@/components/profesores/EstadoProfesorBadge";
import { BloquesDisponibilidadModal } from "@/components/profesores/BloquesDisponibilidadModal";
import { useSesion } from "@/funciones/sesion";
import { useToast } from "@/components/ui/Toast";
import {
  listarProfesores,
  listarBloquesDe,
  guardarDisponibilidad,
  bloquesPorDiaDesde,
  aProfesor,
  type Profesor,
} from "@/data/profesores";
import {
  DIAS_SEMANA_LARGOS,
  cargaHorariaSemanal,
  jornadasConBloques,
  capacidadMaxDe,
  formatearFecha,
  formatearTelefono,
  inicialesDe,
  tonoAvatarDe,
  horasDeRango,
} from "@/funciones/profesores";
import { mensajeDeError } from "@/lib/api-client";

export function MiFichaPage() {
  const { sesion, cargando: cargandoSesion } = useSesion();
  const { showToast } = useToast();

  const [profesor, setProfesor] = useState<Profesor | null>(null);
  const [cargando, setCargando] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [modalBloques, setModalBloques] = useState<boolean>(false);

  // Carga de la ficha del profesor actual
  const cargarFicha = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const lista = await listarProfesores({ estado: "activo" });
      if (!lista || lista.length === 0) {
        setError("No se encontró el registro docente asociado.");
        setCargando(false);
        return;
      }

      // Buscar el profesor asociado al usuario en sesión
      const match =
        lista.find((p) => p.usuario?.id === sesion?.usuario?.id) ?? lista[0];

      // Traer bloques de disponibilidad de la base
      const bloquesResp = await listarBloquesDe(match.id);
      const bloquesMap = bloquesPorDiaDesde(bloquesResp);

      setProfesor(aProfesor(match, bloquesMap));
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setCargando(false);
    }
  }, [sesion?.usuario?.id]);

  useEffect(() => {
    if (!cargandoSesion) {
      void cargarFicha();
    }
  }, [cargandoSesion, cargarFicha]);

  // Guardado de bloques de disponibilidad
  const handleGuardarBloques = async (
    nuevosBloques: Record<number, string[]>
  ) => {
    if (!profesor) return;
    try {
      const bloquesGuardados = await guardarDisponibilidad(
        profesor.id,
        profesor.academiaId,
        nuevosBloques
      );
      setProfesor((prev) =>
        prev ? { ...prev, bloquesPorDia: bloquesGuardados } : null
      );
      showToast("success", "Tus bloques de horarios se guardaron correctamente.");
      setModalBloques(false);
    } catch (err) {
      showToast(
        "error",
        `No se pudo guardar la disponibilidad: ${mensajeDeError(err)}`
      );
    }
  };

  if (cargando) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <main className="flex flex-1 items-center justify-center p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
            <Icon name="progress_activity" size={20} className="animate-spin text-blue-600" />
            Cargando tu ficha docente…
          </div>
        </main>
      </div>
    );
  }

  if (error || !profesor) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <main className="flex flex-1 items-center justify-center p-6 text-center">
          <div className="max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm space-y-4">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
              <Icon name="error" size={24} />
            </span>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-slate-900">
                No se pudo cargar tu ficha
              </h2>
              <p className="text-xs text-slate-500">
                {error ?? "Ocurrió un error inesperado al consultar tu perfil."}
              </p>
            </div>
            <Button variant="primary" onClick={() => void cargarFicha()}>
              Reintentar
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const carga = cargaHorariaSemanal(profesor);
  const jornadas = jornadasConBloques(profesor);
  const capacidad = capacidadMaxDe(profesor);

  const diasConBloques = DIAS_SEMANA_LARGOS.map((label, i) => {
    const dia = i + 1;
    const rangos = profesor.bloquesPorDia[dia] ?? [];
    return { dia, label, rangos };
  });

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-y-auto">
        <main className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* ── ENCABEZADO DE FICHA ── */}
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
            <div className="flex items-center gap-4">
              <span
                aria-hidden="true"
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-bold shadow-xs ${tonoAvatarDe(
                  profesor.id
                )}`}
              >
                {inicialesDe(profesor.nombre, profesor.apellido)}
              </span>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
                    {profesor.nombre} {profesor.apellido}
                  </h1>
                  <EstadoProfesorBadge estado={profesor.estado} />
                  <StatusBadge variant="neutral" icon="lock" label="Modo lectura" />
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {profesor.tituloEspecialidad
                    ? `${profesor.tituloEspecialidad} · `
                    : ""}
                  Alta en sistema: {formatearFecha(profesor.fechaCreacion)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="primary"
                onClick={() => setModalBloques(true)}
                className="gap-2 shadow-xs"
              >
                <Icon name="schedule" size={18} />
                Editar bloques de horarios
              </Button>
            </div>
          </header>

          {/* ── CUADRÍCULA DE 3 TARJETAS RESUMEN ── */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4.5 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-semibold">Carga horaria semanal</span>
                <Icon name="timer" size={18} className="text-blue-600" />
              </div>
              <p className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                {carga}{" "}
                <span className="text-xs font-normal text-slate-500">horas</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Total de franjas activas en la semana
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4.5 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-semibold">Jornadas semanales</span>
                <Icon name="calendar_today" size={18} className="text-indigo-600" />
              </div>
              <p className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                {jornadas}{" "}
                <span className="text-xs font-normal text-slate-500">días</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Días con al menos un bloque asignado
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4.5 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-semibold">Capacidad de alumnos</span>
                <Icon name="group" size={18} className="text-emerald-600" />
              </div>
              <p className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                {capacidad}{" "}
                <span className="text-xs font-normal text-slate-500">
                  alumnos máx.
                </span>
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Cupo simultáneo en clases
              </p>
            </div>
          </section>

          {/* ── CUERPO PRINCIPAL: 2 COLUMNAS ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Columna Izquierda: Información de Contacto y Materias (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Tarjeta de Información Personal */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Icon name="person" size={18} className="text-slate-600" />
                  <h2 className="text-sm font-bold text-slate-900">
                    Datos del Profesor
                  </h2>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-500 font-medium block">
                      Correo Electrónico
                    </span>
                    <span className="text-slate-900 font-semibold break-all">
                      {profesor.email}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 font-medium block">Teléfono</span>
                    <span className="text-slate-900 font-semibold">
                      {formatearTelefono(profesor.telefono)}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 font-medium block">
                      Título / Especialidad
                    </span>
                    <span className="text-slate-900 font-semibold">
                      {profesor.tituloEspecialidad || "Sin título registrado"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tarjeta de Materias Asignadas */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Icon name="menu_book" size={18} className="text-slate-600" />
                    <h2 className="text-sm font-bold text-slate-900">
                      Materias Asignadas ({profesor.materias.length})
                    </h2>
                  </div>
                </div>

                {profesor.materias.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-2">
                    No tienes materias asignadas actualmente.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {profesor.materias.map((m) => (
                      <div
                        key={m.profesorMateriaId}
                        className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between font-bold text-slate-900">
                          <span>{m.materia.nombre}</span>
                          <span className="text-[11px] font-medium text-slate-500">
                            Hasta {m.capacidadMaxima} alumnos
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <span className="rounded bg-white px-1.5 py-0.5 border border-slate-200">
                            Nivel {m.materia.nivel}
                          </span>
                          <span>·</span>
                          <span>{m.materia.duracionClaseMinutos} min / clase</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Columna Derecha: Disponibilidad Horaria Semanal (7 cols) */}
            <div className="lg:col-span-7">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Icon name="calendar_view_week" size={18} className="text-slate-600" />
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">
                        Disponibilidad Horaria Semanal
                      </h2>
                      <p className="text-[11px] text-slate-500">
                        Franjas horarias en las que tienes asignada disponibilidad
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setModalBloques(true)}
                    className="gap-1.5 text-xs py-1 px-3 shadow-xs bg-white"
                  >
                    <Icon name="edit_calendar" size={15} />
                    Modificar
                  </Button>
                </div>

                <div className="divide-y divide-slate-100">
                  {diasConBloques.map(({ dia, label, rangos }) => {
                    const tieneBloques = rangos.length > 0;
                    return (
                      <div
                        key={dia}
                        className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                      >
                        <div className="w-28 shrink-0">
                          <span className="text-xs font-bold text-slate-900">
                            {label}
                          </span>
                        </div>

                        <div className="flex-1 flex flex-wrap gap-2">
                          {tieneBloques ? (
                            rangos.map((rango, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50/80 px-2.5 py-1 text-xs font-semibold text-blue-900 shadow-2xs"
                              >
                                <Icon name="schedule" size={13} className="text-blue-600" />
                                {rango.replace("-", " – ")} hs
                                <span className="text-[10px] font-normal text-blue-700">
                                  ({horasDeRango(rango)}h)
                                </span>
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400 italic">
                              Sin disponibilidad configurada
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Modal para editar los bloques de disponibilidad horaria */}
      <BloquesDisponibilidadModal
        profesor={profesor}
        open={modalBloques}
        onClose={() => setModalBloques(false)}
        onGuardar={handleGuardarBloques}
      />
    </div>
  );
}
