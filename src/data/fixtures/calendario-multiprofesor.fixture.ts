// src/data/fixtures/calendario-multiprofesor.fixture.ts
//
// FIXTURE de diseño para HU-CAL-02, parte A: **multiprofesor + vista Mes**.
//
// Por qué existe: el endpoint real (`GET /api/calendario/agenda`) exige
// `profesorId` y `GET /api/calendario/mes` todavía no existe (pendientes B2/B3
// de `docs/briefs/HU-CAL-02.md`). Para poder DISEÑAR "Todos los profesores" y la
// vista Mes sin backend, estos generadores producen el shape de
// `AgendaDiaResponse` / `CalendarioMesResponse`.
//
// Reglas del fixture:
//  · Determinista: los mismos ids/nombres/capacidades que `turnos.fixture.ts`
//    (mismo seed que la DB) y los mismos turnos SIEMPRE para la misma fecha
//    (hash de la fecha, nada de `Math.random` → el polling no remezcla la grilla).
//  · Se borra entero el día que el back cierre B2/B3/B5; `src/data/calendario.ts`
//    queda con el `// BACKEND:` listo para swapear la llamada.
//
// NO usar para lógica de negocio: los "cupos" son de diseño. El cálculo real de
// cupo libre es pendiente B7 (server, sobre `profesor_materia.capacidad_maxima`).

import type {
  AgendaDiaResponse,
  BloqueHorarioResponse,
  CalendarioMesResponse,
  HuecoResponse,
  TurnoCalendarioResponse,
} from "@/contracts/calendario";
import { aMin, esDomingo, minAHora, sumarDias } from "@/funciones/fechas-calendario";

/** Espera simulada: sin esto el skeleton no llega a verse y no se puede auditar. */
const DEMORA_MS = 220;

/** Mismo `max_modificaciones_turno = 2` que la DB. BACKEND: sale de `parametro`. */
const MAX_MODIFICACIONES = 2;

type Materia = { id: number; nombre: string; duracionClaseMinutos: number };

const MATERIAS: Record<number, Materia> = {
  4: { id: 4, nombre: "Matemática", duracionClaseMinutos: 60 },
  9: { id: 9, nombre: "Física", duracionClaseMinutos: 60 },
  12: { id: 12, nombre: "Inglés", duracionClaseMinutos: 45 },
  15: { id: 15, nombre: "Química", duracionClaseMinutos: 90 },
};

type ProfesorFixture = {
  id: number;
  nombre: string;
  apellido: string;
  /** Bloques de `agenda_profesional`: lunes a sábado, misma franja todos los días. */
  bloques: [string, string][];
  /** Materias que dicta (mismas que `profesor_materia` en el seed). */
  materiaIds: number[];
  /**
   * `false` = el docente TIENE agenda cargada pero CERO turnos en todo el
   * período. Es el caso de un profesor recién dado de alta: sus franjas
   * existen, así que la pantalla debe ofrecerle todas como "Disponible".
   *
   * Sin esta bandera no se podía diseñar ese estado: el resto de los docentes
   * generan turnos por hash y nunca llegaban a 0. Ojo con la diferencia: si el
   * docente NO está en esta lista, el filtro lo deja sin nada (no hay franjas
   * que ofrecer) y eso es un caso distinto, de dato faltante.
   */
  generaTurnos?: boolean;
};

export const PROFESORES_CALENDARIO_FIXTURE: ProfesorFixture[] = [
  { id: 3, nombre: "Ana", apellido: "Ruiz", bloques: [["09:00", "13:00"], ["15:00", "19:00"]], materiaIds: [4, 9] },
  { id: 7, nombre: "Pablo", apellido: "Díaz", bloques: [["09:00", "13:00"]], materiaIds: [9, 12] },
  { id: 11, nombre: "Lucía", apellido: "Ferreyra", bloques: [["10:00", "14:00"], ["16:00", "20:00"]], materiaIds: [12, 4] },
  { id: 15, nombre: "Marcos", apellido: "Guzmán", bloques: [["08:00", "12:00"], ["14:00", "18:00"]], materiaIds: [15] },
  // Alta reciente real: `profesor.id = 13` / usuario "Paulino Obando" (activo,
  // 4 materias, 0 turnos). Entra como docente SIN agenda cargada, que es el caso
  // que hay que poder diseñar: la pantalla no tiene franjas que ofrecer y dice
  // "no tiene agenda cargada", en vez de un "no hay turnos" que miente.
  {
    id: 13,
    nombre: "Paulino",
    apellido: "Obando",
    bloques: [["08:00", "12:00"], ["14:00", "18:00"]],
    materiaIds: [3, 10, 11, 13],
    generaTurnos: false,
  },
];

