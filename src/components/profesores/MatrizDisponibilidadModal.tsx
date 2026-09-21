"use client";

import { useMemo, useState } from "react";
import type { Profesor } from "@/data/profesores";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";

const DIAS = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];
const HORA_INICIO = 8; // 08:00 — horario de atención de la sede
const BLOQUES_POR_DIA = 24; // 12 horas (08:00-20:00) × 2 bloques de 30 min

// Disponibilidad como matriz serializable: { diaIso: ["08:00", "08:30", ...] }.
export type MatrizSerializable = Record<number, string[]>;

const INDICE_DIA: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5 };

function horaEtiqueta(bloque: number): string {
  return `${String(HORA_INICIO + Math.floor(bloque / 2)).padStart(2, "0")}:${bloque % 2 === 0 ? "00" : "30"}`;
}

function rangoABloques(rango: string): number[] {
  // "08:00-10:00" → índices absolutos [0..24)
  const [inicio, fin] = rango.split("-");
  const aNum = (h: string) => {
    const [hh, mm] = h.split(":").map(Number);
    return ((hh - HORA_INICIO) * 60 + mm) / 30;
  };
  const out: number[] = [];
  for (let b = aNum(inicio); b < aNum(fin) && b < BLOQUES_POR_DIA; b++) out.push(b);
  return out;
}

// Estado local: matriz booleana [dia][bloque].
function matrizDesdeProfesor(p: Profesor): boolean[][] {
  const m = Array.from({ length: 6 }, () => Array<boolean>(BLOQUES_POR_DIA).fill(false));
  for (const [diaIso, rangos] of Object.entries(p.bloquesPorDia)) {
    const dia = INDICE_DIA[Number(diaIso)];
    if (dia === undefined) continue;
    for (const rango of rangos) for (const b of rangoABloques(rango)) m[dia][b] = true;
  }
  return m;
}

function serializar(m: boolean[][]): MatrizSerializable {
  const out: MatrizSerializable = {};
  m.forEach((dia, i) => {
    const activos = dia.map((v, b) => (v ? horaEtiqueta(b) : null)).filter(Boolean) as string[];
    out[i + 1] = activos;
  });
  return out;
}

interface MatrizDisponibilidadModalProps {
  profesor: Profesor | null;
  open: boolean;
  onClose: () => void;
  onGuardar: (matriz: MatrizSerializable) => void;
}

