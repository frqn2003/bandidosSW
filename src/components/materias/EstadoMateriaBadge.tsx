import { StatusBadge, type StatusVariant } from "@/components/ui/StatusBadge";
import type { EstadoMateria } from "@/data/materias";

const ESTADO_VARIANT: Record<EstadoMateria, StatusVariant> = {
  activo: "success",
  inactivo: "neutral",
};

// Nombres de íconos Material Symbols (el estado nunca se comunica solo con color).
const ESTADO_ICON: Record<EstadoMateria, string> = {
  activo: "check_circle",
  inactivo: "cancel",
};

/**
 * Badge de estado de la materia (HU-MAT-01): mapea el dominio a StatusBadge.
 * Verde = activa, gris = inactiva (criterio opcional incluido en la HU).
 * Regla del design system: el estado nunca se comunica solo con color.
 */
export function EstadoMateriaBadge({ estado }: { estado: EstadoMateria }) {
  return (
    <StatusBadge
      variant={ESTADO_VARIANT[estado]}
      label={estado === "activo" ? "Activa" : "Inactiva"}
      icon={ESTADO_ICON[estado]}
    />
  );
}
