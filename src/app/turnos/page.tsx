"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RequiereSesion } from "@/components/auth/RequiereSesion";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Pagination } from "@/components/ui/Pagination";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import {
  DIAS_FINALIZADOS_AUTO,
  FiltrosTurnos,
  FILTROS_TURNOS_INICIALES,
  type ConteoTurnos,
  type FiltrosTurnosState,
} from "@/components/turnos/FiltrosTurnos";
import { TurnosTable } from "@/components/turnos/TurnosTable";
import { EditarTurnoModal } from "@/components/turnos/EditarTurnoModal";
import { CancelarTurnoModal } from "@/components/turnos/CancelarTurnoModal";
import { DetalleTurnoModal } from "@/components/turnos/DetalleTurnoModal";
import { estadoVisibleDe } from "@/funciones/estado-turno";
import { formatearFecha } from "@/funciones/formato";
import { hoyAR } from "@/contracts/alumno";
import {
  listarTurnos,
  obtenerMaxModificacionesTurno,
  sumarDias,
  type TurnoResponse,
} from "@/data/turnos";

// Pantalla /turnos (HU-TUR-02): listar, modificar, cancelar y ver turnos.
//
// Cómo se reparte el trabajo con el servidor (docs/capa-de-datos-front.md):
//  · Por rango y con `verCancelados=true` se traen los turnos Reservado y
//    Cancelado (GET /api/turnos?desde=&hasta=&verCancelados=true). El rango se
//    recorta al cambiar la barra; "Reservado"/"Cancelado" los delega al back.
//  · "Finalizado" NO existe en la base: se resuelve en el navegador sobre el
//    rango (decisión 1 del brief) con el helper estadoVisibleDe().
//  · Buscar y filtrar por estado se resuelven en memoria sobre ese conjunto
//    (debounce al back cuando el padrón crezca).
// Las mutaciones las hacen los modales → data/turnos → (fixture de la maqueta).

type EstadoCarga = "cargando" | "error" | "listo";

const TAMANOS_PAGINA = [10, 25, 50];

