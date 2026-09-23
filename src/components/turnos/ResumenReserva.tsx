import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";

// Lista de datos de una reserva (HU-TUR-01). La usan el panel lateral del
// formulario, el modal de confirmación y el comprobante: los tres muestran lo
// mismo con el mismo orden, así el operador reconoce los datos en cada paso.

export interface DatoReserva {
  label: string;
  /** null = todavía sin completar (se muestra "—"). */
  valor: ReactNode | null;
  icon: string;
  /** Ocupa las dos columnas en la variante `grid`. */
  ancho?: boolean;
}

interface ResumenReservaProps {
  datos: DatoReserva[];
  /** `lista`: una columna (panel lateral y modal) · `grid`: dos columnas (comprobante). */
  variante?: "lista" | "grid";
}

export function ResumenReserva({ datos, variante = "lista" }: ResumenReservaProps) {
  return (
    <dl className={variante === "grid" ? "grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2" : "flex flex-col gap-3"}>
      {datos.map((d) => (
        <div
          key={d.label}
          className={`flex items-start gap-3 ${variante === "grid" && d.ancho ? "sm:col-span-2" : ""}`}
        >
          <Icon name={d.icon} size={18} className="mt-0.5 shrink-0 text-tertiary" />
          <div className="min-w-0">
            <dt className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">{d.label}</dt>
            <dd
              className={`break-words text-sm font-semibold ${d.valor === null ? "text-on-surface-variant" : "text-on-surface"}`}
            >
              {d.valor ?? "—"}
            </dd>
          </div>
        </div>
      ))}
    </dl>
  );
}
