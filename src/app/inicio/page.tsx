"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { RequiereSesion } from "@/components/auth/RequiereSesion";
import { Sidebar } from "@/components/layout/Sidebar";
import { modulosDe } from "@/funciones/permisos";
import { useSesion } from "@/funciones/sesion";

/**
 * Pantalla de aterrizaje (HU-SIS-01).
 *
 * Existe por un caso que apareció en la verificación: el rol **Profesor** no
 * tiene todavía ningún módulo construido, así que al iniciar sesión no había a
 * dónde mandarlo y se quedaba mirando el formulario de login — con la sesión
 * abierta. Parecía que el login no había funcionado.
 *
 * Esta ruta es el destino neutro: siempre existe, no pertenece a ningún módulo
 * (así que no pasa por el control de permisos) y muestra el Sidebar para que el
 * usuario vea qué le va a corresponder cuando esos módulos existan.
 */
export default function InicioPage() {
  return (
    <RequiereSesion>
      <Contenido />
    </RequiereSesion>
  );
}

function Contenido() {
  const { sesion } = useSesion();
  if (!sesion) return null;

  const { usuario } = sesion;
  const modulos = modulosDe(usuario.rol.nombre);
  const disponibles = modulos.filter((m) => m.construido);

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      <main className="flex-1 px-6 py-6 lg:px-8">
        <div className="mx-auto flex max-w-3xl flex-col gap-6 py-10">
          <header className="flex flex-col gap-2">
            <h1 className="font-display text-2xl font-bold text-on-surface">
              Hola, {usuario.nombre}
            </h1>
            <p className="text-sm font-medium text-on-surface-variant">
              Ingresaste como <strong className="text-on-surface">{usuario.rol.nombre}</strong>
              {usuario.academia ? ` · ${usuario.academia.nombre}` : ""}.
            </p>
          </header>

          {disponibles.length > 0 ? (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-bold text-on-surface">Tus módulos</h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {disponibles.map((m) => (
                  <li key={m.id}>
                    <Link
                      href={m.href}
                      className="flex min-h-11 items-center gap-3 rounded-md border border-outline-variant bg-surface-container-lowest px-4 py-3 text-sm font-bold text-on-surface transition-colors duration-fast ease-out hover:border-secondary hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
                    >
                      <Icon name={m.icon} size={20} className="text-primary" />
                      {m.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <section
              role="status"
              className="flex flex-col items-center gap-3 rounded-md border border-dashed border-outline-variant bg-surface-container-lowest px-6 py-12 text-center"
            >
              <Icon name="construction" size={40} className="text-on-surface-variant" />
              <h2 className="text-lg font-bold text-on-surface">
                Todavía no hay módulos disponibles para tu rol
              </h2>
              <p className="max-w-md text-sm font-medium text-on-surface-variant">
                Los módulos de {usuario.rol.nombre} — {modulos.map((m) => m.label).join(", ")} — se
                están construyendo. Vas a verlos en el menú apenas estén listos.
              </p>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