function TurnosContent() {
  const { showToast } = useToast();

  const [turnos, setTurnos] = useState<TurnoResponse[]>([]);
  const [estadoCarga, setEstadoCarga] = useState<EstadoCarga>("cargando");
  const [filtros, setFiltros] = useState<FiltrosTurnosState>(FILTROS_TURNOS_INICIALES);
  const [maxModificaciones, setMaxModificaciones] = useState(2);
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(TAMANOS_PAGINA[0]);
  const [detalle, setDetalle] = useState<TurnoResponse | null>(null);
  const [editar, setEditar] = useState<TurnoResponse | null>(null);
  const [cancelar, setCancelar] = useState<TurnoResponse | null>(null);

  // Trae el rango elegido. NO toca estado en el cuerpo del efecto: solo dentro
  // de los callbacks de la promesa (regla react-hooks/set-state-in-effect).
  const traer = useCallback(() => {
    let cancelado = false;
    // BACKEND: GET /api/turnos?desde=&hasta=&verCancelados=true
    listarTurnos({ desde: filtros.desde, hasta: filtros.hasta, verCancelados: true })
      .then((lista) => {
        if (cancelado) return;
        setTurnos(lista);
        setEstadoCarga("listo");
      })
      .catch(() => {
        if (!cancelado) setEstadoCarga("error");
      });
    return () => {
      cancelado = true;
    };
  }, [filtros.desde, filtros.hasta]);

  useEffect(traer, [traer]);

  // Tope de modificaciones (parametro max_modificaciones_turno). Se trae una
  // vez; los modales lo muestran en el contador y en los avisos.
  useEffect(() => {
    let cancelado = false;
    obtenerMaxModificacionesTurno()
      .then((max) => {
        if (!cancelado) setMaxModificaciones(max);
      })
      .catch(() => {
        if (!cancelado) setMaxModificaciones(2);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const reintentar = () => {
    setEstadoCarga("cargando");
    traer();
  };

  // Rango → al servidor; estado → en memoria (ver arriba).
  const cambiarFiltros = (next: FiltrosTurnosState) => {
    let resultado = next;
    // Al elegir "Finalizado" con un rango que no alcanza el pasado, se expande
    // solo a [hoy-30, hoy] para que el listado tenga sentido (decisión del
    // brief). Advertido en el chip informativo de FiltrosTurnos.
    if (next.estado === "Finalizado") {
      const hoy = hoyAR();
      if (next.desde >= hoy) {
        resultado = {
          ...next,
          desde: sumarDias(hoy, -DIAS_FINALIZADOS_AUTO),
          hasta: next.hasta < hoy ? hoy : next.hasta,
        };
      }
    }
    const cambiaRango = resultado.desde !== filtros.desde || resultado.hasta !== filtros.hasta;
    setFiltros(resultado);
    setPagina(1);
    if (cambiaRango) setEstadoCarga("cargando");
  };

  const conteo = useMemo<ConteoTurnos>(() => {
    const c: ConteoTurnos = { Reservado: 0, Finalizado: 0, Cancelado: 0 };
    for (const t of turnos) c[estadoVisibleDe(t)] += 1;
    return c;
  }, [turnos]);

  const filtrados = useMemo(() => {
    const q = filtros.busqueda.trim().toLowerCase();
    return turnos
      .filter((t) => {
        if (filtros.estado && estadoVisibleDe(t) !== filtros.estado) return false;
        if (q) {
          const campos = `${t.codigo} ${t.alumno.legajo} ${t.alumno.dni ?? ""} ${t.alumno.nombre} ${t.alumno.apellido}`.toLowerCase();
          if (!campos.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) =>
        a.fecha === b.fecha ? a.horaInicio.localeCompare(b.horaInicio) : a.fecha.localeCompare(b.fecha),
      );
  }, [turnos, filtros]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / porPagina));
  const paginaActual = Math.min(pagina, totalPaginas);
  const desde = (paginaActual - 1) * porPagina;
  const visibles = filtrados.slice(desde, desde + porPagina);

  const rangoVacio = turnos.length === 0;

  const reemplazarTurno = (actualizado: TurnoResponse) => {
    setTurnos((prev) => prev.map((t) => (t.id === actualizado.id ? actualizado : t)));
  };

  const guardado = (turno: TurnoResponse, mensaje: string) => {
    reemplazarTurno(turno);
    showToast("success", mensaje);
  };

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />

      <main className="flex-1 px-6 py-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-5">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-md bg-primary-container/30">
                <Icon name="event_note" size={24} className="text-primary" />
              </span>
              <div>
                <h1 className="font-display text-2xl font-bold text-on-surface">Turnos</h1>
                <p className="text-sm font-medium text-on-surface-variant">
                  Listá, modificá y cancelá turnos reservados
                </p>
              </div>
            </div>
            <Link
              href="/turnos/reservas"
              className="inline-flex h-11 min-h-11 items-center justify-center gap-2 rounded-sm bg-primary px-5 text-sm font-bold text-on-primary transition-all duration-fast ease-out hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              <Icon name="event_available" size={16} />
              Reservar turno
            </Link>
          </header>

          <FiltrosTurnos
            estado={filtros}
            conteo={conteo}
            onChange={cambiarFiltros}
            onLimpiar={() => cambiarFiltros(FILTROS_TURNOS_INICIALES())}
          />

          {estadoCarga === "cargando" && (
            <div
              role="status"
              aria-live="polite"
              className="flex flex-col gap-2 rounded-md border border-outline-variant bg-surface-container-lowest p-4"
            >
              <span className="sr-only">Cargando turnos…</span>
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} aria-hidden="true" className="h-11 animate-pulse rounded-sm bg-surface-container-high" />
              ))}
            </div>
          )}

          {estadoCarga === "error" && (
            <section
              role="alert"
              className="flex flex-col items-center gap-3 rounded-md border border-error/40 bg-error/5 px-6 py-12 text-center"
            >
              <Icon name="error" size={40} className="text-error" />
              <h2 className="text-lg font-bold text-on-surface">No pudimos cargar los turnos</h2>
              <p className="max-w-sm text-sm font-medium text-on-surface-variant">
                Revisá la conexión y volvé a intentar. Si el problema sigue, avisá al equipo.
              </p>
              <Button type="button" variant="outline" onClick={reintentar}>
                <Icon name="refresh" size={16} />
                Reintentar
              </Button>
            </section>
          )}

          {estadoCarga === "listo" &&
            (filtrados.length === 0 ? (
              <section
                role="status"
                className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-outline-variant bg-surface-container-lowest px-6 py-16 text-center"
              >
                <Icon
                  name={rangoVacio ? "event_busy" : "filter_alt_off"}
                  size={40}
                  className="text-on-surface-variant"
                />
                <h2 className="text-lg font-bold text-on-surface">
                  {rangoVacio ? "No hay turnos en este rango" : "No hay turnos que coincidan"}
                </h2>
                <p className="max-w-sm text-sm font-medium text-on-surface-variant">
                  {rangoVacio
                    ? `Entre el ${formatearFecha(filtros.desde)} y el ${formatearFecha(filtros.hasta)} no hay turnos ${filtros.estado === "" ? "" : filtros.estado.toLowerCase()} todavía.`
                    : "Ajustá la búsqueda o el filtro de estado para encontrar lo que buscás."}
                </p>
                {rangoVacio ? (
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <Link
                      href="/turnos/reservas"
                      className="inline-flex h-11 min-h-11 items-center justify-center gap-2 rounded-sm bg-primary px-5 text-sm font-bold text-on-primary transition-all duration-fast ease-out hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                    >
                      <Icon name="event_available" size={16} />
                      Reservar un turno
                    </Link>
                    {filtros.estado !== FILTROS_TURNOS_INICIALES().estado && (
                      <Button type="button" variant="outline" onClick={() => cambiarFiltros(FILTROS_TURNOS_INICIALES())}>
                        <Icon name="close" size={16} />
                        Limpiar filtros
                      </Button>
                    )}
                  </div>
                ) : (
                  <Button type="button" variant="outline" onClick={() => cambiarFiltros(FILTROS_TURNOS_INICIALES())}>
                    <Icon name="close" size={16} />
                    Limpiar filtros
                  </Button>
                )}
              </section>
            ) : (
              <>
                <TurnosTable
                  turnos={visibles}
                  maxModificaciones={maxModificaciones}
                  onVer={(t) => setDetalle(t)}
                  onModificar={(t) => setEditar(t)}
                  onCancelar={(t) => setCancelar(t)}
                />
                <Pagination
                  page={paginaActual}
                  totalPages={totalPaginas}
                  totalItems={filtrados.length}
                  pageStart={desde + 1}
                  pageEnd={desde + visibles.length}
                  pageSize={porPagina}
                  pageSizes={TAMANOS_PAGINA}
                  onPageChange={setPagina}
                  onPageSizeChange={setPorPagina}
                  itemLabel="turnos"
                />
              </>
            ))}
        </div>
      </main>

      <DetalleTurnoModal
        open={detalle !== null}
        turno={detalle}
        onClose={() => setDetalle(null)}
        maxModificaciones={maxModificaciones}
      />

      <EditarTurnoModal
        open={editar !== null}
        turno={editar}
        onClose={() => setEditar(null)}
        onGuardado={(t) => {
          guardado(t, `Turno ${t.codigo} modificado.`);
          setEditar(null);
        }}
      />

      <CancelarTurnoModal
        open={cancelar !== null}
        turno={cancelar}
        onClose={() => setCancelar(null)}
        onCancelado={(t) => {
          guardado(t, `Turno ${t.codigo} cancelado.`);
          setCancelar(null);
        }}
      />
    </div>
  );
}

export default function TurnosPage() {
  return (
    <RequiereSesion>
      <ToastProvider>
        <TurnosContent />
      </ToastProvider>
    </RequiereSesion>
  );
}