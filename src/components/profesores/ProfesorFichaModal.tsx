"use client";

import type { Profesor } from "@/data/profesores";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EstadoProfesorBadge } from "@/components/profesores/EstadoProfesorBadge";
import {
  DIAS_SEMANA_LARGOS,
  aMin,
  capacidadMaxDe,
  cargaHorariaSemanal,
  formatearFecha,
  formatearTelefono,
  horasDeRango,
  inicialesDe,
  jornadasConBloques,
  tonoAvatarDe,
} from "@/lib/profesores";

interface ProfesorFichaModalProps {
  profesor: Profesor | null;
  open: boolean;
  onClose: () => void;
  onEditar: (profesor: Profesor) => void;
}

/** Etiqueta de franja según el horario (demo): matutina / extendida / vespertina. */
function etiquetaFranja(desde: string, hasta: string): string {
  const desdeMin = aMin(desde);
  const hastaMin = aMin(hasta);
  if (desdeMin < 13 * 60) {
    return hastaMin > 13 * 60 ? "Franja matutina extendida" : "Franja matutina";
  }
  return "Franja vespertina";
}

/**
 * Ficha del profesor en modo LECTURA (HU-PRO-01). Diseño en bloques: identidad,
 * contacto, capacidad, materias, estadísticas y disponibilidad semanal en
 * tarjetas separadas. Reemplaza al modo LECTURA del formulario.
 */
