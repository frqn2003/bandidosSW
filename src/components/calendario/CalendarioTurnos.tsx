"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSesion } from "@/funciones/sesion";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { CalendarioMesView } from "./CalendarioMesView";
import { TarjetaTurnoCalendario } from "./TarjetaTurnoCalendario";
import { TurnoDetallePanel } from "./TurnoDetallePanel";
import { ReservaTurnoModal } from "./ReservaTurnoModal";
import {
  limiteAtencion,
  listarCapacidadesPorProfesorMateria,
  verAgendaRango,
  verAgendaRangoDia,
  verResumenMes,
  type AgendaDiaResponse,
  type CalendarioMesResponse,
  type ProfesorCalendario,
  type TurnoCalendarioResponse,
} from "@/data/calendario";
import {
  listarMateriasActivas,
  obtenerMaxModificacionesTurno,
} from "@/data/turnos";
import type { MateriaOpcion } from "@/contracts/materia";
import {
  aDate,
  aMin,
  diaCorto,
  fechaLarga,
  franjaReservable,
  lunesDe,
  mesLargo,
  minAHora,
  sumarDias,
} from "@/funciones/fechas-calendario";
import {
  construirMapaTonos,
  tonoEstadoCancelado,
  tonoMateriaDe,
  type MapaTonos,
} from "@/funciones/paleta-materia";

// Grilla de turnos de /calendario (HU-CAL-02; reemplaza la de HU-CAL-01).
//
// Qué cambió respecto de HU-CAL-01, y por qué:
//  · Vistas Día | Semana | Mes, con Semana predeterminada. El switch va PRIMERO,
//    a la izquierda, antes del filtro de profesor (criterio de aceptación 1).
//  · Se SACÓ el zoom 30/60. El paso de fila es fijo (30 min, el de
//    `agenda_profesional`) y el alto de la fila crece si en esa franja hay más
//    tarjetas de las que entran: 4 visibles + "+N más" (decisión 6 del brief).
//  · El filtro de profesor DEJÓ de ser obligatorio: sin selección se ve "Todos
//    los profesores". Se le agregó Materia, "Ver cancelados" y "Solo cupo"; los
//    cuatro son combinables y valen para las tres vistas.
//  · Con más de un profesor visible, la vista Día parte en una columna por
//    profesor y las tarjetas muestran el apellido del profesor.
//  · El detalle dejó de ser modal: es un panel lateral derecho cerrable.
//
// La grilla NO se vacía al refrescar: el polling de 30 s actualiza en silencio y
// solo el primer load y el reintento manual muestran el estado de carga (regla 6
// de docs/errores-comunes.md). La última actualización se muestra como
// "actualizado hace N s" para que el silencio se lea como dato fresco y no como
// pantalla congelada.

/** Fila de 30 min: la unidad de `agenda_profesional` (CHECK 30 min). */
const PASO_MIN = 30;
/**
 * Alto FIJO de cada franja de 30 min.
 *
 * Antes el alto era dinámico (crecía con la cantidad de tarjetas apiladas) y por
 * eso el bloque de un turno de 90 min no podía "pisar" las franjas de abajo: la
 * posición vertical la daba la fila, no el tiempo. Con la grilla posicionada por
 * tiempo real el alto tiene que ser constante, y los solapamientos se resuelven
 * ANGOSTANDO el bloque en carriles horizontales, no haciendo crecer la fila.
 */
const ALTO_FRANJA = 56;
/** Piso del alto de un bloque: por debajo de esto el texto queda ilegible. */
const MIN_ALTO_BLOQUE = 22;

/**
 * Alto de franja en la tabla de PAPEL. Es más bajo que en pantalla a propósito.
 *
 * La hoja sale A4 apaisada (594.96 pt de alto, verificado en el MediaBox del PDF
 * generado) y `@page` recorta 12 mm arriba y abajo: quedan 186 mm ≈ 703 px
 * imprimibles por página. El `thead` (banner + rótulos) se repite en cada hoja y
 * mide ~87 px, así que cada página aloja 703 - 87 = 616 px de franjas.
 *
 * Con 56 px por franja entran 11 franjas por hoja y el día (24) se va a TRES
 * páginas, con las últimas dos casi vacías. Con 48 px entran 12 justas y el día
 * entra en dos hojas con ~78 px de margen:
 *
 *   24 filas x 48 px = 1152 px  <  2 x 616 px = 1232 px
 *
 * No se fuerza un corte con `break-before: page`: si una tarjeta crece por sus
 * tres líneas de texto, un corte fijo partiría la jornada en tres hojas
 * repartidas en cualquier lado. Con la fila en 48 px la paginación la decide el
 * navegador y degrada sola.
 */
const ALTO_FRANJA_IMPRESION = 48;
/** Demora máxima de refresco (decisión 9 del brief). */
const INTERVALO_REFRESCO_MS = 30_000;

/** Intervalo en minutos, ya sea de un turno o de un hueco "Disponible". */
interface Tramo {
  inicio: number;
  fin: number;
}

type HuecoAgenda = AgendaDiaResponse["huecos"][number];

/** Qué pinta un bloque del canvas. La unión obliga a desdoblar el `tipo`. */
type DatosBloque = { tipo: "turno"; turno: TurnoCalendarioResponse } | { tipo: "hueco"; hueco: HuecoAgenda };

/**
 * Reparte tramos en carriles horizontales ("lane packing", el modelo de Google
 * Calendar / FullCalendar).
 *
 * Dos turnos que se pisan van a carriles distintos y comparten el ancho de la
 * columna; los que no se pisan reutilizan el mismo carril. `carriles` es el
 * total de carriles del grupo, con eso cada bloque calcula su `left`/`width` en
 * porcentaje y la columna queda siempre llena.
 *
 * Se hace por GRUPOS transitivos: si un tramo toca al grupo actual se suma,
 * cuando arranca después del fin del grupo se cierra. Mezclar huecos y turnos
 * en la misma pasada es seguro porque un hueco libre nunca se pisa con un turno
 * ocupado: comparten el carril sin conflicto.
 */
function repartirCarriles<T extends Tramo>(tramos: T[]): Array<T & { carril: number; carriles: number }> {
  const orden = [...tramos].sort((a, b) => a.inicio - b.inicio || b.fin - a.fin);
  const salida: Array<T & { carril: number; carriles: number }> = [];
  let grupo: Array<T & { carril: number }> = [];
  let finGrupo = -1;

  const cerrarGrupo = () => {
    if (grupo.length === 0) return;
    const carriles = grupo.reduce((max, b) => Math.max(max, b.carril), 0) + 1;
    for (const b of grupo) salida.push({ ...b, carriles });
    grupo = [];
    finGrupo = -1;
  };

  for (const tramo of orden) {
    if (grupo.length > 0 && tramo.inicio >= finGrupo) cerrarGrupo();
    const ocupados = new Set(
      grupo.filter((b) => b.fin > tramo.inicio).map((b) => b.carril),
    );
    let carril = 0;
    while (ocupados.has(carril)) carril += 1;
    grupo.push({ ...tramo, carril });
    finGrupo = Math.max(finGrupo, tramo.fin);
  }
  cerrarGrupo();
  return salida;
}

type Vista = "dia" | "semana" | "mes";
type EstadoCarga = "cargando" | "error" | "listo";

interface CalendarioTurnosProps {
  profesores: ProfesorCalendario[];
  /** Ficha fija para el rol Profesor (filtro bloqueado). Null si el rol elige. */
  profesorFijo: ProfesorCalendario | null;
  /** Profesor preseleccionado desde /turnos ("Ver en calendario"). */
  profesorIdInicial?: string;
  /** Materia preseleccionada. */
  materiaIdInicial?: string;
  /** Fecha para anclar el período inicial (la del turno recién reservado). */
  fechaIdeal?: string;
  /** Vista inicial preseleccionada ("dia" | "semana" | "mes"). */
  vistaInicial?: Vista;
}

