import { EstadoTurnoBadge } from "@/components/turnos/EstadoTurnoBadge";
import type { TurnoCalendarioResponse } from "@/contracts/calendario";

// Estado de un turno tal como se pinta en las tarjetas del calendario (HU-CAL-01).
// Delega en EstadoTurnoBadge (HU-TUR-02): mismo punto de verdad de colores que
// el listado de /turnos. El calendario solo conoce Reservado/Cancelado (los
// turnos "Finalizado" se derivan en el listado, decisión 1 del brief).
interface TurnoCalendarioBadgeProps {
  estado: TurnoCalendarioResponse["estado"];
}

export function TurnoCalendarioBadge({ estado }: TurnoCalendarioBadgeProps) {
  return <EstadoTurnoBadge estado={estado} />;
}