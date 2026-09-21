// ─────────────────────────────────────────────────────────────────────────────
// GENERADO AUTOMÁTICAMENTE — NO EDITAR A MANO.
//
//   Fuente:    docs/esquema-bd-front.md (diccionario de datos)
//   Generador: scripts/db-types.mjs (adaptado a esquema Centro Académico)
//
// Describe el esquema REAL de la base, con los tipos que devuelve el driver
// `pg` (ojo: numeric y bigint llegan como string, no como number).
//
// Cómo se usa: los tipos `*Row` de cada módulo se derivan de acá en vez de
// escribirse a mano, así un cambio en la base rompe la compilación en vez de
// fallar en producción.
//
//   import type { Row } from "@/lib/db/schema.types";
//
//   export type AlumnoRow = Pick<
//     Row<"alumno">,
//     "id" | "legajo" | "nombre" | "apellido" | "dni" | "estado"
//   >;
// ─────────────────────────────────────────────────────────────────────────────

// ── Enums ────────────────────────────────────────────────────────────────────

export type EstadoActivoInactivo = "activo" | "inactivo";

export type EstadoTurno = "Reservado" | "Cancelado";

export type ModoAbm = "INSERCION" | "EDICION" | "LECTURA";

export type NivelMateria = "Primario" | "Secundario" | "Universitario";

export type TipoEventoSesion = "login" | "logout" | "login_fallido" | "bloqueado" | "acceso_denegado";

export type TipoOperacionAuditoria = "INSERT" | "UPDATE" | "DELETE";


// ── Tablas ──────────────────────────────────────────────────────────────────

export interface DbTables {
  academia: {
    id: number;  // auto (identity)
    nombre: string;
    direccion: string;
    telefono: string | null;
    estado: EstadoActivoInactivo;  // auto (default)
    created_at: Date;  // auto (default)
    updated_at: Date;  // auto (default)
  };
  agenda: {
    id: number;  // auto (identity)
    academia_id: number;
    nombre: string;  // auto (default)
    estado: EstadoActivoInactivo;  // auto (default)
    created_at: Date;  // auto (default)
  };
  agenda_profesional: {
    id: number;  // auto (identity)
    agenda_semanal_id: number;
    profesor_id: number;
    hora_inicio: string;
    hora_fin: string;
    estado: EstadoActivoInactivo;  // auto (default)
  };
  agenda_semanal: {
    id: number;  // auto (identity)
    agenda_id: number;
    dia_semana: number;
    hora_inicio: string;
    hora_fin: string;
    estado: EstadoActivoInactivo;  // auto (default)
  };
  alumno: {
    id: number;  // auto (identity)
    legajo: string;  // auto (generated stored)
    nombre: string;
    apellido: string;
    dni: string;
    fecha_nacimiento: Date;
    telefono: string;
    email: string | null;
    nivel_educativo: NivelMateria;
    responsable_nombre: string | null;
    responsable_dni: string | null;
    responsable_telefono: string | null;
    estado: EstadoActivoInactivo;  // auto (default)
    created_at: Date;  // auto (default)
    updated_at: Date;  // auto (default)
  };
  auditoria: {
    id: string;  // auto (identity, bigint)
    tabla: string;
    operacion: TipoOperacionAuditoria;
    registro_id: number;
    usuario_id: number | null;
    fecha_hora: Date;  // auto (default)
    valores_anteriores: unknown | null;
    valores_nuevos: unknown | null;
  };
  auditoria_sesion: {
    id: string;  // auto (identity, bigint)
    usuario_id: number | null;
    evento: TipoEventoSesion;
    fecha_hora: Date;  // auto (default)
    ip_origen: string | null;
    detalle: unknown | null;
  };
  materia: {
    id: number;  // auto (identity)
    nombre: string;
    nivel: NivelMateria;
    descripcion: string | null;
    duracion_clase_minutos: number;
    valor_clase: string;
    estado: EstadoActivoInactivo;  // auto (default)
    created_at: Date;  // auto (default)
    updated_at: Date;  // auto (default)
  };
  precio_clase: {
    id: number;  // auto (identity)
    profesor_materia_id: number;
    precio: string;
  };
  profesor: {
    id: number;  // auto (identity)
    usuario_id: number;
    titulo_especialidad: string | null;
    telefono: string;
    estado: EstadoActivoInactivo;  // auto (default)
    created_at: Date;  // auto (default)
    updated_at: Date;  // auto (default)
  };
  profesor_materia: {
    id: number;  // auto (identity)
    profesor_id: number;
    materia_id: number;
    capacidad_maxima: number;
  };
  rol: {
    id: number;  // auto (identity)
    nombre: string;
  };
  turno: {
    id: number;  // auto (identity)
    codigo: string;  // auto (generated stored)
    alumno_id: number;
    profesor_id: number;
    materia_id: number;
    fecha: Date;
    hora_inicio: string;
    hora_fin: string;
    valor_clase_congelado: string;
    estado: EstadoTurno;  // auto (default)
    observaciones: string | null;
    usuario_id: number;
    created_at: Date;  // auto (default)
  };
  usuario: {
    id: number;  // auto (identity)
    rol_id: number;
    academia_id: number | null;
    nombre: string;
    apellido: string;
    dni: string;
    email: string;
    estado: EstadoActivoInactivo;  // auto (default)
    auth_id: string | null;
    intentos_fallidos: number;  // auto (default)
    bloqueado_hasta: Date | null;
    fecha_creacion: Date;  // auto (default)
  };
}

// ── Vistas ──────────────────────────────────────────────────────────────────

export interface DbViews {
  vw_huecos_disponibles: {
    agenda_profesional_id: number | null;
    profesor_id: number | null;
    fecha: Date | null;
    hueco_inicio: string | null;
    hueco_fin: string | null;
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** La fila de una tabla: `Row<"alumno">`. */
export type Row<T extends keyof DbTables> = DbTables[T];

/** La fila de una vista: `ViewRow<"vw_huecos_disponibles">`. */
export type ViewRow<T extends keyof DbViews> = DbViews[T];
