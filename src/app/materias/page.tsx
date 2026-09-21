"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  CrearMateriaBody,
  DuracionClase,
  ErrorMateria,
  NivelMateria,
} from "@/contracts/materia";
import { ApiError, mensajeDeError } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Pagination } from "@/components/ui/Pagination";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { Sidebar } from "@/components/layout/Sidebar";
import { BajaMateriaModal } from "@/components/materias/BajaMateriaModal";
import {
  FiltrosMaterias,
  FILTROS_MATERIAS_INICIALES,
  type FiltrosMateriasState,
} from "@/components/materias/FiltrosMaterias";
import {
  MateriaFormModal,
  parsearValor,
  type MateriaFormData,
  type ModoMateriaForm,
} from "@/components/materias/MateriaFormModal";
import { MateriasTable, type OrdenMaterias } from "@/components/materias/MateriasTable";
import { descargarCsv, imprimirListado } from "@/components/materias/exportar";
import {
  VACIO_COPY,
  crearMateria,
  editarMateria,
  inactivarMateria,
  listarMaterias,
  normalizarNombre,
  reactivarMateria,
  turnosFuturosDe,
  type MateriaResponse,
} from "@/data/materias";

type EstadoCarga = "cargando" | "error" | "listo";

/** Traduce un error de la API a lo que muestra la pantalla. */
function codigoDe(e: unknown): ErrorMateria | undefined {
  return (e instanceof ApiError ? e.codigo : undefined) as ErrorMateria | undefined;
}

