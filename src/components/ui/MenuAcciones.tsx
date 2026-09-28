"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";

export interface AccionMenu {
  label: string;
  /** Ligadura de Material Symbols Outlined. */
  icon: string;
  onSelect: () => void;
  /** Acción destructiva (baja, eliminar): se pinta en rojo y va separada. */
  peligro?: boolean;
  disabled?: boolean;
}

interface MenuAccionesProps {
  acciones: AccionMenu[];
  /** Nombre accesible del botón, ej. "Acciones para Martín López". */
  ariaLabel: string;
}

const ANCHO_MENU = 208; // px, coincide con w-52

/**
 * Botón ⋮ que despliega las acciones de una fila (patrón menu button de WAI-ARIA).
 *
 * El panel va con `position: fixed` calculado desde el botón: las tablas viven
 * dentro de un `overflow-x-auto`, que recortaría un menú `absolute`. Se cierra
 * con Escape, click afuera, scroll o resize. Flechas ↑/↓, Home/End recorren las
 * opciones; al cerrar el foco vuelve al botón.
 */
export function MenuAcciones({ acciones, ariaLabel }: MenuAccionesProps) {
  const [abierto, setAbierto] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const botonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const cerrar = (devolverFoco = true) => {
    setAbierto(false);
    if (devolverFoco) botonRef.current?.focus();
  };

  // Posición: debajo del botón y alineado a su borde derecho; si no entra
  // abajo, se abre hacia arriba.
  useLayoutEffect(() => {
    if (!abierto || !botonRef.current) return;
    const r = botonRef.current.getBoundingClientRect();
    const alto = menuRef.current?.offsetHeight ?? 0;
    const abajo = r.bottom + 4 + alto <= window.innerHeight;
    setPos({
      top: abajo ? r.bottom + 4 : Math.max(8, r.top - 4 - alto),
      left: Math.max(8, r.right - ANCHO_MENU),
    });
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return;
    menuRef.current?.querySelector<HTMLButtonElement>("[role=menuitem]:not([disabled])")?.focus();

    const alClickAfuera = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !botonRef.current?.contains(t)) setAbierto(false);
    };
    const alMover = () => setAbierto(false);
    document.addEventListener("pointerdown", alClickAfuera);
    window.addEventListener("scroll", alMover, true);
    window.addEventListener("resize", alMover);
    return () => {
      document.removeEventListener("pointerdown", alClickAfuera);
      window.removeEventListener("scroll", alMover, true);
      window.removeEventListener("resize", alMover);
    };
  }, [abierto]);

  const alTeclado = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const items = [
      ...(menuRef.current?.querySelectorAll<HTMLButtonElement>("[role=menuitem]:not([disabled])") ?? []),
    ];
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    const mover = (n: number) => items[(n + items.length) % items.length]?.focus();
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        mover(i + 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        mover(i - 1);
        break;
      case "Home":
        e.preventDefault();
        mover(0);
        break;
      case "End":
        e.preventDefault();
        mover(items.length - 1);
        break;
      case "Escape":
        e.preventDefault();
        cerrar();
        break;
      case "Tab":
        cerrar(false);
        break;
    }
  };

  const normales = acciones.filter((a) => !a.peligro);
  const peligrosas = acciones.filter((a) => a.peligro);

  const item = (a: AccionMenu) => (
    <button
      key={a.label}
      type="button"
      role="menuitem"
      disabled={a.disabled}
      onClick={() => {
        cerrar();
        a.onSelect();
      }}
      className={`flex min-h-11 w-full items-center gap-3 px-4 text-left text-sm font-semibold transition-colors duration-fast ease-out focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
        a.peligro
          ? "text-status-danger hover:bg-status-danger/10 focus:bg-status-danger/10"
          : "text-on-surface hover:bg-surface-container-low focus:bg-surface-container-low"
      }`}
    >
      <Icon name={a.icon} size={18} className={a.peligro ? "text-status-danger" : "text-secondary"} />
      {a.label}
    </button>
  );

  return (
    <>
      <button
        ref={botonRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-controls={abierto ? menuId : undefined}
        onClick={() => setAbierto((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !abierto) {
            e.preventDefault();
            setAbierto(true);
          }
        }}
        className={`inline-flex h-11 w-11 items-center justify-center rounded-sm text-on-surface-variant transition-colors duration-fast ease-out hover:bg-secondary/10 hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary ${
          abierto ? "bg-secondary/10 text-secondary" : ""
        }`}
      >
        <Icon name="more_vert" size={20} />
      </button>

      {abierto && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={ariaLabel}
          onKeyDown={alTeclado}
          style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, width: ANCHO_MENU }}
          className="fixed z-50 overflow-hidden rounded-md border border-outline-variant bg-surface-container-lowest py-1 shadow-card print:hidden"
        >
          {normales.map(item)}
          {normales.length > 0 && peligrosas.length > 0 && (
            <div role="separator" className="my-1 border-t border-outline-variant" />
          )}
          {peligrosas.map(item)}
        </div>
      )}
    </>
  );
}
