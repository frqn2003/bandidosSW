// src/components/alumnos/StudentFormModal.tsx
//
// Modal de formulario y detalle del alumno (HU-ALU-02).
// Idéntico en diseño y estructura visual a UserFormModal de Usuarios.
// Modos: 'INSERCION', 'EDICION', 'LECTURA' (con Ficha y Bitácora secuenciales en scroll).

"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { StudentUI, StudentAuditLog, NivelEducativo } from "@/modules/alumnos/types";

export type ModoStudentModal = "INSERCION" | "EDICION" | "LECTURA";

interface StudentFormModalProps {
  open: boolean;
  modo: ModoStudentModal;
  student: StudentUI | null;
  auditLogs: StudentAuditLog[];
  catalogoMaterias?: { id: number; nombre: string }[];
  onClose: () => void;
  onSave: (data: Partial<StudentUI>) => Promise<void>;
  checkDuplicate: (dni: string, excludeId?: number) => StudentUI | undefined;
  onEditClick?: (student: StudentUI) => void;
  onDeactivateClick?: (student: StudentUI) => void;
  onReactivateClick?: (student: StudentUI) => void;
}

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

function formatearFecha(isoString?: string): string {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return isoString;
  }
}

export function StudentFormModal({
  open,
  modo,
  student,
  auditLogs,
  catalogoMaterias = [],
  onClose,
  onSave,
  checkDuplicate,
  onEditClick,
  onDeactivateClick,
  onReactivateClick,
}: StudentFormModalProps) {
  const isRead = modo === "LECTURA";
  const isEdit = modo === "EDICION";
  const isInsert = modo === "INSERCION";

  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [dni, setDni] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [nivelEducativo, setNivelEducativo] = useState<NivelEducativo>("Secundario");

  const [respNombre, setRespNombre] = useState("");
  const [respDni, setRespDni] = useState("");
  const [respTelefono, setRespTelefono] = useState("");
  const [respVinculo, setRespVinculo] = useState("Madre");

  const [institucionOrigen, setInstitucionOrigen] = useState("");
  const [materiasInteres, setMateriasInteres] = useState<{ id: number; nombre: string }[]>([]);
  const [observacionesGenerales, setObservacionesGenerales] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [dropdownMateriasOpen, setDropdownMateriasOpen] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) {
      if (student) {
        setNombre(student.nombre);
        setApellido(student.apellido);
        setDni(student.dni);
        setFechaNacimiento(student.fechaNacimiento);
        setEmail(student.email ?? "");
        setTelefono(student.telefono);
        setNivelEducativo(student.nivelEducativo);
        setRespNombre(student.responsable?.nombre ?? "");
        setRespDni(student.responsable?.dni ?? "");
        setRespTelefono(student.responsable?.telefono ?? "");
        setRespVinculo("Madre");
        setInstitucionOrigen(student.institucionOrigen ?? "");
        setMateriasInteres(student.materiasInteres ?? []);
        setObservacionesGenerales(student.observacionesGenerales ?? "");
      } else {
        setNombre("");
        setApellido("");
        setDni("");
        setFechaNacimiento("");
        setEmail("");
        setTelefono("");
        setNivelEducativo("Secundario");
        setRespNombre("");
        setRespDni("");
        setRespTelefono("");
        setRespVinculo("Madre");
        setInstitucionOrigen("");
        setMateriasInteres([]);
        setObservacionesGenerales("");
      }
      setErrors({});
      setDropdownMateriasOpen(false);
    }
  }, [open, student, modo]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleNameChange = (val: string, setter: (v: string) => void) => {
    setter(val.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, ""));
  };

  const edadCalculada = calcularEdad(fechaNacimiento);
  const esMenorDeEdad = edadCalculada !== null && edadCalculada < 18;

  const dniModificado =
    isEdit && student ? dni.trim() !== student.dni : isInsert && dni.trim().length >= 7;
  const dniConflict =
    dni.trim().length >= 7 ? checkDuplicate(dni, student?.id) : undefined;

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
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const materiasDisponiblesParaAgregar = catalogoMaterias.filter(
    (cat) => !materiasInteres.some((m) => m.id === cat.id)
  );

  // Bitácora para mostrar
  const displayAuditLogs: StudentAuditLog[] = auditLogs;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        isRead
          ? `Ficha de ${nombre} ${apellido}`
          : isInsert
          ? "Nuevo alumno"
          : "Modificar alumno"
      }
      maxWidth={isRead ? "max-w-4xl" : "max-w-3xl"}
      titleExtra={
        isRead && student ? (
          <StatusBadge
            variant={student.estado === "activo" ? "success" : "neutral"}
            icon={student.estado === "activo" ? "check_circle" : "cancel"}
            label={student.estado === "activo" ? "Activo" : "Inactivo"}
          />
        ) : undefined
      }
      subtitle={
        isRead && student
          ? `Alta: ${formatearFecha(student.fechaCreacion)} · Última modificación: ${formatearFecha(
              student.fechaActualizacion || student.fechaCreacion
            )}`
          : undefined
      }
      footer={
        !isRead ? (
          <div className="flex w-full items-center justify-between">
            <div>
              {isEdit && student && onDeactivateClick && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    onClose();
                    onDeactivateClick(student);
                  }}
                  disabled={student.estado === "inactivo"}
                >
                  <Icon name="delete" size={18} />
                  Dar de baja
                </Button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleSubmit}
                disabled={submitting || Boolean(dniConflict)}
              >
                <Icon name="save" size={18} />
                {isEdit ? "Guardar cambios" : "Guardar alumno"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant="outline" onClick={onClose}>
              Cerrar
            </Button>
            {student && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                {student.estado === "inactivo" && onReactivateClick ? (
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => {
                      onClose();
                      onReactivateClick(student);
                    }}
                  >
                    <Icon name="restart_alt" size={18} />
                    Reactivar alumno
                  </Button>
                ) : (
                  onEditClick && (
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => {
                        onClose();
                        onEditClick(student);
                      }}
                    >
                      <Icon name="edit" size={18} />
                      Modificar ficha
                    </Button>
                  )
                )}
              </div>
            )}
          </div>
        )
      }
    >
      {/* Banner de Modo (idéntico a Usuarios) */}
      <div className="mb-4 flex items-center justify-between border-b border-outline-variant pb-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-sm bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
            {modo === "EDICION" && "Modo EDICIÓN"}
            {modo === "LECTURA" && "Modo LECTURA"}
            {modo === "INSERCION" && "Modo INSERCIÓN"}
          </span>
        </div>
        {!isRead && (
          <span className="text-xs font-medium text-on-surface-variant">* Campo obligatorio</span>
        )}
      </div>

      {/* Banner Informativo si el alumno está inactivo */}
      {isRead && student?.estado === "inactivo" && (
        <div className="mb-5 flex items-start gap-2.5 rounded-sm border border-secondary/30 bg-secondary/10 p-3 text-xs text-on-surface">
          <Icon name="info" size={18} className="text-secondary shrink-0 mt-0.5" />
          <p>
            <strong>Alumno inactivo:</strong> no aparece en combos ni buscadores de otros módulos. Al reactivarlo se vuelve a validar que el DNI sea único.
          </p>
        </div>
      )}

      {/* Formulario / Detalle con Fieldsets */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* FIELDSET 1: DATOS PERSONALES */}
        <fieldset className="rounded-md border border-outline-variant p-5">
          <legend className="px-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            Datos personales
          </legend>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="nombre" className="text-sm font-semibold text-on-surface">
                Nombre *
              </label>
              <input
                id="nombre"
                type="text"
                required
                disabled={isRead}
                value={nombre}
                onChange={(e) => handleNameChange(e.target.value, setNombre)}
                className="h-11 rounded-sm border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface focus:border-secondary focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:opacity-60 disabled:cursor-not-allowed"
              />
              {errors.nombre && <p className="text-xs text-error font-medium">{errors.nombre}</p>}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="apellido" className="text-sm font-semibold text-on-surface">
                Apellido *
              </label>
              <input
                id="apellido"
                type="text"
                required
                disabled={isRead}
                value={apellido}
                onChange={(e) => handleNameChange(e.target.value, setApellido)}
                className="h-11 rounded-sm border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface focus:border-secondary focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:opacity-60 disabled:cursor-not-allowed"
              />
              {errors.apellido && <p className="text-xs text-error font-medium">{errors.apellido}</p>}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="dni" className="text-sm font-semibold text-on-surface">
                DNI *
              </label>
              <input
                id="dni"
                type="text"
                required
                disabled={isRead}
                value={dni}
                onChange={(e) => setDni(e.target.value.replace(/\D/g, "").slice(0, 8))}
                className={`h-11 rounded-sm border bg-surface-container-low px-3 text-sm text-on-surface focus:bg-surface-container-lowest focus:outline-none focus:ring-2 disabled:opacity-60 disabled:cursor-not-allowed ${
                  errors.dni || dniConflict
                    ? "border-error focus:border-error focus:ring-error/20"
                    : dniModificado && !dniConflict
                    ? "border-status-success focus:ring-2 focus:ring-status-success/20"
                    : "border-outline-variant focus:border-secondary focus:ring-secondary/20"
                }`}
              />
              {errors.dni ? (
                <p className="text-xs text-error font-medium flex items-center gap-1">
                  <Icon name="error" size={14} />
                  {errors.dni}
                </p>
              ) : dniConflict ? (
                <p className="text-xs text-error font-medium flex items-center gap-1">
                  <Icon name="warning" size={14} /> Ya existe alumno activo con este DNI
                </p>
              ) : dniModificado && !isRead ? (
                <p className="text-xs text-status-success-strong font-medium flex items-center gap-1">
                  <Icon name="check_circle" size={14} /> DNI modificado · disponible
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="email" className="text-sm font-semibold text-on-surface">
                Email *
              </label>
              <input
                id="email"
                type="email"
                disabled={isRead}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={isRead ? "—" : "alumno@dominio.com"}
                className="h-11 rounded-sm border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface focus:border-secondary focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="telefono" className="text-sm font-semibold text-on-surface">
                Teléfono
              </label>
              <input
                id="telefono"
                type="text"
                disabled={isRead}
                value={telefono}
                onChange={(e) => setTelefono(e.target.value.replace(/\D/g, "").slice(0, 11))}
                placeholder={isRead ? "—" : "Ej: 3874123456"}
                className="h-11 rounded-sm border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface focus:border-secondary focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:opacity-60 disabled:cursor-not-allowed"
              />
              {errors.telefono && (
                <p className="text-xs text-error font-medium flex items-center gap-1">
                  <Icon name="error" size={14} />
                  {errors.telefono}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="nivelEducativo" className="text-sm font-semibold text-on-surface">
                Nivel educativo *
              </label>
              <select
                id="nivelEducativo"
                required
                disabled={isRead}
                value={nivelEducativo}
                onChange={(e) => setNivelEducativo(e.target.value as NivelEducativo)}
                className="h-11 rounded-sm border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface focus:border-secondary focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="Primario">Primario</option>
                <option value="Secundario">Secundario</option>
                <option value="Universitario">Universitario</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="fechaNacimiento" className="text-sm font-semibold text-on-surface">
                Fecha de nacimiento *
              </label>
              <input
                id="fechaNacimiento"
                type="date"
                required
                disabled={isRead}
                value={fechaNacimiento}
                onChange={(e) => setFechaNacimiento(e.target.value)}
                className="h-11 rounded-sm border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface focus:border-secondary focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:opacity-60 disabled:cursor-not-allowed"
              />
              {edadCalculada !== null && (
                <p className="text-xs font-medium text-on-surface-variant">
                  {edadCalculada} {edadCalculada === 1 ? "año" : "años"}
                </p>
              )}
              {errors.fechaNacimiento && (
                <p className="text-xs text-error font-medium">{errors.fechaNacimiento}</p>
              )}
            </div>
          </div>
        </fieldset>

        {/* FIELDSET 2: RESPONSABLE */}
        {(!isRead || esMenorDeEdad || Boolean(student?.responsable?.nombre)) && (
          <fieldset className="rounded-md border border-outline-variant p-5">
            <legend className="px-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-2">
              Responsable
              {esMenorDeEdad && (
                <span className="text-[11px] font-semibold text-amber-600 lowercase">
                  (obligatorio por ser menor de 18 años)
                </span>
              )}
            </legend>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label htmlFor="respNombre" className="text-sm font-semibold text-on-surface">
                  Nombre y apellido {esMenorDeEdad && !isRead && "*"}
                </label>
                <input
                  id="respNombre"
                  type="text"
                  disabled={isRead}
                  value={respNombre}
                  onChange={(e) => handleNameChange(e.target.value, setRespNombre)}
                  className="h-11 rounded-sm border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface focus:border-secondary focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:opacity-60 disabled:cursor-not-allowed"
                />
                {errors.respNombre && (
                  <p className="text-xs text-error font-medium">{errors.respNombre}</p>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="respDni" className="text-sm font-semibold text-on-surface">
                  DNI {esMenorDeEdad && !isRead && "*"}
                </label>
                <input
                  id="respDni"
                  type="text"
                  disabled={isRead}
                  value={respDni}
                  onChange={(e) => setRespDni(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  className="h-11 rounded-sm border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface focus:border-secondary focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:opacity-60 disabled:cursor-not-allowed"
                />
                {errors.respDni && (
                  <p className="text-xs text-error font-medium">{errors.respDni}</p>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="respTelefono" className="text-sm font-semibold text-on-surface">
                  Teléfono {esMenorDeEdad && !isRead && "*"}
                </label>
                <input
                  id="respTelefono"
                  type="tel"
                  disabled={isRead}
                  value={respTelefono}
                  onChange={(e) => setRespTelefono(e.target.value.replace(/\D/g, "").slice(0, 11))}
                  className="h-11 rounded-sm border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface focus:border-secondary focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:opacity-60 disabled:cursor-not-allowed"
                />
                {errors.respTelefono && (
                  <p className="text-xs text-error font-medium">{errors.respTelefono}</p>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="respVinculo" className="text-sm font-semibold text-on-surface">
                  Vínculo {esMenorDeEdad && !isRead && "*"}
                </label>
                <select
                  id="respVinculo"
                  disabled={isRead}
                  value={respVinculo}
                  onChange={(e) => setRespVinculo(e.target.value)}
                  className="h-11 rounded-sm border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface focus:border-secondary focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="Madre">Madre</option>
                  <option value="Padre">Padre</option>
                  <option value="Tutor legal">Tutor legal</option>
                  <option value="Familiar">Familiar</option>
                </select>
              </div>
            </div>
          </fieldset>
        )}

        {/* FIELDSET 3: FICHA ACADÉMICA */}
        <fieldset className="rounded-md border border-outline-variant p-5">
          <legend className="px-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            Ficha académica
          </legend>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label htmlFor="institucionOrigen" className="text-sm font-semibold text-on-surface">
                  Institución de origen
                </label>
                {!isRead && (
                  <span className="text-[11px] font-mono text-on-surface-variant">
                    {institucionOrigen.length}/100
                  </span>
                )}
              </div>
              <input
                id="institucionOrigen"
                type="text"
                disabled={isRead}
                maxLength={100}
                value={institucionOrigen}
                onChange={(e) => setInstitucionOrigen(e.target.value)}
                placeholder={isRead ? "—" : "Ej: Colegio Nacional N.° 5041"}
                className="h-11 rounded-sm border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface focus:border-secondary focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-on-surface">
                Materias de interés
              </label>
              <div className="relative">
                <div className="min-h-11 flex flex-wrap items-center gap-1.5 rounded-sm border border-outline-variant bg-surface-container-low p-2">
                  {materiasInteres.length > 0 ? (
                    materiasInteres.map((materia) => (
                      <span
                        key={materia.id}
                        className="inline-flex items-center gap-1 rounded-sm border border-secondary/20 bg-secondary/5 px-2 py-0.5 text-xs font-semibold text-secondary"
                      >
                        {materia.nombre}
                        {!isRead && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMateria(materia.id)}
                            aria-label={`Eliminar materia ${materia.nombre}`}
                            className="text-secondary hover:text-primary cursor-pointer"
                          >
                            <Icon name="close" size={14} />
                          </button>
                        )}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-on-surface-variant">
                      {isRead ? "Sin materias registradas" : "Ninguna materia seleccionada"}
                    </span>
                  )}

                  {!isRead && (
                    <button
                      type="button"
                      onClick={() => setDropdownMateriasOpen(!dropdownMateriasOpen)}
                      className="inline-flex items-center gap-1 rounded-sm px-2 py-1 text-xs font-bold text-secondary hover:bg-surface-container-lowest cursor-pointer ml-auto"
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
              {!isRead && (
                <p className="text-[11px] text-on-surface-variant font-medium">
                  Solo materias activas del catálogo.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1 sm:col-span-2">
              <div className="flex items-center justify-between">
                <label htmlFor="observacionesGenerales" className="text-sm font-semibold text-on-surface">
                  Observaciones generales
                </label>
                {!isRead && (
                  <span className="text-[11px] font-mono text-on-surface-variant">
                    {observacionesGenerales.length}/250
                  </span>
                )}
              </div>
              <textarea
                id="observacionesGenerales"
                disabled={isRead}
                maxLength={250}
                rows={3}
                value={observacionesGenerales}
                onChange={(e) => setObservacionesGenerales(e.target.value)}
                placeholder={isRead ? "—" : "Observaciones académicas o de disponibilidad horaria..."}
                className="w-full rounded-sm border border-outline-variant bg-surface-container-low p-3 text-sm text-on-surface focus:border-secondary focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
          </div>
        </fieldset>
      </form>

      {/* SECCIÓN BITÁCORA DE AUDITORÍA (SOLO EN MODO LECTURA, AL PIE DEL CONTENIDO) */}
      {isRead && (
        <div className="mt-8">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-on-surface-variant">
            Bitácora de auditoría
          </h3>
          <div className="rounded-md border border-outline-variant bg-surface-container-lowest overflow-x-auto shadow-card">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-outline-variant bg-surface-container-low">
                <tr className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Hora</th>
                  <th className="px-4 py-3">Responsable</th>
                  <th className="px-4 py-3">Acción</th>
                  <th className="px-4 py-3">Campo</th>
                  <th className="px-4 py-3">Valor anterior</th>
                  <th className="px-4 py-3">Valor nuevo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60">
                {displayAuditLogs.length > 0 ? (
                  displayAuditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-surface-container-low/50">
                      <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">{log.fecha}</td>
                      <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">{log.hora}</td>
                      <td className="px-4 py-3 font-semibold whitespace-nowrap">{log.responsable}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {log.accion === "Modificación" && (
                          <span className="bg-orange-100 text-orange-700 font-bold px-2 py-0.5 rounded text-xs">
                            Modificación
                          </span>
                        )}
                        {log.accion === "Alta" && (
                          <span className="bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded text-xs">
                            Alta
                          </span>
                        )}
                        {log.accion === "Baja" && (
                          <span className="bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded text-xs">
                            Baja
                          </span>
                        )}
                        {log.accion === "Reactivación" && (
                          <span className="bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded text-xs">
                            Reactivación
                          </span>
                        )}
                        {!["Modificación", "Alta", "Baja", "Reactivación"].includes(log.accion) && (
                          <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded text-xs">
                            {log.accion}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">{log.campo}</td>
                      <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">{log.valorAnterior}</td>
                      <td className="px-4 py-3 font-medium text-on-surface whitespace-nowrap">{log.valorNuevo}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-sm text-on-surface-variant">
                      No hay registros de auditoría para este alumno.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  );
}
