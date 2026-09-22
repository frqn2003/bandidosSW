"use client";

import type { ChangeEvent } from "react";

export interface RangoNumericoValor {
  min: string;
  max: string;
}

interface RangoNumericoProps {
  label: string;
  valor: RangoNumericoValor;
  onChange: (valor: RangoNumericoValor) => void;
  placeholder?: string;
  disabled?: boolean;
}

const inputClasses =
  "h-11 w-full min-w-0 cursor-text rounded-sm border border-outline-variant bg-surface-container-low px-3 text-base font-normal text-on-surface transition-colors duration-fast ease-out placeholder:text-on-surface-variant focus:border-secondary focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:cursor-not-allowed disabled:opacity-45";

export function RangoNumerico({
  label,
  valor,
  onChange,
  placeholder = "Mínimo",
  disabled = false,
}: RangoNumericoProps) {
  const handle =
    (campo: keyof RangoNumericoValor) => (e: ChangeEvent<HTMLInputElement>) =>
      onChange({ ...valor, [campo]: e.target.value });

  return (
    <fieldset className="flex flex-col gap-1.5 border-0 p-0">
      <legend className="text-sm font-bold text-on-surface">{label}</legend>
      <div className="flex items-center gap-2">
        <input
          type="text"
          inputMode="decimal"
          value={valor.min}
          onChange={handle("min")}
          placeholder={placeholder}
          aria-label={`${label} mínimo`}
          disabled={disabled}
          className={inputClasses}
        />
        <span aria-hidden="true" className="text-sm font-bold text-on-surface-variant">
          –
        </span>
        <input
          type="text"
          inputMode="decimal"
          value={valor.max}
          onChange={handle("max")}
          placeholder="Máximo"
          aria-label={`${label} máximo`}
          disabled={disabled}
          className={inputClasses}
        />
      </div>
    </fieldset>
  );
}