function MateriasContent() {
  const { showToast } = useToast();

  const [materias, setMaterias] = useState<MateriaResponse[]>([]);
  const [estadoCarga, setEstadoCarga] = useState<EstadoCarga>("cargando");
  const [filtros, setFiltros] = useState<FiltrosMateriasState>(FILTROS_MATERIAS_INICIALES);
  const [orden, setOrden] = useState<OrdenMaterias>("nombre");
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(10);
  const [modalForm, setModalForm] = useState<{
    modo: ModoMateriaForm;
    materia: MateriaResponse | null;
  } | null>(null);
  const [errorRemoto, setErrorRemoto] = useState<{ campo?: string; mensaje: string } | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [bajaDe, setBajaDe] = useState<MateriaResponse | null>(null);

  // Trae el listado y sincroniza la pantalla. NO toca el estado de forma
  // síncrona: solo dentro de los callbacks de la promesa, porque hacerlo en el
  // cuerpo del efecto dispara renders en cascada (regla
  // react-hooks/set-state-in-effect). Devuelve el cleanup del efecto.
  const traer = useCallback(() => {
    let cancelado = false;
    // Se pide el catálogo completo y se filtra en memoria: son pocas filas y
    // así el buscador responde sin ir al servidor en cada tecla. Si el listado
    // crece, `listarMaterias` ya acepta los filtros del contrato (y ahí va un
    // debounce).
    listarMaterias()
      .then((lista) => {
        if (cancelado) return;
        setMaterias(lista);
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

  // Reintentar es un handler, no un efecto: acá sí se puede volver a "cargando".
  const reintentar = () => {
    setEstadoCarga("cargando");
    traer();
  };

  const activas = useMemo(
    () => materias.filter((m) => m.estado === "activo").length,
    [materias],
  );

  const filtradas = useMemo(() => {
    const q = filtros.busqueda.trim().toLowerCase();
    return materias.filter((m) => {
      if (filtros.estado && m.estado !== filtros.estado) return false;
      if (filtros.nivel && m.nivel !== filtros.nivel) return false;
      // Búsqueda por nombre: parcial y sin distinguir mayúsculas/minúsculas.
      if (q && !m.nombre.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [materias, filtros]);

  // Si cambian los filtros, la página actual puede quedar fuera de rango.
  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / porPagina));
  const paginaActual = Math.min(pagina, totalPaginas);
  const desde = (paginaActual - 1) * porPagina;
  const visibles = filtradas.slice(desde, desde + porPagina);

  const hayFiltros =
    filtros.busqueda.trim() !== "" || filtros.nivel !== "" || filtros.estado !== "activo";

  /**
   * Nombres activos contra los que el formulario avisa del duplicado mientras
   * se escribe. Es feedback temprano, no la verdad: la verdad es el
   * NOMBRE_DUPLICADO (409) que devuelve la API al guardar.
   */
  const nombresActivos = useMemo(
    () =>
      materias
        .filter((m) => m.estado === "activo" && m.id !== modalForm?.materia?.id)
        .map((m) => normalizarNombre(m.nombre)),
    [materias, modalForm],
  );

  const abrirModal = (modo: ModoMateriaForm, materia: MateriaResponse | null) => {
    setErrorRemoto(null);
    setModalForm({ modo, materia });
  };
  const cerrarModal = () => {
    setErrorRemoto(null);
    setModalForm(null);
  };

  const guardar = async (datos: MateriaFormData) => {
    // El body es el del contrato, no el shape de la pantalla: `id`, `estado` y
    // las fechas NO viajan (los pone la base).
    const body: CrearMateriaBody = {
      nombre: datos.nombre.trim(),
      nivel: datos.nivel as NivelMateria,
      descripcion: datos.descripcion.trim() === "" ? null : datos.descripcion.trim(),
      duracionClaseMinutos: Number(datos.duracionClaseMinutos) as DuracionClase,
      valorClase: parsearValor(datos.valorClase),
    };

    setGuardando(true);
    setErrorRemoto(null);
    try {
      if (modalForm?.modo === "EDICION" && modalForm.materia) {
        const anterior = modalForm.materia;
        let actualizada = await editarMateria(anterior.id, body);

        // El switch Activo/Inactivo no es un campo del body: es la baja lógica
        // (y su vuelta atrás), que van por sus propias rutas.
        if (!datos.estado && actualizada.estado === "activo") {
          actualizada = await inactivarMateria(anterior.id);
        } else if (datos.estado && actualizada.estado === "inactivo") {
          actualizada = await reactivarMateria(anterior.id);
        }

        setMaterias((prev) => prev.map((m) => (m.id === anterior.id ? actualizada : m)));
        showToast(
          "success",
          actualizada.valorClase !== anterior.valorClase
            ? `"${actualizada.nombre}" actualizada. El nuevo valor rige solo hacia adelante.`
            : `"${actualizada.nombre}" actualizada.`,
        );
      } else {
        let creada = await crearMateria(body);
        if (!datos.estado) creada = await inactivarMateria(creada.id);
        // Se agrega lo que devolvió la API, no el borrador local: trae el `id`
        // real y lo que la base completó por default.
        setMaterias((prev) => [...prev, creada]);
        showToast("success", `"${creada.nombre}" creada.`);
      }
      cerrarModal();
    } catch (e) {
      const codigo = codigoDe(e);
      if (codigo === "NOMBRE_DUPLICADO") {
        setErrorRemoto({ campo: "nombre", mensaje: "Ya existe una materia activa con ese nombre." });
      } else if (codigo === "MATERIA_CON_TURNOS_FUTUROS") {
        setErrorRemoto({
          mensaje: "No se puede desactivar: hay turnos reservados de esta materia.",
        });
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

  const confirmarBaja = async () => {
    if (!bajaDe) return;
    const materia = bajaDe;
    setBajaDe(null);
    try {
      const baja = await inactivarMateria(materia.id);
      setMaterias((prev) => prev.map((m) => (m.id === baja.id ? baja : m)));
      showToast(
        "success",
        filtros.estado === "activo"
          ? `"${baja.nombre}" quedó inactiva y salió del listado (filtro: Solo activas).`
          : `"${baja.nombre}" quedó inactiva.`,
      );
    } catch (e) {
      const codigo = codigoDe(e);
      showToast(
        "error",
        codigo === "MATERIA_CON_TURNOS_FUTUROS"
          ? "No se puede dar de baja: hay turnos reservados de esta materia."
          : codigo === "MATERIA_ASIGNADA"
            ? "No se puede dar de baja: hay profesores que la dictan."
            : mensajeDeError(e),
      );
    }
  };

  const exportarCsv = () => {
    const total = descargarCsv(filtradas);
    showToast("success", `Se exportaron ${total} ${total === 1 ? "materia" : "materias"} a CSV.`);
  };

  const datosIniciales: MateriaFormData | undefined = modalForm?.materia
    ? {
        nombre: modalForm.materia.nombre,
        nivel: modalForm.materia.nivel,
        duracionClaseMinutos: String(modalForm.materia.duracionClaseMinutos),
        valorClase: modalForm.materia.valorClase.toFixed(2).replace(".", ","),
        descripcion: modalForm.materia.descripcion ?? "",
        estado: modalForm.materia.estado === "activo",
      }
    : undefined;

  return (
    <div className="flex min-h-screen bg-surface">
      <div className="print:hidden">
        <Sidebar />
      </div>

      <main className="flex-1 px-6 py-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-5">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-md bg-primary-container/30">
                <Icon name="menu_book" size={24} className="text-primary" />
              </span>
              <div>
                <h1 className="font-display text-2xl font-bold text-on-surface">Materias</h1>
                <p className="text-sm font-medium text-on-surface-variant">
                  Catálogo del centro: nivel, duración de clase y valor. Es lo que se asigna a los
                  profesores y lo que define el importe de cada turno.
                </p>
              </div>
            </div>
            <Button
              type="button"
              onClick={() => abrirModal("INSERCION", null)}
              className="print:hidden"
            >
              <Icon name="add" size={16} />
              Nueva materia
            </Button>
          </header>

          <FiltrosMaterias
            estado={filtros}
            onChange={(next) => {
              setFiltros(next);
              setPagina(1);
            }}
            totalActivas={activas}
            onExportarCsv={exportarCsv}
            onExportarPdf={imprimirListado}
            exportarDeshabilitado={estadoCarga !== "listo" || filtradas.length === 0}
          />

          {estadoCarga === "cargando" && (
            <div
              role="status"
              aria-live="polite"
              className="flex flex-col gap-2 rounded-md border border-outline-variant bg-surface-container-lowest p-4"
            >
              <span className="sr-only">Cargando materias…</span>
              {Array.from({ length: 4 }).map((_, i) => (
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
              <h2 className="text-lg font-bold text-on-surface">
                No pudimos cargar las materias
              </h2>
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
            (filtradas.length === 0 ? (
              <section
                role="status"
                className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-outline-variant bg-surface-container-lowest px-6 py-16 text-center"
              >
                <Icon name="menu_book" size={40} className="text-on-surface-variant" />
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
                    onClick={() => setFiltros(FILTROS_MATERIAS_INICIALES)}
                  >
                    <Icon name="close" size={16} />
                    {VACIO_COPY.sinResultados.cta}
                  </Button>
                ) : (
                  <Button type="button" onClick={() => abrirModal("INSERCION", null)}>
                    <Icon name="add" size={16} />
                    {VACIO_COPY.sinDatos.cta}
                  </Button>
                )}
              </section>
            ) : (
              <>
                <MateriasTable
                  materias={visibles}
                  orden={orden}
                  onOrdenChange={setOrden}
                  onVer={(materia) => abrirModal("LECTURA", materia)}
                  onEditar={(materia) => abrirModal("EDICION", materia)}
                  onBaja={setBajaDe}
                />
                <div className="print:hidden">
                  <Pagination
                    page={paginaActual}
                    totalPages={totalPaginas}
                    totalItems={filtradas.length}
                    pageStart={desde + 1}
                    pageEnd={desde + visibles.length}
                    pageSize={porPagina}
                    onPageChange={setPagina}
                    onPageSizeChange={setPorPagina}
                    itemLabel="materias"
                  />
                </div>
              </>
            ))}
        </div>
      </main>

      <MateriaFormModal
        open={modalForm !== null}
        modo={modalForm?.modo ?? "INSERCION"}
        titulo={
          modalForm?.modo === "LECTURA"
            ? "Detalle de la materia"
            : modalForm?.modo === "EDICION"
              ? "Editar materia"
              : "Nueva materia"
        }
        onClose={cerrarModal}
        datosIniciales={datosIniciales}
        nombresActivos={nombresActivos}
        meta={
          modalForm?.materia
            ? {
                id: modalForm.materia.id,
                fechaCreacion: modalForm.materia.fechaCreacion,
                fechaActualizacion: modalForm.materia.fechaActualizacion,
                valorAnterior: modalForm.materia.valorClase,
              }
            : undefined
        }
        errorRemoto={errorRemoto}
        guardando={guardando}
        onGuardar={guardar}
      />

      <BajaMateriaModal
        open={bajaDe !== null}
        materia={bajaDe}
        // Aviso previo: lo que el front sabe hoy. El que decide es el 409
        // MATERIA_CON_TURNOS_FUTUROS que devuelve `inactivarMateria`.
        turnosFuturos={bajaDe ? turnosFuturosDe(bajaDe.id) : 0}
        onClose={() => setBajaDe(null)}
        onConfirmar={confirmarBaja}
      />
    </div>
  );
}

export default function MateriasPage() {
  return (
    <ToastProvider>
      <MateriasContent />
    </ToastProvider>
  );
}
