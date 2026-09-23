"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Select } from "@/components/ui/Select";
import {
  limiteAtencion,
  verAgendaDia,
  verAgendaSemana,
  type AgendaDiaResponse,
  type ProfesorCalendario,
} from "@/data/calendario";
import { TurnoCalendarioBadge } from "./TurnoCalendarioBadge";
import { TurnoDetalleModal } from "./TurnoDetalleModal";
import { ReservaTurnoModal } from "./ReservaTurnoModal";

// Grilla de turnos de un profesor (HU-CAL-01).
//
// Vista Semana (6 días, lun–sáb) o Día; zoom de 30/60 min por fila; navegación
// Hoy/◀/▶; leyenda de colores siempre visible; resaltado del día y la hora
// actual. Click en turno → detalle LECTURA (HU-TUR-02); click en franja libre →
// reserva precargada (HU-TUR-01, /turnos/reservas).
//
// Diseño: adapta la estética de la agenda semanal del diseño "Turnos y Agenda"
// (tarjetas con borde lateral de color, pill contador, leyenda con puntos) al
// dominio de academia con el design system Nexo Académico. Sin superposiciones
// visuales: cada turno cae en la fila donde ARRANCA (como en la referencia).

const DIAS_CORTOS = ["", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"] as const;
const DIAS_LARGOS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado"] as const;
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
] as const;
/** Una fila mide 56px ≥ touch target de 44px. El zoom cambia CUÁNTAS filas hay. */
const ROW_HEIGHT = 56;

type Vista = "semana" | "dia";
type Zoom = 30 | 60;
type EstadoCarga = "cargando" | "error" | "listo";

// ─── Helpers de fecha/hora ───────────────────────────────────────────────

function aISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function aDate(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

function sumarDias(iso: string, dias: number): string {
  const f = aDate(iso);
  f.setDate(f.getDate() + dias);
  return aISO(f);
}

function lunesDe(iso: string): string {
  const f = aDate(iso);
  const suma = (f.getDay() + 6) % 7;
  f.setDate(f.getDate() - suma);
  return aISO(f);
}

function aMin(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

function minAString(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "lunes 21/09 – sábado 26/09" para el encabezado impreso. */
function formatearRango(lunes: string): string {
  const d = aDate(lunes);
  const dias = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const fin = sumarDias(lunes, 5);
  const diaFin = aDate(fin);
  const mm = (n: number) => String(n).padStart(2, "0");
  return `${dias[d.getDay() - 1]} ${mm(d.getDate())}/${mm(d.getMonth() + 1)} – ` +
    `${dias[diaFin.getDay() - 1]} ${mm(diaFin.getDate())}/${mm(diaFin.getMonth() + 1)}`;
}

/**
 * "Semana del 21 al 26 de octubre de 2025" para el encabezado del toolbar.
 * Si la semana cruza de mes, anota ambos meses ("…del 30 de septiembre al 4
 * de octubre de 2025"). En vista Día: "Miércoles 21 de octubre de 2025".
 */
function formatearSemana(ancla: string): string {
  const l = lunesDe(ancla);
  const di = aDate(l);
  const df = aDate(sumarDias(l, 5));
  const rango =
    di.getMonth() === df.getMonth()
      ? `${di.getDate()} al ${df.getDate()} de ${MESES[di.getMonth()]} de ${di.getFullYear()}`
      : `${di.getDate()} de ${MESES[di.getMonth()]} al ${df.getDate()} de ${MESES[df.getMonth()]} de ${di.getFullYear()}`;
  return `Semana del ${rango}`;
}

/** "Miércoles 21 de octubre de 2025" para la vista Día. */
function formatearDia(iso: string): string {
  const d = aDate(iso);
  const dia = DIAS_LARGOS[d.getDay() - 1];
  return `${dia[0].toUpperCase()}${dia.slice(1)} ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

interface CalendarioTurnosProps {
  profesores: ProfesorCalendario[];
  /** Ficha fija para el rol Profesor (filtro bloqueado). Null si el rol elige. */
  profesorFijo: ProfesorCalendario | null;
}

export function CalendarioTurnos({ profesores, profesorFijo }: CalendarioTurnosProps) {
  const [hoyISO] = useState(() => aISO(new Date()));
  const [lunes, setLunes] = useState(() => lunesDe(hoyISO));
  const [vista, setVista] = useState<Vista>("semana");
  const [zoom, setZoom] = useState<Zoom>(30);
  const [profesorId, setProfesorId] = useState(profesorFijo ? String(profesorFijo.id) : "");
  // El rol Profesor entra con su ficha ya aplicada: el selector queda bloqueado.
  const filtroBloqueado = profesorFijo !== null;

  // Límites de la grilla: horario de atención del CENTRO, no del profesor.
  const [limites, setLimites] = useState<{ min: number; max: number } | null>(null);

  const [agenda, setAgenda] = useState<AgendaDiaResponse[]>([]);
  const [estadoCarga, setEstadoCarga] = useState<EstadoCarga>("cargando");
  const [intento, setIntento] = useState(0);

  const [detalle, setDetalle] = useState<{ turno: AgendaDiaResponse["turnos"][number]; fecha: string } | null>(null);
  const [reserva, setReserva] = useState<{ fecha: string; hueco: AgendaDiaResponse["huecos"][number] } | null>(null);

  useEffect(() => {
    let cancelado = false;
    limiteAtencion()
      .then((r) => {
        if (!cancelado) setLimites(r);
      })
      .catch(() => {
        if (!cancelado) setLimites({ min: 8 * 60, max: 20 * 60 });
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const profesorSeleccionado = useMemo(() => {
    const id = Number(profesorId);
    return (profesorFijo ?? profesores.find((p) => p.id === id)) ?? null;
  }, [profesorId, profesores, profesorFijo]);

  // Mismo patrón que las demás pantallas: el estado solo se toca dentro de las
  // promesas; el efecto devuelve la cancelación. `intento` fuerza reintentos.
  const traer = useCallback(() => {
    if (!profesorId) return;
    let cancelado = false;
    const p = Number(profesorId);
    const cargar =
      vista === "semana"
        ? verAgendaSemana(p, lunesDe(lunes))
        : verAgendaDia(p, lunes).then((d) => [d]);
    cargar
      .then((dias) => {
        if (cancelado) return;
        setAgenda(dias);
        setEstadoCarga("listo");
      })
      .catch(() => {
        if (!cancelado) setEstadoCarga("error");
      });
    return () => {
      cancelado = true;
    };
  }, [profesorId, vista, lunes]);

  useEffect(traer, [traer, intento]);

  const reintentar = () => {
    setEstadoCarga("cargando");
    setIntento((i) => i + 1);
  };

  // Día y hora actual para el resaltado (embellecedor opcional aprobado).
  const ahora = useMemo(() => {
    const n = new Date();
    return { fecha: aISO(n), min: n.getHours() * 60 + n.getMinutes() };
  }, []);
  // Solo se marca la hora actual si la semana/día visible contiene a hoy.
  const semanaDeHoy = lunesDe(hoyISO);
  const visibleContieneHoy = lunesDe(lunes) === semanaDeHoy;

  const bandas = useMemo(() => {
    if (!limites) return [];
    const filas: number[] = [];
    for (let t = limites.min; t < limites.max; t += zoom) filas.push(t);
    return filas;
  }, [limites, zoom]);

  const turnosTotales = useMemo(
    () => agenda.reduce((acc, d) => acc + d.turnos.length, 0),
    [agenda],
  );

  const irHoy = () => {
    setLunes(vista === "semana" ? lunesDe(hoyISO) : hoyISO);
  };
  const irAnterior = () => {
    setLunes((l) => sumarDias(l, vista === "semana" ? -7 : -1));
  };
  const irSiguiente = () => {
    setLunes((l) => sumarDias(l, vista === "semana" ? 7 : 1));
  };
  const cambiarVista = (v: Vista) => {
    setVista(v);
    // Al volver a semana, el ancla se normaliza a lunes.
    if (v === "semana") setLunes((l) => lunesDe(l));
  };

  const sinProfesor = !profesorId;

  return (
    <div className="flex flex-col gap-5">
      {/* Toolbar superior */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary-container/30">
            <Icon name="calendar_view_month" size={24} className="text-primary" />
          </span>
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold text-on-surface">Calendario</h1>
            <p className="truncate text-sm font-medium text-on-surface-variant">
              Disponibilidad y reservas de cada profesor
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="md"
          type="button"
          onClick={() => window.print()}
          className="ml-auto"
        >
          <Icon name="print" size={16} />
          {vista === "semana" ? "Imprimir semana" : "Imprimir día"}
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-4 print:hidden">
        <div className="w-full max-w-xs">
          {filtroBloqueado ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-bold text-on-surface">
                Profesor
                <span className="ml-1.5 inline-flex items-center gap-1 text-xs font-semibold text-on-surface-variant">
                  <Icon name="lock" size={14} />
                  Tu calendario
                </span>
              </span>
              <div className="flex h-11 items-center gap-2 rounded-sm border border-outline-variant bg-surface-container-low px-4 text-base text-on-surface">
                <Icon name="school" size={18} className="text-on-surface-variant" />
                {profesorFijo?.apellido}, {profesorFijo?.nombre}
              </div>
            </div>
          ) : (
            <Select
              label="Profesor"
              requiredMark
              value={profesorId}
              onChange={(e) => {
                setProfesorId(e.target.value);
                setEstadoCarga("cargando");
              }}
            >
              <option value="">Seleccione un profesor…</option>
              {profesores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.apellido}, {p.nombre}
                </option>
              ))}
            </Select>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2" role="group" aria-label="Vista del calendario">
            <Button
              variant={vista === "semana" ? "primary" : "outline"}
              size="sm"
              type="button"
              onClick={() => cambiarVista("semana")}
            >
              Semana
            </Button>
            <Button
              variant={vista === "dia" ? "primary" : "outline"}
              size="sm"
              type="button"
              onClick={() => cambiarVista("dia")}
            >
              Día
            </Button>
          </div>
          <div className="flex items-center gap-2" role="group" aria-label="Zoom de la grilla">
            <span className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">Zoom</span>
            <Button
              variant={zoom === 30 ? "primary" : "outline"}
              size="sm"
              type="button"
              onClick={() => setZoom(30)}
            >
              30&apos;
            </Button>
            <Button
              variant={zoom === 60 ? "primary" : "outline"}
              size="sm"
              type="button"
              onClick={() => setZoom(60)}
            >
              60&apos;
            </Button>
          </div>
        </div>
      </div>

      {sinProfesor && !filtroBloqueado && (
        <p className="-mt-2 text-sm font-medium text-on-surface-variant print:hidden">
          Elegí un profesor para ver su calendario.
        </p>
      )}

      {/* Encabezado del calendario: rango + navegación en la esquina derecha */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <Icon name="calendar_view_month" size={20} className="shrink-0 text-on-surface-variant" />
          <h2 className="truncate font-display text-lg font-bold text-on-surface">
            {vista === "semana" ? formatearSemana(lunes) : formatearDia(lunes)}
          </h2>
          <span
            className="inline-flex h-7 shrink-0 items-center rounded-full border border-outline-variant bg-surface-container-low px-3 text-xs font-bold text-on-surface"
            aria-label={`${turnosTotales} turnos en esta ${vista}`}
          >
            {turnosTotales} turnos
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Navegación del calendario">
          <Button variant="outline" size="md" type="button" onClick={irHoy}>
            Hoy
          </Button>
          <Button variant="outline" size="icon" type="button" aria-label="Anterior" onClick={irAnterior}>
            <Icon name="chevron_left" size={20} />
          </Button>
          <Button variant="outline" size="icon" type="button" aria-label="Siguiente" onClick={irSiguiente}>
            <Icon name="chevron_right" size={20} />
          </Button>
        </div>
      </div>

      {sinProfesor ? (
        <section className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-outline-variant bg-surface-container-lowest px-6 py-16 text-center">
          <Icon name="calendar_view_month" size={40} className="text-on-surface-variant" />
          <h2 className="text-lg font-bold text-on-surface">Seleccione un profesor para ver su calendario</h2>
          <p className="max-w-sm text-sm font-medium text-on-surface-variant">
            La grilla muestra los bloques de disponibilidad del profesor y sus turnos reservados.
          </p>
        </section>
      ) : estadoCarga === "error" ? (
        <section
          role="alert"
          className="flex flex-col items-center gap-3 rounded-md border border-error/40 bg-error/5 px-6 py-12 text-center"
        >
          <Icon name="error" size={40} className="text-error" />
          <h2 className="text-lg font-bold text-on-surface">No pudimos cargar el calendario</h2>
          <p className="max-w-sm text-sm font-medium text-on-surface-variant">
            Revisá la conexión y volvé a intentar. Si el problema sigue, avisá al equipo.
          </p>
          <Button type="button" variant="outline" onClick={reintentar}>
            <Icon name="refresh" size={16} />
            Reintentar
          </Button>
        </section>
      ) : (
        <div
          className={`overflow-auto rounded-md border border-outline-variant bg-surface-container-lowest print:max-h-none print:overflow-visible ${estadoCarga === "cargando" ? "opacity-60" : ""}`}
          style={{ maxHeight: "calc(100vh - 17rem)" }}
        >
          {estadoCarga === "cargando" && (
            <p role="status" aria-live="polite" className="sr-only">
              Cargando calendario…
            </p>
          )}

          <table className="w-full border-collapse" aria-label="Calendario de turnos por día">
            <thead>
              <tr className="border-b border-outline-variant">
                <th
                  scope="col"
                  className="sticky left-0 top-0 z-20 border-r border-outline-variant bg-surface-container-lowest px-3 py-3 text-left text-xs font-bold uppercase tracking-wide text-on-surface-variant"
                >
                  Hora
                </th>
                {agenda.map((d) => {
                  const esHoy = d.fecha === hoyISO;
                  const conBloques = d.bloques.length > 0;
                  const [, mes, dia] = d.fecha.split("-");
                  return (
                    <th
                      key={d.fecha}
                      scope="col"
                      className={`sticky top-0 z-10 border-l border-outline-variant px-3 py-2.5 text-center text-xs font-bold uppercase tracking-wide ${
                        esHoy ? "bg-secondary text-on-secondary" : "bg-surface-container-lowest text-on-surface-variant"
                      } ${!conBloques ? "opacity-45" : ""}`}
                    >
                      {DIAS_CORTOS[d.fecha ? nuevoDia(d.fecha) : 0]} {dia}/{mes}
                      {esHoy && (
                        <span className="ml-1.5 inline-block rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase leading-none text-on-primary">
                          Hoy
                        </span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {bandas.map((banda) => {
                const bandaFin = banda + zoom;
                const esHoraActual =
                  visibleContieneHoy && ahora.min >= banda && ahora.min < bandaFin;
                return (
                  <tr key={banda} className="border-b border-outline-variant last:border-b-0">
                    <th
                      scope="row"
                      className={`sticky left-0 z-10 whitespace-nowrap border-r border-outline-variant px-3 text-xs font-bold ${
                        esHoraActual ? "bg-secondary/10 text-primary" : "bg-surface-container-lowest text-on-surface-variant"
                      }`}
                      style={{ height: ROW_HEIGHT }}
                    >
                      <span className="flex items-center gap-1.5">
                        {esHoraActual && <span className="h-1.5 w-1.5 rounded-full bg-secondary" aria-hidden="true" />}
                        {minAString(banda)} – {minAString(bandaFin)}
                      </span>
                    </th>

                    {agenda.map((d) => {
                      const bloqueCubre = d.bloques.some(
                        (b) => aMin(b.horaInicio) <= banda && banda < aMin(b.horaFin),
                      );
                      const turnosCelda = d.turnos
                        .filter((t) => {
                          const tIni = aMin(t.horaInicio);
                          return tIni >= banda && tIni < bandaFin;
                        })
                        .sort((a, b) => (a.horaInicio < b.horaInicio ? -1 : 1));
                      const huecoCelda = d.huecos.find((h) => {
                        const hIni = aMin(h.horaInicio);
                        const hFin = aMin(h.horaFin);
                        return banda >= hIni && banda < hFin;
                      });

                      return (
                        <td
                          key={d.fecha}
                          className="border-l border-outline-variant px-1 py-1 align-top"
                          style={{ height: ROW_HEIGHT }}
                        >
                          {!bloqueCubre ? (
                            <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-on-surface-variant/40">
                              —
                            </div>
                          ) : (
                            <div
                              className={`flex h-full gap-1 ${
                                turnosCelda.length === 0 && huecoCelda
                                  ? "flex-col items-center justify-center"
                                  : "flex-col justify-start"
                              }`}
                            >
                              {turnosCelda.length === 0 && huecoCelda && (
                                <button
                                  type="button"
                                  onClick={() => setReserva({ fecha: d.fecha, hueco: huecoCelda })}
                                  aria-label={`Reservar ${huecoCelda.horaInicio} a ${huecoCelda.horaFin}, ${huecoCelda.profesor.apellido} ${huecoCelda.profesor.nombre}`}
                                  className="flex min-h-12 w-full cursor-pointer items-center justify-center gap-1 rounded-sm border border-dashed border-outline-variant bg-surface-container-low/60 px-2 text-xs font-semibold text-on-surface-variant transition-colors duration-fast ease-out hover:border-secondary/50 hover:bg-secondary/10 hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
                                >
                                  <Icon name="add_circle" size={16} />
                                  Disponible
                                </button>
                              )}
                              {turnosCelda.map((t) => (
                                <button
                                  key={t.id}
                                  type="button"
                                  onClick={() => setDetalle({ turno: t, fecha: d.fecha })}
                                  aria-label={`${t.codigo} · ${t.alumno.apellido}, ${t.alumno.nombre} · ${t.materia.nombre} · ${t.horaInicio} a ${t.horaFin}`}
                                  className={`flex w-full cursor-pointer flex-col items-start gap-0.5 rounded-sm border-l-4 bg-surface-container-lowest px-2 py-1.5 text-left shadow-sm transition-colors duration-fast ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-1 ${
                                    t.estado === "Cancelado"
                                      ? "border-l-error bg-error/5 hover:bg-error/10"
                                      : "border-l-secondary hover:bg-secondary/5"
                                  }`}
                                >
                                  <span className="flex w-full items-center justify-between gap-1">
                                    <span className="truncate font-mono text-[11px] font-bold leading-none text-on-surface-variant">
                                      {t.codigo} · {t.horaInicio}–{t.horaFin}
                                    </span>
                                    <TurnoCalendarioBadge estado={t.estado} />
                                  </span>
                                  <span className="truncate text-xs font-bold leading-tight text-on-surface">
                                    {t.alumno.apellido}, {t.alumno.nombre}
                                  </span>
                                  <span className="truncate text-[11px] font-medium leading-none text-on-surface-variant">
                                    {t.materia.nombre}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Encabezado solo para impresión: academia + profesor + rango. */}
      <header className="hidden print:block">
        <h2 className="text-center font-display text-lg font-bold">Centro Académico</h2>
        <p className="text-center text-sm font-semibold">
          Calendario de turnos · {profesorSeleccionado ? `${profesorSeleccionado.apellido}, ${profesorSeleccionado.nombre}` : ""}
        </p>
        <p className="text-center text-sm font-medium text-on-surface-variant">
          {vista === "semana"
            ? `Semana del ${formatearRango(lunesDe(lunes))}`
            : formatearDia(lunes)}
        </p>
      </header>

      <TurnoDetalleModal
        key={detalle?.turno.id ?? -1}
        open={detalle !== null}
        turno={detalle?.turno ?? null}
        fecha={detalle?.fecha ?? ""}
        profesorNombre={profesorSeleccionado ? `${profesorSeleccionado.apellido}, ${profesorSeleccionado.nombre}` : ""}
        onClose={() => setDetalle(null)}
      />

      <ReservaTurnoModal
        open={reserva !== null}
        fecha={reserva?.fecha ?? ""}
        huecoInicio={reserva?.hueco.horaInicio ?? ""}
        huecoFin={reserva?.hueco.horaFin ?? ""}
        profesor={profesorSeleccionado}
        onClose={() => setReserva(null)}
      />
    </div>
  );
}

/** getDay() (0=domingo) → hacia el índice de DIAS_CORTOS (1=lun…6=sáb). */
function nuevoDia(fecha: string): number {
  const d = new Date(`${fecha}T00:00:00`).getDay();
  return d === 0 ? 0 : d;
}