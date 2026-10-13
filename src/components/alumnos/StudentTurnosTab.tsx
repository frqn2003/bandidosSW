// src/components/alumnos/StudentTurnosTab.tsx
//
// Pestaña "Turnos" en la Ficha del Alumno (Modo LECTURA).
// Conecta directamente con la capa de datos de turnos (HU-TUR-01 / HU-TUR-02)
// y muestra el historial de clases programadas, finalizadas y canceladas del alumno.

"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { EstadoTurnoBadge } from "@/components/turnos/EstadoTurnoBadge";
import { ContadorModificaciones } from "@/components/turnos/ContadorModificaciones";
import { DetalleTurnoModal } from "@/components/turnos/DetalleTurnoModal";
import { estadoVisibleDe } from "@/funciones/estado-turno";
import { formatearValor } from "@/data/materias";
import {
  listarTurnos,
  obtenerMaxModificacionesTurno,
  type TurnoResponse,
} from "@/data/turnos";
import type { NivelMateria } from "@/contracts/turno";
import type { StudentUI } from "@/modules/alumnos/types";

interface StudentTurnosTabProps {
  student: StudentUI;
}

const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function formatearFechaHoraTurno(fechaIso: string, hora: string): string {
  const soloFecha = fechaIso.slice(0, 10);
  const d = new Date(`${soloFecha}T00:00:00`);
  if (Number.isNaN(d.getTime())) return `${fechaIso} · ${hora}`;
  const weekday = DIAS_CORTOS[d.getDay()] ?? "";
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  return `${weekday} ${dia}/${mes} · ${hora}`;
}

