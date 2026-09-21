"use client";

import { useMemo, useState } from "react";
import type { MateriaRef, UsuarioSinFicha } from "@/data/profesores";
import { Button } from "@/components/ui/Button";
import { Combobox } from "@/components/ui/Combobox";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Switch } from "@/components/ui/Switch";

export type ModoProfesorForm = "INSERCION" | "EDICION" | "LECTURA";

export interface MateriaEnForm {
  materia: MateriaRef;
  capacidad: string; // "1".."10"
}

export interface ProfesorFormData {
  usuarioId: string;
  titulo: string;
  telefono: string;
  materias: MateriaEnForm[];
  estado: boolean; // true = activo
}

const EMPTY_FORM: ProfesorFormData = {
  usuarioId: "",
  titulo: "",
  telefono: "",
  materias: [],
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
}

function validar(datos: ProfesorFormData): Partial<Record<keyof ProfesorFormData, string>> {
  const errores: Partial<Record<keyof ProfesorFormData, string>> = {};
  if (datos.usuarioId === "") errores.usuarioId = "Seleccioná un usuario";
  if (!/^\d{10,11}$/.test(datos.telefono))
    errores.telefono = "Ingresá solo dígitos (10 a 11)";
  if (datos.materias.length === 0) errores.materias = "Agregá al menos 1 materia";
  const capacidadInvalida = datos.materias.some(
    (m) => !/^\d{1,2}$/.test(m.capacidad) || Number(m.capacidad) < 1 || Number(m.capacidad) > 10,
  );
  if (capacidadInvalida) errores.materias = "Cada capacidad debe estar entre 1 y 10";
  return errores;
}

