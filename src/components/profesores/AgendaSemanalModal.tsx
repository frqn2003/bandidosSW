"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import type { Profesor } from "@/data/profesores";
import {
  aISO,
  lunesDe,
  sumarDias,
  verAgendaSemana,
  type AgendaDiaResponse,
  type TurnoCalendarioResponse,
} from "@/data/calendario";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import {
  DIAS_SEMANA_CORTOS,
  aMin,
  capacidadMaxDe,
  cargaHorariaSemanal,
} from "@/funciones/profesores";

// Filas de 30 min: es la unidad de agenda_profesional (CHECK 30min).
const PASO_MIN = 30;

const MESES_CORTOS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

type EstadoCarga = "cargando" | "error" | "listo";

/** Turnos que arrancan juntos y comparten materia = un grupo (cupos). */
type Grupo = { materia: string; materiaId: number; horaFin: string; alumnos: string[] };

/** "2026-09-21" → "21 Sep". */
function diaMes(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MESES_CORTOS[m - 1]}`;
}

function aHora(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

function enRango(min: number, r: { horaInicio: string; horaFin: string }): boolean {
  return min >= aMin(r.horaInicio) && min < aMin(r.horaFin);
}

function gruposQueArrancan(turnos: TurnoCalendarioResponse[], min: number): Grupo[] {
  const grupos = new Map<number, Grupo>();
  for (const t of turnos) {
    if (aMin(t.horaInicio) !== min) continue;
    const g = grupos.get(t.materia.id) ?? {
      materia: t.materia.nombre,
      materiaId: t.materia.id,
      horaFin: t.horaFin,
      alumnos: [],
    };
    g.alumnos.push(`${t.alumno.nombre} ${t.alumno.apellido}`);
    grupos.set(t.materia.id, g);
  }
  return [...grupos.values()];
}

interface AgendaSemanalModalProps {
  profesor: Profesor | null;
  open: boolean;
  onClose: () => void;
  onModificarBloques: (profesor: Profesor) => void;
}

/**
 * Disponibilidad Horaria y Agenda Semanal (HU-PRO-01, lectura). Muestra los
 * turnos reservados de la semana sobre los bloques de disponibilidad del
 * profesor y deriva a "Modificar Bloques" → BloquesDisponibilidadModal.
 *
 * Datos: la misma agenda diaria que el Calendario (GET /api/calendario/agenda,
 * una llamada por día, ver `verAgendaSemana`).
 */
export function AgendaSemanalModal({
  profesor,
  open,
  onClose,
  onModificarBloques,
}: AgendaSemanalModalProps) {
  const [materia, setMateria] = useState(""); // materia.id; "" = todas
  const [hoyISO] = useState(() => aISO(new Date()));
  const [lunes, setLunes] = useState(() => lunesDe(hoyISO));
  const [agenda, setAgenda] = useState<AgendaDiaResponse[]>([]);
  const [estadoCarga, setEstadoCarga] = useState<EstadoCarga>("cargando");
  const [intento, setIntento] = useState(0);

  // Al abrir con un profesor distinto se resetean el filtro y la semana.
  const [visto, setVisto] = useState<number | null>(null);
  if (open && profesor && visto !== profesor.id) {
    setMateria("");
    setLunes(lunesDe(hoyISO));
    setEstadoCarga("cargando");
    setVisto(profesor.id);
  }
  if (!open && visto !== null) setVisto(null);

  const profesorId = open ? profesor?.id : undefined;
  // Tras "Modificar bloques" la disponibilidad cambia: se vuelve a pedir.
  const firmaBloques = JSON.stringify(profesor?.bloquesPorDia ?? {});

  // El estado solo se toca dentro de la promesa; el efecto devuelve la cancelación.
  useEffect(() => {
    if (!profesorId) return;
    let cancelado = false;
    verAgendaSemana(profesorId, lunes)
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
  }, [profesorId, lunes, intento, firmaBloques]);

  const irASemana = (nuevoLunes: string) => {
    setEstadoCarga("cargando");
    setLunes(nuevoLunes);
  };
  const reintentar = () => {
    setEstadoCarga("cargando");
    setIntento((n) => n + 1);
  };

  const fechas = useMemo(() => Array.from({ length: 6 }, (_, i) => sumarDias(lunes, i)), [lunes]);

  /** Por día (lun-sáb): bloques y turnos reservados que pasan el filtro de materia. */
  const semana = useMemo(
    () =>
      fechas.map((fecha) => {
        const dia = agenda.find((d) => d.fecha === fecha);
        const turnos = (dia?.turnos ?? []).filter(
          (t) => t.estado === "Reservado" && (!materia || String(t.materia.id) === materia),
        );
        return { fecha, bloques: dia?.bloques ?? [], turnos };
      }),
    [agenda, fechas, materia],
  );

  // Filas: del primer inicio al último fin de la semana (bloques y turnos).
  const filas = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    for (const d of semana) {
      for (const r of [...d.bloques, ...d.turnos]) {
        min = Math.min(min, aMin(r.horaInicio));
        max = Math.max(max, aMin(r.horaFin));
      }
    }
    if (!Number.isFinite(min)) return [];
    const desde = Math.floor(min / PASO_MIN) * PASO_MIN;
    return Array.from(
      { length: Math.ceil((max - desde) / PASO_MIN) },
      (_, i) => desde + i * PASO_MIN,
    );
  }, [semana]);

  // Ocupación: medias horas con turno sobre medias horas de bloque.
  const { horasReservadas, horasDisponibles } = useMemo(() => {
    let disp = 0;
    let ocup = 0;
    for (const d of semana) {
      for (const min of filas) {
        if (!d.bloques.some((b) => enRango(min, b))) continue;
        disp++;
        if (d.turnos.some((t) => enRango(min, t))) ocup++;
      }
    }
    return { horasReservadas: (ocup * PASO_MIN) / 60, horasDisponibles: (disp * PASO_MIN) / 60 };
  }, [semana, filas]);
  const porciento =
    horasDisponibles > 0 ? Math.min(100, Math.round((horasReservadas / horasDisponibles) * 100)) : 0;

  if (!profesor) return null;

  const capacidadDe = (materiaId: number) =>
    profesor.materias.find((m) => m.materia.id === materiaId)?.capacidadMaxima ??
    capacidadMaxDe(profesor);

  const etiquetaCelda = (dia: string, diaIdx: number, min: number) => {
    const hora = aHora(min);
    const d = semana[diaIdx];
    const grupos = gruposQueArrancan(d.turnos, min);
    if (grupos.length > 0) {
      const detalle = grupos
        .map((g) => {
          const cap = capacidadDe(g.materiaId);
          const completo = g.alumnos.length >= cap ? " (Completo)" : "";
          return `${g.materia}: ${g.alumnos.join(", ")}, ${g.alumnos.length} de ${cap} cupos${completo}`;
        })
        .join("; ");
      return `${dia} ${hora} — ${detalle}`;
    }
    if (d.turnos.some((t) => enRango(min, t))) return `${dia} ${hora} — Turno en curso`;
    if (d.bloques.some((b) => enRango(min, b))) return `${dia} ${hora} — Disponible para reserva`;
    return `${dia} ${hora} — No disponible / fuera de franja`;
  };

  const esSemanaActual = lunes === lunesDe(hoyISO);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Disponibilidad Horaria y Agenda Semanal"
      subtitle={`Profesor: ${profesor.nombre} ${profesor.apellido} · ${cargaHorariaSemanal(profesor).toFixed(1)} hs semanales habilitadas`}
      icon={<Icon name="calendar_month" size={22} className="text-primary" />}
      maxWidth="max-w-4xl"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          <Button type="button" variant="secondary" onClick={() => window.print()}>
            <Icon name="print" size={16} />
            Imprimir Agenda
          </Button>
          <Button type="button" variant="primary" onClick={() => onModificarBloques(profesor)}>
            <Icon name="edit_calendar" size={16} />
            Modificar Bloques
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Navegación de la semana */}
        <div className="flex flex-wrap items-end justify-between gap-3 rounded-md border border-outline-variant bg-surface-container-low px-4 py-3">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Semana anterior"
              onClick={() => irASemana(sumarDias(lunes, -7))}
              className="border-outline-variant bg-surface-container-lowest"
            >
              <Icon name="chevron_left" size={20} />
            </Button>
            <span className="px-2 text-sm font-bold text-on-surface" aria-live="polite">
              Semana del {diaMes(fechas[0])} al {diaMes(fechas[5])}, {fechas[5].slice(0, 4)}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Semana siguiente"
              onClick={() => irASemana(sumarDias(lunes, 7))}
              className="border-outline-variant bg-surface-container-lowest"
            >
              <Icon name="chevron_right" size={20} />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => irASemana(lunesDe(hoyISO))}
              disabled={esSemanaActual}
              className="border-outline-variant bg-surface-container-lowest"
            >
              <Icon name="today" size={16} />
              Hoy
            </Button>
          </div>

          <div className="flex w-full items-end gap-2 sm:w-72">
            <label
              htmlFor="filtro-material-agenda"
              className="shrink-0 pb-3 text-sm font-bold text-on-surface"
            >
              Materia:
            </label>
            {/* Las opciones son las materias que dicta el profesor (vienen en su ficha).
                El wrapper con min-w-0 es el hijo flex: sin él, el ancho lo dicta la
                opción más larga y el select se sale del modal. */}
            <div className="min-w-0 flex-1">
              <Select
                id="filtro-material-agenda"
                aria-label="Materia"
                value={materia}
                onChange={(e) => setMateria(e.target.value)}
                className="w-full min-w-0 truncate"
              >
                <option value="">Todas las materias ({profesor.materias.length})</option>
                {profesor.materias.map((m) => (
                  <option key={m.materia.id} value={String(m.materia.id)}>
                    {m.materia.nombre}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </div>

        {/* Leyenda */}
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-on-surface">
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm bg-status-success" />
            Disponible para reserva
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm bg-primary" />
            Turno asignado/ocupado
          </li>
          <li className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 rounded-sm border border-outline bg-surface-container-low"
            />
            No disponible / Fuera de franja
          </li>
          <li>Capacidad máx: {capacidadMaxDe(profesor)} alumnos / grupo</li>
        </ul>

        {/* Ocupación semanal */}
        <div className="flex items-center gap-3 rounded-md border border-outline-variant bg-surface-container-low px-4 py-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary/15 text-secondary">
            <Icon name="insights" size={20} />
          </span>
          <div>
            <p className="text-sm font-bold text-on-surface">Ocupación semanal: {porciento}%</p>
            <p className="text-xs font-medium text-on-surface-variant">
              {horasReservadas.toFixed(1)} hs reservadas de {horasDisponibles.toFixed(1)} hs
              disponibles
            </p>
          </div>
        </div>

        {/* Grilla de la semana */}
        {estadoCarga === "cargando" ? (
          <div
            role="status"
            aria-live="polite"
            className="flex min-h-48 items-center justify-center rounded-md border border-outline-variant bg-surface-container-lowest text-sm font-semibold text-on-surface-variant"
          >
            Cargando agenda…
          </div>
        ) : estadoCarga === "error" ? (
          <div
            role="alert"
            className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-md border border-error/40 bg-error/5 text-center"
          >
            <p className="text-sm font-semibold text-on-surface">
              No pudimos cargar la agenda de esta semana.
            </p>
            <Button type="button" variant="outline" size="sm" onClick={reintentar}>
              <Icon name="refresh" size={16} />
              Reintentar
            </Button>
          </div>
        ) : filas.length === 0 ? (
          <div
            role="status"
            className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-md border border-dashed border-outline-variant bg-surface-container-lowest text-center"
          >
            <Icon name="event_busy" size={32} className="text-on-surface-variant" />
            <p className="text-sm font-semibold text-on-surface-variant">
              Sin bloques de disponibilidad ni turnos esta semana.
            </p>
          </div>
        ) : (
          <div
            role="grid"
            aria-label="Agenda semanal del profesor: franjas reservables y turnos asignados por día"
            className="overflow-x-auto rounded-md border border-outline-variant bg-surface-container-lowest"
          >
            <div className="grid min-w-[780px] grid-cols-[76px_repeat(6,minmax(0,1fr))]">
              <div className="border-b border-r border-outline-variant bg-surface-container-low px-2 py-2 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                Hora
              </div>
              {DIAS_SEMANA_CORTOS.map((dia, i) => (
                <div
                  key={dia}
                  className={`border-b border-r border-outline-variant px-2 py-2 text-center text-[11px] font-bold uppercase tracking-wider text-on-surface ${
                    fechas[i] === hoyISO ? "bg-secondary/10" : "bg-surface-container-low"
                  }`}
                >
                  {dia}
                  <span className="mt-0.5 block font-medium normal-case tracking-normal text-on-surface-variant">
                    {diaMes(fechas[i])}
                  </span>
                </div>
              ))}
              {filas.map((min) => (
                <Fragment key={min}>
                  <div className="border-b border-r border-outline-variant/60 bg-surface-container-low/40 px-2 py-2 text-[11px] font-semibold text-on-surface-variant">
                    {aHora(min)}-{aHora(min + PASO_MIN)}
                  </div>
                  {DIAS_SEMANA_CORTOS.map((dia, i) => {
                    const d = semana[i];
                    const grupos = gruposQueArrancan(d.turnos, min);
                    const enCurso = grupos.length === 0 && d.turnos.some((t) => enRango(min, t));
                    const libre =
                      grupos.length === 0 && !enCurso && d.bloques.some((b) => enRango(min, b));
                    const etiqueta = etiquetaCelda(dia, i, min);
                    return (
                      <div
                        key={`${min}-${dia}`}
                        role="gridcell"
                        aria-label={etiqueta}
                        title={etiqueta}
                        className={`min-h-14 border-b border-r border-outline-variant/40 p-2 ${
                          grupos.length > 0
                            ? "bg-primary text-on-primary"
                            : enCurso
                              ? "bg-primary/80"
                              : libre
                                ? "bg-status-success/10"
                                : "bg-surface-container-low"
                        }`}
                      >
                        {grupos.length > 0 ? (
                          <div className="flex h-full flex-col gap-1">
                            {grupos.map((g) => {
                              const cap = capacidadDe(g.materiaId);
                              return (
                                <div key={g.materiaId} className="flex flex-col gap-0.5">
                                  <p className="text-xs font-bold text-on-primary">
                                    {g.alumnos.length === 1
                                      ? g.alumnos[0]
                                      : `${g.alumnos.length} alumnos`}
                                    {g.alumnos.length >= cap && (
                                      <span className="ml-1.5 rounded-full bg-secondary px-1.5 py-0.5 align-middle text-[10px] font-bold text-on-secondary">
                                        Completo
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-[11px] font-medium text-on-primary/80">
                                    {g.materia} · hasta {g.horaFin}
                                  </p>
                                  <p className="text-[11px] font-semibold text-on-primary/90">
                                    {g.alumnos.length}/{cap} cupos
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        ) : enCurso ? null : libre ? (
                          <div className="flex h-full flex-col justify-center">
                            <p className="text-xs font-bold text-status-success-strong">＋ Libre</p>
                          </div>
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <p className="text-[11px] font-semibold text-on-surface-variant/60">
                              No asignado
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </Fragment>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
