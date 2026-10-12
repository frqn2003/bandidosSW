// src/app/asistencia/page.tsx
//
// Módulo: Registro e Historial de Asistencia (HU-ASI-01).
// Vista principal: "Mis clases del día" para el rol Profesor.

"use client";

import { Suspense } from "react";
import { ToastProvider } from "@/components/ui/Toast";
import { RequiereSesion } from "@/components/auth/RequiereSesion";
import { Sidebar } from "@/components/layout/Sidebar";
import { TodaysClassesPage } from "@/components/asistencia/TodaysClassesPage";

export default function AsistenciaPage() {
  return (
    <ToastProvider>
      <RequiereSesion>
        <div className="flex min-h-screen bg-slate-50">
          <div className="print:hidden">
            <Sidebar />
          </div>
          <main className="flex-1 px-6 py-6 lg:px-8">
            <div className="mx-auto flex max-w-6xl flex-col gap-6">
              <Suspense fallback={null}>
                <TodaysClassesPage />
              </Suspense>
            </div>
          </main>
        </div>
      </RequiereSesion>
    </ToastProvider>
  );
}
