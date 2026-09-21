"use client";

import { useMemo, useState } from "react";
import {
  MATERIAS_CATALOGO,
  PROFESORES,
  TURNOS_FUTUROS_POR_PROFESOR,
  USUARIOS_SIN_FICHA,
  VACIO_COPY,
  type Profesor,
} from "@/data/profesores";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Pagination } from "@/components/ui/Pagination";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { Sidebar } from "@/components/layout/Sidebar";
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
import { bloquesDesdeFranjas, capacidadMaxDe, franjasDesdeBloques } from "@/lib/profesores";

const FILTROS_INICIALES: FiltrosProfesoresState = {
  busqueda: "",
  materiaId: "",
  dia: "",
  estado: "activo",
};
const PAGE_SIZE_DEFAULT = 10;

function CuerpoDocenteContent() {
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

  // BACKEND: GET /api/profesores (JOIN usuario + profesor_materia + materia).
  const [profesores, setProfesores] = useState<Profesor[]>(PROFESORES);

  const activos = useMemo(() => profesores.filter((p) => p.estado === "activo").length, [profesores]);

  // Filtros combinables + orden fijo Apellido, Nombre A-Z (exigencia de la HU).
  const filas = useMemo(() => {
    const q = filtros.busqueda.trim().toLowerCase();
    return profesores
      .filter((p) => {
        if (filtros.estado && p.estado !== filtros.estado) return false;
        if (filtros.materiaId && !p.materias.some((m) => String(m.materia.id) === filtros.materiaId))
          return false;
        if (filtros.dia && !(p.bloquesPorDia[Number(filtros.dia)]?.length)) return false;
        if (q) {
          const texto = `${p.nombre} ${p.apellido}`.toLowerCase();
          if (!texto.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`));
  }, [profesores, filtros]);

  const totalPages = Math.max(1, Math.ceil(filas.length / pageSize));
  const pageStart = (pagina - 1) * pageSize + 1;
  const pageEnd = Math.min(pagina * pageSize, filas.length);
  const filasPagina = filas.slice(pageStart - 1, pageEnd);

  const cambiarFiltros = (next: FiltrosProfesoresState) => {
    setFiltros(next);
    setPagina(1);
  };

  const abrirNuevo = () => setModalForm({ modo: "INSERCION", profesor: null });
  const abrirEdicion = (p: Profesor) => setModalForm({ modo: "EDICION", profesor: p });

  const guardarProfesor = (datos: ProfesorFormData) => {
    // BACKEND: POST /api/profesores (INSERCION) | PUT /api/profesores/:id (EDICION)
    //         → profesor + profesor_materia + agenda_profesional en una transacción.
    if (modalForm?.modo === "EDICION" && modalForm.profesor) {
      const id = modalForm.profesor.id;
      setProfesores((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                tituloEspecialidad: datos.titulo.trim() === "" ? null : datos.titulo,
                telefono: datos.telefono,
                materias: datos.materias.map((m) => ({
                  materia: m.materia,
                  capacidadMaxima: Number(m.capacidad),
                })),
                capacidadDefault: datos.capacidadDefault,
                bloquesPorDia: bloquesDesdeFranjas(datos.franjas),
                estado: datos.estado ? "activo" : "inactivo",
              }
            : p,
        ),
      );
      showToast("success", "Ficha actualizada (demo)");
    } else {
      const usuario = USUARIOS_SIN_FICHA.find((u) => String(u.id) === datos.usuarioId);
      if (!usuario) {
        showToast("error", "Seleccioná un usuario asociado válido");
        return;
      }
      const nuevoId = Math.max(0, ...profesores.map((p) => p.id)) + 1;
      const nuevoProfesor: Profesor = {
        id: nuevoId,
        usuarioId: Number(datos.usuarioId),
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        telefono: datos.telefono,
        tituloEspecialidad: datos.titulo.trim() === "" ? null : datos.titulo,
        materias: datos.materias.map((m) => ({
          materia: m.materia,
          capacidadMaxima: Number(m.capacidad),
        })),
        estado: datos.estado ? "activo" : "inactivo",
        fechaCreacion: new Date().toISOString().slice(0, 10),
        bloquesPorDia: bloquesDesdeFranjas(datos.franjas),
        capacidadDefault: datos.capacidadDefault,
        turnosProgramados: 0,
        presentismo: 100,
      };
      setProfesores((prev) => [...prev, nuevoProfesor]);
      showToast("success", "Profesor creado (demo)");
    }
    setModalForm(null);
  };

  const guardarDisponibilidad = (bloquesPorDia: Record<number, string[]>) => {
    // BACKEND: PUT /api/profesores/:id/disponibilidad
    if (!bloquesDe) return;
    setProfesores((prev) =>
      prev.map((p) => (p.id === bloquesDe.id ? { ...p, bloquesPorDia } : p)),
    );
    showToast("success", "Disponibilidad guardada (demo)");
    setBloquesDe(null);
  };

  const confirmarBaja = (motivo: string, observaciones: string) => {
    if (!bajaDe) return;
    // BACKEND: PATCH /api/profesores/:id { "estado": "inactivo", motivo, observaciones }
    //          (auditoría vía trigger sobre profesor).
    void motivo;
    void observaciones;
    setProfesores((prev) =>
      prev.map((p) => (p.id === bajaDe.id ? { ...p, estado: "inactivo" } : p)),
    );
    setModalForm(null); // si la baja se disparó desde el form de edición
    showToast("success", "Profesor dado de baja (demo)");
    setBajaDe(null);
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
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <nav aria-label="Ruta de navegación" className="mb-1">
                <ol className="flex items-center gap-1 text-xs font-semibold text-on-surface-variant">
                  <li>Gestión Académica</li>
                  <li aria-hidden="true" className="flex items-center">
                    <Icon name="chevron_right" size={14} />
                  </li>
                  <li aria-current="page" className="text-on-surface">
                    Cuerpo Docente
                  </li>
                </ol>
              </nav>
              <h1 className="font-display text-2xl font-bold text-on-surface">Cuerpo Docente</h1>
              <p className="text-sm font-medium text-on-surface-variant">
                Gestión de profesores, materias asignadas y disponibilidad
              </p>
            </div>
            <Button type="button" onClick={abrirNuevo}>
              <Icon name="add" size={16} />
              Nuevo profesor
            </Button>
          </header>

          <FiltrosProfesores
            estado={filtros}
            onChange={cambiarFiltros}
            materiasCatalogo={MATERIAS_CATALOGO}
            totalActivos={activos}
          />

          {filas.length === 0 ? (
            <section
              role="status"
              className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-outline-variant bg-surface-container-lowest px-6 py-16 text-center"
            >
              <Icon name="groups" size={40} className="text-on-surface-variant" />
              <h2 className="text-lg font-bold text-on-surface">{VACIO_COPY.title}</h2>
              <p className="max-w-sm text-sm font-medium text-on-surface-variant">
                {VACIO_COPY.description}
              </p>
              <Button type="button" onClick={abrirNuevo}>
                <Icon name="add" size={16} />
                {VACIO_COPY.cta}
              </Button>
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
                page={pagina}
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
          )}
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
        onClose={() => setModalForm(null)}
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
        usuariosSinFicha={USUARIOS_SIN_FICHA}
        materiasCatalogo={MATERIAS_CATALOGO}
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
        turnosFuturos={bajaDe ? (TURNOS_FUTUROS_POR_PROFESOR[bajaDe.id] ?? 0) : 0}
        onClose={() => setBajaDe(null)}
        onConfirmar={confirmarBaja}
      />
    </div>
  );
}

export default function ProfesoresPage() {
  return (
    <ToastProvider>
      <CuerpoDocenteContent />
    </ToastProvider>
  );
}