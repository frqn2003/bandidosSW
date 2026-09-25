"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  CrearProfesorBody,
  EditarProfesorBody,
  ErrorProfesor,
} from "@/contracts/profesor";
import { useSesion } from "@/funciones/sesion";
import { ApiError, mensajeDeError } from "@/lib/api-client";
import {
  VACIO_COPY,
  aProfesor,
  bloquesPorDiaDesde,
  crearProfesor,
  editarProfesor,
  guardarDisponibilidad as guardarDisponibilidadDe,
  inactivarProfesor,
  listarBloquesDe,
  listarCandidatos,
  listarMateriasCatalogo,
  listarProfesores,
  turnosFuturosDe,
  type MateriaRef,
  type Profesor,
  type UsuarioSinFicha,
} from "@/data/profesores";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Pagination } from "@/components/ui/Pagination";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { Sidebar } from "@/components/layout/Sidebar";
import { RequiereSesion } from "@/components/auth/RequiereSesion";
import { AgendaSemanalModal } from "@/components/profesores/AgendaSemanalModal";
import { BajaProfesorModal } from "@/components/profesores/BajaProfesorModal";
import { FiltrosProfesores, type FiltrosProfesoresState } from "@/components/profesores/FiltrosProfesores";
import { BloquesDisponibilidadModal } from "@/components/profesores/BloquesDisponibilidadModal";
import { ProfesorFichaModal } from "@/components/profesores/ProfesorFichaModal";
import { ProfesoresTable } from "@/components/profesores/ProfesoresTable";
import {
  ProfesorFormModal,
  type ProfesorFormData,
  type ModoProfesorForm,
} from "@/components/profesores/ProfesorFormModal";
import { bloquesDesdeFranjas, capacidadMaxDe, franjasDesdeBloques } from "@/funciones/profesores";

const FILTROS_INICIALES: FiltrosProfesoresState = {
  busqueda: "",
  estado: "activo",
};
const PAGE_SIZE_DEFAULT = 10;

type EstadoCarga = "cargando" | "error" | "listo";

/** Traduce un error de la API a lo que muestra la pantalla. */
function codigoDe(e: unknown): ErrorProfesor | undefined {
  return (e instanceof ApiError ? e.codigo : undefined) as ErrorProfesor | undefined;
}

/** Error de la API → { campo, mensaje } para el formulario. */
function errorDeFormulario(e: unknown): { campo?: string; mensaje: string } {
  const codigo = codigoDe(e);
  switch (codigo) {
    case "USUARIO_YA_ES_PROFESOR":
      return { campo: "usuarioId", mensaje: "Ese usuario ya tiene ficha de profesor." };
    case "USUARIO_NO_ES_PROFESOR":
    case "USUARIO_SIN_ACADEMIA":
    case "USUARIO_INACTIVO":
    case "REFERENCIA_INVALIDA":
      return { campo: "usuarioId", mensaje: mensajeDeError(e) };
    case "MATERIA_INACTIVA":
    case "MATERIA_DUPLICADA":
    case "MATERIAS_REQUERIDAS":
      return { campo: "materias", mensaje: mensajeDeError(e) };
    case "MATERIA_CON_TURNOS_FUTUROS":
      return {
        campo: "materias",
        mensaje: "No se puede quitar esa materia: tiene turnos reservados.",
      };
    case "PROFESOR_CON_TURNOS_FUTUROS":
      return { mensaje: "No se puede dar de baja: el profesor tiene turnos reservados." };
    default:
      return { campo: e instanceof ApiError ? e.campo : undefined, mensaje: mensajeDeError(e) };
  }
}