export function ProfesorFichaModal({ profesor, open, onClose, onEditar }: ProfesorFichaModalProps) {
  if (!profesor) return null;

  const carga = cargaHorariaSemanal(profesor);
  const jornadas = jornadasConBloques(profesor);
  const capacidad = capacidadMaxDe(profesor);

  const diasConBloques = DIAS_SEMANA_LARGOS.map((label, i) => {
    const dia = i + 1;
    const rangos = profesor.bloquesPorDia[dia] ?? [];
    return { label, rangos };
  }).filter((d) => d.rangos.length > 0);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ficha del Profesor"
      subtitle={`Alta en sistema: ${formatearFecha(profesor.fechaCreacion)}`}
      icon={
        <span
          aria-hidden="true"
          className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${tonoAvatarDe(profesor.id)}`}
        >
          {inicialesDe(profesor.nombre, profesor.apellido)}
        </span>
      }
      titleExtra={
        <>
          <StatusBadge variant="info" label="MODO LECTURA" icon="visibility" />
          <EstadoProfesorBadge estado={profesor.estado} />
        </>
      }
      maxWidth="max-w-4xl"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          <Button type="button" variant="secondary" onClick={() => window.print()}>
            <Icon name="print" size={16} />
            Imprimir Ficha Docente
          </Button>
          <Button type="button" variant="primary" onClick={() => onEditar(profesor)}>
            <Icon name="edit" size={16} />
            Ir a Editar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {/* Identidad + Título + Contacto */}
        <section
          aria-label="Datos del profesor"
          className="grid gap-x-6 gap-y-5 rounded-md border border-outline-variant bg-surface-container-lowest p-4 sm:grid-cols-2"
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Nombre y Apellido
            </p>
            <p className="mt-1 text-sm font-semibold leading-snug text-on-surface">
              {profesor.nombre} {profesor.apellido}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Título / Especialidad
            </p>
            <p className="mt-1 text-sm font-semibold leading-snug text-on-surface">
              {profesor.tituloEspecialidad ?? "Sin título cargado"}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Correo Electrónico
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-on-surface">{profesor.email}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Teléfono de Contacto
            </p>
            <p className="mt-1 text-sm font-semibold text-on-surface">
              {formatearTelefono(profesor.telefono)}
            </p>
          </div>
        </section>

        {/* Capacidad por clase */}
        <section
          aria-label="Capacidad por clase"
          className="flex items-center gap-3 rounded-md border border-outline-variant bg-surface-container-low px-4 py-3"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-tertiary/15 text-on-tertiary-container">
            <Icon name="groups" size={20} />
          </span>
          <div>
            <p className="text-sm font-bold text-on-surface">
              Capacidad por Clase: Hasta {capacidad} alumnos por franja
            </p>
            <p className="text-xs font-medium text-on-surface-variant">
              {capacidad === 1 ? "Clase individual" : "Clases Grupales / Individuales"} ·{" "}
              Configuración predeterminada
            </p>
          </div>
        </section>

        {/* Materias asignadas */}
        <section aria-label="Materias asignadas" className="flex flex-col gap-2">
          <p className="text-sm font-bold text-on-surface">Materias Asignadas</p>
          <ul className="flex flex-wrap gap-1.5">
            {profesor.materias.map((m) => (
              <li
                key={m.materia.id}
                className="flex items-center gap-1.5 rounded-sm bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary"
              >
                <Icon name="menu_book" size={16} className="shrink-0" />
                {m.materia.nombre}
              </li>
            ))}
          </ul>
        </section>

        {/* Estadísticas */}
        <div className="grid gap-3 sm:grid-cols-3">
          <article className="rounded-md border border-outline-variant bg-surface-container-low p-4">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-on-surface-variant">
              <Icon name="schedule" size={16} />
              Carga Horaria Semanal
            </p>
            <p className="mt-1 text-3xl font-bold text-secondary">{carga.toFixed(1)} h</p>
            <p className="text-xs font-semibold text-secondary">
              Distribuidas en {jornadas} {jornadas === 1 ? "jornada" : "jornadas"}
            </p>
          </article>
          <article className="rounded-md border border-outline-variant bg-surface-container-low p-4">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-on-surface-variant">
              <Icon name="event_available" size={16} />
              Turnos Dictados Mes
            </p>
            <p className="mt-1 text-3xl font-bold text-status-success-strong">
              {profesor.turnosProgramados ?? "—"} {profesor.turnosProgramados === 1 ? "clase" : "clases"}
            </p>
            <p className="text-xs font-semibold text-status-success-strong">
              100% cumplidos a la fecha
            </p>
          </article>
          <article className="rounded-md border border-outline-variant bg-surface-container-low p-4">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-on-surface-variant">
              <Icon name="fact_check" size={16} />
              Presentismo Docente
            </p>
            <p className="mt-1 text-3xl font-bold text-on-surface">
              {profesor.presentismo != null ? `${profesor.presentismo}%` : "—"}
            </p>
            <p className="text-xs font-medium text-on-surface-variant">Sin ausencias no notificadas</p>
          </article>
        </div>

        {/* Disponibilidad semanal */}
        <section aria-label="Disponibilidad semanal habilitada" className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold text-on-surface">Disponibilidad Semanal Habilitada</p>
            <p className="flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant">
              <Icon name="location_city" size={16} className="text-secondary" />
              {/* BACKEND: academia del usuario (GET /api/usuarios/:id → academia.nombre) */}
              Sede Bloque B
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {diasConBloques.map((d) => (
              <article
                key={d.label}
                className="rounded-md border border-outline-variant bg-surface-container-low p-4"
              >
                <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                  <Icon name="calendar_month" size={16} />
                  {d.label}
                </p>
                {d.rangos.map((rango) => {
                  const [desde, hasta] = rango.split("-");
                  return (
                    <div key={rango} className="mt-2">
                      <p className="text-sm font-bold text-secondary">{desde} - {hasta}</p>
                      <p className="text-xs font-medium text-on-surface-variant">
                        {etiquetaFranja(desde, hasta)}
                      </p>
                      <p className="text-xs font-semibold text-secondary">
                        {horasDeRango(rango).toFixed(1)} h
                      </p>
                    </div>
                  );
                })}
              </article>
            ))}
          </div>
        </section>
      </div>
    </Modal>
  );
}