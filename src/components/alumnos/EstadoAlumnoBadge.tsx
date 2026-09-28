import { StatusBadge, type StatusVariant } from "@/components/ui/StatusBadge";
import type { EstadoAlumno } from "@/data/alumnos";

const ESTADO_VARIANT: Record<EstadoAlumno, StatusVariant> = {
  activo: "success",
  inactivo: "neutral",
};

// Nombres de íconos Material Symbols (el estado nunca se comunica solo con color).
const ESTADO_ICON: Record<EstadoAlumno, string> = {
  activo: "check_circle",
  inactivo: "cancel",
};

/**
 * Badge de estado del alumno (HU-ALU-01): verde = activo, gris = inactivo.
 * Mapea el dominio a `StatusBadge`, que es el único punto de verdad de los
 * colores de estado.
 */
export function EstadoAlumnoBadge({ estado }: { estado: EstadoAlumno }) {
  return (
    <StatusBadge
      variant={ESTADO_VARIANT[estado]}
      label={estado === "activo" ? "Activo" : "Inactivo"}
      icon={ESTADO_ICON[estado]}
    />
  );
}
