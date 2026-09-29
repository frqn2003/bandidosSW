// src/app/pagos/page.tsx
//
// Módulo: Gestión de Pagos (HU-PAG-01).
// Renderiza la vista principal `PaymentsPage` envuelta con `ToastProvider`.

import { ToastProvider } from "@/components/ui/Toast";
import { PaymentsPage } from "@/components/pagos/PaymentsPage";

export default function Page() {
  return (
    <ToastProvider>
      <PaymentsPage />
    </ToastProvider>
  );
}
