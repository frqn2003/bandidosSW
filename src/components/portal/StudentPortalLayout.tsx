// src/components/portal/StudentPortalLayout.tsx
//
// Layout principal del Portal del Alumno (HU-POR-01).
// Estética: Fondo gris claro (bg-slate-50), tarjetas blancas (shadow-sm), paleta institucional.
//
// Reglas de negocio y seguridad:
// 1. Menú estrictamente limitado a: "Reservar turno", "Mis turnos" y "Cerrar sesión".
// 2. Si el alumno está inactivo: muestra "Notificación: no puede iniciar sesión" y bloquea el uso.
// 3. Panel de Auto-Testing para validar en vivo el bloqueo de inactivo y el límite de 5 turnos.

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { useSesion } from "@/funciones/sesion";
import { logout } from "@/data/auth";
import {
  isModoAlumnoInactivo,
  setModoAlumnoInactivo,
  simularLlenarLimiteTurnos,
  resetearTurnosPortalMemoria,
} from "@/data/portal";

interface StudentPortalLayoutProps {
  children: React.ReactNode;
  activeTab?: "reservar" | "mis-turnos";
  onRefrescarDatos?: () => void;
}

export function StudentPortalLayout({
  children,
  activeTab,
  onRefrescarDatos,
}: StudentPortalLayoutProps) {
  const { sesion, cargando } = useSesion();
  const pathname = usePathname();
  const router = useRouter();

  // Estados de simulación para auto-testing
  const [alumnoInactivoSimulado, setAlumnoInactivoSimulado] = useState(isModoAlumnoInactivo());
  const [panelTestingAbierto, setPanelTestingAbierto] = useState(false);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);

  const alumnoActivo = !alumnoInactivoSimulado;
  const nombreAlumno = sesion?.usuario
    ? `${sesion.usuario.nombre || ""} ${sesion.usuario.apellido || ""}`.trim() || sesion.usuario.email
    : "Alumno";

  const handleCerrarSesion = async () => {
    setCerrandoSesion(true);
    try {
      await logout();
      router.push("/");
    } catch {
      router.push("/");
    }
  };

  const toggleSimularInactivo = () => {
    const nuevo = !alumnoInactivoSimulado;
    setAlumnoInactivoSimulado(nuevo);
    setModoAlumnoInactivo(nuevo);
  };

  const handleSimular5Turnos = () => {
    simularLlenarLimiteTurnos();
    onRefrescarDatos?.();
  };

  const handleResetearTurnos = () => {
    resetearTurnosPortalMemoria();
    onRefrescarDatos?.();
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

  // ─── BLOQUEO: Alumno Inactivo (Diagrama de flujo) ───────────────────────────
  if (!alumnoActivo) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md rounded-lg border border-red-200 bg-white p-6 shadow-sm text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600 mb-4">
            <Icon name="block" size={30} />
          </div>

          <h2 className="font-display text-xl font-bold text-slate-800">
            Notificación: no puede iniciar sesión
          </h2>

          <div className="mt-3 rounded-md bg-red-50 p-3 text-xs text-red-700 leading-relaxed border border-red-100 text-left">
            <p>
              <strong>Ficha inactiva:</strong> Tu cuenta de alumno se encuentra suspendida o dada de
              baja en el sistema académico.
            </p>
            <p className="mt-1.5">
              Por razones administrativas no es posible operar ni reservar turnos desde el portal.
              Comunicate con <strong>Mesa de Entrada</strong> para reactivar tu ficha.
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-2">
            <Button
              variant="primary"
              size="sm"
              type="button"
              disabled={cerrandoSesion}
              onClick={handleCerrarSesion}
              className="w-full gap-2 bg-slate-800 hover:bg-slate-900"
            >
              <Icon name="logout" size={16} />
              Cerrar sesión
            </Button>

            {/* Opción rápida para volver a activar en auto-testing */}
            <button
              type="button"
              onClick={toggleSimularInactivo}
              className="mt-2 text-xs font-semibold text-secondary hover:underline cursor-pointer"
            >
              [Auto-Testing]: Desactivar simulación de inactivo y reingresar
            </button>
          </div>
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

      {/* Panel flotante de Auto-Testing (Obligatorio por consigna) */}
      <aside aria-label="Panel de pruebas" className="fixed bottom-3 right-3 z-40">
        <div className="rounded-lg border border-slate-300 bg-white/95 p-2 shadow-lg backdrop-blur-xs text-xs">
          <button
            type="button"
            onClick={() => setPanelTestingAbierto(!panelTestingAbierto)}
            className="flex items-center gap-1.5 font-bold text-slate-700 hover:text-primary cursor-pointer px-1"
          >
            <Icon name="bug_report" size={16} className="text-secondary" />
            <span>Panel de Auto-Testing (HU-POR-01)</span>
            <Icon name={panelTestingAbierto ? "expand_more" : "chevron_right"} size={16} />
          </button>

          {panelTestingAbierto && (
            <div className="mt-2.5 space-y-2 border-t border-slate-200 pt-2 text-[11px]">
              <p className="text-slate-500 font-medium">
                Probá los casos críticos exigidos por el criterio:
              </p>

              <div className="flex flex-col gap-1.5">
                <Button
                  variant="outline"
                  size="xs"
                  type="button"
                  onClick={toggleSimularInactivo}
                  className="w-full justify-start text-red-700 border-red-200 hover:bg-red-50"
                >
                  <Icon name="block" size={14} />
                  Simular alumno inactivo (bloqueo)
                </Button>

                <Button
                  variant="outline"
                  size="xs"
                  type="button"
                  onClick={handleSimular5Turnos}
                  className="w-full justify-start text-amber-700 border-amber-200 hover:bg-amber-50"
                >
                  <Icon name="warning" size={14} />
                  Simular 5 turnos futuros (límite rojo)
                </Button>

                <Button
                  variant="ghost"
                  size="xs"
                  type="button"
                  onClick={handleResetearTurnos}
                  className="w-full justify-start text-slate-600 hover:bg-slate-100"
                >
                  <Icon name="restart_alt" size={14} />
                  Restablecer turnos normales (2)
                </Button>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
