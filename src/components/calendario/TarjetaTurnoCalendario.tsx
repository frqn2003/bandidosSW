"use client";

import { Icon } from "@/components/ui/Icon";
import { TurnoCalendarioBadge } from "./TurnoCalendarioBadge";
import type { TurnoCalendarioResponse } from "@/contracts/calendario";
import { tonoEstadoCancelado, tonoMateriaDe, type MapaTonos } from "@/funciones/paleta-materia";

// Tarjeta de un turno dentro de la grilla de /calendario (HU-CAL-02).
//
// Se extrajo del JSX inline que estaba en `CalendarioTurnos.tsx` porque ahora la
// usan DOS vistas (Semana y Día) y, con el desborde, se pinta dentro de un loop.
//
// Orden del contenido (wireframe del brief, §"Vista Semana"):
//   1. Materia (negrita)   2. Apellido del alumno
//   3. Apellido del profesor — SOLO si hay más de un profesor visible
// El badge de estado aparece únicamente si es "Cancelado": "Reservado" es el
// estado por defecto y pintarlo en todas las tarjetas agrega ruido; además el
// color de la materia ya distingue un turno de otro.

interface TarjetaTurnoCalendarioProps {
  turno: TurnoCalendarioResponse;
  /** `false` cuando hay un solo profesor visible: sobra el apellido. */
  mostrarProfesor: boolean;
  /**
   * Tono por `materiaId`. Va por prop y no se calcula acá a propósito: el módulo
   * reparte por posición en el catálogo (no por `id % 8`, que hace que dos
   * materias distintas pinten igual) y para eso necesita la lista completa.
   */
  mapaTonos: MapaTonos;
  /** Recibe la tarjeta que se pulsó, para devolverle el foco al cerrar el panel. */
  onSelect: (turno: TurnoCalendarioResponse, origen: HTMLButtonElement) => void;
  /** Motivo por el que el turno no está en la lista (filtro de cupo). */
  ocultoPor?: string;
}

export function TarjetaTurnoCalendario({
  turno,
  mostrarProfesor,
  mapaTonos,
  onSelect,
  ocultoPor,
}: TarjetaTurnoCalendarioProps) {
  const cancelado = turno.estado === "Cancelado";
  const tono = tonoMateriaDe(turno.materia.id, mapaTonos);
  const color = cancelado ? tonoEstadoCancelado() : { borde: tono.borde, fondo: tono.fondo };

  // El botón declara `aria-label`, así que el texto de los hijos NO se usa para
  // nombrarlo (regla de a11y: el nombre accesible gana sobre el contenido). Por
  // eso el estado va armado acá: el chip de "Cancelado" va solo con ícono y,
  // si no se repitiera el estado en este label, dejaría de anunciarse.
  const etiqueta = [
    turno.codigo,
    `${turno.alumno.apellido}, ${turno.alumno.nombre}`,
    turno.materia.nombre,
    `${turno.horaInicio} a ${turno.horaFin}`,
    ...(cancelado ? [turno.estado] : []),
    ...(ocultoPor ? [ocultoPor] : []),
  ].join(" · ");

  return (
    <button
      type="button"
      onClick={(e) => onSelect(turno, e.currentTarget)}
      // El color de la materia viaja al estilo inline SOLO para la impresión
      // (`printColorAdjust`); en pantalla va por clases.
      style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
      aria-label={etiqueta}
      className={`flex h-full min-h-11 w-full cursor-pointer flex-col items-start justify-center gap-0.5 rounded-sm border border-outline-variant border-l-4 px-2 py-1 text-left transition-colors duration-fast ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-1 ${color.borde} ${color.fondo} hover:brightness-95`}
    >
      <div className="flex w-full items-start justify-between gap-1">
        <span className="truncate text-xs font-bold leading-tight text-on-surface">
          {turno.materia.nombre}
        </span>
        <div className="flex flex-col items-end shrink-0 text-right leading-none">
          <span className="text-[10px] font-bold text-slate-700">
            {turno.horaInicio}
          </span>
          {cancelado && (
            <span className="text-[9px] font-bold text-red-700 uppercase mt-0.5">
              Cancelado
            </span>
          )}
        </div>
      </div>
      <span className="w-full truncate text-[11px] font-medium leading-tight text-on-surface-variant">
        {turno.alumno.apellido}, {turno.alumno.nombre}
      </span>
      {mostrarProfesor && (
        <span className="w-full truncate text-[11px] font-medium leading-tight text-on-surface-variant">
          <Icon name="school" size={12} className="mr-1 inline align-[-2px]" />
          {turno.profesor.apellido}
        </span>
      )}
    </button>
  );
}
