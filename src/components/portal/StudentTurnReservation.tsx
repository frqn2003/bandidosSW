// src/components/portal/StudentTurnReservation.tsx
//
// Componente "Reservar Turno" en el Portal del Alumno (HU-POR-01).
// Diseñado siguiendo el mismo flujo, componentes y estética de la vista de Mesa de Entrada / Gerente (/turnos/reservas):
// 1. Alumno fijo y no editable (Paso 1).
// 2. Pasos numerados 1 a 6 con flujo encadenado (Materia -> Profesor -> Fecha -> Horario -> Observaciones).
// 3. Grilla interactiva de franjas horarias con cupos y banner de "Próximo horario libre".
// 4. Panel lateral fijo con "Resumen de la reserva" (omitiendo estrictamente "Valor de la clase" por HU-POR-01).
// 5. Verificación del límite de turnos futuros (alerta roja destacada si se alcanza).
// 6. ConfirmarDialog antes de emitir la reserva y comprobante final con diseño MD3.

"use client";

import React, { useState, useEffect, type ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Combobox } from "@/components/ui/Combobox";
import { Textarea } from "@/components/ui/Textarea";
import { ConfirmarDialog } from "@/components/ui/ConfirmarDialog";
import { FranjasHorarias } from "@/components/turnos/FranjasHorarias";
import { ResumenReserva, type DatoReserva } from "@/components/turnos/ResumenReserva";
import { TurnoCalendarioBadge } from "@/components/calendario/TurnoCalendarioBadge";
import { useToast } from "@/components/ui/Toast";
import { useSesion } from "@/funciones/sesion";
import { formatearFecha } from "@/funciones/formato";
import { sumarDias } from "@/funciones/fechas-calendario";
import type { FranjaTurnoResponse } from "@/data/turnos";
import {
  obtenerMisTurnos,
  listarMateriasPortal,
  listarProfesoresPortal,
  reservarTurnoPortal,
  listarHorariosPortal,
  sugerirProximoHorarioPortal,
  type HorarioPortal,
  type SugerenciaPortal,
  type MateriaPortalResponse,
  type ProfesorPortalResponse,
  type TurnoPortalResponse,
} from "@/data/portal";

const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const diaCorto = (iso: string) => DIAS[new Date(`${iso}T00:00:00`).getDay()];

type Campo = "materia" | "profesor" | "fecha" | "horario";
type Errores = Partial<Record<Campo, string>>;

