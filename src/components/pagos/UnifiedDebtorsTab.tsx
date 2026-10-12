// src/components/pagos/UnifiedDebtorsTab.tsx
//
// Pestaña unificada: "Cobros y Deudores" (HU-PAG-01 + HU-PAG-02).
// Combina la lista de deudores y alumnos con pagos pendientes a ancho completo.
// Incorpora métricas globales, filtros por antigüedad/materia/profesor/búsqueda,
// acción directa "Cobrar" (abre modal de cobro) y "Estado de cuenta" (abre modal de movimientos).

"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Icon } from "@/components/ui/Icon";
import { listarMaterias } from "@/data/materias";
import { listarProfesores } from "@/data/profesores";
import { listarDeudores } from "@/data/deuda";
import type { DeudorResponse, SemaforoDeuda } from "@/contracts/deuda";
import type { MateriaResponse } from "@/contracts/materia";
import type { ProfesorResponse } from "@/contracts/profesor";
import type { StudentPaymentSummary } from "@/modules/pagos/types";

interface UnifiedDebtorsTabProps {
  students: StudentPaymentSummary[];
  onCobrar: (student: StudentPaymentSummary) => void;
  onVerEstadoCuenta: (alumno: { id: number; legajo: string; nombre: string; apellido: string; dni: string }) => void;
  onRefresh?: () => void;
}