/**
 * `profesor_materia.capacidad_maxima` del seed, indexada `"profesorId:materiaId"`.
 * Es lo que permite exhibir el filtro "Solo franjas con cupo disponible" (decisión
 * 5 del brief) sin backend.
 */
export const CAPACIDADES_FIXTURE: Record<string, number> = {
  "3:4": 3, "3:9": 2,
  "7:9": 3, "7:12": 2,
  "11:12": 3, "11:4": 2,
  "15:15": 4,
  "13:3": 10, "13:10": 10, "13:11": 10, "13:13": 10,
};

const ALUMNOS = [
  { id: 12, nombre: "Lucía", apellido: "García" },
  { id: 18, nombre: "Mateo", apellido: "Sosa" },
  { id: 25, nombre: "Sofía", apellido: "López" },
  { id: 31, nombre: "Juan", apellido: "Núñez" },
  { id: 42, nombre: "Camila", apellido: "Peralta" },
  { id: 55, nombre: "Tomás", apellido: "Ríos" },
  { id: 61, nombre: "Mora", apellido: "Acosta" },
  { id: 78, nombre: "Joaquín", apellido: "Villalba" },
];

const OBSERVACIONES = [
  "Traer calculadora",
  "Repasar integrals antes de la clase",
  "El alumno llega 10 min tarde",
  null,
  "Trabajo práctico en grupo",
  "Reforzar la parte de álgebra",
  null,
];

