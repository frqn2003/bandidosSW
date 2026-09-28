"use client";

import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";

// Rango de fechas de la pantalla /turnos (HU-TUR-02).
//
// Dos campos de fecha (Desde / Hasta) con "al" en el medio, para insertar
// inline en la fila de filtros. Nada de barra ajustable: la selección es
// directa con los inputs.
//
// Restricciones compartidas (auditoría HU-TUR-02):
//  · desde ≤ hasta.
//  · Ancho máximo del rango = `maxDias` (60): si se excede, el campo se clava en
//    el límite y el chip lo avisa, en vez de permitir ventanas gigantes.
//  · Todo queda dentro de [min, max] (historia reciente + ventana de reserva).

interface RangoFechasProps {
  desde: string;
  hasta: string;
  min: string;
  max: string;
  maxDias: number;
  onChange: (rango: { desde: string; hasta: string }) => void;
  /** Prefijo de ids (evita ids duplicados si hay más de un RangoFechas). */
  id?: string;
}

const DIA_MS = 86_400_000;

function aDia(iso: string): number {
  return Math.round(new Date(`${iso}T00:00:00`).getTime() / DIA_MS);
}

function diaAISO(dia: number): string {
  const d = new Date(dia * DIA_MS);
  return d.toISOString().slice(0, 10);
}

function clampear(dia: number, min: number, max: number): number {
  return Math.min(Math.max(dia, min), max);
}

export function RangoFechas({ desde, hasta, min, max, maxDias, onChange, id = "range" }: RangoFechasProps) {
  const minDia = aDia(min);
  const maxDia = aDia(max);
  const desdeDia = aDia(desde);
  const hastaDia = aDia(hasta);

  /** Aplica las 3 restricciones y emite el rango. */
  const cambiar = (campo: "desde" | "hasta", dia: number) => {
    // 1. desde ≤ hasta (el extremo no se pasa del otro).
    const sinCruzar = campo === "desde" ? Math.min(dia, hastaDia) : Math.max(dia, desdeDia);
    // 2. Dentro de los límites del sistema.
    let d = clampear(sinCruzar, minDia, maxDia);
    // 3. Ventana máxima: el extremo se CLAVA en el borde del tope (el chip
    //    "Rango máximo" queda visible para que se entienda).
    if (campo === "desde" && hastaDia - d > maxDias) d = Math.max(minDia, hastaDia - maxDias);
    if (campo === "hasta" && d - desdeDia > maxDias) d = Math.min(maxDia, desdeDia + maxDias);
    onChange(
      campo === "desde"
        ? { desde: diaAISO(d), hasta: diaAISO(hastaDia) }
        : { desde: diaAISO(desdeDia), hasta: diaAISO(d) },
    );
  };

  const anchoEnDias = Math.max(0, hastaDia - desdeDia);

  return (
    <>
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-44">
          <Input
            id={`${id}-desde`}
            type="date"
            label="Desde"
            min={min}
            max={hasta}
            value={desde}
            onChange={(e) => {
              const v = e.target.value;
              if (v) cambiar("desde", aDia(v));
            }}
          />
        </div>
        <span aria-hidden="true" className="select-none pb-3 text-sm font-semibold leading-none text-on-surface-variant">
          al
        </span>
        <div className="w-44">
          <Input
            id={`${id}-hasta`}
            type="date"
            label="Hasta"
            min={desde}
            max={max}
            value={hasta}
            onChange={(e) => {
              const v = e.target.value;
              if (v) cambiar("hasta", aDia(v));
            }}
          />
        </div>
      </div>
      {anchoEnDias >= maxDias ? (
        <p className="inline-flex items-center gap-1 text-xs font-semibold text-on-surface-variant">
          <Icon name="info" size={14} />
          Rango máximo: {maxDias} días
        </p>
      ) : null}
    </>
  );
}