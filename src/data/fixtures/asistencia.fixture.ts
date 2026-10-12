// src/data/fixtures/asistencia.fixture.ts
//
// Fixture de datos para Asistencia (HU-ASI-01).
// Provee turnos del día e historial de asistencia con datos relativos a la hora
// actual para que las reglas de 15 minutos y 24 horas sean demostrables y testeables.

import type {
  ClaseDelDiaResponse,
  HistorialAsistenciaItem,
} from "@/contracts/asistencia";
import { fechaAISO } from "@/funciones/asistencia-reglas";

const ahora = new Date();
const hoyIso = fechaAISO(ahora);

const ayer = new Date(ahora);
ayer.setDate(ayer.getDate() - 1);
const ayerIso = fechaAISO(ayer);

// Helper para calcular hora relativa a ahora (ej: +20 minutos, -120 minutos)
function calcularHora(offsetMinutos: number): string {
  const d = new Date(ahora.getTime() + offsetMinutos * 60 * 1000);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export const PROFESOR_DEMO = {
  id: 3,
  nombre: "Roberto",
  apellido: "Peralta",
};

export const GERENTE_DEMO = {
  id: 1,
  nombre: "María",
  apellido: "González",
};

export const CLASES_DEL_DIA_FIXTURE: (ClaseDelDiaResponse & { profesorId: number })[] = [
  // 1. Turno que empieza en 20 minutos (BLOQUEADO: fuera de ventana de 15 min)
  {
    turnoId: 101,
    codigo: "TUR-000101",
    profesorId: 3,
    alumno: { id: 1, legajo: "ALU-000001", nombre: "Sofía", apellido: "Ramírez" },
    materia: { id: 1, nombre: "Matemática" },
    fecha: hoyIso,
    horaInicio: calcularHora(20),
    horaFin: calcularHora(80),
    estado: "Reservado",
    asistencia: null,
    puedeRegistrar: false,
    puedeCorregir: false,
    motivoDeshabilitado: "Habilitado desde 15 minutos antes del inicio.",
  },

  // 2. Turno en horario (HABILITADO: dentro de la ventana de 15 minutos previos al inicio)
  {
    turnoId: 102,
    codigo: "TUR-000102",
    profesorId: 3,
    alumno: { id: 2, legajo: "ALU-000002", nombre: "Lucas", apellido: "Benítez" },
    materia: { id: 2, nombre: "Física" },
    fecha: hoyIso,
    horaInicio: calcularHora(5),
    horaFin: calcularHora(65),
    estado: "Reservado",
    asistencia: null,
    puedeRegistrar: true,
    puedeCorregir: false,
    motivoDeshabilitado: null,
  },

  // 3. Turno ya registrado hoy (hace 2 horas, dentro del plazo de 24h: editable por Profesor)
  {
    turnoId: 103,
    codigo: "TUR-000103",
    profesorId: 3,
    alumno: { id: 3, legajo: "ALU-000003", nombre: "Valentina", apellido: "Herrera" },
    materia: { id: 1, nombre: "Matemática" },
    fecha: hoyIso,
    horaInicio: calcularHora(-120),
    horaFin: calcularHora(-60),
    estado: "Asistió",
    asistencia: {
      id: 501,
      turnoId: 103,
      presente: true,
      temaTrabajado: "Ecuaciones cuadráticas y factorización por método de Gauss",
      observaciones: "Resolvió ejercicios de guía práctica con buen desempeño.",
      registradoPor: PROFESOR_DEMO,
      registradoAt: new Date(ahora.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      modificadoAt: null,
      modificadoPor: null,
      motivoCorreccion: null,
    },
    puedeRegistrar: false,
    puedeCorregir: true,
    motivoDeshabilitado: null,
  },

  // 4. Turno registrado AYER (hace 26 horas, superó las 24h: solo Gerente puede modificar)
  {
    turnoId: 104,
    codigo: "TUR-000104",
    profesorId: 3,
    alumno: { id: 1, legajo: "ALU-000001", nombre: "Sofía", apellido: "Ramírez" },
    materia: { id: 3, nombre: "Química" },
    fecha: ayerIso,
    horaInicio: "10:00",
    horaFin: "11:00",
    estado: "Ausente",
    asistencia: {
      id: 502,
      turnoId: 104,
      presente: false,
      temaTrabajado: null,
      observaciones: "Aviso telefónico con anticipación por turno médico.",
      registradoPor: PROFESOR_DEMO,
      registradoAt: new Date(ahora.getTime() - 26 * 60 * 60 * 1000).toISOString(),
      modificadoAt: null,
      modificadoPor: null,
      motivoCorreccion: null,
    },
    puedeRegistrar: false,
    puedeCorregir: false, // Profesor no puede; Gerente sí con motivo
    motivoDeshabilitado: "Notificación: solo el Gerente puede modificar",
  },
];

export const HISTORIAL_ALUMNOS_FIXTURE: (HistorialAsistenciaItem & { alumnoId: number })[] = [
  {
    alumnoId: 1,
    turnoId: 104,
    codigo: "TUR-000104",
    fecha: ayerIso,
    horaInicio: "10:00",
    materia: { id: 3, nombre: "Química" },
    profesor: PROFESOR_DEMO,
    estado: "Ausente",
    temaTrabajado: null,
  },
  {
    alumnoId: 1,
    turnoId: 98,
    codigo: "TUR-000098",
    fecha: "2026-10-08",
    horaInicio: "15:00",
    materia: { id: 1, nombre: "Matemática" },
    profesor: PROFESOR_DEMO,
    estado: "Asistió",
    temaTrabajado: "Logaritmos y propiedades operativas",
  },
  {
    alumnoId: 1,
    turnoId: 95,
    codigo: "TUR-000095",
    fecha: "2026-10-05",
    horaInicio: "16:00",
    materia: { id: 1, nombre: "Matemática" },
    profesor: PROFESOR_DEMO,
    estado: "Asistió",
    temaTrabajado: "Funciones exponenciales y asíntotas",
  },
  {
    alumnoId: 1,
    turnoId: 90,
    codigo: "TUR-000090",
    fecha: "2026-10-01",
    horaInicio: "14:00",
    materia: { id: 2, nombre: "Física" },
    profesor: { id: 1, nombre: "Juan", apellido: "Pérez" },
    estado: "Asistió",
    temaTrabajado: "Cinemática: tiro vertical y caída libre",
  },
  {
    alumnoId: 1,
    turnoId: 85,
    codigo: "TUR-000085",
    fecha: "2026-09-28",
    horaInicio: "10:00",
    materia: { id: 1, nombre: "Matemática" },
    profesor: PROFESOR_DEMO,
    estado: "Cancelado",
    temaTrabajado: null,
  },
  {
    alumnoId: 2,
    turnoId: 99,
    codigo: "TUR-000099",
    fecha: "2026-10-09",
    horaInicio: "11:00",
    materia: { id: 2, nombre: "Física" },
    profesor: PROFESOR_DEMO,
    estado: "Asistió",
    temaTrabajado: "Leyes de Newton y diagrama de cuerpo libre",
  },
  {
    alumnoId: 2,
    turnoId: 94,
    codigo: "TUR-000094",
    fecha: "2026-10-04",
    horaInicio: "11:00",
    materia: { id: 2, nombre: "Física" },
    profesor: PROFESOR_DEMO,
    estado: "Ausente",
    temaTrabajado: null,
  },
  {
    alumnoId: 2,
    turnoId: 88,
    codigo: "TUR-000088",
    fecha: "2026-09-30",
    horaInicio: "11:00",
    materia: { id: 2, nombre: "Física" },
    profesor: PROFESOR_DEMO,
    estado: "Asistió",
    temaTrabajado: "Dinámica lineal y rozamiento",
  },
  // Alumno 4: Solo atendido por Profesor 1 (Juan Pérez), no por Roberto Peralta (id 3)
  {
    alumnoId: 4,
    turnoId: 91,
    codigo: "TUR-000091",
    fecha: "2026-10-02",
    horaInicio: "09:00",
    materia: { id: 4, nombre: "Inglés" },
    profesor: { id: 1, nombre: "Juan", apellido: "Pérez" },
    estado: "Asistió",
    temaTrabajado: "Conditional sentences Type 1 & 2",
  },
];