export function CalendarioTurnos({
  profesores,
  profesorFijo,
  profesorIdInicial = "",
  materiaIdInicial = "",
  fechaIdeal,
  vistaInicial,
}: CalendarioTurnosProps) {
  const { sesion } = useSesion();
  const rol = sesion?.usuario.rol.nombre;
  const esRolProfesor = rol === "Profesor";
  const puedeReservar = rol === "Gerente" || rol === "Mesa de Entrada";

  const [hoy] = useState(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
  });
  const [vista, setVista] = useState<Vista>(() => vistaInicial || "semana");
  /** Ancla del período: en Semana es siempre el lunes; en Día y Mes, la fecha. */
  const [ancla, setAncla] = useState(() => fechaIdeal || hoy);
  const [profesorElegido, setProfesorElegido] = useState(profesorIdInicial);
  const [materiaElegida, setMateriaElegida] = useState(materiaIdInicial);
  const [verCancelados, setVerCancelados] = useState(false);
  const [soloCupo, setSoloCupo] = useState(false);

  const [agenda, setAgenda] = useState<AgendaDiaResponse[]>([]);
  const [resumenMes, setResumenMes] = useState<CalendarioMesResponse | null>(null);
  const [estadoCarga, setEstadoCarga] = useState<EstadoCarga>("cargando");
  const [intento, setIntento] = useState(0);
  const [materias, setMaterias] = useState<MateriaOpcion[]>([]);
  const [capacidades, setCapacidades] = useState<Map<string, number>>(new Map());
  const [limitesCentro, setLimitesCentro] = useState<{ min: number; max: number }>({ min: 8 * 60, max: 20 * 60 });
  const [maxModificaciones, setMaxModificaciones] = useState(2);
  const [detalle, setDetalle] = useState<{ turno: TurnoCalendarioResponse; fecha: string } | null>(null);
  const [reserva, setReserva] = useState<{ fecha: string; hueco: AgendaDiaResponse["huecos"][number] } | null>(null);
  const tarjetaOrigen = useRef<HTMLElement | null>(null);
  /** Instante de la última carga efectiva; solo lo lee el reloj del polling. */
  const ultimaCargaRef = useRef<number | null>(null);
  /** Segundos transcurridos desde esa carga: "Actualizado hace N s". */
  const [segundosDesdeUpdate, setSegundosDesdeUpdate] = useState<number | null>(null);

  /** Marca que hay que volver a pedir: "cargando" + disparo de la consulta. */
  const pedirDatos = useCallback(() => {
    setEstadoCarga("cargando");
    setIntento((i) => i + 1);
  }, []);

  // La ficha del rol Profesor llega async (después del primer render): se deriva
  // en vez de copiarla al estado inicial, que la perdería.
  const filtroBloqueado = esRolProfesor || profesorFijo !== null;
  const profesorId = profesorFijo ? String(profesorFijo.id) : esRolProfesor ? "" : profesorElegido;
  // El rol Profesor sin ficha no puede ver NADA: sin `profesorId` el filtro sería
  // "todos los profesores" y se le filtraría la agenda de los demás.
  const sinFichaDeProfesor = filtroBloqueado && profesorId === "";
  const materiaId = materiaElegida === "" ? undefined : Number(materiaElegida);
  const hayFiltros = profesorId !== "" || materiaId !== undefined || verCancelados || soloCupo;

  // Sincronización de parámetros en la URL al cambiar vista, fecha o filtros (F5 o compartir link).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams();
    if (vista !== "semana") params.set("vista", vista);
    if (ancla && ancla !== hoy) params.set("fecha", ancla);
    if (profesorElegido) params.set("profesorId", profesorElegido);
    if (materiaElegida) params.set("materiaId", materiaElegida);
    const qs = params.toString();
    const url = qs ? `/calendario?${qs}` : "/calendario";
    window.history.replaceState(null, "", url);
  }, [vista, ancla, profesorElegido, materiaElegida, hoy]);

  /**
   * Los huecos "Disponible" SOLO se muestran con un profesor filtrado.
   *
   * No es una decisión estética: con el filtro en "Todos" cada franja libre
   * devuelve un hueco por docente, así que la vista de conjunto se llena de
   * bloques "Disponible" repetidos —muchos, y sin a quién atribuirlos—. Peor
   * todavía: sin profesor no hay a quién reservarle, así que el bloque no
   * lleva a ninguna acción. Para ver y usar franjas libres hay que elegir
   * docente.
   *
   * `profesorId` ya vale `""` en los dos casos que deben ocultarlas: el filtro
   * "Todos" y el rol Profesor sin ficha (que no puede ver nada).
   *
   * También gobierna `huecosReservables`, y ahí el cierre es coherente: si no
   * se muestran franjas, el aviso "hay N franjas para reservar" no se muestra
   * tampoco, y un calendario vacío sin bloques no promete nada que no pueda
   * cumplir. Con 0 turnos en la vista de conjunto el estado vacío es "no hay
   * turnos en este período", que es cierto, y elegir un docente es el paso
   * siguiente obvio.
   */
  const muestraDisponibles = profesorId !== "";

  /**
   * Franjas libres que la pantalla puede efectivamente OFRECER, aplanadas y sin
   * repetir. Se usa para dos cosas: decidir si el "0 turnos" es un callejón sin
   * salida o una agenda libre, y cuántas franjas anunciar.
   *
   * Deduplica por `fecha|profesor|horaInicio|horaFin` porque la misma franja
   * puede volver en dos respuestas de la agenda (y contarla dos veces haría que
   * el aviso prometa más huecos de los que hay).
   */
  const huecosReservables = useMemo(() => {
    if (!muestraDisponibles) return [];
    const pid = Number(profesorId);
    const vistos = new Set<string>();
    const lista: Array<{ fecha: string; horaInicio: string; horaFin: string }> = [];
    const minActual = new Date().getHours() * 60 + new Date().getMinutes();
    for (const dia of agenda) {
      if (dia.fecha < hoy) continue;
      for (const h of dia.huecos) {
        if (profesorId !== "" && h.profesor.id !== pid) continue;
        if (!franjaReservable(h.fecha, h.horaInicio, hoy, minActual)) continue;
        const clave = `${h.fecha}|${h.profesor.id}|${h.horaInicio}|${h.horaFin}`;
        if (vistos.has(clave)) continue;
        vistos.add(clave);
        lista.push({ fecha: h.fecha, horaInicio: h.horaInicio, horaFin: h.horaFin });
      }
    }
    return lista.sort(
      (a, b) => a.fecha.localeCompare(b.fecha) || a.horaInicio.localeCompare(b.horaInicio),
    );
  }, [agenda, muestraDisponibles, profesorId, hoy]);

  // Un tono DISTINTO por materia. El mapa se arma con el catálogo activo UNION
  // las materias que aparecen en la agenda cargada: si una materia no está en el
  // catálogo (dada de baja, pero con turnos viejos) también necesita color, y sin
  // ella dos tarjetas se pintarían con el mismo tono por el módulo de reserva.
  const mapaTonos = useMemo(
    () =>
      construirMapaTonos([
        ...materias.map((m) => m.id),
        ...agenda.flatMap((d) => d.turnos.map((t) => t.materia.id)),
      ]),
    [materias, agenda],
  );

  // ─── Catálogos (no dependen de los filtros) ──────────────────────────────
  useEffect(() => {
    let cancelado = false;
    Promise.all([listarMateriasActivas(), limiteAtencion(), obtenerMaxModificacionesTurno()])
      .then(([materiasActivas, limites, maxMods]) => {
        if (cancelado) return;
        setMaterias(materiasActivas);
        setLimitesCentro(limites);
        setMaxModificaciones(maxMods);
      })      .catch(() => {
        // Los catálogos son secundarios: si fallan, la grilla igual se dibuja con
        // los límites por defecto, sin combo de Materia y con el tope del seed.
        if (!cancelado) setLimitesCentro({ min: 8 * 60, max: 20 * 60 });
      });
    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    if (!soloCupo || capacidades.size > 0) return;
    let cancelado = false;
    listarCapacidadesPorProfesorMateria()
      .then((mapa) => {
        if (!cancelado) setCapacidades(mapa);
      })
      .catch(() => {
        if (!cancelado) setCapacidades(new Map());
      });
    return () => {
      cancelado = true;
    };
  }, [soloCupo, capacidades.size]);

  // ─── Período ─────────────────────────────────────────────────────────────
  const desde = useMemo(() => (vista === "semana" ? lunesDe(ancla) : ancla), [vista, ancla]);
  const hasta = useMemo(
    () => (vista === "semana" ? sumarDias(lunesDe(ancla), 5) : ancla),
    [vista, ancla],
  );
  const { anio, mes } = useMemo(() => {
    const d = aDate(ancla);
    return { anio: d.getFullYear(), mes: d.getMonth() + 1 };
  }, [ancla]);

  // Los parámetros de la consulta van en una variable estable: si se construyeran
  // inline en las dependencias, el polling se reiniciaría en cada render.
  const consulta = useMemo(
    () => ({
      profesorId: profesorId === "" ? undefined : Number(profesorId),
      materiaId,
      verCancelados,
    }),
    [profesorId, materiaId, verCancelados],
  );

  // ─── Carga de datos ─────────────────────────────────────────────────────
  const traer = useCallback(
    (silencioso: boolean) => {
      // Sin ficha de profesor no se pide nada: la pantalla ya muestra el aviso
      // de "no hay ficha" y pedir la agenda de todos sería filtrar datos ajenos.
      if (sinFichaDeProfesor) return;
      if (vista === "mes") {
        verResumenMes({ anio, mes, ...consulta })
          .then((r) => {
            setResumenMes(r);
            setEstadoCarga("listo");
            ultimaCargaRef.current = Date.now();
            setSegundosDesdeUpdate(0);
          })
          .catch(() => {
            if (!silencioso) setEstadoCarga("error");
          });
        return;
      }
      const peticion =
        vista === "semana"
          ? verAgendaRango(desde, hasta, consulta)
          : verAgendaRangoDia(desde, consulta).then((d) => [d]);
      peticion
        .then((dias) => {
          setAgenda(dias);
          setEstadoCarga("listo");
          ultimaCargaRef.current = Date.now();
          setSegundosDesdeUpdate(0);
        })
        .catch(() => {
          if (!silencioso) setEstadoCarga("error");
        });
    },
    [vista, anio, mes, desde, hasta, consulta, sinFichaDeProfesor],
  );

  // Primer load y cambios de filtro/período. El estado de carga NO se setea acá
  // (regla react-hooks/set-state-in-effect): lo pone `pedirDatos()` desde los
  // handlers, y el efecto solo dispara la consulta.
  useEffect(() => {
    if (sinFichaDeProfesor) return;
    traer(false);
  }, [traer, intento, sinFichaDeProfesor]);

  // Polling: refresco silencioso cada 30 s. El id del intervalo es una variable
  // LOCAL del efecto (regla 1: nunca leer `useRef().current` en render).
  useEffect(() => {
    const t = setInterval(() => traer(true), INTERVALO_REFRESCO_MS);
    return () => clearInterval(t);
  }, [traer]);

  // Reloj del indicador "actualizado hace N s". El instante de la última carga
  // vive en un ref (se escribe desde la promesa) y el contador en estado, que es
  // lo único que se lee en render: `Date.now()` en render es impuro.
  useEffect(() => {
    const t = setInterval(() => {
      const ultima = ultimaCargaRef.current;
      setSegundosDesdeUpdate(ultima === null ? null : Math.max(0, Math.floor((Date.now() - ultima) / 1000)));
    }, 10_000);
    return () => clearInterval(t);
  }, []);

  // ─── Columnas ───────────────────────────────────────────────────────────
  const diasVisibles = useMemo(() => {
    if (vista === "mes" || vista === "dia") return [ancla];
    return Array.from({ length: 6 }, (_, i) => sumarDias(lunesDe(ancla), i));
  }, [vista, ancla]);

  /** Profesores visibles: el filtro elegido o, si no hay, los que traen datos. */
  const profesoresVisibles = useMemo(() => {
    if (profesorId !== "") {
      const p = profesorFijo ?? profesores.find((x) => String(x.id) === profesorId);
      return p ? [{ id: p.id, nombre: p.nombre, apellido: p.apellido }] : [];
    }
    const ids = new Set<number>();
    for (const d of agenda) {
      for (const t of d.turnos) ids.add(t.profesor.id);
      for (const b of d.bloques) if (b.profesorId) ids.add(b.profesorId);
      for (const h of d.huecos) ids.add(h.profesor.id);
    }
    return profesores
      .filter((p) => ids.has(p.id))
      .map((p) => ({ id: p.id, nombre: p.nombre, apellido: p.apellido }));
  }, [profesorId, profesorFijo, profesores, agenda]);

  /** Vista Día: agrupa por columna de profesor si hay docentes visibles. */
  const columnasPorProfesor = vista === "dia" && profesoresVisibles.length > 0;
  const encabezadoColumna = columnasPorProfesor ? profesoresVisibles : null;
  /** En vista Día SIEMPRE se muestra el ícono y apellido del profesor en las tarjetas y huecos;
   *  en vista Semana, solo si hay más de un profesor visible. */
  const mostrarProfesorEnTarjeta = vista === "dia" || (!columnasPorProfesor && profesoresVisibles.length > 1);

  // ─── Cupo de la franja (filtro "Solo cupo disponible") ──────────────────
  /**
   * Una franja tiene cupo si alguna de las materias que se dictan en ella todavía
   * tiene lugar: `capacidad - reservados > 0`. Sin dato de capacidad NO se oculta
   * nada (es un filtro, no una restricción del negocio): la franja sigue visible.
   */
  const franjaConCupo = useCallback(
    (turnos: TurnoCalendarioResponse[]): boolean => {
      if (!soloCupo || capacidades.size === 0) return true;
      if (turnos.length === 0) return true;
      const porMateria = new Map<number, { profesorId: number; reservado: number }>();
      for (const t of turnos) {
        const actual = porMateria.get(t.materia.id) ?? { profesorId: t.profesor.id, reservado: 0 };
        actual.reservado += 1;
        porMateria.set(t.materia.id, actual);
      }
      for (const [materiaIdTurno, { profesorId: pid, reservado }] of porMateria) {
        const capacidad = capacidades.get(`${pid}:${materiaIdTurno}`);
        if (capacidad !== undefined && capacidad - reservado > 0) return true;
      }
      return false;
    },
    [soloCupo, capacidades],
  );

  /** Turnos de una franja (empiezan exactamente en `minuto`) de un día/profesor. */
  const turnosDeFranja = useCallback(
    (fecha: string, minuto: number, soloProfesorId?: number): TurnoCalendarioResponse[] => {
      const dia = agenda.find((d) => d.fecha === fecha);
      if (!dia) return [];
      return dia.turnos
        .filter((t) => aMin(t.horaInicio) === minuto && (soloProfesorId === undefined || t.profesor.id === soloProfesorId))
        .sort((a, b) => a.alumno.apellido.localeCompare(b.alumno.apellido) || a.id - b.id);
    },
    [agenda],
  );

  /** Ids de profesor por los que se parte la grilla (columnas o todo el día). */
  const pidsColumna = useMemo(
    () => (columnasPorProfesor ? profesoresVisibles.map((p) => p.id) : [undefined]),
    [columnasPorProfesor, profesoresVisibles],
  );

  // ─── Filas ──────────────────────────────────────────────────────────────
  /**
   * Los límites de la grilla son el horario de atención del CENTRO, ampliados
   * con lo que realmente trae la agenda. Si no, un bloque o un turno fuera del
   * rango caería de la grilla sin aviso — y el usuario pensaría que no existe.
   */
  const limites = useMemo(() => {
    let min = limitesCentro.min;
    let max = limitesCentro.max;
    for (const d of agenda) {
      for (const b of d.bloques) {
        min = Math.min(min, aMin(b.horaInicio));
        max = Math.max(max, aMin(b.horaFin));
      }
      for (const t of d.turnos) {
        min = Math.min(min, aMin(t.horaInicio));
        max = Math.max(max, aMin(t.horaFin));
      }
    }
    return { min, max };
  }, [limitesCentro, agenda]);

  const filas = useMemo(() => {
    const out: number[] = [];
    for (let minuto = limites.min; minuto < limites.max; minuto += PASO_MIN) out.push(minuto);
    return out;
  }, [limites]);

  /** Cuántas franjas esconde el filtro de cupo (para poder avisar). */
  const franjasOcultasPorCupo = useMemo(() => {
    if (!soloCupo || capacidades.size === 0) return 0;
    let ocultas = 0;
    for (const fecha of diasVisibles) {
      for (const minuto of filas) {
        for (const pid of pidsColumna) {
          const todos = turnosDeFranja(fecha, minuto, pid);
          if (todos.length > 0 && !franjaConCupo(todos)) ocultas += 1;
        }
      }
    }
    return ocultas;
  }, [soloCupo, capacidades.size, diasVisibles, filas, pidsColumna, turnosDeFranja, franjaConCupo]);

  // ─── Navegación ─────────────────────────────────────────────────────────
  const irHoy = () => {
    setAncla(vista === "semana" ? lunesDe(hoy) : hoy);
    pedirDatos();
  };
  const mover = (delta: number) => {
    if (vista === "mes") {
      const d = aDate(ancla);
      const destino = new Date(d.getFullYear(), d.getMonth() + delta, 1);
      setAncla(`${destino.getFullYear()}-${String(destino.getMonth() + 1).padStart(2, "0")}-01`);
    } else {
      const paso = vista === "semana" ? 7 : 1;
      setAncla((a) => sumarDias(a, delta * paso));
    }
    pedirDatos();
  };
  const cambiarVista = (v: Vista) => {
    setVista(v);
    // Al volver a Semana el ancla se normaliza a lunes.
    if (v === "semana") setAncla((a) => lunesDe(a));
    // Cada vista tiene su propio payload: se limpia el del otro para que al
    // volver no se vea un instante el período anterior.
    if (v === "mes") setAgenda([]);
    else setResumenMes(null);
    pedirDatos();
  };

  const abrirDetalle = useCallback((turno: TurnoCalendarioResponse, fecha: string, origen: HTMLElement) => {
    tarjetaOrigen.current = origen;
    setDetalle({ turno, fecha });
  }, []);

  const limpiarFiltros = () => {
    setProfesorElegido("");
    setMateriaElegida("");
    setVerCancelados(false);
    setSoloCupo(false);
    pedirDatos();
  };

  // Cada filtro pide datos por su cuenta: el efecto no puede setear "cargando".
  const cambiarProfesor = (v: string) => {
    setProfesorElegido(v);
    pedirDatos();
  };
  const cambiarMateria = (v: string) => {
    setMateriaElegida(v);
    pedirDatos();
  };
  const cambiarVerCancelados = (v: boolean) => {
    setVerCancelados(v);
    pedirDatos();
  };
  const cambiarSoloCupo = (v: boolean) => {
    setSoloCupo(v);
    pedirDatos();
  };

  const reintentar = pedirDatos;

  // ─── Totales y rótulos ──────────────────────────────────────────────────
  const turnosTotales = useMemo(
    () =>
      vista === "mes"
        ? (resumenMes?.dias ?? []).reduce((a, d) => a + d.cantidadTurnos, 0)
        : agenda.reduce((a, d) => a + d.turnos.length, 0),
    [vista, agenda, resumenMes],
  );

  /**
   * Un docente con CERO franjas en todo el período no es "semana sin turnos":
   * es que no tenemos su `agenda_profesional`. La diferencia importa porque los
   * dos casos no se pueden resolver igual: con franjas salen "Disponible"
   * clickeables, sin franjas no hay nada que ofrecer, y la acción que sirve es
   * cargar la agenda, no mirar otra semana.
   *
   * Sin filtro de profesor devuelve 1: en la vista de todos nunca se dispara.
   */
  const franjasDelProfesor = useMemo(() => {
    if (vista === "mes" || profesorId === "") return 1;
    const id = Number(profesorId);
    return agenda.reduce((n, d) => n + d.bloques.filter((b) => b.profesorId === id).length, 0);
  }, [vista, profesorId, agenda]);

  const nombreProfesor =
    profesorId === "" ? "" : (profesores.find((p) => String(p.id) === profesorId)?.apellido ?? "este profesor");


  const tituloPeriodo =
    vista === "mes" ? mesLargo(anio, mes) : vista === "dia" ? fechaLarga(ancla) : `${diaCorto(desde)} – ${diaCorto(hasta)}`;

  const descripcionFiltros = [
    profesorId === ""
      ? "Todos los profesores"
      : (profesores.find((p) => String(p.id) === profesorId)?.apellido ?? "Profesor"),
    materiaId === undefined ? "Todas las materias" : (materias.find((m) => m.id === materiaId)?.nombre ?? "Materia"),
    verCancelados ? "Ver cancelados" : null,
    soloCupo ? "Solo con cupo" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const nombreProfesorReserva = useMemo((): ProfesorCalendario | null => {
    if (!reserva) return null;
    if (profesorFijo) return profesorFijo;
    return {
      id: reserva.hueco.profesor.id,
      usuarioId: 0,
      nombre: reserva.hueco.profesor.nombre,
      apellido: reserva.hueco.profesor.apellido,
      estado: "activo",
    };
  }, [reserva, profesorFijo]);

  const tituloVista = vista === "mes" ? "Mes" : vista === "semana" ? "Semana" : "Día";

  return (
    // `pagina-calendario` (ver globals.css) es lo que pone esta pantalla en
    // A4 apaisado. Sin ella caería en el `@page` global, que es vertical porque
    // el listado de /turnos y el comprobante de reserva sí lo son.
    <div className="flex flex-col gap-4 pagina-calendario">
      {/* Toolbar superior */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary-container/30">
            <Icon name="calendar_view_month" size={24} className="text-primary" />
          </span>
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold text-on-surface">Calendario</h1>
            <p className="truncate text-sm font-medium text-on-surface-variant">
              Turnos por profesor y materia
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="md"
          type="button"
          onClick={() => window.print()}
          className="ml-auto"
          title="Imprimir o guardar el calendario visible"
        >
          <Icon name="download" size={16} />
          PDF
        </Button>
      </div>

      {/* Barra de controles: la vista va PRIMERO, antes del filtro de profesor. */}
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3 print:hidden">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-bold text-on-surface">Vista</span>
          <div
            className="flex items-center rounded-sm border border-outline-variant bg-surface-container-lowest p-0.5"
            role="group"
            aria-label="Vista del calendario"
          >
            {(["dia", "semana", "mes"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => cambiarVista(v)}
                aria-pressed={vista === v}
                className={`h-10 cursor-pointer rounded-xs px-4 text-sm font-bold transition-colors duration-fast ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary ${
                  vista === v
                    ? "bg-secondary text-on-secondary shadow-sm"
                    : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                }`}
              >
                {v === "dia" ? "Día" : v === "semana" ? "Semana" : "Mes"}
              </button>
            ))}
          </div>
        </div>

        <div className="w-full max-w-xs">
          {filtroBloqueado ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-bold text-on-surface">
                Profesor
                <span className="ml-1.5 inline-flex items-center gap-1 text-xs font-semibold text-on-surface-variant">
                  <Icon name="lock" size={14} />
                  Tu calendario
                </span>
              </span>
              <div className="flex h-11 items-center gap-2 rounded-sm border border-outline-variant bg-surface-container-low px-4 text-base text-on-surface">
                <Icon name="school" size={18} className="text-on-surface-variant" />
                {profesorFijo
                  ? `${profesorFijo.apellido}, ${profesorFijo.nombre}`
                  : "Sin ficha de profesor disponible"}
              </div>
            </div>
          ) : (
            <Select
              label="Profesor"
              wrapperClassName="min-w-0"
              value={profesorId}
              onChange={(e) => cambiarProfesor(e.target.value)}
            >
              <option value="">Todos los profesores</option>
              {profesores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.apellido}, {p.nombre}
                </option>
              ))}
            </Select>
          )}
        </div>

        <div className="w-full max-w-xs">
          <Select
            label="Materia"
            wrapperClassName="min-w-0"
            value={materiaElegida}
            onChange={(e) => cambiarMateria(e.target.value)}
          >
            <option value="">Todas las materias</option>
            {materias.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </Select>
        </div>

        {/* Navegación de período. Va en la barra de controles, pegada a Materia y
            con la misma altura que los Select (`items-end` + botones `h-11`). La
            fila del período queda solo con el título, el contador y la frescura. */}
        <div className="flex items-end gap-2" role="group" aria-label="Navegación del calendario">
          <Button variant="outline" size="md" type="button" onClick={irHoy}>
            Hoy
          </Button>
          <Button
            variant="outline"
            size="icon"
            type="button"
            aria-label={`${tituloVista} anterior`}
            onClick={() => mover(-1)}
          >
            <Icon name="chevron_left" size={20} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            type="button"
            aria-label={`${tituloVista} siguiente`}
            onClick={() => mover(1)}
          >
            <Icon name="chevron_right" size={20} />
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <div className="flex items-center gap-2">
            <Switch checked={verCancelados} onChange={cambiarVerCancelados} ariaLabel="Ver turnos cancelados" />
            <span className="text-sm font-semibold text-on-surface">Ver cancelados</span>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={soloCupo} onChange={cambiarSoloCupo} ariaLabel="Solo franjas con cupo disponible" />
            <span className="text-sm font-semibold text-on-surface">Solo con cupo</span>
          </div>
        </div>
      </div>

      {esRolProfesor && (
        <p className="text-sm font-medium text-on-surface print:hidden">
          Tu calendario es de solo lectura. Las reservas las gestiona Mesa de Entrada.
        </p>
      )}

      {/* Período: título, contador y frescura de los datos (la navegación ya
          quedó arriba, en la barra de controles, junto a Materia). */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h2 className="truncate font-display text-lg font-bold text-on-surface">{tituloPeriodo}</h2>
            <span className="inline-flex h-7 shrink-0 items-center rounded-full border border-outline bg-surface-container-lowest px-3 text-xs font-bold text-on-surface">
              {turnosTotales} turnos
            </span>
            {hayFiltros && (
              <button
                type="button"
                onClick={limpiarFiltros}
                className="inline-flex items-center gap-1 rounded-sm px-2 py-1 text-xs font-semibold text-secondary transition-colors duration-fast hover:bg-secondary/10 cursor-pointer"
                title="Restablecer todos los filtros"
              >
                <Icon name="filter_alt_off" size={14} />
                Limpiar filtros
              </button>
            )}
            {segundosDesdeUpdate !== null && (
              <span
                className="inline-flex items-center gap-1 text-xs font-medium text-on-surface-variant"
                title="La grilla se actualiza sola cada 30 segundos"
              >
                <Icon name="autorenew" size={14} />
                Actualizado hace {segundosDesdeUpdate} s
              </span>
            )}
          </div>
          {franjasOcultasPorCupo > 0 && (
            <p role="status" aria-live="polite" className="text-xs font-medium text-on-surface-variant">
              {franjasOcultasPorCupo} franjas ocultas por el filtro de cupo.
            </p>
          )}
        </div>
      </div>

      {/* Los filtros activos NO llevan chips: los Select y los Switch de la barra
          de controles ya muestran su estado, y una fila de etiquetas repetidas
          abajo del período era ruido visual. Para limpiar están los controles. */}

      {/* Grilla + panel lateral: la grilla toma TODO el ancho y, al abrir el
          detalle, el panel entra como segunda columna y la grilla se contrae
          (decisión 3 del brief). El template es condicional a propósito: si la
          columna de 20rem quedara siempre declarada, al cerrar el panel la grilla
          no recuperaría el ancho porque el grid reservaría la columna vacía. */}
      <div
        className={`grid grid-cols-1 gap-4 ${detalle ? "xl:grid-cols-[minmax(0,1fr)_20rem]" : ""}`}
      >
        <div className="min-w-0">
          {/* "0 turnos" con franjas libres NO es un estado vacío: es una agenda
              libre. En vez del cartel de "no hay nada", se muestra la grilla con
              cada "Disponible" clickeable, y este aviso dice cuántos hay. Solo
              queda como estado vacío si además no hay ninguna franja libre. */}
          {vista !== "mes" &&
            turnosTotales === 0 &&
            estadoCarga === "listo" &&
            huecosReservables.length > 0 && (
              <div className="mb-3">
                <AvisoSinTurnosConDisponibles total={huecosReservables.length} />
              </div>
            )}
          {sinFichaDeProfesor ? (
            <EstadoSinFicha />
          ) : estadoCarga === "error" ? (
            <EstadoError onReintentar={reintentar} />
          ) : vista === "mes" ? (
            <div className={estadoCarga === "cargando" ? "opacity-60" : ""}>
              {estadoCarga === "cargando" && (
                <p role="status" aria-live="polite" className="sr-only">
                  Cargando el mes…
                </p>
              )}
              <CalendarioMesView
          anio={anio}
          mes={mes}
          resumen={resumenMes}
          hoy={hoy}
          descripcionFiltros={descripcionFiltros}
          onSelectDia={(fecha) => {
                  setAncla(fecha);
                  setVista("dia");
                }}
              />
            </div>
          ) : franjasDelProfesor === 0 && estadoCarga === "listo" ? (
            <EstadoSinAgenda nombre={nombreProfesor} />
          ) : turnosTotales === 0 && estadoCarga === "listo" && huecosReservables.length === 0 ? (
            // "0 turnos" con franjas libres NO es un estado vacío: es una agenda
            // libre. En ese caso cae a la grilla de abajo, que ya pinta cada
            // "Disponible" clickeable. Solo es callejón sin salida si además no
            // hay ninguna franja libre.
            hayFiltros ? (
              <EstadoVacioFiltros onLimpiar={limpiarFiltros} descripcion={descripcionFiltros} />
            ) : (
              <EstadoVacioSinTurnos />
            )
          ) : (
            <div
              // El tope va en `className`, no en `style`: un `maxHeight` inline le
              // gana a `print:max-h-none` y en papel el contenedor cortaba la
              // tabla a la mitad sin avisar.
              className={`max-h-[calc(100vh-19rem)] overflow-auto rounded-md border border-outline-variant bg-surface-container-lowest print:max-h-none print:overflow-visible ${estadoCarga === "cargando" ? "opacity-60" : ""}`}
            >
              {estadoCarga === "cargando" && (
                <p role="status" aria-live="polite" className="sr-only">
                  Cargando calendario…
                </p>
              )}
              <Grilla
                vista={vista}
                diasVisibles={diasVisibles}
                encabezadoColumna={encabezadoColumna}
                filas={filas}
                agenda={agenda}
                hoy={hoy}
                puedeReservar={puedeReservar}
                mostrarProfesorEnTarjeta={mostrarProfesorEnTarjeta}
                  mapaTonos={mapaTonos}
                  contextoImpresion={{ tituloVista, tituloPeriodo, descripcionFiltros, turnosTotales }}
                  muestraDisponibles={muestraDisponibles}
                soloCupo={soloCupo}
                franjaConCupo={franjaConCupo}
                turnosDeFranja={turnosDeFranja}
                onAbrirDetalle={abrirDetalle}
                onReservar={setReserva}
              />
            </div>
          )}
        </div>

        {detalle && (
          <TurnoDetallePanel
            turno={detalle.turno}
            fecha={detalle.fecha}
            maxModificaciones={maxModificaciones}
            mapaTonos={mapaTonos}
            mostrarAcciones={!esRolProfesor}
            onClose={() => setDetalle(null)}
            origenRef={tarjetaOrigen}
          />
        )}
      </div>

      {/*
        Ya NO hay banner suelto acá. Cada vista lleva el suyo dentro de su
        `thead` (`GrillaImpresion` en Día/Semana, `CalendarioMesView` en Mes),
        que es `table-header-group` al imprimir: se repite en todas las páginas.
        Un banner arriba del todo saldría únicamente en la hoja 1.
      */}

      <ReservaTurnoModal
        open={puedeReservar && reserva !== null}
        fecha={reserva?.fecha ?? ""}
        huecoInicio={reserva?.hueco.horaInicio ?? ""}
        huecoFin={reserva?.hueco.horaFin ?? ""}
        profesor={nombreProfesorReserva}
        onClose={() => setReserva(null)}
      />
    </div>
  );
}

