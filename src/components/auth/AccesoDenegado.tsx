"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Icon } from "@/components/ui/Icon";
import { inicioDe, type Modulo } from "@/funciones/permisos";
import type { NombreRol } from "@/contracts/rol";

interface AccesoDenegadoProps {
  rol: NombreRol;
  /** El módulo al que quiso entrar, si se pudo identificar. */
  modulo?: Modulo;
}

/**
 * Pantalla de acceso denegado (HU-SIS-01).
 *
 * Se muestra **en lugar** del contenido, dentro del layout y sin cambiar la
 * URL: así el usuario ve exactamente a dónde quiso entrar y puede copiar el
 * link para pedir permiso. Redirigir a otra ruta borraría esa información.
 *
 * El botón de salida lleva al primer módulo que el rol sí puede usar y lo
 * nombra: "Ir al inicio" significa algo distinto para cada rol, y un botón que
 * no dice a dónde lleva obliga a probar.
 *
 * Registra el intento como `acceso_denegado` en `auditoria_sesion`.
 */
export function AccesoDenegado({ rol, modulo }: AccesoDenegadoProps) {
  const destino = inicioDe(rol);

  useEffect(() => {
    fetch("/api/auth/acceso-denegado", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        modulo: modulo?.id,
        ruta: typeof window !== "undefined" ? window.location.pathname : undefined,
      }),
    }).catch(() => { });
  }, [modulo]);

  return (
    <section
      role="alert"
      className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center"
    >
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-error/10">
        <Icon name="lock" size={32} className="text-error" />
      </span>
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-bold text-on-surface">Acceso denegado</h1>
        <p className="max-w-md text-sm font-medium text-on-surface-variant">
          Tu rol ({rol}) no tiene acceso a{" "}
          <strong className="text-on-surface">{modulo?.label ?? "este módulo"}</strong>. Si creés
          que es un error, pedile al Gerente que revise tus permisos.
        </p>
      </div>
      {destino ? (
        // Un Link estilado como el Button primario: `ui/Button` es un <button>
        // y no navega. Mismas clases de foco y alto que el resto del sistema.
        <Link
          href={destino.href}
          className="inline-flex h-11 min-h-11 cursor-pointer items-center justify-center gap-2 rounded-sm bg-secondary px-5 text-sm font-bold text-on-secondary transition-all duration-fast ease-out hover:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          <Icon name="arrow_back" size={16} />
          Ir a {destino.label}
        </Link>
      ) : (
        // Un rol sin ningún módulo construido todavía (hoy, Profesor): mandarlo
        // a otra ruta sería un rebote infinito.
        <p className="text-sm font-medium text-on-surface-variant">
          Todavía no hay módulos disponibles para tu rol.
        </p>
      )}
    </section>
  );
}