export function StudentTurnReservation() {
  const { sesion } = useSesion();
  const { showToast } = useToast();

  const [cargandoInicial, setCargandoInicial] = useState(true);
  const [turnosFuturosCount, setTurnosFuturosCount] = useState(0);
  const [limiteMaximo, setLimiteMaximo] = useState(5);

  // Catálogo base de materias
  const [materias, setMaterias] = useState<MateriaPortalResponse[]>([]);

  // Formulario
  const [materiaId, setMateriaId] = useState<string>("");
  const [profesorId, setProfesorId] = useState<string>("");
  const [fecha, setFecha] = useState<string>("");
  const [hora, setHora] = useState<string | null>(null);
  const [observaciones, setObservaciones] = useState<string>("");

  const [errores, setErrores] = useState<Errores>({});
  const [errorRemoto, setErrorRemoto] = useState<string | null>(null);

  // Carga de profesores dependientes de materia
  const [profesoresCarga, setProfesoresCarga] = useState<{ clave: string; lista: ProfesorPortalResponse[] } | null>(null);

  // Cargas de horarios y sugerencia
  const [recargaFranjas, setRecargaFranjas] = useState(0);
  const [horariosCarga, setHorariosCarga] = useState<{ clave: string; lista: HorarioPortal[]; error: boolean } | null>(null);
  const [sugerencia, setSugerencia] = useState<{ clave: string; valor: SugerenciaPortal | null } | null>(null);

  // Confirmación y comprobante
  const [confirmarOpen, setConfirmarOpen] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [turnoReservadoExitoso, setTurnoReservadoExitoso] = useState<TurnoPortalResponse | null>(null);

  // Datos fijos del alumno logueado (HU-POR-01: Alumno fijo, no editable)
  const nombreAlumno = sesion?.usuario
    ? `${sesion.usuario.nombre || ""} ${sesion.usuario.apellido || ""}`.trim() || "Alumno Registrado"
    : "Alumno Registrado";
  const emailAlumno = sesion?.usuario?.email || "alumno@centro.edu.ar";

  // Rango de fechas permitidas (de hoy a 60 días)
  const hoyIso = new Date().toISOString().slice(0, 10);
  const fechaMax = sumarDias(hoyIso, 60);

  // Carga inicial de datos del portal
  useEffect(() => {
    let cancelado = false;
    Promise.all([obtenerMisTurnos(false), listarMateriasPortal()])
      .then(([misTurnos, mats]) => {
        if (cancelado) return;
        setTurnosFuturosCount(misTurnos.turnosFuturosReservados);
        setLimiteMaximo(misTurnos.limiteTurnosFuturos);
        setMaterias(mats);
      })
      .catch(() => {
        if (!cancelado) {
          showToast("error", "Error al consultar turnos previos y catálogo.");
        }
      })
      .finally(() => {
        if (!cancelado) {
          setCargandoInicial(false);
        }
      });

    return () => {
      cancelado = true;
    };
  }, [showToast]);

  const recargarTurnosYCatalogo = async () => {
    setCargandoInicial(true);
    try {
      const [misTurnos, mats] = await Promise.all([obtenerMisTurnos(false), listarMateriasPortal()]);
      setTurnosFuturosCount(misTurnos.turnosFuturosReservados);
      setLimiteMaximo(misTurnos.limiteTurnosFuturos);
      setMaterias(mats);
    } finally {
      setCargandoInicial(false);
    }
  };

  // Carga de profesores cuando cambia la materia
  const claveProfesores = materiaId || null;
  useEffect(() => {
    if (!claveProfesores) return;
    let cancelado = false;
    listarProfesoresPortal(Number(claveProfesores))
      .then((lista) => {
        if (!cancelado) setProfesoresCarga({ clave: claveProfesores, lista });
      })
      .catch(() => {
        if (!cancelado) setProfesoresCarga({ clave: claveProfesores, lista: [] });
      });
    return () => {
      cancelado = true;
    };
  }, [claveProfesores]);

  const cargandoProfesores = claveProfesores !== null && profesoresCarga?.clave !== claveProfesores;
  const profesores = !cargandoProfesores && profesoresCarga?.clave === claveProfesores ? profesoresCarga.lista : [];

  const matSeleccionada = materias.find((m) => String(m.id) === materiaId) ?? null;
  const profSeleccionado = profesores.find((p) => String(p.id) === profesorId) ?? null;
  const duracionMateria = matSeleccionada?.duracionClaseMinutos ?? null;
  const fechaValida = fecha !== "" && fecha >= hoyIso && fecha <= fechaMax;

  // Claves de consulta para horarios y sugerencia
  const claveFranjas =
    materiaId && profesorId && fechaValida && duracionMateria
      ? `${profesorId}|${fecha}|${duracionMateria}|${recargaFranjas}`
      : null;

  const desdeSugerencia = fechaValida ? fecha : hoyIso;
  const claveSugerencia =
    materiaId && profesorId && duracionMateria
      ? `${profesorId}|${materiaId}|${duracionMateria}|${desdeSugerencia}|${recargaFranjas}`
      : null;

  // Efecto sugerencia próximo horario libre
  useEffect(() => {
    if (!claveSugerencia) return;
    const [p, m, d, f] = claveSugerencia.split("|");
    let cancelado = false;
    sugerirProximoHorarioPortal(Number(p), Number(m), Number(d), f)
      .then((valor) => {
        if (!cancelado) setSugerencia({ clave: claveSugerencia, valor });
      })
      .catch(() => {
        if (!cancelado) setSugerencia({ clave: claveSugerencia, valor: null });
      });
    return () => {
      cancelado = true;
    };
  }, [claveSugerencia]);

  // Efecto listado de horarios de la fecha
  useEffect(() => {
    if (!claveFranjas) return;
    const [p, f, d] = claveFranjas.split("|");
    let cancelado = false;
    listarHorariosPortal(Number(p), f, Number(d))
      .then((lista) => {
        if (!cancelado) setHorariosCarga({ clave: claveFranjas, lista, error: false });
      })
      .catch(() => {
        if (!cancelado) setHorariosCarga({ clave: claveFranjas, lista: [], error: true });
      });
    return () => {
      cancelado = true;
    };
  }, [claveFranjas]);

  const cargandoFranjas = claveFranjas !== null && horariosCarga?.clave !== claveFranjas;
  const horarios = !cargandoFranjas && horariosCarga?.clave === claveFranjas ? horariosCarga.lista : [];

  // Mapeo a FranjaTurnoResponse para el componente FranjasHorarias
  const franjasAdaptadas: FranjaTurnoResponse[] = horarios.map((h) => ({
    horaInicio: h.horaInicio,
    horaFin: h.horaFin,
    capacidad: 5,
    cuposDisponibles: 5,
    disponible: true,
    motivo: null,
  }));

  const primeraFranjaLibre = franjasAdaptadas.find((f) => f.disponible);
  const sugerenciaDesdeBack = sugerencia?.clave === claveSugerencia ? sugerencia.valor : null;

  const sugerenciaActual: SugerenciaPortal | null =
    fechaValida && primeraFranjaLibre
      ? {
          fecha,
          horaInicio: primeraFranjaLibre.horaInicio,
          horaFin: primeraFranjaLibre.horaFin,
          cuposDisponibles: 5,
          capacidad: 5,
        }
      : sugerenciaDesdeBack;

  const horaValida = hora !== null && franjasAdaptadas.some((f) => f.horaInicio === hora && f.disponible);
  const mostrarSugerencia = sugerenciaActual !== null && !horaValida && !cargandoFranjas;

  // Opciones para Combobox
  const opcionesMaterias = materias.map((m) => ({
    value: String(m.id),
    label: `${m.nombre} (${m.nivel}) — ${m.duracionClaseMinutos} min`,
  }));

  const opcionesProfesores = (cargandoProfesores ? [] : profesores).map((p) => ({
    value: String(p.id),
    label: `${p.apellido}, ${p.nombre}`,
  }));

  const hintProfesor = !materiaId
    ? "Elegí primero la materia."
    : cargandoProfesores
      ? "Cargando profesores…"
      : opcionesProfesores.length === 0
        ? "Ningún profesor activo dicta esta materia."
        : "Solo profesores activos que dictan la materia.";

  // Manejadores de cambios con limpieza encadenada
  const cambiarMateria = (val: string) => {
    setMateriaId(val);
    setProfesorId("");
    setFecha("");
    setHora(null);
    setErrores((prev) => ({ ...prev, materia: undefined }));
    setErrorRemoto(null);
  };

  const cambiarProfesor = (val: string) => {
    setProfesorId(val);
    setHora(null);
    setErrores((prev) => ({ ...prev, profesor: undefined }));
    setErrorRemoto(null);
  };

  const cambiarFecha = (val: string) => {
    setFecha(val);
    setHora(null);
    setErrores((prev) => ({ ...prev, fecha: undefined }));
    setErrorRemoto(null);
  };

  const cambiarHora = (h: string) => {
    setHora(h);
    setErrores((prev) => ({ ...prev, horario: undefined }));
    setErrorRemoto(null);
  };

  const usarSugerencia = (sug: SugerenciaPortal) => {
    setFecha(sug.fecha);
    setHora(sug.horaInicio);
    setErrores((prev) => ({ ...prev, fecha: undefined, horario: undefined }));
    setErrorRemoto(null);
  };

  // ¿Límite de turnos futuros alcanzado?
  const limiteAlcanzado = turnosFuturosCount >= limiteMaximo;

  // Datos para el Resumen lateral y diálogo (HU-POR-01: Sin 'Valor de la clase')
  const datosResumen: DatoReserva[] = (() => {
    const franja = franjasAdaptadas.find((f) => f.horaInicio === hora);
    const horarioTexto = franja
      ? `${franja.horaInicio} – ${franja.horaFin} hs`
      : hora
        ? `${hora} hs`
        : null;

    return [
      {
        label: "Alumno",
        icon: "person",
        valor: (
          <>
            {nombreAlumno}
            <span className="block text-xs font-medium text-on-surface-variant">
              {emailAlumno}
            </span>
          </>
        ),
      },
      {
        label: "Materia",
        icon: "menu_book",
        valor: matSeleccionada?.nombre ?? null,
      },
      {
        label: "Profesor",
        icon: "school",
        valor: profSeleccionado ? `${profSeleccionado.apellido}, ${profSeleccionado.nombre}` : null,
      },
      {
        label: "Fecha",
        icon: "event",
        valor: fechaValida ? formatearFecha(fecha) : null,
      },
      {
        label: "Horario",
        icon: "schedule",
        valor: horarioTexto,
      },
      {
        label: "Duración",
        icon: "timer",
        valor: duracionMateria ? `${duracionMateria} min` : null,
      },
    ];
  })();

  // Validación y confirmación
  const abrirConfirmacion = () => {
    if (limiteAlcanzado) {
      showToast("error", "No podés reservar: límite de turnos futuros alcanzado.");
      return;
    }

    const nuevosErrores: Errores = {};
    if (!materiaId) nuevosErrores.materia = "Elegí una materia.";
    if (!profesorId) nuevosErrores.profesor = "Elegí un profesor.";
    if (!fechaValida) nuevosErrores.fecha = "Elegí una fecha válida (de hoy a 60 días).";
    if (!horaValida) nuevosErrores.horario = "Elegí una franja horaria disponible.";

    if (Object.keys(nuevosErrores).length > 0) {
      setErrores(nuevosErrores);
      setErrorRemoto("Revisá los campos obligatorios antes de continuar.");
      return;
    }

    setErrorRemoto(null);
    setConfirmarOpen(true);
  };

  const confirmar = async () => {
    if (!materiaId || !profesorId || !fecha || !hora) return;
    setConfirmando(true);
    setErrorRemoto(null);
    try {
      const nuevo = await reservarTurnoPortal({
        materiaId: Number(materiaId),
        profesorId: Number(profesorId),
        fecha,
        horaInicio: hora,
        observaciones: observaciones.trim() || null,
      });
      setTurnoReservadoExitoso(nuevo);
      setConfirmarOpen(false);
      setTurnosFuturosCount((prev) => prev + 1);
      showToast("success", `¡Turno ${nuevo.codigo} reservado con éxito!`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al procesar la reserva.";
      setErrorRemoto(msg);
      showToast("error", msg);
    } finally {
      setConfirmando(false);
    }
  };

  const handleNuevaReserva = () => {
    setTurnoReservadoExitoso(null);
    setMateriaId("");
    setProfesorId("");
    setFecha("");
    setHora(null);
    setObservaciones("");
    setHorariosCarga(null);
    setSugerencia(null);
    setErrores({});
    setErrorRemoto(null);
    recargarTurnosYCatalogo();
  };

  if (cargandoInicial) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant">
        <Icon name="progress_activity" size={28} className="animate-spin text-secondary mb-2" />
        <p className="text-sm font-medium">Cargando formulario y verificando turnos...</p>
      </div>
    );
  }

  // ─── PANTALLA DE COMPROBANTE TRAS RESERVA EXITOSA ──────────────────────────
  if (turnoReservadoExitoso) {
    return (
      <section
        aria-labelledby="comprobante-titulo"
        className="mx-auto flex max-w-4xl flex-col overflow-hidden rounded-md border border-outline-variant bg-surface-container-lowest shadow-card print:border-0 print:shadow-none"
      >
        {/* Encabezado solo impreso: logo + institución */}
        <div className="hidden items-center gap-3 px-6 pt-6 print:flex">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-centro-academico.png"
            alt="Logo de Centro Académico"
            width={48}
            height={48}
            className="h-12 w-12 shrink-0 rounded-sm object-cover"
          />
          <div>
            <p className="text-base font-bold text-primary">Centro Académico</p>
            <p className="text-sm font-semibold text-on-surface-variant">
              Comprobante de reserva de clase de apoyo (Portal del Alumno)
            </p>
          </div>
        </div>

        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-outline-variant px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-status-success/15 print:hidden">
              <Icon name="check_circle" size={28} filled className="text-status-success-strong" />
            </span>
            <div>
              <h2 id="comprobante-titulo" className="font-display text-xl font-bold text-on-surface">
                Turno reservado con éxito
              </h2>
              <p className="text-sm font-medium text-on-surface-variant">
                Comprobante emitido desde tu portal de alumno
              </p>
            </div>
          </div>
          <div className="flex flex-col items-start gap-1.5 sm:items-end">
            <span className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
              Código de turno
            </span>
            <div className="flex items-center gap-2">
              <span className="font-display text-2xl font-bold tracking-wide text-primary">
                {turnoReservadoExitoso.codigo}
              </span>
              <TurnoCalendarioBadge estado="Reservado" />
            </div>
          </div>
        </header>

        <div className="px-6 py-5">
          <ResumenReserva
            variante="grid"
            datos={[
              {
                label: "Alumno",
                icon: "person",
                valor: (
                  <>
                    {nombreAlumno}
                    <span className="block text-xs font-medium text-on-surface-variant">
                      {emailAlumno}
                    </span>
                  </>
                ),
              },
              {
                label: "Materia",
                icon: "menu_book",
                valor: (
                  <>
                    {turnoReservadoExitoso.materia.nombre}
                    {matSeleccionada?.nivel && (
                      <span className="block text-xs font-medium text-on-surface-variant">
                        {matSeleccionada.nivel}
                      </span>
                    )}
                  </>
                ),
              },
              {
                label: "Profesor",
                icon: "school",
                valor: `${turnoReservadoExitoso.profesor.apellido}, ${turnoReservadoExitoso.profesor.nombre}`,
              },
              {
                label: "Fecha",
                icon: "event",
                valor: formatearFecha(turnoReservadoExitoso.fecha),
              },
              {
                label: "Horario",
                icon: "schedule",
                valor: `${turnoReservadoExitoso.horaInicio} – ${turnoReservadoExitoso.horaFin} hs`,
              },
              {
                label: "Duración",
                icon: "timer",
                valor: duracionMateria ? `${duracionMateria} min` : null,
              },
              {
                label: "Observaciones",
                icon: "notes",
                valor: turnoReservadoExitoso.observaciones || "Sin observaciones",
                ancho: true,
              },
              {
                label: "Origen",
                icon: "badge",
                valor: "Portal del Alumno",
                ancho: true,
              },
            ]}
          />
        </div>

        <footer className="flex flex-col-reverse gap-3 border-t border-outline-variant bg-surface-container-low px-6 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between print:hidden">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={() => window.print()}
          >
            <Icon name="print" size={16} />
            Imprimir comprobante
          </Button>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/portal/mis-turnos">
              <Button variant="secondary" type="button">
                <Icon name="event_note" size={18} />
                Ver mis turnos
              </Button>
            </Link>
            {!limiteAlcanzado && (
              <Button type="button" onClick={handleNuevaReserva}>
                <Icon name="add" size={18} />
                Nueva reserva
              </Button>
            )}
          </div>
        </footer>
      </section>
    );
  }

  // ─── VISTA PRINCIPAL: FORMULARIO EN 2 COLUMNAS (DISEÑO MESA DE ENTRADA) ────
  return (
    <div className="flex flex-col gap-5">
      {/* Header institucional de la pantalla */}
      <header className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-md bg-primary-container/30">
            <Icon name="event_available" size={24} className="text-primary" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold text-on-surface">Reservar turno</h1>
            <p className="text-sm font-medium text-on-surface-variant">
              Clase de apoyo: elegí materia, profesor y un horario con cupo.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Contador de turnos futuros reservados */}
          <div
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border ${
              limiteAlcanzado
                ? "bg-red-50 text-red-700 border-red-200"
                : "bg-surface-container-high text-on-surface border-outline-variant"
            }`}
          >
            <Icon name="event_available" size={15} />
            {turnosFuturosCount} de {limiteMaximo} turnos futuros reservados
          </div>

          <Link href="/portal/mis-turnos">
            <Button type="button" variant="outline">
              <Icon name="arrow_back" size={16} />
              Volver
            </Button>
          </Link>
        </div>
      </header>

      {/* Alerta si alcanzó el límite de turnos permitidos */}
      {limiteAlcanzado && (
        <div
          role="alert"
          className="flex items-start gap-3.5 rounded-lg border-2 border-red-500 bg-red-50/90 p-4 shadow-xs text-red-800"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-600 text-white shadow-xs">
            <Icon name="error" size={22} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-red-900">
              Mensaje en rojo: límite de turnos alcanzado
            </h3>
            <p className="mt-1 text-xs text-red-700 leading-relaxed font-medium">
              Alcanzaste el cupo máximo de <strong>{limiteMaximo} turnos futuros reservados</strong>{" "}
              permitidos por el Centro Académico. Para poder agendar una nueva clase, debés esperar
              a que se dicte una de tus clases reservadas o consultar con Mesa de Entrada.
            </p>
            <div className="mt-3">
              <Link href="/portal/mis-turnos">
                <Button
                  variant="primary"
                  size="xs"
                  type="button"
                  className="bg-red-700 text-white hover:bg-red-800 gap-1"
                >
                  <Icon name="event_note" size={14} />
                  Ver mis turnos reservados
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Disposición en 2 columnas: Pasos a la izquierda y Resumen a la derecha */}
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            abrirConfirmacion();
          }}
          className="flex flex-col rounded-md border border-outline-variant bg-surface-container-lowest shadow-card"
        >
          {/* Paso 1: Alumno (FIJO Y NO EDITABLE según HU-POR-01) */}
          <Paso numero={1} id="campo-alumno">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-on-surface">
                Alumno <span className="text-error">*</span>
              </label>
              <div className="flex items-center justify-between rounded-md border border-outline-variant bg-surface-container-low px-4 py-3 text-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                    {nombreAlumno.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <span className="font-bold text-on-surface block leading-tight">{nombreAlumno}</span>
                    <span className="text-xs text-on-surface-variant">{emailAlumno}</span>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-on-surface-variant bg-surface-container-highest rounded px-2.5 py-1">
                  <Icon name="lock" size={14} />
                  Ficha personal
                </span>
              </div>
              <p className="text-xs font-medium text-on-surface-variant">
                La reserva se emitirá estrictamente a nombre de tu ficha de alumno.
              </p>
            </div>
          </Paso>

          {/* Paso 2: Materia */}
          <Paso numero={2} id="campo-materia">
            <Combobox
              id="materia"
              label="Materia"
              requiredMark
              value={materiaId}
              options={opcionesMaterias}
              onChange={cambiarMateria}
              disabled={limiteAlcanzado}
              placeholder="Elegí o escribí una materia"
              noResultsText="No hay materias activas con ese nombre"
              maxResults={20}
              error={errores.materia}
              hint={
                matSeleccionada
                  ? `Duración de la clase: ${matSeleccionada.duracionClaseMinutos} min · Nivel ${matSeleccionada.nivel}.`
                  : "Solo materias activas disponibles para apoyo escolar."
              }
            />
          </Paso>

          {/* Paso 3: Profesor */}
          <Paso numero={3} id="campo-profesor">
            <Combobox
              id="profesor"
              label="Profesor"
              requiredMark
              value={profesorId}
              options={opcionesProfesores}
              onChange={cambiarProfesor}
              disabled={!materiaId || cargandoProfesores || limiteAlcanzado}
              placeholder={
                profesorId ? "Profesor seleccionado" : materiaId ? "Elegí un profesor" : "Primero elegí la materia"
              }
              noResultsText="Ningún profesor coincide"
              error={errores.profesor}
              hint={hintProfesor}
            />
          </Paso>

          {/* Paso 4: Fecha */}
          <Paso numero={4} id="campo-fecha">
            <Input
              id="fecha"
              type="date"
              label="Fecha"
              requiredMark
              value={fecha}
              min={hoyIso}
              max={fechaMax}
              disabled={limiteAlcanzado}
              onChange={(e) => cambiarFecha(e.target.value)}
              error={errores.fecha}
              hint={`dd/mm/aaaa · de hoy al ${formatearFecha(fechaMax)}.`}
              className="sm:max-w-xs"
            />
          </Paso>

          {/* Paso 5: Horario y Sugerencia de Próximo Libre */}
          <Paso numero={5} id="campo-horario">
            <SeccionHorario
              listo={Boolean(materiaId && profesorId && fechaValida)}
              cargando={cargandoFranjas}
              error={!cargandoFranjas && Boolean(horariosCarga?.error)}
              onReintentar={() => setRecargaFranjas((n) => n + 1)}
              franjas={franjasAdaptadas}
              duracion={duracionMateria}
              hora={hora}
              onHora={cambiarHora}
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
                        ({sugerenciaActual.cuposDisponibles ?? 5} de {sugerenciaActual.capacidad ?? 5} cupos)
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

          {/* Paso 6: Observaciones opcionales */}
          <Paso numero={6} id="campo-observaciones" ultimo>
            <Textarea
              id="observaciones"
              label="Observaciones (opcional)"
              value={observaciones}
              maxLength={250}
              rows={3}
              disabled={limiteAlcanzado}
              onChange={(e) => setObservaciones(e.target.value.slice(0, 250))}
              placeholder="Ej: repasar ecuaciones trigonométricas para examen trimestral"
              hint={`${observaciones.length}/250 caracteres`}
            />
          </Paso>

          {/* Footer de formulario */}
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
              <Button type="submit" disabled={limiteAlcanzado}>
                <Icon name="event_available" size={18} />
                Reservar turno
              </Button>
            </div>
          </div>
        </form>

        {/* Aside Sticky: Resumen de la reserva en tiempo real */}
        <aside
          aria-labelledby="resumen-titulo"
          className="flex flex-col gap-4 rounded-md border border-outline-variant bg-surface-container-lowest p-5 shadow-card xl:sticky xl:top-24"
        >
          <h2 id="resumen-titulo" className="font-display text-base font-bold text-on-surface">
            Resumen de la reserva
          </h2>
          <ResumenReserva datos={datosResumen} />
        </aside>
      </div>

      {/* Diálogo de confirmación previa a emitir el turno */}
      <ConfirmarDialog
        open={confirmarOpen}
        title="Confirmar reserva"
        description="Revisá los datos del turno antes de confirmarlo."
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

/** Paso numerado del formulario con apariencia MD3. */
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

/** Paso 5: Franjas horarias con radio buttons interactivos, cupos y sugerencias. */
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
        <p className="rounded-sm border border-dashed border-outline-variant px-4 py-4 text-sm font-medium text-on-surface-variant">
          Completá materia, profesor y fecha para ver los horarios libres.
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
          El profesor no tiene horarios libres ese día. Probá otra fecha o usá el horario sugerido.
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
        hint={`${libres} de ${franjas.length} franjas con cupo · clase de ${duracion ?? "—"} min.`}
      />
      {sugerencia}
    </div>
  );
}
