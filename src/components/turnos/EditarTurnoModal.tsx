"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmarDialog } from "@/components/ui/ConfirmarDialog";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { FranjasHorarias } from "@/components/turnos/FranjasHorarias";
import { BarraModificaciones } from "@/components/turnos/BarraModificaciones";
import { hoyAR } from "@/contracts/alumno";
import { ApiError, mensajeDeError } from "@/lib/api-client";
import { formatearFecha } from "@/funciones/formato";
import {
  DIAS_MAXIMOS_RESERVA,
  MAX_OBSERVACIONES,
  listarFranjasParaEdicion,
  listarProfesoresParaEdicion,
  modificarTurno,
  sugerirProximaFranja,
  sumarDias,
  type FranjaTurnoResponse,
  type ProfesorEdicionOpcion,
  type SugerenciaFranja,
  type TurnoResponse,
} from "@/data/turnos";

// Modificación de turno en 2 pasos (HU-TUR-02).
//
// Paso 1 — formulario con los datos editables (profesor de la misma materia,
// fecha, horario y observaciones).
// Paso 2 — ConfirmarDialog con el resumen del cambio (caja "Antes → Después",
// el "antes" lleva ícono de reloj y tachado) antes de ejecutar; en el paso 1 el
// diff NO se muestra, solo se calcula para la confirmación.
//
// Profesor/fecha/horario, otras reglas de negocio (estado, pago, vencimiento,
// tope de modificaciones) las revalida la capa de datos (modificarTurno)
// como lo hará el back; la fila ya viene con `puedeModificar` off en esos casos.

type Carga<T> = { clave: string; lista: T[]; error: boolean };

type CampoError = "profesor" | "fecha" | "horario" | "global";
type Errores = Partial<Record<CampoError, string>>;

interface EditarTurnoModalProps {
  turno: TurnoResponse | null;
  open: boolean;
  /** Tope de modificaciones (`parametro.max_modificaciones_turno`) para la barra. */
  maxModificaciones: number;
  onClose: () => void;
  /** El turno que devolvió modificarTurno (ya con el contador +1). */
  onGuardado: (turno: TurnoResponse) => void;
}

function diffVacio() {
  return { profesor: false, fecha: false, horario: false, observaciones: false };
}

const DIAS_CORTOS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const diaCorto = (iso: string) => DIAS_CORTOS[new Date(`${iso}T00:00:00`).getDay()];

