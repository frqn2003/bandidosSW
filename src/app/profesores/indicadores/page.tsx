// src/app/profesores/indicadores/page.tsx
//
// Ruta del módulo "Indicadores de Actividad del Profesor" (HU-IND-02).
// Protegida con RequiereSesion y ToastProvider.

import { RequiereSesion } from "@/components/auth/RequiereSesion";
import { ToastProvider } from "@/components/ui/Toast";
import { ProfessorDashboardPage } from "@/components/indicadores/profesor/ProfessorDashboardPage";

export const metadata = {
  title: "Indicadores de Actividad | Centro Académico",
  description: "Tablero de actividad y rendimiento académico para profesores.",
};

export default function ProfesorIndicadoresRoute() {
  return (
    <RequiereSesion>
      <ToastProvider>
        <ProfessorDashboardPage />
      </ToastProvider>
    </RequiereSesion>
  );
}
