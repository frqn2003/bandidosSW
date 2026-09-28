"use client";

import { useEffect, useMemo, useState } from "react";
import type { AgendaResponse } from "@/contracts/agenda";
import { obtenerAgendaAcademia } from "@/data/profesores";
import { DIAS_SEMANA_SELECT, diasDeAtencion } from "@/funciones/profesores";
import { mensajeDeError } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";

export function useAgendaAcademia(academiaId: number | null, open: boolean) {
  const [intento, setIntento] = useState(0);
  const consulta = useMemo(() => ({ academiaId, open, intento }), [academiaId, open, intento]);
  const [resultado, setResultado] = useState<{
    consulta: typeof consulta;
    agenda: AgendaResponse | null;
    error: string | null;
  } | null>(null);

  useEffect(() => {
    if (!consulta.open || !consulta.academiaId) return;
    let cancelado = false;
    obtenerAgendaAcademia(consulta.academiaId)
      .then((agenda) => {
        if (!cancelado) setResultado({ consulta, agenda, error: null });
      })
      .catch((error) => {
        if (!cancelado) setResultado({ consulta, agenda: null, error: mensajeDeError(error) });
      });
    return () => { cancelado = true; };
  }, [consulta]);

  const actual = resultado?.consulta === consulta ? resultado : null;
  const agenda = actual?.agenda ?? null;
  const franjas = useMemo(
    () => agenda?.estado === "activo" ? agenda.franjas.filter((f) => f.estado === "activo") : [],
    [agenda],
  );
  const dias = useMemo(() => diasDeAtencion(franjas), [franjas]);
  return {
    academiaId,
    agenda,
    franjas,
    dias,
    cargando: open && academiaId !== null && actual === null,
    error: actual?.error ?? null,
    habilitado: open && dias.length > 0,
    reintentar: () => setIntento((i) => i + 1),
  };
}

export function HorarioAcademia({
  horario,
  sinAcademia = "El profesor no tiene una academia asignada. Asignale una antes de cargar horarios.",
}: {
  horario: ReturnType<typeof useAgendaAcademia>;
  sinAcademia?: string;
}) {
  let mensaje: string | null = null;
  if (!horario.academiaId) mensaje = sinAcademia;
  else if (horario.cargando) mensaje = "Cargando horarios de atención de la academia…";
  else if (horario.error) mensaje = `No pudimos cargar los horarios. ${horario.error}`;
  else if (horario.agenda?.estado !== "activo") mensaje = "La agenda de esta academia está inactiva. No se pueden asignar bloques.";
  else if (!horario.habilitado) mensaje = "La academia no tiene franjas activas que permitan bloques de 30 minutos.";

  return (
    <section aria-label="Horario de atención de la academia" className="flex flex-col gap-2 rounded-sm border border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface">
      <h3 className="font-bold">
        Horarios de atención{horario.agenda ? ` · ${horario.agenda.academia.nombre}` : " de la academia"}
      </h3>
      {mensaje ? (
        <div className="flex flex-wrap items-center gap-2">
          <p role={horario.error ? "alert" : "status"}>{mensaje}</p>
          {horario.error && (
            <Button type="button" variant="outline" onClick={horario.reintentar}>Reintentar</Button>
          )}
        </div>
      ) : (
        <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
          {DIAS_SEMANA_SELECT.map((dia) => {
            const franjas = horario.franjas.filter((f) => String(f.diaSemana) === dia.value);
            if (franjas.length === 0) return null;
            return (
              <div key={dia.value}>
                <dt className="font-semibold">{dia.label}</dt>
                <dd>{[...franjas].sort((a, b) => a.horaInicio.localeCompare(b.horaInicio)).map((f) => `${f.horaInicio}–${f.horaFin}`).join(" / ")}</dd>
              </div>
            );
          })}
        </dl>
      )}
    </section>
  );
}
