"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";

// Navegación lateral del sistema. Los módulos no desarrollados navegan con
// href="#" y quedan marcados como "Próximamente" (las pantallas activas son
// /profesores — HU-PRO-01 — y /materias — HU-MAT-01).
// BACKEND: no consume API; los nombres de ruta se
// definen acá y en el layout de cada módulo.
// Los nombres de `icon` son ligaduras de Material Symbols Outlined.
const NAV_ITEMS = [
  { label: "Dashboard", href: "#", icon: "dashboard", disabled: true },
  { label: "Sedes", href: "#", icon: "location_city", disabled: true },
  { label: "Turnos y Agenda", href: "#", icon: "calendar_month", disabled: true },
  { label: "Alumnos", href: "#", icon: "group", disabled: true },
  { label: "Cuerpo Docente", href: "/profesores", icon: "groups", disabled: false },
  { label: "Materias", href: "/materias", icon: "menu_book", disabled: false },
  { label: "Cobranzas", href: "#", icon: "receipt_long", disabled: true },
  { label: "Usuarios", href: "#", icon: "school", disabled: true },
  { label: "Reportes", href: "#", icon: "settings", disabled: true },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-outline-variant bg-surface-container-lowest">
      <div className="flex items-center gap-2.5 border-b border-outline-variant px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary">
          <Icon name="school" size={24} className="text-on-primary" />
        </div>
        <div>
          <p className="text-sm font-bold leading-tight text-on-surface">Centro Académico</p>
          <p className="text-xs font-medium text-on-surface-variant">Gestión académica</p>
        </div>
      </div>

      <nav aria-label="Navegación principal" className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ label, href, icon, disabled }) => {
            const active = !disabled && pathname === href;
            return (
              <li key={label}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  aria-disabled={disabled}
                  tabIndex={disabled ? -1 : undefined}
                  className={`flex min-h-11 items-center gap-3 rounded-sm px-3 text-sm font-semibold transition-colors duration-fast ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary ${
                    disabled
                      ? "cursor-not-allowed text-on-surface-variant/50"
                      : active
                        ? "bg-primary text-on-primary"
                        : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                  }`}
                >
                  <Icon name={icon} size={20} className="shrink-0" />
                  {label}
                  {disabled && (
                    <span className="ml-auto rounded-full bg-surface-container-high px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
                      Próx.
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-outline-variant px-5 py-4">
        <p className="text-xs font-medium text-on-surface-variant">
          Diseño UI — v0.1 · datos placeholder
        </p>
      </div>
    </aside>
  );
}