// ─── Piezas ────────────────────────────────────────────────────────────────

/**
 * Aviso de "agenda libre": 0 turnos pero N franjas reservables. Evita el callejón
 * sin salida del estado vacío y orienta a mirar los "Disponible" de la grilla
 * (que están justo debajo y son la acción real).
 */
function AvisoSinTurnosConDisponibles({ total }: { total: number }) {
  return (
    <p
      role="status"
      className="flex items-center gap-2 rounded-md border border-status-success/40 bg-status-success/10 px-4 py-3 text-sm font-medium text-on-surface"
    >
      <Icon name="event_available" size={18} className="shrink-0 text-status-success-strong" />
      <span>
        No hay turnos reservados en este período, pero hay{" "}
        {total === 1 ? "1 franja disponible" : `${total} franjas disponibles`} para reservar.
      </span>
    </p>
  );
}

function EstadoVacioSinTurnos() {
  return (
    <section className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-outline-variant bg-surface-container-lowest px-6 py-16 text-center">
      <Icon name="event_busy" size={40} className="text-on-surface-variant" />
      <h2 className="text-lg font-bold text-on-surface">No hay turnos en este período</h2>
      <p className="max-w-sm text-sm font-medium text-on-surface-variant">
        Probá con otra semana o con otro mes, o activá el filtro Ver cancelados.
      </p>
    </section>
  );
}

