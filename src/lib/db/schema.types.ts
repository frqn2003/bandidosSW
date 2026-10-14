// ─────────────────────────────────────────────────────────────────────────────
// GENERADO AUTOMÁTICAMENTE — NO EDITAR A MANO.
//
//   Regenerar:  npm run db:types
//   Generador:  scripts/db-types.mjs
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
//   export type ProveedorRow = Pick<
//     Row<"proveedor">,
//     "id" | "razon_social" | "cuit" | "estado"
//   >;
// ─────────────────────────────────────────────────────────────────────────────

// ── Enums ────────────────────────────────────────────────────────────────────

export type EstadoActivoInactivo = "activo" | "inactivo";

export type EstadoCierreCaja = "Cerrada" | "Reabierta";

export type EstadoPago = "Vigente" | "Anulado";

export type EstadoTurno = "Reservado" | "Cancelado" | "Asistió" | "Ausente";

export type ModoAbm = "INSERCION" | "EDICION" | "LECTURA";

export type NivelMateria = "Primario" | "Secundario" | "Universitario";

export type OrigenTurno = "Centro" | "Portal del Alumno";

export type ResponsableCancelacion = "Alumno" | "Profesor" | "Centro";

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
    logo_url: string | null;
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
    legajo: string | null;
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
    institucion_origen: string | null;
    observaciones_generales: string | null;
    usuario_id: number | null;
  };
  alumno_materia_interes: {
    id: number;  // auto (identity)
    alumno_id: number;
    materia_id: number;
  };
  asistencia: {
    id: number;  // auto (default)
    turno_id: number;
    presente: boolean;
    tema_trabajado: string | null;
    observaciones: string | null;
    usuario_id: number;
    registrado_at: Date;  // auto (default)
    modificado_at: Date | null;
    modificado_por: number | null;
    motivo_correccion: string | null;
  };
  auditoria: {
    id: string;  // auto (identity)
    tabla: string;
    operacion: TipoOperacionAuditoria;
    registro_id: number;
    usuario_id: number | null;
    fecha_hora: Date;  // auto (default)
    valores_anteriores: unknown | null;
    valores_nuevos: unknown | null;
  };
  auditoria_sesion: {
    id: string;  // auto (identity)
    usuario_id: number | null;
    evento: TipoEventoSesion;
    fecha_hora: Date;  // auto (default)
    ip_origen: string | null;
    detalle: unknown | null;
  };
  bloqueo_fecha: {
    id: number;  // auto (default)
    fecha_desde: Date;
    fecha_hasta: Date;
    profesor_id: number | null;
    motivo: string;
    estado: EstadoActivoInactivo;  // auto (default)
    usuario_id: number;
    created_at: Date;  // auto (default)
    fecha_baja: Date | null;
    usuario_baja_id: number | null;
  };
  cierre_caja: {
    id: number;  // auto (default)
    fecha: Date;
    estado: EstadoCierreCaja;  // auto (default)
    total_registrado: string;
    efectivo_registrado: string;
    efectivo_contado: string;
    diferencia: string;
    observaciones: string | null;
    cerrado_por: number;
    cerrado_at: Date;  // auto (default)
    reabierto_por: number | null;
    reabierto_at: Date | null;
    motivo_reapertura: string | null;
  };
  forma_pago: {
    id: number;  // auto (identity)
    nombre: string;
    requiere_nro_operacion: boolean;  // auto (default)
    estado: EstadoActivoInactivo;  // auto (default)
    created_at: Date;  // auto (default)
    updated_at: Date;  // auto (default)
    es_efectivo: boolean;  // auto (default)
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
  motivo_baja: {
    id: number;  // auto (identity)
    nombre: string;
    requiere_detalle: boolean;  // auto (default)
    estado: EstadoActivoInactivo;  // auto (default)
    created_at: Date;  // auto (default)
    updated_at: Date;  // auto (default)
  };
  motivo_cancelacion: {
    id: number;  // auto (identity)
    nombre: string;
    requiere_detalle: boolean;  // auto (default)
    estado: EstadoActivoInactivo;  // auto (default)
    created_at: Date;  // auto (default)
    updated_at: Date;  // auto (default)
    responsable: ResponsableCancelacion;  // auto (default)
  };
  nota_alumno: {
    id: number;  // auto (default)
    alumno_id: number;
    texto: string;
    usuario_id: number;
    created_at: Date;  // auto (default)
  };
  pago: {
    id: number;  // auto (identity)
    comprobante: string | null;
    alumno_id: number;
    monto: string;
    fecha_pago: Date;  // auto (default)
    observaciones: string | null;
    usuario_id: number;
    created_at: Date;  // auto (default)
    estado: EstadoPago;  // auto (default)
    anulado_at: Date | null;
    anulado_por: number | null;
    motivo_anulacion: string | null;
  };
  pago_forma_pago: {
    id: number;  // auto (identity)
    pago_id: number;
    forma_pago_id: number;
    nro_operacion: string | null;
    monto: string | null;
  };
  pago_turno: {
    id: number;  // auto (identity)
    pago_id: number;
    turno_id: number;
    importe: string;
    vigente: boolean;  // auto (default)
  };
  parametro: {
    id: number;  // auto (identity)
    clave: string;
    valor: number;
    unidad: string | null;
    descripcion: string | null;
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
    capacidad_maxima: number;  // auto (default)
  };
  rol: {
    id: number;  // auto (identity)
    nombre: string;
  };
  turno: {
    id: number;  // auto (identity)
    codigo: string | null;
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
    cantidad_modificaciones: number;  // auto (default)
    motivo_cancelacion_id: number | null;
    detalle_cancelacion: string | null;
    fecha_cancelacion: Date | null;
    cancelacion_tardia: boolean;  // auto (default)
    pagado: boolean;  // auto (default)
    origen: OrigenTurno;  // auto (default)
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
    auth_id: string;
    intentos_fallidos: number;  // auto (default)
    bloqueado_hasta: Date | null;
    fecha_creacion: Date;  // auto (default)
    "cambiar_contraseña": boolean | null;  // auto (default)
    telefono: string | null;
    motivo_baja_id: number | null;
    detalle_motivo_baja: string | null;
    fecha_baja: Date | null;
    debe_cambiar_password: boolean;  // auto (default)
  };
}

