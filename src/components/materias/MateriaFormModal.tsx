"use client";

import { useMemo, useState } from "react";
import { DURACIONES_CLASE } from "@/contracts/materia";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { Textarea } from "@/components/ui/Textarea";
import {
  NIVELES,
  codigoMateria,
  formatearFecha,
  formatearValor,
  normalizarNombre,
} from "@/data/materias";

export type ModoMateriaForm = "INSERCION" | "EDICION" | "LECTURA";

export interface MateriaFormData {
  nombre: string;
  nivel: string; // "" | NivelMateria
  duracionClaseMinutos: string; // "" | "30" | "45" | "60" | "90" | "120"
  valorClase: string; // texto con coma decimal (teclado es-AR)
  descripcion: string;
  estado: boolean; // true = activa
}

const EMPTY_FORM: MateriaFormData = {
  nombre: "",
  nivel: "",
  duracionClaseMinutos: "",
  valorClase: "",
  descripcion: "",
  estado: true, // Estado por defecto: Activo (criterio obligatorio)
};

const MAX_NOMBRE = 80;
const MAX_DESCRIPCION = 250;

/** "12.500,50", "12500,50", "12500.50" o "12500" → 12500.5 · devuelve NaN si no es un número. */
export function parsearValor(texto: string): number {
  let limpio = texto.trim();
  if (limpio === "") return NaN;

  if (limpio.includes(",") && limpio.includes(".")) {
    if (limpio.lastIndexOf(",") > limpio.lastIndexOf(".")) {
      // Formato es-AR: 12.500,50
      limpio = limpio.replace(/\./g, "").replace(",", ".");
    } else {
      // Formato en-US: 12,500.50
      limpio = limpio.replace(/,/g, "");
    }
  } else if (limpio.includes(",")) {
    // Formato solo con coma: 12500,50
    limpio = limpio.replace(",", ".");
  }

  if (!/^\d+(\.\d{1,2})?$/.test(limpio)) return NaN;
  return Number(limpio);
}

type CamposConError = Partial<Record<keyof MateriaFormData, string>>;

/**
 * Validaciones del formulario. Son las mismas del contrato
 * (`crearMateriaBody` en src/contracts/materia.ts) y las del esquema: acá se
 * corren antes de enviar para que el usuario no vaya y vuelva del servidor.
 */
function validar(datos: MateriaFormData, nombresActivos: string[]): CamposConError {
  const errores: CamposConError = {};

  const nombre = datos.nombre.trim();
  if (nombre === "") {
    errores.nombre = "Ingresá el nombre de la materia.";
  } else if (nombre.length > MAX_NOMBRE) {
    errores.nombre = `Máximo ${MAX_NOMBRE} caracteres.`;
  } else if (nombresActivos.includes(normalizarNombre(nombre))) {
    // uq_materia_nombre_activa: único entre ACTIVAS, case-insensitive.
    // BACKEND: el back devuelve NOMBRE_DUPLICADO (409) con el mismo texto.
    errores.nombre = "Ya existe una materia activa con ese nombre.";
  }

  if (datos.nivel === "") errores.nivel = "Elegí el nivel.";
  if (datos.duracionClaseMinutos === "")
    errores.duracionClaseMinutos = "Elegí la duración de la clase.";

  const valor = parsearValor(datos.valorClase);
  if (datos.valorClase.trim() === "") {
    errores.valorClase = "Ingresá el valor por clase.";
  } else if (Number.isNaN(valor)) {
    errores.valorClase = "Usá números con hasta 2 decimales (ej: 12500,50).";
  } else if (valor <= 0) {
    errores.valorClase = "El valor tiene que ser mayor a 0.";
  }

  if (datos.descripcion.length > MAX_DESCRIPCION)
    errores.descripcion = `Máximo ${MAX_DESCRIPCION} caracteres.`;

  return errores;
}

interface MateriaFormModalProps {
  modo: ModoMateriaForm;
  titulo: string;
  open: boolean;
  onClose: () => void;
  datosIniciales?: MateriaFormData;
  /** Nombres normalizados de las materias ACTIVAS, sin incluir la que se edita. */
  nombresActivos: string[];
  /** Solo en EDICIÓN/LECTURA: datos del sistema que no se editan. */
  meta?: { id: number; fechaCreacion: string; fechaActualizacion: string; valorAnterior: number };
  /**
   * Error que devolvió la API (código del contrato ya traducido a mensaje).
   * Si trae `campo`, se pinta debajo de ese input igual que una validación
   * local; si no, va como banner arriba del formulario. Existe porque el
   * chequeo local de duplicado puede perder la carrera contra otro operador:
   * el que manda es el 409 del back.
   */
  errorRemoto?: { campo?: string; mensaje: string } | null;
  /** Mientras se espera a la API: bloquea el botón y evita el doble submit. */
  guardando?: boolean;
  onGuardar: (datos: MateriaFormData) => void;
}

