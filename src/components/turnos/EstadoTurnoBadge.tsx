"use client";

import { StatusBadge, type StatusVariant } from "@/components/ui/StatusBadge";
import type { EstadoTurnoVisible } from "@/funciones/estado-turno";

// Badge del estado visible de un turno (HU-TUR-02).
//
// "Finalizado" no existe en la base (la decisión 1 del brief lo deriva en el
// navegador), pero acá ya es un estado de primera clase: los tres estados
// visibles mapean a una variante de StatusBadge para que el sistema tenga UN
// solo punto de verdad de colores:
//  · Reservado  → info   (azul): es el caso de acción, se destaca.
//  · Finalizado → neutral: tranquilo, ya pasó.
//  · Cancelado  → danger (rojo): rompe el flujo esperado.
const CONFIG: Record<EstadoTurnoVisible, { variant: StatusVariant; label: string; icon: string }> = {
  Reservado: { variant: "info", label: "Reservado", icon: "event_available" },
  Finalizado: { variant: "neutral", label: "Finalizado", icon: "check_circle" },
  Cancelado: { variant: "danger", label: "Cancelado", icon: "block" },
};

interface EstadoTurnoBadgeProps {
  estado: EstadoTurnoVisible;
  /** Ver `StatusBadge.soloIcono`. Acá siempre `false` (default): en el listado de
   * /turnos la etiqueta escrita es el contenido, no un adorno. */
  soloIcono?: boolean;
}

export function EstadoTurnoBadge({ estado, soloIcono = false }: EstadoTurnoBadgeProps) {
  const cfg = CONFIG[estado];
  return <StatusBadge variant={cfg.variant} label={cfg.label} icon={cfg.icon} soloIcono={soloIcono} />;
}