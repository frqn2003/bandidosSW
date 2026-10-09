"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";

// Rango de fechas de la pantalla /turnos (HU-TUR-02).
//
// Dos campos de fecha (Desde / Hasta) con "al" en el medio.
// Permite tanto la selección con el calendario nativo como la edición manual
// directa por teclado (día, mes, año), sin auto-clampeo prematuro que interrumpa
// la digitación (por ejemplo, al tipear el mes '10' no lo fuerza a '06').

interface RangoFechasProps {
  desde: string;
  hasta: string;
  min?: string;
  max?: string;
  maxDias?: number;
  onChange: (rango: { desde: string; hasta: string }) => void;
  id?: string;
}

const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function esFechaValida(s: string): boolean {
  if (!FECHA_REGEX.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function diferenciaDias(d1: string, d2: string): number {
  const t1 = new Date(`${d1}T00:00:00Z`).getTime();
  const t2 = new Date(`${d2}T00:00:00Z`).getTime();
  return Math.round((t2 - t1) / 86_400_000);
}

export function RangoFechas({
  desde,
  hasta,
  maxDias = 60,
  onChange,
  id = "range",
}: RangoFechasProps) {
  const [desdeStr, setDesdeStr] = useState(desde);
  const [prevDesde, setPrevDesde] = useState(desde);
  const [hastaStr, setHastaStr] = useState(hasta);
  const [prevHasta, setPrevHasta] = useState(hasta);

  // Patrón oficial de React para sincronizar estado derivado cuando las props cambian
  if (desde !== prevDesde) {
    setPrevDesde(desde);
    setDesdeStr(desde);
  }

  if (hasta !== prevHasta) {
    setPrevHasta(hasta);
    setHastaStr(hasta);
  }

  const emitirSiValido = (d: string, h: string) => {
    if (esFechaValida(d) && esFechaValida(h)) {
      if (d <= h) {
        onChange({ desde: d, hasta: h });
      }
    }
  };

  const alCambiarDesde = (valor: string) => {
    setDesdeStr(valor);
    emitirSiValido(valor, hastaStr);
  };

  const alCambiarHasta = (valor: string) => {
    setHastaStr(valor);
    emitirSiValido(desdeStr, valor);
  };

  const alBlurDesde = () => {
    if (!esFechaValida(desdeStr)) {
      setDesdeStr(desde);
      return;
    }
    // Si al salir el usuario dejó desde > hasta, ajustamos hasta para que coincida
    if (esFechaValida(hastaStr) && desdeStr > hastaStr) {
      setHastaStr(desdeStr);
      onChange({ desde: desdeStr, hasta: desdeStr });
    }
  };

  const alBlurHasta = () => {
    if (!esFechaValida(hastaStr)) {
      setHastaStr(hasta);
      return;
    }
    // Si al salir el usuario dejó hasta < desde, ajustamos desde para que coincida
    if (esFechaValida(desdeStr) && hastaStr < desdeStr) {
      setDesdeStr(hastaStr);
      onChange({ desde: hastaStr, hasta: hastaStr });
    }
  };

  const anchoEnDias =
    esFechaValida(desdeStr) && esFechaValida(hastaStr)
      ? Math.max(0, diferenciaDias(desdeStr, hastaStr))
      : 0;

  return (
    <>
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-44">
          <Input
            id={`${id}-desde`}
            type="date"
            label="Desde"
            value={desdeStr}
            onChange={(e) => alCambiarDesde(e.target.value)}
            onBlur={alBlurDesde}
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
            value={hastaStr}
            onChange={(e) => alCambiarHasta(e.target.value)}
            onBlur={alBlurHasta}
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