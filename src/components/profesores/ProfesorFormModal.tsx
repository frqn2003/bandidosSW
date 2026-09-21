"use client";

import { useMemo, useState } from "react";
import type { MateriaRef, Profesor, UsuarioSinFicha } from "@/data/profesores";
import { Button } from "@/components/ui/Button";
import { Combobox } from "@/components/ui/Combobox";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Switch } from "@/components/ui/Switch";
import { EstadoProfesorBadge } from "@/components/profesores/EstadoProfesorBadge";
import {
  DIAS_SEMANA_SELECT,
  HORARIOS_OPCIONES,
  aMin,
  inicialesDe,
  nuevoIdFranja,
  tonoAvatarDe,
  validarFranjas,
  type FranjaForm,
} from "@/lib/profesores";

export type ModoProfesorForm = "INSERCION" | "EDICION";

export interface MateriaEnForm {
  materia: MateriaRef;
  capacidad: string; // "1".."10"
}

export interface ProfesorFormData {
  usuarioId: string;
  titulo: string;
  telefono: string;
  materias: MateriaEnForm[];
  capacidadDefault: number; // 1..10 (CHECK ck_profesor_capacidad)
  franjas: FranjaForm[];
  estado: boolean; // true = activo
}

const EMPTY_FORM: ProfesorFormData = {
  usuarioId: "",
  titulo: "",
  telefono: "",
  materias: [],
  capacidadDefault: 4,
  franjas: [],
  estado: true,
};

interface ProfesorFormModalProps {
  modo: ModoProfesorForm;
  titulo: string;
  open: boolean;
  onClose: () => void;
  datosIniciales?: ProfesorFormData;
  usuariosSinFicha: UsuarioSinFicha[];
  materiasCatalogo: MateriaRef[];
  onGuardar: (datos: ProfesorFormData) => void;
  /** Profesor en edición: identidad bloqueada + disparador de baja lógica. */
  profesor?: Profesor | null;
  onBaja?: (profesor: Profesor) => void;
}

function validar(datos: ProfesorFormData): Partial<Record<"usuarioId" | "telefono" | "materias", string>> {
  const errores: Partial<Record<"usuarioId" | "telefono" | "materias", string>> = {};
  if (datos.usuarioId === "") errores.usuarioId = "Seleccioná un usuario";
  if (!/^\d{10,11}$/.test(datos.telefono))
    errores.telefono = "Ingresá solo dígitos (10 a 11)";
  if (datos.materias.length === 0) errores.materias = "Elegí al menos 1 materia";
  return errores;
}

