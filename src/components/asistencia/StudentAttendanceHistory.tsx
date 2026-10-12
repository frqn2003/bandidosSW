// src/components/asistencia/StudentAttendanceHistory.tsx
//
// Tabla en modo LECTURA de Historial de Asistencia del Alumno (HU-ASI-01).
// Se inserta dentro de la ficha del alumno (pestaña Asistencias) o en modal de consulta.
// Incluye:
//  - Indicadores KPI (% de asistencia con 1 decimal, asistencias, ausencias, canceladas).
//  - Filtros combinables: Rango de fechas, Materia, Profesor, Estado.
//  - Control de acceso por rol: Profesor solo alumnos que atiende; Gerente/Mesa de Entrada cualquiera.

"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { RangoFechas } from "@/components/ui/RangoFechas";
import { Pagination } from "@/components/ui/Pagination";
import { useSesion } from "@/funciones/sesion";
import { obtenerHistorialAlumno } from "@/data/asistencia";
import type {
  HistorialAsistenciaResponse,
  EstadoHistorial,
} from "@/contracts/asistencia";
import { formatearFechaCorta } from "@/funciones/asistencia-reglas";
import { ApiError } from "@/lib/api-client";

interface StudentAttendanceHistoryProps {
  alumnoId: number;
  alumnoNombre?: string;
}

const PAGE_SIZE_OPTIONS = [5, 10, 20];

