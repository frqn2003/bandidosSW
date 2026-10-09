// src/app/reportes/page.tsx
//
// Ruta del módulo "Indicadores y Tableros" (HU-IND-01).
// Protegida con RequiereSesion y ToastProvider.

import { DashboardPage } from "@/components/indicadores/DashboardPage";
import { RequiereSesion } from "@/components/auth/RequiereSesion";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata = {
  title: "Indicadores de Gestión | Centro Académico",
  description: "Tablero de control y métricas de gestión académica y financiera.",
};

export default function ReportesRoute() {
  return (
    <RequiereSesion>
      <ToastProvider>
        <DashboardPage />
      </ToastProvider>
    </RequiereSesion>
  );
}