/**
 * El docente no trae ni una franja en el período: no hay agenda que mostrar, y
 * por lo tanto no hay "Disponible" que ofrecer. Deliberadamente NO dice "no hay
 * turnos": acá el problema no es la agenda del período sino que al docente le
 * falta la carga horaria, y mandar a mirar otra semana hace perder el tiempo de
 * quien lo está mirando. Es un dato faltante, no un período vacío.
 */
function EstadoSinAgenda({ nombre }: { nombre: string }) {
  return (
    <section className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-outline-variant bg-surface-container-lowest px-6 py-16 text-center">
      <Icon name="person_off" size={40} className="text-on-surface-variant" />
      <h2 className="text-lg font-bold text-on-surface">{nombre} no tiene agenda cargada</h2>
      <p className="max-w-sm text-sm font-medium text-on-surface-variant">
        Sin franjas de atención no hay horarios para reservar. Cargá su agenda horaria y sus
        franjas libres van a aparecer acá.
      </p>
    </section>
  );
}


function EstadoVacioFiltros({
  onLimpiar,
  descripcion,
}: {
  onLimpiar: () => void;
  descripcion: string;
}) {
  return (
    <section
      role="status"
      className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-outline-variant bg-surface-container-lowest px-6 py-16 text-center"
    >
      <Icon name="filter_alt_off" size={40} className="text-on-surface-variant" />
      <h2 className="text-lg font-bold text-on-surface">No hay turnos para los filtros seleccionados</h2>
      <p className="max-w-sm text-sm font-medium text-on-surface-variant">
        {descripcion}. Probá con otros filtros o con otro período.
      </p>
      <Button variant="outline" type="button" onClick={onLimpiar}>
        <Icon name="filter_alt_off" size={16} />
        Limpiar filtros
      </Button>
    </section>
  );
}

