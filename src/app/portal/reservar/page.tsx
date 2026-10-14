// src/app/portal/reservar/page.tsx
//
// Pantalla "Reservar turno" del Portal del Alumno (HU-POR-01).

"use client";

import { ToastProvider } from "@/components/ui/Toast";
import { RequiereSesion } from "@/components/auth/RequiereSesion";
import { StudentPortalLayout } from "@/components/portal/StudentPortalLayout";
import { StudentTurnReservation } from "@/components/portal/StudentTurnReservation";

export default function PortalReservarPage() {
  return (
    <ToastProvider>
      <RequiereSesion>
        <StudentPortalLayout activeTab="reservar">
          <StudentTurnReservation />
        </StudentPortalLayout>
      </RequiereSesion>
    </ToastProvider>
  );
}
