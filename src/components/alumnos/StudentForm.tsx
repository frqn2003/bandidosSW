// src/components/alumnos/StudentForm.tsx
//
// Formulario Parametrizado de Alumno (HU-ALU-02) alineado al Design System.

"use client";

import React, { useState, useId } from "react";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { StudentUI, NivelEducativo } from "@/modules/alumnos/types";

export type ModoForm = "INSERT" | "EDIT" | "READ";

interface StudentFormProps {
  modo: ModoForm;
  student?: StudentUI | null;
  onSave: (data: Partial<StudentUI>) => Promise<void>;
  onCancel: () => void;
  onDeactivateClick?: (student: StudentUI) => void;
  checkDniAvailability: (dni: string, excludeId?: number) => StudentUI | undefined;
}

const CATALOGO_MATERIAS = [
  { id: 1, nombre: "Matemática" },
  { id: 2, nombre: "Física" },
  { id: 3, nombre: "Química" },
  { id: 4, nombre: "Inglés" },
  { id: 5, nombre: "Lengua" },
  { id: 6, nombre: "Biología" },
  { id: 7, nombre: "Historia" },
];

function calcularEdad(fechaNacimiento: string): number | null {
  if (!fechaNacimiento || fechaNacimiento.length < 10) return null;
  const [year, month, day] = fechaNacimiento.split("-").map(Number);
  if (!year || !month || !day) return null;

  const today = new Date();
  let age = today.getFullYear() - year;
  const m = today.getMonth() + 1 - month;
  if (m < 0 || (m === 0 && today.getDate() < day)) {
    age--;
  }
  return age >= 0 ? age : null;
}

function formatearFechaVisual(fechaIso?: string): string {
  if (!fechaIso) return new Date().toLocaleDateString("es-AR");
  try {
    const d = new Date(fechaIso);
    return d.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return fechaIso;
  }
}