export function StudentTurnosTab({ student }: StudentTurnosTabProps) {
  const [turnos, setTurnos] = useState<TurnoResponse[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [turnoSeleccionado, setTurnoSeleccionado] = useState<TurnoResponse | null>(null);
  const [maxModificaciones, setMaxModificaciones] = useState(2);

  // Carga inicial de turnos del alumno desde la API / fixtures
  useEffect(() => {
    let cancelado = false;

    Promise.all([
      listarTurnos({ alumnoId: student.id, verCancelados: true }).catch(() => []),
      obtenerMaxModificacionesTurno().catch(() => 2),
    ])
      .then(([turnosApi, maxMod]) => {
        if (cancelado) return;
        setMaxModificaciones(maxMod);

        if (turnosApi && turnosApi.length > 0) {
          setTurnos(turnosApi);
        } else if (student.turnosFuturos && student.turnosFuturos.length > 0) {
          // Sintetizar turnos si el alumno trae turnosFuturos en su fixture
          const turnosSinteticos: TurnoResponse[] = student.turnosFuturos.map((tf, idx) => ({
            id: tf.turnoId ?? 9000 + idx,
            codigo: tf.id,
            alumno: {
              id: student.id,
              legajo: student.legajo,
              dni: student.dni,
              nombre: student.nombre,
              apellido: student.apellido,
            },
            materia: {
              id: 1,
              nombre: tf.materia,
              nivel: (student.nivelEducativo as NivelMateria) ?? "Secundario",
              duracionClaseMinutos: 60,
            },
            profesor: {
              id: 1,
              nombre: "Profesor",
              apellido: "Asignado",
            },
            fecha: tf.fecha ?? new Date().toISOString().slice(0, 10),
            horaInicio: tf.fechaHora.includes("·") ? tf.fechaHora.split("·")[1].trim() : "15:00",
            horaFin: "16:00",
            valorClaseCongelado: 12500,
            estado: "Reservado",
            observaciones: null,
            cantidadModificaciones: 0,
            puedeModificar: true,
            puedeCancelar: true,
            registradoPor: { id: 1, nombre: "Mesa de", apellido: "Entrada" },
            fechaCreacion: new Date().toISOString(),
          }));
          setTurnos(turnosSinteticos);
        } else {
          setTurnos([]);
        }
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [student]);

  // Turnos filtrados
  const turnosFiltrados = useMemo(() => {
    return turnos.filter((t) => {
      if (filtroEstado === "todos") return true;
      const visible = estadoVisibleDe(t);
      if (filtroEstado === "reservados") return visible === "Reservado";
      if (filtroEstado === "finalizados") return visible === "Finalizado";
      if (filtroEstado === "cancelados") return visible === "Cancelado";
      return true;
    });
  }, [turnos, filtroEstado]);

  // Conteo de métricas
  const conteo = useMemo(() => {
    let reservados = 0;
    let finalizados = 0;
    let cancelados = 0;

    for (const t of turnos) {
      const v = estadoVisibleDe(t);
      if (v === "Reservado") reservados++;
      else if (v === "Finalizado") finalizados++;
      else if (v === "Cancelado") cancelados++;
    }

    return { total: turnos.length, reservados, finalizados, cancelados };
  }, [turnos]);

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-on-surface-variant">
        <Icon name="progress_activity" size={28} className="animate-spin text-secondary mb-2" />
        <p className="text-xs font-medium">Cargando turnos de {student.nombre}...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Barra superior de métricas y filtro */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-outline-variant bg-surface-container-low p-3.5">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-bold text-on-surface">Total: {conteo.total} turnos</span>
          <span className="text-outline-variant">·</span>
          <span className="inline-flex items-center gap-1 text-on-surface-variant">
            <span className="h-2 w-2 rounded-full bg-status-info-strong" />
            {conteo.reservados} activos/reservados
          </span>
          <span className="text-outline-variant">·</span>
          <span className="inline-flex items-center gap-1 text-on-surface-variant">
            <span className="h-2 w-2 rounded-full bg-slate-400" />
            {conteo.finalizados} finalizados
          </span>
          {conteo.cancelados > 0 && (
            <>
              <span className="text-outline-variant">·</span>
              <span className="inline-flex items-center gap-1 text-status-danger-strong">
                <span className="h-2 w-2 rounded-full bg-status-danger-strong" />
                {conteo.cancelados} cancelados
              </span>
            </>
          )}
        </div>

        {/* Filtro por estado */}
        <div className="flex items-center gap-1.5">
          <label htmlFor="filtro-estado-turnos" className="text-xs font-bold text-on-surface-variant">
            Estado:
          </label>
          <select
            id="filtro-estado-turnos"
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="rounded-sm border border-outline-variant bg-surface-container-lowest px-2.5 py-1 text-xs font-medium text-on-surface focus:border-secondary focus:outline-none"
          >
            <option value="todos">Todos ({conteo.total})</option>
            <option value="reservados">Reservados ({conteo.reservados})</option>
            <option value="finalizados">Finalizados ({conteo.finalizados})</option>
            <option value="cancelados">Cancelados ({conteo.cancelados})</option>
          </select>
        </div>
      </div>

      {/* Tabla de turnos */}
      {turnosFiltrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-outline-variant bg-surface-container-lowest p-10 text-center text-on-surface-variant">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant mb-3">
            <Icon name="calendar_month" size={24} />
          </div>
          <p className="text-sm font-bold text-on-surface">No se encontraron turnos</p>
          <p className="text-xs text-on-surface-variant mt-1">
            {turnos.length === 0
              ? `El alumno ${student.nombre} ${student.apellido} aún no posee clases registradas en el sistema.`
              : "No hay turnos con el estado seleccionado."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-outline-variant bg-surface-container-lowest shadow-card">
          <table className="w-full min-w-[760px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Materia</th>
                <th className="px-4 py-3">Profesor</th>
                <th className="px-4 py-3">Fecha y Horario</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-center">Modif.</th>
                <th className="px-4 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/60 text-on-surface">
              {turnosFiltrados.map((t) => {
                const visible = estadoVisibleDe(t);
                return (
                  <tr key={t.id} className="transition-colors hover:bg-surface-container-low/50">
                    <td className="px-4 py-3 font-mono font-bold text-primary">
                      {t.codigo}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-on-surface">{t.materia.nombre}</div>
                      <div className="text-[11px] text-on-surface-variant">{t.materia.nivel}</div>
                    </td>
                    <td className="px-4 py-3 font-medium text-on-surface">
                      {t.profesor.apellido}, {t.profesor.nombre}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatearFechaHoraTurno(t.fecha, t.horaInicio)}
                    </td>
                    <td className="px-4 py-3 font-mono font-medium text-on-surface">
                      {formatearValor(t.valorClaseCongelado)}
                    </td>
                    <td className="px-4 py-3">
                      <EstadoTurnoBadge estado={visible} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ContadorModificaciones
                        cantidad={t.cantidadModificaciones ?? 0}
                        maxModificaciones={maxModificaciones}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="outline"
                        size="xs"
                        type="button"
                        onClick={() => setTurnoSeleccionado(t)}
                        title="Ver detalle del turno"
                      >
                        <Icon name="visibility" size={15} />
                        Ver
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Detalle de Turno */}
      {turnoSeleccionado && (
        <DetalleTurnoModal
          open={Boolean(turnoSeleccionado)}
          turno={turnoSeleccionado}
          onClose={() => setTurnoSeleccionado(null)}
          maxModificaciones={maxModificaciones}
        />
      )}
    </div>
  );
}
