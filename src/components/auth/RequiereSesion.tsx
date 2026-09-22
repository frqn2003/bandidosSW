"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { AccesoDenegado } from "@/components/auth/AccesoDenegado";
import { AvisoInactividad } from "@/components/auth/AvisoInactividad";
import { Sidebar } from "@/components/layout/Sidebar";
import { moduloDeRuta, puedeVer } from "@/lib/permisos";
import { useSesion } from "@/lib/sesion";

/**
 * Guard de las pantallas con sesión (HU-SIS-01).
 *
 * Tres resultados posibles:
 *   · sin sesión        → redirige al login;
 *   · rol sin permiso   → muestra "Acceso denegado" **sin cambiar la URL**;
 *   · todo bien         → renderiza la pantalla.
 *
 * El módulo se deduce de la ruta con la misma tabla que arma el menú
 * (`src/lib/permisos.ts`), así lo que el Sidebar esconde es exactamente lo que
 * el guard bloquea.
 *
 * ⚠️ Esto es UX, no seguridad: se saltea desde las devtools en diez segundos.
 * Lo que protege los datos es `requireSession()` en cada endpoint del back.
 */
export function RequiereSesion({ children }: { children: ReactNode }) {
  const { sesion, cargando } = useSesion();
  const router = useRouter();
  const pathname = usePathname();

  // La redirección va en un efecto porque router.replace() durante el render
  // es un efecto secundario. El estado no se toca acá.
  useEffect(() => {
    if (!cargando && !sesion) router.replace("/");
  }, [cargando, sesion, router]);

  // Mientras se resuelve la sesión guardada: sin esto se vería un parpadeo de
  // la pantalla protegida antes de saber quién es el usuario.
  if (cargando || !sesion) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex min-h-screen flex-1 items-center justify-center bg-surface"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-on-surface-variant">
          <Icon name="progress_activity" size={20} />
          Verificando tu sesión…
        </span>
      </div>
    );
  }

  // Primer ingreso: no puede usar el sistema hasta cambiar la temporal.
  if (sesion.debeCambiarContrasena && pathname !== "/cambiar-contrasena") {
    return <RedirigirA ruta="/cambiar-contrasena" />;
  }

  const modulo = moduloDeRuta(pathname);
  if (modulo && !puedeVer(sesion.usuario.rol.nombre, modulo.id)) {
    // Con el Sidebar al lado, no sin él: el usuario rebotado tiene que poder
    // irse a un módulo que sí le corresponde sin volver atrás a ciegas. El
    // layout lo arma cada pantalla, así que acá se replica el mismo envoltorio.
    return (
      <div className="flex min-h-screen bg-surface">
        <Sidebar />
        <main className="flex flex-1 flex-col">
          <AccesoDenegado rol={sesion.usuario.rol.nombre} modulo={modulo} />
        </main>
        <AvisoInactividad />
      </div>
    );
  }

  return (
    <>
      {children}
      <AvisoInactividad />
    </>
  );
}

/** Redirección con pantalla de espera, para no dejar el contenido a la vista. */
function RedirigirA({ ruta }: { ruta: string }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(ruta);
  }, [router, ruta]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-screen flex-1 items-center justify-center bg-surface"
    >
      <span className="text-sm font-semibold text-on-surface-variant">Redirigiendo…</span>
    </div>
  );
}
