import { UsersPage } from "@/components/usuarios/UsersPage";
import { RequiereSesion } from "@/components/auth/RequiereSesion";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata = {
  title: "Gestión de Usuarios | Centro Académico",
};

export default function UsuariosRoute() {
  return (
    <RequiereSesion>
      <ToastProvider>
        <UsersPage />
      </ToastProvider>
    </RequiereSesion>
  );
}
