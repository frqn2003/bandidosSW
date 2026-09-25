"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CrearAlumnoBody, ErrorAlumno } from "@/contracts/alumno";
import { ApiError, mensajeDeError } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Pagination } from "@/components/ui/Pagination";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { Sidebar } from "@/components/layout/Sidebar";
import { RequiereSesion } from "@/components/auth/RequiereSesion";
import { AlumnosTable } from "@/components/alumnos/AlumnosTable";
import {
  AlumnoFormModal,
  type AlumnoFormData,
  type ModoAlumnoForm,
} from "@/components/alumnos/AlumnoFormModal";
import { DuplicadosModal } from "@/components/alumnos/DuplicadosModal";
import {
  FiltrosAlumnos,
  FILTROS_ALUMNOS_INICIALES,
  type FiltrosAlumnosState,
} from "@/components/alumnos/FiltrosAlumnos";
import {
  VACIO_COPY,
  crearAlumno,
  listarAlumnos,
  posiblesDuplicados,
  type AlumnoResponse,
} from "@/data/alumnos";

type EstadoCarga = "cargando" | "error" | "listo";

/** 20 registros por página (criterio opcional de la HU). */
const TAMANOS_PAGINA = [20, 50, 100];

type ErrorRemoto = {
  campo?: string;
  mensaje: string;
  accion?: { label: string; onClick: () => void };
};

