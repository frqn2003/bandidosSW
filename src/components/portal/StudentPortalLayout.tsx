// src/components/portal/StudentPortalLayout.tsx
//
// Layout principal del Portal del Alumno (HU-POR-01).
// Estética: Fondo gris claro (bg-slate-50), tarjetas blancas (shadow-sm), paleta institucional.
//
// Reglas de negocio y seguridad:
// 1. Menú estrictamente limitado a: "Reservar turno", "Mis turnos" y "Cerrar sesión".
// 2. Un alumno inactivo no llega acá: el back no le permite iniciar sesión (HU-POR-01).
// 3. El límite de turnos futuros lo informa la API (`MisTurnosResponse`).

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { useSesion } from "@/funciones/sesion";

interface StudentPortalLayoutProps {
  children: React.ReactNode;
  activeTab?: "reservar" | "mis-turnos";
}

export function StudentPortalLayout({
  children,
  activeTab,
}: StudentPortalLayoutProps) {
  const { sesion, cargando, cerrar } = useSesion();
  const pathname = usePathname();

  const [cerrandoSesion, setCerrandoSesion] = useState(false);

  const nombreAlumno = sesion?.usuario
    ? `${sesion.usuario.nombre || ""} ${sesion.usuario.apellido || ""}`.trim() || sesion.usuario.email
    : "Alumno";

  // `cerrar` del SesionProvider: llama a la API, limpia la sesión del front y
  // vuelve a "/". Si solo se llama a la API, el front sigue creyendo que hay
  // sesión y "/" lo devuelve al portal.
  const handleCerrarSesion = async () => {
    setCerrandoSesion(true);
    await cerrar();
  };

  if (cargando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-600">
          <Icon name="progress_activity" size={22} className="animate-spin text-secondary" />
          Cargando Portal del Alumno...
        </div>
      </div>
    );
  }

  // ─── PORTAL DEL ALUMNO: Navegación limitada y contenido ─────────────────────
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-800">
      {/* Header Institucional Superior */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white shadow-xs">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 h-16">
          {/* Logo y Rol */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-white shadow-xs">
              <Icon name="school" size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-base text-slate-900 leading-tight">
                  Centro Académico
                </span>
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary uppercase">
                  Portal del Alumno
                </span>
              </div>
              <p className="text-xs text-slate-500">Gestión de turnos de apoyo</p>
            </div>
          </div>

          {/* Menú de Navegación Estrictamente Limitado */}
          <nav aria-label="Menú del portal" className="hidden sm:flex items-center gap-1">
            <Link
              href="/portal/reservar"
              className={`inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-xs font-bold transition-colors ${
                activeTab === "reservar" || pathname.startsWith("/portal/reservar")
                  ? "bg-secondary text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon name="event_available" size={17} />
              Reservar turno
            </Link>

            <Link
              href="/portal/mis-turnos"
              className={`inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-xs font-bold transition-colors ${
                activeTab === "mis-turnos" || pathname.startsWith("/portal/mis-turnos")
                  ? "bg-secondary text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon name="event_note" size={17} />
              Mis turnos
            </Link>
          </nav>

          {/* Perfil del Alumno y Salida */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-900">{nombreAlumno}</span>
              <span className="text-[11px] text-slate-500">Rol: Alumno</span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              type="button"
              disabled={cerrandoSesion}
              onClick={handleCerrarSesion}
              className="gap-1.5 text-xs text-slate-600 hover:text-red-700 hover:bg-red-50"
              title="Cerrar sesión del portal"
            >
              <Icon name="logout" size={16} />
              <span className="hidden sm:inline">Cerrar sesión</span>
            </Button>
          </div>
        </div>

        {/* Menú móvil inferior */}
        <div className="flex sm:hidden border-t border-slate-100 bg-white px-2 py-1.5 justify-around">
          <Link
            href="/portal/reservar"
            className={`inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-bold ${
              activeTab === "reservar" || pathname.startsWith("/portal/reservar")
                ? "bg-secondary text-white"
                : "text-slate-600"
            }`}
          >
            <Icon name="event_available" size={16} />
            Reservar turno
          </Link>
          <Link
            href="/portal/mis-turnos"
            className={`inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-bold ${
              activeTab === "mis-turnos" || pathname.startsWith("/portal/mis-turnos")
                ? "bg-secondary text-white"
                : "text-slate-600"
            }`}
          >
            <Icon name="event_note" size={16} />
            Mis turnos
          </Link>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  );
}
