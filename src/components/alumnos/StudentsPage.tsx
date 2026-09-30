// src/components/alumnos/StudentsPage.tsx
//
// Vista Principal del Módulo "Gestión de Alumnos e Historial de Asistencia" (HU-ALU-02).
// Alineado estrictamente al Design System (coherente con Usuarios y Profesores).

"use client";

import React, { useState, useMemo, useId } from "react";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/Toast";
import { Sidebar } from "@/components/layout/Sidebar";
import { RequiereSesion } from "@/components/auth/RequiereSesion";
import { useStudents } from "@/modules/alumnos/useStudents";
import type {
  StudentUI,
  NivelEducativo,
  EstadoAlumno,
} from "@/modules/alumnos/types";
import { StudentsTable } from "./StudentsTable";
import { StudentFormModal, type ModoStudentModal } from "./StudentFormModal";
import { DeactivateStudentModal } from "./DeactivateStudentModal";

const PAGE_SIZE_OPTIONS = [10, 20, 50];

interface LocalFilters {
  busqueda: string;
  nivelEducativo: NivelEducativo | "Todos";
  materiaInteres: string | "Todas";
  estado: EstadoAlumno | "Todos";
}

export function StudentsPage() {
  const searchInputId = useId();
  const nivelSelectId = useId();
  const materiaSelectId = useId();
  const estadoSelectId = useId();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const { showToast } = useToast();

  const {
    students,
    materiasActivas,
    createStudent,
    updateStudent,
    deactivateStudent,
    reactivateStudent,
    getAuditLogsForStudent,
    checkDniDuplicate,
  } = useStudents();

  // Estado del Modal de Formulario / Ficha (Idéntico a UsersPage)
  const [formModal, setFormModal] = useState<{
    open: boolean;
    modo: ModoStudentModal;
    student: StudentUI | null;
  }>({
    open: false,
    modo: "INSERCION",
    student: null,
  });

  // Estado del Modal de Baja Lógica
  const [deactivateModal, setDeactivateModal] = useState<{
    open: boolean;
    student: StudentUI | null;
  }>({
    open: false,
    student: null,
  });

  // Filtros combinables
  const [filters, setFilters] = useState<LocalFilters>({
    busqueda: "",
    nivelEducativo: "Todos",
    materiaInteres: "Todas",
    estado: "Todos",
  });

  // Paginación
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [reactivatingId, setReactivatingId] = useState<number | null>(null);

  const availableMaterias = useMemo(() => {
    const set = new Set<string>();
    materiasActivas.forEach((m) => set.add(m.nombre));
    students.forEach((s) => {
      s.materiasInteres?.forEach((m) => set.add(m.nombre));
    });
    return Array.from(set).sort();
  }, [students, materiasActivas]);

  // Filtrado de alumnos: el filtro "Todos" muestra tanto activos como inactivos
  const filteredStudents = useMemo(() => {
    const q = filters.busqueda.trim().toLowerCase();

    return students.filter((s) => {
      // Filtro de estado: "Todos" no filtra por estado (muestra activos e inactivos)
      if (filters.estado !== "Todos" && s.estado !== filters.estado) {
        return false;
      }
      if (
        filters.nivelEducativo !== "Todos" &&
        s.nivelEducativo !== filters.nivelEducativo
      ) {
        return false;
      }
      if (filters.materiaInteres !== "Todas") {
        const tieneMateria = s.materiasInteres?.some(
          (m) => m.nombre.toLowerCase() === filters.materiaInteres.toLowerCase()
        );
        if (!tieneMateria) return false;
      }
      if (q) {
        const matchField = `${s.legajo} ${s.nombre} ${s.apellido} ${s.dni}`.toLowerCase();
        if (!matchField.includes(q)) return false;
      }
      return true;
    });
  }, [students, filters]);

  // Datos paginados
  const totalItems = filteredStudents.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const pageStart = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const pageEnd = Math.min(page * pageSize, totalItems);
  const paginatedStudents = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, page, pageSize]);

  // Handlers que abren los Modales (igual que en Usuarios)
  const handleView = (student: StudentUI) => {
    setFormModal({ open: true, modo: "LECTURA", student });
  };

  const handleEdit = (student: StudentUI) => {
    setFormModal({ open: true, modo: "EDICION", student });
  };

  const handleNew = () => {
    setFormModal({ open: true, modo: "INSERCION", student: null });
  };

  const handleOpenDeactivate = (student: StudentUI) => {
    setDeactivateModal({ open: true, student });
  };

  const handleConfirmDeactivate = async (
    studentId: number,
    options?: { confirmarConDeuda?: boolean }
  ) => {
    const result = await deactivateStudent(studentId, options);
    if (result.success) {
      showToast("success", "Alumno dado de baja lógicamente con éxito.");
    } else {
      showToast("error", result.message || "No se pudo procesar la baja.");
    }
  };

  const handleReactivate = async (student: StudentUI) => {
    setReactivatingId(student.id);
    try {
      const result = await reactivateStudent(student.id);
      if (result.success) {
        showToast(
          "success",
          `Alumno ${student.apellido}, ${student.nombre} reactivado exitosamente.`
        );
      } else {
        showToast("error", result.message || "Error al reactivar el alumno.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al reactivar.";
      showToast("error", msg);
    } finally {
      setReactivatingId(null);
    }
  };

  const handleSaveStudent = async (data: Partial<StudentUI>) => {
    try {
      if (formModal.modo === "INSERCION") {
        const created = await createStudent(
          data as Omit<
            StudentUI,
            "id" | "legajo" | "fechaCreacion" | "fechaActualizacion" | "estado"
          >
        );
        showToast(
          "success",
          `Alumno ${created.apellido}, ${created.nombre} registrado con legajo ${created.legajo}.`
        );
      } else if (formModal.modo === "EDICION" && formModal.student) {
        await updateStudent(formModal.student.id, data);
        showToast(
          "success",
          `Datos del alumno ${formModal.student.legajo} actualizados correctamente.`
        );
      }
      setFormModal({ open: false, modo: "INSERCION", student: null });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al guardar el alumno.";
      showToast("error", msg);
    }
  };

  const handleLimpiarFiltros = () => {
    setFilters({
      busqueda: "",
      nivelEducativo: "Todos",
      materiaInteres: "Todas",
      estado: "Todos",
    });
    setPage(1);
  };

  const handleExportCsv = () => {
    const headers = ["Legajo", "Apellido", "Nombre", "DNI", "Nivel", "Estado"];
    const rows = filteredStudents.map((s) => [
      s.legajo,
      s.apellido,
      s.nombre,
      s.dni,
      s.nivelEducativo,
      s.estado,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "alumnos.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("success", "Archivo alumnos.csv exportado.");
  };

  const handleImportCsv = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length <= 1) {
        showToast("error", "El archivo CSV no contiene registros para importar.");
        return;
      }

      let imported = 0;
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(",").map((p) => p.trim());
        if (parts.length >= 3) {
          const col1 = parts[0];
          const col2 = parts[1];
          const col3 = parts[2];
          const col4 = parts[3] ?? "";
          const col5 = parts[4] ?? "";

          let apellido = col1;
          let nombre = col2;
          let dni = col3;
          let nivel: NivelEducativo = "Secundario";

          if (col1.startsWith("A-") || col1.startsWith("ALU-")) {
            apellido = col2;
            nombre = col3;
            dni = col4;
            nivel = (col5 === "Primario" || col5 === "Universitario" ? col5 : "Secundario") as NivelEducativo;
          } else {
            nivel = (col4 === "Primario" || col4 === "Universitario" ? col4 : "Secundario") as NivelEducativo;
          }

          if (nombre && apellido && dni) {
            try {
              await createStudent({
                nombre,
                apellido,
                dni: dni.replace(/\D/g, "").slice(0, 8),
                fechaNacimiento: "2006-01-01",
                telefono: "3874000000",
                email: null,
                nivelEducativo: nivel,
                responsable: null,
                institucionOrigen: null,
                observacionesGenerales: "Importado vía CSV",
                materiasInteres: [],
                deudaPendiente: false,
              });
              imported++;
            } catch {
              // Si falla duplicado u otro motivo, continúa con el siguiente
            }
          }
        }
      }
      showToast("success", `Se procesó la importación: ${imported} alumnos registrados.`);
    } catch {
      showToast("error", "Error al leer el archivo CSV.");
    } finally {
      if (event.target) event.target.value = "";
    }
  };

  return (
    <RequiereSesion>
      <div className="flex min-h-screen bg-surface">
        <Sidebar />

        <main className="flex-1 px-6 py-6 lg:px-8">
          <div className="mx-auto flex max-w-6xl flex-col gap-5">
            {/* Header coherente con Usuarios y Profesores */}
            <header className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-md bg-primary-container/30">
                  <Icon name="school" size={24} className="text-primary" />
                </span>
                <div>
                  <h1 className="font-display text-2xl font-bold text-on-surface">
                    Alumnos del centro
                  </h1>
                  <p className="text-sm font-medium text-on-surface-variant">
                    Legajos del centro. Los inactivos no aparecen en otros módulos.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleImportCsv}
                />
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Importar lista de alumnos desde un archivo CSV"
                >
                  <Icon name="upload" size={18} />
                  Importar CSV
                </Button>
                <Button variant="outline" type="button" onClick={handleExportCsv}>
                  <Icon name="download" size={18} />
                  Exportar CSV
                </Button>
                <Button variant="primary" type="button" onClick={handleNew}>
                  <Icon name="person_add" size={18} />
                  Nuevo alumno
                </Button>
              </div>
            </header>

            {/* Caja de Filtros con el botón Limpiar filtros según captura */}
            <div className="rounded-md border border-outline-variant bg-surface-container-lowest p-4 shadow-card">
              <div className="flex flex-wrap items-end gap-4">
                {/* Buscador General */}
                <div className="min-w-[240px] flex-1">
                  <label
                    htmlFor={searchInputId}
                    className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1"
                  >
                    Buscar
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-on-surface-variant">
                      <Icon name="search" size={18} />
                    </span>
                    <input
                      id={searchInputId}
                      type="search"
                      value={filters.busqueda}
                      onChange={(e) => {
                        setFilters((prev) => ({ ...prev, busqueda: e.target.value }));
                        setPage(1);
                      }}
                      placeholder="Nombre, apellido, DNI o legajo"
                      className="w-full rounded-sm border border-outline-variant bg-surface-container-lowest py-2 pr-4 pl-9 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:border-secondary focus:ring-2 focus:ring-secondary/20 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Nivel Educativo */}
                <div className="w-full sm:w-44">
                  <label
                    htmlFor={nivelSelectId}
                    className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1"
                  >
                    Nivel educativo
                  </label>
                  <select
                    id={nivelSelectId}
                    value={filters.nivelEducativo}
                    onChange={(e) => {
                      setFilters((prev) => ({
                        ...prev,
                        nivelEducativo: e.target.value as NivelEducativo | "Todos",
                      }));
                      setPage(1);
                    }}
                    className="w-full cursor-pointer rounded-sm border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface focus:border-secondary focus:ring-2 focus:ring-secondary/20 focus:outline-none"
                  >
                    <option value="Todos">Todos</option>
                    <option value="Primario">Primario</option>
                    <option value="Secundario">Secundario</option>
                    <option value="Universitario">Universitario</option>
                  </select>
                </div>

                {/* Materia de Interés */}
                <div className="w-full sm:w-44">
                  <label
                    htmlFor={materiaSelectId}
                    className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1"
                  >
                    Materia
                  </label>
                  <select
                    id={materiaSelectId}
                    value={filters.materiaInteres}
                    onChange={(e) => {
                      setFilters((prev) => ({
                        ...prev,
                        materiaInteres: e.target.value,
                      }));
                      setPage(1);
                    }}
                    className="w-full cursor-pointer rounded-sm border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface focus:border-secondary focus:ring-2 focus:ring-secondary/20 focus:outline-none"
                  >
                    <option value="Todas">Todas</option>
                    {availableMaterias.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Estado */}
                <div className="w-full sm:w-36">
                  <label
                    htmlFor={estadoSelectId}
                    className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1"
                  >
                    Estado
                  </label>
                  <select
                    id={estadoSelectId}
                    value={filters.estado}
                    onChange={(e) => {
                      setFilters((prev) => ({
                        ...prev,
                        estado: e.target.value as EstadoAlumno | "Todos",
                      }));
                      setPage(1);
                    }}
                    className="w-full cursor-pointer rounded-sm border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface focus:border-secondary focus:ring-2 focus:ring-secondary/20 focus:outline-none"
                  >
                    <option value="Todos">Todos</option>
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </div>

                {/* Botón Limpiar filtros según diseño adjuntado en captura */}
                <button
                  type="button"
                  onClick={handleLimpiarFiltros}
                  className="flex h-10 cursor-pointer items-center gap-2 rounded-sm border border-secondary bg-white px-3.5 text-sm font-bold text-secondary shadow-xs transition-colors hover:bg-secondary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
                >
                  <Icon name="filter_alt_off" size={18} className="text-secondary" />
                  Limpiar filtros
                </button>
              </div>
            </div>

            {/* Listado de Alumnos */}
            <StudentsTable
              students={paginatedStudents}
              onView={handleView}
              onEdit={handleEdit}
              onDeactivate={handleOpenDeactivate}
              onReactivate={handleReactivate}
              reactivatingId={reactivatingId}
            />

            {/* Paginación */}
            {totalItems > 0 && (
              <div className="rounded-md border border-outline-variant bg-surface-container-lowest shadow-card">
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  pageStart={pageStart}
                  pageEnd={pageEnd}
                  pageSize={pageSize}
                  pageSizes={PAGE_SIZE_OPTIONS}
                  onPageChange={setPage}
                  onPageSizeChange={(newSize) => {
                    setPageSize(newSize);
                    setPage(1);
                  }}
                  itemLabel="alumnos"
                />
              </div>
            )}
          </div>
        </main>

        {/* Modal de Formulario Parametrizado (Modos INSERCION, EDICION, LECTURA) */}
        <StudentFormModal
          open={formModal.open}
          modo={formModal.modo}
          student={formModal.student}
          catalogoMaterias={materiasActivas}
          auditLogs={
            formModal.student ? getAuditLogsForStudent(formModal.student.id) : []
          }
          onClose={() => setFormModal({ open: false, modo: "INSERCION", student: null })}
          onSave={handleSaveStudent}
          checkDuplicate={checkDniDuplicate}
          onEditClick={(student) => {
            setFormModal({ open: true, modo: "EDICION", student });
          }}
          onDeactivateClick={(student) => {
            setDeactivateModal({ open: true, student });
          }}
          onReactivateClick={handleReactivate}
        />

        {/* Modal de Baja Lógica (Caso A y B) */}
        <DeactivateStudentModal
          open={deactivateModal.open}
          student={deactivateModal.student}
          onClose={() => setDeactivateModal({ open: false, student: null })}
          onConfirm={handleConfirmDeactivate}
          onNavigateToCancelTurns={(student) => {
            showToast(
              "error",
              `Navegando a Turnos para cancelar reservas de ${student.apellido}, ${student.nombre}`
            );
          }}
        />
      </div>
    </RequiereSesion>
  );
}

export default StudentsPage;
