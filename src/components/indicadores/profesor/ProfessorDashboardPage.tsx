// src/components/indicadores/profesor/ProfessorDashboardPage.tsx
//
// Tablero de Indicadores de Actividad del Profesor (HU-IND-02).
// Flujo completo:
//   1. Control de Acceso: ¿Rol = Profesor? Si no, deniega acceso con mensaje restrictivo.
//   2. Filtros por defecto: mes en curso y todas las materias que dicta.
//   3. Validación: Período válido (máx. 12 meses, hasta >= desde). Si inválido, error en rojo y bloquea petición.
//   4. Si hay datos:
//      - Denominador = 0 -> muestra "—" en los porcentajes correspondientes.
//      - 6 Tarjetas numéricas (Clases dictadas, Alumnos atendidos, Horas dictadas, % Asistencia, % Cancelaciones, % Ocupación).
//      - Gráficos y tabla: clases por semana (barras), clases por materia (dona), top 5 alumnos con más ausencias.
//   5. Si sin datos -> Muestra mensaje "Sin datos para el período seleccionado" ocultando tarjetas y gráficos.
//
// REGLA CRÍTICA DE SEGURIDAD: Solo lectura, sin ninguna información de pagos o financiera.

"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/layout/Sidebar";
import { Icon } from "@/components/ui/Icon";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useSesion } from "@/funciones/sesion";
import { mesEnCursoAR, rangoMenorA12Meses } from "@/contracts/indicadores";
import {
  consultarIndicadoresProfesor,
  type IndicadoresProfesorResponse,
} from "@/data/indicadores-profesor";
import { ActivityFilters } from "./ActivityFilters";
import { ProfessorKPIGrid } from "./ProfessorKPIGrid";
import { ProfessorChartsAndTables } from "./ProfessorChartsAndTables";
import { ProfessorRendition } from "@/components/pagos/deudores/ProfessorRendition";