export function EditarTurnoModal({
  turno,
  open,
  maxModificaciones,
  onClose,
  onGuardado,
}: EditarTurnoModalProps) {
  const [profesores, setProfesores] = useState<Carga<ProfesorEdicionOpcion> | null>(null);
  const [franjas, setFranjas] = useState<Carga<FranjaTurnoResponse> | null>(null);
  const [sugerencia, setSugerencia] = useState<{ clave: string; valor: SugerenciaFranja | null } | null>(null);
  const [profesorId, setProfesorId] = useState("");
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState<string | null>(null);
  const [observaciones, setObservaciones] = useState("");
  const [errores, setErrores] = useState<Errores>({});
  const [confirmarOpen, setConfirmarOpen] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  const hoy = hoyAR();
  const fechaMax = sumarDias(hoy, DIAS_MAXIMOS_RESERVA);

  const idTurno = turno?.id ?? null;
  const claveProfesores = useMemo(() => String(idTurno), [idTurno]);
  const claveFranjas = profesorId && fecha ? `${profesorId}|${fecha}|${idTurno}` : null;
  const claveSugerencia = profesorId ? `${profesorId}|${idTurno}` : null;

  // Reset del formulario cada vez que abre con un turno distinto.
  useEffect(() => {
    if (!turno || !open) return;
    setProfesorId(String(turno.profesor.id));
    setFecha(turno.fecha);
    setHora(turno.horaInicio);
    setObservaciones(turno.observaciones ?? "");
    setErrores({});
    setConfirmarOpen(false);
    setFranjas(null);
    setProfesores(null);
  }, [open, turno]);

  // BACKEND: GET /api/profesores?materiaId=&estado=activo
  useEffect(() => {
    if (!open || !turno) return;
    let cancelado = false;
    listarProfesoresParaEdicion(turno.materia.id)
      .then((lista) => {
        if (!cancelado) setProfesores({ clave: claveProfesores, lista, error: false });
      })
      .catch(() => {
        if (!cancelado) setProfesores({ clave: claveProfesores, lista: [], error: true });
      });
    return () => {
      cancelado = true;
    };
  }, [open, turno, claveProfesores]);

  // BACKEND: GET /api/calendario/agenda+cupos (listarFranjas en el back)
  useEffect(() => {
    if (!claveFranjas || !turno) return;
    const [p, f] = claveFranjas.split("|");
    let cancelado = false;
    listarFranjasParaEdicion({ profesorId: Number(p), materiaId: turno.materia.id, fecha: f })
      .then((lista) => {
        if (!cancelado) setFranjas({ clave: claveFranjas, lista, error: false });
      })
      .catch(() => {
        if (!cancelado) setFranjas({ clave: claveFranjas, lista: [], error: true });
      });
    return () => {
      cancelado = true;
    };
  }, [claveFranjas, turno]);

  // BACKEND: GET /api/turnos/proxima-franja?profesorId=&materiaId=&desde= (PENDIENTE CONTRATO)
  useEffect(() => {
    if (!turno || !claveSugerencia) return;
    let cancelado = false;
    sugerirProximaFranja({ materiaId: turno.materia.id, profesorId: Number(profesorId), desde: hoy })
      .then((valor) => {
        if (!cancelado) setSugerencia({ clave: claveSugerencia, valor });
      })
      .catch(() => {
        if (!cancelado) setSugerencia({ clave: claveSugerencia, valor: null });
      });
    return () => {
      cancelado = true;
    };
  }, [claveSugerencia, hoy, profesorId, turno]);

  if (!turno) return null;

  const cargandoProfesores = profesores?.clave !== claveProfesores;
  const cargandoFranjas = claveFranjas !== null && franjas?.clave !== claveFranjas;
  const franjasBase = !cargandoFranjas && franjas ? franjas.lista : [];

  // El horario actual del turno se ofrece aunque quede sin cupo en el fixture
  // (ya es del turno): permite editar solo las observaciones sin re-picar horario.
  const franjasMostrables = franjasBase.some((f) => f.horaInicio === turno.horaInicio)
    ? franjasBase
    : [
        {
          horaInicio: turno.horaInicio,
          horaFin: turno.horaFin,
          capacidad: 1,
          cuposDisponibles: 1,
          disponible: true,
          motivo: null,
        },
        ...franjasBase,
      ];

  const profesorElegido = profesores?.lista.find((p) => String(p.id) === profesorId) ?? null;
  const franjasLibres = franjasMostrables.filter((f) => f.disponible).length;
  const sugerenciaActual = sugerencia?.clave === claveSugerencia ? sugerencia.valor : null;
  const hintFranjas =
    claveFranjas === null
      ? "Elegí el profesor y la fecha para ver los horarios."
      : cargandoFranjas || franjas?.error || franjasBase.length === 0
        ? undefined
        : `${franjasLibres} de ${franjasMostrables.length} franjas con cupo · clase de ${turno.materia.duracionClaseMinutos} min. Las franjas en gris no se pueden elegir.`;
  const diff = diffVacio();
  if (turno) {
    diff.profesor = profesorElegido !== null && profesorElegido.id !== turno.profesor.id;
    diff.fecha = fecha !== "" && fecha !== turno.fecha;
    diff.horario = hora !== null && hora !== turno.horaInicio;
    diff.observaciones = observaciones.trim() !== (turno.observaciones ?? "");
  }

  const limpiarError = (campo: CampoError) =>
    setErrores((e) => ({ ...e, [campo]: undefined }));

  const validar = (): Errores => ({
    profesor: profesorElegido ? undefined : "Elegí el profesor.",
    fecha: !fecha
      ? "Elegí la fecha."
      : fecha < hoy
        ? "La fecha no puede ser anterior a hoy."
        : fecha > fechaMax
          ? `La fecha no puede superar los ${DIAS_MAXIMOS_RESERVA} días hacia adelante.`
          : undefined,
    horario: hora ? undefined : "Elegí un horario disponible.",
  });

  const continuar = () => {
    const e = validar();
    setErrores(e);
    if (Object.values(e).some(Boolean)) return;
    setConfirmarOpen(true);
  };

  const usarSugerencia = (s: SugerenciaFranja) => {
    setFecha(s.fecha);
    setHora(s.horaInicio);
    limpiarError("fecha");
    limpiarError("horario");
  };

  const confirmar = async () => {
    if (!turno) return;
    setConfirmando(true);
    setErrores((er) => ({ ...er, global: undefined }));
    try {
      const actualizado = await modificarTurno(turno.id, {
        profesorId: Number(profesorId),
        fecha,
        horaInicio: hora as string,
        observaciones: observaciones.trim() === "" ? null : observaciones.trim(),
      });
      onGuardado(actualizado);
      onClose();
    } catch (e) {
      const codigo = e instanceof ApiError ? e.codigo : undefined;
      if (codigo === "REFERENCIA_INVALIDA" || codigo === "PROFESOR_NO_DICTA_MATERIA") {
        setErrores((er) => ({ ...er, profesor: mensajeDeError(e), global: undefined }));
      } else {
        setErrores((er) => ({ ...er, global: mensajeDeError(e) }));
      }
      setConfirmarOpen(false);
    } finally {
      setConfirmando(false);
    }
  };

  const filasCambio = () => {
    if (!turno) return [];
    const filas: Array<{ label: string; antes: string; despues: string }> = [];
    if (diff.horario) {
      filas.push({
        label: "Horario",
        antes: `${turno.horaInicio} – ${turno.horaFin}`,
        despues: `${hora} – ${franjasMostrables.find((f) => f.horaInicio === hora)?.horaFin ?? hora}`,
      });
    }
    if (diff.fecha) filas.push({ label: "Fecha", antes: formatearFecha(turno.fecha), despues: formatearFecha(fecha) });
    if (diff.profesor && profesorElegido) {
      filas.push({
        label: "Profesor",
        antes: `${turno.profesor.apellido}, ${turno.profesor.nombre}`,
        despues: `${profesorElegido.apellido}, ${profesorElegido.nombre}`,
      });
    }
    if (diff.observaciones) {
      filas.push({
        label: "Observaciones",
        antes: turno.observaciones ?? "—",
        despues: observaciones.trim() || "—",
      });
    }
    return filas;
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={`Modificar turno ${turno.codigo}`}
        icon={<Icon name="edit_calendar" size={22} className="text-primary" />}
        maxWidth="max-w-2xl"
        footer={
          <>
            <p className="mr-auto text-xs font-medium text-on-surface-variant sm:self-center">
              <span className="text-error">*</span> Campos obligatorios. Antes de guardar vas a ver el resumen del
              cambio.
            </p>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="button" onClick={continuar}>
              Continuar
              <Icon name="arrow_forward" size={16} />
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          {/* Arriba del todo: la restricción se ve ANTES de tocar los campos. */}
          <BarraModificaciones
            cantidad={turno.cantidadModificaciones}
            maxModificaciones={maxModificaciones}
            leyenda="El horario original se libera recién al confirmar."
          />

          {cargandoProfesores || profesores?.error ? (
            <div className="rounded-sm border border-outline-variant bg-surface-container px-4 py-3 text-sm">
              {profesores?.error
                ? "No pudimos cargar los profesores. Volvé a abrir el modal para reintentar."
                : "Cargando profesores…"}
            </div>
          ) : (
            <Select
              id="editar-profesor"
              label="Profesor"
              requiredMark
              value={profesorId}
              error={errores.profesor}
              hint="Solo profesores activos que dictan la materia."
              onChange={(e) => {
                setProfesorId(e.target.value);
                setHora(null);
                limpiarError("profesor");
              }}
            >
              {profesores?.lista.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.apellido}, {p.nombre}
                </option>
              ))}
            </Select>
          )}

          <Input
            id="editar-fecha"
            type="date"
            label="Fecha"
            requiredMark
            min={hoy}
            max={fechaMax}
            value={fecha}
            error={errores.fecha}
            onChange={(e) => {
              setFecha(e.target.value);
              setHora(null);
              limpiarError("fecha");
            }}
          />

          <div className="flex min-w-0 flex-col gap-3">
            <FranjasHorarias
              name="editar-horario"
              legend="Horario"
              requiredMark
              franjas={franjasMostrables}
              value={hora}
              error={errores.horario}
              hint={hintFranjas}
              onChange={(h) => {
                setHora(h);
                limpiarError("horario");
              }}
            />

            {sugerenciaActual && hora === null && !cargandoFranjas ? (
              <div className="flex flex-wrap items-center gap-3 rounded-sm border border-tertiary/40 bg-tertiary/5 px-3 py-2">
                <Icon name="bolt" size={18} className="text-tertiary" />
                <p className="flex-1 text-sm font-medium text-on-surface">
                  Próximo horario libre:{" "}
                  <strong className="font-bold">
                    {diaCorto(sugerenciaActual.fecha)} {formatearFecha(sugerenciaActual.fecha)} ·{" "}
                    {sugerenciaActual.horaInicio} – {sugerenciaActual.horaFin}
                  </strong>{" "}
                  <span className="text-on-surface-variant">
                    ({sugerenciaActual.cuposDisponibles} de {sugerenciaActual.capacidad} cupos)
                  </span>
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-11"
                  onClick={() => usarSugerencia(sugerenciaActual)}
                >
                  Usar este horario
                </Button>
              </div>
            ) : null}
          </div>

          <Textarea
            id="editar-observaciones"
            label="Observaciones (opcional)"
            value={observaciones}
            maxLength={MAX_OBSERVACIONES}
            placeholder="Ej: repasar ecuaciones para el parcial"
            hint={`${observaciones.length}/${MAX_OBSERVACIONES}`}
            onChange={(e) => setObservaciones(e.target.value)}
          />

          {errores.global && (
            <p role="alert" className="rounded-sm border border-error/40 bg-error/5 px-3 py-2 text-sm font-semibold text-error">
              {errores.global}
            </p>
          )}
        </div>
      </Modal>

      <ConfirmarDialog
        open={confirmarOpen}
        tone="neutral"
        title={`Confirmar modificación ${turno.codigo}`}
        description={`Vas a modificar el turno de ${turno.alumno.apellido}, ${turno.alumno.nombre}.`}
        confirmLabel="Confirmar modificación"
        confirmando={confirmando}
        onClose={() => setConfirmarOpen(false)}
        onConfirm={confirmar}
      >
        <ul className="mt-3 flex flex-col gap-2 rounded-sm bg-surface-container px-3 py-2">
          {filasCambio().map((f) => (
            <li key={f.label} className="flex flex-col gap-0.5 text-sm">
              <span className="font-bold text-on-surface">{f.label}</span>
              <span className="flex flex-wrap items-center gap-1.5 text-on-surface-variant">
                <span className="flex items-center gap-1">
                  <Icon name="history" size={14} className="text-tertiary" />
                  <span className="line-through">{f.antes}</span>
                </span>
                <Icon name="arrow_forward" size={14} className="text-primary" />
                <span className="font-semibold text-on-surface">{f.despues}</span>
              </span>
            </li>
          ))}
        </ul>
      </ConfirmarDialog>
    </>
  );
}