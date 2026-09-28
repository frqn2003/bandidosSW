import { Icon } from "@/components/ui/Icon";

// Etiqueta de estado del sistema (pill + punto/ícono + texto).
// Único punto de verdad para los colores de estado (tokens status-*).
// Regla: siempre texto + indicador visual, nunca color solo.
//
// Contraste (regla activa 13): el texto chico NUNCA se colorea con el tono de
// estado sobre un fondo claro — se usa `text-on-surface` y el color va SOLO en
// el punto/ícono, con la variante `-strong` (más clara que el color base).
export type StatusVariant = "success" | "warning" | "danger" | "info" | "neutral" | "pink";

const variantStyles: Record<StatusVariant, { chip: string; accent: string; iconClass: string }> = {
  success: {
    chip: "bg-status-success/10 text-on-surface",
    accent: "bg-status-success-strong",
    iconClass: "text-status-success-strong",
  },
  warning: {
    chip: "bg-status-warning/10 text-on-surface",
    accent: "bg-status-warning-strong",
    iconClass: "text-status-warning-strong",
  },
  danger: {
    chip: "bg-status-danger/10 text-on-surface",
    accent: "bg-status-danger-strong",
    iconClass: "text-status-danger-strong",
  },
  info: {
    chip: "bg-status-info/10 text-on-surface",
    accent: "bg-status-info-strong",
    iconClass: "text-status-info-strong",
  },
  pink: {
    chip: "bg-status-pink/10 text-on-surface",
    accent: "bg-status-pink-strong",
    iconClass: "text-status-pink-strong",
  },
  neutral: {
    chip: "bg-surface-container-high text-on-surface",
    accent: "bg-status-neutral",
    iconClass: "text-on-surface-variant",
  },
};

interface StatusBadgeProps {
  variant: StatusVariant;
  label: string;
  /** Nombre del símbolo Material Symbols (ej. "check_circle"). Reemplaza al punto. */
  icon?: string;
}

export function StatusBadge({ variant, label, icon }: StatusBadgeProps) {
  const style = variantStyles[variant];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${style.chip}`}
    >
      {icon ? (
        <span className="flex items-center">
          <Icon name={icon} size={14} className={style.iconClass} />
        </span>
      ) : (
        <span className={`h-2 w-2 rounded-full ${style.accent}`} aria-hidden="true" />
      )}
      {label}
    </span>
  );
}
