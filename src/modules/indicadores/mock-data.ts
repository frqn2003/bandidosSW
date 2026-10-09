// src/modules/indicadores/mock-data.ts
//
// Dataset mockeado para el cálculo dinámico de indicadores (HU-IND-01).
// Simula datos consistentes de turnos, disponibilidad de profesores, alumnos y pagos
// a lo largo del año 2026, permitiendo probar filtros temporales, materias, docentes
// y casos borde (como períodos sin datos).

import type {
  MockTurnoIndicador,
  MockDisponibilidadProfesor,
  MockAlumnoIndicador,
  MockPagoIndicador,
  OpcionCatalogo,
} from "./types";

export const CATALOGO_MATERIAS_MOCK: OpcionCatalogo[] = [
  { id: 1, nombre: "Matemática" },
  { id: 2, nombre: "Física" },
  { id: 3, nombre: "Química" },
  { id: 4, nombre: "Inglés" },
  { id: 5, nombre: "Lengua" },
  { id: 6, nombre: "Biología" },
  { id: 7, nombre: "Historia" },
];

export const CATALOGO_PROFESORES_MOCK: OpcionCatalogo[] = [
  { id: 1, nombre: "Carlos Benítez" },
  { id: 2, nombre: "Laura Gómez" },
  { id: 3, nombre: "Mariana Castro" },
  { id: 4, nombre: "Roberto Morales" },
  { id: 5, nombre: "Sofía Díaz" },
];

export const MOCK_ALUMNOS: MockAlumnoIndicador[] = [
  { id: 1, nombre: "Emma", apellido: "Benítez", estado: "activo", fechaAlta: "2026-02-10" },
  { id: 2, nombre: "Lara", apellido: "Castillo", estado: "activo", fechaAlta: "2026-03-01" },
  { id: 3, nombre: "Milo", apellido: "Domínguez", estado: "activo", fechaAlta: "2026-03-15" },
  { id: 4, nombre: "Ciro", apellido: "Fernández", estado: "activo", fechaAlta: "2026-04-05" },
  { id: 5, nombre: "Irene", apellido: "López", estado: "activo", fechaAlta: "2026-05-12" },
  { id: 6, nombre: "Juan", apellido: "Ortiz", estado: "activo", fechaAlta: "2026-06-20" },
  { id: 7, nombre: "Ana", apellido: "Quiroga", estado: "inactivo", fechaAlta: "2025-08-04" },
  { id: 8, nombre: "Mateo", apellido: "Rojas", estado: "inactivo", fechaAlta: "2026-01-10" },
  { id: 9, nombre: "Lucía", apellido: "Acosta", estado: "activo", fechaAlta: "2026-08-02" },
  { id: 10, nombre: "Facundo", apellido: "Navarro", estado: "activo", fechaAlta: "2026-08-25" },
  { id: 11, nombre: "Valentina", apellido: "Romero", estado: "activo", fechaAlta: "2026-09-02" },
  { id: 12, nombre: "Thiago", apellido: "Paz", estado: "activo", fechaAlta: "2026-09-08" },
  { id: 13, nombre: "Martina", apellido: "Sosa", estado: "activo", fechaAlta: "2026-09-14" },
  { id: 14, nombre: "Benjamín", apellido: "Vargas", estado: "activo", fechaAlta: "2026-09-20" },
  { id: 15, nombre: "Camila", apellido: "Méndez", estado: "activo", fechaAlta: "2026-09-22" },
];

