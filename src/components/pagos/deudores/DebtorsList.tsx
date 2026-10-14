// src/components/pagos/deudores/DebtorsList.tsx
//
// Pestaña: Listado de Alumnos Deudores (Diagrama 1 - HU-PAG-02).
// Filtros combinables: Antigüedad (0-30, 31-60, >60), Materia, Profesor, Buscador.
// Semáforo de antigüedad: amarillo (0-30), naranja (31-60), rojo (>60).
// Totalizador general de deuda al pie de la tabla.
// Al hacer clic en una fila, abre AccountStatementModal.

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Icon } from "@/components/ui/Icon";
import { formatearFecha } from "@/funciones/formato";
import { listarDeudores } from "@/data/deuda";
import { listarMaterias } from "@/data/materias";
import { listarProfesores } from "@/data/profesores";
import type { DeudorResponse, DeudoresResponse, SemaforoDeuda } from "@/contracts/deuda";
import type { MateriaResponse } from "@/contracts/materia";
import type { ProfesorResponse } from "@/contracts/profesor";
import { AccountStatementModal } from "./AccountStatementModal";

export function DebtorsList() {
  // Datos
  const [data, setData] = useState<DeudoresResponse>({ items: [], totalGeneral: 0 });
  const [materias, setMaterias] = useState<MateriaResponse[]>([]);
  const [profesores, setProfesores] = useState<ProfesorResponse[]>([]);
  const [cargando, setCargando] = useState(true);

  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [antiguedad, setAntiguedad] = useState<"todas" | "0-30" | "31-60" | "mas-60">("todas");
  const [materiaId, setMateriaId] = useState<number | undefined>(undefined);
  const [profesorId, setProfesorId] = useState<number | undefined>(undefined);

  // Alumno seleccionado para el modal de Estado de Cuenta
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState<DeudorResponse | null>(null);

  // Carga de catálogos
  useEffect(() => {
    Promise.all([
      listarMaterias({ estado: "activo" }).catch(() => []),
      listarProfesores({ estado: "activo" }).catch(() => []),
    ]).then(([mats, profs]) => {
      setMaterias(mats);
      setProfesores(profs);
    });
  }, []);

  // Cargar deudores con los filtros aplicados
  const cargarDeudores = useCallback(() => {
    setCargando(true);
    listarDeudores({
      busqueda: busqueda.trim() || undefined,
      antiguedad: antiguedad === "todas" ? undefined : antiguedad,
      materiaId,
      profesorId,
    })
      .then((res) => setData(res))
      .catch((err) => {
        console.error("Error al cargar deudores:", err);
      })
      .finally(() => setCargando(false));
  }, [busqueda, antiguedad, materiaId, profesorId]);

  useEffect(() => {
    cargarDeudores();
  }, [cargarDeudores]);

  const formatoMoneda = (val: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2,
    }).format(val);

  const badgeSemaforo = (semaforo: SemaforoDeuda, dias: number) => {
    switch (semaforo) {
      case "amarillo":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            0–30 días ({dias}d)
          </span>
        );
      case "naranja":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-800 border border-orange-200">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
            31–60 días ({dias}d)
          </span>
        );
      case "rojo":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-800 border border-red-200">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
            &gt;60 días ({dias}d)
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Barra de Filtros */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Buscador */}
          <div>
            <label htmlFor="search-input" className="block text-xs font-semibold text-slate-700 mb-1">
              Buscador
            </label>
            <div className="relative">
              <input
                id="search-input"
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Nombre, Apellido, DNI o Legajo..."
                className="w-full rounded-md border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
              <Icon
                name="search"
                size={16}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>

          {/* Filtro Antigüedad */}
          <div>
            <label htmlFor="filter-antiguedad" className="block text-xs font-semibold text-slate-700 mb-1">
              Antigüedad de Deuda
            </label>
            <select
              id="filter-antiguedad"
              value={antiguedad}
              onChange={(e) =>
                setAntiguedad(e.target.value as "todas" | "0-30" | "31-60" | "mas-60")
              }
              className="w-full rounded-md border border-slate-300 bg-white py-1.5 px-2.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="todas">Todas las antigüedades</option>
              <option value="0-30">0 a 30 días (Amarillo)</option>
              <option value="31-60">31 a 60 días (Naranja)</option>
              <option value="mas-60">Más de 60 días (Rojo)</option>
            </select>
          </div>

          {/* Filtro Materia */}
          <div>
            <label htmlFor="filter-materia" className="block text-xs font-semibold text-slate-700 mb-1">
              Materia
            </label>
            <select
              id="filter-materia"
              value={materiaId ?? ""}
              onChange={(e) =>
                setMateriaId(e.target.value ? Number(e.target.value) : undefined)
              }
              className="w-full rounded-md border border-slate-300 bg-white py-1.5 px-2.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="">Todas las materias</option>
              {materias.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre} ({m.nivel})
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Profesor */}
          <div>
            <label htmlFor="filter-profesor" className="block text-xs font-semibold text-slate-700 mb-1">
              Profesor
            </label>
            <select
              id="filter-profesor"
              value={profesorId ?? ""}
              onChange={(e) =>
                setProfesorId(e.target.value ? Number(e.target.value) : undefined)
              }
              className="w-full rounded-md border border-slate-300 bg-white py-1.5 px-2.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="">Todos los profesores</option>
              {profesores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.usuario.apellido}, {p.usuario.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Acciones de filtro */}
        <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 text-xs">
          <span className="text-slate-500">
            Mostrando <strong>{data.items.length}</strong> {data.items.length === 1 ? "alumno deudor" : "alumnos deudores"}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setBusqueda("");
                setAntiguedad("todas");
                setMateriaId(undefined);
                setProfesorId(undefined);
              }}
              className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Limpiar filtros
            </button>
            <button
              type="button"
              onClick={cargarDeudores}
              className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1 font-semibold text-white shadow-2xs hover:bg-blue-700 transition-colors cursor-pointer"
            >
              <Icon name="refresh" size={14} />
              Actualizar
            </button>
          </div>
        </div>
      </div>

      {/* Tabla de Deudores */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
        {cargando ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mb-3" />
            <p className="text-sm font-medium">Consultando alumnos deudores...</p>
          </div>
        ) : data.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 text-center px-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
              <Icon name="person_off" size={24} />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              Sin deudores para los filtros seleccionados
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              No se encontraron alumnos con deuda pendiente activa según los criterios de búsqueda aplicados.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-3">Alumno</th>
                  <th scope="col" className="px-3 py-3 text-center">Clases Impagas</th>
                  <th scope="col" className="px-3 py-3">Clase más antigua</th>
                  <th scope="col" className="px-3 py-3">Antigüedad</th>
                  <th scope="col" className="px-3 py-3 text-right">Monto Adeudado</th>
                  <th scope="col" className="px-4 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((deudor) => (
                  <tr
                    key={deudor.alumno.id}
                    className="hover:bg-blue-50/40 transition-colors group cursor-pointer"
                    onClick={() => setAlumnoSeleccionado(deudor)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                        {deudor.alumno.apellido}, {deudor.alumno.nombre}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {deudor.alumno.legajo} · DNI {deudor.alumno.dni}
                      </div>
                    </td>

                    <td className="px-3 py-3 text-center">
                      <span className="inline-flex items-center justify-center rounded-full bg-slate-100 px-2 py-0.5 font-bold font-mono text-slate-800">
                        {deudor.clasesAdeudadas}
                      </span>
                    </td>

                    <td className="px-3 py-3 font-medium text-slate-700">
                      {formatearFecha(deudor.fechaClaseMasAntigua)}
                    </td>

                    <td className="px-3 py-3">
                      {badgeSemaforo(deudor.semaforo, deudor.diasAntiguedad)}
                    </td>

                    <td className="px-3 py-3 text-right font-mono text-sm font-bold text-slate-900">
                      {formatoMoneda(deudor.montoAdeudado)}
                    </td>

                    <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setAlumnoSeleccionado(deudor)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:border-blue-600 hover:text-blue-600 hover:bg-blue-50/50 transition-colors cursor-pointer"
                        title="Ver Estado de Cuenta"
                      >
                        <Icon name="visibility" size={14} className="text-blue-600" />
                        Ver estado
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>

              {/* Totalizador General de Deuda al pie de la tabla */}
              <tfoot className="border-t-2 border-slate-300 bg-slate-100/80 font-semibold text-slate-900">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-xs uppercase tracking-wider font-bold">
                    Total General de Deuda Filtrada
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-base font-extrabold text-red-700">
                    {formatoMoneda(data.totalGeneral)}
                  </td>
                  <td className="px-4 py-3" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Estado de Cuenta */}
      {alumnoSeleccionado && (
        <AccountStatementModal
          alumnoId={alumnoSeleccionado.alumno.id}
          alumnoNombre={`${alumnoSeleccionado.alumno.apellido}, ${alumnoSeleccionado.alumno.nombre}`}
          onClose={() => setAlumnoSeleccionado(null)}
        />
      )}
    </div>
  );
}