function AlumnosContent() {
  const { showToast } = useToast();

  const [alumnos, setAlumnos] = useState<AlumnoResponse[]>([]);
  const [estadoCarga, setEstadoCarga] = useState<EstadoCarga>("cargando");
  const [filtros, setFiltros] = useState<FiltrosAlumnosState>(FILTROS_ALUMNOS_INICIALES);
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(TAMANOS_PAGINA[0]);
  const [modal, setModal] = useState<{ modo: ModoAlumnoForm; alumno: AlumnoResponse | null } | null>(
    null,
  );
  const [errorRemoto, setErrorRemoto] = useState<ErrorRemoto | null>(null);
  const [guardando, setGuardando] = useState(false);
  // Alta frenada por el aviso de duplicado, a la espera de "Cargar igual".
  const [pendiente, setPendiente] = useState<{
    body: CrearAlumnoBody;
    duplicados: AlumnoResponse[];
  } | null>(null);

  // Trae el listado. NO toca el estado en el cuerpo del efecto: solo dentro de
  // los callbacks de la promesa (regla react-hooks/set-state-in-effect).
  const traer = useCallback(() => {
    let cancelado = false;
    // Se pide el padrón completo y se filtra en memoria: el buscador responde
    // sin ir al servidor en cada tecla. `listarAlumnos` ya acepta los filtros
    // del contrato para cuando el listado crezca (ahí va un debounce).
    listarAlumnos()
      .then((lista) => {
        if (cancelado) return;
        setAlumnos(lista);
        setEstadoCarga("listo");
      })
      .catch(() => {
        if (!cancelado) setEstadoCarga("error");
      });
    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(traer, [traer]);

  const reintentar = () => {
    setEstadoCarga("cargando");
    traer();
  };

  const activos = useMemo(
    () => alumnos.filter((a) => a.estado === "activo").length,
    [alumnos],
  );

  const filtrados = useMemo(() => {
    const q = filtros.busqueda.trim().toLowerCase();
    return alumnos.filter((a) => {
      if (filtros.estado && a.estado !== filtros.estado) return false;
      // Buscador único: legajo, nombre, apellido o DNI; parcial e insensible a
      // mayúsculas (el mismo criterio que aplica `listarAlumnos`).
      if (q) {
        const campos = `${a.legajo} ${a.nombre} ${a.apellido} ${a.dni}`.toLowerCase();
        if (!campos.includes(q)) return false;
      }
      return true;
    });
  }, [alumnos, filtros]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / porPagina));
  const paginaActual = Math.min(pagina, totalPaginas);
  const desde = (paginaActual - 1) * porPagina;
  const visibles = filtrados.slice(desde, desde + porPagina);

  const hayFiltros = filtros.busqueda.trim() !== "" || filtros.estado !== "activo";

  const abrirAlta = () => {
    setErrorRemoto(null);
    setModal({ modo: "INSERCION", alumno: null });
  };
  const abrirFicha = (alumno: AlumnoResponse) => {
    setErrorRemoto(null);
    setModal({ modo: "LECTURA", alumno });
  };
  const cerrarModal = () => {
    setErrorRemoto(null);
    setModal(null);
  };

  /** Alta efectiva: ya pasó el aviso de duplicado (o no había). */
  const confirmarAlta = async (body: CrearAlumnoBody) => {
    setGuardando(true);
    setErrorRemoto(null);
    try {
      // BACKEND: POST /api/alumnos. La bitácora del alta (usuario, fecha y
      // hora) la escribe el trigger fn_auditoria() sobre la tabla `alumno`.
      const creado = await crearAlumno(body);
      // Se agrega lo que devolvió la API, no el borrador local: trae el `id` y
      // el legajo reales.
      setAlumnos((prev) => [...prev, creado]);
      showToast("success", `${creado.apellido}, ${creado.nombre} — legajo ${creado.legajo}.`);
      // El criterio pide que al guardar se muestre la ficha en modo LECTURA con
      // el legajo asignado: el mismo modal cambia de modo.
      setModal({ modo: "LECTURA", alumno: creado });
    } catch (e) {
      const codigo = (e instanceof ApiError ? e.codigo : undefined) as ErrorAlumno | undefined;
      if (codigo === "DNI_DUPLICADO") {
        // El contrato manda el legajo en `datos` para no parsear el mensaje.
        const datos = e instanceof ApiError ? e.datos : undefined;
        const idExistente = typeof datos?.id === "number" ? datos.id : undefined;
        setErrorRemoto({
          campo: "dni",
          mensaje: mensajeDeError(e),
          accion: idExistente
            ? {
                label: "Ver la ficha de ese alumno",
                onClick: () => {
                  const existente = alumnos.find((a) => a.id === idExistente);
                  if (existente) abrirFicha(existente);
                },
              }
            : undefined,
        });
      } else if (codigo === "RESPONSABLE_REQUERIDO") {
        setErrorRemoto({ campo: "responsableNombre", mensaje: mensajeDeError(e) });
      } else if (codigo === "FECHA_NACIMIENTO_INVALIDA") {
        setErrorRemoto({ campo: "fechaNacimiento", mensaje: mensajeDeError(e) });
      } else {
        setErrorRemoto({
          campo: e instanceof ApiError ? e.campo : undefined,
          mensaje: mensajeDeError(e),
        });
      }
    } finally {
      setGuardando(false);
    }
  };

  /** Lo que dispara el botón Guardar del formulario. */
  const guardar = async (body: CrearAlumnoBody, datos: AlumnoFormData) => {
    setGuardando(true);
    try {
      // BACKEND: GET /api/alumnos/posibles-duplicados. Es un aviso, no un
      // rechazo: si falla, el alta sigue igual.
      const dups = await posiblesDuplicados({
        nombre: datos.nombre.trim(),
        apellido: datos.apellido.trim(),
        fechaNacimiento: datos.fechaNacimiento,
      }).catch(() => [] as AlumnoResponse[]);

      if (dups.length > 0) {
        setPendiente({ body, duplicados: dups });
        return;
      }
    } finally {
      setGuardando(false);
    }
    await confirmarAlta(body);
  };

  const cargarIgual = async () => {
    if (!pendiente) return;
    const { body } = pendiente;
    setPendiente(null);
    await confirmarAlta(body);
  };

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />

      <main className="flex-1 px-6 py-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-5">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-md bg-primary-container/30">
                <Icon name="group" size={24} className="text-primary" />
              </span>
              <div>
                <h1 className="font-display text-2xl font-bold text-on-surface">Alumnos</h1>
                <p className="text-sm font-medium text-on-surface-variant">
                  Registrá alumnos y consultá su ficha
                </p>
              </div>
            </div>
            <Button type="button" onClick={abrirAlta}>
              <Icon name="person_add" size={16} />
              Nuevo alumno
            </Button>
          </header>

          <FiltrosAlumnos
            estado={filtros}
            onChange={(next) => {
              setFiltros(next);
              setPagina(1);
            }}
            totalActivos={activos}
          />

          {estadoCarga === "cargando" && (
            <div
              role="status"
              aria-live="polite"
              className="flex flex-col gap-2 rounded-md border border-outline-variant bg-surface-container-lowest p-4"
            >
              <span className="sr-only">Cargando alumnos…</span>
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  aria-hidden="true"
                  className="h-11 animate-pulse rounded-sm bg-surface-container-high"
                />
              ))}
            </div>
          )}

          {estadoCarga === "error" && (
            <section
              role="alert"
              className="flex flex-col items-center gap-3 rounded-md border border-error/40 bg-error/5 px-6 py-12 text-center"
            >
              <Icon name="error" size={40} className="text-error" />
              <h2 className="text-lg font-bold text-on-surface">No pudimos cargar los alumnos</h2>
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
                <Icon name="group" size={40} className="text-on-surface-variant" />
                <h2 className="text-lg font-bold text-on-surface">
                  {hayFiltros ? VACIO_COPY.sinResultados.title : VACIO_COPY.sinDatos.title}
                </h2>
                <p className="max-w-sm text-sm font-medium text-on-surface-variant">
                  {hayFiltros
                    ? VACIO_COPY.sinResultados.description
                    : VACIO_COPY.sinDatos.description}
                </p>
                {hayFiltros ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setFiltros(FILTROS_ALUMNOS_INICIALES)}
                  >
                    <Icon name="close" size={16} />
                    {VACIO_COPY.sinResultados.cta}
                  </Button>
                ) : (
                  <Button type="button" onClick={abrirAlta}>
                    <Icon name="person_add" size={16} />
                    {VACIO_COPY.sinDatos.cta}
                  </Button>
                )}
              </section>
            ) : (
              <>
                <AlumnosTable alumnos={visibles} onVer={abrirFicha} />
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
                  itemLabel="alumnos"
                />
              </>
            ))}
        </div>
      </main>

      <AlumnoFormModal
        open={modal !== null}
        modo={modal?.modo ?? "INSERCION"}
        alumno={modal?.alumno ?? null}
        onClose={cerrarModal}
        errorRemoto={errorRemoto}
        guardando={guardando}
        onGuardar={guardar}
      />

      <DuplicadosModal
        open={pendiente !== null}
        duplicados={pendiente?.duplicados ?? []}
        onClose={() => setPendiente(null)}
        onConfirmar={cargarIgual}
      />
    </div>
  );
}

export default function AlumnosPage() {
  return (
    <RequiereSesion>
      <ToastProvider>
        <AlumnosContent />
      </ToastProvider>
    </RequiereSesion>
  );
}
