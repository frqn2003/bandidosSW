"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { formatearFecha, inicialesDe, tonoAvatarDe } from "@/funciones/formato";
import { MODULOS, modulosDe } from "@/funciones/permisos";
import { useSesion } from "@/funciones/sesion";

// Navegación lateral del sistema.
//
// Los módulos y los permisos NO viven acá: vienen de `src/lib/permisos.ts`, la
// misma tabla que usa el guard `RequiereSesion`. Si cada uno tuviera su lista,
// el menú terminaría escondiendo algo que la ruta igual deja entrar.
//
// Sin sesión (o mientras se resuelve) se muestran todos los módulos en estado
// deshabilitado: el Sidebar nunca se renderiza fuera del guard, así que es solo
// el instante de carga.
//
// Colapsable con botón de panel (un solo control):
//   · expandido → w-60 con labels; el botón `left_panel_close` (activo) lo
//                 contrae.
//   · rail      → w-20 solo íconos con tooltip nativo (`title`) — sin flyout,
//                 para no duplicar el menú. El botón `left_panel_open`
//                 (inactivo) lo expande.
//   · El estado rail se persiste en localStorage["sidebar-estado"].
//   · La barra de scroll del nav se oculta con la utility `scrollbar-none`
//     (el desplazamiento sigue funcionando).
//
// BACKEND: no consume API. El rol sale de la sesión
// (`GET /api/auth/sesion` → contrato src/contracts/auth.ts).

const CLAVE_ESTADO = "sidebar-estado";

type ModuloDeMenu = (typeof MODULOS)[number];

