import { EstadoTurnoBadge } from "@/components/turnos/EstadoTurnoBadge";
import type { TurnoCalendarioResponse } from "@/contracts/calendario";

// Estado de un turno tal como se pinta en las tarjetas del calendario (HU-CAL-01).
// Delega en EstadoTurnoBadge (HU-TUR-02): mismo punto de verdad de colores que
// el listado de /turnos. El calendario solo conoce Reservado/Cancelado (los
// turnos "Finalizado" se derivan en el listado, decisión 1 del brief).
interface TurnoCalendarioBadgeProps {
  estado: TurnoCalendarioResponse["estado"];
  /**
   * Solo el ícono, sin la etiqueta escrita. Lo usa la tarjeta de la grilla: el
   * chip cabe con "Cancelado" en el detalle lateral pero no en una tarjeta
   * angosta, donde la palabra le come el nombre de la materia. El detalle
   * (`TurnoDetallePanel`) lo sigue mostrando con texto: el estado se lee, no se
   * adivina.
   */
  soloIcono?: boolean;
}

export function TurnoCalendarioBadge({ estado, soloIcono = false }: TurnoCalendarioBadgeProps) {
  return <EstadoTurnoBadge estado={estado} soloIcono={soloIcono} />;
}