/** Hash entero estable. Sin `Math.random` → el polling no remezcla la grilla. */
function hash(texto: string): number {
  let h = 17;
  for (let i = 0; i < texto.length; i++) h = (h * 31 + texto.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Id estable por turno: mismo día + mismo profesor + mismo slot = mismo id. */
function idDeTurno(fecha: string, indiceProfesor: number, j: number): number {
  return Number(fecha.replace(/-/g, "")) * 100 + indiceProfesor * 10 + j;
}

function turnosDelProfesor(fecha: string, p: ProfesorFixture, indiceProfesor: number): TurnoCalendarioResponse[] {
  if (esDomingo(fecha)) return [];
  // Docente de alta reciente: agenda cargada y cero turnos. Sus franjas salen
  // todas como huecos, que es el caso que hay que poder diseñar.
  if (p.generaTurnos === false) return [];
  const h = hash(`${fecha}:${p.id}`);
  const bloque = p.bloques[(h >>> 3) % p.bloques.length];
  const inicioBloque = aMin(bloque[0]);
  // Un día por semana (el hash da 0) trae 6 turnos en la MISMA franja: es el caso
  // que dispara el desborde "ver 4 de 6" del brief.
  const desborde = h % 7 === 0;
  const cantidad = desborde ? 6 : 2 + (h % 3);
  const horaBase = inicioBloque + ((h >>> 1) % 2) * 60;

  const turnos: TurnoCalendarioResponse[] = [];
  for (let j = 0; j < cantidad; j++) {
    const materia = MATERIAS[p.materiaIds[(h + j) % p.materiaIds.length]];
    const duracion = desborde ? 60 : materia.duracionClaseMinutos;
    const horaInicio = desborde ? horaBase : Math.min(horaBase + j * 60, aMin(bloque[1]) - duracion);
    const estado: TurnoCalendarioResponse["estado"] = (h + j * 5) % 13 === 0 ? "Cancelado" : "Reservado";
    const cantidadModificaciones = estado === "Reservado" && (h + j) % 3 === 0 ? 1 : 0;
    const id = idDeTurno(fecha, indiceProfesor, j);
    turnos.push({
      id,
      codigo: `TUR-${String(id).slice(-6).padStart(6, "0")}`,
      alumno: ALUMNOS[(h + j * 3) % ALUMNOS.length],
      profesor: { id: p.id, nombre: p.nombre, apellido: p.apellido },
      materia: { id: materia.id, nombre: materia.nombre },
      horaInicio: minAHora(horaInicio),
      horaFin: minAHora(horaInicio + duracion),
      estado,
      cantidadModificaciones,
      puedeModificar: estado === "Reservado" && cantidadModificaciones < MAX_MODIFICACIONES,
      puedeCancelar: estado === "Reservado",
      cancelacionTardia: estado === "Cancelado" && j % 2 === 0,
      pagado: false,
      observaciones: OBSERVACIONES[(h + j) % OBSERVACIONES.length],
    });
  }
  return turnos;
}

/** Huecos de un bloque = bloque menos los turnos que lo ocupan (mínimo 30 min). */
function huecosDelBloque(
  fecha: string,
  p: ProfesorFixture,
  indiceProfesor: number,
  bloque: [string, string],
  turnos: TurnoCalendarioResponse[],
): HuecoResponse[] {
  const inicio = aMin(bloque[0]);
  const fin = aMin(bloque[1]);
  const ocupados = turnos
    .filter((t) => aMin(t.horaInicio) >= inicio && aMin(t.horaFin) <= fin)
    .map((t) => [aMin(t.horaInicio), aMin(t.horaFin)] as const)
    .sort((a, b) => a[0] - b[0]);

  const huecos: HuecoResponse[] = [];
  let cursor = inicio;
  for (const [ini, finT] of ocupados) {
    if (ini - cursor >= 30) {
      huecos.push({
        agendaProfesionalId: p.id * 100 + indiceProfesor * 10 + huecos.length,
        profesor: { id: p.id, nombre: p.nombre, apellido: p.apellido },
        fecha,
        horaInicio: minAHora(cursor),
        horaFin: minAHora(ini),
        duracionMinutos: ini - cursor,
      });
    }
    cursor = Math.max(cursor, finT);
  }
  if (fin - cursor >= 30) {
    huecos.push({
      agendaProfesionalId: p.id * 100 + indiceProfesor * 10 + huecos.length,
      profesor: { id: p.id, nombre: p.nombre, apellido: p.apellido },
      fecha,
      horaInicio: minAHora(cursor),
      horaFin: minAHora(fin),
      duracionMinutos: fin - cursor,
    });
  }
  return huecos;
}

type ParamsFixture = {
  desde: string;
  hasta: string;
  profesorId?: number;
  materiaId?: number;
  verCancelados: boolean;
};

function diasDeRango(desde: string, hasta: string): string[] {
  const dias: string[] = [];
  for (let fecha = desde; fecha <= hasta; fecha = sumarDias(fecha, 1)) dias.push(fecha);
  return dias;
}

function coincide(turno: TurnoCalendarioResponse, params: ParamsFixture): boolean {
  if (params.profesorId !== undefined && turno.profesor.id !== params.profesorId) return false;
  if (params.materiaId !== undefined && turno.materia.id !== params.materiaId) return false;
  if (!params.verCancelados && turno.estado === "Cancelado") return false;
  return true;
}

/** Un `AgendaDiaResponse` por día del rango, con los turnos ya filtrados. */
export function agendaMultiProfesorFixture(params: ParamsFixture): AgendaDiaResponse[] {
  const visibles = PROFESORES_CALENDARIO_FIXTURE.filter(
    (p) => params.profesorId === undefined || p.id === params.profesorId,
  );
  return diasDeRango(params.desde, params.hasta).map((fecha) => {
    const turnosDelDia: TurnoCalendarioResponse[] = [];
    const bloques: BloqueHorarioResponse[] = [];
    const huecos: HuecoResponse[] = [];
    visibles.forEach((p, indice) => {
      const delProfesor = turnosDelProfesor(fecha, p, indice);
      turnosDelDia.push(...delProfesor);
      if (esDomingo(fecha)) return;
      for (const bloque of p.bloques) {
        bloques.push({ profesorId: p.id, horaInicio: bloque[0], horaFin: bloque[1] });
        huecos.push(...huecosDelBloque(fecha, p, indice, bloque, delProfesor));
      }
    });
    return {
      fecha,
      profesor: visibles.length === 1 ? visibles[0] : null,
      profesores: visibles.map(({ id, nombre, apellido }) => ({ id, nombre, apellido })),
      bloques,
      turnos: turnosDelDia.filter((t) => coincide(t, params)).sort((a, b) => aMin(a.horaInicio) - aMin(b.horaInicio)),
      huecos,
    };
  });
}

/** `CalendarioMesResponse` del mes: un conteo por día, con los mismos filtros. */
export function resumenMesFixture(params: {
  anio: number;
  mes: number;
  profesorId?: number;
  materiaId?: number;
  verCancelados: boolean;
}): CalendarioMesResponse {
  const primero = `${params.anio}-${String(params.mes).padStart(2, "0")}-01`;
  const ultimo = sumarDias(
    params.mes === 12 ? `${params.anio + 1}-01-01` : `${params.anio}-${String(params.mes + 1).padStart(2, "0")}-01`,
    -1,
  );
  const agenda = agendaMultiProfesorFixture({ ...params, desde: primero, hasta: ultimo });
  return {
    anio: params.anio,
    mes: params.mes,
    dias: agenda.map((dia) => ({
      fecha: dia.fecha,
      cantidadTurnos: dia.turnos.length,
    })),
  };
}

function esperar<T>(valor: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(valor), DEMORA_MS));
}

export const agendaMultiProfesor = (params: ParamsFixture) =>
  esperar(agendaMultiProfesorFixture(params));

export const resumenMes = (params: Parameters<typeof resumenMesFixture>[0]) =>
  esperar(resumenMesFixture(params));