export function UnifiedDebtorsTab({
  students,
  onCobrar,
  onVerEstadoCuenta,
  onRefresh,
}: UnifiedDebtorsTabProps) {
  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<"todos" | "deudores" | "al_dia">("deudores");
  const [antiguedad, setAntiguedad] = useState<"todas" | "0-30" | "31-60" | "mas-60">("todas");
  const [materiaId, setMateriaId] = useState<number | undefined>(undefined);
  const [profesorId, setProfesorId] = useState<number | undefined>(undefined);

  // Catálogos
  const [materias, setMaterias] = useState<MateriaResponse[]>([]);
  const [profesores, setProfesores] = useState<ProfesorResponse[]>([]);
  const [deudoresData, setDeudoresData] = useState<DeudorResponse[]>([]);
  const [cargandoDeuda, setCargandoDeuda] = useState(false);

  useEffect(() => {
    Promise.all([
      listarMaterias({ estado: "activo" }).catch(() => []),
      listarProfesores({ estado: "activo" }).catch(() => []),
    ]).then(([mats, profs]) => {
      setMaterias(mats);
      setProfesores(profs);
    });
  }, []);

  const cargarInfoDeudores = useCallback(() => {
    setCargandoDeuda(true);
    listarDeudores({
      busqueda: busqueda.trim() || undefined,
      antiguedad: antiguedad === "todas" ? undefined : antiguedad,
      materiaId,
      profesorId,
    })
      .then((res) => setDeudoresData(res.items))
      .catch((err) => console.error("Error al cargar datos de deudores:", err))
      .finally(() => setCargandoDeuda(false));
  }, [busqueda, antiguedad, materiaId, profesorId]);

  useEffect(() => {
    cargarInfoDeudores();
  }, [cargarInfoDeudores]);

  // Mapa de deudores por alumnoId para enriquecer la lista de alumnos
  const deudoresMap = useMemo(() => {
    const map = new Map<number, DeudorResponse>();
    deudoresData.forEach((d) => map.set(d.alumno.id, d));
    return map;
  }, [deudoresData]);

  // Formato moneda
  const formatMonto = (val: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2,
    }).format(val);

  // Alumnos combinados y filtrados
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      // Filtro de búsqueda de texto (DNI, Nombre, Apellido, Legajo)
      if (busqueda.trim()) {
        const query = busqueda.toLowerCase().trim();
        const coincide =
          s.nombre.toLowerCase().includes(query) ||
          s.apellido.toLowerCase().includes(query) ||
          s.dni.toLowerCase().includes(query) ||
          s.legajo.toLowerCase().includes(query);
        if (!coincide) return false;
      }

      // Filtro por Estado (con deuda vs al día)
      if (filtroEstado === "deudores" && s.totalDeudaPendiente <= 0) return false;
      if (filtroEstado === "al_dia" && s.totalDeudaPendiente > 0) return false;

      // Filtro por Antigüedad si es deudor
      if (antiguedad !== "todas" && s.totalDeudaPendiente > 0) {
        const d = deudoresMap.get(s.id);
        if (d) {
          if (antiguedad === "0-30" && (d.diasAntiguedad < 0 || d.diasAntiguedad > 30)) return false;
          if (antiguedad === "31-60" && (d.diasAntiguedad <= 30 || d.diasAntiguedad > 60)) return false;
          if (antiguedad === "mas-60" && d.diasAntiguedad <= 60) return false;
        }
      }

      return true;
    });
  }, [students, busqueda, filtroEstado, antiguedad, deudoresMap]);

  // Métricas generales
  const totalDeudaGlobal = useMemo(() => {
    return students.reduce((acc, curr) => acc + curr.totalDeudaPendiente, 0);
  }, [students]);

  const countDeudores = useMemo(() => {
    return students.filter((s) => s.totalDeudaPendiente > 0).length;
  }, [students]);

  const countAlDia = useMemo(() => {
    return students.filter((s) => s.totalDeudaPendiente === 0).length;
  }, [students]);

  const badgeSemaforo = (semaforo?: SemaforoDeuda, dias?: number) => {
    if (!semaforo || dias === undefined) return null;
    switch (semaforo) {
      case "amarillo":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            0–30 días ({dias}d)
          </span>
        );
      case "naranja":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-800 border border-orange-200">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
            31–60 días ({dias}d)
          </span>
        );
      case "rojo":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-800 border border-red-200">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
            &gt;60 días ({dias}d)
          </span>
        );
    }
  };

  const handleExportCSV = () => {
    const headers = ["Legajo", "Apellido", "Nombre", "DNI", "Clases Impagas", "Deuda Pendiente"];
    const rows = filteredStudents.map((s) => [
      s.legajo,
      `"${s.apellido}"`,
      `"${s.nombre}"`,
      s.dni,
      s.clasesPendientesCount,
      s.totalDeudaPendiente,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `listado_alumnos_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Tarjetas de Métricas de Cobranzas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        {/* Total Deuda en Mora */}
        <div className="rounded-xl border border-red-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Deuda en Mora
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-600">
              <Icon name="warning" size={18} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-red-600 tracking-tight">
            {formatMonto(totalDeudaGlobal)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Monto pendiente total de clases impagas
          </p>
        </div>

        {/* Alumnos con Deuda */}
        <div className="rounded-xl border border-amber-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Alumnos con Deuda
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <Icon name="person_alert" size={18} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 tracking-tight">
            {countDeudores}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Alumnos que deben al menos 1 clase
          </p>
        </div>

        {/* Alumnos al Día */}
        <div className="rounded-xl border border-emerald-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Alumnos al Día
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <Icon name="verified_user" size={18} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 tracking-tight">
            {countAlDia}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Alumnos sin deuda acumulada
          </p>
        </div>

        {/* Total de Alumnos */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Padrón Activo
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <Icon name="groups" size={18} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 tracking-tight">
            {students.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Total de alumnos registrados
          </p>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs print:hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 items-end">
          {/* Buscador de Alumnos */}
          <div className="lg:col-span-2">
            <label htmlFor="search-students" className="block text-xs font-semibold text-slate-700 mb-1">
              Buscar alumno
            </label>
            <div className="relative">
              <input
                id="search-students"
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Por DNI, Nombre, Apellido o Legajo..."
                className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
              <Icon
                name="search"
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>

          {/* Filtro Estado */}
          <div>
            <label htmlFor="filter-estado" className="block text-xs font-semibold text-slate-700 mb-1">
              Estado de cuenta
            </label>
            <select
              id="filter-estado"
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value as "todos" | "deudores" | "al_dia")}
              className="w-full rounded-md border border-slate-300 bg-white py-2 px-2.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="deudores">Solo con deuda ({countDeudores})</option>
              <option value="al_dia">Al día ({countAlDia})</option>
              <option value="todos">Todos los alumnos ({students.length})</option>
            </select>
          </div>

          {/* Filtro Antigüedad */}
          <div>
            <label htmlFor="filter-antiguedad" className="block text-xs font-semibold text-slate-700 mb-1">
              Antigüedad
            </label>
            <select
              id="filter-antiguedad"
              value={antiguedad}
              onChange={(e) => setAntiguedad(e.target.value as "todas" | "0-30" | "31-60" | "mas-60")}
              className="w-full rounded-md border border-slate-300 bg-white py-2 px-2.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="todas">Todas las antigüedades</option>
              <option value="0-30">0 a 30 días (Amarillo)</option>
              <option value="31-60">31 a 60 días (Naranja)</option>
              <option value="mas-60">Más de 60 días (Rojo)</option>
            </select>
          </div>

          {/* Acciones de exportación */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
              title="Descargar listado en formato CSV"
            >
              <Icon name="download" size={15} />
              Exportar
            </button>
            {onRefresh && (
              <button
                type="button"
                onClick={() => {
                  cargarInfoDeudores();
                  onRefresh();
                }}
                className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white p-2 text-slate-600 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
                title="Actualizar datos"
              >
                <Icon name="refresh" size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabla Unificada de Alumnos */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
        {/* Cabecera de la tabla */}
        <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="groups" size={18} className="text-blue-600" />
            <h2 className="font-bold text-slate-800 text-sm">
              {filtroEstado === "deudores"
                ? "Alumnos con Pagos Pendientes"
                : filtroEstado === "al_dia"
                ? "Alumnos al Día"
                : "Padrón General de Alumnos"}
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Mostrando <strong>{filteredStudents.length}</strong> de {students.length} alumnos
          </span>
        </div>

        {/* Cuerpo */}
        {filteredStudents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 text-center px-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
              <Icon name="person_off" size={24} />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              No se encontraron alumnos
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              No hay coincidencias con los filtros aplicados. Prueba limpiar la búsqueda o cambiar el estado de cuenta.
            </p>
            <button
              type="button"
              onClick={() => {
                setBusqueda("");
                setFiltroEstado("todos");
                setAntiguedad("todas");
              }}
              className="mt-4 rounded-md bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100 transition-colors"
            >
              Restablecer filtros
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-slate-600">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-3">Alumno</th>
                  <th scope="col" className="px-3 py-3 text-center">Legajo</th>
                  <th scope="col" className="px-3 py-3 text-center">Clases Impagas</th>
                  <th scope="col" className="px-3 py-3 text-center">Antigüedad</th>
                  <th scope="col" className="px-4 py-3 text-right">Deuda Pendiente</th>
                  <th scope="col" className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((student) => {
                  const deudorInfo = deudoresMap.get(student.id);
                  const tieneDeuda = student.totalDeudaPendiente > 0;

                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-blue-50/50 transition-colors group"
                    >
                      {/* Alumno */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700 text-xs group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            {student.nombre[0]}
                            {student.apellido[0]}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors truncate">
                              {student.apellido}, {student.nombre}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              DNI: {student.dni}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Legajo */}
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <span className="font-mono text-xs font-semibold text-slate-700 rounded bg-slate-100 px-2 py-0.5 border border-slate-200 inline-block">
                          {student.legajo}
                        </span>
                      </td>

                      {/* Clases Impagas */}
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        {tieneDeuda ? (
                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200">
                            <Icon name="schedule" size={13} className="text-amber-700 shrink-0" />
                            <span>
                              {student.clasesPendientesCount} {student.clasesPendientesCount === 1 ? "clase" : "clases"}
                            </span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                            <Icon name="check_circle" size={13} className="text-emerald-600" />
                            Al día
                          </span>
                        )}
                      </td>

                      {/* Antigüedad de Mora */}
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        {tieneDeudorInfoSemaforo(deudorInfo) ? (
                          badgeSemaforo(deudorInfo?.semaforo, deudorInfo?.diasAntiguedad)
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>

                      {/* Deuda Pendiente */}
                      <td className="px-4 py-3 text-right font-bold text-xs sm:text-sm whitespace-nowrap tabular-nums">
                        {tieneDeuda ? (
                          <span className="text-slate-900">
                            {formatMonto(student.totalDeudaPendiente)}
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-semibold text-xs">
                            $ 0,00
                          </span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Botón Cobrar (abre modal de cobro) */}
                          <button
                            type="button"
                            onClick={() => onCobrar(student)}
                            disabled={!tieneDeuda}
                            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold transition-all ${
                              tieneDeuda
                                ? "bg-blue-600 text-white shadow-2xs hover:bg-blue-700 cursor-pointer"
                                : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                            }`}
                            title={tieneDeuda ? "Registrar cobro de clases pendientes" : "El alumno no posee deuda"}
                          >
                            <Icon name="payments" size={14} />
                            Cobrar
                          </button>

                          {/* Botón Estado de Cuenta */}
                          <button
                            type="button"
                            onClick={() =>
                              onVerEstadoCuenta({
                                id: student.id,
                                legajo: student.legajo,
                                nombre: student.nombre,
                                apellido: student.apellido,
                                dni: student.dni,
                              })
                            }
                            className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-blue-600 transition-colors cursor-pointer"
                            title="Ver estado de cuenta histórico del alumno"
                          >
                            <Icon name="receipt_long" size={14} />
                            Estado
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function tieneDeudorInfoSemaforo(d?: DeudorResponse): boolean {
  return !!d && d.diasAntiguedad !== undefined && d.semaforo !== undefined;
}
