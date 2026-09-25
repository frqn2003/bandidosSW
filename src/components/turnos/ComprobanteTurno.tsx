"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { TurnoCalendarioBadge } from "@/components/calendario/TurnoCalendarioBadge";
import { ResumenReserva } from "@/components/turnos/ResumenReserva";
import { formatearFecha } from "@/funciones/formato";
import type { TurnoResponse } from "@/data/turnos";

// Comprobante de reserva en pantalla (HU-TUR-01). Muestra el turno tal como lo
// devolvió el back (código generado por la base, valor congelado, quién lo
// registró). Las acciones opcionales (imprimir / email) se muestran solo si la
// página pasa su handler: sacarlas es borrar la prop en la página.

interface ComprobanteTurnoProps {
  turno: TurnoResponse;
  /** DNI del alumno (TurnoResponse no lo trae; lo tiene el buscador). */
  dniAlumno?: string;
  onNuevaReserva: () => void;
  hrefCalendario: string;
  /** OPCIONAL: impresión del comprobante. */
  onImprimir?: () => void;
  /** OPCIONAL: envío del comprobante por email. */
  onEnviarEmail?: () => void;
  enviandoEmail?: boolean;
  /** Email de destino; null deshabilita el envío (el alumno no tiene email). */
  emailDestino?: string | null;
}

const formatearPesos = (valor: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(valor);

const formatearFechaHora = (iso: string) => {
  const d = new Date(iso);
  return `${d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })} ${d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}`;
};

export function ComprobanteTurno({
  turno,
  dniAlumno,
  onNuevaReserva,
  hrefCalendario,
  onImprimir,
  onEnviarEmail,
  enviandoEmail = false,
  emailDestino,
}: ComprobanteTurnoProps) {
  return (
    <section
      aria-labelledby="comprobante-titulo"
      className="flex flex-col overflow-hidden rounded-md border border-outline-variant bg-surface-container-lowest shadow-card print:border-0 print:shadow-none"
    >
      {/* Encabezado solo impreso: identifica el papel fuera de la pantalla. */}
      <p className="hidden px-6 pt-6 text-sm font-bold text-primary print:block">
        Centro Académico · Comprobante de reserva de clase de apoyo
      </p>

      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-outline-variant px-6 py-5">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-status-success/15 print:hidden">
            <Icon name="check_circle" size={28} filled className="text-status-success-strong" />
          </span>
          <div>
            <h2 id="comprobante-titulo" className="font-display text-xl font-bold text-on-surface">
              Turno reservado
            </h2>
            <p className="text-sm font-medium text-on-surface-variant">
              Comprobante de reserva de clase de apoyo
            </p>
          </div>
        </div>
        <div className="flex flex-col items-start gap-1.5 sm:items-end">
          <span className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
            Código de turno
          </span>
          <div className="flex items-center gap-2">
            {/* No editable: lo genera la base (turno.codigo GENERATED). */}
            <span className="font-display text-2xl font-bold tracking-wide text-primary">
              {turno.codigo}
            </span>
            <TurnoCalendarioBadge estado={turno.estado} />
          </div>
        </div>
      </header>

      <div className="px-6 py-5">
        <ResumenReserva
          variante="grid"
          datos={[
            {
              label: "Alumno",
              icon: "person",
              valor: (
                <>
                  {turno.alumno.apellido}, {turno.alumno.nombre}
                  <span className="block text-xs font-medium text-on-surface-variant">
                    {turno.alumno.legajo}
                    {dniAlumno ? ` · DNI ${dniAlumno}` : ""}
                  </span>
                </>
              ),
            },
            {
              label: "Materia",
              icon: "menu_book",
              valor: (
                <>
                  {turno.materia.nombre}
                  <span className="block text-xs font-medium text-on-surface-variant">
                    {turno.materia.nivel}
                  </span>
                </>
              ),
            },
            { label: "Profesor", icon: "school", valor: `${turno.profesor.apellido}, ${turno.profesor.nombre}` },
            { label: "Fecha", icon: "event", valor: formatearFecha(turno.fecha) },
            {
              label: "Horario",
              icon: "schedule",
              valor: `${turno.horaInicio} – ${turno.horaFin} (${turno.materia.duracionClaseMinutos} min)`,
            },
            { label: "Valor de la clase", icon: "payments", valor: formatearPesos(turno.valorClaseCongelado) },
            { label: "Observaciones", icon: "notes", valor: turno.observaciones, ancho: true },
            {
              label: "Registrado por",
              icon: "badge",
              valor: `${turno.registradoPor.apellido}, ${turno.registradoPor.nombre} · ${formatearFechaHora(turno.fechaCreacion)}`,
              ancho: true,
            },
          ]}
        />
      </div>

      <footer className="flex flex-col-reverse gap-3 border-t border-outline-variant bg-surface-container-low px-6 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between print:hidden">
        <div className="flex flex-col gap-3 sm:flex-row">
          {/* OPCIONAL: imprimir comprobante. Si no se quiere, borrar este botón y `onImprimir`. */}
          {onImprimir && (
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={onImprimir}
              title="Abre el diálogo de impresión: elegí «Guardar como PDF»"
            >
              <Icon name="download" size={16} />
              PDF
            </Button>
          )}
          {/* OPCIONAL: enviar por email. Si no se quiere, borrar este botón y `onEnviarEmail`. */}
          {onEnviarEmail && (
            <Button
              type="button"
              variant="ghost"
              onClick={onEnviarEmail}
              disabled={enviandoEmail || !emailDestino}
              title={emailDestino ? `Enviar a ${emailDestino}` : "El alumno no tiene email cargado"}
            >
              <Icon name="mail" size={18} />
              {enviandoEmail ? "Enviando…" : "Enviar por email"}
            </Button>
          )}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href={hrefCalendario}
            className="inline-flex h-11 min-h-11 items-center justify-center gap-2 rounded-sm border border-secondary px-5 text-sm font-bold text-secondary transition-all duration-fast ease-out hover:bg-secondary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2"
          >
            <Icon name="calendar_view_month" size={18} />
            Ver en calendario
          </Link>
          <Button type="button" onClick={onNuevaReserva}>
            <Icon name="add" size={18} />
            Nueva reserva
          </Button>
        </div>
      </footer>
      {onEnviarEmail && !emailDestino && (
        <p className="px-6 pb-4 text-xs font-medium text-on-surface-variant print:hidden">
          El alumno no tiene email cargado: el comprobante no se puede enviar.
        </p>
      )}
    </section>
  );
}
