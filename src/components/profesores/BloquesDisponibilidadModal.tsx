"use client";

import { useMemo, useState } from "react";
import type { Profesor } from "@/data/profesores";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import {
  DIAS_SEMANA_SELECT,
  HORARIOS_OPCIONES,
  aMin,
  bloquesDesdeFranjas,
  franjasDesdeBloques,
  validarFranjas,
  type FranjaForm,
} from "@/lib/profesores";

interface BloquesDisponibilidadModalProps {
  profesor: Profesor | null;
  open: boolean;
  onClose: () => void;
  onGuardar: (bloquesPorDia: Record<number, string[]>) => void;
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

  const quitarFranja = (id: number) => {
    setFranjas((prev) => prev.filter((f) => f.id !== id));
  };

  // BACKEND: PUT /api/profesores/:id/disponibilidad (franjas → agenda_profesional)
  const totalHoras = useMemo(
    () =>
      Math.round(
        franjas.reduce((acc, f) => acc + (aMin(f.hasta) - aMin(f.desde)) / 60, 0) * 10,
      ) / 10,
    [franjas],
  );

  const horasDeFranja = (f: FranjaForm) =>
    aMin(f.hasta) > aMin(f.desde)
      ? Math.round(((aMin(f.hasta) - aMin(f.desde)) / 60) * 10) / 10
      : 0;

  const erroresFranjas = useMemo(
    () => (envio ? validarFranjas(franjas) : {}),
    [envio, franjas],
  );
  const errorFranjasGeneral =
    envio && franjas.length === 0 ? "El profesor no tiene bloques cargados en este editor" : undefined;

  const guardar = () => {
    setEnvio(true);
    const err = validarFranjas(franjas);
    if (Object.keys(err).length > 0 || franjas.length === 0) return;
    onGuardar(bloquesDesdeFranjas(franjas));
    onClose();
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
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" variant="primary" onClick={guardar}>
            <Icon name="check" size={16} />
            Guardar bloques
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-xs font-medium text-on-surface-variant">
          Edita los bloques horarios ya cargados. La alta de nuevos bloques se hace desde{" "}
          <span className="font-semibold">Editar Profesor</span>.
        </p>

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
                        onChange={(e) => actualizarFranja(franja.id, { dia: e.target.value })}
                        className="h-10 min-h-10 w-full px-2 text-sm"
                      >
                        {DIAS_SEMANA_SELECT.map((d) => (
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
                        onChange={(e) => actualizarFranja(franja.id, { desde: e.target.value })}
                        className="h-10 min-h-10 w-full px-2 text-sm"
                      >
                        {HORARIOS_OPCIONES.map((h) => (
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
                        onChange={(e) => actualizarFranja(franja.id, { hasta: e.target.value })}
                        className="h-10 min-h-10 w-full px-2 text-sm"
                      >
                        {HORARIOS_OPCIONES.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <span className="w-12 text-right text-xs font-bold text-on-surface-variant">
                      {horasDeFranja(franja).toFixed(1)} h
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
                      <p role="alert" className="w-full text-sm font-semibold text-error">
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