export function ProfessorDashboardPage() {
  const { sesion, cargando: cargandoSesion } = useSesion();

  // Pestaña activa: Actividad (HU-IND-02) o Rendición de Cobranzas (HU-PAG-02)
  const [seccionActiva, setSeccionActiva] = useState<"actividad" | "rendicion">("actividad");

  // Filtros del tablero
  const periodoActual = mesEnCursoAR();
  const [desde, setDesde] = useState<string>(periodoActual.primerDia);
  const [hasta, setHasta] = useState<string>(periodoActual.ultimoDia);
  const [materiaId, setMateriaId] = useState<number | undefined>(undefined);

  // Estados de datos y validación
  const [errorPeriodo, setErrorPeriodo] = useState<string | null>(null);
  const [cargando, setCargando] = useState<boolean>(false);
  const [datos, setDatos] = useState<IndicadoresProfesorResponse | null>(null);

  const rolEfectivo = sesion?.usuario?.rol?.nombre ?? "";
  const esProfesor = rolEfectivo === "Profesor";

  // Función para validar período
  const validarPeriodo = (fechaDesde: string, fechaHasta: string): string | null => {
    if (!fechaDesde || !fechaHasta) {
      return "Debe ingresar ambas fechas del período.";
    }
    if (fechaHasta < fechaDesde) {
      return "La fecha de fin no puede ser anterior a la fecha de inicio.";
    }
    if (!rangoMenorA12Meses(fechaDesde, fechaHasta)) {
      return "El período seleccionado no puede superar los 12 meses.";
    }
    return null;
  };

  // Carga de datos
  const cargarIndicadores = useCallback(
    async (fDesde: string, fHasta: string, mId: number | undefined) => {
      // 1. Validar período antes de realizar petición
      const error = validarPeriodo(fDesde, fHasta);
      if (error) {
        setErrorPeriodo(error);
        return;
      }

      setErrorPeriodo(null);
      setCargando(true);

      try {
        const respuesta = await consultarIndicadoresProfesor({
          desde: fDesde,
          hasta: fHasta,
          materiaId: mId,
          // Sin profesorId: el back usa el profesor de la sesión.
        });
        setDatos(respuesta);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setErrorPeriodo(err.message);
        } else {
          setErrorPeriodo("No se pudieron cargar los indicadores del profesor.");
        }
      } finally {
        setCargando(false);
      }
    },
    []
  );

  // Carga inicial al montar si es profesor
  useEffect(() => {
    if (esProfesor) {
      void cargarIndicadores(desde, hasta, materiaId);
    }
  }, [esProfesor]); // eslint-disable-line react-hooks/exhaustive-deps

  // Manejador del botón "Actualizar"
  const handleActualizar = () => {
    void cargarIndicadores(desde, hasta, materiaId);
  };

  // Restablecer filtros
  const handleLimpiar = () => {
    const act = mesEnCursoAR();
    setDesde(act.primerDia);
    setHasta(act.ultimoDia);
    setMateriaId(undefined);
    setErrorPeriodo(null);
    void cargarIndicadores(act.primerDia, act.ultimoDia, undefined);
  };


  // ── 1. CONTROL DE ACCESO: ¿Rol = Profesor? ──
  if (!cargandoSesion && !esProfesor) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <main className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center space-y-4">
            <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600 ring-8 ring-red-50/50">
              <Icon name="lock" size={32} />
            </span>
            <div className="space-y-1.5">
              <h1 className="font-display text-xl font-bold text-slate-900">
                Acceso restringido al tablero
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed">
                Este tablero de actividad es exclusivo para el rol{" "}
                <strong className="text-slate-900 font-semibold">Profesor</strong>.
                Tu rol actual es <span className="font-semibold text-slate-800">{rolEfectivo}</span>.
              </p>
            </div>
            <div className="pt-2 flex justify-center">
              <Link
                href="/calendario"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
              >
                <Icon name="calendar_view_month" size={16} />
                Ir a mi Calendario
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const materias = datos?.materiasDictadas ?? [];
  const sinDatos = datos?.sinDatos || (!datos?.clasesDictadas && !datos?.alumnosAtendidos && !datos?.horasDictadas);

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Barra de navegación global */}
      <Sidebar />

      {/* Contenido principal del dashboard */}
      <div className="flex flex-1 flex-col overflow-y-auto">
        <main className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* ── ENCABEZADO PRINCIPAL ── */}
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
            <div className="flex items-center gap-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                <Icon name="insights" size={24} />
              </span>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
                    Indicadores de actividad
                  </h1>
                  <StatusBadge
                    variant="neutral"
                    icon="lock"
                    label="Solo lectura"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Métricas de turnos, asistencias y horas dictadas. Información personal sin datos de pagos.
                </p>
              </div>
            </div>
          </header>

          {/* ── SELECTOR DE SECCIÓN (Actividad Docente vs Rendición de Cobranzas) ── */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
            <button
              type="button"
              onClick={() => setSeccionActiva("actividad")}
              className={`inline-flex items-center gap-2 border-b-2 px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                seccionActiva === "actividad"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Icon name="insights" size={16} />
              Actividad y Asistencia
            </button>
            <button
              type="button"
              onClick={() => setSeccionActiva("rendicion")}
              className={`inline-flex items-center gap-2 border-b-2 px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                seccionActiva === "rendicion"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Icon name="receipt_long" size={16} />
              Rendición de Cobranzas
            </button>
          </div>

          {seccionActiva === "rendicion" ? (
            /* Vista de Rendición por Profesor (HU-PAG-02 en modo lectura) */
            <div className="pt-2">
              <ProfessorRendition />
            </div>
          ) : (
            <>
              {/* ── 2. BARRA DE FILTROS (ActivityFilters) ── */}
              <ActivityFilters
                desde={desde}
                hasta={hasta}
                materiaId={materiaId}
                materias={materias}
                errorPeriodo={errorPeriodo}
                cargando={cargando}
                onCambioDesde={(val) => {
                  setDesde(val);
                  if (errorPeriodo) setErrorPeriodo(null);
                }}
                onCambioHasta={(val) => {
                  setHasta(val);
                  if (errorPeriodo) setErrorPeriodo(null);
                }}
                onCambioMateria={setMateriaId}
                onActualizar={handleActualizar}
                onLimpiar={handleLimpiar}
              />

              {/* ── 3. LÓGICA DE ESTADOS VACÍOS O DATOS NUMÉRICOS ── */}
              {cargando && !datos ? (
                <div className="flex h-64 items-center justify-center rounded-xl border border-slate-200 bg-white">
                  <span className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                    <Icon name="progress_activity" size={20} className="animate-spin text-blue-600" />
                    Calculando indicadores de actividad…
                  </span>
                </div>
              ) : sinDatos ? (
                /* Estado Vacío requerido en diagrama de flujo */
                <div
                  id="estado-sin-datos"
                  role="status"
                  className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm space-y-4"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <Icon name="event_busy" size={32} />
                  </div>
                  <div className="space-y-1 max-w-md">
                    <h2 className="text-base font-bold text-slate-900">
                      Sin datos para el período seleccionado
                    </h2>
                    <p className="text-xs text-slate-500">
                      No se registraron clases, turnos ni asistencias para las fechas o materia seleccionadas. Modificá el rango de fechas para ver actividad.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLimpiar}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <Icon name="restart_alt" size={15} />
                    Restablecer al mes en curso
                  </button>
                </div>
              ) : datos ? (
                <>
                  {/* ── 4. CUADRÍCULA DE 6 TARJETAS DE INDICADORES (ProfessorKPIGrid) ── */}
                  <section aria-label="Tarjetas de Indicadores">
                    <ProfessorKPIGrid
                      clasesDictadas={datos.clasesDictadas}
                      alumnosAtendidos={datos.alumnosAtendidos}
                      horasDictadas={datos.horasDictadas}
                      porcentajeAsistencia={datos.porcentajeAsistencia}
                      porcentajeCancelaciones={datos.porcentajeCancelaciones}
                      porcentajeOcupacion={datos.porcentajeOcupacion}
                      totalTurnos={datos.totalTurnos}
                      turnosAusentes={datos.turnosAusentes}
                      horasDisponibles={datos.horasDisponibles}
                    />
                  </section>

                  {/* ── 5. GRÁFICOS Y TABLAS ANALÍTICAS (ProfessorChartsAndTables) ── */}
                  <section aria-label="Visualizaciones Gráficas">
                    <ProfessorChartsAndTables
                      clasesPorSemana={datos.clasesPorSemana}
                      clasesPorMateria={datos.clasesPorMateria}
                      alumnosConMasAusencias={datos.alumnosConMasAusencias}
                    />
                  </section>
                </>
              ) : null}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
