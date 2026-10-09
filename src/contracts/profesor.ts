// src/contracts/profesor.ts
//
// CONTRATO DE PROFESOR (tablas `profesor` + `profesor_materia` + `precio_clase`).
//
// Un profesor NO es un usuario nuevo: es un usuario existente con rol "Profesor"
// al que se le agregan los datos de la ficha profesional. Por eso el alta pide
// `usuarioId` y no nombre/apellido/email — esos ya están en el ABM de usuarios
// (src/contracts/usuario.ts) y se devuelven resueltos en la response.
//
// Las materias que dicta viajan en el MISMO body que la ficha: un profesor sin
// materias no existe para el negocio (regla del esquema, validada en el back),
// así que no tiene sentido una segunda pantalla para cargarlas. Cada materia
// lleva su capacidad (profesor_materia.capacidad_maxima) y su precio
// (precio_clase.precio), que es el que se congela en el turno.
//
// Lo que NO está acá:
//  · la disponibilidad horaria → src/contracts/disponibilidad.ts.
//  · `capacidad_maxima_alumnos` a nivel profesor: el dump define el CHECK pero
//    NO la columna (inconsistencia documentada en el diccionario de datos). El
//    contrato usa la capacidad por materia, que sí existe. Si la columna se
//    agrega, se agrega acá primero.

import { z } from "zod";


// ─── 1. Rutas ────────────────────────────────────────────────────────────
//   GET    RUTA                 → listar (acepta los filtros de abajo)
//   POST   RUTA                 → crear la ficha profesional
//   GET    rutaProfesor(id)     → detalle (con materias y precios)
//   PUT    rutaProfesor(id)     → editar ficha + materias (reemplaza la lista)
//   POST   rutaInactivar(id)    → baja lógica (estado = 'inactivo')
//   GET    rutaCandidatos       → usuarios que todavía pueden recibir una ficha
//   POST   rutaCandidatos       → alta rápida de un usuario Profesor (solo Gerente)

export const RUTA = "/api/profesores";
export const rutaProfesor = (id: number) => `${RUTA}/${id}`;
export const rutaInactivar = (id: number) => `${RUTA}/${id}/inactivar`;
export const rutaCandidatos = `${RUTA}/candidatos`;


// ─── 2a. Request: filtros del listado ────────────────────────────────────

export const listarProfesoresQuery = z
  .object({
    busqueda: z.string().trim().optional(),          // nombre, apellido o dni del usuario
    materiaId: z.coerce.number().int().positive().optional(),
    academiaId: z.coerce.number().int().positive().optional(),
    diaSemana: z.coerce.number().int().min(1).max(6).optional(), // 1 = lunes ... 6 = sábado
    estado: z.enum(["activo", "inactivo"]).optional(),
    /** Filtra por el usuario vinculado. Permite que el rol Profesor resuelva
     *  su propio profesor.id desde la sesión: GET /api/profesores?usuarioId=X */
    usuarioId: z.coerce.number().int().positive().optional(),
  })
  .strict();


// ─── 2b. Request: alta y edición ─────────────────────────────────────────
// `materias` es la lista COMPLETA: lo que manda el front reemplaza lo que había
// (alta, baja y cambio de precio en una sola operación). `.min(1)` porque un
// profesor tiene que dictar al menos una materia.
// `telefono` son 10 u 11 dígitos sin guiones ni espacios (CHECK de la base).

const materiaDictada = z
  .object({
    materiaId: z.number().int().positive(),
    capacidadMaxima: z.number().int().min(1).max(10),
    /** numeric(12,2) > 0 en la base. Es el precio que se congela al reservar. */
    precio: z.number().positive().max(9_999_999_999.99).multipleOf(0.01),
  })
  .strict();

const camposProfesor = z
  .object({
    tituloEspecialidad: z.string().trim().max(100).nullable().default(null),
    telefono: z
      .string()
      .trim()
      .regex(/^\d{10,11}$/, "El teléfono debe tener 10 u 11 dígitos, sin guiones."),
    materias: z.array(materiaDictada).min(1, "El profesor tiene que dictar al menos una materia."),
  })
  .strict();

export const crearProfesorBody = camposProfesor.extend({
  // El usuario tiene que existir, estar activo, tener rol "Profesor" y academia
  // asignada. Zod solo ve el id → lo valida el back (trg_profesor_validar_usuario
  // es la red de seguridad, pero el mensaje lindo lo da el service).
  usuarioId: z.number().int().positive(),
});

// En la edición el usuario vinculado no se cambia: la relación profesor↔usuario
// es 1 a 1 y reasignarla sería otra ficha. Si el usuario está mal, se da de baja
// la ficha y se crea otra.
export const editarProfesorBody = camposProfesor;


// ─── 2c. Request: alta rápida de usuario candidato ───────────────────────
// Destraba el alta de profesores mientras no exista el módulo /usuarios. El
// back crea la cuenta en Supabase Auth (API de administración) y la fila de
// `usuario` con rol Profesor; la contraseña temporal la genera el back y se
// devuelve UNA sola vez. Rol y academia NO viajan: los fija el back.