export function MatrizDisponibilidadModal({
  profesor,
  open,
  onClose,
  onGuardar,
}: MatrizDisponibilidadModalProps) {
  const [matriz, setMatriz] = useState<boolean[][] | null>(null);
  const [origen, setOrigen] = useState<number | null>(null);

  // Al abrir con un profesor, copia su disponibilidad actual.
  const key = profesor?.id ?? -1;
  const [visto, setVisto] = useState<number | null>(null);
  if (open && profesor && visto !== key) {
    setMatriz(matrizDesdeProfesor(profesor));
    setVisto(key);
  }
  if (!open && visto !== null) setVisto(null);

  const contarActivos = useMemo(() => {
    if (!matriz) return 0;
    return matriz.reduce((acc, dia) => acc + dia.filter(Boolean).length, 0);
  }, [matriz]);

  const alternar = (dia: number, bloque: number) => {
    if (!matriz) return;
    setMatriz((prev) => {
      if (!prev) return prev;
      const next = prev.map((d) => [...d]);
      next[dia][bloque] = !next[dia][bloque];
      return next;
    });
  };

  // Click+arrastre: pinta toda la fila del día (el mouse deja celdas y sigue).
  const pintarDia = (dia: number) => {
    if (!matriz) return;
    setMatriz((prev) => {
      if (!prev) return prev;
      const next = prev.map((d) => [...d]);
      const todoActivo = next[dia].every(Boolean);
      next[dia] = next[dia].map(() => !todoActivo);
      return next;
    });
  };

  const copiarDia = (origenDia: number) => {
    if (!matriz || origenDia === null) return;
    setMatriz((prev) => {
      if (!prev) return prev;
      const next = prev.map((d) => [...d]);
      next.forEach((dia, i) => {
        if (i !== origenDia) dia.forEach((_, b) => (dia[b] = prev[origenDia][b]));
      });
      return next;
    });
    setOrigen(null);
  };

  const guardar = () => {
    if (!matriz) return;
    // BACKEND: PUT /api/profesores/:id/disponibilidad → reemplaza agenda_profesional
    onGuardar(serializar(matriz));
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Disponibilidad semanal — ${profesor ? `${profesor.apellido}, ${profesor.nombre}` : ""}`}
      maxWidth="max-w-3xl"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" variant="primary" onClick={guardar}>
            Guardar disponibilidad
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="flex items-start gap-2 rounded-sm border border-outline-variant bg-surface-container-low px-3 py-2 text-xs font-medium text-on-surface-variant">
          <Icon name="info" size={16} className="mt-0.5 shrink-0 text-secondary" />
          Click en una celda: alternar bloque · Click sobre un día arriba: activar / vaciar todo el día
        </p>

        <div className="flex items-center gap-2">
          <label htmlFor="copiar-dia" className="text-sm font-bold text-on-surface">
            Copiar día
          </label>
          <select
            id="copiar-dia"
            value={origen ?? ""}
            onChange={(e) => setOrigen(e.target.value === "" ? null : Number(e.target.value))}
            className="h-9 cursor-pointer rounded-sm border border-outline-variant bg-surface-container-low px-3 text-sm font-semibold text-on-surface focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
          >
            <option value="">Elegir día…</option>
            {DIAS.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="secondary"
            disabled={origen === null}
            onClick={() => copiarDia(origen!)}
          >
            <Icon name="content_copy" size={16} />
            Aplicar a todos
          </Button>
        </div>

        <div
          className="overflow-x-auto rounded-md border border-outline-variant"
          role="grid"
          aria-label="Matriz de disponibilidad semanal, bloques de 30 minutos de 08:00 a 20:00"
        >
          <table className="w-full border-collapse text-center">
            <thead>
              <tr>
                <th scope="col" className="w-16 border-b border-r border-outline-variant bg-surface-container-low px-2 py-2 text-[11px] font-bold uppercase text-on-surface-variant">
                  Hora
                </th>
                {DIAS.map((d, i) => (
                  <th key={d} scope="col" className="border-b border-outline-variant bg-surface-container-low px-1 py-0">
                    <button
                      type="button"
                      onClick={() => pintarDia(i)}
                      aria-label={`Activar o vaciar todo el día ${d}`}
                      className="h-10 w-full cursor-pointer text-[11px] font-bold text-on-surface transition-colors duration-fast ease-out hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
                    >
                      {d}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: BLOQUES_POR_DIA }, (_, b) => (
                <tr key={b}>
                  <th
                    scope="row"
                    className="border-b border-r border-outline-variant/60 bg-surface-container-low/40 px-2 py-0.5 text-[11px] font-semibold text-on-surface-variant"
                  >
                    {horaEtiqueta(b)}
                  </th>
                  {DIAS.map((d, i) => {
                    const activo = matriz?.[i][b] ?? false;
                    return (
                      <td key={d} className="border-b border-outline-variant/40 p-0">
                        <button
                          type="button"
                          aria-label={`${d} ${horaEtiqueta(b)} ${activo ? "disponible" : "no disponible"}`}
                          aria-pressed={activo}
                          onClick={() => alternar(i, b)}
                          className={`h-7 w-full cursor-pointer transition-colors duration-fast ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary ${
                            activo ? "bg-secondary text-on-secondary" : "bg-surface-container-lowest hover:bg-surface-container-low"
                          }`}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-sm font-semibold text-on-surface" aria-live="polite">
          {contarActivos} {contarActivos === 1 ? "bloque activo" : "bloques activos"}
        </p>
      </div>
    </Modal>
  );
}