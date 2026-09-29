// src/modules/pagos/mock-data.ts
//
// Datos simulados (fixtures) para el módulo de Gestión de Pagos (HU-PAG-01).
// Alineados con contratos oficiales y consistentes con los fixtures de alumnos y turnos.

import type {
  ClasePendientePagoResponse,
  FormaPagoResponse,
  PagoResponse,
  StudentPaymentSummary,
} from "./types";

/**
 * Catálogo maestro de medios de pago disponibles (HU-PAG-01 / catálogo).
 */
export const MOCK_FORMAS_PAGO: FormaPagoResponse[] = [
  {
    id: 1,
    nombre: "Efectivo",
    requiereNroOperacion: false,
    estado: "activo",
  },
  {
    id: 2,
    nombre: "Transferencia",
    requiereNroOperacion: true,
    estado: "activo",
  },
];

/**
 * Alumnos mockeados para el buscador y selección de cobros.
 */
export const MOCK_STUDENTS: StudentPaymentSummary[] = [
  {
    id: 5,
    legajo: "A-0120",
    nombre: "Irene",
    apellido: "López",
    dni: "44567123",
    totalDeudaPendiente: 36000,
    clasesPendientesCount: 2,
  },
  {
    id: 1,
    legajo: "A-0151",
    nombre: "Emma",
    apellido: "Benitez",
    dni: "47880123",
    totalDeudaPendiente: 15000,
    clasesPendientesCount: 1,
  },
  {
    id: 6,
    legajo: "A-0142",
    nombre: "Juan",
    apellido: "Ortiz",
    dni: "45123987",
    totalDeudaPendiente: 46500,
    clasesPendientesCount: 3,
  },
  {
    id: 2,
    legajo: "A-0138",
    nombre: "Lara",
    apellido: "Castillo",
    dni: "46120987",
    totalDeudaPendiente: 0,
    clasesPendientesCount: 0,
  },
  {
    id: 4,
    legajo: "A-0144",
    nombre: "Mateo",
    apellido: "Herrera",
    dni: "47002315",
    totalDeudaPendiente: 0,
    clasesPendientesCount: 0,
  },
  {
    id: 8,
    legajo: "A-0135",
    nombre: "Nicolás",
    apellido: "Vargas",
    dni: "46890123",
    totalDeudaPendiente: 28000,
    clasesPendientesCount: 2,
  },
];

/**
 * Clases dictadas pasadas no abonadas por alumno (turnos ya finalizados).
 */
export const INITIAL_PENDING_CLASSES_MOCK: Record<number, ClasePendientePagoResponse[]> = {
  // Irene López (A-0120): 2 clases impagas = $36.000
  5: [
    {
      id: 3410,
      codigo: "TUR-003410",
      fecha: "2026-03-20",
      horaInicio: "15:00",
      horaFin: "16:00",
      materia: { id: 3, nombre: "Química Orgánica" },
      profesor: { id: 2, nombre: "Martín", apellido: "Morales" },
      importe: 18000,
      pagado: false,
    },
    {
      id: 3482,
      codigo: "TUR-003482",
      fecha: "2026-03-24",
      horaInicio: "16:00",
      horaFin: "17:00",
      materia: { id: 3, nombre: "Química Orgánica" },
      profesor: { id: 2, nombre: "Martín", apellido: "Morales" },
      importe: 18000,
      pagado: false,
    },
  ],
  // Emma Benitez (A-0151): 1 clase impaga = $15.000
  1: [
    {
      id: 3310,
      codigo: "TUR-003310",
      fecha: "2026-03-18",
      horaInicio: "10:00",
      horaFin: "11:00",
      materia: { id: 1, nombre: "Matemática I" },
      profesor: { id: 3, nombre: "Roberto", apellido: "Peralta" },
      importe: 15000,
      pagado: false,
    },
  ],
  // Juan Ortiz (A-0142): 3 clases impagas = $46.500
  6: [
    {
      id: 3290,
      codigo: "TUR-003290",
      fecha: "2026-03-12",
      horaInicio: "14:00",
      horaFin: "15:00",
      materia: { id: 1, nombre: "Matemática I" },
      profesor: { id: 3, nombre: "Roberto", apellido: "Peralta" },
      importe: 15000,
      pagado: false,
    },
    {
      id: 3350,
      codigo: "TUR-003350",
      fecha: "2026-03-19",
      horaInicio: "14:00",
      horaFin: "15:00",
      materia: { id: 1, nombre: "Matemática I" },
      profesor: { id: 3, nombre: "Roberto", apellido: "Peralta" },
      importe: 15000,
      pagado: false,
    },
    {
      id: 3420,
      codigo: "TUR-003420",
      fecha: "2026-03-22",
      horaInicio: "10:00",
      horaFin: "11:00",
      materia: { id: 2, nombre: "Física General" },
      profesor: { id: 4, nombre: "Laura", apellido: "Vázquez" },
      importe: 16500,
      pagado: false,
    },
  ],
  // Nicolás Vargas (A-0135): 2 clases impagas = $28.000
  8: [
    {
      id: 3302,
      codigo: "TUR-003302",
      fecha: "2026-03-14",
      horaInicio: "09:00",
      horaFin: "10:00",
      materia: { id: 4, nombre: "Inglés Técnico" },
      profesor: { id: 5, nombre: "Carla", apellido: "Méndez" },
      importe: 14000,
      pagado: false,
    },
    {
      id: 3375,
      codigo: "TUR-003375",
      fecha: "2026-03-21",
      horaInicio: "09:00",
      horaFin: "10:00",
      materia: { id: 4, nombre: "Inglés Técnico" },
      profesor: { id: 5, nombre: "Carla", apellido: "Méndez" },
      importe: 14000,
      pagado: false,
    },
  ],
};

