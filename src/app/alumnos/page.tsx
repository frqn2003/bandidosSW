// src/app/alumnos/page.tsx
//
// Módulo: Gestión de Alumnos e Historial de Asistencia (HU-ALU-02).
// Renderiza la vista principal `StudentsPage` envuelta con `ToastProvider`.

import { ToastProvider } from "@/components/ui/Toast";
import { StudentsPage } from "@/components/alumnos/StudentsPage";

export default function Page() {
  return (
    <ToastProvider>
      <StudentsPage />
    </ToastProvider>
  );
}