export function MateriaFormModal({
  modo,
  titulo,
  open,
  onClose,
  datosIniciales,
  nombresActivos,
  meta,
  errorRemoto,
  guardando = false,
  onGuardar,
}: MateriaFormModalProps) {
  const esLectura = modo === "LECTURA";
  const [datos, setDatos] = useState<MateriaFormData>(EMPTY_FORM);
  const [envio, setEnvio] = useState(false);
  const [tocados, setTocados] = useState<Partial<Record<keyof MateriaFormData, boolean>>>({});

  // Mismo modal para los 3 modos: se inicializa al abrir y se limpia al cerrar.
  const [initialized, setInitialized] = useState(false);
  if (open && !initialized) {
    setDatos(datosIniciales ?? EMPTY_FORM);
    setInitialized(true);
  }
  if (!open && initialized) {
    setInitialized(false);
    setEnvio(false);
    setTocados({});
  }

  const set = (patch: Partial<MateriaFormData>) => setDatos((d) => ({ ...d, ...patch }));
  const tocar = (campo: keyof MateriaFormData) => setTocados((t) => ({ ...t, [campo]: true }));

  const todosLosErrores = useMemo(
    () => validar(datos, nombresActivos),
    [datos, nombresActivos],
  );

  // El error se muestra cuando el usuario ya pasó por el campo (blur) o cuando
  // intentó guardar: así el duplicado de nombre aparece apenas sale del input,
  // no recién al final del formulario.
  const errores: CamposConError = Object.fromEntries(
    Object.entries(todosLosErrores).filter(
      ([campo]) => envio || tocados[campo as keyof MateriaFormData],
    ),
  );

  // El error de la API pisa al local: viene del back, que es la autoridad.
  if (errorRemoto?.campo) {
    errores[errorRemoto.campo as keyof MateriaFormData] = errorRemoto.mensaje;
  }

  const valorNuevo = parsearValor(datos.valorClase);
  const cambioDeValor =
    modo === "EDICION" &&
    meta !== undefined &&
    !Number.isNaN(valorNuevo) &&
    valorNuevo !== meta.valorAnterior;

  const guardar = () => {
    setEnvio(true);
    const encontrados = validar(datos, nombresActivos);
    if (Object.keys(encontrados).length > 0) {
      // Foco en el primer campo con error (el usuario no tiene que buscarlo).
      const primero = (
        ["nombre", "nivel", "duracionClaseMinutos", "valorClase", "descripcion"] as const
      ).find((campo) => encontrados[campo]);
      if (primero) document.getElementById(`materia-${primero}`)?.focus();
      return;
    }
    onGuardar(datos);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={titulo}
      icon={<Icon name="menu_book" size={20} className="text-primary" />}
      maxWidth="max-w-xl"
      footer={
        esLectura ? (
          <Button type="button" variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        ) : (
          <>
            <Button type="button" variant="outline" onClick={onClose} disabled={guardando}>
              Cancelar
            </Button>
            <Button type="button" onClick={guardar} disabled={guardando}>
              <Icon name={guardando ? "progress_activity" : "save"} size={16} />
              {guardando ? "Guardando…" : "Guardar"}
            </Button>
          </>
        )
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!esLectura) guardar();
        }}
      >
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

        <div className="flex flex-col gap-1.5">
          <Input
            id="materia-nombre"
            label="Nombre"
            requiredMark
            maxLength={MAX_NOMBRE}
            disabled={esLectura}
            value={datos.nombre}
            onChange={(e) => set({ nombre: e.target.value })}
            onBlur={() => tocar("nombre")}
            error={errores.nombre}
            placeholder="Álgebra Lineal"
          />
          <p className="self-end text-xs font-medium text-on-surface-variant">
            {datos.nombre.length}/{MAX_NOMBRE}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            id="materia-nivel"
            label="Nivel"
            requiredMark
            disabled={esLectura}
            value={datos.nivel}
            onChange={(e) => set({ nivel: e.target.value })}
            onBlur={() => tocar("nivel")}
            error={errores.nivel}
          >
            <option value="">Seleccioná un nivel</option>
            {NIVELES.map((nivel) => (
              <option key={nivel} value={nivel}>
                {nivel}
              </option>
            ))}
          </Select>

          <Select
            id="materia-duracionClaseMinutos"
            label="Duración de la clase"
            requiredMark
            disabled={esLectura}
            value={datos.duracionClaseMinutos}
            onChange={(e) => set({ duracionClaseMinutos: e.target.value })}
            onBlur={() => tocar("duracionClaseMinutos")}
            error={errores.duracionClaseMinutos}
          >
            <option value="">Seleccioná la duración</option>
            {/* La lista sale del contrato (misma que el CHECK de la base). */}
            {DURACIONES_CLASE.map((minutos) => (
              <option key={minutos} value={String(minutos)}>
                {minutos} minutos
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Input
            id="materia-valorClase"
            label="Valor por clase"
            requiredMark
            inputMode="decimal"
            disabled={esLectura}
            value={datos.valorClase}
            onChange={(e) => set({ valorClase: e.target.value })}
            onBlur={() => tocar("valorClase")}
            error={errores.valorClase}
            placeholder="12500,00"
            hint="En pesos, con hasta 2 decimales."
          />
          {/* Regla de negocio que si no queda invisible: el cambio de valor no
              toca lo ya facturado. BACKEND: el turno guarda
              `valor_clase_congelado` al reservar (contrato src/contracts/turno.ts). */}
          {!esLectura && (
            <p
              className={`flex items-start gap-2 rounded-sm border px-3 py-2 text-xs font-semibold ${cambioDeValor
                  ? "border-status-warning/40 bg-status-warning/10 text-status-warning-strong"
                  : "border-outline-variant bg-surface-container-low text-on-surface-variant"
                }`}
            >
              <Icon name="info" size={16} className="mt-px shrink-0" />
              <span>
                {cambioDeValor && meta ? (
                  <>
                    Cambiás el valor de {formatearValor(meta.valorAnterior)} a{" "}
                    {formatearValor(valorNuevo)}. Rige <strong>solo hacia adelante</strong>: no
                    modifica clases ya dictadas ni pagos ya registrados.
                  </>
                ) : (
                  <>
                    Un cambio de valor rige <strong>solo hacia adelante</strong>: no modifica
                    clases ya dictadas ni pagos ya registrados.
                  </>
                )}
              </span>
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Textarea
            id="materia-descripcion"
            label="Descripción"
            maxLength={MAX_DESCRIPCION}
            disabled={esLectura}
            value={datos.descripcion}
            onChange={(e) => set({ descripcion: e.target.value })}
            onBlur={() => tocar("descripcion")}
            error={errores.descripcion}
            placeholder="Contenidos principales de la materia (opcional)"
          />
          <p className="self-end text-xs font-medium text-on-surface-variant">
            {datos.descripcion.length}/{MAX_DESCRIPCION}
          </p>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-sm border border-outline-variant bg-surface-container-low px-4 py-3">
          <div>
            <p className="text-sm font-bold text-on-surface">Estado</p>
            <p className="text-xs font-medium text-on-surface-variant">
              {datos.estado
                ? "Activa: se puede asignar a profesores y reservar turnos."
                : "Inactiva: no aparece en los combos de otros módulos."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-on-surface">
              {datos.estado ? "Activa" : "Inactiva"}
            </span>
            <Switch
              checked={datos.estado}
              onChange={(estado) => set({ estado })}
              disabled={esLectura}
              ariaLabel="Estado de la materia"
            />
          </div>
        </div>

        {/* Datos del sistema: solo lectura, nunca editables. */}
        {meta && (
          <dl className="grid gap-x-6 gap-y-2 rounded-sm bg-surface-container-low px-4 py-3 text-xs sm:grid-cols-3">
            <div>
              <dt className="font-bold uppercase tracking-wide text-on-surface-variant">Código</dt>
              <dd className="font-mono font-semibold text-on-surface">{codigoMateria(meta.id)}</dd>
            </div>
            <div>
              <dt className="font-bold uppercase tracking-wide text-on-surface-variant">Creada</dt>
              <dd className="font-semibold text-on-surface">
                {formatearFecha(meta.fechaCreacion)}
              </dd>
            </div>
            <div>
              <dt className="font-bold uppercase tracking-wide text-on-surface-variant">
                Última modificación
              </dt>
              <dd className="font-semibold text-on-surface">
                {formatearFecha(meta.fechaActualizacion)}
              </dd>
            </div>
          </dl>
        )}
      </form>
    </Modal>
  );
}
