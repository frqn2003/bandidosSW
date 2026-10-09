"use client";

import { Icon } from "@/components/ui/Icon";
import {
  ANTICIPACION_MINIMA_HORAS,
  type FranjaTurnoResponse,
  type MotivoFranja,
} from "@/data/turnos";

// Franjas horarias de la reserva (HU-TUR-01). Radios nativos con apariencia de
// tarjeta: el teclado (flechas) y el "no seleccionable" de las deshabilitadas
// los da el navegador. Una franja deshabilitada lo dice con TEXTO además del
// gris (sin cupo / anticipación / superposición del alumno): nunca color solo.

const MOTIVO_TEXTO: Record<MotivoFranja, string> = {
  SIN_CUPO: "Sin cupo",
  ANTICIPACION_INSUFICIENTE: `Menos de ${ANTICIPACION_MINIMA_HORAS} h de anticipación`,
  ALUMNO_CON_TURNO_SUPERPUESTO: "El alumno ya tiene un turno",
};

interface FranjasHorariasProps {
  name: string;
  legend: string;
  requiredMark?: boolean;
  franjas: FranjaTurnoResponse[];
  /** horaInicio de la franja elegida. */
  value: string | null;
  onChange: (horaInicio: string) => void;
  error?: string;
  hint?: string;
}

export function FranjasHorarias({
  name,
  legend,
  requiredMark = false,
  franjas,
  value,
  onChange,
  error,
  hint,
}: FranjasHorariasProps) {
  const errorId = `${name}-error`;
  const hintId = `${name}-hint`;

  return (
    <fieldset
      className="flex min-w-0 flex-col gap-2"
      aria-describedby={[error ? errorId : "", hint ? hintId : ""].filter(Boolean).join(" ") || undefined}
    >
      <legend className="mb-1.5 text-sm font-bold text-on-surface">
        {legend}
        {requiredMark && <span className="text-error"> *</span>}
      </legend>
      {hint && (
        <p id={hintId} className="-mt-1 text-xs font-medium text-on-surface-variant">
          {hint}
        </p>
      )}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-2">
        {franjas.map((f) => {
          const inputId = `${name}-${f.horaInicio.replace(":", "")}`;
          const elegida = value === f.horaInicio;
          const ultimo = f.disponible && f.cuposDisponibles === 1;
          const alumnoOcupado = f.motivo === "ALUMNO_CON_TURNO_SUPERPUESTO";

          const tarjeta = !f.disponible
            ? alumnoOcupado
              ? "cursor-not-allowed border-dashed border-error/40 bg-error/5 text-on-surface-variant"
              : "cursor-not-allowed border-dashed border-outline-variant bg-surface-container text-on-surface-variant"
            : elegida
              ? "cursor-pointer border-secondary bg-secondary/10 text-on-surface ring-1 ring-secondary"
              : "cursor-pointer border-outline-variant bg-surface-container-lowest text-on-surface hover:border-secondary hover:bg-secondary/5";

          return (
            <div key={f.horaInicio} className="relative">
              <input
                type="radio"
                id={inputId}
                name={name}
                value={f.horaInicio}
                checked={elegida}
                disabled={!f.disponible}
                onChange={() => onChange(f.horaInicio)}
                className="peer sr-only"
              />
              <label
                htmlFor={inputId}
                className={`flex min-h-16 flex-col justify-center gap-0.5 rounded-sm border px-3 py-2 transition-colors duration-fast ease-out peer-focus-visible:ring-2 peer-focus-visible:ring-secondary peer-focus-visible:ring-offset-2 ${tarjeta}`}
              >
                <span className="flex items-center justify-between gap-2 text-sm font-bold">
                  {f.horaInicio} – {f.horaFin}
                  {elegida && <Icon name="check_circle" size={18} filled className="text-secondary" />}
                  {!f.disponible && <Icon name="block" size={16} />}
                </span>
                {f.disponible ? (
                  <span
                    className={`flex items-center gap-1 text-xs font-semibold ${ultimo ? "text-on-surface" : "text-on-surface-variant"}`}
                  >
                    Cupos disponibles {f.cuposDisponibles} de {f.capacidad}
                    {ultimo && " · último cupo"}
                  </span>
                ) : (
                  <span
                    className={`text-xs font-semibold ${alumnoOcupado ? "text-status-danger-strong" : "text-on-surface"}`}
                  >
                    {f.motivo ? MOTIVO_TEXTO[f.motivo] : "No disponible"}
                    {f.motivo === "SIN_CUPO" && ` · 0 de ${f.capacidad}`}
                  </span>
                )}
              </label>
            </div>
          );
        })}
      </div>

      {error && (
        <p id={errorId} role="alert" className="text-sm font-semibold text-error">
          {error}
        </p>
      )}
    </fieldset>
  );
}