function EstadoSinFicha() {
  return (
    <section className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-outline-variant bg-surface-container-lowest px-6 py-16 text-center">
      <Icon name="school" size={40} className="text-on-surface-variant" />
      <h2 className="text-lg font-bold text-on-surface">No hay una ficha de profesor disponible</h2>
      <p className="max-w-sm text-sm font-medium text-on-surface-variant">
        Tu usuario no está asociado a un profesor activo, así que el calendario no puede mostrar
        turnos. Si es un error, consultá con Mesa de Entrada.
      </p>
    </section>
  );
}

function EstadoError({ onReintentar }: { onReintentar: () => void }) {
  return (
    <section
      role="alert"
      className="flex flex-col items-center gap-3 rounded-md border border-error/40 bg-error/5 px-6 py-12 text-center"
    >
      <Icon name="error" size={40} className="text-error" />
      <h2 className="text-lg font-bold text-on-surface">No pudimos cargar el calendario</h2>
      <p className="max-w-sm text-sm font-medium text-on-surface-variant">
        Revisá la conexión y volvé a intentar. Si el problema sigue, avisá al equipo.
      </p>
      <Button type="button" variant="outline" onClick={onReintentar}>
        <Icon name="refresh" size={16} />
        Reintentar
      </Button>
    </section>
  );
}