function CuerpoDocenteContent() {
  // Alta rápida de usuario docente: solo el Gerente (el back también lo valida).
  const { sesion } = useSesion();
  const esGerente = sesion?.usuario.rol.nombre === "Gerente";
  const { showToast } = useToast();
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);
  const [pagina, setPagina] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT);
  const [modalForm, setModalForm] = useState<{
    modo: ModoProfesorForm;
    profesor: Profesor | null;
  } | null>(null);
  const [fichaDe, setFichaDe] = useState<Profesor | null>(null);
  const [agendaDe, setAgendaDe] = useState<Profesor | null>(null);
  const [bloquesDe, setBloquesDe] = useState<Profesor | null>(null);
  const [bajaDe, setBajaDe] = useState<Profesor | null>(null);

  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [estadoCarga, setEstadoCarga] = useState<EstadoCarga>("cargando");
  const [materiasCatalogo, setMateriasCatalogo] = useState<MateriaRef[]>([]);
  const [usuariosSinFicha, setUsuariosSinFicha] = useState<UsuarioSinFicha[]>([]);
  const [errorRemoto, setErrorRemoto] = useState<{ campo?: string; mensaje: string } | null>(null);
  const [guardando, setGuardando] = useState(false);

  /**
   * Bloques de disponibilidad ya pedidos, por profesor.
   * Vive en un ref y no en el estado porque es caché, no algo que se renderice:
   * sobrevive a los refetch del listado y evita volver a pedir lo mismo.
   */
  const cacheBloques = useRef(new Map<number, Record<number, string[]>>());

  // Los filtros estructurales van al servidor. La búsqueda por texto se
  // resuelve abajo, en memoria (incluye el nombre de las materias).
  const estadoFiltro = filtros.estado;

  // NO toca el estado de forma síncrona: solo dentro de los callbacks de la
  // promesa (regla react-hooks/set-state-in-effect). Devuelve el cleanup.
  const traer = useCallback(() => {
    let cancelado = false;
    listarProfesores({
      estado: estadoFiltro || undefined,
    })
      .then((lista) => {
        if (cancelado) return;
        setProfesores(lista.map((p) => aProfesor(p, cacheBloques.current.get(p.id) ?? {})));
        setEstadoCarga("listo");
      })
      .catch(() => {
        if (!cancelado) setEstadoCarga("error");
      });
    return () => {
      cancelado = true;
    };
  }, [estadoFiltro]);

  useEffect(traer, [traer]);

  // Reintentar es un handler, no un efecto: acá sí se puede volver a "cargando".
  const reintentar = () => {
    setEstadoCarga("cargando");
    traer();
  };

  // Catálogos del filtro y del formulario. Van con apiGetOpcional (dentro de
  // `@/data/profesores`): si fallan, la pantalla sigue mostrando el listado.
  useEffect(() => {
    let cancelado = false;
    Promise.all([listarMateriasCatalogo(), listarCandidatos()])
      .then(([materias, candidatos]) => {
        if (cancelado) return;
        setMateriasCatalogo(materias);
        setUsuariosSinFicha(candidatos);
      })
      .catch(() => undefined);
    return () => {
      cancelado = true;
    };
  }, []);

  const activos = useMemo(() => profesores.filter((p) => p.estado === "activo").length, [profesores]);

  // Búsqueda por nombre, apellido o materia + orden fijo Apellido, Nombre A-Z (HU-PRO-01).
  const filas = useMemo(() => {
    const q = filtros.busqueda.trim().toLowerCase();
    return profesores
      .filter(
        (p) =>
          !q ||
          `${p.nombre} ${p.apellido}`.toLowerCase().includes(q) ||
          p.materias.some((m) => m.materia.nombre.toLowerCase().includes(q)),
      )
      .sort((a, b) => `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`));
  }, [profesores, filtros.busqueda]);

  const totalPages = Math.max(1, Math.ceil(filas.length / pageSize));
  const paginaActual = Math.min(pagina, totalPages);
  const pageStart = (paginaActual - 1) * pageSize + 1;
  const pageEnd = Math.min(paginaActual * pageSize, filas.length);
  const filasPagina = filas.slice(pageStart - 1, pageEnd);

  // BACKEND: la disponibilidad es otro contrato (GET /api/disponibilidad exige
  // profesorId), así que se pide de a un profesor y solo para las filas
  // visibles. Si algún día el listado devuelve el resumen semanal, este efecto
  // y la caché desaparecen.
  const idsVisibles = filasPagina.map((p) => p.id).join(",");
  useEffect(() => {
    const ids = idsVisibles === "" ? [] : idsVisibles.split(",").map(Number);
    const pendientes = ids.filter((id) => !cacheBloques.current.has(id));
    if (pendientes.length === 0) return;

    let cancelado = false;
    Promise.all(
      pendientes.map(async (id) => [id, bloquesPorDiaDesde(await listarBloquesDe(id))] as const),
    )
      .then((pares) => {
        for (const [id, bloques] of pares) cacheBloques.current.set(id, bloques);
        if (cancelado) return;
        const porId = new Map(pares);
        setProfesores((prev) =>
          prev.map((p) => {
            const bloques = porId.get(p.id);
            return bloques ? { ...p, bloquesPorDia: bloques } : p;
          }),
        );
      })
      .catch(() => undefined);
    return () => {
      cancelado = true;
    };
  }, [idsVisibles]);

  const hayFiltros =
    filtros.busqueda.trim() !== "" ||
    filtros.estado !== "activo";

  const cambiarFiltros = (next: FiltrosProfesoresState) => {
    setFiltros(next);
    setPagina(1);
  };

  const abrirNuevo = () => {
    setErrorRemoto(null);
    setModalForm({ modo: "INSERCION", profesor: null });
  };
  const abrirEdicion = (p: Profesor) => {
    setErrorRemoto(null);
    setModalForm({ modo: "EDICION", profesor: p });
  };
  const cerrarForm = () => {
    setErrorRemoto(null);
    setModalForm(null);
  };

  /**
   * Persiste los bloques de un profesor y refleja en pantalla lo que quedó en
   * la base. Si falla a mitad de camino, vuelve a leer los bloques para no
   * mostrar un estado que la base no tiene. Devuelve si se guardó.
   */
  const persistirBloques = async (
    profesor: Pick<Profesor, "id" | "academiaId">,
    bloquesPorDia: Record<number, string[]>,
  ): Promise<boolean> => {
    const aplicar = (bloques: Record<number, string[]>) => {
      cacheBloques.current.set(profesor.id, bloques);
      setProfesores((prev) =>
        prev.map((p) => (p.id === profesor.id ? { ...p, bloquesPorDia: bloques } : p)),
      );
    };
    try {
      aplicar(await guardarDisponibilidadDe(profesor.id, profesor.academiaId, bloquesPorDia));
      return true;
    } catch (e) {
      showToast("error", `La disponibilidad no se guardó: ${mensajeDeError(e)}`);
      listarBloquesDe(profesor.id)
        .then((b) => aplicar(bloquesPorDiaDesde(b)))
        .catch(() => undefined);
      return false;
    }
  };

  const guardarProfesor = async (datos: ProfesorFormData) => {
    const enEdicion = modalForm?.modo === "EDICION" ? modalForm.profesor : null;

    // No hay endpoint de reactivación (POST /api/profesores/:id/activar no
    // existe): mejor avisar que guardar la mitad.
    if (enEdicion && enEdicion.estado === "inactivo" && datos.estado) {
      setErrorRemoto({
        mensaje:
          "La reactivación de un profesor todavía no está disponible en la API. Guardá sin activarlo o pedile al equipo de back el endpoint de alta.",
      });
      return;
    }

    // `materias` viaja completa: reemplaza la lista anterior (alta, baja y
    // cambio de capacidad en una sola operación). El precio es el que ya tenía
    // asignado el profesor, o el valor de catálogo si la materia es nueva.
    const materias = datos.materias.map((m) => ({
      materiaId: m.materia.id,
      capacidadMaxima: Number(m.capacidad),
      precio: m.materia.valorClase,
    }));
    const ficha = {
      tituloEspecialidad: datos.titulo.trim() === "" ? null : datos.titulo.trim(),
      telefono: datos.telefono,
      materias,
    };

    setGuardando(true);
    setErrorRemoto(null);
    try {
      let vista: Profesor;
      if (enEdicion) {
        const body: EditarProfesorBody = ficha;
        let actualizado = await editarProfesor(enEdicion.id, body);
        // El estado no va en el body: la baja tiene su propio endpoint.
        if (!datos.estado && actualizado.estado === "activo") {
          actualizado = await inactivarProfesor(enEdicion.id);
        }
        const editado = aProfesor(actualizado, enEdicion.bloquesPorDia);
        vista = editado;
        setProfesores((prev) => prev.map((p) => (p.id === editado.id ? editado : p)));
        showToast("success", `Ficha de ${editado.nombre} ${editado.apellido} actualizada.`);
      } else {
        const body: CrearProfesorBody = { usuarioId: Number(datos.usuarioId), ...ficha };
        let creado = await crearProfesor(body);
        if (!datos.estado) creado = await inactivarProfesor(creado.id);
        // Se agrega lo que devolvió la API, no el borrador local: trae el `id`
        // real y lo que la base completó por default.
        const nuevo = aProfesor(creado);
        vista = nuevo;
        setProfesores((prev) => [...prev, nuevo]);
        // Ese usuario ya tiene ficha: sale del combo de candidatos.
        setUsuariosSinFicha((prev) => prev.filter((u) => u.id !== creado.usuario.id));
        showToast("success", `${nuevo.nombre} ${nuevo.apellido} quedó dado de alta.`);
      }

      // Las franjas del formulario son agenda_profesional: van aparte, por
      // /api/disponibilidad (ver guardarDisponibilidad en @/data/profesores).
      // La ficha ya quedó guardada: si esto falla, se avisa y el form se cierra.
      const franjasNuevas = bloquesDesdeFranjas(datos.franjas);
      const franjasActuales = enEdicion?.bloquesPorDia ?? {};
      if (JSON.stringify(franjasNuevas) !== JSON.stringify(franjasActuales)) {
        await persistirBloques(vista, franjasNuevas);
      }
      cerrarForm();
    } catch (e) {
      setErrorRemoto(errorDeFormulario(e));
    } finally {
      setGuardando(false);
    }
  };

  const guardarDisponibilidad = async (bloquesPorDia: Record<number, string[]>) => {
    if (!bloquesDe) return;
    const profesor = bloquesDe;
    setBloquesDe(null);
    if (await persistirBloques(profesor, bloquesPorDia)) {
      showToast("success", `Disponibilidad de ${profesor.nombre} ${profesor.apellido} actualizada.`);
    }
  };

  const confirmarBaja = async (motivo: string, observaciones: string) => {
    if (!bajaDe) return;
    const profesor = bajaDe;
    // BACKEND: el motivo y las observaciones todavía no viajan — POST
    // /api/profesores/:id/inactivar no los recibe y la auditoría la escribe el
    // trigger con el usuario de la sesión.
    void motivo;
    void observaciones;
    setBajaDe(null);
    try {
      const baja = await inactivarProfesor(profesor.id);
      const vista = aProfesor(baja, profesor.bloquesPorDia);
      setProfesores((prev) => prev.map((p) => (p.id === vista.id ? vista : p)));
      setModalForm(null); // si la baja se disparó desde el form de edición
      showToast(
        "success",
        filtros.estado === "activo"
          ? `${vista.nombre} ${vista.apellido} quedó inactivo y salió del listado (filtro: Solo activos).`
          : `${vista.nombre} ${vista.apellido} quedó inactivo.`,
      );
    } catch (e) {
      showToast(
        "error",
        codigoDe(e) === "PROFESOR_CON_TURNOS_FUTUROS"
          ? "No se puede dar de baja: el profesor tiene turnos futuros reservados."
          : mensajeDeError(e),
      );
    }
  };

  const abrirFicha = (p: Profesor) => setFichaDe(p);
  const abrirAgenda = (p: Profesor) => setAgendaDe(p);
  const irAEditarDesdeFicha = (p: Profesor) => {
    setFichaDe(null);
    abrirEdicion(p);
  };
  const modificarBloquesDesdeAgenda = (p: Profesor) => {
    setAgendaDe(null);
    setBloquesDe(p);
  };

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      <main className="flex-1 px-6 py-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-5">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-md bg-primary-container/30">
                <Icon name="groups" size={24} className="text-primary" />
              </span>
              <div>
                <h1 className="font-display text-2xl font-bold text-on-surface">Cuerpo Docente</h1>
                <p className="text-sm font-medium text-on-surface-variant">
                  Gestión de profesores, materias asignadas y disponibilidad
                </p>
              </div>
            </div>
            <Button type="button" onClick={abrirNuevo}>
              <Icon name="person_add" size={16} />
              Nuevo profesor
            </Button>
          </header>

          <FiltrosProfesores
            estado={filtros}
            onChange={cambiarFiltros}
            totalActivos={activos}
          />

          {estadoCarga === "cargando" && (
            <div
              role="status"
              aria-live="polite"
              className="flex flex-col gap-2 rounded-md border border-outline-variant bg-surface-container-lowest p-4"
            >
              <span className="sr-only">Cargando profesores…</span>
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
                No pudimos cargar el cuerpo docente
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
            (filas.length === 0 ? (
              <section
                role="status"
                className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-outline-variant bg-surface-container-lowest px-6 py-16 text-center"
              >
                <Icon name="groups" size={40} className="text-on-surface-variant" />
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
                    onClick={() => cambiarFiltros(FILTROS_INICIALES)}
                  >
                    <Icon name="filter_alt_off" size={16} />
                    {VACIO_COPY.sinResultados.cta}
                  </Button>
                ) : (
                  <Button type="button" onClick={abrirNuevo}>
                    <Icon name="add" size={16} />
                    {VACIO_COPY.sinDatos.cta}
                  </Button>
                )}
              </section>
            ) : (
              <div className="overflow-hidden rounded-md border border-outline-variant bg-surface-container-lowest shadow-card">
                <ProfesoresTable
                  profesores={filasPagina}
                  onVer={abrirFicha}
                  onEditar={abrirEdicion}
                  onVerAgenda={abrirAgenda}
                  onBaja={setBajaDe}
                />
                <Pagination
                  page={paginaActual}
                  totalPages={totalPages}
                  totalItems={filas.length}
                  pageStart={pageStart}
                  pageEnd={pageEnd}
                  pageSize={pageSize}
                  itemLabel="profesores"
                  onPageChange={setPagina}
                  onPageSizeChange={setPageSize}
                />
              </div>
            ))}
        </div>
      </main>

      <ProfesorFichaModal
        open={fichaDe !== null}
        profesor={fichaDe}
        onClose={() => setFichaDe(null)}
        onEditar={irAEditarDesdeFicha}
      />

      <AgendaSemanalModal
        open={agendaDe !== null}
        profesor={agendaDe}
        onClose={() => setAgendaDe(null)}
        onModificarBloques={modificarBloquesDesdeAgenda}
      />

      <ProfesorFormModal
        open={modalForm !== null}
        modo={modalForm?.modo ?? "INSERCION"}
        titulo={modalForm?.modo === "EDICION" ? "Editar Profesor" : "Nuevo Profesor"}
        onClose={cerrarForm}
        profesor={modalForm?.profesor ?? null}
        onBaja={setBajaDe}
        datosIniciales={
          modalForm?.profesor
            ? {
                usuarioId: String(modalForm.profesor.usuarioId),
                titulo: modalForm.profesor.tituloEspecialidad ?? "",
                telefono: modalForm.profesor.telefono,
                materias: modalForm.profesor.materias.map((m) => ({
                  materia: m.materia,
                  capacidad: String(m.capacidadMaxima),
                })),
                capacidadDefault:
                  modalForm.profesor.capacidadDefault ?? capacidadMaxDe(modalForm.profesor),
                franjas: franjasDesdeBloques(modalForm.profesor.bloquesPorDia),
                estado: modalForm.profesor.estado === "activo",
              }
            : undefined
        }
        usuariosSinFicha={usuariosSinFicha}
        puedeCrearUsuario={esGerente}
        onUsuarioCreado={(u) =>
          setUsuariosSinFicha((prev) =>
            [...prev.filter((p) => p.id !== u.id), u].sort((a, b) => a.apellido.localeCompare(b.apellido)),
          )
        }
        materiasCatalogo={materiasCatalogo}
        errorRemoto={errorRemoto}
        guardando={guardando}
        onGuardar={guardarProfesor}
      />

      <BloquesDisponibilidadModal
        open={bloquesDe !== null}
        profesor={bloquesDe}
        onClose={() => setBloquesDe(null)}
        onGuardar={guardarDisponibilidad}
      />

      <BajaProfesorModal
        open={bajaDe !== null}
        profesor={bajaDe}
        // Aviso previo: lo que el front sabe hoy (todavía sin endpoint de
        // turnos). El que decide es el 409 PROFESOR_CON_TURNOS_FUTUROS.
        turnosFuturos={bajaDe ? turnosFuturosDe(bajaDe.id) : 0}
        onClose={() => setBajaDe(null)}
        onConfirmar={confirmarBaja}
      />
    </div>
  );
}

export default function ProfesoresPage() {
  return (
    <RequiereSesion>
      <ToastProvider>
        <CuerpoDocenteContent />
      </ToastProvider>
    </RequiereSesion>
  );
}
