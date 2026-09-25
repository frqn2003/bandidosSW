"use client";

import { useMemo, useState } from "react";
import type { MateriaRef, Profesor, UsuarioSinFicha } from "@/data/profesores";
import { Button } from "@/components/ui/Button";
import { Combobox } from "@/components/ui/Combobox";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { EstadoProfesorBadge } from "@/components/profesores/EstadoProfesorBadge";
import { UsuarioRapidoModal } from "@/components/profesores/UsuarioRapidoModal";
import { HorarioAcademia, useAgendaAcademia } from "@/components/profesores/HorarioAcademia";
import {
  DIAS_SEMANA_SELECT,
  horariosDesde,
  horariosHasta,
  horasEntre,
  inicialesDe,
  nuevaFranja,
  tonoAvatarDe,
  validarFranjas,
  type FranjaForm,
} from "@/funciones/profesores";

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
  /** Profesor en edición: identidad bloqueada. La baja se decide con el switch de estado. */
  profesor?: Profesor | null;
  /**
   * Error que devolvió la API (código del contrato ya traducido a mensaje).
   * Si trae `campo`, se pinta debajo de ese input igual que una validación
   * local; si no, va como banner arriba del formulario. El back es la autoridad:
   * la validación local es solo feedback temprano.
   */
  errorRemoto?: { campo?: string; mensaje: string } | null;
  /** Mientras se espera a la API: bloquea los botones y evita el doble submit. */
  guardando?: boolean;
  /** Muestra el botón + de alta rápida de usuario (solo Gerente; el back también lo valida). */
  puedeCrearUsuario?: boolean;
  /** El alta rápida creó un usuario: la página lo suma a la lista de candidatos. */
  onUsuarioCreado?: (usuario: UsuarioSinFicha) => void;
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
  errorRemoto,
  guardando = false,
  puedeCrearUsuario = false,
  onUsuarioCreado,
}: ProfesorFormModalProps) {
  const [datos, setDatos] = useState<ProfesorFormData>(EMPTY_FORM);
  const [rapidoAbierto, setRapidoAbierto] = useState(false);
  const [envio, setEnvio] = useState(false);
  const [busquedaMateria, setBusquedaMateria] = useState("");

  // Los estados se inicializan al abrir (mismo modal para los 2 modos).
  const [initialized, setInitialized] = useState(false);
  if (open && !initialized) {
    setDatos(datosIniciales ?? EMPTY_FORM);
    setEnvio(false);
    setBusquedaMateria("");
    setInitialized(true);
  }
  if (!open && initialized) {
    setInitialized(false);
    setEnvio(false);
    setRapidoAbierto(false);
    setBusquedaMateria("");
  }

  const set = (patch: Partial<ProfesorFormData>) => setDatos((d) => ({ ...d, ...patch }));
  const academiaId = modo === "EDICION"
    ? profesor?.academiaId ?? null
    : usuariosSinFicha.find((u) => String(u.id) === datos.usuarioId)?.academia?.id ?? null;
  const horario = useAgendaAcademia(academiaId, open);

  const erroresLocales = useMemo(() => (envio ? validar(datos) : {}), [envio, datos]);
  // El error de la API pisa al local: viene del back, que es la autoridad.
  const errores: ReturnType<typeof validar> = errorRemoto?.campo
    ? { ...erroresLocales, [errorRemoto.campo]: errorRemoto.mensaje }
    : erroresLocales;
  const erroresFranjas = useMemo(
    () => horario.habilitado
      ? validarFranjas(envio ? datos.franjas : datos.franjas.filter((f) => f.desde && f.hasta), horario.franjas)
      : {},
    [envio, datos.franjas, horario.habilitado, horario.franjas],
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

  /** Catálogo filtrado por el buscador (nombre, parcial, sin mayúsculas). */
  const materiasFiltradas = useMemo(() => {
    const q = busquedaMateria.trim().toLowerCase();
    if (!q) return materiasCatalogo;
    return materiasCatalogo.filter((m) => m.nombre.toLowerCase().includes(q));
  }, [busquedaMateria, materiasCatalogo]);

  // La franja nace sin horas: primero se elige el inicio y recién ahí se
  // habilita el fin, que solo ofrece horarios posteriores.
  const agregarFranja = () => {
    if (!horario.habilitado) return;
    set({ franjas: [...datos.franjas, nuevaFranja(horario.dias[0].value)] });
  };

  const actualizarFranja = (id: number, patch: Partial<Omit<FranjaForm, "id">>) => {
    set({
      franjas: datos.franjas.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    });
  };

  /**
   * Cambiar la hora de inicio limpia una hora de fin que ya no sea posterior:
   * el select de fin solo ofrece horarios mayores, así que dejar el valor viejo
   * mostraría una opción que ya no está en la lista.
   */
  const cambiarDesde = (id: number, desde: string) => {
    set({
      franjas: datos.franjas.map((f) =>
        f.id === id
          ? { ...f, desde, hasta: horariosHasta(desde, horario.franjas, f.dia).includes(f.hasta) ? f.hasta : "" }
          : f,
      ),
    });
  };

  const quitarFranja = (id: number) => {
    set({ franjas: datos.franjas.filter((f) => f.id !== id) });
  };

  // BACKEND: PUT /api/profesores/:id/disponibilidad (franjas → agenda_profesional)
  // Las franjas a medias suman 0: la hora de fin todavía no se eligió.
  const totalHorasFranjas = useMemo(
    () =>
      Math.round(
        datos.franjas.reduce((acc, f) => acc + horasEntre(f.desde, f.hasta), 0) * 10,
      ) / 10,
    [datos.franjas],
  );

  const guardar = () => {
    setEnvio(true);
    const err = validar(datos);
    const errF = validarFranjas(datos.franjas, horario.franjas);
    if (!horario.habilitado || guardando || Object.keys(err).length > 0 || Object.keys(errF).length > 0 || datos.franjas.length === 0)
      return;
    onGuardar(datos);
  };

  return (
    <>
    <Modal
      open={open}
      // Con el alta rápida abierta, Escape/fondo cierran solo esa ventana.
      onClose={rapidoAbierto ? () => {} : onClose}
      title={titulo}
      subtitle={
        modo === "EDICION"
          ? "Modificá la ficha profesional, materias y disponibilidad."
          : "Completá la ficha profesional, materias y disponibilidad."
      }
      icon={
        <Icon
          name={modo === "INSERCION" ? "person_add" : "edit"}
          size={22}
          className="text-primary"
        />
      }
      titleExtra={
        modo === "EDICION" ? (
          <span className="ml-auto">
            <EstadoProfesorBadge estado={datos.estado ? "activo" : "inactivo"} />
          </span>
        ) : undefined
      }
      maxWidth="max-w-2xl"
      footer={
        <>
          {modo === "INSERCION" && (
            <p className="mr-auto text-xs font-medium text-on-surface-variant">
              <span className="text-error">*</span> Campos obligatorios
            </p>
          )}
          <Button type="button" variant="outline" onClick={onClose} disabled={guardando}>
            Cancelar
          </Button>
          <Button type="button" variant="primary" onClick={guardar} disabled={guardando || !horario.habilitado}>
            <Icon name={guardando ? "progress_activity" : "save"} size={16} />
            {guardando
              ? "Guardando…"
              : modo === "INSERCION"
                ? "Guardar y habilitar"
                : "Guardar"}
          </Button>
        </>
      }
    >
      <form className="flex flex-col gap-5" onSubmit={(e) => e.preventDefault()} noValidate>
        {/* Error de la API que no corresponde a un campo puntual. */}
        {errorRemoto && !errorRemoto.campo && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-sm border border-error/40 bg-error/5 px-3 py-2 text-sm font-semibold text-error"
          >
            <Icon name="error" size={16} className="mt-px shrink-0" />
            {errorRemoto.mensaje}
          </p>
        )}

        {/* BACKEND: usuarios con rol Profesor, activos y sin ficha → GET /api/usuarios?rol=profesor&sin-ficha=true */}
        {modo === "INSERCION" ? (
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <Combobox
                id="usuario-asociado"
                label="Usuario Activo del Sistema"
                requiredMark
                error={errores.usuarioId}
                hint={
                  usuariosOpciones.length === 0 && puedeCrearUsuario
                    ? "No hay usuarios Profesor sin ficha. Creá uno con el botón +."
                    : "Nombre, Apellido y Email se vinculan automáticamente"
                }
                value={datos.usuarioId}
                options={usuariosOpciones}
                onChange={(v) => set({ usuarioId: v, franjas: v === datos.usuarioId ? datos.franjas : [] })}
                noResultsText={
                  puedeCrearUsuario ? "Sin usuarios disponibles. Creá uno con el botón +" : "Sin resultados"
                }
              />
            </div>
            {puedeCrearUsuario && (
              // mt-7: alinea con el input (debajo del label del Combobox).
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="mt-7 shrink-0"
                aria-label="Crear nuevo usuario docente"
                title="Crear nuevo usuario docente"
                onClick={() => setRapidoAbierto(true)}
              >
                <Icon name="add" size={20} />
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <p className="flex items-center gap-1.5 text-sm font-bold text-on-surface">
                <Icon name="lock" size={14} className="text-on-surface-variant" />
                Usuario Activos del Sistema
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
                    {profesor.nombre} {profesor.apellido}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

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

        {/* BACKEND: capacidad global del CHECK ck_profesor_capacidad (1-10);
            el front la refleja en profesor_materia.capacidad_maxima. */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="capacidad-default" className="text-sm font-bold text-on-surface">
            <span className="text-error"> * </span>
            Capacidad por alumnos por clase
          </label>
          <Input
            id="capacidad-default"
            type="number"
            inputMode="numeric"
            min={1}
            max={10}
            aria-label="Capacidad por alumnos por clase"
            value={String(datos.capacidadDefault)}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isNaN(n)) return;
              set({ capacidadDefault: Math.min(10, Math.max(1, n)) });
            }}
          />
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
          <div className="relative">
            <Input
              id="buscar-materia"
              aria-label="Buscar materia"
              placeholder="Buscar materia…"
              value={busquedaMateria}
              onChange={(e) => setBusquedaMateria(e.target.value)}
              className="pl-10 pr-9"
            />
            <Icon
              name="search"
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
            />
            {busquedaMateria && (
              <button
                type="button"
                aria-label="Limpiar búsqueda de materias"
                onClick={() => setBusquedaMateria("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full text-on-surface-variant transition-colors duration-fast ease-out hover:bg-surface-container-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
              >
                <Icon name="close" size={14} />
              </button>
            )}
          </div>

          {/* Materias ya elegidas: visibles sin depender del filtro. */}
          {datos.materias.length > 0 && (
            <div className="flex flex-wrap gap-1.5" aria-label="Materias seleccionadas">
              {datos.materias.map((m) => (
                <span
                  key={m.materia.id}
                  className="flex items-center gap-1 rounded-full bg-surface-container-high px-2.5 py-1 text-xs font-semibold text-on-surface"
                >
                  {m.materia.nombre}
                  <button
                    type="button"
                    aria-label={`Quitar ${m.materia.nombre}`}
                    title={`Quitar ${m.materia.nombre}`}
                    onClick={() => toggleMateria(m.materia)}
                    className="flex h-4 w-4 items-center justify-center rounded-full text-on-surface-variant transition-colors duration-fast ease-out hover:bg-surface-container-lowest hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
                  >
                    <Icon name="close" size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="max-h-52 overflow-y-auto rounded-sm border border-outline-variant bg-surface-container-lowest">
            <ul className="divide-y divide-outline-variant/60">
              {materiasFiltradas.length === 0 ? (
                <li className="px-3 py-2.5 text-sm font-medium text-on-surface-variant">
                  {busquedaMateria.trim()
                    ? `Sin resultados para «${busquedaMateria.trim()}».`
                    : "No hay materias cargadas."}
                </li>
              ) : (
                materiasFiltradas.map((materia) => {
                  const marcada = seleccionadas.has(materia.id);
                  return (
                    <li key={materia.id}>
                      <label
                        className={`flex cursor-pointer items-center gap-2.5 px-3 py-2 transition-colors duration-fast ease-out ${
                          marcada
                            ? "bg-surface-container-low"
                            : "hover:bg-surface-container-low/60"
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
                        {marcada && (
                          <Icon name="check_circle" size={16} className="shrink-0 text-secondary" />
                        )}
                      </label>
                    </li>
                  );
                })
              )}
            </ul>
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
          <HorarioAcademia
            horario={horario}
            sinAcademia={modo === "INSERCION" && !datos.usuarioId
              ? "Seleccioná un usuario para ver los horarios de su academia."
              : undefined}
          />
          <p className="text-xs font-medium text-on-surface-variant">
            Definí bloques de 30 min dentro de una misma franja de atención.
          </p>
          {errorRemoto?.campo === "franjas" && (
            <p role="alert" className="text-sm font-semibold text-on-surface">{errorRemoto.mensaje}</p>
          )}
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
              const inicios = horariosDesde(horario.franjas, franja.dia);
              const finales = horariosHasta(franja.desde, horario.franjas, franja.dia);
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
                    disabled={guardando || !horario.habilitado}
                    onChange={(e) => actualizarFranja(franja.id, { dia: e.target.value, desde: "", hasta: "" })}
                    className="h-11 min-h-11 w-full px-2 text-sm"
                  >
                    {!horario.dias.some((d) => d.value === franja.dia) && (
                      <option value={franja.dia} disabled>
                        {DIAS_SEMANA_SELECT.find((d) => d.value === franja.dia)?.label ?? "Día"} · no disponible
                      </option>
                    )}
                    {horario.dias.map((d) => (
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
                      disabled={guardando || !horario.habilitado || inicios.length === 0}
                      onChange={(e) => cambiarDesde(franja.id, e.target.value)}
                      className="h-11 min-h-11 w-full px-2 text-sm"
                    >
                      {/* Obligatoria y primera: sin ella no se habilita la hora de fin. */}
                      <option value="" disabled>
                        Elegí hora
                      </option>
                      {franja.desde && !inicios.includes(franja.desde) && (
                        <option value={franja.desde} disabled>{franja.desde} · fuera de horario</option>
                      )}
                      {inicios.map((h) => (
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
                      disabled={guardando || !horario.habilitado || finales.length === 0}
                      title={!franja.desde ? "Elegí primero la hora de inicio" : undefined}
                      onChange={(e) => actualizarFranja(franja.id, { hasta: e.target.value })}
                      className="h-11 min-h-11 w-full px-2 text-sm"
                    >
                      <option value="" disabled>
                        {franja.desde ? "Elegí hora" : "Elegí el inicio"}
                      </option>
                      {/* Solo horarios posteriores al inicio. */}
                      {franja.hasta && !finales.includes(franja.hasta) && (
                        <option value={franja.hasta} disabled>{franja.hasta} · fuera de horario</option>
                      )}
                      {finales.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <span className="w-12 text-right text-xs font-bold text-on-surface-variant">
                    {horasEntre(franja.desde, franja.hasta).toFixed(1)} h
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
                    <p role="alert" className="w-full text-sm font-semibold text-on-surface">
                      {erroresFranjas[franja.id]}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <div>
            <Button type="button" variant="outline" onClick={agregarFranja} disabled={guardando || !horario.habilitado}>
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

    {/* Hermano del Modal, no hijo: el panel del Modal tiene transform y un
        `fixed` adentro quedaría atrapado en él. */}
    {puedeCrearUsuario && (
      <UsuarioRapidoModal
        open={rapidoAbierto}
        onClose={() => setRapidoAbierto(false)}
        onUsuarioCreado={(u) => {
          onUsuarioCreado?.(u);
          set({ usuarioId: String(u.id), franjas: [] });
        }}
      />
    )}
    </>
  );
}