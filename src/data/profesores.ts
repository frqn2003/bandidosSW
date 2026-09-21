// Datos placeholder para HU-PRO-01 (front hardcodeado). El backend los pasa a
// snake_case del esquema: profesor, profesor_materia, materia, usuario,
// agenda_profesional, agenda_semanal, turno. Cada registro lleva `id` numérico
// (la PK que mandará la base).

export type EstadoProfesor = "activo" | "inactivo";

export interface MateriaRef {
  id: number; // materia.id
  nombre: string;
  nivel: "Primario" | "Secundario" | "Universitario";
  duracionClaseMinutos: 30 | 45 | 60 | 90 | 120;
}

export interface MateriaAsignada {
  materia: MateriaRef;
  capacidadMaxima: number; // profesor_materia.capacidad_maxima (1-10)
}

export interface Profesor {
  id: number; // profesor.id
  usuarioId: number; // FK → usuario.id (rol Profesor, UNIQUE 1 a 1)
  nombre: string; // usuario.nombre
  apellido: string; // usuario.apellido
  email: string; // usuario.email
  telefono: string; // profesor.telefono ^[0-9]{10,11}$
  tituloEspecialidad: string | null; // profesor.titulo_especialidad varchar(100)
  materias: MateriaAsignada[];
  estado: EstadoProfesor; // profesor.estado
  fechaCreacion: string; // usuario.fecha_creacion (para "Alta en sistema")
  // BACKEND: GET /api/profesores → JOIN profesor + usuario + profesor_materia + materia

  // Resumen semanal calculado desde agenda_profesional (ver agendaProfesional.ts)
  bloquesPorDia: Record<number, string[]>;

  // ── Campos calculados para la ficha / tarjetas de estadísticas ─────────────
  // BACKEND: GET /api/profesores/:id/turnos?desde=...&hasta=... → total de
  // turnos programados y presentismo derivado de la tabla `turno`.
  turnosProgramados?: number;
  presentismo?: number; // porcentaje (0-100)

  // BACKEND: el CHECK global ck_profesor_capacidad (1-10) no tiene columna en
  // el dump (inconsistencia detectada en el brief). El front usa
  // profesor_materia.capacidad_maxima; este campo refleja el máximo de las
  // capacidades por materia o el valor global elegido en el formulario.
  capacidadDefault?: number;
}

export interface UsuarioSinFicha {
  id: number; // usuario.id (rol Profesor, sin profesor asociado, activo)
  nombre: string;
  apellido: string;
  email: string;
}

export const PROFESORES: Profesor[] = [
  {
    id: 1,
    usuarioId: 11,
    nombre: "Roberto",
    apellido: "Peralta",
    email: "r.peralta@academia.edu",
    telefono: "1155555555",
    tituloEspecialidad: "Lic. en Matemática",
    materias: [
      {
        materia: { id: 1, nombre: "Análisis Matemático I", nivel: "Universitario", duracionClaseMinutos: 90 },
        capacidadMaxima: 5,
      },
      {
        materia: { id: 3, nombre: "Álgebra Lineal", nivel: "Universitario", duracionClaseMinutos: 90 },
        capacidadMaxima: 5,
      },
    ],
    estado: "activo",
    fechaCreacion: "2024-03-15",
    bloquesPorDia: {
      1: ["08:00-12:00"],
      3: ["08:00-13:30"],
      5: ["14:00-18:30"],
    },
    turnosProgramados: 38,
    presentismo: 98.5,
  },
  {
    id: 2,
    usuarioId: 12,
    nombre: "Elena",
    apellido: "Vásquez",
    email: "e.vasquez@academia.edu",
    telefono: "1166661234",
    tituloEspecialidad: "Dra. en Física",
    materias: [
      {
        materia: { id: 2, nombre: "Física I", nivel: "Universitario", duracionClaseMinutos: 90 },
        capacidadMaxima: 3,
      },
      {
        materia: { id: 4, nombre: "Física II", nivel: "Universitario", duracionClaseMinutos: 90 },
        capacidadMaxima: 3,
      },
    ],
    estado: "activo",
    fechaCreacion: "2024-05-02",
    bloquesPorDia: {
      1: ["08:00-12:00"],
      2: ["08:00-12:00"],
      4: ["14:00-18:00"],
    },
    turnosProgramados: 22,
    presentismo: 96,
  },
  {
    id: 3,
    usuarioId: 13,
    nombre: "Gabriel",
    apellido: "Menéndez",
    email: "g.menendez@academia.edu",
    telefono: "1177772233",
    tituloEspecialidad: "Prof. en Matemática",
    materias: [
      {
        materia: { id: 3, nombre: "Álgebra Lineal", nivel: "Universitario", duracionClaseMinutos: 90 },
        capacidadMaxima: 4,
      },
    ],
    estado: "activo",
    fechaCreacion: "2024-07-18",
    bloquesPorDia: {
      2: ["10:00-13:00"],
      5: ["08:00-10:00"],
      6: ["10:00-12:00"],
    },
    turnosProgramados: 15,
    presentismo: 99,
  },
  {
    id: 4,
    usuarioId: 14,
    nombre: "Silvina",
    apellido: "Arrieta",
    email: "s.arrieta@academia.edu",
    telefono: "1188884455",
    tituloEspecialidad: "Lic. en Química",
    materias: [
      {
        materia: { id: 5, nombre: "Química General", nivel: "Universitario", duracionClaseMinutos: 45 },
        capacidadMaxima: 6,
      },
    ],
    estado: "inactivo",
    fechaCreacion: "2023-11-09",
    bloquesPorDia: { 3: ["09:00-12:00"], 4: ["09:00-12:00"] },
    turnosProgramados: 8,
    presentismo: 100,
  },
];