export function StudentForm({
  modo,
  student,
  onSave,
  onCancel,
  onDeactivateClick,
  checkDniAvailability,
}: StudentFormProps) {
  const isRead = modo === "READ";
  const isEdit = modo === "EDIT";
  const isInsert = modo === "INSERT";

  const nombreId = useId();
  const apellidoId = useId();
  const dniId = useId();
  const fechaNacId = useId();
  const emailId = useId();
  const telefonoId = useId();
  const nivelId = useId();
  const respNombreId = useId();
  const respDniId = useId();
  const respTelId = useId();
  const respVinculoId = useId();
  const institucionId = useId();
  const observacionesId = useId();

  const [nombre, setNombre] = useState(student?.nombre ?? "");
  const [apellido, setApellido] = useState(student?.apellido ?? "");
  const [dni, setDni] = useState(student?.dni ?? "");
  const [fechaNacimiento, setFechaNacimiento] = useState(
    student?.fechaNacimiento ?? "2008-05-14"
  );
  const [email, setEmail] = useState(student?.email ?? "");
  const [telefono, setTelefono] = useState(student?.telefono ?? "");
  const [nivelEducativo, setNivelEducativo] = useState<NivelEducativo>(
    student?.nivelEducativo ?? "Secundario"
  );

  const [respNombre, setRespNombre] = useState(student?.responsable?.nombre ?? "");
  const [respDni, setRespDni] = useState(student?.responsable?.dni ?? "");
  const [respTelefono, setRespTelefono] = useState(student?.responsable?.telefono ?? "");
  const [respVinculo, setRespVinculo] = useState("Madre");

  const [institucionOrigen, setInstitucionOrigen] = useState(
    student?.institucionOrigen ?? ""
  );
  const [materiasInteres, setMateriasInteres] = useState<
    { id: number; nombre: string }[]
  >(student?.materiasInteres ?? []);
  const [observacionesGenerales, setObservacionesGenerales] = useState(
    student?.observacionesGenerales ?? ""
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [dropdownMateriasOpen, setDropdownMateriasOpen] = useState(false);

  const handleNameChange = (val: string, setter: (v: string) => void) => {
    setter(val.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, ""));
  };

  const edadCalculada = calcularEdad(fechaNacimiento);
  const esMenorDeEdad = edadCalculada !== null && edadCalculada < 18;

  const dniModificado =
    isEdit && student ? dni.trim() !== student.dni : isInsert && dni.trim().length >= 7;
  const dniConflict =
    dni.trim().length >= 7 ? checkDniAvailability(dni, student?.id) : undefined;

  const handleAddMateria = (materia: { id: number; nombre: string }) => {
    if (!materiasInteres.some((m) => m.id === materia.id)) {
      setMateriasInteres([...materiasInteres, materia]);
    }
    setDropdownMateriasOpen(false);
  };

  const handleRemoveMateria = (materiaId: number) => {
    if (isRead) return;
    setMateriasInteres(materiasInteres.filter((m) => m.id !== materiaId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRead) return;

    const newErrors: Record<string, string> = {};

    if (!nombre.trim()) newErrors.nombre = "El nombre es obligatorio.";
    if (!apellido.trim()) newErrors.apellido = "El apellido es obligatorio.";
    if (!dni.trim() || !/^\d{7,8}$/.test(dni.trim())) {
      newErrors.dni = "El DNI debe tener 7 u 8 dígitos numéricos.";
    } else if (dniConflict) {
      newErrors.dni = `El DNI ya pertenece a ${dniConflict.apellido}, ${dniConflict.nombre} (${dniConflict.legajo}).`;
    }

    if (!fechaNacimiento) {
      newErrors.fechaNacimiento = "La fecha de nacimiento es obligatoria.";
    }

    if (esMenorDeEdad) {
      if (!respNombre.trim()) newErrors.respNombre = "Nombre del responsable obligatorio para menores.";
      if (!respDni.trim() || !/^\d{7,8}$/.test(respDni.trim())) {
        newErrors.respDni = "DNI del responsable requerido (7 u 8 dígitos).";
      }
      if (!respTelefono.trim()) newErrors.respTelefono = "Teléfono del responsable obligatorio.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setSubmitting(true);

    try {
      await onSave({
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        dni: dni.trim(),
        fechaNacimiento,
        email: email.trim() || null,
        telefono: telefono.trim(),
        nivelEducativo,
        responsable:
          esMenorDeEdad || respNombre.trim()
            ? {
                nombre: respNombre.trim(),
                dni: respDni.trim(),
                telefono: respTelefono.trim(),
              }
            : null,
        institucionOrigen: institucionOrigen.trim() || null,
        observacionesGenerales: observacionesGenerales.trim() || null,
        materiasInteres,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const materiasDisponiblesParaAgregar = CATALOGO_MATERIAS.filter(
    (cat) => !materiasInteres.some((m) => m.id === cat.id)
  );

  return (
    <div className="rounded-md border border-outline-variant bg-surface-container-lowest shadow-card">
      {/* Encabezado del Formulario */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant px-6 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-display text-xl font-bold text-on-surface">
            {isInsert
              ? "Nuevo alumno"
              : `${student?.nombre ?? ""} ${student?.apellido ?? ""}`}
          </h2>

          {!isInsert && (
            <StatusBadge
              variant={student?.estado === "activo" ? "success" : "neutral"}
              icon={student?.estado === "activo" ? "check_circle" : "cancel"}
              label={student?.estado === "activo" ? "Activo" : "Inactivo"}
            />
          )}

          <span className="inline-flex items-center rounded-sm bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
            {isEdit && "Modo EDICIÓN"}
            {isRead && "Modo LECTURA"}
            {isInsert && "Modo INSERCIÓN"}
          </span>
        </div>

        {!isRead && (
          <p className="text-xs font-medium text-on-surface-variant">* Campo obligatorio</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* DATOS PERSONALES */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
            Datos personales
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Nombre */}
            <div>
              <label htmlFor={nombreId} className="block text-xs font-bold text-on-surface mb-1">
                Nombre {!isRead && "*"}
              </label>
              <input
                id={nombreId}
                type="text"
                disabled={isRead}
                value={nombre}
                onChange={(e) => handleNameChange(e.target.value, setNombre)}
                className="w-full rounded-sm border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface disabled:bg-surface-container-high disabled:text-on-surface-variant disabled:cursor-not-allowed focus:border-secondary focus:ring-2 focus:ring-secondary/20 focus:outline-none"
              />
              {errors.nombre && <p className="mt-1 text-xs text-error font-medium">{errors.nombre}</p>}
            </div>

            {/* Apellido */}
            <div>
              <label htmlFor={apellidoId} className="block text-xs font-bold text-on-surface mb-1">
                Apellido {!isRead && "*"}
              </label>
              <input
                id={apellidoId}
                type="text"
                disabled={isRead}
                value={apellido}
                onChange={(e) => handleNameChange(e.target.value, setApellido)}
                className="w-full rounded-sm border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface disabled:bg-surface-container-high disabled:text-on-surface-variant disabled:cursor-not-allowed focus:border-secondary focus:ring-2 focus:ring-secondary/20 focus:outline-none"
              />
              {errors.apellido && <p className="mt-1 text-xs text-error font-medium">{errors.apellido}</p>}
            </div>

            {/* DNI */}
            <div>
              <label htmlFor={dniId} className="block text-xs font-bold text-on-surface mb-1">
                DNI {!isRead && "*"}
              </label>
              <input
                id={dniId}
                type="text"
                disabled={isRead}
                value={dni}
                onChange={(e) => setDni(e.target.value.replace(/\D/g, "").slice(0, 8))}
                className={`w-full rounded-sm border px-3 py-2 text-sm text-on-surface font-mono disabled:bg-surface-container-high disabled:text-on-surface-variant disabled:cursor-not-allowed focus:outline-none ${
                  dniConflict
                    ? "border-error focus:ring-2 focus:ring-error/20"
                    : dniModificado && !dniConflict
                      ? "border-status-success focus:ring-2 focus:ring-status-success/20"
                      : "border-outline-variant focus:border-secondary focus:ring-2 focus:ring-secondary/20"
                }`}
              />
              {errors.dni ? (
                <p className="mt-1 text-xs text-error font-medium">{errors.dni}</p>
              ) : dniConflict ? (
                <p className="mt-1 text-xs text-error font-medium flex items-center gap-1">
                  <Icon name="warning" size={14} /> Ya existe alumno activo con este DNI
                </p>
              ) : dniModificado ? (
                <p className="mt-1 text-xs text-status-success-strong font-medium flex items-center gap-1">
                  <Icon name="check_circle" size={14} /> DNI modificado · disponible
                </p>
              ) : null}
            </div>

            {/* Fecha de nacimiento */}
            <div>
              <label htmlFor={fechaNacId} className="block text-xs font-bold text-on-surface mb-1">
                Fecha de nacimiento {!isRead && "*"}
              </label>
              <input
                id={fechaNacId}
                type="date"
                disabled={isRead}
                value={fechaNacimiento}
                onChange={(e) => setFechaNacimiento(e.target.value)}
                className="w-full rounded-sm border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface disabled:bg-surface-container-high disabled:text-on-surface-variant disabled:cursor-not-allowed focus:border-secondary focus:ring-2 focus:ring-secondary/20 focus:outline-none"
              />
              {edadCalculada !== null && (
                <p className="mt-1 text-xs font-medium text-on-surface-variant">
                  {edadCalculada} {edadCalculada === 1 ? "año" : "años"}
                </p>
              )}
              {errors.fechaNacimiento && (
                <p className="mt-1 text-xs text-error font-medium">{errors.fechaNacimiento}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor={emailId} className="block text-xs font-bold text-on-surface mb-1">
                Email
              </label>
              <input
                id={emailId}
                type="email"
                disabled={isRead}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-sm border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface disabled:bg-surface-container-high disabled:text-on-surface-variant disabled:cursor-not-allowed focus:border-secondary focus:ring-2 focus:ring-secondary/20 focus:outline-none"
              />
            </div>

            {/* Teléfono */}
            <div>
              <label htmlFor={telefonoId} className="block text-xs font-bold text-on-surface mb-1">
                Teléfono {!isRead && "*"}
              </label>
              <input
                id={telefonoId}
                type="tel"
                disabled={isRead}
                value={telefono}
                onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ""))}
                className="w-full rounded-sm border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface disabled:bg-surface-container-high disabled:text-on-surface-variant disabled:cursor-not-allowed focus:border-secondary focus:ring-2 focus:ring-secondary/20 focus:outline-none"
              />
            </div>

            {/* Nivel Educativo */}
            <div className="lg:col-span-2">
              <label htmlFor={nivelId} className="block text-xs font-bold text-on-surface mb-1">
                Nivel educativo {!isRead && "*"}
              </label>
              <select
                id={nivelId}
                disabled={isRead}
                value={nivelEducativo}
                onChange={(e) => setNivelEducativo(e.target.value as NivelEducativo)}
                className="w-full rounded-sm border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface disabled:bg-surface-container-high disabled:text-on-surface-variant disabled:cursor-not-allowed focus:border-secondary focus:ring-2 focus:ring-secondary/20 focus:outline-none"
              >
                <option value="Primario">Primario</option>
                <option value="Secundario">Secundario</option>
                <option value="Universitario">Universitario</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECCIÓN 3: RESPONSABLE */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Responsable
            </h3>
            {esMenorDeEdad && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-status-warning/15 px-2.5 py-0.5 text-xs font-bold text-on-surface">
                <span className="h-1.5 w-1.5 rounded-full bg-status-warning-strong" />
                Obligatorio · el alumno es menor de 18
              </span>
            )}
          </div>

          <p className="text-xs text-on-surface-variant mb-3 italic">
            Se reevalúa al cambiar la fecha de nacimiento.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Nombre del Responsable */}
            <div>
              <label htmlFor={respNombreId} className="block text-xs font-bold text-on-surface mb-1">
                Nombre y apellido {esMenorDeEdad && !isRead && "*"}
              </label>
              <input
                id={respNombreId}
                type="text"
                disabled={isRead}
                value={respNombre}
                onChange={(e) => handleNameChange(e.target.value, setRespNombre)}
                className="w-full rounded-sm border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface disabled:bg-surface-container-high disabled:text-on-surface-variant disabled:cursor-not-allowed focus:border-secondary focus:ring-2 focus:ring-secondary/20 focus:outline-none"
              />
              {errors.respNombre && (
                <p className="mt-1 text-xs text-error font-medium">{errors.respNombre}</p>
              )}
            </div>

            {/* DNI del Responsable */}
            <div>
              <label htmlFor={respDniId} className="block text-xs font-bold text-on-surface mb-1">
                DNI {esMenorDeEdad && !isRead && "*"}
              </label>
              <input
                id={respDniId}
                type="text"
                disabled={isRead}
                value={respDni}
                onChange={(e) => setRespDni(e.target.value.replace(/\D/g, "").slice(0, 8))}
                className="w-full rounded-sm border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface disabled:bg-surface-container-high disabled:text-on-surface-variant disabled:cursor-not-allowed focus:border-secondary focus:ring-2 focus:ring-secondary/20 focus:outline-none"
              />
              {errors.respDni && (
                <p className="mt-1 text-xs text-error font-medium">{errors.respDni}</p>
              )}
            </div>

            {/* Teléfono del Responsable */}
            <div>
              <label htmlFor={respTelId} className="block text-xs font-bold text-on-surface mb-1">
                Teléfono {esMenorDeEdad && !isRead && "*"}
              </label>
              <input
                id={respTelId}
                type="tel"
                disabled={isRead}
                value={respTelefono}
                onChange={(e) => setRespTelefono(e.target.value.replace(/\D/g, ""))}
                className="w-full rounded-sm border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface disabled:bg-surface-container-high disabled:text-on-surface-variant disabled:cursor-not-allowed focus:border-secondary focus:ring-2 focus:ring-secondary/20 focus:outline-none"
              />
              {errors.respTelefono && (
                <p className="mt-1 text-xs text-error font-medium">{errors.respTelefono}</p>
              )}
            </div>

            {/* Vínculo */}
            <div>
              <label htmlFor={respVinculoId} className="block text-xs font-bold text-on-surface mb-1">
                Vínculo {esMenorDeEdad && !isRead && "*"}
              </label>
              <select
                id={respVinculoId}
                disabled={isRead}
                value={respVinculo}
                onChange={(e) => setRespVinculo(e.target.value)}
                className="w-full rounded-sm border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface disabled:bg-surface-container-high disabled:text-on-surface-variant disabled:cursor-not-allowed focus:border-secondary focus:ring-2 focus:ring-secondary/20 focus:outline-none"
              >
                <option value="Madre">Madre</option>
                <option value="Padre">Padre</option>
                <option value="Tutor legal">Tutor legal</option>
                <option value="Familiar">Familiar</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECCIÓN 4: FICHA ACADÉMICA */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
            Ficha académica
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Institución de origen */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor={institucionId} className="block text-xs font-bold text-on-surface">
                  Institución de origen
                </label>
                <span className="text-[11px] font-mono text-on-surface-variant">
                  {institucionOrigen.length}/100
                </span>
              </div>
              <input
                id={institucionId}
                type="text"
                disabled={isRead}
                maxLength={100}
                value={institucionOrigen}
                onChange={(e) => setInstitucionOrigen(e.target.value)}
                placeholder="Ej: Colegio Nacional N.° 5041"
                className="w-full rounded-sm border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface disabled:bg-surface-container-high disabled:text-on-surface-variant disabled:cursor-not-allowed focus:border-secondary focus:ring-2 focus:ring-secondary/20 focus:outline-none"
              />
            </div>

            {/* Materias de interés */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-on-surface">
                  Materias de interés
                </label>
              </div>
              <div className="relative">
                <div className="min-h-[42px] flex flex-wrap items-center gap-1.5 rounded-sm border border-outline-variant bg-surface-container-lowest p-2 focus-within:border-secondary focus-within:ring-2 focus-within:ring-secondary/20">
                  {materiasInteres.map((materia) => (
                    <span
                      key={materia.id}
                      className="inline-flex items-center gap-1 rounded-sm bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary"
                    >
                      {materia.nombre}
                      {!isRead && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMateria(materia.id)}
                          aria-label={`Eliminar materia ${materia.nombre}`}
                          className="text-primary hover:text-secondary cursor-pointer"
                        >
                          <Icon name="close" size={14} />
                        </button>
                      )}
                    </span>
                  ))}

                  {!isRead && (
                    <button
                      type="button"
                      onClick={() => setDropdownMateriasOpen(!dropdownMateriasOpen)}
                      className="inline-flex items-center gap-1 rounded-sm px-2 py-1 text-xs font-bold text-secondary hover:bg-surface-container-low cursor-pointer"
                    >
                      <Icon name="add" size={14} /> Agregar materia ▾
                    </button>
                  )}
                </div>

                {dropdownMateriasOpen && materiasDisponiblesParaAgregar.length > 0 && (
                  <div className="absolute z-20 mt-1 max-h-48 w-56 overflow-auto rounded-md border border-outline-variant bg-surface-container-lowest py-1 shadow-modal">
                    {materiasDisponiblesParaAgregar.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleAddMateria(cat)}
                        className="w-full text-left px-3 py-1.5 text-xs text-on-surface hover:bg-surface-container-low hover:text-primary cursor-pointer"
                      >
                        {cat.nombre}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <p className="mt-1 text-[11px] text-on-surface-variant font-medium">
                Solo materias activas del catálogo.
              </p>
            </div>

            {/* Observaciones generales */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label htmlFor={observacionesId} className="block text-xs font-bold text-on-surface">
                  Observaciones generales
                </label>
                <span className="text-[11px] font-mono text-on-surface-variant">
                  {observacionesGenerales.length}/250
                </span>
              </div>
              <textarea
                id={observacionesId}
                disabled={isRead}
                maxLength={250}
                rows={3}
                value={observacionesGenerales}
                onChange={(e) => setObservacionesGenerales(e.target.value)}
                placeholder="Observaciones académicas o de disponibilidad horaria..."
                className="w-full rounded-sm border border-outline-variant bg-surface-container-lowest p-3 text-sm text-on-surface disabled:bg-surface-container-high disabled:text-on-surface-variant disabled:cursor-not-allowed focus:border-secondary focus:ring-2 focus:ring-secondary/20 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* BOTONES INFERIORES */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-outline-variant">
          <div>
            {isEdit && student && onDeactivateClick && (
              <Button
                variant="destructive"
                type="button"
                onClick={() => onDeactivateClick(student)}
              >
                <Icon name="person_remove" size={18} />
                Dar de baja
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" type="button" onClick={onCancel}>
              {isRead ? "Volver" : "Cancelar"}
            </Button>

            {!isRead && (
              <Button
                variant="primary"
                type="submit"
                disabled={submitting || Boolean(dniConflict)}
              >
                <Icon name="save" size={18} />
                {submitting
                  ? "Guardando..."
                  : isEdit
                    ? "Guardar cambios"
                    : "Guardar alumno"}
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
