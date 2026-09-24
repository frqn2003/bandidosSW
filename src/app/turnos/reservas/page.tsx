"use client";

import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { RequiereSesion } from "@/components/auth/RequiereSesion";
import { Sidebar } from "@/components/layout/Sidebar";
import { BuscadorAlumno } from "@/components/turnos/BuscadorAlumno";
import { ComprobanteTurno } from "@/components/turnos/ComprobanteTurno";
import { FranjasHorarias } from "@/components/turnos/FranjasHorarias";
import { ResumenReserva, type DatoReserva } from "@/components/turnos/ResumenReserva";
import { Button } from "@/components/ui/Button";
import { Combobox } from "@/components/ui/Combobox";
import { ConfirmarDialog } from "@/components/ui/ConfirmarDialog";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import type { CrearTurnoBody } from "@/contracts/turno";
import type { MateriaOpcion } from "@/contracts/materia";
import { ApiError, mensajeDeError } from "@/lib/api-client";
import { formatearFecha } from "@/funciones/formato";
import {
  DIAS_MAXIMOS_RESERVA,
  MAX_OBSERVACIONES,
  buscarAlumnosActivos,
  enviarComprobantePorEmail,
  hoyISO,
  listarFranjas,
  listarMateriasActivas,
  listarProfesoresDeMateria,
  reservarTurno,
  sugerirProximaFranja,
  sumarDias,
  type AlumnoBusqueda,
  type FranjaTurnoResponse,
  type ProfesorDeMateria,
  type SugerenciaFranja,
  type TurnoResponse,
} from "@/data/turnos";

// Reserva de turno para clase de apoyo (HU-TUR-01) · Mesa de Entrada.
// Flujo encadenado: Alumno → Materia → Profesor → Fecha → Horario → Observaciones.
// Cambiar un campo limpia los que dependen de él (materia → profesor/horario;
// profesor o fecha → horario). Las reglas de negocio (cupo, superposición,
// anticipación) las valida el back; el front las anticipa en las franjas.

type Campo = "alumno" | "materia" | "profesor" | "fecha" | "horario";
type Errores = Partial<Record<Campo, string>>;

/** Resultado de una carga, junto a la clave para la que se pidió. */
type Carga<T> = { clave: string; lista: T[]; error: boolean };