// Catálogo de materias activas (para el Combobox del formulario).
// BACKEND: GET /api/materias?estado=activo
export const MATERIAS_CATALOGO: MateriaRef[] = [
  { id: 1, nombre: "Análisis Matemático I", nivel: "Universitario", duracionClaseMinutos: 90 },
  { id: 2, nombre: "Física I", nivel: "Universitario", duracionClaseMinutos: 90 },
  { id: 3, nombre: "Álgebra Lineal", nivel: "Universitario", duracionClaseMinutos: 90 },
  { id: 4, nombre: "Física II", nivel: "Universitario", duracionClaseMinutos: 90 },
  { id: 5, nombre: "Química General", nivel: "Universitario", duracionClaseMinutos: 45 },
];

// Usuarios con rol Profesor, activos y SIN ficha de profesor (Combobox "Usuario asociado").
// BACKEND: GET /api/usuarios?rol=profesor&sin-ficha=true
export const USUARIOS_SIN_FICHA: UsuarioSinFicha[] = [
  { id: 15, nombre: "Marta", apellido: "Ríos", email: "m.rios@academia.edu" },
  { id: 16, nombre: "Diego", apellido: "López", email: "d.lopez@academia.edu" },
  { id: 17, nombre: "Paula", apellido: "González", email: "p.gonzalez@academia.edu" },
];

// Turnos futuros NO cancelados por profesor (bloquean la baja lógica).
// BACKEND: GET /api/profesores/:id/turnos-futuros (WHERE estado='Reservado' AND fecha >= hoy)
export const TURNOS_FUTUROS_POR_PROFESOR: Record<number, number> = {
  1: 3, // Roberto Peralta tiene 3 turnos Reservados futuros → baja bloqueada
  2: 0,
  3: 1,
  4: 0,
};

// Turnos de la semana demo para la grilla de AgendaSemanalModal.
// BACKEND: GET /api/profesores/:id/turnos?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
//   (WHERE estado='Reservado' AND fecha BETWEEN ...) con alumno + materia.
//   Las horas coinciden con los inicios de franja de la grilla (1.5 h).
export interface TurnoSemana {
  id: number; // turno.id
  profesorId: number; // FK → profesor.id
  dia: number; // 1-6 (ISO, Lun-Sáb)
  horaInicio: string; // "HH:MM"
  alumno: string;
  materia: string;
  cuposUsados: number;
  cuposMax: number;
}

export const TURNOS_SEMANA: TurnoSemana[] = [
  { id: 1, profesorId: 1, dia: 1, horaInicio: "08:30", alumno: "Camila Ross", materia: "Análisis Matemático I", cuposUsados: 3, cuposMax: 4 },
  { id: 2, profesorId: 1, dia: 2, horaInicio: "08:30", alumno: "M. Fernández", materia: "Física II", cuposUsados: 1, cuposMax: 4 },
  { id: 3, profesorId: 1, dia: 3, horaInicio: "14:00", alumno: "Martina Paz", materia: "Análisis Matemático I", cuposUsados: 2, cuposMax: 4 },
  { id: 4, profesorId: 1, dia: 4, horaInicio: "08:30", alumno: "Joaquín Soler", materia: "Física I", cuposUsados: 4, cuposMax: 4 },
  { id: 5, profesorId: 1, dia: 5, horaInicio: "10:00", alumno: "L. Gutiérrez", materia: "Análisis Matemático I", cuposUsados: 3, cuposMax: 4 },
  { id: 6, profesorId: 1, dia: 5, horaInicio: "16:00", alumno: "Facundo Ortiz", materia: "Física II", cuposUsados: 2, cuposMax: 4 },
];

// Parámetros de la semana demo de la agenda (fecha fija de los mockups).
// BACKEND: el rango real sale de `?desde=&hasta=` de la consulta de turnos.
export const SEMANA_DEMO = {
  fechas: "21 al 26 de Octubre, 2025",
  horasDisponibles: 11.5, // horas reservables expuestas por la grilla demo
};

// Texto de ejemplo para el estado vacío (listado sin profesores).
export const VACIO_COPY = {
  title: "Todavía no hay docentes cargados",
  description: "Alta tu primer profesor para empezar a asignar materias y disponibilidad.",
  cta: "Nuevo profesor",
};