interface GrillaProps {
  vista: Vista;
  diasVisibles: string[];
  encabezadoColumna: { id: number; nombre: string; apellido: string }[] | null;
  filas: number[];
  agenda: AgendaDiaResponse[];
  hoy: string;
  puedeReservar: boolean;
  mostrarProfesorEnTarjeta: boolean;
  /** Tono por `materiaId`; dos materias distintas nunca comparten color. */
  mapaTonos: MapaTonos;
  /** Período, filtros y total: solo los imprime el banner repetido del papel. */
  contextoImpresion: ContextoImpresion;
  /** Las franjas libres solo se pintan con un PROFESOR filtrado: con "Todos"
   * hay un hueco por docente y la vista de conjunto se llena de bloques que no
   * llevan a ninguna acción. Filtrar por materia NO los activa. */
  muestraDisponibles: boolean;
  soloCupo: boolean;
  franjaConCupo: (turnos: TurnoCalendarioResponse[]) => boolean;
  turnosDeFranja: (fecha: string, minuto: number, soloProfesorId?: number) => TurnoCalendarioResponse[];
  onAbrirDetalle: (turno: TurnoCalendarioResponse, fecha: string, origen: HTMLElement) => void;
  onReservar: (v: { fecha: string; hueco: AgendaDiaResponse["huecos"][number] }) => void;
}

