// src/components/alumnos/StudentDetailView.tsx
//
// Vista de Detalle y Bitácora del Alumno en Modo Lectura (HU-ALU-02).
// Alineada con el Design System y la coherencia visual del sistema.

"use client";

import React, { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { StatusBadge, type StatusVariant } from "@/components/ui/StatusBadge";
import { inicialesDe, tonoAvatarDe } from "@/funciones/formato";
import type { StudentUI, StudentAuditLog } from "@/modules/alumnos/types";

interface StudentDetailViewProps {
  student: StudentUI;
  auditLogs: StudentAuditLog[];
  onBack: () => void;
  onEdit: (student: StudentUI) => void;
  onReactivate: (student: StudentUI) => Promise<void>;
  reactivating?: boolean;
}

type TabType = "datos" | "turnos" | "asistencias" | "pagos" | "bitacora";

function formatearFecha(isoString?: string): string {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return isoString;
  }
}

export function StudentDetailView({
  student,
  auditLogs,
  onBack,
  onEdit,
  onReactivate,
  reactivating,
}: StudentDetailViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>("bitacora");
  const isInactive = student.estado === "inactivo";

  const getActionVariant = (accion: StudentAuditLog["accion"]): StatusVariant => {
    switch (accion) {
      case "Baja":
        return "danger";
      case "Modificación":
        return "warning";
      case "Alta":
        return "info";
      case "Reactivación":
        return "success";
      default:
        return "neutral";
    }
  };

  return (
    <div className="space-y-5">
      {/* Botón Volver */}
      <div>
        <Button variant="ghost" size="sm" type="button" onClick={onBack} className="text-secondary gap-1">
          <Icon name="arrow_back" size={18} />
          Volver al listado
        </Button>
      </div>

      {/* Header del Alumno */}
      <div className="rounded-md border border-outline-variant bg-surface-container-lowest p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-base font-bold ${tonoAvatarDe(
                student.id
              )}`}
            >
              {inicialesDe(student.nombre, student.apellido)}
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-display text-2xl font-bold text-on-surface">
                  {student.nombre} {student.apellido}
                </h1>
                <StatusBadge
                  variant={isInactive ? "neutral" : "success"}
                  icon={isInactive ? "cancel" : "check_circle"}
                  label={student.estado === "activo" ? "Activo" : "Inactivo"}
                />
                <span className="inline-flex items-center rounded-sm bg-surface-container-high px-2 py-0.5 text-xs font-bold text-on-surface-variant">
                  Modo LECTURA
                </span>
              </div>
              <p className="mt-1 text-xs font-medium text-on-surface-variant">
                Legajo {student.legajo} · Alta {formatearFecha(student.fechaCreacion)}
                {isInactive && ` · Baja ${formatearFecha(student.fechaActualizacion)}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {isInactive ? (
              <Button
                variant="primary"
                type="button"
                disabled={reactivating}
                onClick={() => onReactivate(student)}
              >
                <Icon
                  name="restart_alt"
                  size={18}
                  className={reactivating ? "animate-spin" : ""}
                />
                Reactivar alumno
              </Button>
            ) : (
              <Button variant="outline" type="button" onClick={() => onEdit(student)}>
                <Icon name="edit" size={18} />
                Editar ficha
              </Button>
            )}
          </div>
        </div>

        {/* Banner Informativo si el alumno está inactivo */}
        {isInactive && (
          <div className="mt-5 flex items-start gap-2.5 rounded-sm border border-secondary/30 bg-secondary/10 p-3.5 text-xs text-on-surface">
            <Icon name="info" size={18} className="text-secondary shrink-0 mt-0.5" />
            <p>
              <strong>Alumno inactivo:</strong> no aparece en combos ni buscadores de otros módulos. Al reactivarlo se vuelve a validar que el DNI sea único.
            </p>
          </div>
        )}

        {/* Pestañas de Navegación */}
        <div className="mt-6 border-b border-outline-variant">
          <nav aria-label="Secciones de la ficha" className="flex gap-6 -mb-px text-sm font-bold">
            {(
              [
                { id: "datos", label: "Datos" },
                { id: "turnos", label: "Turnos" },
                { id: "asistencias", label: "Asistencias" },
                { id: "pagos", label: "Pagos" },
                { id: "bitacora", label: "Bitácora" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3 border-b-2 transition-colors cursor-pointer ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* CONTENIDO DE LAS PESTAÑAS */}
        <div className="pt-6">
          {/* PESTAÑA: BITÁCORA DE AUDITORÍA */}
          {activeTab === "bitacora" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-bold text-on-surface">Bitácora</h3>
                <span className="text-xs font-medium text-on-surface-variant">Más reciente primero</span>
              </div>

              <div className="overflow-x-auto rounded-md border border-outline-variant">
                <table className="w-full min-w-[700px] border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-outline-variant bg-surface-container-low font-bold tracking-wider text-on-surface-variant uppercase text-[11px]">
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Hora</th>
                      <th className="px-4 py-3">Responsable</th>
                      <th className="px-4 py-3">Acción</th>
                      <th className="px-4 py-3">Campo</th>
                      <th className="px-4 py-3">Valor anterior</th>
                      <th className="px-4 py-3">Valor nuevo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/60 text-on-surface">
                    {auditLogs.length > 0 ? (
                      auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-surface-container-low/50 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap">{log.fecha}</td>
                          <td className="px-4 py-3 whitespace-nowrap tabular-nums">{log.hora}</td>
                          <td className="px-4 py-3 whitespace-nowrap font-medium">{log.responsable}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <StatusBadge
                              variant={getActionVariant(log.accion)}
                              label={log.accion}
                            />
                          </td>
                          <td className="px-4 py-3 font-semibold text-on-surface whitespace-nowrap">
                            {log.campo}
                          </td>
                          <td className="px-4 py-3 text-on-surface-variant">{log.valorAnterior}</td>
                          <td className="px-4 py-3 font-bold text-on-surface">{log.valorNuevo}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-on-surface-variant">
                          No hay registros de auditoría para este alumno.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PESTAÑA: DATOS (Modo LECTURA) */}
          {activeTab === "datos" && (
            <div className="space-y-5 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <span className="block text-xs font-bold text-on-surface-variant mb-1">Nombre</span>
                  <div className="rounded-sm border border-outline-variant bg-surface-container-high px-3 py-2 text-on-surface">
                    {student.nombre}
                  </div>
                </div>
                <div>
                  <span className="block text-xs font-bold text-on-surface-variant mb-1">Apellido</span>
                  <div className="rounded-sm border border-outline-variant bg-surface-container-high px-3 py-2 text-on-surface">
                    {student.apellido}
                  </div>
                </div>
                <div>
                  <span className="block text-xs font-bold text-on-surface-variant mb-1">DNI</span>
                  <div className="rounded-sm border border-outline-variant bg-surface-container-high px-3 py-2 font-mono text-on-surface">
                    {student.dni}
                  </div>
                </div>
                <div>
                  <span className="block text-xs font-bold text-on-surface-variant mb-1">Nivel educativo</span>
                  <div className="rounded-sm border border-outline-variant bg-surface-container-high px-3 py-2 text-on-surface">
                    {student.nivelEducativo}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <span className="block text-xs font-bold text-on-surface-variant mb-1">Institución de origen</span>
                  <div className="rounded-sm border border-outline-variant bg-surface-container-high px-3 py-2 text-on-surface">
                    {student.institucionOrigen || "—"}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <span className="block text-xs font-bold text-on-surface-variant mb-1">Materias de interés</span>
                  <div className="flex flex-wrap gap-1.5 p-2 rounded-sm border border-outline-variant bg-surface-container-high">
                    {student.materiasInteres && student.materiasInteres.length > 0 ? (
                      student.materiasInteres.map((m) => (
                        <span key={m.id} className="rounded-sm bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                          {m.nombre}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-on-surface-variant">—</span>
                    )}
                  </div>
                </div>
              </div>

              {student.responsable && (
                <div className="border-t border-outline-variant pt-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-3">
                    Datos del Responsable
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <span className="block text-xs font-bold text-on-surface-variant mb-1">Nombre</span>
                      <div className="rounded-sm border border-outline-variant bg-surface-container-high px-3 py-2 text-on-surface">
                        {student.responsable.nombre}
                      </div>
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-on-surface-variant mb-1">DNI</span>
                      <div className="rounded-sm border border-outline-variant bg-surface-container-high px-3 py-2 font-mono text-on-surface">
                        {student.responsable.dni}
                      </div>
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-on-surface-variant mb-1">Teléfono</span>
                      <div className="rounded-sm border border-outline-variant bg-surface-container-high px-3 py-2 text-on-surface">
                        {student.responsable.telefono}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* OTRAS PESTAÑAS (HISTORIAL) */}
          {(activeTab === "turnos" || activeTab === "asistencias" || activeTab === "pagos") && (
            <div className="rounded-md border border-dashed border-outline-variant p-8 text-center text-on-surface-variant">
              <Icon name="event_note" size={32} className="mx-auto text-on-surface-variant/50 mb-2" />
              <p className="text-sm font-bold text-on-surface capitalize">
                Historial de {activeTab} de {student.nombre}
              </p>
              <p className="text-xs text-on-surface-variant mt-1">
                Registros sincronizados con los módulos de {activeTab}.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