const formatearPesos = (valor: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(valor);

const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const diaCorto = (iso: string) => DIAS[new Date(`${iso}T00:00:00`).getDay()];

/** Precarga desde /calendario: ?profesorId=&fecha=&hora= */
function leerPrecarga(sp: URLSearchParams | null) {
  const profesorId = Number(sp?.get("profesorId") ?? "");
  const fecha = sp?.get("fecha") ?? "";
  const hora = sp?.get("hora") ?? "";
  return {
    profesorId: Number.isInteger(profesorId) && profesorId > 0 ? profesorId : null,
    fecha: /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : "",
    hora: /^\d{2}:\d{2}$/.test(hora) ? hora : null,
  };
}

function ReservaContent() {
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const [hoy] = useState(() => hoyISO());
  const fechaMax = sumarDias(hoy, DIAS_MAXIMOS_RESERVA);

  // Una fecha precargada fuera de la ventana (ej. un hueco de un día que ya
  // pasó en el calendario) no se carga: se avisa y se pide otra.
  const [precarga, setPrecarga] = useState(() => {
    const p = leerPrecarga(searchParams);
    const fueraDeRango = p.fecha !== "" && (p.fecha < hoy || p.fecha > fechaMax);
    return fueraDeRango ? { ...p, fecha: "", hora: null, fueraDeRango } : { ...p, fueraDeRango };
  });

  // ── Formulario ──
  const [alumno, setAlumno] = useState<AlumnoBusqueda | null>(null);
  const [materiaId, setMateriaId] = useState("");
  const [profesorId, setProfesorId] = useState("");
  const [fecha, setFecha] = useState(precarga.fecha);
  const [hora, setHora] = useState<string | null>(null);
  /** Hora a seleccionar cuando lleguen las franjas (precarga o sugerencia). */
  const horaPendiente = useRef<string | null>(precarga.hora);
  const [observaciones, setObservaciones] = useState("");
  const [errores, setErrores] = useState<Errores>({});
  const [errorRemoto, setErrorRemoto] = useState<string | null>(null);

  // ── Confirmación y comprobante ──
  const [confirmarOpen, setConfirmarOpen] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [turno, setTurno] = useState<TurnoResponse | null>(null);
  const [dniComprobante, setDniComprobante] = useState<string | undefined>();
  const [emailComprobante, setEmailComprobante] = useState<string | null>(null);
  const [enviandoEmail, setEnviandoEmail] = useState(false);

  // ── Cargas (el "cargando" se deriva de la clave: sin setState síncrono en efectos) ──
  const [intentoMaterias, setIntentoMaterias] = useState(0);
  const [materias, setMaterias] = useState<Carga<MateriaOpcion> | null>(null);
  const [profesores, setProfesores] = useState<Carga<ProfesorDeMateria> | null>(null);
  const [recargaFranjas, setRecargaFranjas] = useState(0);
  const [franjas, setFranjas] = useState<Carga<FranjaTurnoResponse> | null>(null);
  const [sugerencia, setSugerencia] = useState<{ clave: string; valor: SugerenciaFranja | null } | null>(null);

  const materia = materias?.lista.find((m) => String(m.id) === materiaId) ?? null;
  const profesor = profesores?.lista.find((p) => String(p.id) === profesorId) ?? null;
  const fechaValida = fecha !== "" && fecha >= hoy && fecha <= fechaMax;

  const claveMaterias = String(intentoMaterias);
  const claveProfesores = materiaId || null;
  const claveFranjas =
    materiaId && profesorId && fechaValida
      ? `${materiaId}|${profesorId}|${fecha}|${alumno?.id ?? ""}|${recargaFranjas}`
      : null;
  const claveSugerencia =
    materiaId && profesorId ? `${materiaId}|${profesorId}|${alumno?.id ?? ""}|${recargaFranjas}` : null;

  const cargandoMaterias = materias?.clave !== claveMaterias;
  const cargandoProfesores = claveProfesores !== null && profesores?.clave !== claveProfesores;
  const cargandoFranjas = claveFranjas !== null && franjas?.clave !== claveFranjas;
  const franjasActuales = !cargandoFranjas && franjas ? franjas.lista : [];
  const sugerenciaActual = sugerencia?.clave === claveSugerencia ? sugerencia.valor : null;

  // BACKEND: GET /api/materias?estado=activo
  useEffect(() => {
    let cancelado = false;
    listarMateriasActivas()
      .then((lista) => {
        if (!cancelado) setMaterias({ clave: claveMaterias, lista, error: false });
      })
      .catch(() => {
        if (!cancelado) setMaterias({ clave: claveMaterias, lista: [], error: true });
      });
    return () => {
      cancelado = true;
    };
  }, [claveMaterias]);

  // BACKEND: GET /api/profesores?materiaId=&estado=activo
  useEffect(() => {
    if (!claveProfesores) return;
    let cancelado = false;
    listarProfesoresDeMateria(Number(claveProfesores))
      .then((lista) => {
        if (cancelado) return;
        setProfesores({ clave: claveProfesores, lista, error: false });
        // Precarga del calendario: si el profesor dicta la materia elegida, queda seleccionado.
        if (precarga.profesorId && lista.some((p) => p.id === precarga.profesorId)) {
          setProfesorId(String(precarga.profesorId));
        }
      })
      .catch(() => {
        if (!cancelado) setProfesores({ clave: claveProfesores, lista: [], error: true });
      });
    return () => {
      cancelado = true;
    };
  }, [claveProfesores, precarga.profesorId]);

  // BACKEND: GET /api/turnos/franjas?profesorId=&materiaId=&fecha=&alumnoId= (PENDIENTE CONTRATO)
  useEffect(() => {
    if (!claveFranjas) return;
    const [m, p, f, a] = claveFranjas.split("|");
    let cancelado = false;
    listarFranjas({ materiaId: Number(m), profesorId: Number(p), fecha: f, alumnoId: a ? Number(a) : undefined })
      .then((lista) => {
        if (cancelado) return;
        setFranjas({ clave: claveFranjas, lista, error: false });
        const pendiente = horaPendiente.current;
        if (pendiente) {
          if (lista.some((fr) => fr.horaInicio === pendiente && fr.disponible)) setHora(pendiente);
          horaPendiente.current = null;
        }
      })
      .catch(() => {
        if (!cancelado) setFranjas({ clave: claveFranjas, lista: [], error: true });
      });
    return () => {
      cancelado = true;
    };
  }, [claveFranjas]);

  // BACKEND: GET /api/turnos/proxima-franja?profesorId=&materiaId=&alumnoId=&desde= (PENDIENTE CONTRATO)
  useEffect(() => {
    if (!claveSugerencia) return;
    const [m, p, a] = claveSugerencia.split("|");
    let cancelado = false;
    sugerirProximaFranja({ materiaId: Number(m), profesorId: Number(p), alumnoId: a ? Number(a) : undefined, desde: hoy })
      .then((valor) => {
        if (!cancelado) setSugerencia({ clave: claveSugerencia, valor });
      })
      .catch(() => {
        if (!cancelado) setSugerencia({ clave: claveSugerencia, valor: null });
      });
    return () => {
      cancelado = true;
    };
  }, [claveSugerencia, hoy]);

  // ── Cambios encadenados ──
  const limpiarError = (campo: Campo) => {
    setErrores((e) => ({ ...e, [campo]: undefined }));
    setErrorRemoto(null);
  };

  const cambiarAlumno = (a: AlumnoBusqueda | null) => {
    setAlumno(a);
    // Con otro alumno cambian las franjas donde ya tiene turno.
    setHora(null);
    limpiarError("alumno");
  };

  const cambiarMateria = (id: string) => {
    if (id === materiaId) return;
    setMateriaId(id);
    setProfesorId("");
    setHora(null);
    limpiarError("materia");
  };

  const cambiarProfesor = (id: string) => {
    if (id === profesorId) return;
    setProfesorId(id);
    setHora(null);
    setPrecarga((p) => ({ ...p, profesorId: null }));
    limpiarError("profesor");
  };

  const cambiarFecha = (valor: string) => {
    setFecha(valor);
    setHora(null);
    horaPendiente.current = null;
    setErrorRemoto(null);
    setErrores((e) => ({ ...e, fecha: validarFecha(valor), horario: undefined }));
  };

  const validarFecha = (valor: string) => {
    if (!valor) return "Elegí la fecha de la clase.";
    if (valor < hoy) return "La fecha no puede ser anterior a hoy.";
    if (valor > fechaMax) return `Se puede reservar hasta ${DIAS_MAXIMOS_RESERVA} días hacia adelante (${formatearFecha(fechaMax)}).`;
    return undefined;
  };

  const usarSugerencia = (s: SugerenciaFranja) => {
    if (s.fecha === fecha) {
      setHora(s.horaInicio);
    } else {
      setFecha(s.fecha);
      setHora(null);
      horaPendiente.current = s.horaInicio;
    }
    setErrores((e) => ({ ...e, fecha: undefined, horario: undefined }));
    setErrorRemoto(null);
  };

  // ── Envío ──
  const validar = (): Errores => ({
    alumno: alumno ? undefined : "Buscá y elegí un alumno activo.",
    materia: materia ? undefined : "Elegí la materia.",
    profesor: profesor ? undefined : materia ? "Elegí el profesor." : "Elegí primero la materia.",
    fecha: validarFecha(fecha),
    horario: hora ? undefined : "Elegí un horario disponible.",
  });

  const abrirConfirmacion = () => {
    const e = validar();
    setErrores(e);
    setErrorRemoto(null);
    const primero = (Object.keys(e) as Campo[]).find((k) => e[k]);
    if (primero) {
      document.getElementById(`campo-${primero}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setConfirmarOpen(true);
  };

  const confirmar = async () => {
    if (!alumno || !materia || !profesor || !hora) return;
    const body: CrearTurnoBody = {
      alumnoId: alumno.id,
      materiaId: materia.id,
      profesorId: profesor.id,
      fecha,
      horaInicio: hora,
      observaciones: observaciones.trim() || null,
    };
    setConfirmando(true);
    try {
      // BACKEND: POST /api/turnos — el back registra la reserva en `auditoria`.
      const creado = await reservarTurno(body);
      setDniComprobante(alumno.dni);
      setEmailComprobante(alumno.email);
      setTurno(creado);
      setConfirmarOpen(false);
      showToast("success", `Turno ${creado.codigo} reservado.`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setConfirmarOpen(false);
      const codigo = e instanceof ApiError ? e.codigo : null;
      if (codigo === "SIN_CUPO") {
        // Concurrencia: otro operador tomó el último cupo. Se recargan las franjas.
        setHora(null);
        setRecargaFranjas((n) => n + 1);
        setErrorRemoto("El horario ya no está disponible. Actualizamos la lista: elegí otro horario.");
        showToast("error", "El horario ya no está disponible.");
      } else if (codigo === "ANTICIPACION_INSUFICIENTE" || codigo === "FUERA_DE_DISPONIBILIDAD") {
        setHora(null);
        setRecargaFranjas((n) => n + 1);
        setErrorRemoto(mensajeDeError(e));
      } else {
        // ALUMNO_CON_TURNO_SUPERPUESTO y el resto: mensaje en rojo, se conservan los datos.
        setErrorRemoto(mensajeDeError(e));
      }
    } finally {
      setConfirmando(false);
    }
  };

  const nuevaReserva = () => {
    setTurno(null);
    setAlumno(null);
    setMateriaId("");
    setProfesorId("");
    setFecha("");
    setHora(null);
    horaPendiente.current = null;
    setObservaciones("");
    setErrores({});
    setErrorRemoto(null);
    setPrecarga({ profesorId: null, fecha: "", hora: null, fueraDeRango: false });
    setRecargaFranjas((n) => n + 1);
  };

  // OPCIONAL: envío del comprobante por email. Si no se quiere, borrar esta
  // función, `enviandoEmail` y las props onEnviarEmail/emailDestino del comprobante.
  const enviarEmail = async () => {
    if (!turno) return;
    setEnviandoEmail(true);
    try {
      const { destinatario } = await enviarComprobantePorEmail(turno.id);
      showToast("success", `Comprobante enviado a ${destinatario}.`);
    } catch (e) {
      showToast("error", mensajeDeError(e));
    } finally {
      setEnviandoEmail(false);
    }
  };

  // ── Resumen (panel lateral y modal) ──
  const datosResumen: DatoReserva[] = (() => {
    const franja = franjasActuales.find((f) => f.horaInicio === hora);
    return [
      {
        label: "Alumno",
        icon: "person",
        valor: alumno ? (
          <>
            {alumno.apellido}, {alumno.nombre}
            <span className="block text-xs font-medium text-on-surface-variant">
              {alumno.legajo} · DNI {alumno.dni}
            </span>
          </>
        ) : null,
      },
      { label: "Materia", icon: "menu_book", valor: materia?.nombre ?? null },
      { label: "Profesor", icon: "school", valor: profesor ? `${profesor.apellido}, ${profesor.nombre}` : null },
      { label: "Fecha", icon: "event", valor: fechaValida ? formatearFecha(fecha) : null },
      {
        label: "Horario",
        icon: "schedule",
        valor: franja ? `${franja.horaInicio} – ${franja.horaFin}` : null,
      },
      {
        label: "Duración",
        icon: "timer",
        valor: materia ? `${materia.duracionClaseMinutos} min` : null,
      },
      { label: "Valor de la clase", icon: "payments", valor: profesor ? formatearPesos(profesor.precio) : null },
    ];
  })();

  const opcionesMaterias = (materias?.lista ?? []).map((m) => ({
    value: String(m.id),
    label: `${m.nombre} · ${m.nivel}`,
  }));
  const opcionesProfesores = (cargandoProfesores ? [] : (profesores?.lista ?? [])).map((p) => ({
    value: String(p.id),
    label: `${p.apellido}, ${p.nombre}`,
  }));

  const hintProfesor = !materiaId
    ? "Elegí primero la materia."
    : cargandoProfesores
      ? "Cargando profesores…"
      : profesores?.error
        ? "No pudimos cargar los profesores."
        : opcionesProfesores.length === 0
          ? "Ningún profesor activo dicta esta materia."
          : "Solo profesores activos que dictan la materia.";

  const mostrarSugerencia =
    sugerenciaActual !== null && !(sugerenciaActual.fecha === fecha && sugerenciaActual.horaInicio === hora);

  return (
    <div className="flex min-h-screen bg-surface">
      <div className="print:hidden">
        <Sidebar />
      </div>

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-5">
          <header className="flex flex-wrap items-center justify-between gap-3 print:hidden">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-md bg-primary-container/30">
                <Icon name="event_available" size={24} className="text-primary" />
              </span>
              <div>
                <h1 className="font-display text-2xl font-bold text-on-surface">Reservar turno</h1>
                <p className="text-sm font-medium text-on-surface-variant">
                  Clase de apoyo: elegí alumno, materia, profesor y un horario con cupo.
                </p>
              </div>
            </div>
          </header>

          {turno ? (
            <ComprobanteTurno
              turno={turno}
              dniAlumno={dniComprobante}
              onNuevaReserva={nuevaReserva}
              hrefCalendario="/calendario"
              // OPCIONAL: impresión del comprobante (borrar esta prop si no se quiere).
              onImprimir={() => window.print()}
              // OPCIONAL: envío por email (borrar estas tres props si no se quiere).
              onEnviarEmail={enviarEmail}
              enviandoEmail={enviandoEmail}
              emailDestino={emailComprobante}
            />
          ) : (
            <>
              {precarga.profesorId && (
                <div
                  role="status"
                  className="flex items-start gap-3 rounded-md border border-secondary/30 bg-secondary/5 px-4 py-3"
                >
                  <Icon name="calendar_view_month" size={20} className="mt-0.5 text-secondary" />
                  <p className="text-sm font-medium text-on-surface">
                    {precarga.fueraDeRango
                      ? "Venís del calendario, pero ese día ya no se puede reservar: elegí otra fecha. "
                      : "Venís del calendario: la fecha y el horario ya están cargados. "}
                    Elegí el alumno y la materia; si el profesor la dicta, queda seleccionado.
                  </p>
                </div>
              )}

              {materias?.error && !cargandoMaterias ? (
                <section
                  role="alert"
                  className="flex flex-col items-center gap-3 rounded-md border border-error/40 bg-error/5 px-6 py-12 text-center"
                >
                  <Icon name="error" size={40} className="text-error" />
                  <h2 className="text-lg font-bold text-on-surface">No pudimos cargar el formulario</h2>
                  <p className="max-w-sm text-sm font-medium text-on-surface-variant">
                    Revisá la conexión y volvé a intentar. Si el problema sigue, avisá al equipo.
                  </p>
                  <Button type="button" variant="outline" onClick={() => setIntentoMaterias((n) => n + 1)}>
                    <Icon name="refresh" size={16} />
                    Reintentar
                  </Button>
                </section>
              ) : (
                <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
                  <form
                    noValidate
                    onSubmit={(e) => {
                      e.preventDefault();
                      abrirConfirmacion();
                    }}
                    className="flex flex-col rounded-md border border-outline-variant bg-surface-container-lowest shadow-card"
                  >
                    <Paso numero={1} id="campo-alumno">
                      <BuscadorAlumno
                        id="alumno"
                        label="Alumno"
                        requiredMark
                        value={alumno}
                        onChange={cambiarAlumno}
                        buscar={buscarAlumnosActivos}
                        error={errores.alumno}
                      />
                    </Paso>

                    <Paso numero={2} id="campo-materia">
                      <Combobox
                        id="materia"
                        label="Materia"
                        requiredMark
                        value={materiaId}
                        options={opcionesMaterias}
                        onChange={cambiarMateria}
                        disabled={cargandoMaterias}
                        placeholder={cargandoMaterias ? "Cargando materias…" : "Elegí o escribí una materia"}
                        noResultsText="No hay materias activas con ese nombre"
                        maxResults={20}
                        error={errores.materia}
                        hint={materia ? `Duración de la clase: ${materia.duracionClaseMinutos} min.` : "Solo materias activas."}
                      />
                    </Paso>

                    <Paso numero={3} id="campo-profesor">
                      <Combobox
                        id="profesor"
                        label="Profesor"
                        requiredMark
                        value={profesorId}
                        options={opcionesProfesores}
                        onChange={cambiarProfesor}
                        disabled={!materiaId || cargandoProfesores}
                        placeholder={materiaId ? "Elegí un profesor" : "Primero elegí la materia"}
                        noResultsText="Ningún profesor coincide"
                        error={errores.profesor}
                        hint={hintProfesor}
                      />
                    </Paso>

                    <Paso numero={4} id="campo-fecha">
                      <Input
                        id="fecha"
                        type="date"
                        label="Fecha"
                        requiredMark
                        value={fecha}
                        min={hoy}
                        max={fechaMax}
                        onChange={(e) => cambiarFecha(e.target.value)}
                        error={errores.fecha}
                        hint={`dd/mm/aaaa · de hoy al ${formatearFecha(fechaMax)}.`}
                        className="sm:max-w-xs"
                      />
                    </Paso>

                    <Paso numero={5} id="campo-horario">
                      <SeccionHorario
                        listo={Boolean(materia && profesor && fechaValida)}
                        cargando={cargandoFranjas}
                        error={!cargandoFranjas && Boolean(franjas?.error)}
                        onReintentar={() => setRecargaFranjas((n) => n + 1)}
                        franjas={franjasActuales}
                        duracion={materia?.duracionClaseMinutos ?? null}
                        hora={hora}
                        onHora={(h) => {
                          setHora(h);
                          limpiarError("horario");
                        }}
                        errorCampo={errores.horario}
                        sugerencia={
                          mostrarSugerencia && sugerenciaActual ? (
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
                          ) : null
                        }
                      />
                    </Paso>

                    <Paso numero={6} id="campo-observaciones" ultimo>
                      <Textarea
                        id="observaciones"
                        label="Observaciones (opcional)"
                        value={observaciones}
                        maxLength={MAX_OBSERVACIONES}
                        rows={3}
                        onChange={(e) => setObservaciones(e.target.value.slice(0, MAX_OBSERVACIONES))}
                        placeholder="Ej: repasar ecuaciones para el parcial"
                        hint={`${observaciones.length}/${MAX_OBSERVACIONES} caracteres`}
                      />
                    </Paso>

                    <div className="flex flex-col gap-3 border-t border-outline-variant bg-surface-container-low px-5 py-4 sm:px-6">
                      {errorRemoto && (
                        <div
                          role="alert"
                          className="flex items-start gap-2 rounded-sm border border-error/40 bg-error/5 px-3 py-2.5 text-sm font-semibold text-error"
                        >
                          <Icon name="error" size={18} className="mt-0.5 shrink-0" />
                          {errorRemoto}
                        </div>
                      )}
                      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs font-medium text-on-surface-variant">
                          <span className="text-error">*</span> Campos obligatorios. Antes de guardar vas a ver un
                          resumen.
                        </p>
                        <Button type="submit">
                          <Icon name="event_available" size={18} />
                          Reservar turno
                        </Button>
                      </div>
                    </div>
                  </form>

                  <aside
                    aria-labelledby="resumen-titulo"
                    className="flex flex-col gap-4 rounded-md border border-outline-variant bg-surface-container-lowest p-5 shadow-card xl:sticky xl:top-6"
                  >
                    <h2 id="resumen-titulo" className="font-display text-base font-bold text-on-surface">
                      Resumen de la reserva
                    </h2>
                    <ResumenReserva datos={datosResumen} />
                  </aside>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <ConfirmarDialog
        open={confirmarOpen}
        title="Confirmar reserva"
        description="Revisá los datos del turno antes de guardarlo."
        confirmLabel="Confirmar"
        confirmandoLabel="Reservando…"
        cancelLabel="Cancelar"
        tone="success"
        confirmando={confirmando}
        onClose={() => setConfirmarOpen(false)}
        onConfirm={confirmar}
      >
        <div className="mt-4 rounded-sm border border-outline-variant p-4">
          <ResumenReserva datos={datosResumen.filter((d) => d.label !== "Duración")} />
        </div>
      </ConfirmarDialog>
    </div>
  );
}

/** Paso numerado del formulario (orden visual del flujo encadenado). */
function Paso({
  numero,
  id,
  ultimo = false,
  children,
}: {
  numero: number;
  id: string;
  ultimo?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      id={id}
      className={`flex gap-4 px-5 py-5 sm:px-6 ${ultimo ? "" : "border-b border-outline-variant/60"}`}
    >
      <span
        aria-hidden="true"
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary"
      >
        {numero}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/** Paso 5: franjas con sus estados (sin datos previos / cargando / error / vacío / lista). */
function SeccionHorario({
  listo,
  cargando,
  error,
  onReintentar,
  franjas,
  duracion,
  hora,
  onHora,
  errorCampo,
  sugerencia,
}: {
  listo: boolean;
  cargando: boolean;
  error: boolean;
  onReintentar: () => void;
  franjas: FranjaTurnoResponse[];
  duracion: number | null;
  hora: string | null;
  onHora: (h: string) => void;
  errorCampo?: string;
  sugerencia: ReactNode;
}) {
  const titulo = (
    <p className="mb-1.5 text-sm font-bold text-on-surface">
      Horario <span className="text-error">*</span>
    </p>
  );

  if (!listo) {
    return (
      <div className="flex flex-col gap-2">
        {titulo}
        {sugerencia}
        <p className="rounded-sm border border-dashed border-outline-variant px-4 py-4 text-sm font-medium text-on-surface-variant">
          Completá materia, profesor y fecha para ver los horarios libres.
        </p>
        {errorCampo && (
          <p role="alert" className="text-sm font-semibold text-error">
            {errorCampo}
          </p>
        )}
      </div>
    );
  }

  if (cargando) {
    return (
      <div className="flex flex-col gap-2" role="status" aria-live="polite">
        {titulo}
        <span className="sr-only">Cargando horarios…</span>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-2" aria-hidden="true">
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} className="h-16 animate-pulse rounded-sm bg-surface-container-high" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-2">
        {titulo}
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-sm border border-error/40 bg-error/5 px-4 py-3">
          <Icon name="error" size={18} className="text-error" />
          <p className="flex-1 text-sm font-semibold text-error">No pudimos cargar los horarios.</p>
          <Button type="button" variant="outline" size="sm" className="min-h-11" onClick={onReintentar}>
            <Icon name="refresh" size={16} />
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  if (franjas.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        {titulo}
        <p className="flex items-center gap-2 rounded-sm border border-dashed border-outline-variant px-4 py-4 text-sm font-medium text-on-surface-variant">
          <Icon name="event_busy" size={18} />
          El profesor no tiene horarios libres ese día. Probá otra fecha.
        </p>
        {sugerencia}
        {errorCampo && (
          <p role="alert" className="text-sm font-semibold text-error">
            {errorCampo}
          </p>
        )}
      </div>
    );
  }

  const libres = franjas.filter((f) => f.disponible).length;
  return (
    <div className="flex flex-col gap-3">
      <FranjasHorarias
        name="horario"
        legend="Horario"
        requiredMark
        franjas={franjas}
        value={hora}
        onChange={onHora}
        error={errorCampo}
        hint={`${libres} de ${franjas.length} franjas con cupo · clase de ${duracion ?? "—"} min. Las franjas en gris no se pueden elegir.`}
      />
      {sugerencia}
    </div>
  );
}

export default function ReservaTurnoPage() {
  return (
    <RequiereSesion>
      <ToastProvider>
        {/* useSearchParams necesita un límite de Suspense para el prerender. */}
        <Suspense fallback={null}>
          <ReservaContent />
        </Suspense>
      </ToastProvider>
    </RequiereSesion>
  );
}