export const crearCandidatoBody = z
  .object({
    nombre: z.string().trim().min(1, "Ingresá el nombre.").max(80, "Máximo 80 caracteres."),
    apellido: z.string().trim().min(1, "Ingresá el apellido.").max(80, "Máximo 80 caracteres."),
    dni: z.string().trim().regex(/^\d{7,8}$/, "El DNI debe tener 7 u 8 dígitos, sin puntos."),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .max(120, "Máximo 120 caracteres.")
      .email("Ingresá un email válido."),
  })
  .strict();


// ─── 3. Tipos derivados ──────────────────────────────────────────────────

export type CrearProfesorBody = z.input<typeof crearProfesorBody>;
export type CrearProfesorInput = z.output<typeof crearProfesorBody>;
export type EditarProfesorBody = z.input<typeof editarProfesorBody>;
export type EditarProfesorInput = z.output<typeof editarProfesorBody>;
export type ListarProfesoresQuery = z.output<typeof listarProfesoresQuery>;
export type MateriaDictadaBody = z.input<typeof materiaDictada>;
export type CrearCandidatoBody = z.input<typeof crearCandidatoBody>;
export type CrearCandidatoInput = z.output<typeof crearCandidatoBody>;


// ─── 4. Response ─────────────────────────────────────────────────────────
// `id` de `MateriaDictadaResponse` es el id de `profesor_materia`, no el de la
// materia: es lo que necesita el turno para llegar al precio vigente.

export type NivelMateria = "Primario" | "Secundario" | "Universitario";
export type EstadoProfesor = "activo" | "inactivo";

export type MateriaDictadaResponse = {
  /** profesor_materia.id */
  id: number;
  materia: { id: number; nombre: string; nivel: NivelMateria; duracionClaseMinutos: number };
  capacidadMaxima: number;
  /** number, no string: el mapper convierte el numeric de pg. */
  precio: number;
};

export type ProfesorResponse = {
  id: number;
  usuario: {
    id: number;
    nombre: string;
    apellido: string;
    dni: string;
    email: string;
  };
  /** Sale de usuario.academia_id. Nullable en la base, pero un profesor válido
   *  siempre tiene una: si llega null, la ficha está incompleta. */
  academia: { id: number; nombre: string } | null;
  tituloEspecialidad: string | null;
  telefono: string;
  materias: MateriaDictadaResponse[];
  estado: EstadoProfesor;
  /** ISO 8601. */
  fechaCreacion: string;
  /** ISO 8601. */
  fechaActualizacion: string;
};

/**
 * Usuario con rol "Profesor", activo, con academia y SIN ficha todavía.
 * Alimenta el combo "Usuario asociado" del alta: son los únicos ids que
 * `crearProfesorBody.usuarioId` acepta sin devolver error.
 */
export type CandidatoProfesorResponse = {
  /** usuario.id — es el que viaja como `usuarioId` en el alta. */
  id: number;
  nombre: string;
  apellido: string;
  dni: string;
  email: string;
  academia: { id: number; nombre: string } | null;
};

/**
 * Respuesta del alta rápida. `passwordTemporal` se muestra una sola vez: no
 * se guarda en ningún lado del sistema (vive solo en Supabase Auth, hasheada).
 * En el primer ingreso el usuario la tiene que cambiar (`cambiar_contraseña`).
 */
export type CandidatoCreadoResponse = {
  usuario: CandidatoProfesorResponse;
  passwordTemporal: string;
};

/** Lo que devuelve el combo de profesores (turnos, calendario, disponibilidad). */
export type ProfesorOpcion = {
  id: number;
  nombre: string;
  apellido: string;
};


// ─── 5. Errores de dominio ───────────────────────────────────────────────

export type ErrorProfesor =
  | "USUARIO_YA_ES_PROFESOR"     // 409, profesor.usuario_id es UNIQUE
  | "USUARIO_NO_ES_PROFESOR"     // 422, el usuario no tiene rol "Profesor"
  | "USUARIO_SIN_ACADEMIA"       // 422, un profesor pertenece a una academia
  | "USUARIO_INACTIVO"           // 422
  | "MATERIA_INACTIVA"           // 422, trg_profesor_materia_validar_materia
  | "MATERIA_DUPLICADA"          // 422, la misma materia dos veces en el body
  | "MATERIAS_REQUERIDAS"        // 422, al menos una materia
  | "SIN_DISPONIBILIDAD"         // 422, al menos un bloque horario activo por semana
  | "MATERIA_CON_TURNOS_FUTUROS" // 409, al editar: se quita una materia con turnos
  | "PROFESOR_CON_TURNOS_FUTUROS"// 409, al inactivar
  | "REFERENCIA_INVALIDA"        // 422, usuarioId o materiaId inexistente
  | "NO_ENCONTRADO"              // 404
  | "DATOS_INVALIDOS"            // 422
  // Alta rápida de candidato (POST rutaCandidatos):
  | "ACCESO_DENEGADO"            // 403, solo el Gerente crea usuarios
  | "DNI_DUPLICADO"              // 409, ya hay un usuario activo con ese DNI
  | "EMAIL_DUPLICADO"            // 409, ya hay un usuario activo con ese email
  | "EMAIL_YA_REGISTRADO_EN_AUTH"// 409, el email existe en Supabase Auth pero no en `usuario`
  | "AUTH_NO_DISPONIBLE";        // 503, Supabase Auth no respondió o falta la service role key
