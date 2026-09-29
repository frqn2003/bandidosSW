// src/modules/calendario/useCalendar.ts
//
// Hook de estado y lógica de negocio para el Calendario de Turnos (HU-CAL-02).
// Conectado directamente a la API de backend (/api/calendario/agenda, /api/profesores, /api/materias).
// Maneja:
//  · Vistas (Día, Semana predeterminada, Mes).
//  · Navegación temporal (Hoy, Anterior, Siguiente, Salto a fecha específica).
//  · Filtros combinables (Profesor, Materia, Ver cancelados, Solo con cupo).
//  · Actualización en tiempo real (polling silencioso cada 30s + contador de segundos).
//  · Selección de turno y apertura de panel lateral de detalle.
//  · Reprogramación de turnos (Drag & Drop) con flujo de confirmación.
//  · Cancelación y modificación de turnos respetando reglas de negocio.

"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { apiGet, apiSend } from "@/lib/api-client";
import { RUTA_AGENDA, type AgendaDiaResponse, type BloqueHorarioResponse } from "@/contracts/calendario";
import { listarProfesoresActivos } from "@/data/calendario";
import { listarMaterias } from "@/data/materias";
import { sumarDias } from "@/funciones/fechas-calendario";
import type {
  TurnoCalendario,
  ProfesorCalendario,
  MateriaCalendario,
  VistaCalendario,
  FiltrosCalendario,
  DiaResumenMes,
  ColumnaProfesorDia,
  ReprogramarTurnoData,
} from "./types";

const PALETA_COLORES = [
  "#2563eb", // azul
  "#7c3aed", // violeta
  "#059669", // esmeralda
  "#d97706", // ambar
  "#dc2626", // rojo
  "#0891b2", // cian
  "#4f46e5", // indigo
  "#c026d3", // fucsia
];

export interface UseCalendarOptions {
  vistaInicial?: VistaCalendario;
  fechaInicial?: string; // "yyyy-mm-dd"
  profesorIdInicial?: number;
  materiaIdInicial?: number;
}

