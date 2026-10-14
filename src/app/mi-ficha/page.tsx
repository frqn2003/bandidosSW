// src/app/mi-ficha/page.tsx
//
// Ruta del módulo "Mi Ficha" para el rol Profesor.
// Protegida con RequiereSesion y ToastProvider.

import { RequiereSesion } from "@/components/auth/RequiereSesion";
import { ToastProvider } from "@/components/ui/Toast";
import { MiFichaPage } from "@/components/profesores/MiFichaPage";

export const metadata = {
  title: "Mi Ficha Docente | Centro Académico",
  description: "Ficha del profesor con datos personales y gestión de disponibilidad horaria.",
};

export default function MiFichaRoute() {
  return (
    <RequiereSesion>
      <ToastProvider>
        <MiFichaPage />
      </ToastProvider>
    </RequiereSesion>
  );
}
