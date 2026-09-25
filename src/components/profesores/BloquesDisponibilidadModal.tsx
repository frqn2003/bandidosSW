"use client";

import { useMemo, useState } from "react";
import type { Profesor } from "@/data/profesores";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { HorarioAcademia, useAgendaAcademia } from "@/components/profesores/HorarioAcademia";
import {
  DIAS_SEMANA_SELECT,
  horariosDesde,
  bloquesDesdeFranjas,
  franjasDesdeBloques,
  horariosHasta,
  horasEntre,
  validarFranjas,
  type FranjaForm,
} from "@/funciones/profesores";

interface BloquesDisponibilidadModalProps {
  profesor: Profesor | null;
  open: boolean;
  onClose: () => void;
  onGuardar: (bloquesPorDia: Record<number, string[]>) => void | Promise<void>;
}

/**
 * Editor de bloques de disponibilidad (HU-PRO-01). Reemplaza a la matriz de 30
 * minutos: edita SOLO los bloques ya cargados del profesor con la misma UI de
 * franjas del formulario (día + De/A + duración + 🗑) y valida superposiciones.
 */
export function BloquesDisponibilidadModal({
  profesor,
  open,
  onClose,
  onGuardar,
}: BloquesDisponibilidadModalProps) {
  const [franjas, setFranjas] = useState<FranjaForm[]>([]);
  const [envio, setEnvio] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const horario = useAgendaAcademia(profesor?.academiaId ?? null, open);

  // Al abrir con un profesor distinto, copia sus bloques actuales como franjas.
  const key = profesor?.id ?? -1;
  const [visto, setVisto] = useState<number | null>(null);
  if (open && profesor && visto !== key) {
    setFranjas(franjasDesdeBloques(profesor.bloquesPorDia));
    setEnvio(false);
    setVisto(key);
  }
  if (!open && visto !== null) setVisto(null);

  const actualizarFranja = (id: number, patch: Partial<Omit<FranjaForm, "id">>) => {
    setFranjas((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  /**
   * Cambiar la hora de inicio limpia una hora de fin que ya no sea posterior:
   * el select de fin solo ofrece horarios mayores, así que dejar el valor viejo
   * mostraría una opción que ya no está en la lista.
   */
  const cambiarDesde = (id: number, desde: string) => {
    setFranjas((prev) =>
      prev.map((f) =>
        f.id === id
          ? { ...f, desde, hasta: horariosHasta(desde, horario.franjas, f.dia).includes(f.hasta) ? f.hasta : "" }
          : f,
      ),
    );
  };

  const quitarFranja = (id: number) => {
    setFranjas((prev) => prev.filter((f) => f.id !== id));
  };

  // El guardado lo hace la página (guardarDisponibilidad → /api/disponibilidad).
  // Las franjas a medias suman 0: la hora de fin todavía no se eligió.
  const totalHoras = useMemo(
    () =>
      Math.round(franjas.reduce((acc, f) => acc + horasEntre(f.desde, f.hasta), 0) * 10) / 10,
    [franjas],
  );

  const erroresFranjas = useMemo(
    () => horario.habilitado
      ? validarFranjas(envio ? franjas : franjas.filter((f) => f.desde && f.hasta), horario.franjas)
      : {},
    [envio, franjas, horario.habilitado, horario.franjas],
  );
  const errorFranjasGeneral =
    envio && franjas.length === 0 ? "El profesor no tiene bloques cargados en este editor" : undefined;

  const guardar = async () => {
    setEnvio(true);
    const err = validarFranjas(franjas, horario.franjas);
    if (!horario.habilitado || Object.keys(err).length > 0 || franjas.length === 0) return;
    setGuardando(true);
    try {
      await onGuardar(bloquesDesdeFranjas(franjas));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Modificar Bloques de Disponibilidad — ${profesor ? `${profesor.apellido}, ${profesor.nombre}` : ""}`}
      icon={<Icon name="edit_calendar" size={22} className="text-primary" />}
      maxWidth="max-w-2xl"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={guardando}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={guardar}
            disabled={!horario.habilitado || guardando}
            aria-busy={guardando || undefined}
          >
            <Icon name={guardando ? "progress_activity" : "save"} size={16} />
            {guardando ? "Guardando…" : "Guardar bloques"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-xs font-medium text-on-surface-variant">
          Edita los bloques horarios ya cargados. La alta de nuevos bloques se hace desde{" "}
          <span className="font-semibold">Editar Profesor</span>.
        </p>

        <HorarioAcademia horario={horario} />

        {franjas.length === 0 ? (
          <p
            role="status"
            className="flex items-center gap-2 rounded-sm border border-dashed border-outline-variant bg-surface-container-lowest px-4 py-6 text-sm font-medium text-on-surface-variant"
          >
            <Icon name="info" size={18} className="shrink-0 text-secondary" />
            Este profesor no tiene bloques de disponibilidad cargados todavía.
          </p>
        ) : (
          <>
            <p className="text-sm font-semibold text-on-surface" aria-live="polite">
              Total activo programado: {totalHoras.toFixed(1)} h semanales asignables
            </p>
            {errorFranjasGeneral && (
              <p role="alert" className="text-sm font-semibold text-error">
                {errorFranjasGeneral}
              </p>
            )}
            <div className="flex flex-col gap-2">
              {franjas.map((franja) => {
                const inicios = horariosDesde(horario.franjas, franja.dia);
                const finales = horariosHasta(franja.desde, horario.franjas, franja.dia);
                return (
                  <div
                    key={franja.id}
                    className="flex flex-wrap items-center gap-2 rounded-sm border border-outline-variant bg-surface-container-low px-3 py-2"
                  >
                    <div className="flex min-w-[9.5rem] flex-1 items-center gap-1.5">
                      <Select
                        id={`bloque-dia-${franja.id}`}
                        aria-label="Día de la franja"
                        value={franja.dia}
                        disabled={!horario.habilitado}
                        onChange={(e) => actualizarFranja(franja.id, { dia: e.target.value, desde: "", hasta: "" })}
                        className="h-11 min-h-11 w-full px-2 text-sm"
                      >
                        {!horario.dias.some((d) => d.value === franja.dia) && (
                          <option value={franja.dia} disabled>
                            {DIAS_SEMANA_SELECT.find((d) => d.value === franja.dia)?.label ?? "Día"} · no disponible
                          </option>
                        )}
                        {horario.dias.map((d) => (
                          <option key={d.value} value={d.value}>
                            {d.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="flex min-w-[9.5rem] flex-1 items-center gap-1.5">
                      <span className="text-xs font-bold text-on-surface-variant">De:</span>
                      <Select
                        id={`bloque-desde-${franja.id}`}
                        aria-label={`Hora de inicio del día ${franja.dia}`}
                        value={franja.desde}
                        disabled={!horario.habilitado || inicios.length === 0}
                        onChange={(e) => cambiarDesde(franja.id, e.target.value)}
                        className="h-11 min-h-11 w-full px-2 text-sm"
                      >
                        {/* Obligatoria y primera: sin ella no se habilita la hora de fin. */}
                        <option value="" disabled>
                          Elegí hora
                        </option>
                        {franja.desde && !inicios.includes(franja.desde) && (
                          <option value={franja.desde} disabled>{franja.desde} · fuera de horario</option>
                        )}
                        {inicios.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="flex min-w-[9.5rem] flex-1 items-center gap-1.5">
                      <span className="text-xs font-bold text-on-surface-variant">A:</span>
                      <Select
                        id={`bloque-hasta-${franja.id}`}
                        aria-label={`Hora de fin del día ${franja.dia}`}
                        value={franja.hasta}
                        disabled={!horario.habilitado || finales.length === 0}
                        title={!franja.desde ? "Elegí primero la hora de inicio" : undefined}
                        onChange={(e) => actualizarFranja(franja.id, { hasta: e.target.value })}
                        className="h-11 min-h-11 w-full px-2 text-sm"
                      >
                        <option value="" disabled>
                          {franja.desde ? "Elegí hora" : "Elegí el inicio"}
                        </option>
                        {/* Solo horarios posteriores al inicio. */}
                        {franja.hasta && !finales.includes(franja.hasta) && (
                          <option value={franja.hasta} disabled>{franja.hasta} · fuera de horario</option>
                        )}
                        {finales.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <span className="w-12 text-right text-xs font-bold text-on-surface-variant">
                      {horasEntre(franja.desde, franja.hasta).toFixed(1)} h
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Quitar bloque horario del día ${franja.dia}`}
                      onClick={() => quitarFranja(franja.id)}
                      className="ml-auto"
                    >
                      <Icon name="delete" size={20} />
                    </Button>
                    {erroresFranjas[franja.id] && (
                      <p role="alert" className="w-full text-sm font-semibold text-on-surface">
                        {erroresFranjas[franja.id]}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}