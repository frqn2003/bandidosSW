// src/app/reportes/page.tsx
//
// Ruta del módulo "Indicadores y Tableros" (HU-IND-01).
// Protegida con RequiereSesion y ToastProvider.

import { ReportesView } from "@/components/indicadores/ReportesView";
import { RequiereSesion } from "@/components/auth/RequiereSesion";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata = {
  title: "Indicadores | Centro Académico",
  description: "Tablero de control y métricas de gestión académica.",
};

export default function ReportesRoute() {
  return (
    <RequiereSesion>
      <ToastProvider>
        <ReportesView />
      </ToastProvider>
    </RequiereSesion>
  );
}
