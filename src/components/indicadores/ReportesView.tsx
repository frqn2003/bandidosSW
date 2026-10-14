// src/components/indicadores/ReportesView.tsx
//
// Componente de enrutamiento visual para el módulo de Indicadores.
// - Rol "Profesor": muestra los Indicadores de Actividad del Profesor (HU-IND-02).
// - Rol "Gerente": muestra exclusivamente los Indicadores de Gestión Global (HU-IND-01).

"use client";

import React from "react";
import { useSesion } from "@/funciones/sesion";
import { DashboardPage } from "./DashboardPage";
import { ProfessorDashboardPage } from "./profesor/ProfessorDashboardPage";

export function ReportesView() {
  const { sesion, cargando } = useSesion();

  // Esperar a que la sesión esté resuelta para evitar parpadeos y llamadas no autorizadas
  if (cargando || !sesion) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <span className="text-sm font-medium text-slate-500">Cargando indicadores…</span>
      </div>
    );
  }

  // Si el usuario tiene rol Profesor, ve exclusivamente su tablero de actividad (HU-IND-02)
  if (sesion.usuario.rol.nombre === "Profesor") {
    return <ProfessorDashboardPage />;
  }

  // Rol Gerente u otros autorizados: ven exclusivamente Indicadores de Gestión (HU-IND-01)
  return <DashboardPage />;
}
