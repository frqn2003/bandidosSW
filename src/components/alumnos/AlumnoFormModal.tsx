"use client";

import { useEffect, useState } from "react";
import { crearAlumnoBody, type CrearAlumnoBody } from "@/contracts/alumno";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { EstadoAlumnoBadge } from "@/components/alumnos/EstadoAlumnoBadge";
import { edadEnAnios, formatearFecha } from "@/funciones/formato";
import {
  NIVELES_EDUCATIVOS,
  esMenorDeEdad,
  posiblesDuplicados,
  type AlumnoResponse,
} from "@/data/alumnos";

/** En este incremento no existe EDICIÓN: llega con HU-ALU-02. */
export type ModoAlumnoForm = "INSERCION" | "LECTURA";

export interface AlumnoFormData {
  nombre: string;
  apellido: string;
  dni: string;
  fechaNacimiento: string; // "aaaa-mm-dd" (lo que produce <input type="date">)
  telefono: string;
  email: string;
  nivelEducativo: string;
  responsableNombre: string;
  responsableDni: string;
  responsableTelefono: string;
}

const EMPTY_FORM: AlumnoFormData = {
  nombre: "",
  apellido: "",
  dni: "",
  fechaNacimiento: "",
  telefono: "",
  email: "",
  nivelEducativo: "",
  responsableNombre: "",
  responsableDni: "",
  responsableTelefono: "",
};

const MAX_NOMBRE = 50;
const FECHA_OK = /^\d{4}-\d{2}-\d{2}$/;

/** Edad mínima para registrarse: 6 años (ingreso a primaria en Argentina). */
const EDAD_MINIMA_ANIOS = 6;

/**
 * Máximo admitido para la fecha de nacimiento: hoy menos 6 años. Un alumno
 * debe tener al menos 6 años cumplidos para poder registrarse; también queda
 * bloqueada la fecha actual y cualquier fecha futura.
 */
function fechaNacimientoMaxima(): string {
  const limite = new Date();
  limite.setFullYear(limite.getFullYear() - EDAD_MINIMA_ANIOS);
  return `${limite.getFullYear()}-${String(limite.getMonth() + 1).padStart(2, "0")}-${String(
    limite.getDate(),
  ).padStart(2, "0")}`;
}

type CamposConError = Partial<Record<keyof AlumnoFormData, string>>;

/** Los datos del formulario, con la forma que pide el contrato. */
export function aBody(datos: AlumnoFormData): CrearAlumnoBody {
  const menor = FECHA_OK.test(datos.fechaNacimiento) && esMenorDeEdad(datos.fechaNacimiento);
  const opcional = (v: string) => (v.trim() === "" ? null : v.trim());
  return {
    nombre: datos.nombre.trim(),
    apellido: datos.apellido.trim(),
    dni: datos.dni.trim(),
    fechaNacimiento: datos.fechaNacimiento,
    telefono: datos.telefono.trim(),
    email: opcional(datos.email),
    nivelEducativo: datos.nivelEducativo as CrearAlumnoBody["nivelEducativo"],
    // Cuando es mayor el responsable es opcional: si no se cargó, va null.
    responsableNombre: menor ? datos.responsableNombre.trim() : opcional(datos.responsableNombre),
    responsableDni: menor ? datos.responsableDni.trim() : opcional(datos.responsableDni),
    responsableTelefono: menor
      ? datos.responsableTelefono.trim()
      : opcional(datos.responsableTelefono),
  };
}

/**
 * Valida con el **schema del contrato** (`crearAlumnoBody`), el mismo que corre
 * el back con `parseBody`: una sola regla, en un solo lugar. Acá solo se
 * traducen al español los mensajes genéricos de zod; los específicos (DNI,
 * teléfono, fecha futura, responsable de un menor) ya vienen del contrato.
 */
function validar(datos: AlumnoFormData): CamposConError {
  const errores: CamposConError = {};

  // El enum de zod diría "Invalid enum value"; el combo vacío es "elegí uno".
  if (datos.nivelEducativo === "") errores.nivelEducativo = "Elegí el nivel educativo.";

  // Regla del producto (no está en el contrato): mínimo 6 años para registrarse.
  if (
    FECHA_OK.test(datos.fechaNacimiento) &&
    datos.fechaNacimiento > fechaNacimientoMaxima()
  ) {
    errores.fechaNacimiento = "El alumno debe tener al menos 6 años.";
  }

  const resultado = crearAlumnoBody.safeParse(aBody(datos));
  if (!resultado.success) {
    for (const issue of resultado.error.issues) {
      const campo = issue.path[0] as keyof AlumnoFormData | undefined;
      if (!campo || errores[campo]) continue;
      if (issue.code === "too_small") {
        errores[campo] = "Este dato es obligatorio.";
      } else if (issue.code === "too_big") {
        errores[campo] = `Máximo ${MAX_NOMBRE} caracteres.`;
      } else if (issue.code === "invalid_string" && issue.validation === "email") {
        errores[campo] = "Ingresá un email válido (o dejalo vacío).";
      } else if (issue.code === "invalid_string" && issue.message === "Invalid") {
        // Red de seguridad: un `regex()` del contrato sin mensaje propio emite
        // "Invalid" en inglés. Si aparece, el arreglo va en el contrato — el
        // back devuelve ese mismo texto cuando valida con `parseBody`.
        errores[campo] = "El formato no es válido.";
      } else {
        errores[campo] = issue.message;
      }
    }
  }
  return errores;
}

