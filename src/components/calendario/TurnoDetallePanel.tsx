"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { ContadorModificaciones } from "@/components/turnos/ContadorModificaciones";
import { TurnoCalendarioBadge } from "./TurnoCalendarioBadge";
import type { TurnoCalendarioResponse } from "@/contracts/calendario";
import { fechaLarga } from "@/funciones/fechas-calendario";
import { tonoMateriaDe, type MapaTonos } from "@/funciones/paleta-materia";

// Panel lateral DERECHO con el detalle del turno en modo LECTURA (HU-CAL-02,
// decisión 3 del brief). Reemplaza al `TurnoDetalleModal`: el motivo es que el
// modal tapaba la grilla, y el objetivo de la pantalla es ver el turno Y su
// contexto (el resto de los turnos de la franja) a la vez.
//
// Los 9 campos son los del criterio de aceptación, en el orden del wireframe:
// código · estado · modificaciones · alumno · materia · profesor · fecha ·
// horario · observaciones.
//
// Modo LECTURA: acá no se edita nada. "Modificar" y "Cancelar turno" navegan a
// /turnos (decisión 4 del brief) — el deep-link `?turnoId=&accion=` es B6, o sea
// PENDIENTE BACKEND: mientras tanto el link abre /turnos con el filtro de
// profesor y la fecha del turno, que es lo que SÍ existe hoy.
//
// Accesibilidad: `role="complementary"` (es contenido complementario, no un
// dialogo modal que robó el foco), el foco entra al panel cuando se abre, se
// devuelve al elemento que lo abrió al cerrarse, y Escape cierra.

interface TurnoDetallePanelProps {
  turno: TurnoCalendarioResponse;
  /** "yyyy-mm-dd" del día: la fecha no viaja en `TurnoCalendarioResponse`. */
  fecha: string;
  /** Tope de modificaciones del sistema. */
  maxModificaciones: number;
  /** Tono por `materiaId`; lo arma la pantalla (ver `construirMapaTonos`). */
  mapaTonos: MapaTonos;
  /** `false` para el rol Profesor: no se renderizan los botones de edición. */
  mostrarAcciones: boolean;
  onClose: () => void;
  /** Elemento que abrió el panel, para devolverle el foco al cerrar. */
  origenRef?: React.RefObject<HTMLElement | null>;
}

function Dato({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">{label}</dt>
      <dd className="text-sm font-bold text-on-surface">{children}</dd>
    </div>
  );
}

