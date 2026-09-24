"use client";

import { Fragment, useMemo, useState } from "react";
import { SEMANA_DEMO, TURNOS_SEMANA, type Profesor } from "@/data/profesores";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import {
  DIAS_SEMANA_CORTOS,
  aMin,
  capacidadMaxDe,
  cargaHorariaSemanal,
  horaMasMin,
} from "@/funciones/profesores";

// Franjas de 1.5 h de la grilla de la semana (inicios alineados con TURNOS_SEMANA).
const FRANJAS_GRILLA = ["08:30", "10:00", "14:00", "16:00"];
const DURACION_FRANJA_MIN = 90;

interface AgendaSemanalModalProps {
  profesor: Profesor | null;
  open: boolean;
  onClose: () => void;
  onModificarBloques: (profesor: Profesor) => void;
}

/**
 * Disponibilidad Horaria y Agenda Semanal (HU-PRO-01, lectura). Muestra los
 * turnos demo de la semana sobre las franjas habilitadas del profesor y
 * deriva a "Modificar Bloques" → BloquesDisponibilidadModal.
 */
export function AgendaSemanalModal({
  profesor,
  open,
  onClose,
  onModificarBloques,
}: AgendaSemanalModalProps) {
  const [materia, setMateria] = useState(""); // "" = todas

  // Al abrir con un profesor distinto se resetea el filtro de materia.
  const [visto, setVisto] = useState<number | null>(null);
  if (open && profesor && visto !== profesor.id) {
    setMateria("");
    setVisto(profesor.id);
  }
  if (!open && visto !== null) setVisto(null);

  const turnosVisibles = useMemo(() => {
    if (!profesor) return [];
    return TURNOS_SEMANA.filter(
      (t) => t.profesorId === profesor.id && (!materia || t.materia === materia),
    );
  }, [profesor, materia]);

  const horasReservadas = Math.round(turnosVisibles.length * (DURACION_FRANJA_MIN / 60) * 10) / 10;
  const porciento =
    SEMANA_DEMO.horasDisponibles > 0
      ? Math.min(100, Math.round((horasReservadas / SEMANA_DEMO.horasDisponibles) * 100))
      : 0;

  const turnoEn = (dia: number, hora: string) =>
    turnosVisibles.find((t) => t.dia === dia && t.horaInicio === hora);

  const disponibleEn = (dia: number, hora: string) => {
    const rangos = profesor?.bloquesPorDia[dia] ?? [];
    const min = aMin(hora);
    return rangos.some((r) => {
      const [desde, hasta] = r.split("-");
      return min >= aMin(desde) && min < aMin(hasta);
    });
  };

  const etiquetaCelda = (dia: string, diaIso: number, hora: string) => {
    const turno = turnoEn(diaIso, hora);
    if (turno) {
      const completo = turno.cuposUsados >= turno.cuposMax;
      return `${dia} ${hora} — Turno de ${turno.alumno}, ${turno.materia}, ${turno.cuposUsados} de ${turno.cuposMax} cupos ocupados${completo ? " (Completo)" : ""}`;
    }
    if (disponibleEn(diaIso, hora)) return `${dia} ${hora} — Disponible para reserva`;
    return `${dia} ${hora} — No disponible / fuera de franja`;
  };

  if (!profesor) return null;

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
        {/* Navegación de la semana (demo, fecha fija) */}
        <div className="flex flex-wrap items-end justify-between gap-3 rounded-md border border-outline-variant bg-surface-container-low px-4 py-3">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Semana anterior"
              className="border-outline-variant bg-surface-container-lowest"
            >
              <Icon name="chevron_left" size={20} />
            </Button>
            <span className="px-2 text-sm font-bold text-on-surface">
              Semana del {SEMANA_DEMO.fechas}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Semana siguiente"
              className="border-outline-variant bg-surface-container-lowest"
            >
              <Icon name="chevron_right" size={20} />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-outline-variant bg-surface-container-lowest"
            >
              <Icon name="today" size={16} />
              Hoy
            </Button>
          </div>

          <div className="flex w-full items-end gap-2 sm:w-72">
            <label
              htmlFor="filtro-material-agenda"
              className="pb-3 text-sm font-bold text-on-surface"
            >
              Materia:
            </label>
            {/* BACKEND: GET /api/materias?estado=activo (catálogo para el filtro de agenda) */}
            <Select
              id="filtro-material-agenda"
              aria-label="Materia"
              value={materia}
              onChange={(e) => setMateria(e.target.value)}
              className="flex-1"
            >
              <option value="">Todas las materias ({profesor.materias.length})</option>
              {profesor.materias.map((m) => (
                <option key={m.materia.id} value={m.materia.nombre}>
                  {m.materia.nombre}
                </option>
              ))}
            </Select>
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
              {horasReservadas.toFixed(1)} hs reservadas de {SEMANA_DEMO.horasDisponibles} hs
              disponibles
            </p>
          </div>
        </div>

        {/* Grilla de la semana */}
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
                className="border-b border-r border-outline-variant bg-surface-container-low px-2 py-2 text-center text-[11px] font-bold uppercase tracking-wider text-on-surface"
              >
                {dia}
                <span className="mt-0.5 block font-medium normal-case tracking-normal text-on-surface-variant">
                  {21 + i} Oct
                </span>
              </div>
            ))}
            {FRANJAS_GRILLA.map((hora) => {
              const hasta = horaMasMin(hora, DURACION_FRANJA_MIN);
              return (
                <Fragment key={hora}>
                  <div className="border-b border-r border-outline-variant/60 bg-surface-container-low/40 px-2 py-3 text-[11px] font-semibold text-on-surface-variant">
                    {hora}-{hasta}
                  </div>
                  {DIAS_SEMANA_CORTOS.map((dia, i) => {
                    const diaIso = i + 1;
                    const turno = turnoEn(diaIso, hora);
                    const libre = !turno && disponibleEn(diaIso, hora);
                    return (
                      <div
                        key={`${hora}-${dia}`}
                        role="gridcell"
                        aria-label={etiquetaCelda(dia, diaIso, hora)}
                        title={etiquetaCelda(dia, diaIso, hora)}
                        className={`min-h-20 border-b border-r border-outline-variant/40 p-2 ${
                          turno
                            ? "bg-primary text-on-primary"
                            : libre
                              ? "bg-status-success/10"
                              : "bg-surface-container-low"
                        }`}
                      >
                        {turno ? (
                          <div className="flex h-full flex-col gap-0.5">
                            <p className="text-xs font-bold text-on-primary">
                              {turno.alumno}
                              {turno.cuposUsados >= turno.cuposMax && (
                                <span className="ml-1.5 rounded-full bg-secondary px-1.5 py-0.5 align-middle text-[10px] font-bold text-on-secondary">
                                  Completo
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] font-medium text-on-primary/80">
                              {turno.materia}
                            </p>
                            <p className="text-[11px] font-semibold text-on-primary/90">
                              {turno.cuposUsados}/{turno.cuposMax} cupos
                            </p>
                          </div>
                        ) : libre ? (
                          <div className="flex h-full flex-col justify-center">
                            <p className="text-xs font-bold text-status-success-strong">＋ Libre</p>
                            <p className="text-[11px] font-medium text-on-surface-variant">
                              Disp. Reserva
                            </p>
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
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}