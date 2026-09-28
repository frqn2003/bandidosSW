import { StatusBadge, type StatusVariant } from "@/components/ui/StatusBadge";

const ESTADO_VARIANT: Record<"activo" | "inactivo", StatusVariant> = {
  activo: "success",
  inactivo: "neutral",
};

// Nombres de íconos Material Symbols (el estado nunca se comunica solo con color).
const ESTADO_ICON: Record<"activo" | "inactivo", string> = {
  activo: "check_circle",
  inactivo: "cancel",
};

/**
 * Badge de estado del profesor (HU-PRO-01): mapea el dominio a StatusBadge.
 * Regla del design system: el estado nunca se comunica solo con color.
 */
export function EstadoProfesorBadge({ estado }: { estado: "activo" | "inactivo" }) {
  return (
    <StatusBadge
      variant={ESTADO_VARIANT[estado]}
      label={estado === "activo" ? "Activo" : "Inactivo"}
      icon={ESTADO_ICON[estado]}
    />
  );
}