export function StudentAttendanceHistory({
  alumnoId,
  alumnoNombre,
}: StudentAttendanceHistoryProps) {
  const { sesion } = useSesion();

  const [cargando, setCargando] = useState(true);
  const [errorAcceso, setErrorAcceso] = useState<string | null>(null);
  const [data, setData] = useState<HistorialAsistenciaResponse | null>(null);

  // Filtros combinables
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [materiaId, setMateriaId] = useState<string>("todas");
  const [profesorId, setProfesorId] = useState<string>("todos");
  const [estado, setEstado] = useState<string>("todos");

  // Paginación
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);

  useEffect(() => {
    let cancelado = false;
    const sesionCtx = {
      usuarioId: sesion?.usuario.id,
      rol: sesion?.usuario.rol.nombre,
      profesorId: sesion?.usuario.id,
    };

    obtenerHistorialAlumno(
      alumnoId,
      {
        desde: desde || undefined,
        hasta: hasta || undefined,
        materiaId: materiaId !== "todas" ? Number(materiaId) : undefined,
        profesorId: profesorId !== "todos" ? Number(profesorId) : undefined,
        estado: estado !== "todos" ? (estado as EstadoHistorial) : undefined,
      },
      sesionCtx,
    )
      .then((res) => {
        if (cancelado) return;
        setData(res);
        setErrorAcceso(null);
        setCargando(false);
        setPage(1);
      })
      .catch((err) => {
        if (cancelado) return;
        if (err instanceof ApiError && err.codigo === "SIN_PERMISO") {
          setErrorAcceso(
            "Acceso restringido: como Profesor solo podés consultar el historial de alumnos que asisten a tus clases.",
          );
        } else {
          setErrorAcceso("Error al cargar el historial de asistencia.");
        }
        setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [alumnoId, desde, hasta, materiaId, profesorId, estado, sesion]);

  // Catálogos únicos derivados de los ítems existentes para los combos
  const { materiasDisponibles, profesoresDisponibles } = useMemo(() => {
    const matMap = new Map<number, string>();
    const profMap = new Map<number, string>();

    data?.items.forEach((item) => {
      matMap.set(item.materia.id, item.materia.nombre);
      profMap.set(item.profesor.id, `${item.profesor.apellido}, ${item.profesor.nombre}`);
    });

    return {
      materiasDisponibles: Array.from(matMap.entries()).map(([id, nombre]) => ({ id, nombre })),
      profesoresDisponibles: Array.from(profMap.entries()).map(([id, nombre]) => ({ id, nombre })),
    };
  }, [data]);

  const handleLimpiarFiltros = () => {
    setDesde("");
    setHasta("");
    setMateriaId("todas");
    setProfesorId("todos");
    setEstado("todos");
  };

  const hayFiltrosActivos =
    !!desde || !!hasta || materiaId !== "todas" || profesorId !== "todos" || estado !== "todos";

  // Paginación de la tabla
  const items = data?.items ?? [];
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const pageStart = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const pageEnd = Math.min(page * pageSize, totalItems);
  const itemsPaginados = items.slice((page - 1) * pageSize, page * pageSize);

  // Criterio opcional: Alerta visual (ícono rojo) con 3 ausencias consecutivas recientes
  const noCanceladas = items.filter((i) => i.estado !== "Cancelado");
  const tieneTresAusenciasConsecutivas =
    noCanceladas.length >= 3 &&
    noCanceladas[0].estado === "Ausente" &&
    noCanceladas[1].estado === "Ausente" &&
    noCanceladas[2].estado === "Ausente";

  // Criterio opcional: Exportación del historial a CSV
  const exportarCsv = () => {
    if (!data?.items || data.items.length === 0) return;
    const encabezados = "Fecha;Hora;Materia;Profesor;Estado;Tema Trabajado\r\n";
    const filas = data.items
      .map(
        (i) =>
          `${i.fecha};${i.horaInicio};"${i.materia.nombre}";"${i.profesor.apellido}, ${i.profesor.nombre}";${i.estado};"${i.temaTrabajado || ""}"`,
      )
      .join("\r\n");
    const blob = new Blob(["\uFEFF" + encabezados + filas], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `historial-asistencia-alumno-${alumnoId}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Si hay error de acceso (Profesor intentando ver alumno ajeno)
  if (errorAcceso) {
    return (
      <div className="rounded-md border border-error/30 bg-error/10 p-6 text-center text-on-surface">
        <Icon name="lock" size={36} className="mx-auto text-error mb-2" />
        <h4 className="font-display font-bold text-base text-on-surface">
          Acceso no autorizado
        </h4>
        <p className="mt-1 text-xs text-on-surface-variant max-w-md mx-auto">
          {errorAcceso}
        </p>
      </div>
    );
  }

  const resumen = data?.resumen;
  const porcentaje = resumen?.porcentajeAsistencia;

  return (
    <div className="space-y-5">
      {alumnoNombre && (
        <div className="flex items-center justify-between pb-2 border-b border-outline-variant/60">
          <span className="text-xs font-bold text-on-surface">
            Historial de asistencia: <strong>{alumnoNombre}</strong>
          </span>
          <span className="text-[11px] font-semibold text-on-surface-variant bg-surface-container-high px-2 py-0.5 rounded-sm">
            Modo LECTURA
          </span>
        </div>
      )}

      {/* Criterio opcional: Alerta visual de 3 ausencias consecutivas */}
      {tieneTresAusenciasConsecutivas && (
        <div className="flex items-start gap-2.5 rounded-sm border border-error/40 bg-error/10 p-3 text-xs text-on-surface">
          <Icon name="warning" size={20} className="text-error shrink-0 mt-0.5" />
          <div>
            <strong className="text-error font-bold">
              Alerta de Ausentismo (3 ausencias consecutivas):
            </strong>{" "}
            El alumno acumula 3 o más ausencias consecutivas en sus clases recientes. Se recomienda contactar al responsable pedagógico.
          </div>
        </div>
      )}

      {/* KPI Cards: Resumen de Asistencia */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* KPI Destacado: % de asistencia */}
        <div className="rounded-md border border-outline-variant bg-surface-container-lowest p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              % Asistencia
            </span>
            <Icon
              name="analytics"
              size={20}
              className={
                porcentaje == null
                  ? "text-on-surface-variant"
                  : porcentaje >= 80
                    ? "text-status-success-strong"
                    : porcentaje >= 60
                      ? "text-status-warning-strong"
                      : "text-status-danger-strong"
              }
            />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-2xl sm:text-3xl font-extrabold text-on-surface">
              {porcentaje != null ? `${porcentaje}%` : "—"}
            </span>
            <span className="text-[11px] text-on-surface-variant">
              {porcentaje != null
                ? porcentaje >= 80
                  ? "Óptimo"
                  : porcentaje >= 60
                    ? "Regular"
                    : "Crítico"
                : "Sin registros"}
            </span>
          </div>
          <span className="mt-1 text-[10px] text-on-surface-variant/80">
            Fórmula: Asistió / (Asistió + Ausente)
          </span>
        </div>

        {/* KPI Clases Asistió */}
        <div className="rounded-md border border-outline-variant bg-surface-container-lowest p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Presentes
            </span>
            <Icon name="check_circle" size={20} className="text-status-success-strong" />
          </div>
          <div className="mt-2">
            <span className="font-display text-2xl font-bold text-status-success-strong">
              {resumen?.clasesAsistio ?? 0}
            </span>
            <span className="block text-[11px] text-on-surface-variant">
              clases asistidas
            </span>
          </div>
        </div>

        {/* KPI Clases Ausente */}
        <div className="rounded-md border border-outline-variant bg-surface-container-lowest p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Ausencias
            </span>
            <Icon name="cancel" size={20} className="text-status-warning-strong" />
          </div>
          <div className="mt-2">
            <span className="font-display text-2xl font-bold text-status-warning-strong">
              {resumen?.clasesAusente ?? 0}
            </span>
            <span className="block text-[11px] text-on-surface-variant">
              inasistencias
            </span>
          </div>
        </div>

        {/* KPI Clases Canceladas */}
        <div className="rounded-md border border-outline-variant bg-surface-container-lowest p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Canceladas
            </span>
            <Icon name="block" size={20} className="text-on-surface-variant" />
          </div>
          <div className="mt-2">
            <span className="font-display text-2xl font-bold text-on-surface-variant">
              {resumen?.clasesCanceladas ?? 0}
            </span>
            <span className="block text-[11px] text-on-surface-variant">
              turnos cancelados
            </span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros Combinables */}
      <div className="rounded-md border border-outline-variant bg-surface-container-low p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
            <Icon name="filter_list" size={18} className="text-secondary" />
            Filtros combinables
          </span>
          <div className="flex items-center gap-2">
            {hayFiltrosActivos && (
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={handleLimpiarFiltros}
                className="text-secondary h-8 px-2 text-xs"
              >
                <Icon name="filter_alt_off" size={16} />
                Limpiar filtros
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={exportarCsv}
              disabled={items.length === 0}
              className="h-8 px-2.5 text-xs gap-1.5"
              title="Descargar historial en formato CSV"
            >
              <Icon name="download" size={16} />
              Exportar CSV
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap lg:flex-nowrap items-end gap-2.5">
          {/* Rango de Fechas */}
          <div className="shrink-0">
            <RangoFechas
              id={`rango-${alumnoId}`}
              desde={desde}
              hasta={hasta}
              compact
              onChange={({ desde: d, hasta: h }) => {
                setDesde(d);
                setHasta(h);
              }}
            />
          </div>

          {/* Filtro Materia */}
          <Select
            label="Materia"
            id={`materia-${alumnoId}`}
            value={materiaId}
            compact
            wrapperClassName="min-w-[130px] flex-1"
            onChange={(e) => setMateriaId(e.target.value)}
          >
            <option value="todas">Todas las materias</option>
            {materiasDisponibles.map((m) => (
              <option key={m.id} value={String(m.id)}>
                {m.nombre}
              </option>
            ))}
          </Select>

          {/* Filtro Profesor */}
          <Select
            label="Profesor"
            id={`profesor-${alumnoId}`}
            value={profesorId}
            compact
            wrapperClassName="min-w-[130px] flex-1"
            onChange={(e) => setProfesorId(e.target.value)}
          >
            <option value="todos">Todos los profesores</option>
            {profesoresDisponibles.map((p) => (
              <option key={p.id} value={String(p.id)}>
                {p.nombre}
              </option>
            ))}
          </Select>

          {/* Filtro Estado */}
          <Select
            label="Estado"
            id={`estado-${alumnoId}`}
            value={estado}
            compact
            wrapperClassName="min-w-[115px] flex-1 sm:max-w-[150px]"
            onChange={(e) => setEstado(e.target.value)}
          >
            <option value="todos">Todos los estados</option>
            <option value="Asistió">Asistió</option>
            <option value="Ausente">Ausente</option>
            <option value="Cancelado">Cancelado</option>
          </Select>
        </div>
      </div>

      {/* Tabla en Modo Lectura */}
      <div className="overflow-x-auto rounded-md border border-outline-variant bg-surface-container-lowest">
        <table className="w-full min-w-[760px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-outline-variant bg-surface-container-low font-bold tracking-wider text-on-surface-variant uppercase text-[11px]">
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Hora</th>
              <th className="px-4 py-3">Materia</th>
              <th className="px-4 py-3">Profesor</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Tema trabajado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/60 text-on-surface">
            {cargando ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-on-surface-variant">
                  <span className="inline-flex items-center gap-2">
                    <Icon name="progress_activity" size={18} className="animate-spin text-secondary" />
                    Cargando historial de asistencia...
                  </span>
                </td>
              </tr>
            ) : itemsPaginados.length > 0 ? (
              itemsPaginados.map((item) => (
                <tr key={item.turnoId} className="hover:bg-surface-container-low/50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap font-medium">
                    {formatearFechaCorta(item.fecha)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap tabular-nums text-on-surface-variant">
                    {item.horaInicio}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap font-bold text-on-surface">
                    {item.materia.nombre}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-on-surface-variant">
                    {item.profesor.apellido}, {item.profesor.nombre}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <StatusBadge
                      variant={
                        item.estado === "Asistió"
                          ? "success"
                          : item.estado === "Ausente"
                            ? "warning"
                            : "danger"
                      }
                      label={item.estado}
                      icon={
                        item.estado === "Asistió"
                          ? "check_circle"
                          : item.estado === "Ausente"
                            ? "cancel"
                            : "block"
                      }
                    />
                  </td>
                  <td className="px-4 py-3 text-on-surface max-w-xs truncate" title={item.temaTrabajado || ""}>
                    {item.temaTrabajado || <span className="text-on-surface-variant/50">—</span>}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-on-surface-variant">
                  {hayFiltrosActivos
                    ? "No se encontraron clases con los filtros aplicados."
                    : "No hay registros de asistencia en el historial de este alumno."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {!cargando && totalItems > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          totalItems={totalItems}
          pageStart={pageStart}
          pageEnd={pageEnd}
          pageSize={pageSize}
          pageSizes={PAGE_SIZE_OPTIONS}
          onPageChange={setPage}
          onPageSizeChange={(sz) => {
            setPageSize(sz);
            setPage(1);
          }}
        />
      )}
    </div>
  );
}