export const MOCK_TURNOS: MockTurnoIndicador[] = [
  // ── SEPTIEMBRE 2026 (Mes en curso) ──
  // Semana 1: 01/09 al 06/09
  { id: 101, fecha: "2026-09-01", horaInicio: "09:00", horaFin: "11:00", duracionHoras: 2, materiaId: 1, materiaNombre: "Matemática", profesorId: 1, profesorNombre: "Carlos Benítez", estado: "Realizado", valorClase: 24000, pagado: true },
  { id: 102, fecha: "2026-09-02", horaInicio: "14:00", horaFin: "15:30", duracionHoras: 1.5, materiaId: 2, materiaNombre: "Física", profesorId: 2, profesorNombre: "Laura Gómez", estado: "Realizado", valorClase: 20000, pagado: true },
  { id: 103, fecha: "2026-09-03", horaInicio: "10:00", horaFin: "11:00", duracionHoras: 1, materiaId: 3, materiaNombre: "Química", profesorId: 3, profesorNombre: "Mariana Castro", estado: "Cancelado", valorClase: 16000, pagado: false },
  { id: 104, fecha: "2026-09-04", horaInicio: "16:00", horaFin: "18:00", duracionHoras: 2, materiaId: 4, materiaNombre: "Inglés", profesorId: 4, profesorNombre: "Roberto Morales", estado: "Realizado", valorClase: 22000, pagado: true },
  { id: 105, fecha: "2026-09-05", horaInicio: "09:00", horaFin: "11:00", duracionHoras: 2, materiaId: 1, materiaNombre: "Matemática", profesorId: 1, profesorNombre: "Carlos Benítez", estado: "Realizado", valorClase: 24000, pagado: true },

  // Semana 2: 07/09 al 13/09
  { id: 106, fecha: "2026-09-07", horaInicio: "10:00", horaFin: "12:00", duracionHoras: 2, materiaId: 1, materiaNombre: "Matemática", profesorId: 1, profesorNombre: "Carlos Benítez", estado: "Realizado", valorClase: 24000, pagado: true },
  { id: 107, fecha: "2026-09-08", horaInicio: "15:00", horaFin: "16:30", duracionHoras: 1.5, materiaId: 2, materiaNombre: "Física", profesorId: 2, profesorNombre: "Laura Gómez", estado: "Realizado", valorClase: 20000, pagado: true },
  { id: 108, fecha: "2026-09-09", horaInicio: "09:00", horaFin: "10:00", duracionHoras: 1, materiaId: 5, materiaNombre: "Lengua", profesorId: 5, profesorNombre: "Sofía Díaz", estado: "Realizado", valorClase: 15000, pagado: true },
  { id: 109, fecha: "2026-09-10", horaInicio: "17:00", horaFin: "18:30", duracionHoras: 1.5, materiaId: 3, materiaNombre: "Química", profesorId: 3, profesorNombre: "Mariana Castro", estado: "Cancelado", valorClase: 18000, pagado: false },
  { id: 110, fecha: "2026-09-11", horaInicio: "11:00", horaFin: "12:30", duracionHoras: 1.5, materiaId: 4, materiaNombre: "Inglés", profesorId: 4, profesorNombre: "Roberto Morales", estado: "Realizado", valorClase: 19000, pagado: true },
  { id: 111, fecha: "2026-09-12", horaInicio: "10:00", horaFin: "12:00", duracionHoras: 2, materiaId: 6, materiaNombre: "Biología", profesorId: 3, profesorNombre: "Mariana Castro", estado: "Realizado", valorClase: 22000, pagado: true },

  // Semana 3: 14/09 al 20/09
  { id: 112, fecha: "2026-09-14", horaInicio: "08:30", horaFin: "10:30", duracionHoras: 2, materiaId: 1, materiaNombre: "Matemática", profesorId: 1, profesorNombre: "Carlos Benítez", estado: "Realizado", valorClase: 24000, pagado: true },
  { id: 113, fecha: "2026-09-15", horaInicio: "14:00", horaFin: "15:00", duracionHoras: 1, materiaId: 2, materiaNombre: "Física", profesorId: 2, profesorNombre: "Laura Gómez", estado: "Cancelado", valorClase: 16000, pagado: false },
  { id: 114, fecha: "2026-09-16", horaInicio: "16:00", horaFin: "18:00", duracionHoras: 2, materiaId: 1, materiaNombre: "Matemática", profesorId: 1, profesorNombre: "Carlos Benítez", estado: "Realizado", valorClase: 24000, pagado: true },
  { id: 115, fecha: "2026-09-17", horaInicio: "11:00", horaFin: "13:00", duracionHoras: 2, materiaId: 7, materiaNombre: "Historia", profesorId: 5, profesorNombre: "Sofía Díaz", estado: "Realizado", valorClase: 20000, pagado: true },
  { id: 116, fecha: "2026-09-18", horaInicio: "15:00", horaFin: "16:30", duracionHoras: 1.5, materiaId: 4, materiaNombre: "Inglés", profesorId: 4, profesorNombre: "Roberto Morales", estado: "Realizado", valorClase: 19000, pagado: true },

  // Semana 4: 21/09 al 27/09
  { id: 117, fecha: "2026-09-21", horaInicio: "09:00", horaFin: "11:00", duracionHoras: 2, materiaId: 1, materiaNombre: "Matemática", profesorId: 1, profesorNombre: "Carlos Benítez", estado: "Realizado", valorClase: 24000, pagado: true },
  { id: 118, fecha: "2026-09-22", horaInicio: "16:00", horaFin: "17:30", duracionHoras: 1.5, materiaId: 3, materiaNombre: "Química", profesorId: 3, profesorNombre: "Mariana Castro", estado: "Realizado", valorClase: 18000, pagado: true },
  { id: 119, fecha: "2026-09-23", horaInicio: "10:30", horaFin: "12:00", duracionHoras: 1.5, materiaId: 2, materiaNombre: "Física", profesorId: 2, profesorNombre: "Laura Gómez", estado: "Realizado", valorClase: 20000, pagado: true },
  { id: 120, fecha: "2026-09-24", horaInicio: "14:00", horaFin: "15:00", duracionHoras: 1, materiaId: 5, materiaNombre: "Lengua", profesorId: 5, profesorNombre: "Sofía Díaz", estado: "Cancelado", valorClase: 15000, pagado: false },
  { id: 121, fecha: "2026-09-25", horaInicio: "17:00", horaFin: "19:00", duracionHoras: 2, materiaId: 1, materiaNombre: "Matemática", profesorId: 1, profesorNombre: "Carlos Benítez", estado: "Realizado", valorClase: 24000, pagado: true },

  // Semana 5: 28/09 al 30/09
  { id: 122, fecha: "2026-09-28", horaInicio: "10:00", horaFin: "11:30", duracionHoras: 1.5, materiaId: 4, materiaNombre: "Inglés", profesorId: 4, profesorNombre: "Roberto Morales", estado: "Reservado", valorClase: 19000, pagado: true },
  { id: 123, fecha: "2026-09-29", horaInicio: "15:00", horaFin: "17:00", duracionHoras: 2, materiaId: 2, materiaNombre: "Física", profesorId: 2, profesorNombre: "Laura Gómez", estado: "Reservado", valorClase: 25000, pagado: false },
  { id: 124, fecha: "2026-09-30", horaInicio: "16:00", horaFin: "17:30", duracionHoras: 1.5, materiaId: 1, materiaNombre: "Matemática", profesorId: 1, profesorNombre: "Carlos Benítez", estado: "Reservado", valorClase: 20000, pagado: true },

  // ── AGOSTO 2026 ──
  { id: 201, fecha: "2026-08-03", horaInicio: "09:00", horaFin: "11:00", duracionHoras: 2, materiaId: 1, materiaNombre: "Matemática", profesorId: 1, profesorNombre: "Carlos Benítez", estado: "Realizado", valorClase: 22000, pagado: true },
  { id: 202, fecha: "2026-08-07", horaInicio: "14:00", horaFin: "16:00", duracionHoras: 2, materiaId: 2, materiaNombre: "Física", profesorId: 2, profesorNombre: "Laura Gómez", estado: "Realizado", valorClase: 20000, pagado: true },
  { id: 203, fecha: "2026-08-11", horaInicio: "10:00", horaFin: "11:30", duracionHoras: 1.5, materiaId: 3, materiaNombre: "Química", profesorId: 3, profesorNombre: "Mariana Castro", estado: "Cancelado", valorClase: 17000, pagado: false },
  { id: 204, fecha: "2026-08-14", horaInicio: "16:00", horaFin: "18:00", duracionHoras: 2, materiaId: 4, materiaNombre: "Inglés", profesorId: 4, profesorNombre: "Roberto Morales", estado: "Realizado", valorClase: 21000, pagado: true },
  { id: 205, fecha: "2026-08-19", horaInicio: "11:00", horaFin: "12:00", duracionHoras: 1, materiaId: 5, materiaNombre: "Lengua", profesorId: 5, profesorNombre: "Sofía Díaz", estado: "Realizado", valorClase: 15000, pagado: true },
  { id: 206, fecha: "2026-08-24", horaInicio: "09:00", horaFin: "11:00", duracionHoras: 2, materiaId: 1, materiaNombre: "Matemática", profesorId: 1, profesorNombre: "Carlos Benítez", estado: "Realizado", valorClase: 22000, pagado: true },
  { id: 207, fecha: "2026-08-28", horaInicio: "15:00", horaFin: "17:00", duracionHoras: 2, materiaId: 6, materiaNombre: "Biología", profesorId: 3, profesorNombre: "Mariana Castro", estado: "Realizado", valorClase: 20000, pagado: true },

  // ── JULIO 2026 ──
  { id: 301, fecha: "2026-07-06", horaInicio: "10:00", horaFin: "12:00", duracionHoras: 2, materiaId: 1, materiaNombre: "Matemática", profesorId: 1, profesorNombre: "Carlos Benítez", estado: "Realizado", valorClase: 20000, pagado: true },
  { id: 302, fecha: "2026-07-10", horaInicio: "14:00", horaFin: "16:00", duracionHoras: 2, materiaId: 2, materiaNombre: "Física", profesorId: 2, profesorNombre: "Laura Gómez", estado: "Cancelado", valorClase: 18000, pagado: false },
  { id: 303, fecha: "2026-07-15", horaInicio: "09:00", horaFin: "11:00", duracionHoras: 2, materiaId: 7, materiaNombre: "Historia", profesorId: 5, profesorNombre: "Sofía Díaz", estado: "Realizado", valorClase: 19000, pagado: true },
  { id: 304, fecha: "2026-07-22", horaInicio: "16:00", horaFin: "17:30", duracionHoras: 1.5, materiaId: 4, materiaNombre: "Inglés", profesorId: 4, profesorNombre: "Roberto Morales", estado: "Realizado", valorClase: 18000, pagado: true },
];