/**
 * Historial inicial de pagos registrados en el sistema.
 */
export const INITIAL_PAYMENT_HISTORY_MOCK: PagoResponse[] = [
  {
    id: 118,
    comprobante: "REC-000118",
    alumno: {
      id: 1,
      legajo: "A-0151",
      nombre: "Emma",
      apellido: "Benitez",
      dni: "47880123",
    },
    monto: 30000,
    fechaPago: "2026-03-05",
    observaciones: "Cobro en secretaría",
    formasPago: [
      {
        id: 1,
        formaPagoId: 1,
        nombre: "Efectivo",
        nroOperacion: null,
      },
    ],
    clases: [
      {
        turnoId: 3101,
        codigo: "TUR-003101",
        fecha: "2026-02-27",
        horaInicio: "10:00",
        horaFin: "11:00",
        materiaNombre: "Matemática I",
        profesorNombre: "Roberto Peralta",
        importe: 15000,
      },
      {
        turnoId: 3155,
        codigo: "TUR-003155",
        fecha: "2026-03-03",
        horaInicio: "10:00",
        horaFin: "11:00",
        materiaNombre: "Matemática I",
        profesorNombre: "Roberto Peralta",
        importe: 15000,
      },
    ],
    registradoPor: {
      id: 2,
      nombre: "Laura",
      apellido: "Gómez",
    },
    fechaCreacion: "2026-03-05T11:45:00.000Z",
  },
  {
    id: 112,
    comprobante: "REC-000112",
    alumno: {
      id: 5,
      legajo: "A-0120",
      nombre: "Irene",
      apellido: "López",
      dni: "44567123",
    },
    monto: 18000,
    fechaPago: "2026-02-28",
    observaciones: "Pago vía transferencia bancaria",
    formasPago: [
      {
        id: 2,
        formaPagoId: 2,
        nombre: "Transferencia",
        nroOperacion: "OP-9812451",
      },
    ],
    clases: [
      {
        turnoId: 3088,
        codigo: "TUR-003088",
        fecha: "2026-02-25",
        horaInicio: "15:00",
        horaFin: "16:00",
        materiaNombre: "Química Orgánica",
        profesorNombre: "Martín Morales",
        importe: 18000,
      },
    ],
    registradoPor: {
      id: 2,
      nombre: "Laura",
      apellido: "Gómez",
    },
    fechaCreacion: "2026-02-28T16:10:00.000Z",
  },
  {
    id: 95,
    comprobante: "REC-000095",
    alumno: {
      id: 6,
      legajo: "A-0142",
      nombre: "Juan",
      apellido: "Ortiz",
      dni: "45123987",
    },
    monto: 31500,
    fechaPago: "2026-02-15",
    observaciones: null,
    formasPago: [
      {
        id: 1,
        formaPagoId: 1,
        nombre: "Efectivo",
        nroOperacion: null,
      },
    ],
    clases: [
      {
        turnoId: 2950,
        codigo: "TUR-002950",
        fecha: "2026-02-08",
        horaInicio: "14:00",
        horaFin: "15:00",
        materiaNombre: "Matemática I",
        profesorNombre: "Roberto Peralta",
        importe: 15000,
      },
      {
        turnoId: 2980,
        codigo: "TUR-002980",
        fecha: "2026-02-12",
        horaInicio: "10:00",
        horaFin: "11:00",
        materiaNombre: "Física General",
        profesorNombre: "Laura Vázquez",
        importe: 16500,
      },
    ],
    registradoPor: {
      id: 1,
      nombre: "Admin",
      apellido: "Centro",
    },
    fechaCreacion: "2026-02-15T10:20:00.000Z",
  },
  {
    id: 88,
    comprobante: "REC-000088",
    alumno: {
      id: 2,
      legajo: "A-0138",
      nombre: "Lara",
      apellido: "Castillo",
      dni: "46120987",
    },
    monto: 32000,
    fechaPago: "2026-02-10",
    observaciones: "Abono completo de Física",
    formasPago: [
      {
        id: 2,
        formaPagoId: 2,
        nombre: "Transferencia",
        nroOperacion: "TRF-7740219",
      },
    ],
    clases: [
      {
        turnoId: 2910,
        codigo: "TUR-002910",
        fecha: "2026-02-03",
        horaInicio: "16:00",
        horaFin: "17:00",
        materiaNombre: "Física General",
        profesorNombre: "Laura Vázquez",
        importe: 16000,
      },
      {
        turnoId: 2940,
        codigo: "TUR-002940",
        fecha: "2026-02-07",
        horaInicio: "16:00",
        horaFin: "17:00",
        materiaNombre: "Física General",
        profesorNombre: "Laura Vázquez",
        importe: 16000,
      },
    ],
    registradoPor: {
      id: 2,
      nombre: "Laura",
      apellido: "Gómez",
    },
    fechaCreacion: "2026-02-10T12:00:00.000Z",
  },
];