export function ProfesorFormModal({
  modo,
  titulo,
  open,
  onClose,
  datosIniciales,
  usuariosSinFicha,
  materiasCatalogo,
  onGuardar,
}: ProfesorFormModalProps) {
  const esLectura = modo === "LECTURA";
  const [datos, setDatos] = useState<ProfesorFormData>(EMPTY_FORM);
  const [envio, setEnvio] = useState(false);

  // Los estados se inicializan al abrir (mismo modal para los 3 modos).
  const [initialized, setInitialized] = useState(false);
  if (open && !initialized) {
    setDatos(datosIniciales ?? EMPTY_FORM);
    setInitialized(true);
  }
  if (!open && initialized) {
    setInitialized(false);
    setEnvio(false);
  }

  const set = (patch: Partial<ProfesorFormData>) => setDatos((d) => ({ ...d, ...patch }));

  const errores = useMemo(() => (envio ? validar(datos) : {}), [envio, datos]);

  // Opciones del Combobox de usuario: rol Profesor, activo y sin ficha asociada.
  const usuariosOpciones = useMemo(
    () =>
      usuariosSinFicha.map((u) => ({
        value: String(u.id),
        label: `${u.apellido}, ${u.nombre} — ${u.email}`,
      })),
    [usuariosSinFicha],
  );

  const materiasDisponibles = useMemo(
    () =>
      materiasCatalogo.filter(
        (m) => !datos.materias.some((sel) => sel.materia.id === m.id),
      ),
    [materiasCatalogo, datos.materias],
  );
  const materiasOpciones = useMemo(
    () => materiasDisponibles.map((m) => ({ value: String(m.id), label: m.nombre })),
    [materiasDisponibles],
  );

  const agregarMateria = (materiaId: string) => {
    if (!materiaId) return;
    // BACKEND: POST /api/profesores/:id/materias con { materia_id, capacidad_maxima }
    const materia = materiasDisponibles.find((m) => String(m.id) === materiaId);
    if (!materia) return;
    set({ materias: [...datos.materias, { materia, capacidad: "5" }] });
  };

  const quitarMateria = (index: number) => {
    set({ materias: datos.materias.filter((_, i) => i !== index) });
  };

  const guardar = () => {
    setEnvio(true);
    if (Object.keys(validar(datos)).length > 0) return;
    onGuardar(datos);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={titulo}
      maxWidth="max-w-2xl"
      footer={
        esLectura ? null : (
          <>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="button" variant="primary" onClick={guardar}>
              <Icon name="check" size={16} />
              Guardar
            </Button>
          </>
        )
      }
    >
      <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()} noValidate>
        {/* BACKEND: usuarios con rol Profesor, activos y sin ficha → GET /api/usuarios?rol=profesor&sin-ficha=true */}
        <div className={esLectura ? "pointer-events-none opacity-60" : ""}>
          <Combobox
            id="usuario-asociado"
            label="Usuario asociado"
            requiredMark
            error={errores.usuarioId}
            hint="Usuarios con rol Profesor que todavía no tienen ficha"
            value={datos.usuarioId}
            options={usuariosOpciones}
            disabled={esLectura}
            onChange={(v) => set({ usuarioId: v })}
          />
        </div>

        <div className={esLectura ? "pointer-events-none opacity-60" : ""}>
          {/* BACKEND: profesor.titulo_especialidad (varchar 100) */}
          <Input
            id="titulo-profesor"
            label="Título / especialidad (opcional)"
            placeholder="Ej: Lic. en Matemática"
            maxLength={100}
            disabled={esLectura}
            value={datos.titulo}
            onChange={(e) => set({ titulo: e.target.value })}
          />
        </div>

        <div className={esLectura ? "pointer-events-none opacity-60" : ""}>
          {/* BACKEND: profesor.telefono ^[0-9]{10,11}$ */}
          <Input
            id="telefono-profesor"
            label="Teléfono"
            requiredMark
            inputMode="numeric"
            placeholder="Ej: 1155555555"
            maxLength={11}
            disabled={esLectura}
            error={errores.telefono}
            value={datos.telefono}
            onChange={(e) => set({ telefono: e.target.value.replace(/\D/g, "") })}
          />
        </div>

        <fieldset
          className={`flex flex-col gap-2 ${esLectura ? "pointer-events-none opacity-60" : ""}`}
        >
          <legend className="text-sm font-bold text-on-surface">
            Materias
            <span className="text-error"> *</span>
            {datos.materias.length > 0 && (
              <span className="ml-2 text-xs font-semibold text-on-surface-variant">
                {datos.materias.length} asignada{datos.materias.length === 1 ? "" : "s"}
              </span>
            )}
          </legend>
          {errores.materias && (
            <p role="alert" className="text-sm font-semibold text-error">
              {errores.materias}
            </p>
          )}
          <div className="flex flex-col gap-1.5">
            {datos.materias.map((materia, index) => (
              <div
                key={materia.materia.id}
                className="flex items-center gap-2 rounded-sm border border-outline-variant bg-surface-container-low px-3 py-2"
              >
                <span className="flex-1 text-sm font-semibold text-on-surface">
                  {materia.materia.nombre}
                  <span className="ml-1 text-xs font-medium text-on-surface-variant">
                    · {materia.materia.duracionClaseMinutos} min
                  </span>
                </span>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant">
                  Capacidad
                  {/* BACKEND: profesor_materia.capacidad_maxima (1-10) */}
                  <input
                    type="text"
                    inputMode="numeric"
                    disabled={esLectura}
                    aria-label={`Capacidad máxima para ${materia.materia.nombre}`}
                    value={materia.capacidad}
                    onChange={(e) => {
                      const valor = e.target.value.replace(/\D/g, "").slice(0, 2);
                      set({
                        materias: datos.materias.map((m, i) =>
                          i === index ? { ...m, capacidad: valor } : m,
                        ),
                      });
                    }}
                    className="h-9 w-14 rounded-sm border border-outline-variant bg-surface-container-lowest px-2 text-center text-sm font-bold text-on-surface focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                  />
                </label>
                {!esLectura && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Quitar ${materia.materia.nombre}`}
                    onClick={() => quitarMateria(index)}
                  >
                    <Icon name="close" size={16} />
                  </Button>
                )}
              </div>
            ))}
          </div>
          {!esLectura && materiasDisponibles.length > 0 && (
            <Combobox
              id="agregar-materia"
              label="Agregar materia"
              placeholder="Buscar materia…"
              value=""
              options={materiasOpciones}
              noResultsText="Sin materias disponibles"
              onChange={agregarMateria}
            />
          )}
        </fieldset>

        <div className="flex items-center justify-between gap-3 rounded-sm border border-outline-variant bg-surface-container-low px-4 py-3">
          <div>
            <p className="text-sm font-bold text-on-surface">Estado</p>
            <p className="text-xs font-medium text-on-surface-variant">
              {datos.estado ? "Activo — puede recibir alumnos" : "Inactivo — no recibe nuevos turnos"}
            </p>
          </div>
          <Switch
            checked={datos.estado}
            disabled={esLectura}
            onChange={(v) => set({ estado: v })}
            ariaLabel="Profesor activo"
          />
        </div>
      </form>
    </Modal>
  );
}