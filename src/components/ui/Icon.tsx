import type { HTMLAttributes } from "react";

// Icono del design system: Material Symbols Outlined (fuente cargada en
// globals.css). El nombre es la ligadura del catálogo oficial
// (https://fonts.google.com/icons), en snake_case: "check_circle", "group".
//
// Uso:  <Icon name="group" />            → 20px (default, alineado al texto)
//       <Icon name="delete" size={16} className="text-status-danger" />
//       <Icon name="star" filled />      → variante rellena (FILL 1)
//
// Accesibilidad: por defecto es decorativo (aria-hidden). Si el icono es el
// único contenido significativo de un control, el control debe llevar
// aria-label y el icono puede quedar aria-hidden (patrón del sistema).
export interface IconProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  /** Nombre del símbolo en Material Symbols (ligadura, ej. "check_circle"). */
  name: string;
  /** Tamaño en px. Default 20 (acompaña text-sm/base del sistema). */
  size?: number;
  /** Variante rellena (FILL 1) para énfasis o estados activos. */
  filled?: boolean;
}

export function Icon({
  name,
  size = 20,
  filled = false,
  className = "",
  style,
  ...props
}: IconProps) {
  return (
    <span
      className={`material-symbols-outlined${filled ? " material-symbols-outlined--filled" : ""}${
        className ? ` ${className}` : ""
      }`}
      style={{ fontSize: size, ...style }}
      aria-hidden="true"
      {...props}
    >
      {name}
    </span>
  );
}
