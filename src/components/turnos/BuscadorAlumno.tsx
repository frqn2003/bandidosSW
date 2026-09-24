"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { inicialesDe, tonoAvatarDe } from "@/funciones/formato";
import type { AlumnoBusqueda } from "@/data/turnos";

// Buscador de alumno para la reserva (HU-TUR-01): DNI, nombre, apellido o
// legajo, coincidencia parcial. A diferencia de `ui/Combobox` (que filtra una
// lista fija en memoria), acá cada búsqueda va al back: el padrón completo de
// alumnos no se baja al navegador. Quién filtra "solo activos" es `buscar`.

const MIN_CARACTERES = 2;
const DEBOUNCE_MS = 250;

interface BuscadorAlumnoProps {
  id: string;
  label: string;
  requiredMark?: boolean;
  value: AlumnoBusqueda | null;
  onChange: (alumno: AlumnoBusqueda | null) => void;
  /** BACKEND: la función de la capa de datos que consulta el endpoint. */
  buscar: (busqueda: string) => Promise<AlumnoBusqueda[]>;
  error?: string;
  hint?: string;
}

type Resultado = {
  query: string;
  lista: AlumnoBusqueda[];
  error: boolean;
};

export function BuscadorAlumno({
  id,
  label,
  requiredMark = false,
  value,
  onChange,
  buscar,
  error,
  hint = "Buscá por DNI, nombre, apellido o N° de legajo.",
}: BuscadorAlumnoProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const q = query.trim();
  const buscable = q.length >= MIN_CARACTERES;
  // "Buscando" se deriva: el último resultado no corresponde al texto actual.
  const buscando = buscable && resultado?.query !== q;
  const lista = buscable && resultado?.query === q ? resultado.lista : [];

  useEffect(() => {
    if (!buscable) return;
    let cancelado = false;
    const t = setTimeout(() => {
      buscar(q)
        .then((res) => {
          if (!cancelado) setResultado({ query: q, lista: res, error: false });
        })
        .catch(() => {
          if (!cancelado) setResultado({ query: q, lista: [], error: true });
        });
    }, DEBOUNCE_MS);
    return () => {
      cancelado = true;
      clearTimeout(t);
    };
  }, [q, buscable, buscar]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const listboxId = `${id}-listbox`;

  const seleccionar = (alumno: AlumnoBusqueda) => {
    onChange(alumno);
    setQuery("");
    setOpen(false);
    setActiveIndex(-1);
  };

  const cambiar = () => {
    onChange(null);
    // El input se monta en el próximo render.
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => Math.min(lista.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && lista[activeIndex]) seleccionar(lista[activeIndex]);
      else if (lista.length === 1) seleccionar(lista[0]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  // ── Alumno elegido: tarjeta con sus datos y "Cambiar" ──
  if (value) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-bold text-on-surface" id={`${id}-label`}>
          {label}
          {requiredMark && <span className="text-error"> *</span>}
        </span>
        <div
          aria-labelledby={`${id}-label`}
          role="group"
          className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-sm border border-secondary/40 bg-secondary/5 px-3 py-2.5"
        >
          <span
            aria-hidden="true"
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${tonoAvatarDe(value.id)}`}
          >
            {inicialesDe(value.nombre, value.apellido)}
          </span>
          <div className="min-w-[10rem] flex-1">
            <p className="break-words text-sm font-bold text-on-surface">
              {value.apellido}, {value.nombre}
            </p>
            <p className="text-xs font-medium text-on-surface-variant">
              {value.legajo} · DNI {value.dni}
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={cambiar} className="min-h-11">
            <Icon name="swap_horiz" size={16} />
            Cambiar
          </Button>
        </div>
      </div>
    );
  }

  // ── Sin alumno: input de búsqueda + resultados ──
  const describedBy = error ? errorId : hintId;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-bold text-on-surface">
        {label}
        {requiredMark && <span className="text-error"> *</span>}
      </label>
      <div className="relative" ref={rootRef}>
        <Icon
          name="search"
          size={20}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
        />
        <input
          ref={inputRef}
          id={id}
          type="search"
          role="combobox"
          autoComplete="off"
          aria-expanded={open && buscable}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={open && activeIndex >= 0 ? `${id}-opt-${activeIndex}` : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          value={query}
          placeholder="Ej: 45123456, López o ALU-000001"
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(-1);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className={`h-11 min-h-11 w-full rounded-sm border bg-surface-container-low pl-10 pr-4 text-base text-on-surface transition-colors duration-fast ease-out placeholder:text-on-surface-variant focus:border-secondary focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary/20 ${error ? "border-error" : "border-outline-variant"}`}
        />
        {open && buscable && (
          <div
            id={listboxId}
            role="listbox"
            aria-label="Alumnos encontrados"
            className="absolute left-0 right-0 top-[calc(100%+4px)] z-20 overflow-hidden rounded-md border border-outline-variant bg-surface-container-lowest shadow-card"
          >
            {buscando ? (
              <p role="status" className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-on-surface-variant">
                <span className="h-2 w-2 animate-pulse rounded-full bg-secondary" aria-hidden="true" />
                Buscando alumnos…
              </p>
            ) : resultado?.error ? (
              <p role="alert" className="px-4 py-3 text-sm font-semibold text-error">
                No pudimos buscar alumnos. Probá de nuevo.
              </p>
            ) : lista.length === 0 ? (
              <p role="status" className="px-4 py-3 text-sm font-medium text-on-surface-variant">
                No hay alumnos activos que coincidan con “{q}”.
              </p>
            ) : (
              <ul className="max-h-72 overflow-y-auto py-1">
                {lista.map((a, index) => (
                  <li
                    key={a.id}
                    id={`${id}-opt-${index}`}
                    role="option"
                    aria-selected={index === activeIndex}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => seleccionar(a)}
                    className={`flex min-h-11 cursor-pointer items-center gap-3 px-4 py-2 transition-colors duration-fast ease-out hover:bg-secondary/5 ${index === activeIndex ? "bg-secondary/10" : ""}`}
                  >
                    <span
                      aria-hidden="true"
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${tonoAvatarDe(a.id)}`}
                    >
                      {inicialesDe(a.nombre, a.apellido)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-on-surface">
                        {a.apellido}, {a.nombre}
                      </span>
                      <span className="block text-xs font-medium text-on-surface-variant">
                        {a.legajo} · DNI {a.dni}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
      {error ? (
        <p id={errorId} role="alert" className="text-sm font-semibold text-error">
          {error}
        </p>
      ) : (
        <p id={hintId} className="text-xs font-medium text-on-surface-variant">
          {hint}
        </p>
      )}
    </div>
  );
}
