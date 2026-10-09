// src/components/pagos/StudentSearch.tsx
//
// Componente de búsqueda y resumen del alumno para el módulo de Gestión de Pagos (HU-PAG-01).
// Permite buscar alumnos por DNI, Nombre, Apellido o Legajo.
// Muestra una tarjeta lateral con los datos y el total de deuda pendiente del alumno seleccionado.

"use client";

import React, { useState, useId, useRef, useEffect } from "react";
import { Icon } from "@/components/ui/Icon";
import type { StudentPaymentSummary } from "@/modules/pagos/types";

interface StudentSearchProps {
  selectedStudent: StudentPaymentSummary | null;
  onSelectStudent: (student: StudentPaymentSummary) => void;
  onClearStudent: () => void;
  searchStudents: (query: string) => StudentPaymentSummary[];
}

export function StudentSearch({
  selectedStudent,
  onSelectStudent,
  onClearStudent,
  searchStudents,
}: StudentSearchProps) {
  const searchInputId = useId();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Resultados de búsqueda
  const results = React.useMemo(() => {
    return searchStudents(query);
  }, [query, searchStudents]);

  const hasSearched = query.trim().length > 0;

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelect = (student: StudentPaymentSummary) => {
    onSelectStudent(student);
    setQuery("");
    setIsOpen(false);
  };

  const handleClear = () => {
    onClearStudent();
    setQuery("");
  };

  // Formato de moneda es-AR
  const formatMonto = (valor: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2,
    }).format(valor);

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      {/* Barra de búsqueda interactiva */}
      <div className="relative flex-1" ref={containerRef}>
        <label
          htmlFor={searchInputId}
          className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600"
        >
          Buscar Alumno
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
            <Icon name="search" size={18} />
          </div>
          <input
            id={searchInputId}
            type="text"
            role="searchbox"
            autoComplete="off"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => {
              if (query.trim().length > 0) setIsOpen(true);
            }}
            placeholder="Buscar por DNI, Nombre, Apellido o Legajo (ej. A-0120)"
            className="h-11 w-full rounded-md border border-slate-300 bg-white py-2.5 pr-10 pl-10 text-sm text-slate-900 placeholder:text-slate-400 shadow-xs transition-colors focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none [&::-ms-clear]:hidden [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-cancel-button]:appearance-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setIsOpen(false);
              }}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 cursor-pointer"
              aria-label="Limpiar búsqueda"
            >
              <Icon name="close" size={16} />
            </button>
          )}
        </div>

        {/* Dropdown flotante con resultados */}
        {isOpen && hasSearched && (
          <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg">
            {results.length > 0 ? (
              results.map((student) => {
                const tieneDeuda = student.totalDeudaPendiente > 0;
                return (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => handleSelect(student)}
                    className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors hover:bg-slate-50 focus:bg-slate-50 focus:outline-none cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700 text-xs">
                        {student.nombre[0]}
                        {student.apellido[0]}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">
                          {student.apellido}, {student.nombre}
                        </div>
                        <div className="text-xs text-slate-500">
                          Legajo: <span className="font-mono">{student.legajo}</span> · DNI: {student.dni}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      {tieneDeuda ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
                          Deuda: {formatMonto(student.totalDeudaPendiente)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                          Al día
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="flex items-center gap-2 px-4 py-3 text-sm text-slate-500">
                <Icon name="info" size={18} className="text-slate-400" />
                <span>No se encontraron resultados</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tarjeta lateral alineada con Resumen del alumno seleccionado */}
      {selectedStudent ? (
        <div className="flex h-11 items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3.5 shadow-xs lg:w-96">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 font-bold text-white text-xs">
              {selectedStudent.nombre[0]}
              {selectedStudent.apellido[0]}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 text-xs truncate max-w-[130px]">
                  {selectedStudent.apellido}, {selectedStudent.nombre}
                </span>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-700">
                  {selectedStudent.legajo}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 truncate">
                {selectedStudent.totalDeudaPendiente > 0 ? (
                  <span className="font-semibold text-amber-700">
                    Deuda: {formatMonto(selectedStudent.totalDeudaPendiente)} ({selectedStudent.clasesPendientesCount} {selectedStudent.clasesPendientesCount === 1 ? "clase" : "clases"})
                  </span>
                ) : (
                  <span className="font-semibold text-emerald-700">
                    Sin deuda pendiente
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClear}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
            title="Cambiar alumno"
            aria-label="Cambiar alumno seleccionado"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      ) : (
        <div className="hidden lg:flex h-11 items-center gap-2 rounded-md border border-dashed border-slate-300 bg-slate-100/60 px-4 text-xs text-slate-500 lg:w-96">
          <Icon name="person" size={18} className="text-slate-400 shrink-0" />
          <span className="truncate">Selecciona un alumno para consultar sus clases y pagos</span>
        </div>
      )}
    </div>
  );
}