interface AlumnoFormModalProps {
  modo: ModoAlumnoForm;
  open: boolean;
  onClose: () => void;
  /** Solo en LECTURA: el alumno que se está consultando. */
  alumno?: AlumnoResponse | null;
  /** Error de la API ya traducido. Si trae `campo`, se pinta bajo ese input. */
  errorRemoto?: { campo?: string; mensaje: string; accion?: { label: string; onClick: () => void } } | null;
  guardando?: boolean;
  onGuardar: (body: CrearAlumnoBody, datos: AlumnoFormData) => void;
}

export function AlumnoFormModal({
  modo,
  open,
  onClose,
  alumno,
  errorRemoto,
  guardando = false,
  onGuardar,
}: AlumnoFormModalProps) {
  const esLectura = modo === "LECTURA";
  const [datos, setDatos] = useState<AlumnoFormData>(EMPTY_FORM);
  const [envio, setEnvio] = useState(false);
  const [tocados, setTocados] = useState<Partial<Record<keyof AlumnoFormData, boolean>>>({});
  const [duplicados, setDuplicados] = useState<AlumnoResponse[]>([]);

  // Mismo modal para los dos modos: se inicializa al abrir y se limpia al cerrar.
  const [initialized, setInitialized] = useState(false);
  if (open && !initialized) {
    setDatos(
      alumno
        ? {
            nombre: alumno.nombre,
            apellido: alumno.apellido,
            dni: alumno.dni,
            fechaNacimiento: alumno.fechaNacimiento,
            telefono: alumno.telefono,
            email: alumno.email ?? "",
            nivelEducativo: alumno.nivelEducativo,
            responsableNombre: alumno.responsable?.nombre ?? "",
            responsableDni: alumno.responsable?.dni ?? "",
            responsableTelefono: alumno.responsable?.telefono ?? "",
          }
        : EMPTY_FORM,
    );
    setInitialized(true);
  }
  if (!open && initialized) {
    setInitialized(false);
    setEnvio(false);
    setTocados({});
    setDuplicados([]);
  }

  const set = (patch: Partial<AlumnoFormData>) => setDatos((d) => ({ ...d, ...patch }));
  /** Bloquea dígitos en campos de texto (nombre, apellido): solo letras y espacios. */
  const soloLetras = (v: string) => v.replace(/[0-9]/g, "");
  const tocar = (campo: keyof AlumnoFormData) => setTocados((t) => ({ ...t, [campo]: true }));

  const fechaValida = FECHA_OK.test(datos.fechaNacimiento);
  const edad = fechaValida ? edadEnAnios(datos.fechaNacimiento) : null;
  const menor = edad !== null && edad < 18;

  // Aviso temprano de posible duplicado: apenas están los tres datos, sin
  // esperar a que el operador termine de cargar todo el formulario. El chequeo
  // que decide es el de la página, al guardar.
  useEffect(() => {
    if (esLectura) return;
    let cancelado = false;
    const t = window.setTimeout(() => {
      const { nombre, apellido, fechaNacimiento } = datos;
      if (!nombre.trim() || !apellido.trim() || !FECHA_OK.test(fechaNacimiento)) {
        if (!cancelado) setDuplicados([]);
        return;
      }
      posiblesDuplicados({ nombre: nombre.trim(), apellido: apellido.trim(), fechaNacimiento })
        .then((r) => {
          if (!cancelado) setDuplicados(r);
        })
        .catch(() => {
          // Es un aviso, no un requisito: si falla, no se bloquea nada.
          if (!cancelado) setDuplicados([]);
        });
    }, 400);
    return () => {
      cancelado = true;
      window.clearTimeout(t);
    };
  }, [esLectura, datos]);

  const todosLosErrores = esLectura ? {} : validar(datos);
  const errores: CamposConError = Object.fromEntries(
    Object.entries(todosLosErrores).filter(
      ([campo]) => envio || tocados[campo as keyof AlumnoFormData],
    ),
  );
  if (errorRemoto?.campo) {
    errores[errorRemoto.campo as keyof AlumnoFormData] = errorRemoto.mensaje;
  }

  const guardar = () => {
    setEnvio(true);
    const encontrados = validar(datos);
    const primero = (Object.keys(encontrados) as (keyof AlumnoFormData)[])[0];
    if (primero) {
      document.getElementById(`alumno-${primero}`)?.focus();
      return;
    }
    onGuardar(aBody(datos), datos);
  };

  const soloLectura = { disabled: esLectura };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={esLectura ? "Ficha del alumno" : "Nuevo alumno"}
      icon={<Icon name={esLectura ? "badge" : "person_add"} size={20} className="text-primary" />}
      maxWidth="max-w-2xl"
      footer={
        esLectura ? (
          <>
            {/* HU-TUR-01 todavía no existe: el acceso directo se muestra pero
                no lleva a ninguna ruta rota. */}
            <span className="flex items-center gap-2">
              <Button type="button" variant="outline" disabled title="Disponible con la HU-TUR-01">
                <Icon name="event" size={16} />
                Reservar turno
              </Button>
              <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
                Próx.
              </span>
            </span>
            <Button type="button" onClick={onClose}>
              Cerrar
            </Button>
          </>
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
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!esLectura) guardar();
        }}
      >
        {/* ── Datos del sistema: nunca son inputs ───────────────────────── */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-sm bg-surface-container-low px-4 py-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
              N° de legajo
            </p>
            <p className="font-mono text-sm font-bold text-on-surface">
              {alumno ? alumno.legajo : "Se asigna al guardar"}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
              Fecha de alta
            </p>
            <p className="text-sm font-semibold text-on-surface">
              {alumno ? formatearFecha(alumno.fechaCreacion) : "Se asigna al guardar"}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
              Estado
            </p>
            <EstadoAlumnoBadge estado={alumno?.estado ?? "activo"} />
          </div>
        </div>

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

        {/* ── Datos del alumno ──────────────────────────────────────────── */}
        <fieldset className="flex flex-col gap-4">
          <legend className="text-sm font-bold text-on-surface">Datos del alumno</legend>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Input
                id="alumno-nombre"
                label="Nombre"
                requiredMark
                maxLength={MAX_NOMBRE}
                {...soloLectura}
                value={datos.nombre}
                onChange={(e) => set({ nombre: soloLetras(e.target.value) })}
                onBlur={() => tocar("nombre")}
                error={errores.nombre}
                placeholder="Julieta"
              />
              {!esLectura && (
                <p className="self-end text-xs font-medium text-on-surface-variant">
                  {datos.nombre.length}/{MAX_NOMBRE}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Input
                id="alumno-apellido"
                label="Apellido"
                requiredMark
                maxLength={MAX_NOMBRE}
                {...soloLectura}
                value={datos.apellido}
                onChange={(e) => set({ apellido: soloLetras(e.target.value) })}
                onBlur={() => tocar("apellido")}
                error={errores.apellido}
                placeholder="Acosta"
              />
              {!esLectura && (
                <p className="self-end text-xs font-medium text-on-surface-variant">
                  {datos.apellido.length}/{MAX_NOMBRE}
                </p>
              )}
            </div>
          </div>

          {/* Aviso de posible duplicado: informativo, no bloquea el alta. */}
          {!esLectura && duplicados.length > 0 && (
            <p
              role="status"
              className="flex items-start gap-2 rounded-sm border border-status-warning/40 bg-status-warning/10 px-3 py-2 text-xs font-semibold text-status-warning-strong"
            >
              <Icon name="info" size={16} className="mt-px shrink-0" />
              <span>
                Ya hay {duplicados.length === 1 ? "un alumno" : `${duplicados.length} alumnos`} con
                ese nombre, apellido y fecha de nacimiento:{" "}
                {duplicados.map((d) => d.legajo).join(", ")}. Podés cargarlo igual.
              </span>
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="alumno-dni"
              label="DNI"
              requiredMark
              inputMode="numeric"
              maxLength={8}
              {...soloLectura}
              value={datos.dni}
              onChange={(e) => set({ dni: e.target.value.replace(/\D/g, "") })}
              onBlur={() => tocar("dni")}
              error={errores.dni}
              placeholder="45111222"
              hint="7 u 8 dígitos, sin puntos."
            />
            <Input
              id="alumno-fechaNacimiento"
              label="Fecha de nacimiento"
              requiredMark
              type="date"
              max={fechaNacimientoMaxima()}
              {...soloLectura}
              value={datos.fechaNacimiento}
              onChange={(e) => {
                const v = e.target.value;
                // Bloqueo real: si se escribe a mano una fecha con menos de 6
                // años, no se acepta (el atributo `max` solo limita el picker).
                if (!v || v <= fechaNacimientoMaxima()) set({ fechaNacimiento: v });
              }}
              onBlur={() => tocar("fechaNacimiento")}
              error={errores.fechaNacimiento}
              hint={edad !== null && edad >= 0 ? `${edad} años` : undefined}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              id="alumno-nivelEducativo"
              label="Nivel educativo"
              requiredMark
              {...soloLectura}
              value={datos.nivelEducativo}
              onChange={(e) => set({ nivelEducativo: e.target.value })}
              onBlur={() => tocar("nivelEducativo")}
              error={errores.nivelEducativo}
            >
              <option value="">Seleccioná un nivel</option>
              {NIVELES_EDUCATIVOS.map((nivel) => (
                <option key={nivel} value={nivel}>
                  {nivel}
                </option>
              ))}
            </Select>
            <Input
              id="alumno-telefono"
              label="Teléfono"
              requiredMark
              inputMode="numeric"
              maxLength={11}
              {...soloLectura}
              value={datos.telefono}
              onChange={(e) => set({ telefono: e.target.value.replace(/\D/g, "") })}
              onBlur={() => tocar("telefono")}
              error={errores.telefono}
              placeholder="3874556677"
              hint="10 u 11 dígitos, sin guiones."
            />
          </div>

          <Input
            id="alumno-email"
            label="Email"
            type="email"
            maxLength={120}
            {...soloLectura}
            value={datos.email}
            onChange={(e) => set({ email: e.target.value })}
            onBlur={() => tocar("email")}
            error={errores.email}
            placeholder="alumno@mail.com"
            hint="Opcional."
          />
        </fieldset>

        {/* ── Datos del responsable ─────────────────────────────────────── */}
        {/* Siempre visible: si apareciera y desapareciera con la fecha, el
            formulario saltaría bajo el cursor. Lo que cambia es si es
            obligatorio (menor de 18) u opcional. */}
        <fieldset className="flex flex-col gap-4 rounded-sm border border-outline-variant px-4 py-4">
          <legend className="flex items-center gap-2 px-1 text-sm font-bold text-on-surface">
            Datos del responsable
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                menor
                  ? "bg-status-warning/15 text-status-warning-strong"
                  : "bg-surface-container-high text-on-surface-variant"
              }`}
            >
              {menor ? "Obligatorio" : "Opcional"}
            </span>
          </legend>

          <p className="text-xs font-medium text-on-surface-variant">
            {edad === null
              ? "Completá la fecha de nacimiento para saber si son obligatorios."
              : menor
                ? `El alumno tiene ${edad} años: los tres datos del responsable son obligatorios.`
                : `El alumno tiene ${edad} años: los datos del responsable son opcionales.`}
          </p>

          <Input
            id="alumno-responsableNombre"
            label="Nombre y apellido del responsable"
            requiredMark={menor}
            maxLength={100}
            {...soloLectura}
            value={datos.responsableNombre}
            onChange={(e) => set({ responsableNombre: soloLetras(e.target.value) })}
            onBlur={() => tocar("responsableNombre")}
            error={errores.responsableNombre}
            placeholder="Marta Acosta"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="alumno-responsableDni"
              label="DNI del responsable"
              requiredMark={menor}
              inputMode="numeric"
              maxLength={8}
              {...soloLectura}
              value={datos.responsableDni}
              onChange={(e) => set({ responsableDni: e.target.value.replace(/\D/g, "") })}
              onBlur={() => tocar("responsableDni")}
              error={errores.responsableDni}
              placeholder="27333444"
            />
            <Input
              id="alumno-responsableTelefono"
              label="Teléfono del responsable"
              requiredMark={menor}
              inputMode="numeric"
              maxLength={11}
              {...soloLectura}
              value={datos.responsableTelefono}
              onChange={(e) => set({ responsableTelefono: e.target.value.replace(/\D/g, "") })}
              onBlur={() => tocar("responsableTelefono")}
              error={errores.responsableTelefono}
              placeholder="3874556688"
            />
          </div>
        </fieldset>

        {/* Acción del error remoto (ej: "Ver ficha" del DNI duplicado). */}
        {errorRemoto?.accion && (
          <Button type="button" variant="outline" onClick={errorRemoto.accion.onClick}>
            <Icon name="visibility" size={16} />
            {errorRemoto.accion.label}
          </Button>
        )}
      </form>
    </Modal>
  );
}