/** Ítem de navegación: completo (label + chip "Próx.") o compacto (ícono solo). */
function ItemModulo({
  m,
  pathname,
  compacto,
}: {
  m: ModuloDeMenu;
  pathname: string;
  compacto: boolean;
}) {
  const active = m.construido && pathname === m.href;
  return (
    <li>
      <Link
        href={m.href}
        aria-current={active ? "page" : undefined}
        aria-disabled={!m.construido}
        tabIndex={m.construido ? undefined : -1}
        title={m.label}
        className={`flex min-h-11 items-center gap-3 rounded-sm text-sm font-semibold transition-colors duration-fast ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary ${
          compacto
            ? "justify-center px-0"
            : !m.construido
              ? "cursor-not-allowed px-3 text-on-surface-variant/50"
              : active
                ? "bg-primary px-3 text-on-primary"
                : "px-3 text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
        }`}
      >
        <Icon name={m.icon} size={20} className="shrink-0" />
        {!compacto && m.label}
        {!compacto && !m.construido && (
          <span className="ml-auto rounded-full bg-surface-container-high px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
            Próx.
          </span>
        )}
      </Link>
    </li>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { sesion, cerrar } = useSesion();

  const [rail, setRail] = useState(false);

  // La preferencia se lee DESPUÉS del primer render (useEffect) para no
  // romper la hidratación: el servidor no ve localStorage. El flash es mínimo
  // (arranca expandido un instante y se contrae si estaba guardado "rail").
  // Justificación: es una lectura única de un sistema externo (localStorage)
  // que debe ocurrir tras la hidratación; un initializer síncrono rompería el
  // SSR (mismatch entre lo que renderiza el servidor y el cliente).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRail(localStorage.getItem(CLAVE_ESTADO) === "rail");
  }, []);

  useEffect(() => {
    localStorage.setItem(CLAVE_ESTADO, rail ? "rail" : "expandido");
  }, [rail]);

  const modulos = sesion ? modulosDe(sesion.usuario.rol.nombre) : MODULOS;
  const usuario = sesion?.usuario;

  /** Pie de sesión: completo (expandido) o compacto (solo íconos en rail). */
  function pieUsuario(apretado: boolean) {
    if (!usuario) {
      return (
        <div className="border-t border-outline-variant px-2 py-4 text-center">
          <p className="text-xs font-medium text-on-surface-variant">
            Diseño UI — v0.1 · datos placeholder
          </p>
        </div>
      );
    }

    if (apretado) {
      return (
        <div className="flex flex-col items-center gap-3 border-t border-outline-variant px-2 py-4">
          <span
            title={`${usuario.nombre} ${usuario.apellido} · ${usuario.rol.nombre}`}
            className={`flex h-9 w-9 shrink-0 cursor-default items-center justify-center rounded-full text-xs font-bold ${tonoAvatarDe(usuario.id)}`}
          >
            {inicialesDe(usuario.nombre, usuario.apellido)}
          </span>
          <button
            type="button"
            onClick={() => void cerrar()}
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-sm text-on-surface-variant transition-colors duration-fast ease-out hover:bg-surface-container-low hover:text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
          >
            <Icon name="logout" size={18} />
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-3 border-t border-outline-variant px-4 py-4">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${tonoAvatarDe(usuario.id)}`}
          >
            {inicialesDe(usuario.nombre, usuario.apellido)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-on-surface">
              {usuario.nombre} {usuario.apellido}
            </p>
            <p className="truncate text-xs font-medium text-on-surface-variant">
              {usuario.rol.nombre}
            </p>
          </div>
        </div>

        {/* "Última conexión" (criterio opcional). BACKEND: último evento
            `login` de auditoria_sesion, anterior al actual. */}
        {sesion?.ultimaConexion && (
          <p className="text-[11px] font-medium text-on-surface-variant">
            Última conexión: {formatearFecha(sesion.ultimaConexion)}
          </p>
        )}

        <button
          type="button"
          onClick={() => void cerrar()}
          className="flex min-h-11 cursor-pointer items-center gap-2 rounded-sm px-2 text-sm font-semibold text-on-surface-variant transition-colors duration-fast ease-out hover:bg-surface-container-low hover:text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
        >
          <Icon name="logout" size={18} />
          Cerrar sesión
        </button>
      </div>
    );
  }

  return (
    <aside
      className={`sticky top-0 flex h-dvh shrink-0 self-start flex-col justify-between border-r border-outline-variant bg-surface-container-lowest transition-[width] duration-fast ease-out ${
        rail ? "w-20" : "w-60"
      }`}
    >
      <div
        className={
          rail
            ? "flex flex-col items-center gap-3 border-b border-outline-variant px-2 py-4"
            : "flex items-center gap-2.5 border-b border-outline-variant px-5 py-5"
        }
      >
        <img
          src="/logo-centro-academico.png"
          alt="Logo de Centro Académico"
          width={40}
          height={40}
          className="h-10 w-10 shrink-0 rounded-md object-cover"
        />

        {!rail && (
          <div className="min-w-0">
            <p className="text-sm font-bold leading-tight text-on-surface">Centro Académico</p>
            <p className="text-xs font-medium text-on-surface-variant">Gestión académica</p>
          </div>
        )}

        {/* Pin único (panel): fija (expande) o contrae el menú. */}
        <button
          type="button"
          onClick={() => setRail((r) => !r)}
          aria-label={rail ? "Fijar menú (expandir)" : "Contraer menú"}
          aria-pressed={!rail}
          title={rail ? "Fijar menú (expandir)" : "Contraer menú"}
          className={`flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-sm transition-colors duration-fast ease-out hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary ${
            rail
              ? "ml-0 text-on-surface-variant hover:text-on-surface"
              : "ml-auto text-primary hover:text-on-surface"
          }`}
        >
          <Icon name={rail ? "left_panel_open" : "left_panel_close"} size={20} filled={!rail} />
        </button>
      </div>

      <nav
        id="navegacion-principal"
        aria-label="Navegación principal"
        className="flex-1 overflow-y-auto scrollbar-none px-3 py-4"
      >
        <ul className="flex flex-col gap-1">
          {modulos.map((m) => (
            <ItemModulo key={m.id} m={m} pathname={pathname} compacto={rail} />
          ))}
        </ul>
      </nav>

      {pieUsuario(rail)}
    </aside>
  );
}