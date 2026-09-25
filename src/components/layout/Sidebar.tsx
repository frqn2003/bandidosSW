"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
// BACKEND: no consume API. El rol sale de la sesión
// (`GET /api/auth/sesion` → contrato src/contracts/auth.ts).

export function Sidebar() {
  const pathname = usePathname();
  const { sesion, cerrar } = useSesion();

  const modulos = sesion ? modulosDe(sesion.usuario.rol.nombre) : MODULOS;
  const usuario = sesion?.usuario;

  return (
    <aside className="sticky top-0 flex h-dvh w-60 shrink-0 self-start flex-col justify-between border-r border-outline-variant bg-surface-container-lowest">
      <div className="flex items-center gap-2.5 border-b border-outline-variant px-5 py-5">
        <img
          src="/logo-centro-academico.png"
          alt="Logo de Centro Académico"
          width={40}
          height={40}
          className="h-10 w-10 shrink-0 rounded-md object-cover"
        />
        <div>
          <p className="text-sm font-bold leading-tight text-on-surface">Centro Académico</p>
          <p className="text-xs font-medium text-on-surface-variant">Gestión académica</p>
        </div>
      </div>

      <nav aria-label="Navegación principal" className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-1">
          {modulos.map(({ id, label, href, icon, construido }) => {
            const active = construido && pathname === href;
            return (
              <li key={id}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  aria-disabled={!construido}
                  tabIndex={construido ? undefined : -1}
                  className={`flex min-h-11 items-center gap-3 rounded-sm px-3 text-sm font-semibold transition-colors duration-fast ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary ${!construido
                      ? "cursor-not-allowed text-on-surface-variant/50"
                      : active
                        ? "bg-primary text-on-primary"
                        : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                    }`}
                >
                  <Icon name={icon} size={20} className="shrink-0" />
                  {label}
                  {!construido && (
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

      {usuario ? (
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
      ) : (
        <div className="border-t border-outline-variant px-5 py-4">
          <p className="text-xs font-medium text-on-surface-variant">
            Diseño UI — v0.1 · datos placeholder
          </p>
        </div>
      )}
    </aside>
  );
}