// ── Vistas ──────────────────────────────────────────────────────────────────

export interface DbViews {
  vw_bloqueo_fecha: {
    id: number | null;
    fecha_desde: Date | null;
    fecha_hasta: Date | null;
    profesor_id: number | null;
    profesor: string | null;
    motivo: string | null;
    estado: EstadoActivoInactivo | null;
    usuario_id: number | null;
    created_at: Date | null;
    fecha_baja: Date | null;
    usuario_baja_id: number | null;
  };
  vw_cajas_pendientes: {
    fecha: Date | null;
    pagos_vigentes: string | null;
    total: string | null;
  };
  vw_cierre_caja: {
    id: number | null;
    fecha: Date | null;
    estado: EstadoCierreCaja | null;
    total_registrado: string | null;
    efectivo_registrado: string | null;
    efectivo_contado: string | null;
    diferencia: string | null;
    observaciones: string | null;
    cerrado_por: number | null;
    cerrado_por_nombre: string | null;
    cerrado_at: Date | null;
    reabierto_por: number | null;
    reabierto_por_nombre: string | null;
    reabierto_at: Date | null;
    motivo_reapertura: string | null;
  };
  vw_deuda_clase: {
    turno_id: number | null;
    codigo: string | null;
    alumno_id: number | null;
    fecha: Date | null;
    hora_inicio: string | null;
    materia_id: number | null;
    materia: string | null;
    profesor_id: number | null;
    profesor: string | null;
    estado: EstadoTurno | null;
    importe: string | null;
    dias_antiguedad: number | null;
  };
  vw_historial_alumno: {
    alumno_id: number | null;
    fecha_hora: Date | null;
    orden_evento: number | null;
    tipo: string | null;
    materia_id: number | null;
    materia: string | null;
    profesor_id: number | null;
    profesor: string | null;
    detalle: string | null;
    observaciones: string | null;
    cancelacion_tardia: boolean | null;
    responsable: string | null;
    usuario_id: number | null;
    usuario: string | null;
    turno_id: number | null;
    fecha_clase: Date | null;
    hora_clase: string | null;
  };
  vw_historial_asistencia: {
    turno_id: number | null;
    codigo: string | null;
    alumno_id: number | null;
    fecha: Date | null;
    hora_inicio: string | null;
    materia_id: number | null;
    materia: string | null;
    profesor_id: number | null;
    profesor: string | null;
    estado: EstadoTurno | null;
    tema_trabajado: string | null;
  };
  vw_huecos_disponibles: {
    agenda_profesional_id: number | null;
    profesor_id: number | null;
    fecha: Date | null;
    hueco_inicio: string | null;
    hueco_fin: string | null;
  };
  vw_mis_turnos: {
    alumno_id: number | null;
    turno_id: number | null;
    codigo: string | null;
    fecha: Date | null;
    hora_inicio: string | null;
    hora_fin: string | null;
    materia_id: number | null;
    materia: string | null;
    profesor_id: number | null;
    profesor: string | null;
    estado: EstadoTurno | null;
    origen: OrigenTurno | null;
    es_proximo: boolean | null;
  };
  vw_pago_medio: {
    pago_forma_pago_id: number | null;
    pago_id: number | null;
    comprobante: string | null;
    alumno_id: number | null;
    fecha_pago: Date | null;
    estado: EstadoPago | null;
    usuario_id: number | null;
    forma_pago_id: number | null;
    medio: string | null;
    es_efectivo: boolean | null;
    nro_operacion: string | null;
    monto_medio: string | null;
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** La fila de una tabla: `Row<"proveedor">`. */
export type Row<T extends keyof DbTables> = DbTables[T];

/** La fila de una vista: `ViewRow<"vista_cuenta_corriente_proveedor">`. */
export type ViewRow<T extends keyof DbViews> = DbViews[T];
