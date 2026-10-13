// src/app/portal/mis-turnos/page.tsx
//
// Pantalla "Mis turnos" del Portal del Alumno (HU-POR-01).

"use client";

import { ToastProvider } from "@/components/ui/Toast";
import { RequiereSesion } from "@/components/auth/RequiereSesion";
import { StudentPortalLayout } from "@/components/portal/StudentPortalLayout";
import { StudentMyTurns } from "@/components/portal/StudentMyTurns";

export default function PortalMisTurnosPage() {
  return (
    <ToastProvider>
      <RequiereSesion>
        <StudentPortalLayout activeTab="mis-turnos">
          <StudentMyTurns />
        </StudentPortalLayout>
      </RequiereSesion>
    </ToastProvider>
  );
}
