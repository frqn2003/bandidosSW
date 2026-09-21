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
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { Sidebar } from "@/components/layout/Sidebar";
import { BajaProfesorModal } from "@/components/profesores/BajaProfesorModal";
import { FiltrosProfesores, type FiltrosProfesoresState } from "@/components/profesores/FiltrosProfesores";
import {
  MatrizDisponibilidadModal,
  type MatrizSerializable,
} from "@/components/profesores/MatrizDisponibilidadModal";
import { OrdenProfesores, ProfesoresTable } from "@/components/profesores/ProfesoresTable";
import {
  ProfesorFormModal,
  type ProfesorFormData,
  type ModoProfesorForm,
} from "@/components/profesores/ProfesorFormModal";

const FILTROS_INICIALES: FiltrosProfesoresState = {
  busqueda: "",
  materiaId: "",
  dia: "",
  estado: "activo",
};

function CuerpoDocenteContent() {
  const { showToast } = useToast();
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);
  const [orden, setOrden] = useState<OrdenProfesores>("nombre");
  const [modalForm, setModalForm] = useState<{
    modo: ModoProfesorForm;
    profesor: Profesor | null;
  } | null>(null);
  const [matrizDe, setMatrizDe] = useState<Profesor | null>(null);
  const [bajaDe, setBajaDe] = useState<Profesor | null>(null);

  // BACKEND: GET /api/profesores (JOIN usuario + professor_materia + materia).
  const [profesores, setProfesores] = useState<Profesor[]>(PROFESORES);

  const activos = useMemo(() => profesores.filter((p) => p.estado === "activo").length, [profesores]);

  const filtrados = useMemo(() => {
    const q = filtros.busqueda.trim().toLowerCase();
    return profesores.filter((p) => {
      if (filtros.estado && p.estado !== filtros.estado) return false;
      if (filtros.materiaId && !p.materias.some((m) => String(m.materia.id) === filtros.materiaId))
        return false;
      if (filtros.dia && !(p.bloquesPorDia[Number(filtros.dia)]?.length)) return false;
      if (q) {
        const busqueda = `${p.nombre} ${p.apellido} ${p.tituloEspecialidad ?? ""}`.toLowerCase();
        if (!busqueda.includes(q)) return false;
      }
      return true;
    });
  }, [profesores, filtros]);

  const abrirNuevo = () => setModalForm({ modo: "INSERCION", profesor: null });
  const abrirLectura = (p: Profesor) => setModalForm({ modo: "LECTURA", profesor: p });
  const abrirEdicion = (p: Profesor) => setModalForm({ modo: "EDICION", profesor: p });

  const guardarProfesor = (datos: ProfesorFormData) => {
    // BACKEND: POST /api/profesores (INSERCION) | PUT /api/profesores/:id (EDICION).
    // En el front hardcodeado solo se validan y descartan los datos (demo).
    void datos;
    showToast("success", modalForm?.modo === "INSERCION" ? "Profesor creado (demo)" : "Ficha actualizada (demo)");
    setModalForm(null);
  };

  const guardarDisponibilidad = (matriz: MatrizSerializable) => {
    // BACKEND: PUT /api/profesores/:id/disponibilidad
    if (!matrizDe) return;
    // Las horas activas son bloques de 30 min; se agrupan en rangos contiguos
    // para mantener la forma "HH:MM-HH:MM" que consume la tabla y el filtro.
    const aMin = (h: string) => {
      const [hh, mm] = h.split(":").map(Number);
      return hh * 60 + mm;
    };
    const bloquesPorDia = Object.fromEntries(
      Object.entries(matriz).map(([dia, horas]) => {
        const ordenadas = [...horas].sort();
        const rangos: string[] = [];
        let inicio = ordenadas[0];
        let prev: string | undefined;
        for (const h of ordenadas) {
          if (prev && aMin(h) > aMin(prev) + 30) {
            rangos.push(`${inicio}-${prev}`);
            inicio = h;
          }
          prev = h;
        }
        if (inicio) rangos.push(`${inicio}-${prev}`);
        return [Number(dia), rangos];
      }),
    );
    setProfesores((prev) =>
      prev.map((p) =>
        p.id === matrizDe.id ? { ...p, bloquesPorDia } : p,
      ),
    );
    showToast("success", "Disponibilidad guardada (demo)");
    setMatrizDe(null);
  };

  const confirmarBaja = () => {
    if (!bajaDe) return;
    // BACKEND: PATCH /api/profesores/:id { "estado": "inactivo" }
    setProfesores((prev) =>
      prev.map((p) => (p.id === bajaDe.id ? { ...p, estado: "inactivo" } : p)),
    );
    showToast("success", "Profesor dado de baja (demo)");
    setBajaDe(null);
  };

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      <main className="flex-1 px-6 py-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-5">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-md bg-primary-container/30">
                <Icon name="groups" size={24} className="text-primary" />
              </span>
              <div>
                <h1 className="font-display text-2xl font-bold text-on-surface">Cuerpo Docente</h1>
                <p className="text-sm font-medium text-on-surface-variant">
                  Registrá profesores, sus materias y disponibilidad para que Mesa de Entrada reserve clases sin superposición.
                </p>
              </div>
            </div>
            <Button type="button" onClick={abrirNuevo}>
              <Icon name="add" size={16} />
              Nuevo profesor
            </Button>
          </header>

          <FiltrosProfesores
            estado={filtros}
            onChange={setFiltros}
            materiasCatalogo={MATERIAS_CATALOGO}
            totalActivos={activos}
          />

          {filtrados.length === 0 ? (
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
            <ProfesoresTable
              profesores={filtrados}
              orden={orden}
              onOrdenChange={setOrden}
              onVer={abrirLectura}
              onEditar={abrirEdicion}
              onVerDisponibilidad={setMatrizDe}
              onBaja={setBajaDe}
            />
          )}
        </div>
      </main>

      <ProfesorFormModal
        open={modalForm !== null}
        titulo={modalForm?.modo === "LECTURA" ? "Perfil del docente" : modalForm?.modo === "EDICION" ? "Editar profesor" : "Nuevo profesor"}
        modo={modalForm?.modo ?? "INSERCION"}
        onClose={() => setModalForm(null)}
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
                estado: modalForm.profesor.estado === "activo",
              }
            : undefined
        }
        usuariosSinFicha={USUARIOS_SIN_FICHA}
        materiasCatalogo={MATERIAS_CATALOGO}
        onGuardar={guardarProfesor}
      />

      <MatrizDisponibilidadModal
        open={matrizDe !== null}
        profesor={matrizDe}
        onClose={() => setMatrizDe(null)}
        onGuardar={guardarDisponibilidad}
      />

      <BajaProfesorModal
        open={bajaDe !== null}
        profesor={bajaDe}
        turnosFuturos={bajaDe ? (TURNOS_FUTUROS_POR_PROFESOR[bajaDe.id] ?? 0) : 0}
        onClose={() => setBajaDe(null)}
        onConfirmar={confirmarBaja}
      />

      {/* Lectura (Ver ficha) muere en el modal ProfesorFormModal en modo LECTURA. */}
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