export const MOCK_DISPONIBILIDAD: MockDisponibilidadProfesor[] = [
  // Disponibilidad por profesor en Septiembre 2026 (aprox 30-40 horas semanales por profesor)
  { id: 1, profesorId: 1, fecha: "2026-09-01", horasDisponibles: 6 },
  { id: 2, profesorId: 1, fecha: "2026-09-03", horasDisponibles: 6 },
  { id: 3, profesorId: 1, fecha: "2026-09-05", horasDisponibles: 4 },
  { id: 4, profesorId: 1, fecha: "2026-09-07", horasDisponibles: 6 },
  { id: 5, profesorId: 1, fecha: "2026-09-10", horasDisponibles: 6 },
  { id: 6, profesorId: 1, fecha: "2026-09-14", horasDisponibles: 6 },
  { id: 7, profesorId: 1, fecha: "2026-09-16", horasDisponibles: 6 },
  { id: 8, profesorId: 1, fecha: "2026-09-21", horasDisponibles: 6 },
  { id: 9, profesorId: 1, fecha: "2026-09-25", horasDisponibles: 6 },
  { id: 10, profesorId: 1, fecha: "2026-09-28", horasDisponibles: 6 },

  { id: 11, profesorId: 2, fecha: "2026-09-02", horasDisponibles: 5 },
  { id: 12, profesorId: 2, fecha: "2026-09-04", horasDisponibles: 5 },
  { id: 13, profesorId: 2, fecha: "2026-09-08", horasDisponibles: 5 },
  { id: 14, profesorId: 2, fecha: "2026-09-11", horasDisponibles: 5 },
  { id: 15, profesorId: 2, fecha: "2026-09-15", horasDisponibles: 5 },
  { id: 16, profesorId: 2, fecha: "2026-09-18", horasDisponibles: 5 },
  { id: 17, profesorId: 2, fecha: "2026-09-22", horasDisponibles: 5 },
  { id: 18, profesorId: 2, fecha: "2026-09-29", horasDisponibles: 5 },

  { id: 19, profesorId: 3, fecha: "2026-09-03", horasDisponibles: 4 },
  { id: 20, profesorId: 3, fecha: "2026-09-09", horasDisponibles: 4 },
  { id: 21, profesorId: 3, fecha: "2026-09-12", horasDisponibles: 4 },
  { id: 22, profesorId: 3, fecha: "2026-09-17", horasDisponibles: 4 },
  { id: 23, profesorId: 3, fecha: "2026-09-23", horasDisponibles: 4 },

  { id: 24, profesorId: 4, fecha: "2026-09-04", horasDisponibles: 5 },
  { id: 25, profesorId: 4, fecha: "2026-09-10", horasDisponibles: 5 },
  { id: 26, profesorId: 4, fecha: "2026-09-16", horasDisponibles: 5 },
  { id: 27, profesorId: 4, fecha: "2026-09-22", horasDisponibles: 5 },
  { id: 28, profesorId: 4, fecha: "2026-09-28", horasDisponibles: 5 },

  { id: 29, profesorId: 5, fecha: "2026-09-02", horasDisponibles: 4 },
  { id: 30, profesorId: 5, fecha: "2026-09-08", horasDisponibles: 4 },
  { id: 31, profesorId: 5, fecha: "2026-09-15", horasDisponibles: 4 },
  { id: 32, profesorId: 5, fecha: "2026-09-24", horasDisponibles: 4 },

  // Disponibilidad de Agosto 2026
  { id: 33, profesorId: 1, fecha: "2026-08-03", horasDisponibles: 10 },
  { id: 34, profesorId: 1, fecha: "2026-08-24", horasDisponibles: 10 },
  { id: 35, profesorId: 2, fecha: "2026-08-07", horasDisponibles: 10 },
  { id: 36, profesorId: 3, fecha: "2026-08-11", horasDisponibles: 8 },
  { id: 37, profesorId: 3, fecha: "2026-08-28", horasDisponibles: 8 },
  { id: 38, profesorId: 4, fecha: "2026-08-14", horasDisponibles: 10 },
  { id: 39, profesorId: 5, fecha: "2026-08-19", horasDisponibles: 8 },
];

