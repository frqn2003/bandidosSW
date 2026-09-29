// src/data/fixtures/turnos.fixture.ts
//
// FIXTURE de HU-TUR-02 (listado + modificación + cancelación de turnos).
//
// Se documentó en docs/briefs/HU-TUR-02.md que NO va mezclado dentro de
// src/data/turnos.ts (ese archivo ya consume la API real de HU-TUR-01 y mezclar
// arrays con fetch confunde). Vive acá, en un archivo propio que se borra entero
// el día que el back termine los endpoints: las funciones de src/data quedan con
// su `// BACKEND:` listo para swapear.
//
// Shape: TurnoResponse (src/contracts/turno.ts:126). Las fechas se generan
// relativas a HOY para que la maqueta siempre tenga turnos de los 4 estados.

import type { FranjaTurnoResponse } from "@/data/turnos";
import type { MotivoCancelacionResponse } from "@/contracts/catalogo";
import type { TurnoCalendarioResponse } from "@/contracts/calendario";
import type { TurnoResponse } from "@/contracts/turno";
import { agendaMultiProfesorFixture } from "@/data/fixtures/calendario-multiprofesor.fixture";

function aISO(fecha: Date): string {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const d = String(fecha.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function sumarDiasFixture(iso: string, dias: number): string {
  const f = new Date(`${iso}T00:00:00`);
  f.setDate(f.getDate() + dias);
  return aISO(f);
}

export const hoyFixture = aISO(new Date());

// ─── Parámetro de negocio (mismo seed que la DB: max_modificaciones_turno = 2) ──
// BACKEND: sale de la tabla `parametro`, no de acá.
export const MAX_MODIFICACIONES_FIXTURE = 2;

function t(
  id: number,
  datos: {
    alumno: TurnoResponse["alumno"];
    profesor: TurnoResponse["profesor"];
    materia: TurnoResponse["materia"];
    fecha: string;
    horaInicio: string;
    horaFin: string;
    valorClaseCongelado: number;
    estado: TurnoResponse["estado"];
    cantidadModificaciones?: number;
    pagado?: boolean;
    puedeModificar?: boolean;
    puedeCancelar?: boolean;
    motivoDeshabilitado?: string | null;
    motivoCancelacion?: TurnoResponse["motivoCancelacion"];
    detalleCancelacion?: TurnoResponse["detalleCancelacion"];
    fechaCancelacion?: TurnoResponse["fechaCancelacion"];
    cancelacionTardia?: TurnoResponse["cancelacionTardia"];
    observaciones?: string | null;
  },
): TurnoResponse {
  const cantidadModificaciones = datos.cantidadModificaciones ?? 0;
  const pagado = datos.pagado ?? false;
  const reservadoDisponible = datos.estado === "Reservado" && !pagado;
  const puedeModificar =
    datos.puedeModificar ?? (reservadoDisponible && cantidadModificaciones < MAX_MODIFICACIONES_FIXTURE);
  const puedeCancelar = datos.puedeCancelar ?? reservadoDisponible;
  const motivoDeshabilitado =
    datos.motivoDeshabilitado ??
    (reservadoDisponible
      ? puedeModificar
        ? null
        : "Este turno ya alcanzó el máximo de modificaciones. Cancelalo y reservá uno nuevo."
      : null);
  return {
    id,
    codigo: `TUR-${String(id).padStart(6, "0")}`,
    alumno: datos.alumno,
    profesor: datos.profesor,
    materia: datos.materia,
    fecha: datos.fecha,
    horaInicio: datos.horaInicio,
    horaFin: datos.horaFin,
    valorClaseCongelado: datos.valorClaseCongelado,
    estado: datos.estado,
    observaciones: datos.observaciones ?? null,
    cantidadModificaciones,
    puedeModificar,
    puedeCancelar,
    motivoDeshabilitado,
    motivoCancelacion: datos.motivoCancelacion ?? null,
    detalleCancelacion: datos.detalleCancelacion ?? null,
    fechaCancelacion: datos.fechaCancelacion ?? null,
    cancelacionTardia: datos.cancelacionTardia ?? false,
    pagado,
    registradoPor: { id: 5, nombre: "Marta", apellido: "Sosa" },
    fechaCreacion: new Date(`${datos.fecha}T09:00:00`).toISOString(),
  };
}

const P0 = { id: 3, nombre: "Ana", apellido: "Ruiz" };
const P1 = { id: 7, nombre: "Pablo", apellido: "Díaz" };
const P2 = { id: 11, nombre: "Lucía", apellido: "Ferreyra" };
const P3 = { id: 15, nombre: "Marcos", apellido: "Guzmán" };

const M0 = { id: 4, nombre: "Matemática", nivel: "Secundario" as const, duracionClaseMinutos: 60 };
const M1 = { id: 9, nombre: "Física", nivel: "Secundario" as const, duracionClaseMinutos: 60 };
const M2 = { id: 12, nombre: "Inglés", nivel: "Primario" as const, duracionClaseMinutos: 45 };
const M3 = { id: 15, nombre: "Química", nivel: "Universitario" as const, duracionClaseMinutos: 90 };

const A0 = { id: 12, legajo: "1042", nombre: "Lucía", apellido: "García", dni: "38123456" };
const A1 = { id: 18, legajo: "1057", nombre: "Mateo", apellido: "Sosa", dni: "40112233" };
const A2 = { id: 25, legajo: "1103", nombre: "Sofía", apellido: "López", dni: "35210987" };
const A3 = { id: 31, legajo: "1120", nombre: "Juan", apellido: "Núñez", dni: "33123456" };
const A4 = { id: 42, legajo: "1141", nombre: "Camila", apellido: "Peralta", dni: "44123456" };
const A5 = { id: 55, legajo: "1158", nombre: "Tomás", apellido: "Ríos", dni: "40987654" };
const A6 = { id: 61, legajo: "1203", nombre: "Mora", apellido: "Acosta", dni: "42219876" };
const A7 = { id: 78, legajo: "1277", nombre: "Joaquín", apellido: "Villalba", dni: "38876543" };

/**
 * Profesores del fixture con las materias que dictan. Lo usa la capa de datos
 * al modificar un turno para validar `profesorId` (PROFESOR_NO_DICTA_MATERIA).
 */
export const PROFESORES_FIXTURE: { id: number; nombre: string; apellido: string; materiaIds: number[] }[] = [
  { id: P0.id, nombre: P0.nombre, apellido: P0.apellido, materiaIds: [4, 9] },
  { id: P1.id, nombre: P1.nombre, apellido: P1.apellido, materiaIds: [9, 12] },
  { id: P2.id, nombre: P2.nombre, apellido: P2.apellido, materiaIds: [12, 4] },
  { id: P3.id, nombre: P3.nombre, apellido: P3.apellido, materiaIds: [15] },
];

/**
 * Copia viva del "servidor". MUTABLE: la capa de datos la modifica al editar/cancelar.
 *
 * Son DOS fuentes con una sola identidad: los 14 casos a mano de arriba (que
 * existen para exhibir estados borde: tope de modificaciones, cobrado, pasado,
 * cancelado tardío) más los turnos que dibuja el calendario.
 *
 * Por qué mezclarlos: el detalle del calendario manda `?turnoId=&accion=` a
 * `/turnos` (deep-link B6 de HU-CAL-02). Con dos listas separadas el deep-link
 * navegaba bien pero `obtenerTurno()` devolvía 404, porque cada pantalla usaba
 * su propio espacio de ids (acá 1..14; el calendario generaba
 * `idDeTurno = YYYYMMDD*100 + profesor*10 + j`, o sea ~2.026.030.900).
 *
 * Y no alcanza con unificar la FÓRMULA de los ids: el turno del calendario sale
 * de un `hash(fecha:profesorId)` y el `j` de su loop, y los 14 casos están
 * escritos a mano con horas elegidas. Dos generadores distintos nunca coinciden
 * en el mismo id. Lo que hace falta es que sea la MISMA lista, que es lo que
 * pasa con la base real: las dos pantallas leen los mismos turnos.
 *
 * El merge también es lo que permite GUARDAR. Si el turno viviera sólo en el
 * fixture del calendario, `modificarTurno`/`cancelarTurno` no lo encontrarían:
 * ese fixture es determinista y se regenera en cada lectura, así que el cambio
 * se perdería al refrescar. En `turnoFixtures` el turno es una fila más y
 * `setTurnoFixtures` la actualiza de verdad.
 *
 * Con `GET /api/turnos/:id` esto desaparece entero: se borran los dos fixtures
 * y cada pantalla pega a su endpoint.
 */
/**
 * Ventana sembrada con turnos del calendario: 3 semanas antes y después de hoy.
 *
 * Es una ventana FIJA a propósito: el calendario genera turnos para cualquier
 * fecha que se le pida, así que sembrarlo todo es imposible y sembrar poco
 * rompe el deep-link. Con ±3 semanas cubre la semana actual (que es donde abre
 * el calendario) y la navegación razonable. LIMITACIÓN CONOCIDA DE LA MAQUETA:
 * si en `/calendario` se navega a una semana a más de 3 semanas de hoy y se
 * hace clic en un turno, el deep-link da 404. Con `GET /api/turnos/:id` deja
 * de importar: el endpoint no tiene ventana.
 */
const DIAS_CALENDARIO_ANTES = 21;
const DIAS_CALENDARIO_HASTA = 21;

/** Sin precio en el fixture del calendario; se usa uno plano. */
const VALOR_TURNO_CALENDARIO = 18000;

const REGISTRADO_POR = { id: 5, nombre: "Marta", apellido: "Sosa" };

/**
 * Los dos contratos difieren y esta función es la frontera:
 * `TurnoCalendarioResponse` (lo que devuelve el fixture del calendario) es MÁS
 * LIVIANO que `TurnoResponse` — al alumno le falta `legajo`, a la materia le
 * faltan `nivel` y `duracionClaseMinutos`, y los flags son opcionales.
 *
 * Los ids de alumno y materia son los MISMOS en los dos fixtures (mismo seed
 * que la DB), así que se completan con los catálogos de arriba en vez de
 * inventar datos.
 */
const ALUMNOS_POR_ID = new Map<number, TurnoResponse["alumno"]>(
  [A0, A1, A2, A3, A4, A5, A6, A7].map((a) => [a.id, a]),
);
const MATERIAS_POR_ID = new Map<number, TurnoResponse["materia"]>(
  [M0, M1, M2, M3].map((m) => [m.id, m]),
);

/**
 * `TurnoCalendarioResponse` → `TurnoResponse`. El shape del calendario no trae
 * `fecha` (va en el día que lo contiene) ni los campos de auditoría y precio,
 * que acá se completan con valores de diseño.
 */
function turnoDeCalendarioAFila(fecha: string, c: TurnoCalendarioResponse): TurnoResponse {
  // Default defensivo: con los seeds de hoy la tabla siempre tiene la fila.
  const cantidadModificaciones = c.cantidadModificaciones ?? 0;
  const pagado = c.pagado ?? false;
  // NO se recalculan: en el backend son columnas de la tabla (regla de la capa
  // de datos). Acá sólo se les pone un default para el tipado opcional.
  const puedeModificar = c.puedeModificar ?? false;
  const puedeCancelar = c.puedeCancelar ?? false;
  const reservadoDisponible = c.estado === "Reservado" && !pagado;

  return {
    id: c.id,
    codigo: c.codigo,
    alumno: ALUMNOS_POR_ID.get(c.alumno.id) ?? { ...c.alumno, legajo: "s/d" },
    profesor: c.profesor,
    materia: MATERIAS_POR_ID.get(c.materia.id) ?? {
      id: c.materia.id,
      nombre: c.materia.nombre,
      nivel: "Secundario",
      duracionClaseMinutos: 60,
    },
    fecha,
    horaInicio: c.horaInicio,
    horaFin: c.horaFin,
    valorClaseCongelado: VALOR_TURNO_CALENDARIO,
    estado: c.estado,
    observaciones: c.observaciones ?? null,
    cantidadModificaciones,
    puedeModificar,
    puedeCancelar,
    // Mismo criterio de `t()`: el motivo explica POR QUÉ la acción está apagada.
    motivoDeshabilitado: pagado
      ? "El turno ya fue cobrado."
      : c.estado === "Cancelado"
        ? "El turno está cancelado."
        : reservadoDisponible && !puedeModificar
          ? "Este turno ya alcanzó el máximo de modificaciones. Cancelalo y reservá uno nuevo."
          : null,
    motivoCancelacion: c.estado === "Cancelado" ? { id: 2, nombre: "Pedido alumno" } : null,
    detalleCancelacion: null,
    fechaCancelacion: c.estado === "Cancelado" ? new Date(`${fecha}T18:00:00`).toISOString() : null,
    cancelacionTardia: c.cancelacionTardia ?? false,
    pagado,
    registradoPor: REGISTRADO_POR,
    fechaCreacion: new Date(`${fecha}T09:00:00`).toISOString(),
  };
}

/** Turnos del calendario para la ventana sembrada, aplanados a filas. */
function turnosDelCalendario(): TurnoResponse[] {
  return agendaMultiProfesorFixture({
    desde: sumarDiasFixture(hoyFixture, -DIAS_CALENDARIO_ANTES),
    hasta: sumarDiasFixture(hoyFixture, DIAS_CALENDARIO_HASTA),
    verCancelados: true,
  }).flatMap((dia) => dia.turnos.map((c) => turnoDeCalendarioAFila(dia.fecha, c)));
}

const TURNOS_ESTADO_BORDE: TurnoResponse[] = [
  // Futuro hoy → Reservado, modificable.
  t(1, { alumno: A0, profesor: P0, materia: M0, fecha: hoyFixture, horaInicio: "15:00", horaFin: "16:00", valorClaseCongelado: 18000, estado: "Reservado", observaciones: "Traer calculadora" }),
  t(2, { alumno: A1, profesor: P1, materia: M1, fecha: sumarDiasFixture(hoyFixture, 1), horaInicio: "17:00", horaFin: "18:00", valorClaseCongelado: 20000, estado: "Reservado", cantidadModificaciones: 1 }),
  // Llega al tope de 2 modificaciones → no modificar, sí cancelar.
  t(3, { alumno: A2, profesor: P2, materia: M2, fecha: sumarDiasFixture(hoyFixture, 2), horaInicio: "10:00", horaFin: "10:45", valorClaseCongelado: 15000, estado: "Reservado", cantidadModificaciones: 2 }),
  t(4, { alumno: A3, profesor: P3, materia: M3, fecha: sumarDiasFixture(hoyFixture, 3), horaInicio: "12:00", horaFin: "13:30", valorClaseCongelado: 28000, estado: "Reservado" }),
  // Cobrado → no se modifica ni cancela (TURNO_YA_PAGADO).
  t(5, { alumno: A4, profesor: P0, materia: M0, fecha: sumarDiasFixture(hoyFixture, 4), horaInicio: "09:00", horaFin: "10:00", valorClaseCongelado: 18000, estado: "Reservado", pagado: true, motivoDeshabilitado: "El turno ya fue cobrado." }),
  t(6, { alumno: A5, profesor: P1, materia: M1, fecha: sumarDiasFixture(hoyFixture, 5), horaInicio: "16:00", horaFin: "17:00", valorClaseCongelado: 20000, estado: "Reservado", cantidadModificaciones: 1 }),
  t(7, { alumno: A6, profesor: P2, materia: M2, fecha: sumarDiasFixture(hoyFixture, 6), horaInicio: "11:00", horaFin: "11:45", valorClaseCongelado: 15000, estado: "Reservado" }),
  t(8, { alumno: A7, profesor: P3, materia: M3, fecha: sumarDiasFixture(hoyFixture, 8), horaInicio: "14:00", horaFin: "15:30", valorClaseCongelado: 28000, estado: "Reservado" }),
  // Pasados (estado Reservado en la base) → el front los muestra como Finalizado.
  t(9, { alumno: A0, profesor: P0, materia: M0, fecha: sumarDiasFixture(hoyFixture, -1), horaInicio: "15:00", horaFin: "16:00", valorClaseCongelado: 18000, estado: "Reservado", pagado: true, puedeModificar: false, puedeCancelar: false, motivoDeshabilitado: "El turno ya ocurrió." }),
  t(10, { alumno: A1, profesor: P1, materia: M1, fecha: sumarDiasFixture(hoyFixture, -3), horaInicio: "17:00", horaFin: "18:00", valorClaseCongelado: 20000, estado: "Reservado", cantidadModificaciones: 1, pagado: true, puedeModificar: false, puedeCancelar: false, motivoDeshabilitado: "El turno ya ocurrió." }),
  t(11, { alumno: A4, profesor: P2, materia: M2, fecha: sumarDiasFixture(hoyFixture, -6), horaInicio: "10:00", horaFin: "10:45", valorClaseCongelado: 15000, estado: "Reservado", pagado: true, puedeModificar: false, puedeCancelar: false, motivoDeshabilitado: "El turno ya ocurrió." }),
  // Cancelados → con motivo, y marcas de cancelación tardía.
  t(12, { alumno: A2, profesor: P3, materia: M3, fecha: sumarDiasFixture(hoyFixture, 2), horaInicio: "08:30", horaFin: "10:00", valorClaseCongelado: 28000, estado: "Cancelado", puedeModificar: false, puedeCancelar: false, motivoDeshabilitado: "El turno está cancelado.", motivoCancelacion: { id: 2, nombre: "Pedido alumno" }, fechaCancelacion: new Date(`${hoyFixture}T18:00:00`).toISOString(), cancelacionTardia: true }),
  t(13, { alumno: A5, profesor: P0, materia: M0, fecha: sumarDiasFixture(hoyFixture, -4), horaInicio: "15:00", horaFin: "16:00", valorClaseCongelado: 18000, estado: "Cancelado", puedeModificar: false, puedeCancelar: false, motivoDeshabilitado: "El turno está cancelado.", motivoCancelacion: { id: 1, nombre: "Ausencia profesor" }, detalleCancelacion: "El profesor avisó que no podía asistir.", fechaCancelacion: new Date(`${sumarDiasFixture(hoyFixture, -5)}T12:00:00`).toISOString() }),
  t(14, { alumno: A6, profesor: P1, materia: M1, fecha: sumarDiasFixture(hoyFixture, 10), horaInicio: "09:00", horaFin: "10:00", valorClaseCongelado: 20000, estado: "Reservado" }),
];

export const turnoFixtures: TurnoResponse[] = [...TURNOS_ESTADO_BORDE, ...turnosDelCalendario()];

// ─── Catálogos que la pantalla necesita (la DB los siembra) ────────────────
export const motivosCancelacionFixture: MotivoCancelacionResponse[] = [
  { id: 1, nombre: "Ausencia profesor", requiereDetalle: false, estado: "activo" },
  { id: 2, nombre: "Pedido alumno", requiereDetalle: false, estado: "activo" },
  { id: 3, nombre: "Error carga", requiereDetalle: false, estado: "activo" },
  { id: 4, nombre: "Otro", requiereDetalle: true, estado: "activo" },
];

/**
 * Franjas para el formulario de edición: se arman acá (misma regla que en la
 * reserva) para que la maqueta se vea completa sin depender del backend.
 * La disponibilidad viene de `agenda_profesional`, los cupos de
 * `profesor_materia.capacidad_maxima`.
 * // BACKEND: usar `listarFranjas` (GET /api/calendario/agenda) de src/data.
 */
export function franjasDeEdicionFixture(q: { profesorId: number; materiaId: number; fecha: string }): FranjaTurnoResponse[] {
  const duracion = q.materiaId === 15 ? 90 : q.materiaId === 12 ? 45 : 60;
  const franjas: FranjaTurnoResponse[] = [];
  const bloques: Array<[number, number]> = [
    [9 * 60, 13 * 60],
    [15 * 60, 19 * 60],
  ];
  for (const [inicioBloque, finBloque] of bloques) {
    for (let ini = inicioBloque; ini + duracion <= finBloque; ini += 60) {
      const min = (total: number) =>
        `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
      const inicio = new Date(`${q.fecha}T${min(ini)}:00`).getTime();
      if (inicio <= Date.now()) continue;
      // Cada 5ª franja con cupo completo para exhibir el estado SIN_CUPO.
      const sinCupo = Math.floor((ini - inicioBloque) / 60) % 5 === 4;
      franjas.push({
        horaInicio: min(ini),
        horaFin: min(ini + duracion),
        capacidad: 1,
        cuposDisponibles: sinCupo ? 0 : 1,
        disponible: !sinCupo,
        motivo: sinCupo ? "SIN_CUPO" : null,
      });
    }
  }
  return franjas;
}