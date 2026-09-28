"use client";

export type OrdenFecha = "recientes" | "antiguas";

interface OrdenamientoSelectProps {
  value: OrdenFecha;
  onChange: (value: OrdenFecha) => void;
  disabled?: boolean;
}

export function OrdenamientoSelect({
  value,
  onChange,
  disabled = false,
}: OrdenamientoSelectProps) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-bold text-on-surface">
      Ordenar por fecha
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as OrdenFecha)}
        disabled={disabled}
        className="h-11 cursor-pointer rounded-sm border border-outline-variant bg-surface-container-low px-3 text-base font-normal text-on-surface focus:border-secondary focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:cursor-not-allowed disabled:opacity-45"
      >
        <option value="recientes">Más recientes primero</option>
        <option value="antiguas">Más antiguas primero</option>
      </select>
    </label>
  );
}
