import { StatusBadge } from "@/components/ui/StatusBadge";
import type { TurnoCalendarioResponse } from "@/contracts/calendario";

// Estado de un turno tal como se pinta en las tarjetas del calendario (HU-CAL-01).
// Reusa StatusBadge: mismo punto de verdad de colores que el resto del sistema.
// Reservado = azul (info) porque es el caso que ocupa la grilla; Cancelado no se
// dibuja como tarjeta pero el badge sobrevive para el detalle y la leyenda.

interface TurnoCalendarioBadgeProps {
  estado: TurnoCalendarioResponse["estado"];
}

export function TurnoCalendarioBadge({ estado }: TurnoCalendarioBadgeProps) {
  if (estado === "Cancelado") {
    return <StatusBadge variant="neutral" label="Cancelado" />;
  }
  return <StatusBadge variant="info" label="Reservado" />;
}