export function useCalendar(options: UseCalendarOptions = {}) {
  // ─── 1. Estado principal ────────────────────────────────────────────────
  const [vista, setVista] = useState<VistaCalendario>(options.vistaInicial ?? "semana");
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>(
    options.fechaInicial ?? "2026-09-28"
  );

  const [filtros, setFiltros] = useState<FiltrosCalendario>({
    profesorId: options.profesorIdInicial,
    materiaId: options.materiaIdInicial,
    verCancelados: false, // Ocultos por defecto
    soloConCupo: false,
  });

  const [turnos, setTurnos] = useState<TurnoCalendario[]>([]);
  const [bloques, setBloques] = useState<BloqueHorarioResponse[]>([]);
  const [profesores, setProfesores] = useState<ProfesorCalendario[]>([]);
  const [materias, setMaterias] = useState<MateriaCalendario[]>([]);

  const [turnoSeleccionado, setTurnoSeleccionado] = useState<TurnoCalendario | null>(null);
  const [reprogramacionPendiente, setReprogramacionPendiente] = useState<ReprogramarTurnoData | null>(null);

  // ─── 2. Tiempo real (Polling 30s + contador de segundos) ────────────────
  const [segundosActualizado, setSegundosActualizado] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Lunes de la semana que contiene `fechaSeleccionada`
  const fechaLunesSemana = useMemo(() => {
    const d = new Date(`${fechaSeleccionada}T00:00:00`);
    const day = d.getDay(); // 0 es domingo
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split("T")[0];
  }, [fechaSeleccionada]);

  // Carga de catálogo de profesores y materias activas
  useEffect(() => {
    let cancelado = false;

    Promise.all([
      listarProfesoresActivos(),
      listarMaterias({ estado: "activo" }),
    ])
      .then(([profs, mats]) => {
        if (cancelado) return;

        setProfesores(
          profs.map((p) => ({
            id: p.id,
            nombre: p.nombre,
            apellido: p.apellido,
            usuarioId: p.usuarioId,
          }))
        );

        setMaterias(
          mats.map((m, idx) => ({
            id: m.id,
            nombre: m.nombre,
            color: PALETA_COLORES[idx % PALETA_COLORES.length],
            duracionMinutos: m.duracionClaseMinutos,
          }))
        );
      })
      .catch((err) => {
        if (!cancelado) console.error("Error al cargar profesores y materias:", err);
      });

    return () => {
      cancelado = true;
    };
  }, []);

  // Helper que consulta la API de agenda
  const obtenerTurnosApi = useCallback(() => {
    let desde: string;
    let hasta: string;

    if (vista === "dia") {
      desde = fechaSeleccionada;
      hasta = fechaSeleccionada;
    } else if (vista === "mes") {
      const [y, m] = fechaSeleccionada.split("-");
      const totalDias = new Date(parseInt(y, 10), parseInt(m, 10), 0).getDate();
      desde = `${y}-${m}-01`;
      hasta = `${y}-${m}-${String(totalDias).padStart(2, "0")}`;
    } else {
      // Vista semana
      desde = fechaLunesSemana;
      hasta = sumarDias(fechaLunesSemana, 5);
    }

    const params = new URLSearchParams({ desde, hasta });
    if (filtros.profesorId !== undefined) params.set("profesorId", String(filtros.profesorId));
    if (filtros.materiaId !== undefined) params.set("materiaId", String(filtros.materiaId));
    if (filtros.verCancelados) params.set("verCancelados", "true");

    return apiGet<AgendaDiaResponse>(`${RUTA_AGENDA}?${params.toString()}`);
  }, [vista, fechaSeleccionada, fechaLunesSemana, filtros]);

  // Carga inicial y ante cambios en fechas o filtros vía callback asíncrono
  useEffect(() => {
    let cancelado = false;
    obtenerTurnosApi()
      .then((res) => {
        if (cancelado) return;
        setTurnos(
          res.turnos.map((t) => ({
            ...t,
            fecha: t.fecha ?? fechaSeleccionada,
          }))
        );
        setBloques(res.bloques ?? []);
        setSegundosActualizado(0);
      })
      .catch((err) => {
        if (!cancelado) console.error("Error al cargar turnos:", err);
      });

    return () => {
      cancelado = true;
    };
  }, [obtenerTurnosApi, fechaSeleccionada]);

  // Incremento del contador de segundos
  useEffect(() => {
    const timer = setInterval(() => {
      setSegundosActualizado((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const refrescarTurnos = useCallback(() => {
    setIsRefreshing(true);
    obtenerTurnosApi()
      .then((res) => {
        setTurnos(
          res.turnos.map((t) => ({
            ...t,
            fecha: t.fecha ?? fechaSeleccionada,
          }))
        );
        setBloques(res.bloques ?? []);
        setSegundosActualizado(0);
      })
      .catch(console.error)
      .finally(() => {
        setIsRefreshing(false);
      });
  }, [obtenerTurnosApi, fechaSeleccionada]);

  // Polling silencioso cada 30 segundos
  useEffect(() => {
    const pollInterval = setInterval(() => {
      refrescarTurnos();
    }, 30000);

    return () => clearInterval(pollInterval);
  }, [refrescarTurnos]);

  const refrescarManualmente = useCallback(() => {
    refrescarTurnos();
  }, [refrescarTurnos]);

  // ─── 3. Setters de filtros ──────────────────────────────────────────────
  const setProfesorFiltro = useCallback((profesorId?: number) => {
    setFiltros((prev) => ({ ...prev, profesorId }));
  }, []);

  const setMateriaFiltro = useCallback((materiaId?: number) => {
    setFiltros((prev) => ({ ...prev, materiaId }));
  }, []);

  const toggleVerCancelados = useCallback(() => {
    setFiltros((prev) => ({ ...prev, verCancelados: !prev.verCancelados }));
  }, []);

  const toggleSoloConCupo = useCallback(() => {
    setFiltros((prev) => ({ ...prev, soloConCupo: !prev.soloConCupo }));
  }, []);

  // ─── 4. Filtrado de Turnos ──────────────────────────────────────────────
  const turnosFiltrados = useMemo(() => {
    return turnos.filter((t) => {
      if (filtros.profesorId !== undefined && t.profesor.id !== filtros.profesorId) {
        return false;
      }
      if (filtros.materiaId !== undefined && t.materia.id !== filtros.materiaId) {
        return false;
      }
      if (!filtros.verCancelados && t.estado === "Cancelado") {
        return false;
      }
      return true;
    });
  }, [turnos, filtros]);

  // ─── 5. Helpers de Fechas y Rangos ──────────────────────────────────────
  const diasSemana = useMemo(() => {
    const lista: { fecha: string; nombreDia: string; numeroDia: number; esHoy: boolean }[] = [];
    const base = new Date(`${fechaLunesSemana}T00:00:00`);
    const nombres = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];
    const hoyStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Argentina/Buenos_Aires",
    }).format(new Date());

    for (let i = 0; i < 6; i++) {
      const current = new Date(base);
      current.setDate(base.getDate() + i);
      const iso = current.toISOString().split("T")[0];
      lista.push({
        fecha: iso,
        nombreDia: nombres[i],
        numeroDia: current.getDate(),
        esHoy: iso === hoyStr,
      });
    }
    return lista;
  }, [fechaLunesSemana]);

  // ─── 6. Turnos por Día y Columnas por Profesor (para DayView) ───────────
  const columnasDia = useMemo((): ColumnaProfesorDia[] => {
    const turnosDelDia = turnosFiltrados.filter((t) => t.fecha === fechaSeleccionada);

    const profesoresVisibles = filtros.profesorId
      ? profesores.filter((p) => p.id === filtros.profesorId)
      : profesores;

    const [y, m, d] = fechaSeleccionada.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    const jsDay = dt.getDay();
    const diaSemana = jsDay === 0 ? 7 : jsDay;

    return profesoresVisibles.map((prof) => {
      const turnosProf = turnosDelDia.filter((t) => t.profesor.id === prof.id);

      const bloquesProf = bloques.filter(
        (b) =>
          (b.profesorId === undefined || b.profesorId === prof.id) &&
          (b.diaSemana === undefined || b.diaSemana === diaSemana)
      );

      const franjasLibres: { horaInicio: string; horaFin: string }[] = [];
      for (const bloque of bloquesProf) {
        const [ih, im] = bloque.horaInicio.split(":").map(Number);
        const [fh, fm] = bloque.horaFin.split(":").map(Number);
        const iniMin = ih * 60 + im;
        const finMin = fh * 60 + fm;

        for (let tMin = iniMin; tMin + 60 <= finMin; tMin += 60) {
          const hInicio = `${String(Math.floor(tMin / 60)).padStart(2, "0")}:${String(
            tMin % 60
          ).padStart(2, "0")}`;
          const hFin = `${String(Math.floor((tMin + 60) / 60)).padStart(2, "0")}:${String(
            (tMin + 60) % 60
          ).padStart(2, "0")}`;

          const ocupada = turnosProf.some(
            (t) => t.horaInicio === hInicio && t.estado === "Reservado"
          );
          if (!ocupada) {
            franjasLibres.push({ horaInicio: hInicio, horaFin: hFin });
          }
        }
      }

      return {
        profesor: prof,
        turnos: turnosProf,
        turnosCount: turnosProf.length,
        franjasLibres,
      };
    });
  }, [turnosFiltrados, fechaSeleccionada, filtros.profesorId, profesores, bloques]);

  // ─── 7. Resumen Mensual (para MonthView) ─────────────────────────────────
  const diasMes = useMemo((): DiaResumenMes[] => {
    const [yearStr, monthStr] = fechaSeleccionada.split("-");
    const anio = parseInt(yearStr, 10);
    const mesIndex = parseInt(monthStr, 10) - 1; // 0-indexed

    const primerDia = new Date(anio, mesIndex, 1);
    const ultimoDia = new Date(anio, mesIndex + 1, 0);
    const totalDias = ultimoDia.getDate();

    const primerDiaSemana = primerDia.getDay(); // 0 domingo, 1 lunes...
    const offsetInicio = primerDiaSemana === 0 ? 6 : primerDiaSemana - 1;

    const hoyStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Argentina/Buenos_Aires",
    }).format(new Date());

    const lista: DiaResumenMes[] = [];

    const obtenerResumenDia = (iso: string, numeroDia: number, esMesActual: boolean): DiaResumenMes => {
      const turnosEnFecha = turnosFiltrados.filter((t) => t.fecha === iso);
      const uniqueMateriasMap = new Map<number, { materiaId: number; color: string; nombre: string }>();

      turnosEnFecha.forEach((t) => {
        if (!uniqueMateriasMap.has(t.materia.id)) {
          const mat = materias.find((m) => m.id === t.materia.id);
          uniqueMateriasMap.set(t.materia.id, {
            materiaId: t.materia.id,
            color: mat?.color ?? "#2563eb",
            nombre: t.materia.nombre,
          });
        }
      });

      return {
        fecha: iso,
        numeroDia,
        esMesActual,
        esHoy: iso === hoyStr,
        cantidadTurnos: turnosEnFecha.length,
        materiasConTurnos: Array.from(uniqueMateriasMap.values()),
      };
    };

    // Relleno días mes anterior
    const ultimoDiaMesAnterior = new Date(anio, mesIndex, 0).getDate();
    for (let i = offsetInicio - 1; i >= 0; i--) {
      const num = ultimoDiaMesAnterior - i;
      const mAnt = mesIndex === 0 ? 12 : mesIndex;
      const yAnt = mesIndex === 0 ? anio - 1 : anio;
      const iso = `${yAnt}-${String(mAnt).padStart(2, "0")}-${String(num).padStart(2, "0")}`;
      lista.push(obtenerResumenDia(iso, num, false));
    }

    // Días del mes corriente
    for (let dia = 1; dia <= totalDias; dia++) {
      const iso = `${anio}-${String(mesIndex + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
      lista.push(obtenerResumenDia(iso, dia, true));
    }

    // Relleno días mes siguiente
    const resto = lista.length % 7;
    if (resto > 0) {
      const faltan = 7 - resto;
      const mSig = mesIndex === 11 ? 1 : mesIndex + 2;
      const ySig = mesIndex === 11 ? anio + 1 : anio;
      for (let s = 1; s <= faltan; s++) {
        const iso = `${ySig}-${String(mSig).padStart(2, "0")}-${String(s).padStart(2, "0")}`;
        lista.push(obtenerResumenDia(iso, s, false));
      }
    }

    return lista;
  }, [fechaSeleccionada, turnosFiltrados, materias]);

  // ─── 8. Navegación temporal ─────────────────────────────────────────────
  const irAHoy = useCallback(() => {
    const hoyStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Argentina/Buenos_Aires",
    }).format(new Date());
    setFechaSeleccionada(hoyStr);
  }, []);

  const anterior = useCallback(() => {
    const d = new Date(`${fechaSeleccionada}T00:00:00`);
    if (vista === "dia") {
      d.setDate(d.getDate() - 1);
      if (d.getDay() === 0) d.setDate(d.getDate() - 1);
    } else if (vista === "semana") {
      d.setDate(d.getDate() - 7);
    } else if (vista === "mes") {
      d.setMonth(d.getMonth() - 1);
    }
    setFechaSeleccionada(d.toISOString().split("T")[0]);
  }, [fechaSeleccionada, vista]);

  const siguiente = useCallback(() => {
    const d = new Date(`${fechaSeleccionada}T00:00:00`);
    if (vista === "dia") {
      d.setDate(d.getDate() + 1);
      if (d.getDay() === 0) d.setDate(d.getDate() + 1);
    } else if (vista === "semana") {
      d.setDate(d.getDate() + 7);
    } else if (vista === "mes") {
      d.setMonth(d.getMonth() + 1);
    }
    setFechaSeleccionada(d.toISOString().split("T")[0]);
  }, [fechaSeleccionada, vista]);

  const cambiarVista = useCallback((nuevaVista: VistaCalendario) => {
    setVista(nuevaVista);
  }, []);

  const seleccionarFecha = useCallback((fecha: string) => {
    setFechaSeleccionada(fecha);
  }, []);

  // ─── 9. Título formateado de la cabecera ─────────────────────────────────
  const tituloPeriodo = useMemo(() => {
    const [y, m, d] = fechaSeleccionada.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);

    if (vista === "dia") {
      const diasSemanaNombres = [
        "Domingo",
        "Lunes",
        "Martes",
        "Miércoles",
        "Jueves",
        "Viernes",
        "Sábado",
      ];
      const mesesNombres = [
        "enero", "febrero", "marzo", "abril", "mayo", "junio",
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
      ];
      return `${diasSemanaNombres[dateObj.getDay()]} ${d} de ${mesesNombres[m - 1]}`;
    }

    if (vista === "semana") {
      const lunes = new Date(`${fechaLunesSemana}T00:00:00`);
      const sabado = new Date(lunes);
      sabado.setDate(lunes.getDate() + 5);

      const mesesCortos = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
      const mesLunes = mesesCortos[lunes.getMonth()];
      const mesSabado = mesesCortos[sabado.getMonth()];

      if (lunes.getMonth() === sabado.getMonth()) {
        return `${lunes.getDate()} – ${sabado.getDate()} ${mesLunes} ${sabado.getFullYear()}`;
      }
      return `${lunes.getDate()} ${mesLunes} – ${sabado.getDate()} ${mesSabado} ${sabado.getFullYear()}`;
    }

    // Mes
    const mesesCompletos = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    return `${mesesCompletos[m - 1]} ${y}`;
  }, [vista, fechaSeleccionada, fechaLunesSemana]);

  // ─── 10. Acciones sobre Turnos (Selección, Reprogramar, Cancelar) ────────
  const seleccionarTurno = useCallback((turno: TurnoCalendario) => {
    setTurnoSeleccionado(turno);
  }, []);

  const cerrarDetalle = useCallback(() => {
    setTurnoSeleccionado(null);
  }, []);

  const iniciarReprogramacion = useCallback(
    (
      turnoId: number,
      nuevaFecha: string,
      nuevaHoraInicio: string,
      nuevoProfesorId: number
    ) => {
      const turnoActual = turnos.find((t) => t.id === turnoId);
      const nuevoProf = profesores.find((p) => p.id === nuevoProfesorId);
      if (!turnoActual || !nuevoProf) return;

      const [h, min] = nuevaHoraInicio.split(":").map(Number);
      const duracion = turnoActual.materia.duracionClaseMinutos ?? 60;
      const minFin = h * 60 + min + duracion;
      const hFin = String(Math.floor(minFin / 60)).padStart(2, "0");
      const mFin = String(minFin % 60).padStart(2, "0");
      const nuevaHoraFin = `${hFin}:${mFin}`;

      setReprogramacionPendiente({
        turno: turnoActual,
        fechaNueva: nuevaFecha,
        horaInicioNueva: nuevaHoraInicio,
        horaFinNueva: nuevaHoraFin,
        profesorNuevo: {
          id: nuevoProf.id,
          nombre: nuevoProf.nombre,
          apellido: nuevoProf.apellido,
        },
        fechaAnterior: turnoActual.fecha,
        horaInicioAnterior: turnoActual.horaInicio,
        profesorAnterior: {
          id: turnoActual.profesor.id,
          nombre: turnoActual.profesor.nombre,
          apellido: turnoActual.profesor.apellido,
        },
      });
    },
    [turnos, profesores]
  );

  const confirmarReprogramacion = useCallback(async () => {
    if (!reprogramacionPendiente) return;
    const { turno, fechaNueva, horaInicioNueva, horaFinNueva, profesorNuevo } =
      reprogramacionPendiente;

    // Actualización optimista local
    setTurnos((prev) =>
      prev.map((t) => {
        if (t.id !== turno.id) return t;
        return {
          ...t,
          fecha: fechaNueva,
          horaInicio: horaInicioNueva,
          horaFin: horaFinNueva,
          profesor: {
            id: profesorNuevo.id,
            nombre: profesorNuevo.nombre,
            apellido: profesorNuevo.apellido,
          },
          cantidadModificaciones: (t.cantidadModificaciones ?? 0) + 1,
        };
      })
    );

    setTurnoSeleccionado((prev) => {
      if (prev?.id === turno.id) {
        return {
          ...prev,
          fecha: fechaNueva,
          horaInicio: horaInicioNueva,
          horaFin: horaFinNueva,
          profesor: profesorNuevo,
          cantidadModificaciones: (prev.cantidadModificaciones ?? 0) + 1,
        };
      }
      return prev;
    });

    setReprogramacionPendiente(null);

    try {
      await apiSend("PUT", `/api/turnos/${turno.id}`, {
        fecha: fechaNueva,
        horaInicio: horaInicioNueva,
        horaFin: horaFinNueva,
        profesorId: profesorNuevo.id,
      });
      refrescarTurnos();
    } catch (e) {
      console.error("Error al reprogramar turno:", e);
      refrescarTurnos();
    }
  }, [reprogramacionPendiente, refrescarTurnos]);

  const cancelarReprogramacion = useCallback(() => {
    setReprogramacionPendiente(null);
  }, []);

  const cancelarTurno = useCallback(
    async (turnoId: number, motivo?: string) => {
      // Actualización optimista local
      setTurnos((prev) =>
        prev.map((t) => {
          if (t.id !== turnoId) return t;
          return {
            ...t,
            estado: "Cancelado",
            puedeModificar: false,
            puedeCancelar: false,
            observaciones: motivo ?? t.observaciones,
          };
        })
      );

      setTurnoSeleccionado((prev) => {
        if (prev?.id === turnoId) {
          return {
            ...prev,
            estado: "Cancelado",
            puedeModificar: false,
            puedeCancelar: false,
            observaciones: motivo ?? prev.observaciones,
          };
        }
        return prev;
      });

      try {
        await apiSend("POST", `/api/turnos/${turnoId}/cancelar`, {
          motivoCancelacionId: 1,
          detalleMotivo: motivo ?? null,
        });
        refrescarTurnos();
      } catch (e) {
        console.error("Error al cancelar turno:", e);
        refrescarTurnos();
      }
    },
    [refrescarTurnos]
  );

  return {
    // Estado y filtros
    vista,
    fechaSeleccionada,
    filtros,
    tituloPeriodo,
    segundosActualizado,
    isRefreshing,

    // Colecciones y datos
    profesores,
    materias,
    bloques,
    turnos: turnosFiltrados,
    totalTurnosFiltrados: turnosFiltrados.length,

    // Vistas derivadas
    diasSemana,
    columnasDia,
    diasMes,

    // Selección y paneles
    turnoSeleccionado,
    reprogramacionPendiente,

    // Navegación
    cambiarVista,
    seleccionarFecha,
    irAHoy,
    anterior,
    siguiente,
    refrescarManualmente,

    // Modificadores de filtro
    setProfesorFiltro,
    setMateriaFiltro,
    toggleVerCancelados,
    toggleSoloConCupo,

    // Acciones de turno
    seleccionarTurno,
    cerrarDetalle,
    iniciarReprogramacion,
    confirmarReprogramacion,
    cancelarReprogramacion,
    cancelarTurno,
  };
}