/** Validación por franja: fin posterior a inicio y sin superposición por día. */
export function ProfesorFormModal({
  modo,
  titulo,
  open,
  onClose,
  datosIniciales,
  usuariosSinFicha,
  materiasCatalogo,
  onGuardar,
  profesor,
  onBaja,
}: ProfesorFormModalProps) {
  const [datos, setDatos] = useState<ProfesorFormData>(EMPTY_FORM);
  const [envio, setEnvio] = useState(false);

  // Los estados se inicializan al abrir (mismo modal para los 2 modos).
  const [initialized, setInitialized] = useState(false);
  if (open && !initialized) {
    setDatos(datosIniciales ?? EMPTY_FORM);
    setEnvio(false);
    setInitialized(true);
  }
  if (!open && initialized) {
    setInitialized(false);
    setEnvio(false);
  }

  const set = (patch: Partial<ProfesorFormData>) => setDatos((d) => ({ ...d, ...patch }));

  const errores = useMemo(() => (envio ? validar(datos) : {}), [envio, datos]);
  const erroresFranjas = useMemo(
    () => (envio ? validarFranjas(datos.franjas) : {}),
    [envio, datos.franjas],
  );
  const errorFranjasGeneral =
    envio && datos.franjas.length === 0 ? "Agregá al menos 1 bloque horario semanal" : undefined;

  // Opciones del Combobox de usuario: rol Profesor, activo y sin ficha asociada.
  const usuariosOpciones = useMemo(
    () =>
      usuariosSinFicha.map((u) => ({
        value: String(u.id),
        label: `${u.apellido}, ${u.nombre} — ${u.email}`,
      })),
    [usuariosSinFicha],
  );

  const seleccionadas = new Set(datos.materias.map((m) => m.materia.id));

  const toggleMateria = (materia: MateriaRef) => {
    // BACKEND: POST/PUT /api/profesores/:id/materias con { materia_id, capacidad_maxima }
    if (seleccionadas.has(materia.id)) {
      set({ materias: datos.materias.filter((m) => m.materia.id !== materia.id) });
    } else {
      set({
        materias: [
          ...datos.materias,
          { materia, capacidad: String(datos.capacidadDefault || 4) },
        ],
      });
    }
  };

  const agregarFranja = () => {
    set({
      franjas: [...datos.franjas, { id: nuevoIdFranja(), dia: "1", desde: "08:00", hasta: "09:00" }],
    });
  };

  const actualizarFranja = (id: number, patch: Partial<Omit<FranjaForm, "id">>) => {
    set({
      franjas: datos.franjas.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    });
  };

  const quitarFranja = (id: number) => {
    set({ franjas: datos.franjas.filter((f) => f.id !== id) });
  };

  // BACKEND: PUT /api/profesores/:id/disponibilidad (franjas → agenda_profesional)
  const totalHorasFranjas = useMemo(
    () =>
      Math.round(
        datos.franjas.reduce((acc, f) => acc + (aMin(f.hasta) - aMin(f.desde)) / 60, 0) * 10,
      ) / 10,
    [datos.franjas],
  );

  const horasDeFranja = (f: FranjaForm) =>
    aMin(f.hasta) > aMin(f.desde)
      ? Math.round(((aMin(f.hasta) - aMin(f.desde)) / 60) * 10) / 10
      : 0;

  const guardar = () => {
    setEnvio(true);
    const err = validar(datos);
    const errF = validarFranjas(datos.franjas);
    if (Object.keys(err).length > 0 || Object.keys(errF).length > 0 || datos.franjas.length === 0)
      return;
    onGuardar(datos);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={titulo}
      subtitle={
        modo === "EDICION" && profesor
          ? `Modificá datos profesionales, materias asignadas o disponibilidad horaria de ${profesor.nombre} ${profesor.apellido}.`
          : "Completá la ficha profesional, materias asignadas y disponibilidad semanal."
      }
      icon={
        <Icon
          name={modo === "INSERCION" ? "person_add" : "edit"}
          size={22}
          className="text-primary"
        />
      }
      titleExtra={
        <>
          <StatusBadge
            variant="info"
            label={modo === "INSERCION" ? "MODO INSERCIÓN" : "MODO EDICIÓN"}
            icon="info"
          />
          {modo === "EDICION" && <EstadoProfesorBadge estado={datos.estado ? "activo" : "inactivo"} />}
        </>
      }
      maxWidth="max-w-2xl"
      footer={
        <>
          {modo === "EDICION" ? (
            <Button
              type="button"
              variant="destructive"
              className="sm:mr-auto"
              onClick={() => profesor && onBaja?.(profesor)}
            >
              <Icon name="person_off" size={16} />
              Dar de Baja Profesor...
            </Button>
          ) : (
            <p className="mr-auto text-xs font-medium text-on-surface-variant">
              <span className="text-error">*</span> Campos obligatorios
            </p>
          )}
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" variant="primary" onClick={guardar}>
            <Icon name="check" size={16} />
            {modo === "INSERCION" ? "Guardar y Habilitar Profesor" : "Guardar"}
          </Button>
        </>
      }
    >
      <form className="flex flex-col gap-5" onSubmit={(e) => e.preventDefault()} noValidate>
        {/* BACKEND: usuarios con rol Profesor, activos y sin ficha → GET /api/usuarios?rol=profesor&sin-ficha=true */}
        {modo === "INSERCION" ? (
          <div className="flex flex-col gap-1.5">
            <Combobox
              id="usuario-asociado"
              label="Usuario Asociado del Sistema"
              requiredMark
              error={errores.usuarioId}
              hint="Nombre, Apellido y Email se vinculan automáticamente"
              value={datos.usuarioId}
              options={usuariosOpciones}
              onChange={(v) => set({ usuarioId: v })}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <p className="flex items-center gap-1.5 text-sm font-bold text-on-surface">
                <Icon name="lock" size={14} className="text-on-surface-variant" />
                Usuario Asociado del Sistema
                <span className="text-error"> *</span>
              </p>
              <p className="text-xs font-semibold text-on-surface-variant">
                Bloqueado por integridad de identidad
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 rounded-sm border border-outline-variant bg-surface-container-low px-4 py-3">
              {profesor && (
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${tonoAvatarDe(profesor.id)}`}
                  >
                    {inicialesDe(profesor.nombre, profesor.apellido)}
                  </span>
                  <p className="text-sm font-bold text-on-surface">
                    {profesor.tituloEspecialidad ? `${profesor.tituloEspecialidad} — ` : ""}
                    {profesor.nombre} {profesor.apellido} ({profesor.email})
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {/* BACKEND: profesor.titulo_especialidad (varchar 100) */}
          <Input
            id="titulo-profesor"
            label="Título o Especialidad"
            placeholder="Ej: Ing. Mecánica — Univ. Tecnológica"
            maxLength={100}
            value={datos.titulo}
            onChange={(e) => set({ titulo: e.target.value })}
          />
          {/* BACKEND: profesor.telefono ^[0-9]{10,11}$ */}
          <Input
            id="telefono-profesor"
            label="Teléfono Contacto"
            requiredMark
            inputMode="numeric"
            placeholder="Ej: 1155555555"
            maxLength={11}
            error={errores.telefono}
            value={datos.telefono}
            onChange={(e) => set({ telefono: e.target.value.replace(/\D/g, "") })}
          />
        </div>

        {/* BACKEND: capacidad global del CHECK ck_profesor_capacidad (1-10);
            el front la refleja en profesor_materia.capacidad_maxima. */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="sm:max-w-xs">
            <label htmlFor="capacidad-default" className="text-sm font-bold text-on-surface">
              <span className="text-error"> * </span>
              Capacidad Máxima de Alumnos
            </label>
            <p className="mt-0.5 text-xs font-medium text-on-surface-variant">
              Capacidad por bloque lectivo (1 = Clase individual,
              <br />
              2-10 = grupal)
            </p>
          </div>
          <Select
            id="capacidad-default"
            aria-label="Capacidad Máxima de Alumnos"
            value={String(datos.capacidadDefault)}
            onChange={(e) => set({ capacidadDefault: Number(e.target.value) })}
            className="h-10 min-h-10 text-sm sm:w-56"
          >
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? "alumno" : "alumnos"}
                {n === datos.capacidadDefault ? " (Por defecto)" : ""}
              </option>
            ))}
          </Select>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-bold text-on-surface">
            <span className="text-error"> * </span>
            Materias que Dicta
            <span className="ml-2 text-xs font-semibold text-on-surface-variant">
              {datos.materias.length === 0
                ? "elegí al menos 1 materia"
                : `${datos.materias.length} ${datos.materias.length === 1 ? "materia seleccionada" : "materias seleccionadas"}`}
            </span>
          </legend>
          {errores.materias && (
            <p role="alert" className="text-sm font-semibold text-error">
              {errores.materias}
            </p>
          )}
          <div className="grid gap-1.5 sm:grid-cols-2">
            {materiasCatalogo.map((materia) => {
              const marcada = seleccionadas.has(materia.id);
              return (
                <label
                  key={materia.id}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-sm border px-3 py-2 transition-colors duration-fast ease-out ${
                    marcada
                      ? "border-secondary/50 bg-surface-container-low"
                      : "border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="h-5 w-5 shrink-0 cursor-pointer accent-secondary"
                    checked={marcada}
                    onChange={() => toggleMateria(materia)}
                  />
                  <span className="flex-1 text-sm font-semibold text-on-surface">
                    {materia.nombre}
                  </span>
                </label>
              );
            })}
          </div>
          <p className="text-xs font-medium text-on-surface-variant">
            {modo === "EDICION"
              ? "Si retiras materias con turnos asignados, solicitará reasignación previa."
              : "Al menos una materia obligatoria para habilitar la ficha."}
          </p>
        </fieldset>

        {/* BACKEND: PUT /api/profesores/:id/disponibilidad → agenda_profesional
            (bloques de 30 min dentro del horario de la sede). */}
        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-bold text-on-surface">
            Gestión de Disponibilidad Horaria Semanal
            <span className="text-error"> * </span>
          </legend>
          <p className="text-xs font-medium text-on-surface-variant">
            Define franjas horarias en bloques de 30 min.
          </p>
          <p className="text-sm font-semibold text-on-surface" aria-live="polite">
            Total activo programado: {totalHorasFranjas.toFixed(1)} h semanales asignables
          </p>
          {errorFranjasGeneral && (
            <p role="alert" className="text-sm font-semibold text-error">
              {errorFranjasGeneral}
            </p>
          )}
          <div className="flex flex-col gap-2">
            {datos.franjas.map((franja) => {
              return (
                <div
                  key={franja.id}
                  className="flex flex-wrap items-center gap-2 rounded-sm border border-outline-variant bg-surface-container-low px-3 py-2"
                >
                  <div className="flex min-w-[9.5rem] flex-1 items-center gap-1.5">
                  <Select
                    id={`franja-dia-${franja.id}`}
                    aria-label="Día de la franja"
                    value={franja.dia}
                    onChange={(e) => actualizarFranja(franja.id, { dia: e.target.value })}
                    className="h-10 min-h-10 w-full px-2 text-sm"
                  >
                    {DIAS_SEMANA_SELECT.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </Select>
                </div>
                  <div className="flex min-w-[9.5rem] flex-1 items-center gap-1.5">
                    <span className="text-xs font-bold text-on-surface-variant">De:</span>
                    <Select
                      id={`franja-desde-${franja.id}`}
                      aria-label={`Hora de inicio del día ${franja.dia}`}
                      value={franja.desde}
                      onChange={(e) => actualizarFranja(franja.id, { desde: e.target.value })}
                      className="h-10 min-h-10 w-full px-2 text-sm"
                    >
                      {HORARIOS_OPCIONES.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="flex min-w-[9.5rem] flex-1 items-center gap-1.5">
                    <span className="text-xs font-bold text-on-surface-variant">A:</span>
                    <Select
                      id={`franja-hasta-${franja.id}`}
                      aria-label={`Hora de fin del día ${franja.dia}`}
                      value={franja.hasta}
                      onChange={(e) => actualizarFranja(franja.id, { hasta: e.target.value })}
                      className="h-10 min-h-10 w-full px-2 text-sm"
                    >
                      {HORARIOS_OPCIONES.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <span className="w-12 text-right text-xs font-bold text-on-surface-variant">
                    {horasDeFranja(franja).toFixed(1)} h
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Quitar bloque horario del día ${franja.dia}`}
                    onClick={() => quitarFranja(franja.id)}
                    className="ml-auto"
                  >
                    <Icon name="delete" size={20} />
                  </Button>
                  {erroresFranjas[franja.id] && (
                    <p role="alert" className="w-full text-sm font-semibold text-error">
                      {erroresFranjas[franja.id]}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <div>
            <Button type="button" variant="outline" onClick={agregarFranja}>
              <Icon name="add" size={16} />
              Agregar Bloque Horario
            </Button>
          </div>
        </fieldset>

        <div className="flex items-center justify-between gap-3 rounded-sm border border-outline-variant bg-surface-container-low px-4 py-3">
          <div>
            <p className="text-sm font-bold text-on-surface">
              {modo === "EDICION" ? "Estado del Profesor: Habilitado para Turnos" : "Estado Inicial del Docente"}
            </p>
            <p className="text-xs font-medium text-on-surface-variant">
              {datos.estado ? (
                <>
                  <span aria-hidden="true" className="mr-1 inline-block h-2 w-2 rounded-full bg-status-success align-middle" />
                  Disponible para asignación de turnos y agendas académicas
                </>
              ) : (
                "Inhabilitado — no recibe nuevas reservas hasta reactivarlo"
              )}
            </p>
          </div>
          <Switch
            checked={datos.estado}
            onChange={(v) => set({ estado: v })}
            ariaLabel="Profesor habilitado para asignación de turnos"
          />
        </div>
      </form>
    </Modal>
  );
}