export function TurnoDetallePanel({
  turno,
  fecha,
  maxModificaciones,
  mapaTonos,
  mostrarAcciones,
  onClose,
  origenRef,
}: TurnoDetallePanelProps) {
  const router = useRouter();
  const panelRef = useRef<HTMLElement>(null);
  const cerrarRef = useRef<HTMLButtonElement>(null);

  // Foco al abrir + Escape para cerrar. Al cerrar, el foco vuelve a la tarjeta.
  useEffect(() => {
    cerrarRef.current?.focus();
    const alTeclado = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      onClose();
      origenRef?.current?.focus();
    };
    document.addEventListener("keydown", alTeclado);
    return () => document.removeEventListener("keydown", alTeclado);
  }, [onClose, origenRef]);

  // Click en un lugar en blanco cierra el detalle y le devuelve el ancho a la
  // grilla. Se escucha en `pointerdown` (antes del click) y se filtra lo
  // interactivo: apretar OTRA tarjeta tiene que cambiar el detalle, no
  // cerrarlo, y apretar un `<td>`/`tr` de la grilla sí es "lugar en blanco".
  // Los `role="dialog"` (el modal de reserva) también quedan afuera: si no,
  // cerrar la reserva cerraría de rebote el detalle de otro turno.
  useEffect(() => {
    const alApuntar = (e: PointerEvent) => {
      const objetivo = e.target;
      if (!(objetivo instanceof Element)) return;
      if (panelRef.current?.contains(objetivo)) return;
      if (
        objetivo.closest(
          "button, a, input, select, textarea, summary, [role='button'], [role='switch'], [role='dialog']",
        )
      ) {
        return;
      }
      onClose();
    };
    document.addEventListener("pointerdown", alApuntar);
    return () => document.removeEventListener("pointerdown", alApuntar);
  }, [onClose]);

  const tono = tonoMateriaDe(turno.materia.id, mapaTonos);
  // `=== true` y no `!== false`: hoy el mapper NO emite los flags (B5), y un
  // `undefined` NO habilita la acción — el botón queda deshabilitado hasta que el
  // back los mande. Habilitar "a ciegas" sería mostrar una acción que después
  // falla, que es peor que no mostrarla.
  const puedeEditar = turno.estado === "Reservado" && turno.puedeModificar === true;
  const puedeCancelar = turno.estado === "Reservado" && turno.puedeCancelar === true;

  // Deep-link a /turnos (HU-CAL-02, B6). Se manda el turno y la acción
  // (`?turnoId=&accion=modificar|cancelar`) y /turnos abre el modal
  // correspondiente de un solo disparo. Además se manda el profesor y la fecha
  // del turno: hoy /turnos no los lee (su filtro es por rango), pero el día que
  // los lea la URL ya está lista.
  const hrefTurnos = (() => {
    const params = new URLSearchParams();
    if (turno.profesor.id) params.set("profesorId", String(turno.profesor.id));
    params.set("fecha", fecha);
    return `/turnos?${params.toString()}`;
  })();

  return (
    <aside
      ref={panelRef}
      role="complementary"
      aria-label={`Detalle del turno ${turno.codigo}`}
      className="flex flex-col gap-4 rounded-md border border-outline-variant bg-surface-container-lowest p-4 print:hidden"
    >
      <header className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
            Detalle del turno
          </span>
          <span className="truncate font-display text-lg font-bold text-on-surface">
            {turno.codigo}
          </span>
          <span
            className="flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant"
            aria-hidden="true"
          >
            <span className={`h-2.5 w-2.5 rounded-full ${tono.punto}`} />
            {turno.materia.nombre}
          </span>
        </div>
        <Button
          ref={cerrarRef}
          variant="ghost"
          size="icon"
          type="button"
          onClick={onClose}
          aria-label="Cerrar el detalle del turno"
          title="Cerrar"
        >
          <Icon name="close" size={20} />
        </Button>
      </header>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Dato label="Código">{turno.codigo}</Dato>
        <Dato label="Estado">
          <TurnoCalendarioBadge estado={turno.estado} />
        </Dato>
        <Dato label="Modificaciones">
          <ContadorModificaciones
            cantidad={turno.cantidadModificaciones ?? 0}
            maxModificaciones={maxModificaciones}
          />
        </Dato>
        <Dato label="Alumno">
          {turno.alumno.apellido}, {turno.alumno.nombre}
        </Dato>
        <Dato label="Materia">{turno.materia.nombre}</Dato>
        <Dato label="Profesor">
          {turno.profesor.apellido}, {turno.profesor.nombre}
        </Dato>
        <Dato label="Fecha">{fechaLarga(fecha)}</Dato>
        <Dato label="Horario">
          {turno.horaInicio} – {turno.horaFin}
        </Dato>
        <div className="flex flex-col gap-0.5 sm:col-span-2">
          <dt className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
            Observaciones
          </dt>
          <dd className="text-sm font-medium text-on-surface">
            {turno.observaciones || "—"}
          </dd>
        </div>
      </dl>

      <footer className="flex flex-col gap-2 border-t border-outline-variant pt-3">
        <p className="text-xs font-medium text-on-surface-variant">
          {!mostrarAcciones
            ? "Tu calendario es de solo lectura: Mesa de Entrada gestiona las reservas."
            : turno.estado === "Cancelado"
              ? "Este turno está cancelado: no se puede modificar ni cancelar de nuevo."
              : "Las modificaciones y las cancelaciones se gestionan desde Turnos."}
        </p>
        {mostrarAcciones && (
          // Sin íconos acá a propósito: son las dos acciones de una única fila
          // de un panel angosto y los íconos repetidos ("lápiz" / "prohibido")
          // sólo agregan ruido al lado del texto. Cancelar usa `outline-danger`
          // y no `ghost`: un texto rojo sin borde ni fondo sólo se pinta al
          // pasar el mouse, así que el usuario no lo reconoce como botón hasta
          // que lo descubre. Misma silueta que el "Cancelar" de los modales de
          // agenda, con el color de la acción destructiva.
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="md"
              type="button"
              disabled={!puedeEditar}
              title={
                puedeEditar
                  ? `Modificar ${turno.codigo} desde Turnos`
                  : "Este turno no se puede modificar"
              }
              onClick={() => router.push(`${hrefTurnos}&turnoId=${turno.id}&accion=modificar`)}
            >
              Modificar
            </Button>
            <Button
              variant="outline-danger"
              size="md"
              type="button"
              disabled={!puedeCancelar}
              title={
                puedeCancelar
                  ? `Cancelar ${turno.codigo} desde Turnos`
                  : "Este turno no se puede cancelar"
              }
              onClick={() => router.push(`${hrefTurnos}&turnoId=${turno.id}&accion=cancelar`)}
            >
              Cancelar
            </Button>
          </div>
        )}
      </footer>
    </aside>
  );
}
