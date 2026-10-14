// src/components/alumnos/historial/StudentHistoryTab.tsx
//
// Contenedor principal de la pestaña "Historial del Alumno: Línea de Tiempo y Notas" (HU-ALU-03).
//
// Reglas y criterios clave:
//  - Alumno inactivo: bloquea la pestaña en "modo LECTURA" y OCULTA el botón de agregar nota.
//  - Renderiza Resumen superior (HistorySummary).
//  - Renderiza Filtros combinables (HistoryFilters).
//  - Renderiza Línea de tiempo vertical (TimelineList).
//  - Integra AddNoteModal con confirmación, validación de 500 caracteres y refresco automático.
//  - Control de permisos para observaciones sensibles y notas.
//  - Opción de impresión de historial.
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { HistorySummary } from "./HistorySummary";
import { HistoryFilters } from "./HistoryFilters";
import { TimelineList } from "./TimelineList";
import { AddNoteModal } from "./AddNoteModal";
import { Button } from "@/components/ui/Button";
import { EncabezadoImpresion } from "@/components/layout/EncabezadoImpresion";
import { useSesion } from "@/funciones/sesion";
import { obtenerHistorialAlumno } from "@/data/historial";
import type {
  EventoHistorialResponse,
  ResumenHistorialResponse,
  TipoEventoHistorial,
} from "@/contracts/historial";
import type { StudentUI } from "@/modules/alumnos/types";
import { ApiError } from "@/lib/api-client";
import {
  StickyNote,
  Printer,
  Info,
  Lock,
  History,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

interface StudentHistoryTabProps {
  student: StudentUI;
  /**
   * Permite forzar el estado activo/inactivo para testing y control granular.
   * Si no se provee, se infiere de student.estado === "activo".
   */
  isActive?: boolean;
}

export function StudentHistoryTab({
  student,
  isActive,
}: StudentHistoryTabProps) {
  const { sesion } = useSesion();

  // Si isActive está definido, tiene precedencia; si no, valida student.estado
  const alumnoActivo =
    isActive !== undefined ? isActive : student.estado === "activo";

  // Estados de datos
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [esErrorAcceso, setEsErrorAcceso] = useState(false);
  const [resumen, setResumen] = useState<ResumenHistorialResponse | null>(null);
  const [eventos, setEventos] = useState<EventoHistorialResponse[]>([]);

  // Catálogos para filtros
  const [materiasDisponibles, setMateriasDisponibles] = useState<
    Array<{ id: number; nombre: string }>
  >([]);
  const [profesoresDisponibles, setProfesoresDisponibles] = useState<
    Array<{ id: number; nombre: string }>
  >([]);

  // Estados de filtros
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [tipoEvento, setTipoEvento] = useState("todos");
  const [materiaId, setMateriaId] = useState("todas");
  const [profesorId, setProfesorId] = useState("todos");
  const [soloNotas, setSoloNotas] = useState(false);

  // Estados de recarga
  const [versionCarga, setVersionCarga] = useState(0);

  // Modal para agregar nota
  const [modalNotaAbierto, setModalNotaAbierto] = useState(false);

  // Rol del usuario actual
  const rol = sesion?.usuario.rol.nombre ?? "Mesa de Entrada";
  const esProfesor = rol === "Profesor";

  useEffect(() => {
    let cancelado = false;

    const sesionCtx = {
      usuarioId: sesion?.usuario.id,
      nombreCompleto: sesion?.usuario
        ? `${sesion.usuario.nombre} ${sesion.usuario.apellido}`.trim()
        : undefined,
      rol: sesion?.usuario.rol.nombre,
      profesorId: sesion?.usuario.id,
    };

    const tipoFinal: TipoEventoHistorial | undefined = soloNotas
      ? "Nota"
      : tipoEvento !== "todos"
      ? (tipoEvento as TipoEventoHistorial)
      : undefined;

    obtenerHistorialAlumno(
      student.id,
      {
        desde: desde || undefined,
        hasta: hasta || undefined,
        tipo: tipoFinal,
        materiaId:
          !soloNotas && materiaId !== "todas"
            ? Number(materiaId)
            : undefined,
        profesorId:
          !soloNotas && profesorId !== "todos"
            ? Number(profesorId)
            : undefined,
      },
      sesionCtx
    )
      .then((respuesta) => {
        if (cancelado) return;
        setResumen(respuesta.resumen);
        setEventos(respuesta.eventos);
        setErrorCarga(null);
        setEsErrorAcceso(false);
        setCargando(false);

        // Extraer materias y profesores únicos para los filtros a partir de los datos
        const matMap = new Map<number, string>();
        const profMap = new Map<number, string>();

        respuesta.eventos.forEach((ev) => {
          if (ev.materia) matMap.set(ev.materia.id, ev.materia.nombre);
          if (ev.profesor) profMap.set(ev.profesor.id, ev.profesor.nombreCompleto);
        });

        setMateriasDisponibles((prev) => {
          if (prev.length > 0) return prev;
          return Array.from(matMap.entries()).map(([id, nombre]) => ({
            id,
            nombre,
          }));
        });

        setProfesoresDisponibles((prev) => {
          if (prev.length > 0) return prev;
          return Array.from(profMap.entries()).map(([id, nombre]) => ({
            id,
            nombre,
          }));
        });
      })
      .catch((err: unknown) => {
        if (cancelado) return;
        if (
          err instanceof ApiError &&
          (err.codigo === "PROFESOR_NO_ATIENDE_ALUMNO" ||
            err.codigo === "SIN_PERMISO" ||
            err.codigo === "ACCESO_DENEGADO")
        ) {
          setEsErrorAcceso(true);
          setErrorCarga(
            "Acceso restringido: como Profesor solo tenés autorización para consultar el historial de alumnos que asisten a tus clases."
          );
        } else {
          setErrorCarga("Ocurrió un error al cargar el historial del alumno.");
        }
        setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [
    student.id,
    sesion,
    desde,
    hasta,
    tipoEvento,
    materiaId,
    profesorId,
    soloNotas,
    versionCarga,
  ]);

  const handleLimpiarFiltros = () => {
    setDesde("");
    setHasta("");
    setTipoEvento("todos");
    setMateriaId("todas");
    setProfesorId("todos");
    setSoloNotas(false);
  };

  const handleToggleSoloNotas = () => {
    setSoloNotas((prev) => !prev);
  };

  const handleImprimir = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleNotaCreada = () => {
    // Recarga silenciosa para refrescar la lista y el resumen
    setVersionCarga((v) => v + 1);
  };

  // Filtros formateados para el encabezado impreso (PDF limpio)
  const filtrosParaImpresion: string[] = useMemo(() => {
    const lista: string[] = [];
    if (desde) lista.push(`Desde: ${desde}`);
    if (hasta) lista.push(`Hasta: ${hasta}`);
    if (tipoEvento !== "todos") lista.push(`Tipo: ${tipoEvento}`);
    if (materiaId !== "todas") {
      const mat = materiasDisponibles.find((m) => String(m.id) === materiaId);
      lista.push(`Materia: ${mat?.nombre ?? materiaId}`);
    }
    if (profesorId !== "todos") {
      const prof = profesoresDisponibles.find((p) => String(p.id) === profesorId);
      lista.push(`Profesor: ${prof?.nombre ?? profesorId}`);
    }
    if (soloNotas) lista.push("Solo notas");
    return lista;
  }, [desde, hasta, tipoEvento, materiaId, profesorId, soloNotas, materiasDisponibles, profesoresDisponibles]);

  // Permisos para ver observaciones y notas sensibles
  const puedeVerObservacionesYNotas =
    rol === "Mesa de Entrada" || rol === "Gerente" || esProfesor;

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Encabezado Institucional para Impresión (PDF) */}
      <EncabezadoImpresion
        titulo="Historial y Notas del Alumno"
        subtitulo={`${student.nombre} ${student.apellido} · Legajo ${student.legajo} · Nivel: ${student.nivelEducativo}`}
        filtrosAplicados={filtrosParaImpresion}
      />

      {/* Barra Superior de la Pestaña */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/60 pb-4 print:hidden">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg font-bold text-on-surface">
            Historial y Notas
          </h2>
          <span className="rounded-sm bg-surface-container-high px-2 py-0.5 text-xs font-bold text-on-surface-variant">
            Línea de tiempo
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Botón Imprimir / Exportar */}
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={handleImprimir}
            className="text-xs gap-1.5"
            title="Imprimir historial del alumno"
          >
            <Printer className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Imprimir historial</span>
          </Button>

          {/* Botón Refrescar */}
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => {
              setCargando(true);
              setVersionCarga((v) => v + 1);
            }}
            disabled={cargando}
            className="text-xs px-2"
            title="Refrescar datos"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${cargando ? "animate-spin" : ""}`} />
          </Button>

          {/* Botón Agregar Nota (CRÍTICO: Oculto si el alumno es inactivo) */}
          {alumnoActivo && (
            <Button
              id="btn-abrir-agregar-nota"
              variant="primary"
              size="sm"
              type="button"
              onClick={() => setModalNotaAbierto(true)}
              className="text-xs gap-1.5 bg-purple-600 hover:bg-purple-700 shadow-sm"
            >
              <StickyNote className="h-3.5 w-3.5" />
              <span>Agregar nota</span>
            </Button>
          )}
        </div>
      </div>

      {/* Banner de Modo LECTURA si el alumno está inactivo */}
      {!alumnoActivo && (
        <div
          id="banner-modo-lectura-inactivo"
          className="flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 shadow-xs print:hidden"
        >
          <Info className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <p className="font-bold">
              Modo LECTURA · Alumno Inactivo
            </p>
            <p className="mt-0.5 leading-relaxed text-amber-800">
              El historial de turnos, asistencias y notas permanece accesible para consulta, pero la ficha está bloqueada: no se pueden registrar nuevas notas ni modificar su estado mientras continúe inactivo.
            </p>
          </div>
        </div>
      )}

      {/* Manejo de Error de Acceso (403 para profesor no asignado) */}
      {esErrorAcceso ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-8 text-center text-amber-900 shadow-xs">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700 mb-3">
            <Lock className="h-6 w-6" />
          </div>
          <h3 className="font-bold text-sm">Acceso restringido</h3>
          <p className="mt-1 text-xs text-amber-800 max-w-md mx-auto">
            {errorCarga}
          </p>
        </div>
      ) : errorCarga ? (
        <div className="rounded-md border border-rose-300 bg-rose-50 p-6 text-center text-rose-900 shadow-xs">
          <AlertCircle className="mx-auto h-8 w-8 text-rose-600 mb-2" />
          <h3 className="font-bold text-sm">Error al cargar historial</h3>
          <p className="text-xs text-rose-700 mt-1">{errorCarga}</p>
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => {
              setCargando(true);
              setVersionCarga((v) => v + 1);
            }}
            className="mt-3 text-xs"
          >
            Reintentar
          </Button>
        </div>
      ) : (
        <>
          {/* 1. Resumen Superior (Métricas clave) */}
          <section aria-label="Resumen de métricas de historial">
            <HistorySummary resumen={resumen} cargando={cargando} />
          </section>

          {/* 2. Filtros Combinables */}
          <section aria-label="Filtros del historial" className="print:hidden">
            <HistoryFilters
              desde={desde}
              hasta={hasta}
              onRangoChange={({ desde: d, hasta: h }) => {
                setDesde(d);
                setHasta(h);
              }}
              tipoEvento={tipoEvento}
              onTipoEventoChange={setTipoEvento}
              materiaId={materiaId}
              onMateriaChange={setMateriaId}
              profesorId={profesorId}
              onProfesorChange={setProfesorId}
              soloNotas={soloNotas}
              onToggleSoloNotas={handleToggleSoloNotas}
              onLimpiarFiltros={handleLimpiarFiltros}
              materiasDisponibles={materiasDisponibles}
              profesoresDisponibles={profesoresDisponibles}
            />
          </section>

          {/* 3. Línea de Tiempo Vertical */}
          <section aria-label="Línea de tiempo de eventos">
            <TimelineList
              eventos={eventos}
              puedeVerObservacionesYNotas={puedeVerObservacionesYNotas}
              cargando={cargando}
              onLimpiarFiltros={handleLimpiarFiltros}
            />
          </section>
        </>
      )}

      {/* 4. Modal para Agregar Nota (solo si alumno es activo) */}
      {alumnoActivo && (
        <AddNoteModal
          open={modalNotaAbierto}
          onClose={() => setModalNotaAbierto(false)}
          onSuccess={handleNotaCreada}
          alumnoId={student.id}
          alumnoNombre={`${student.nombre} ${student.apellido}`}
          alumnoInactivo={!alumnoActivo}
        />
      )}
    </div>
  );
}
