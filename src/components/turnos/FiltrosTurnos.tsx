"use client";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { RangoFechas } from "@/components/ui/RangoFechas";
import { Select } from "@/components/ui/Select";
import { hoyAR } from "@/contracts/alumno";
import { sumarDias } from "@/data/turnos";

// Filtros del listado de turnos (HU-TUR-02).
//
// Estado: single-select (Todos por defecto) + estados concretos.
//   · Reservado / Cancelado los delega el front al servidor (filtro `estado`).
//   · Finalizado NO existe en la base: se deriva en el navegador (decisión 1
//     del brief) sobre los turnos del rango, por eso va con su nota explicativa.
// Rango de fechas: dos campos de fecha (desde/hasta), por defecto ±7 días.
// Conteo: la página pasa el n° de cada estado dentro del rango (sin filtrar),
// así se entiende qué está pasando con el reparto actual.

export type FiltroEstadoTurno = "" | "Reservado" | "Finalizado" | "Cancelado";

export interface FiltrosTurnosState {
  busqueda: string;
  estado: FiltroEstadoTurno;
  desde: string;
  hasta: string;
}

export interface ConteoTurnos {
  Reservado: number;
  Finalizado: number;
  Cancelado: number;
}

/** Historia mínima que la barra permite mirar (para ver Finalizados). */
export const DIAS_HISTORIA_RANGO = 90;
/** Ventana que se usa cuando se elige "Finalizado" y el rango no alcanza el pasado. */
export const DIAS_FINALIZADOS_AUTO = 30;
/** Ancho máximo de la ventana (decisión de auditoría: nunca un listado abierto). */
export const DIAS_MAXIMOS_RANGO = 60;

export function rangoMinimo() {
  return sumarDias(hoyAR(), -DIAS_HISTORIA_RANGO);
}
export function rangoMaximo() {
  return sumarDias(hoyAR(), 60);
}

export function FILTROS_TURNOS_INICIALES(): FiltrosTurnosState {
  const hoy = hoyAR();
  return { busqueda: "", estado: "", desde: sumarDias(hoy, -7), hasta: sumarDias(hoy, 7) };
}

interface FiltrosTurnosProps {
  estado: FiltrosTurnosState;
  conteo: ConteoTurnos;
  onChange: (next: FiltrosTurnosState) => void;
  onLimpiar: () => void;
}

export function FiltrosTurnos({ estado, conteo, onChange, onLimpiar }: FiltrosTurnosProps) {
  const set = (patch: Partial<FiltrosTurnosState>) => onChange({ ...estado, ...patch });

  return (
    <form
      className="flex flex-col gap-4 rounded-md border border-outline-variant bg-surface-container-lowest p-4 shadow-card"
      onSubmit={(e) => e.preventDefault()}
      aria-label="Filtros del listado de turnos"
    >
      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-end">
        <div className="relative w-full md:w-80">
          {/* BACKEND: búsqueda parcial → GET /api/turnos?busqueda= (código de turno,
              legajo, DNI, nombre o apellido del alumno; ILIKE en el back). */}
          <Input
            id="busqueda-turno"
            label="Buscar"
            placeholder="Código, legajo, DNI, nombre o apellido…"
            value={estado.busqueda}
            onChange={(e) => set({ busqueda: e.target.value })}
            className="pl-10"
          />
          <Icon
            name="search"
            size={16}
            className="pointer-events-none absolute left-3 top-[38px] text-on-surface-variant"
          />
        </div>

        <div className="w-full md:w-56">
          {/* BACKEND: GET /api/turnos?estado=Reservado|Cancelado (de la DB solo se
              filtra por estos dos; Finalizado se deriva acá sobre el rango). */}
          <Select
            id="filtro-estado-turno"
            label="Estado"
            value={estado.estado}
            onChange={(e) => set({ estado: e.target.value as FiltroEstadoTurno })}
          >
            <option value="Reservado">Reservado</option>
            <option value="Finalizado">Finalizado</option>
            <option value="Cancelado">Cancelado</option>
            <option value="">Todos</option>
          </Select>
        </div>

        {/* BACKEND: el rango viaja como desde/hasta en GET /api/turnos. */}
        <RangoFechas
          id="rango-turnos"
          desde={estado.desde}
          hasta={estado.hasta}
          min={rangoMinimo()}
          max={rangoMaximo()}
          maxDias={DIAS_MAXIMOS_RANGO}
          onChange={(rango) => set(rango)}
        />

        <Button type="button" variant="outline" onClick={onLimpiar} className="self-end">
          <Icon name="filter_alt_off" size={16} />
          Limpiar filtros
        </Button>
      </div>

      {estado.estado === "Finalizado" && (
        <p className="inline-flex items-start gap-1.5 rounded-sm bg-status-info/10 px-3 py-2 text-xs font-semibold text-on-surface">
          <Icon name="info" size={14} className="mt-0.5 shrink-0 text-status-info-strong" />
          Finalizado se calcula acá, en el navegador: el turno ya pasó el día de la clase.
          Para verlos, el rango tiene que incluir días pasados.
        </p>
      )}

      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-on-surface-variant" aria-live="polite">
        {(["Reservado", "Finalizado", "Cancelado"] as const).map((estadoFiltro) => (
          <span key={estadoFiltro} className="inline-flex items-center gap-1">
            <Icon
              name={estadoFiltro === "Reservado" ? "event_available" : estadoFiltro === "Finalizado" ? "check_circle" : "block"}
              size={13}
              className={
                estadoFiltro === "Reservado"
                  ? "text-status-info-strong"
                  : estadoFiltro === "Finalizado"
                    ? "text-on-surface-variant"
                    : "text-status-danger-strong"
              }
            />
            <span className="font-bold tabular-nums">{conteo[estadoFiltro]}</span> {estadoFiltro.toLowerCase()}
          </span>
        ))}
        <span className="text-on-surface-variant">en el rango actual</span>
      </p>
    </form>
  );
}