function Grilla({
  diasVisibles,
  encabezadoColumna,
  filas,
  agenda,
  hoy,
  puedeReservar,
  mostrarProfesorEnTarjeta,
  mapaTonos,
  contextoImpresion,
  muestraDisponibles,
  soloCupo,
  franjaConCupo,
  turnosDeFranja,
  onAbrirDetalle,
  onReservar,
}: GrillaProps) {
  const [ahora, setAhora] = useState(() => {
    const n = new Date();
    return {
      fecha: `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`,
      min: n.getHours() * 60 + n.getMinutes(),
    };
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const n = new Date();
      setAhora({
        fecha: `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`,
        min: n.getHours() * 60 + n.getMinutes(),
      });
    }, 60_000);
    return () => clearInterval(timer);
  }, []);

  /** Columnas: una por día, o una por profesor en la vista Día. */
  const columnas: Array<{ clave: string; rotulo: string; esHoy: boolean; fecha: string; soloProfesorId?: number; cantidadTurnos?: number }> = useMemo(() => {
    if (encabezadoColumna) {
      const dia = diasVisibles[0] ?? hoy;
      const diaAgenda = agenda.find((d) => d.fecha === dia);
      return encabezadoColumna.map((p) => {
        const turnosProfesor = diaAgenda?.turnos.filter((t) => t.profesor.id === p.id).length ?? 0;
        return {
          clave: `${dia}|${p.id}`,
          rotulo: `${p.apellido}, ${p.nombre}`,
          esHoy: dia === hoy,
          fecha: dia,
          soloProfesorId: p.id,
          cantidadTurnos: turnosProfesor,
        };
      });
    }
    return diasVisibles.map((fecha) => ({
      clave: fecha,
      rotulo: diaCorto(fecha),
      esHoy: fecha === hoy,
      fecha,
    }));
  }, [encabezadoColumna, diasVisibles, hoy, agenda]);

  /** Origen y fin del rango: todo bloque se posiciona relativo a `origen`. */
  const origen = filas[0] ?? 0;
  const finRango = (filas.length > 0 ? filas[filas.length - 1] : 0) + PASO_MIN;
  const pxPorMin = ALTO_FRANJA / PASO_MIN;
  const lineaAhora = ahora.fecha === hoy && ahora.min >= origen && ahora.min < finRango;

  /**
   * Bloques de cada columna, ya repartidos en carriles y listos para pintar.
   *
   * Acá cambió el modelo: un turno y un hueco son INTERVALOS, no "la fila de
   * 30 min que les toca". Por eso se calcula una vez por columna y después se
   * posiciona por tiempo real. Con el modelo anterior:
   *   - un turno de 90 min solo se dibujaba en la fila de arranque y las otras
   *     dos quedaban en blanco (el profesor parecía libre);
   *   - un hueco de 2 h se dibujaba 4 veces, un botón "Disponible" por fila, y
   *     los cuatro disparaban la MISMA reserva.
   *
   * Turnos y huecos van a la misma pasada de carriles porque un hueco libre
   * nunca se pisa con un turno ocupado: comparten carril sin conflicto.
   */
  const columnasConBloques = useMemo(
    () =>
      columnas.map((columna) => {
        const dia = agenda.find((d) => d.fecha === columna.fecha);
        const pid = columna.soloProfesorId;

        // Tramos sin cobertura horaria: se apagan con un "—" en vez de
        // repetirlo celda por celda. En domingo tapa la columna entera.
        const cubiertos = (dia?.bloques ?? [])
          .filter((b) => pid === undefined || b.profesorId === pid || b.profesorId === undefined)
          .map((b) => [aMin(b.horaInicio), aMin(b.horaFin)] as const)
          .filter(([i, f]) => f > i && f > origen && i < finRango)
          .sort((a, b) => a[0] - b[0]);
        const sinCubrir: Tramo[] = [];
        let cursor = origen;
        for (const [i, f] of cubiertos) {
          if (i > cursor) sinCubrir.push({ inicio: cursor, fin: Math.min(i, finRango) });
          cursor = Math.max(cursor, f);
        }
        if (cursor < finRango) sinCubrir.push({ inicio: cursor, fin: finRango });

        // El cupo se evalúa sobre la franja donde ARRANCA el turno: un turno de
        // 90 min pertenece a la banda de su inicio, no a las tres que atraviesa.
        const visibles = (dia?.turnos ?? []).filter((t) => {
          if (pid !== undefined && t.profesor.id !== pid) return false;
          if (!soloCupo) return true;
          const banda = Math.floor(aMin(t.horaInicio) / PASO_MIN) * PASO_MIN;
          return franjaConCupo(turnosDeFranja(columna.fecha, banda, pid));
        });

        const crudo: Array<Tramo & { dato: DatosBloque }> = [
          ...visibles.map((t) => ({
            inicio: Math.max(aMin(t.horaInicio), origen),
            fin: Math.min(aMin(t.horaFin), finRango),
            dato: { tipo: "turno" as const, turno: t },
          })),
          ...(muestraDisponibles
            ? (dia?.huecos ?? [])
                .filter((h) => {
                  // Solo de ahora en adelante, y el corte va por la hora de
                  // INICIO: una franja en curso no se ofrece, porque el turno
                  // arrancaría en el pasado. Ver `franjaReservable`.
                  if (!franjaReservable(h.fecha, h.horaInicio, hoy, ahora.min)) return false;
                  return pid === undefined || h.profesor.id === pid;
                })
                .map((h) => ({
                  inicio: Math.max(aMin(h.horaInicio), origen),
                  fin: Math.min(aMin(h.horaFin), finRango),
                  dato: { tipo: "hueco" as const, hueco: h },
                }))
            : []),
        ].filter((t) => t.fin > t.inicio);

        return {
          columna,
          sinCubrir,
          bloques: repartirCarriles(crudo).map((b) => ({ ...b.dato, inicio: b.inicio, fin: b.fin, carril: b.carril, carriles: b.carriles })),
        };
      }),
    [columnas, agenda, soloCupo, muestraDisponibles, turnosDeFranja, franjaConCupo, origen, finRango, hoy, ahora],
  );

  /** Minutos con algo pintado: la columna Hora se apaga en las franjas muertas. */
  const minutosConBloque = useMemo(() => {
    const conBloque = new Set<number>();
    for (const col of columnasConBloques) {
      for (const b of col.bloques) {
        for (let m = b.inicio; m < b.fin; m += PASO_MIN) conBloque.add(m);
      }
    }
    return conBloque;
  }, [columnasConBloques]);

  /** De minutos absolutos a píxeles dentro del canvas de la columna. */
  const geometria = (b: { inicio: number; fin: number; carril: number; carriles: number }) => ({
    top: (b.inicio - origen) * pxPorMin + 1,
    height: Math.max((b.fin - b.inicio) * pxPorMin - 2, MIN_ALTO_BLOQUE),
    left: `calc(${(b.carril / b.carriles) * 100}% + 2px)`,
    width: `calc(${(1 / b.carriles) * 100}% - 4px)`,
  });

  return (
    <>
      {/*
        Grilla de PANTALLA: lienzo con `position: relative`, alto fijo y bloques
        posicionados por tiempo real. Oculta al imprimir a propósito: una celda
        con `rowSpan` de 24 filas NO se pagina bien (el navegador no puede
        partir su contenido y los bloques absolutos quedan anclados arriba,
        dejando la página siguiente en blanco). Al papel va la tabla de más
        abajo, que sí corta fila por fila.
      */}
      <table
        className="w-full border-collapse table-fixed print:hidden"
        aria-label="Calendario de turnos por franja horaria"
      >
      <thead>
        <tr className="border-b border-outline-variant">
          <th
            scope="col"
            className="sticky left-0 top-0 z-20 w-28 min-w-28 border-r border-outline-variant bg-surface-container-lowest px-3 py-3 text-left text-xs font-bold uppercase tracking-wide text-on-surface-variant shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]"
          >
            Hora
          </th>
          {columnas.map((c) => (
            <th
              key={c.clave}
              scope="col"
              className={`sticky top-0 z-10 min-w-[130px] border-l border-outline-variant px-2 py-2 text-center text-xs font-bold uppercase tracking-wide ${
                c.esHoy
                  ? "bg-secondary/8 text-secondary"
                  : "bg-surface-container-lowest text-on-surface-variant"
              }`}
            >
              <div className="flex items-center justify-center gap-1.5">
                <span className="truncate leading-snug">{c.rotulo}</span>
                {c.cantidadTurnos !== undefined && (
                  <span
                    className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-surface-container-high px-1.5 text-[10px] font-bold text-on-surface"
                    title={`${c.cantidadTurnos} turno${c.cantidadTurnos === 1 ? "" : "s"}`}
                  >
                    {c.cantidadTurnos}
                  </span>
                )}
              </div>
              {c.esHoy && (
                <span className="mt-0.5 inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-bold uppercase leading-none text-on-secondary">
                  Hoy
                </span>
              )}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {filas.map((minuto, indiceFila) => {
          const esHoraActual = ahora.fecha === hoy && ahora.min >= minuto && ahora.min < minuto + PASO_MIN;
          const filaVacia = !minutosConBloque.has(minuto);
          const ultimaFila = indiceFila === filas.length - 1;
          return (
            // Sin `border-b` en el `<tr>`: la línea horizontal la pinta el canvas
            // de la columna, así que un borde de fila cruzaría los bloques.
          <tr key={minuto} style={{ height: ALTO_FRANJA }}>
              <th
                scope="row"
                // El margen de la hora: gris `surface-container` donde hay agenda,
                // blanco donde la franja está muerta. En la hora actual gana el
                // blanco si está vacía, pero conserva el punto `secondary` que
                // marca "son las..." — el tinte azul ahí sería ruido.
                className={`sticky left-0 z-10 whitespace-nowrap border-r px-3 text-xs font-semibold shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] ${
                  ultimaFila ? "" : "border-b"
                } border-outline-variant ${
                  filaVacia
                    ? "bg-surface-container-lowest text-on-surface-variant"
                    : esHoraActual
                      ? "bg-secondary/10 text-secondary"
                      : "bg-surface-container text-on-surface-variant"
                }`}
                style={{ height: ALTO_FRANJA }}
              >
                <span className="flex items-center gap-1.5">
                  {esHoraActual && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" aria-hidden="true" />}
                  {minAHora(minuto)}
                  <span className="font-normal text-on-surface-variant/60">– {minAHora(minuto + PASO_MIN)}</span>
                </span>
              </th>

              {/*
                Cada columna es UN `<td>` que abarca todas las franjas y hace de
                lienzo `position: relative`. Los bloques se posicionan con `top` y
                `height` en píxeles derivados de `horaInicio`/`horaFin`, así un
                turno de 90 min pisa tres franjas de verdad y un hueco de 2 h se
                pinta una sola vez. Las filas siguientes solo llevan su `<th>` de
                hora: el alto lo fija `ALTO_FRANJA`.
              */}
              {indiceFila === 0 &&
                columnasConBloques.map((col) => (
                  <td
                    key={col.columna.clave}
                    rowSpan={filas.length}
                    className="relative border-l border-outline-variant p-0 align-top"
                    // Líneas de media hora: un gradiente repetido, para no
                    // dibujar un div por franja. Usa la variable del tema en vez
                    // de un color fijo.
                    style={{
                      backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${ALTO_FRANJA - 1}px, var(--color-outline-variant) ${ALTO_FRANJA - 1}px, var(--color-outline-variant) ${ALTO_FRANJA}px)`,
                    }}
                  >
                    {/* Horario sin cobertura: se apaga, con su "—" y su texto para
                        lectores de pantalla. Va antes para quedar debajo. */}
                    {col.sinCubrir.map((z) => (
                      <div
                        key={`sin-cubrir-${z.inicio}`}
                        className="absolute inset-x-0 flex items-center justify-center bg-surface-container/40 text-xs font-semibold text-on-surface-variant/40"
                        style={{ top: (z.inicio - origen) * pxPorMin, height: (z.fin - z.inicio) * pxPorMin }}
                      >
                        {(z.fin - z.inicio) * pxPorMin >= ALTO_FRANJA ? (
                          <>
                            <span aria-hidden="true">—</span>
                            <span className="sr-only">Fuera del horario de atención</span>
                          </>
                        ) : (
                          <span className="sr-only">Fuera del horario de atención</span>
                        )}
                      </div>
                    ))}

                    {col.bloques.map((bloque) => {
                      const g = geometria(bloque);
                      if (bloque.tipo === "turno") {
                        return (
                          <div key={`t-${bloque.turno.id}`} className="absolute overflow-hidden" style={g}>
                            <TarjetaTurnoCalendario
                              turno={bloque.turno}
                              mostrarProfesor={mostrarProfesorEnTarjeta}
                              mapaTonos={mapaTonos}
                              onSelect={(turno, origenBoton) => onAbrirDetalle(turno, col.columna.fecha, origenBoton)}
                            />
                          </div>
                        );
                      }
                      const { hueco } = bloque;
                      const etiqueta = `${hueco.horaInicio} a ${hueco.horaFin} con ${hueco.profesor.apellido}, ${hueco.profesor.nombre}`;
                      // Altura del bloque en px: si es muy bajo, el ícono y la
                      // hora sobran y se superponen con el texto "Disponible".
                      const altoBloque = Math.max((bloque.fin - bloque.inicio) * pxPorMin - 2, MIN_ALTO_BLOQUE);
                      const esMuyAngosto = altoBloque < 40;
                      return puedeReservar ? (
                        <button
                          key={`h-${hueco.agendaProfesionalId}-${hueco.horaInicio}`}
                          type="button"
                          onClick={() => onReservar({ fecha: col.columna.fecha, hueco })}
                          aria-label={`Reservar ${etiqueta}`}
                          style={g}
                          className="absolute flex cursor-pointer flex-col items-start justify-center gap-0.5 overflow-hidden rounded-sm border border-status-success/60 bg-status-success/12 px-2 py-1 text-left transition-colors duration-fast ease-out hover:border-status-success/80 hover:bg-status-success/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-success/40"
                        >
                          <span className="flex items-center gap-1 text-xs font-bold text-status-success-strong">
                            {!esMuyAngosto && <Icon name="add_circle" size={14} className="shrink-0" />}
                            Disponible
                          </span>
                          {!esMuyAngosto && (
                            <span className="text-xs font-medium text-status-success-strong/70">
                              {hueco.horaInicio} · {hueco.horaFin}
                            </span>
                          )}
                          {mostrarProfesorEnTarjeta && !esMuyAngosto && (
                            <span className="truncate text-[10px] font-medium text-status-success-strong/80">
                              <Icon name="school" size={11} className="mr-0.5 inline align-[-1px]" />
                              {hueco.profesor.apellido}
                            </span>
                          )}
                        </button>
                      ) : (
                        <div
                          key={`h-${hueco.agendaProfesionalId}-${hueco.horaInicio}`}
                          style={g}
                          className="absolute flex flex-col items-start justify-center gap-0.5 overflow-hidden rounded-sm border border-status-success/60 bg-status-success/12 px-2 py-1"
                        >
                          <span className="flex items-center gap-1 text-xs font-bold text-status-success-strong">
                            {!esMuyAngosto && <Icon name="schedule" size={14} className="shrink-0" />}
                            Disponible
                          </span>
                          {!esMuyAngosto && (
                            <span className="text-xs font-medium text-status-success-strong/70">
                              {hueco.horaInicio} · {hueco.horaFin}
                            </span>
                          )}
                          {mostrarProfesorEnTarjeta && !esMuyAngosto && (
                            <span className="truncate text-[10px] font-medium text-status-success-strong/80">
                              <Icon name="school" size={11} className="mr-0.5 inline align-[-1px]" />
                              {hueco.profesor.apellido}
                            </span>
                          )}
                        </div>
                      );
                    })}

                    {/* "Son las..." atravesando el lienzo de todas las columnas. */}
                    {lineaAhora && (
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-0 z-10 h-0.5 bg-secondary"
                        style={{ top: (ahora.min - origen) * pxPorMin }}
                      />
                    )}
                  </td>
                ))}
            </tr>
          );
        })}
      </tbody>
    </table>

      <GrillaImpresion
        filas={filas}
        columnas={columnas}
        bloquesPorColumna={columnasConBloques}
        contexto={contextoImpresion}
        mostrarProfesorEnTarjeta={mostrarProfesorEnTarjeta}
        mapaTonos={mapaTonos}
      />
    </>
  );
}

/** Datos del papel que solo importan al imprimir. */
interface ContextoImpresion {
  tituloVista: string;
  tituloPeriodo: string;
  descripcionFiltros: string;
  turnosTotales: number;
}

interface ColumnaImpresion {
  clave: string;
  rotulo: string;
  fecha: string;
  soloProfesorId?: number;
  esHoy?: boolean;
}

/** Mismo bloque que se pinta en pantalla: el payload va en línea, no anidado. */
type BloqueImpresion = Tramo & { carril: number; carriles: number } & DatosBloque;

interface GrillaImpresionProps {
  filas: number[];
  columnas: ColumnaImpresion[];
  bloquesPorColumna: Array<{
    columna: ColumnaImpresion;
    sinCubrir: Tramo[];
    bloques: BloqueImpresion[];
  }>;
  contexto: ContextoImpresion;
  mostrarProfesorEnTarjeta: boolean;
  mapaTonos: MapaTonos;
}

/**
 * Tabla que va al PAPEL. Es una segunda grilla a propósito, no un ajuste de la
 * de pantalla:
 *
 * La grilla de pantalla posiciona bloques con `top`/`height` dentro de un
 * `<td rowSpan>`. Eso da un bloque único que pisa varias franjas (justo lo que
 * se pidió), pero una celda con rowspan de 24 filas no se pagina: el navegador
 * no la parte, los bloques absolutos quedan anclados al tope y la segunda hoja
 * sale en blanco. En papel no hay hover ni scroll, así que acá se vuelve al
 * modelo "una celda por franja", que sí corta con `break-inside: avoid`.
 *
 * Para no perder la ocupación, un turno largo se dibuja ENTERO en la fila donde
 * arranca y en las siguientes queda una barra delgada que lo continúa. Es la
 * misma idea que en pantalla, pero en un elemento que el papel puede cortar.
 */
function GrillaImpresion({
  filas,
  columnas,
  bloquesPorColumna,
  contexto,
  mostrarProfesorEnTarjeta,
  mapaTonos,
}: GrillaImpresionProps) {
  return (
    <table className="hidden w-full border-collapse print:table">
      {/*
        El banner va DENTRO del `thead` a propósito. `thead` es
        `table-header-group` en el CSS de impresión, o sea que el navegador lo
        repite arriba de cada página: el logo, el nombre y el período aparecen
        en todas las hojas y no solo en la primera. Ese es el motivo de que la
        grilla de pantalla lo lleve afuera.
      */}
      <thead>
        <tr>
          <th colSpan={columnas.length + 1} className="border-b-2 border-primary px-2 pb-2 text-left">
            {/* Mismo formato que el comprobante de /turnos: logo 48 + nombre. */}
            <div className="flex items-center gap-3">
              <img
                src="/logo-centro-academico.png"
                alt="Logo de Nexo Académico"
                width={48}
                height={48}
                className="h-12 w-12 shrink-0 rounded-sm object-cover"
              />
              <div>
                <p className="text-base font-bold text-primary">Nexo Académico</p>
                <p className="text-sm font-semibold text-on-surface-variant">
                  Calendario de turnos · Vista {contexto.tituloVista} · {contexto.tituloPeriodo}
                </p>
                <p className="text-xs font-medium text-on-surface-variant">
                  Filtros: {contexto.descripcionFiltros} · {contexto.turnosTotales} turnos
                </p>
              </div>
            </div>
          </th>
        </tr>
        <tr className="border-b border-outline-variant">
          <th
            scope="col"
            className="w-24 px-2 py-1.5 text-left text-xs font-bold uppercase tracking-wide text-on-surface-variant"
          >
            Hora
          </th>
          {columnas.map((c) => (
            <th
              key={c.clave}
              scope="col"
              className="border-l border-outline-variant px-2 py-1.5 text-center text-xs font-bold uppercase tracking-wide text-on-surface-variant"
            >
              <span className="block truncate">{c.rotulo}</span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {filas.map((minuto) => (
          <tr key={minuto} style={{ height: ALTO_FRANJA_IMPRESION }}>
            <th
              scope="row"
              className="whitespace-nowrap border-b border-outline-variant px-2 text-left text-xs font-bold text-primary"
            >
              {minAHora(minuto)} – {minAHora(minuto + PASO_MIN)}
            </th>
            {bloquesPorColumna.map((col) => {
              // Lo que arranca en esta franja va con la tarjeta entera.
              const arrancan = col.bloques.filter(
                (b) => b.inicio >= minuto && b.inicio < minuto + PASO_MIN,
              );
              // Lo que venía de arriba: barra delgada, para que el papel también
              // diga que el profesor está ocupado.
              const continuan = col.bloques.filter((b) => b.inicio < minuto && minuto < b.fin);
              const apagado = col.sinCubrir.some((z) => minuto >= z.inicio && minuto < z.fin);
              return (
                <td
                  key={col.columna.clave}
                  // `py-0.5` a propósito: la tarjeta tiene `min-h-11` (44 px) y
                  // con `py-1` la fila mediría 52 px, no 48, y el día volvería a
                  // no entrar en dos hojas.
                  className="border-b border-l border-outline-variant px-1 py-0.5 align-top"
                >
                  {arrancan.map((b) =>
                    b.tipo === "turno" ? (
                      <TarjetaTurnoCalendario
                        key={`t-${b.turno.id}`}
                        turno={b.turno}
                        mostrarProfesor={mostrarProfesorEnTarjeta}
                        mapaTonos={mapaTonos}
                        // En papel no hay interacción: el botón queda inerte. Se
                        // pasa un no-op para no inventar una acción de impresión.
                        onSelect={() => undefined}
                      />
                    ) : (
                      <div
                        key={`h-${b.hueco.agendaProfesionalId}-${b.hueco.horaInicio}`}
                        className="flex min-h-11 flex-col items-start justify-center rounded-sm border border-status-success/60 bg-status-success/12 px-2 py-1"
                      >
                        <span className="text-xs font-bold text-status-success-strong">
                          Disponible {b.hueco.horaInicio} – {b.hueco.horaFin}
                        </span>
                        {mostrarProfesorEnTarjeta && (
                          <span className="text-[10px] font-medium text-status-success-strong/80">
                            {b.hueco.profesor.apellido}
                          </span>
                        )}
                      </div>
                    ),
                  )}
                  {continuan.map((b) => {
                    const cancelado = b.tipo === "turno" && b.turno.estado === "Cancelado";
                    const tono =
                      b.tipo === "turno" ? tonoMateriaDe(b.turno.materia.id, mapaTonos) : null;
                    const color = cancelado
                      ? tonoEstadoCancelado()
                      : { borde: tono?.borde ?? "", fondo: tono?.fondo ?? "" };
                    const texto =
                      b.tipo === "turno"
                        ? `Continúa ${b.turno.materia.nombre} hasta ${b.turno.horaFin}`
                        : `Disponible hasta ${b.hueco.horaFin}`;
                    return (
                      <div
                        key={b.tipo === "turno" ? `c-t-${b.turno.id}` : `c-h-${b.hueco.agendaProfesionalId}-${b.inicio}`}
                        className={`flex min-h-6 items-center gap-1 rounded-sm border border-outline-variant border-l-4 px-2 ${color.borde} ${color.fondo}`}
                      >
                        <span className="truncate text-[11px] font-medium text-on-surface-variant">
                          {texto}
                        </span>
                      </div>
                    );
                  })}
                  {arrancan.length === 0 && continuan.length === 0 && apagado && (
                    <div className="flex min-h-8 items-center justify-center text-xs font-semibold text-on-surface-variant/40">
                      —
                    </div>
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