export const MOCK_PAGOS: MockPagoIndicador[] = [
  // Pagos correspondientes a los turnos pagados de Septiembre 2026
  { id: 501, turnoId: 101, fechaPago: "2026-09-01", monto: 24000, materiaId: 1, profesorId: 1 },
  { id: 502, turnoId: 102, fechaPago: "2026-09-02", monto: 20000, materiaId: 2, profesorId: 2 },
  { id: 503, turnoId: 104, fechaPago: "2026-09-04", monto: 22000, materiaId: 4, profesorId: 4 },
  { id: 504, turnoId: 105, fechaPago: "2026-09-05", monto: 24000, materiaId: 1, profesorId: 1 },
  { id: 505, turnoId: 106, fechaPago: "2026-09-07", monto: 24000, materiaId: 1, profesorId: 1 },
  { id: 506, turnoId: 107, fechaPago: "2026-09-08", monto: 20000, materiaId: 2, profesorId: 2 },
  { id: 507, turnoId: 108, fechaPago: "2026-09-09", monto: 15000, materiaId: 5, profesorId: 5 },
  { id: 508, turnoId: 110, fechaPago: "2026-09-11", monto: 19000, materiaId: 4, profesorId: 4 },
  { id: 509, turnoId: 111, fechaPago: "2026-09-12", monto: 22000, materiaId: 6, profesorId: 3 },
  { id: 510, turnoId: 112, fechaPago: "2026-09-14", monto: 24000, materiaId: 1, profesorId: 1 },
  { id: 511, turnoId: 114, fechaPago: "2026-09-16", monto: 24000, materiaId: 1, profesorId: 1 },
  { id: 512, turnoId: 115, fechaPago: "2026-09-17", monto: 20000, materiaId: 7, profesorId: 5 },
  { id: 513, turnoId: 116, fechaPago: "2026-09-18", monto: 19000, materiaId: 4, profesorId: 4 },
  { id: 514, turnoId: 117, fechaPago: "2026-09-21", monto: 24000, materiaId: 1, profesorId: 1 },
  { id: 515, turnoId: 118, fechaPago: "2026-09-22", monto: 18000, materiaId: 3, profesorId: 3 },
  { id: 516, turnoId: 119, fechaPago: "2026-09-23", monto: 20000, materiaId: 2, profesorId: 2 },
  { id: 517, turnoId: 121, fechaPago: "2026-09-25", monto: 24000, materiaId: 1, profesorId: 1 },
  { id: 518, turnoId: 122, fechaPago: "2026-09-28", monto: 19000, materiaId: 4, profesorId: 4 },
  { id: 519, turnoId: 124, fechaPago: "2026-09-30", monto: 20000, materiaId: 1, profesorId: 1 },

  // Pagos de Agosto 2026
  { id: 601, turnoId: 201, fechaPago: "2026-08-03", monto: 22000, materiaId: 1, profesorId: 1 },
  { id: 602, turnoId: 202, fechaPago: "2026-08-07", monto: 20000, materiaId: 2, profesorId: 2 },
  { id: 603, turnoId: 204, fechaPago: "2026-08-14", monto: 21000, materiaId: 4, profesorId: 4 },
  { id: 604, turnoId: 205, fechaPago: "2026-08-19", monto: 15000, materiaId: 5, profesorId: 5 },
  { id: 605, turnoId: 206, fechaPago: "2026-08-24", monto: 22000, materiaId: 1, profesorId: 1 },
  { id: 606, turnoId: 207, fechaPago: "2026-08-28", monto: 20000, materiaId: 6, profesorId: 3 },

  // Pagos de Julio 2026
  { id: 701, turnoId: 301, fechaPago: "2026-07-06", monto: 20000, materiaId: 1, profesorId: 1 },
  { id: 702, turnoId: 303, fechaPago: "2026-07-15", monto: 19000, materiaId: 7, profesorId: 5 },
  { id: 703, turnoId: 304, fechaPago: "2026-07-22", monto: 18000, materiaId: 4, profesorId: 4 },
];
