"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { forwardRef } from "react";

type Variant =
  | "primary"
  | "secondary"
  | "outline"
  | "outline-danger"
  | "ghost"
  | "destructive";
type Size = "sm" | "md" | "lg" | "icon";

// Roles de color del documento de diseño (Nexo Académico):
// - "Azul Conexión" (#2F6FED) → CTAs, activos, marca (tokens primary).
// - "Azul Foco" (#1D4ED8)     → botones secundarios, foco y links.
// Por eso el CTA principal (variant="primary") usa el azul de conexión y el
// hover cae al azul profundo derivado (secondary).
const variantClasses: Record<Variant, string> = {
  primary:
    "bg-primary text-on-primary hover:bg-secondary active:scale-[0.97] disabled:hover:bg-primary",
  secondary:
    "bg-secondary text-on-secondary hover:bg-primary active:scale-[0.97] disabled:hover:bg-secondary",
  outline:
    "border border-secondary bg-transparent text-secondary hover:bg-secondary/5 active:scale-[0.97]",
  // `outline` con el color de la acción destructiva. Nació del detalle del
  // calendario: un `ghost` con texto rojo (que ya se usaba en `TurnosTable`)
  // queda invisible hasta el hover — sin borde ni fondo se lee como un texto,
  // no como un botón (heurística de reconocimiento por sobre la de consistencia
  // visual). Con el borde siempre visible el control se reconoce sin hover.
  //
  // Va como variante y NO como `className="... text-status-danger"` sobre
  // `outline`: pisar el `text-secondary`/`border-secondary` del variant depende
  // del ORDEN en que Tailwind emite las utilidades, y ese orden no es un
  // contrato del design system. Acá el set de clases vive en un solo lugar.
  "outline-danger":
    "border border-status-danger bg-transparent text-status-danger hover:bg-status-danger/10 active:scale-[0.97]",
  ghost: "bg-transparent text-secondary hover:bg-secondary/10 active:scale-[0.97]",
  destructive:
    "bg-error text-on-error hover:bg-status-danger-strong active:scale-[0.97] disabled:hover:bg-error",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-9 min-h-9 px-3.5 text-sm gap-1.5",
  md: "h-11 min-h-11 px-5 text-sm gap-2",
  lg: "h-12 min-h-12 px-6 text-base gap-2",
  icon: "h-11 w-11",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = "primary", size = "md", className = "", children, ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        className={`inline-flex cursor-pointer items-center justify-center rounded-sm font-bold transition-all duration-fast ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-45 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  },
);