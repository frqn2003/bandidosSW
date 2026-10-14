-- =========================================================
-- Huellitas Felices — schema de la base
-- =========================================================
-- GENERADO AUTOMÁTICAMENTE por  npm run db:dump
-- NO editar a mano: los cambios se hacen en el SQL Editor de Supabase y
-- después se corre el dump de nuevo.
--
-- El archivo corre de arriba a abajo sobre una base vacía y reconstruye
-- todo: enums, secuencias, tablas, constraints, índices, funciones y triggers.
-- =========================================================


-- =========================================================
-- TIPOS ENUMERADOS
-- =========================================================

CREATE TYPE estado_activo_inactivo AS ENUM ('activo', 'inactivo');
CREATE TYPE estado_cierre_caja AS ENUM ('Cerrada', 'Reabierta');
CREATE TYPE estado_pago AS ENUM ('Vigente', 'Anulado');
CREATE TYPE estado_turno AS ENUM ('Reservado', 'Cancelado', 'Asistió', 'Ausente');
CREATE TYPE modo_abm AS ENUM ('INSERCION', 'EDICION', 'LECTURA');
CREATE TYPE nivel_materia AS ENUM ('Primario', 'Secundario', 'Universitario');
CREATE TYPE origen_turno AS ENUM ('Centro', 'Portal del Alumno');
CREATE TYPE responsable_cancelacion AS ENUM ('Alumno', 'Profesor', 'Centro');
CREATE TYPE tipo_evento_sesion AS ENUM ('login', 'logout', 'login_fallido', 'bloqueado', 'acceso_denegado');
CREATE TYPE tipo_operacion_auditoria AS ENUM ('INSERT', 'UPDATE', 'DELETE');


-- =========================================================
-- SECUENCIAS
-- =========================================================

CREATE SEQUENCE IF NOT EXISTS academia_id_seq;
CREATE SEQUENCE IF NOT EXISTS agenda_id_seq;
CREATE SEQUENCE IF NOT EXISTS agenda_profesional_id_seq;
CREATE SEQUENCE IF NOT EXISTS agenda_semanal_id_seq;
CREATE SEQUENCE IF NOT EXISTS alumno_id_seq;
CREATE SEQUENCE IF NOT EXISTS alumno_materia_interes_id_seq;
CREATE SEQUENCE IF NOT EXISTS asistencia_id_seq;
CREATE SEQUENCE IF NOT EXISTS auditoria_id_seq;
CREATE SEQUENCE IF NOT EXISTS auditoria_sesion_id_seq;
CREATE SEQUENCE IF NOT EXISTS bloqueo_fecha_id_seq;
CREATE SEQUENCE IF NOT EXISTS cierre_caja_id_seq;
CREATE SEQUENCE IF NOT EXISTS forma_pago_id_seq;
CREATE SEQUENCE IF NOT EXISTS materia_id_seq;
CREATE SEQUENCE IF NOT EXISTS motivo_baja_id_seq;
CREATE SEQUENCE IF NOT EXISTS motivo_cancelacion_id_seq;
CREATE SEQUENCE IF NOT EXISTS nota_alumno_id_seq;
CREATE SEQUENCE IF NOT EXISTS pago_forma_pago_id_seq;
CREATE SEQUENCE IF NOT EXISTS pago_id_seq;
CREATE SEQUENCE IF NOT EXISTS pago_turno_id_seq;
CREATE SEQUENCE IF NOT EXISTS parametro_id_seq;
CREATE SEQUENCE IF NOT EXISTS precio_clase_id_seq;
CREATE SEQUENCE IF NOT EXISTS profesor_id_seq;
CREATE SEQUENCE IF NOT EXISTS profesor_materia_id_seq;
CREATE SEQUENCE IF NOT EXISTS rol_id_seq;
CREATE SEQUENCE IF NOT EXISTS turno_id_seq;
CREATE SEQUENCE IF NOT EXISTS usuario_id_seq;


-- =========================================================
-- TABLAS
-- =========================================================

CREATE TABLE academia (
  id integer(32,0) NOT NULL,
  nombre character varying(100) NOT NULL,
  direccion character varying(255) NOT NULL,
  telefono character varying(30),
  estado estado_activo_inactivo DEFAULT 'activo'::estado_activo_inactivo NOT NULL,
  created_at timestamp without time zone DEFAULT now() NOT NULL,
  updated_at timestamp without time zone DEFAULT now() NOT NULL,
  logo_url character varying(500)
);

CREATE TABLE agenda (
  id integer(32,0) NOT NULL,
  academia_id integer(32,0) NOT NULL,
  nombre character varying(100) DEFAULT 'Agenda principal'::character varying NOT NULL,
  estado estado_activo_inactivo DEFAULT 'activo'::estado_activo_inactivo NOT NULL,
  created_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE agenda_profesional (
  id integer(32,0) NOT NULL,
  agenda_semanal_id integer(32,0) NOT NULL,
  profesor_id integer(32,0) NOT NULL,
  hora_inicio time without time zone NOT NULL,
  hora_fin time without time zone NOT NULL,
  estado estado_activo_inactivo DEFAULT 'activo'::estado_activo_inactivo NOT NULL
);

CREATE TABLE agenda_semanal (
  id integer(32,0) NOT NULL,
  agenda_id integer(32,0) NOT NULL,
  dia_semana smallint(16,0) NOT NULL,
  hora_inicio time without time zone NOT NULL,
  hora_fin time without time zone NOT NULL,
  estado estado_activo_inactivo DEFAULT 'activo'::estado_activo_inactivo NOT NULL
);

CREATE TABLE alumno (
  id integer(32,0) NOT NULL,
  legajo character varying(20),
  nombre character varying(50) NOT NULL,
  apellido character varying(50) NOT NULL,
  dni character varying(8) NOT NULL,
  fecha_nacimiento date NOT NULL,
  telefono character varying(11) NOT NULL,
  email character varying(120),
  nivel_educativo nivel_materia NOT NULL,
  responsable_nombre character varying(100),
  responsable_dni character varying(8),
  responsable_telefono character varying(11),
  estado estado_activo_inactivo DEFAULT 'activo'::estado_activo_inactivo NOT NULL,
  created_at timestamp without time zone DEFAULT now() NOT NULL,
  updated_at timestamp without time zone DEFAULT now() NOT NULL,
  institucion_origen character varying(100),
  observaciones_generales character varying(250),
  usuario_id integer(32,0)
);

CREATE TABLE alumno_materia_interes (
  id integer(32,0) NOT NULL,
  alumno_id integer(32,0) NOT NULL,
  materia_id integer(32,0) NOT NULL
);

CREATE TABLE asistencia (
  id integer(32,0) DEFAULT nextval('asistencia_id_seq'::regclass) NOT NULL,
  turno_id integer(32,0) NOT NULL,
  presente boolean NOT NULL,
  tema_trabajado character varying(250),
  observaciones character varying(500),
  usuario_id integer(32,0) NOT NULL,
  registrado_at timestamp with time zone DEFAULT now() NOT NULL,
  modificado_at timestamp with time zone,
  modificado_por integer(32,0),
  motivo_correccion character varying(250)
);

CREATE TABLE auditoria (
  id bigint(64,0) NOT NULL,
  tabla character varying(50) NOT NULL,
  operacion tipo_operacion_auditoria NOT NULL,
  registro_id integer(32,0) NOT NULL,
  usuario_id integer(32,0),
  fecha_hora timestamp without time zone DEFAULT now() NOT NULL,
  valores_anteriores jsonb,
  valores_nuevos jsonb
);

CREATE TABLE auditoria_sesion (
  id bigint(64,0) NOT NULL,
  usuario_id integer(32,0),
  evento tipo_evento_sesion NOT NULL,
  fecha_hora timestamp without time zone DEFAULT now() NOT NULL,
  ip_origen inet,
  detalle jsonb
);

CREATE TABLE bloqueo_fecha (
  id integer(32,0) DEFAULT nextval('bloqueo_fecha_id_seq'::regclass) NOT NULL,
  fecha_desde date NOT NULL,
  fecha_hasta date NOT NULL,
  profesor_id integer(32,0),
  motivo character varying(100) NOT NULL,
  estado estado_activo_inactivo DEFAULT 'activo'::estado_activo_inactivo NOT NULL,
  usuario_id integer(32,0) NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  fecha_baja timestamp with time zone,
  usuario_baja_id integer(32,0)
);

CREATE TABLE cierre_caja (
  id integer(32,0) DEFAULT nextval('cierre_caja_id_seq'::regclass) NOT NULL,
  fecha date NOT NULL,
  estado estado_cierre_caja DEFAULT 'Cerrada'::estado_cierre_caja NOT NULL,
  total_registrado numeric(12,2) NOT NULL,
  efectivo_registrado numeric(12,2) NOT NULL,
  efectivo_contado numeric(12,2) NOT NULL,
  diferencia numeric(12,2) NOT NULL,
  observaciones character varying(250),
  cerrado_por integer(32,0) NOT NULL,
  cerrado_at timestamp with time zone DEFAULT now() NOT NULL,
  reabierto_por integer(32,0),
  reabierto_at timestamp with time zone,
  motivo_reapertura character varying(250)
);

CREATE TABLE forma_pago (
  id integer(32,0) NOT NULL,
  nombre character varying(50) NOT NULL,
  requiere_nro_operacion boolean DEFAULT true NOT NULL,
  estado estado_activo_inactivo DEFAULT 'activo'::estado_activo_inactivo NOT NULL,
  created_at timestamp without time zone DEFAULT now() NOT NULL,
  updated_at timestamp without time zone DEFAULT now() NOT NULL,
  es_efectivo boolean DEFAULT false NOT NULL
);

CREATE TABLE materia (
  id integer(32,0) NOT NULL,
  nombre character varying(80) NOT NULL,
  nivel nivel_materia NOT NULL,
  descripcion character varying(250),
  duracion_clase_minutos smallint(16,0) NOT NULL,
  valor_clase numeric(12,2) NOT NULL,
  estado estado_activo_inactivo DEFAULT 'activo'::estado_activo_inactivo NOT NULL,
  created_at timestamp without time zone DEFAULT now() NOT NULL,
  updated_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE motivo_baja (
  id integer(32,0) NOT NULL,
  nombre character varying(50) NOT NULL,
  requiere_detalle boolean DEFAULT false NOT NULL,
  estado estado_activo_inactivo DEFAULT 'activo'::estado_activo_inactivo NOT NULL,
  created_at timestamp without time zone DEFAULT now() NOT NULL,
  updated_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE motivo_cancelacion (
  id integer(32,0) NOT NULL,
  nombre character varying(50) NOT NULL,
  requiere_detalle boolean DEFAULT false NOT NULL,
  estado estado_activo_inactivo DEFAULT 'activo'::estado_activo_inactivo NOT NULL,
  created_at timestamp without time zone DEFAULT now() NOT NULL,
  updated_at timestamp without time zone DEFAULT now() NOT NULL,
  responsable responsable_cancelacion DEFAULT 'Alumno'::responsable_cancelacion NOT NULL
);

CREATE TABLE nota_alumno (
  id integer(32,0) DEFAULT nextval('nota_alumno_id_seq'::regclass) NOT NULL,
  alumno_id integer(32,0) NOT NULL,
  texto character varying(500) NOT NULL,
  usuario_id integer(32,0) NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE pago (
  id integer(32,0) NOT NULL,
  comprobante character varying(20),
  alumno_id integer(32,0) NOT NULL,
  monto numeric(12,2) NOT NULL,
  fecha_pago date DEFAULT ((now() AT TIME ZONE 'America/Argentina/Buenos_Aires'::text))::date NOT NULL,
  observaciones character varying(200),
  usuario_id integer(32,0) NOT NULL,
  created_at timestamp without time zone DEFAULT now() NOT NULL,
  estado estado_pago DEFAULT 'Vigente'::estado_pago NOT NULL,
  anulado_at timestamp with time zone,
  anulado_por integer(32,0),
  motivo_anulacion character varying(250)
);

CREATE TABLE pago_forma_pago (
  id integer(32,0) NOT NULL,
  pago_id integer(32,0) NOT NULL,
  forma_pago_id integer(32,0) NOT NULL,
  nro_operacion character varying(30),
  monto numeric(12,2)
);

CREATE TABLE pago_turno (
  id integer(32,0) NOT NULL,
  pago_id integer(32,0) NOT NULL,
  turno_id integer(32,0) NOT NULL,
  importe numeric(12,2) NOT NULL,
  vigente boolean DEFAULT true NOT NULL
);

CREATE TABLE parametro (
  id integer(32,0) NOT NULL,
  clave character varying(60) NOT NULL,
  valor integer(32,0) NOT NULL,
  unidad character varying(20),
  descripcion character varying(200),
  created_at timestamp without time zone DEFAULT now() NOT NULL,
  updated_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE precio_clase (
  id integer(32,0) NOT NULL,
  profesor_materia_id integer(32,0) NOT NULL,
  precio numeric(12,2) NOT NULL
);

CREATE TABLE profesor (
  id integer(32,0) NOT NULL,
  usuario_id integer(32,0) NOT NULL,
  titulo_especialidad character varying(100),
  telefono character varying(11) NOT NULL,
  estado estado_activo_inactivo DEFAULT 'activo'::estado_activo_inactivo NOT NULL,
  created_at timestamp without time zone DEFAULT now() NOT NULL,
  updated_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE profesor_materia (
  id integer(32,0) NOT NULL,
  profesor_id integer(32,0) NOT NULL,
  materia_id integer(32,0) NOT NULL,
  capacidad_maxima integer(32,0) DEFAULT 1 NOT NULL
);

CREATE TABLE rol (
  id integer(32,0) NOT NULL,
  nombre character varying(50) NOT NULL
);

CREATE TABLE turno (
  id integer(32,0) NOT NULL,
  codigo character varying(20),
  alumno_id integer(32,0) NOT NULL,
  profesor_id integer(32,0) NOT NULL,
  materia_id integer(32,0) NOT NULL,
  fecha date NOT NULL,
  hora_inicio time without time zone NOT NULL,
  hora_fin time without time zone NOT NULL,
  valor_clase_congelado numeric(12,2) NOT NULL,
  estado estado_turno DEFAULT 'Reservado'::estado_turno NOT NULL,
  observaciones character varying(250),
  usuario_id integer(32,0) NOT NULL,
  created_at timestamp without time zone DEFAULT now() NOT NULL,
  cantidad_modificaciones smallint(16,0) DEFAULT 0 NOT NULL,
  motivo_cancelacion_id integer(32,0),
  detalle_cancelacion character varying(200),
  fecha_cancelacion timestamp without time zone,
  cancelacion_tardia boolean DEFAULT false NOT NULL,
  pagado boolean DEFAULT false NOT NULL,
  origen origen_turno DEFAULT 'Centro'::origen_turno NOT NULL
);

CREATE TABLE usuario (
  id integer(32,0) NOT NULL,
  rol_id integer(32,0) NOT NULL,
  academia_id integer(32,0),
  nombre character varying(80) NOT NULL,
  apellido character varying(80) NOT NULL,
  dni character varying(20) NOT NULL,
  email character varying(120) NOT NULL,
  estado estado_activo_inactivo DEFAULT 'activo'::estado_activo_inactivo NOT NULL,
  auth_id uuid NOT NULL,
  intentos_fallidos smallint(16,0) DEFAULT 0 NOT NULL,
  bloqueado_hasta timestamp with time zone,
  fecha_creacion timestamp without time zone DEFAULT now() NOT NULL,
  cambiar_contraseña boolean DEFAULT true,
  telefono character varying(11),
  motivo_baja_id integer(32,0),
  detalle_motivo_baja character varying(200),
  fecha_baja timestamp without time zone,
  debe_cambiar_password boolean DEFAULT true NOT NULL
);


-- =========================================================
-- CLAVES PRIMARIAS, ÚNICOS Y CHECKS
-- =========================================================

ALTER TABLE academia ADD CONSTRAINT academia_pkey PRIMARY KEY (id);
ALTER TABLE agenda ADD CONSTRAINT agenda_pkey PRIMARY KEY (id);
ALTER TABLE agenda ADD CONSTRAINT agenda_academia_id_key UNIQUE (academia_id);
ALTER TABLE agenda_profesional ADD CONSTRAINT ck_agenda_profesional_30min CHECK (((EXTRACT(minute FROM hora_inicio) = ANY (ARRAY[(0)::numeric, (30)::numeric])) AND (EXTRACT(second FROM hora_inicio) = (0)::numeric) AND (EXTRACT(minute FROM hora_fin) = ANY (ARRAY[(0)::numeric, (30)::numeric])) AND (EXTRACT(second FROM hora_fin) = (0)::numeric)));
ALTER TABLE agenda_profesional ADD CONSTRAINT ck_agenda_profesional_rango CHECK ((hora_fin > hora_inicio));
ALTER TABLE agenda_profesional ADD CONSTRAINT agenda_profesional_pkey PRIMARY KEY (id);
ALTER TABLE agenda_profesional ADD CONSTRAINT ex_agenda_profesional_sin_superposicion EXCLUDE USING gist (profesor_id WITH =, agenda_semanal_id WITH =, tsrange(('2000-01-01'::date + hora_inicio), ('2000-01-01'::date + hora_fin)) WITH &&) WHERE ((estado = 'activo'::estado_activo_inactivo));
ALTER TABLE agenda_semanal ADD CONSTRAINT ck_agenda_semanal_dia CHECK (((dia_semana >= 1) AND (dia_semana <= 6)));
ALTER TABLE agenda_semanal ADD CONSTRAINT ck_agenda_semanal_rango CHECK ((hora_fin > hora_inicio));
ALTER TABLE agenda_semanal ADD CONSTRAINT agenda_semanal_pkey PRIMARY KEY (id);
ALTER TABLE agenda_semanal ADD CONSTRAINT ex_agenda_semanal_sin_superposicion EXCLUDE USING gist (agenda_id WITH =, dia_semana WITH =, tsrange(('2000-01-01'::date + hora_inicio), ('2000-01-01'::date + hora_fin)) WITH &&) WHERE ((estado = 'activo'::estado_activo_inactivo));
ALTER TABLE alumno ADD CONSTRAINT ck_alumno_dni CHECK (((dni)::text ~ '^[0-9]{7,8}$'::text));
ALTER TABLE alumno ADD CONSTRAINT ck_alumno_email CHECK (((email IS NULL) OR ((email)::text ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'::text)));
ALTER TABLE alumno ADD CONSTRAINT ck_alumno_fecha_nacimiento CHECK ((fecha_nacimiento <= ((now() AT TIME ZONE 'America/Argentina/Buenos_Aires'::text))::date));
ALTER TABLE alumno ADD CONSTRAINT ck_alumno_responsable_dni CHECK (((responsable_dni IS NULL) OR ((responsable_dni)::text ~ '^[0-9]{7,8}$'::text)));
ALTER TABLE alumno ADD CONSTRAINT ck_alumno_responsable_menor CHECK (((age((((now() AT TIME ZONE 'America/Argentina/Buenos_Aires'::text))::date)::timestamp without time zone, (fecha_nacimiento)::timestamp without time zone) >= '18 years'::interval) OR ((responsable_nombre IS NOT NULL) AND (responsable_dni IS NOT NULL) AND (responsable_telefono IS NOT NULL))));
ALTER TABLE alumno ADD CONSTRAINT ck_alumno_responsable_tel CHECK (((responsable_telefono IS NULL) OR ((responsable_telefono)::text ~ '^[0-9]{10,11}$'::text)));
ALTER TABLE alumno ADD CONSTRAINT ck_alumno_telefono CHECK (((telefono)::text ~ '^[0-9]{10,11}$'::text));
ALTER TABLE alumno ADD CONSTRAINT alumno_pkey PRIMARY KEY (id);
ALTER TABLE alumno_materia_interes ADD CONSTRAINT alumno_materia_interes_pkey PRIMARY KEY (id);
ALTER TABLE alumno_materia_interes ADD CONSTRAINT uq_alumno_materia_interes UNIQUE (alumno_id, materia_id);
ALTER TABLE asistencia ADD CONSTRAINT ck_asistencia_motivo CHECK (((motivo_correccion IS NULL) OR (btrim((motivo_correccion)::text) <> ''::text)));
ALTER TABLE asistencia ADD CONSTRAINT ck_asistencia_tema CHECK (((NOT presente) OR (btrim((COALESCE(tema_trabajado, ''::character varying))::text) <> ''::text)));
ALTER TABLE asistencia ADD CONSTRAINT asistencia_pkey PRIMARY KEY (id);
ALTER TABLE asistencia ADD CONSTRAINT uq_asistencia_turno UNIQUE (turno_id);
ALTER TABLE auditoria ADD CONSTRAINT ck_auditoria_valores CHECK ((((operacion = 'INSERT'::tipo_operacion_auditoria) AND (valores_anteriores IS NULL) AND (valores_nuevos IS NOT NULL)) OR ((operacion = 'UPDATE'::tipo_operacion_auditoria) AND (valores_anteriores IS NOT NULL) AND (valores_nuevos IS NOT NULL)) OR ((operacion = 'DELETE'::tipo_operacion_auditoria) AND (valores_anteriores IS NOT NULL) AND (valores_nuevos IS NULL))));
ALTER TABLE auditoria ADD CONSTRAINT auditoria_pkey PRIMARY KEY (id);
ALTER TABLE auditoria_sesion ADD CONSTRAINT auditoria_sesion_pkey PRIMARY KEY (id);
ALTER TABLE bloqueo_fecha ADD CONSTRAINT ck_bloqueo_baja CHECK ((((estado = 'activo'::estado_activo_inactivo) AND (fecha_baja IS NULL) AND (usuario_baja_id IS NULL)) OR ((estado = 'inactivo'::estado_activo_inactivo) AND (fecha_baja IS NOT NULL) AND (usuario_baja_id IS NOT NULL))));
ALTER TABLE bloqueo_fecha ADD CONSTRAINT ck_bloqueo_motivo CHECK ((btrim((motivo)::text) <> ''::text));
ALTER TABLE bloqueo_fecha ADD CONSTRAINT ck_bloqueo_rango CHECK ((fecha_hasta >= fecha_desde));
ALTER TABLE bloqueo_fecha ADD CONSTRAINT bloqueo_fecha_pkey PRIMARY KEY (id);
ALTER TABLE cierre_caja ADD CONSTRAINT ck_cierre_contado CHECK ((efectivo_contado >= (0)::numeric));
ALTER TABLE cierre_caja ADD CONSTRAINT ck_cierre_observaciones CHECK (((diferencia = (0)::numeric) OR (btrim((COALESCE(observaciones, ''::character varying))::text) <> ''::text)));
ALTER TABLE cierre_caja ADD CONSTRAINT ck_cierre_reapertura CHECK ((((estado = 'Cerrada'::estado_cierre_caja) AND (reabierto_por IS NULL) AND (reabierto_at IS NULL) AND (motivo_reapertura IS NULL)) OR ((estado = 'Reabierta'::estado_cierre_caja) AND (reabierto_por IS NOT NULL) AND (reabierto_at IS NOT NULL) AND (btrim((COALESCE(motivo_reapertura, ''::character varying))::text) <> ''::text))));
ALTER TABLE cierre_caja ADD CONSTRAINT cierre_caja_pkey PRIMARY KEY (id);
ALTER TABLE forma_pago ADD CONSTRAINT ck_forma_pago_nombre CHECK ((btrim((nombre)::text) <> ''::text));
ALTER TABLE forma_pago ADD CONSTRAINT forma_pago_pkey PRIMARY KEY (id);
ALTER TABLE materia ADD CONSTRAINT ck_materia_duracion CHECK ((duracion_clase_minutos = ANY (ARRAY[30, 45, 60, 90, 120])));
ALTER TABLE materia ADD CONSTRAINT ck_materia_nombre CHECK ((btrim((nombre)::text) <> ''::text));
ALTER TABLE materia ADD CONSTRAINT ck_materia_valor CHECK ((valor_clase > (0)::numeric));
ALTER TABLE materia ADD CONSTRAINT materia_pkey PRIMARY KEY (id);
ALTER TABLE motivo_baja ADD CONSTRAINT ck_motivo_baja_nombre CHECK ((btrim((nombre)::text) <> ''::text));
ALTER TABLE motivo_baja ADD CONSTRAINT motivo_baja_pkey PRIMARY KEY (id);
ALTER TABLE motivo_cancelacion ADD CONSTRAINT ck_motivo_cancelacion_nombre CHECK ((btrim((nombre)::text) <> ''::text));
ALTER TABLE motivo_cancelacion ADD CONSTRAINT motivo_cancelacion_pkey PRIMARY KEY (id);
ALTER TABLE nota_alumno ADD CONSTRAINT ck_nota_alumno_texto CHECK ((btrim((texto)::text) <> ''::text));
ALTER TABLE nota_alumno ADD CONSTRAINT nota_alumno_pkey PRIMARY KEY (id);
ALTER TABLE pago ADD CONSTRAINT ck_pago_anulacion CHECK ((((estado = 'Vigente'::estado_pago) AND (anulado_at IS NULL) AND (anulado_por IS NULL) AND (motivo_anulacion IS NULL)) OR ((estado = 'Anulado'::estado_pago) AND (anulado_at IS NOT NULL) AND (anulado_por IS NOT NULL) AND (btrim((COALESCE(motivo_anulacion, ''::character varying))::text) <> ''::text))));
ALTER TABLE pago ADD CONSTRAINT ck_pago_fecha_futura CHECK ((fecha_pago <= ((now() AT TIME ZONE 'America/Argentina/Buenos_Aires'::text))::date));
ALTER TABLE pago ADD CONSTRAINT ck_pago_monto CHECK ((monto > (0)::numeric));
ALTER TABLE pago ADD CONSTRAINT pago_pkey PRIMARY KEY (id);
ALTER TABLE pago ADD CONSTRAINT trg_pago_validar_consistencia TRIGGER DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE pago ADD CONSTRAINT uq_pago_comprobante UNIQUE (comprobante);
ALTER TABLE pago_forma_pago ADD CONSTRAINT ck_pago_forma_pago_monto CHECK (((monto IS NULL) OR (monto > (0)::numeric)));
ALTER TABLE pago_forma_pago ADD CONSTRAINT ck_pago_forma_pago_nro CHECK (((nro_operacion IS NULL) OR ((nro_operacion)::text ~ '^[A-Za-z0-9]{1,30}$'::text)));
ALTER TABLE pago_forma_pago ADD CONSTRAINT pago_forma_pago_pkey PRIMARY KEY (id);
ALTER TABLE pago_forma_pago ADD CONSTRAINT uq_pago_forma_pago UNIQUE (pago_id, forma_pago_id);
ALTER TABLE pago_turno ADD CONSTRAINT ck_pago_turno_importe CHECK ((importe > (0)::numeric));
ALTER TABLE pago_turno ADD CONSTRAINT pago_turno_pkey PRIMARY KEY (id);
ALTER TABLE parametro ADD CONSTRAINT ck_parametro_clave CHECK ((btrim((clave)::text) <> ''::text));
ALTER TABLE parametro ADD CONSTRAINT ck_parametro_valor CHECK ((valor >= 0));
ALTER TABLE parametro ADD CONSTRAINT parametro_pkey PRIMARY KEY (id);
ALTER TABLE parametro ADD CONSTRAINT uq_parametro_clave UNIQUE (clave);
ALTER TABLE precio_clase ADD CONSTRAINT ck_precio_clase_valor CHECK ((precio > (0)::numeric));
ALTER TABLE precio_clase ADD CONSTRAINT precio_clase_pkey PRIMARY KEY (id);
ALTER TABLE profesor ADD CONSTRAINT ck_profesor_telefono CHECK (((telefono)::text ~ '^[0-9]{10,11}$'::text));
ALTER TABLE profesor ADD CONSTRAINT profesor_pkey PRIMARY KEY (id);
ALTER TABLE profesor ADD CONSTRAINT profesor_usuario_id_key UNIQUE (usuario_id);
ALTER TABLE profesor_materia ADD CONSTRAINT ck_profesor_materia_capacidad CHECK ((capacidad_maxima > 0));
ALTER TABLE profesor_materia ADD CONSTRAINT profesor_materia_pkey PRIMARY KEY (id);
ALTER TABLE profesor_materia ADD CONSTRAINT uq_profesor_materia UNIQUE (profesor_id, materia_id);
ALTER TABLE rol ADD CONSTRAINT rol_pkey PRIMARY KEY (id);
ALTER TABLE rol ADD CONSTRAINT rol_nombre_key UNIQUE (nombre);
ALTER TABLE turno ADD CONSTRAINT ck_turno_cancelacion CHECK ((((estado = ANY (ARRAY['Reservado'::estado_turno, 'Asistió'::estado_turno, 'Ausente'::estado_turno])) AND (motivo_cancelacion_id IS NULL) AND (detalle_cancelacion IS NULL) AND (fecha_cancelacion IS NULL) AND (cancelacion_tardia = false)) OR ((estado = 'Cancelado'::estado_turno) AND (motivo_cancelacion_id IS NOT NULL) AND (fecha_cancelacion IS NOT NULL)))) NOT VALID;
ALTER TABLE turno ADD CONSTRAINT ck_turno_modificaciones CHECK ((cantidad_modificaciones >= 0));
ALTER TABLE turno ADD CONSTRAINT ck_turno_rango CHECK ((hora_fin > hora_inicio));
ALTER TABLE turno ADD CONSTRAINT ck_turno_valor CHECK ((valor_clase_congelado > (0)::numeric));
ALTER TABLE turno ADD CONSTRAINT turno_pkey PRIMARY KEY (id);
ALTER TABLE turno ADD CONSTRAINT ex_turno_alumno_sin_superposicion EXCLUDE USING gist (alumno_id WITH =, tsrange((fecha + hora_inicio), (fecha + hora_fin)) WITH &&) WHERE ((estado <> 'Cancelado'::estado_turno));
ALTER TABLE usuario ADD CONSTRAINT ck_usuario_baja CHECK ((((estado = 'activo'::estado_activo_inactivo) AND (motivo_baja_id IS NULL) AND (detalle_motivo_baja IS NULL) AND (fecha_baja IS NULL)) OR ((estado = 'inactivo'::estado_activo_inactivo) AND (motivo_baja_id IS NOT NULL) AND (fecha_baja IS NOT NULL))));
ALTER TABLE usuario ADD CONSTRAINT ck_usuario_dni CHECK (((dni)::text ~ '^[0-9]{7,8}$'::text));
ALTER TABLE usuario ADD CONSTRAINT ck_usuario_email CHECK (((email)::text ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'::text));
ALTER TABLE usuario ADD CONSTRAINT ck_usuario_intentos_fallidos CHECK (((intentos_fallidos >= 0) AND (intentos_fallidos <= 5)));
ALTER TABLE usuario ADD CONSTRAINT ck_usuario_telefono CHECK (((telefono IS NULL) OR ((telefono)::text ~ '^[0-9]{10,11}$'::text)));
ALTER TABLE usuario ADD CONSTRAINT usuario_pkey PRIMARY KEY (id);
ALTER TABLE usuario ADD CONSTRAINT usuario_auth_id_key UNIQUE (auth_id);


-- =========================================================
-- CLAVES FORÁNEAS
-- =========================================================

ALTER TABLE agenda ADD CONSTRAINT agenda_academia_id_fkey FOREIGN KEY (academia_id) REFERENCES academia(id);
ALTER TABLE agenda_profesional ADD CONSTRAINT agenda_profesional_agenda_semanal_id_fkey FOREIGN KEY (agenda_semanal_id) REFERENCES agenda_semanal(id);
ALTER TABLE agenda_profesional ADD CONSTRAINT agenda_profesional_profesor_id_fkey FOREIGN KEY (profesor_id) REFERENCES profesor(id);
ALTER TABLE agenda_semanal ADD CONSTRAINT agenda_semanal_agenda_id_fkey FOREIGN KEY (agenda_id) REFERENCES agenda(id);
ALTER TABLE alumno ADD CONSTRAINT alumno_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuario(id);
ALTER TABLE alumno_materia_interes ADD CONSTRAINT alumno_materia_interes_alumno_id_fkey FOREIGN KEY (alumno_id) REFERENCES alumno(id);
ALTER TABLE alumno_materia_interes ADD CONSTRAINT alumno_materia_interes_materia_id_fkey FOREIGN KEY (materia_id) REFERENCES materia(id);
ALTER TABLE asistencia ADD CONSTRAINT asistencia_modificado_por_fkey FOREIGN KEY (modificado_por) REFERENCES usuario(id);
ALTER TABLE asistencia ADD CONSTRAINT asistencia_turno_id_fkey FOREIGN KEY (turno_id) REFERENCES turno(id);
ALTER TABLE asistencia ADD CONSTRAINT asistencia_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuario(id);
ALTER TABLE auditoria ADD CONSTRAINT auditoria_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE SET NULL;
ALTER TABLE auditoria_sesion ADD CONSTRAINT auditoria_sesion_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE SET NULL;
ALTER TABLE bloqueo_fecha ADD CONSTRAINT bloqueo_fecha_profesor_id_fkey FOREIGN KEY (profesor_id) REFERENCES profesor(id);
ALTER TABLE bloqueo_fecha ADD CONSTRAINT bloqueo_fecha_usuario_baja_fkey FOREIGN KEY (usuario_baja_id) REFERENCES usuario(id);
ALTER TABLE bloqueo_fecha ADD CONSTRAINT bloqueo_fecha_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuario(id);
ALTER TABLE cierre_caja ADD CONSTRAINT cierre_caja_cerrado_por_fkey FOREIGN KEY (cerrado_por) REFERENCES usuario(id);
ALTER TABLE cierre_caja ADD CONSTRAINT cierre_caja_reabierto_por_fkey FOREIGN KEY (reabierto_por) REFERENCES usuario(id);
ALTER TABLE nota_alumno ADD CONSTRAINT nota_alumno_alumno_id_fkey FOREIGN KEY (alumno_id) REFERENCES alumno(id);
ALTER TABLE nota_alumno ADD CONSTRAINT nota_alumno_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuario(id);
ALTER TABLE pago ADD CONSTRAINT pago_alumno_id_fkey FOREIGN KEY (alumno_id) REFERENCES alumno(id);
ALTER TABLE pago ADD CONSTRAINT pago_anulado_por_fkey FOREIGN KEY (anulado_por) REFERENCES usuario(id);
ALTER TABLE pago ADD CONSTRAINT pago_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuario(id);
ALTER TABLE pago_forma_pago ADD CONSTRAINT pago_forma_pago_forma_pago_id_fkey FOREIGN KEY (forma_pago_id) REFERENCES forma_pago(id);
ALTER TABLE pago_forma_pago ADD CONSTRAINT pago_forma_pago_pago_id_fkey FOREIGN KEY (pago_id) REFERENCES pago(id);
ALTER TABLE pago_turno ADD CONSTRAINT pago_turno_pago_id_fkey FOREIGN KEY (pago_id) REFERENCES pago(id);
ALTER TABLE pago_turno ADD CONSTRAINT pago_turno_turno_id_fkey FOREIGN KEY (turno_id) REFERENCES turno(id);
ALTER TABLE precio_clase ADD CONSTRAINT precio_clase_profesor_materia_id_fkey FOREIGN KEY (profesor_materia_id) REFERENCES profesor_materia(id);
ALTER TABLE profesor ADD CONSTRAINT profesor_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuario(id);
ALTER TABLE profesor_materia ADD CONSTRAINT profesor_materia_materia_id_fkey FOREIGN KEY (materia_id) REFERENCES materia(id);
ALTER TABLE profesor_materia ADD CONSTRAINT profesor_materia_profesor_id_fkey FOREIGN KEY (profesor_id) REFERENCES profesor(id);
ALTER TABLE turno ADD CONSTRAINT turno_alumno_id_fkey FOREIGN KEY (alumno_id) REFERENCES alumno(id);
ALTER TABLE turno ADD CONSTRAINT turno_materia_id_fkey FOREIGN KEY (materia_id) REFERENCES materia(id);
ALTER TABLE turno ADD CONSTRAINT turno_motivo_cancelacion_id_fkey FOREIGN KEY (motivo_cancelacion_id) REFERENCES motivo_cancelacion(id);
ALTER TABLE turno ADD CONSTRAINT turno_profesor_id_fkey FOREIGN KEY (profesor_id) REFERENCES profesor(id);
ALTER TABLE turno ADD CONSTRAINT turno_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuario(id);
ALTER TABLE usuario ADD CONSTRAINT usuario_academia_id_fkey FOREIGN KEY (academia_id) REFERENCES academia(id);
ALTER TABLE usuario ADD CONSTRAINT usuario_motivo_baja_id_fkey FOREIGN KEY (motivo_baja_id) REFERENCES motivo_baja(id);
ALTER TABLE usuario ADD CONSTRAINT usuario_rol_id_fkey FOREIGN KEY (rol_id) REFERENCES rol(id);


-- =========================================================
-- ÍNDICES
-- =========================================================

CREATE UNIQUE INDEX uq_academia_nombre_activa ON public.academia USING btree (lower((nombre)::text)) WHERE (estado = 'activo'::estado_activo_inactivo);
CREATE INDEX idx_agenda_profesional_franja ON public.agenda_profesional USING btree (agenda_semanal_id);
CREATE INDEX idx_agenda_profesional_profesor ON public.agenda_profesional USING btree (profesor_id);
CREATE INDEX idx_alumno_apellido_nombre ON public.alumno USING btree (apellido, nombre);
CREATE INDEX idx_alumno_nivel_estado ON public.alumno USING btree (nivel_educativo, estado);
CREATE UNIQUE INDEX uq_alumno_dni_activo ON public.alumno USING btree (dni) WHERE (estado = 'activo'::estado_activo_inactivo);
CREATE UNIQUE INDEX uq_alumno_legajo ON public.alumno USING btree (legajo);
CREATE UNIQUE INDEX uq_alumno_usuario ON public.alumno USING btree (usuario_id) WHERE (usuario_id IS NOT NULL);
CREATE INDEX idx_alumno_materia_interes_materia ON public.alumno_materia_interes USING btree (materia_id);
CREATE INDEX idx_asistencia_usuario ON public.asistencia USING btree (usuario_id);
CREATE INDEX idx_auditoria_fecha ON public.auditoria USING btree (fecha_hora DESC);
CREATE INDEX idx_auditoria_tabla_registro ON public.auditoria USING btree (tabla, registro_id);
CREATE INDEX idx_auditoria_usuario ON public.auditoria USING btree (usuario_id);
CREATE INDEX idx_auditoria_sesion_fecha ON public.auditoria_sesion USING btree (fecha_hora DESC);
CREATE INDEX idx_auditoria_sesion_usuario ON public.auditoria_sesion USING btree (usuario_id);
CREATE INDEX idx_bloqueo_profesor ON public.bloqueo_fecha USING btree (profesor_id) WHERE (profesor_id IS NOT NULL);
CREATE INDEX idx_bloqueo_vigente_rango ON public.bloqueo_fecha USING btree (fecha_desde, fecha_hasta) WHERE (estado = 'activo'::estado_activo_inactivo);
CREATE INDEX idx_cierre_caja_fecha ON public.cierre_caja USING btree (fecha DESC);
CREATE UNIQUE INDEX uq_cierre_caja_fecha_cerrada ON public.cierre_caja USING btree (fecha) WHERE (estado = 'Cerrada'::estado_cierre_caja);
CREATE UNIQUE INDEX uq_forma_pago_nombre ON public.forma_pago USING btree (lower(btrim((nombre)::text)));
CREATE INDEX idx_materia_nivel_estado ON public.materia USING btree (nivel, estado);
CREATE UNIQUE INDEX uq_materia_nombre_activa ON public.materia USING btree (lower(btrim((nombre)::text))) WHERE (estado = 'activo'::estado_activo_inactivo);
CREATE UNIQUE INDEX uq_motivo_baja_nombre ON public.motivo_baja USING btree (lower(btrim((nombre)::text)));
CREATE UNIQUE INDEX uq_motivo_cancelacion_nombre ON public.motivo_cancelacion USING btree (lower(btrim((nombre)::text)));
CREATE INDEX idx_nota_alumno_alumno ON public.nota_alumno USING btree (alumno_id, created_at DESC);
CREATE INDEX idx_pago_alumno_fecha ON public.pago USING btree (alumno_id, fecha_pago DESC);
CREATE INDEX idx_pago_fecha ON public.pago USING btree (fecha_pago);
CREATE INDEX idx_pago_vigente_fecha ON public.pago USING btree (fecha_pago) WHERE (estado = 'Vigente'::estado_pago);
CREATE INDEX idx_pago_forma_pago_forma ON public.pago_forma_pago USING btree (forma_pago_id);
CREATE INDEX idx_pago_turno_pago ON public.pago_turno USING btree (pago_id);
CREATE UNIQUE INDEX uq_pago_turno_vigente ON public.pago_turno USING btree (turno_id) WHERE vigente;
CREATE INDEX idx_precio_clase_profesor_materia ON public.precio_clase USING btree (profesor_materia_id);
CREATE INDEX idx_profesor_estado ON public.profesor USING btree (estado);
CREATE INDEX idx_profesor_materia_materia ON public.profesor_materia USING btree (materia_id);
CREATE INDEX idx_turno_alumno ON public.turno USING btree (alumno_id);
CREATE INDEX idx_turno_alumno_fecha ON public.turno USING btree (alumno_id, fecha DESC);
CREATE INDEX idx_turno_estado ON public.turno USING btree (estado);
CREATE INDEX idx_turno_fecha ON public.turno USING btree (fecha);
CREATE INDEX idx_turno_impagos ON public.turno USING btree (alumno_id, fecha) WHERE (pagado = false);
CREATE INDEX idx_turno_materia ON public.turno USING btree (materia_id);
CREATE INDEX idx_turno_motivo_cancelacion ON public.turno USING btree (motivo_cancelacion_id) WHERE (motivo_cancelacion_id IS NOT NULL);
CREATE INDEX idx_turno_profesor_fecha ON public.turno USING btree (profesor_id, fecha, hora_inicio);
CREATE INDEX idx_usuario_academia ON public.usuario USING btree (academia_id);
CREATE INDEX idx_usuario_apellido_nombre ON public.usuario USING btree (apellido, nombre);
CREATE INDEX idx_usuario_motivo_baja ON public.usuario USING btree (motivo_baja_id);
CREATE INDEX idx_usuario_rol ON public.usuario USING btree (rol_id);
CREATE UNIQUE INDEX uq_usuario_dni_activo ON public.usuario USING btree (dni) WHERE (estado = 'activo'::estado_activo_inactivo);
CREATE UNIQUE INDEX uq_usuario_email_activo ON public.usuario USING btree (lower((email)::text)) WHERE (estado = 'activo'::estado_activo_inactivo);


-- =========================================================
-- VISTAS
-- =========================================================

CREATE OR REPLACE VIEW vw_bloqueo_fecha AS
SELECT b.id,
    b.fecha_desde,
    b.fecha_hasta,
    b.profesor_id,
        CASE
            WHEN (b.profesor_id IS NULL) THEN 'Todos'::text
            ELSE (((u.apellido)::text || ', '::text) || (u.nombre)::text)
        END AS profesor,
    b.motivo,
    b.estado,
    b.usuario_id,
    b.created_at,
    b.fecha_baja,
    b.usuario_baja_id
   FROM ((bloqueo_fecha b
     LEFT JOIN profesor p ON ((p.id = b.profesor_id)))
     LEFT JOIN usuario u ON ((u.id = p.usuario_id)));

CREATE OR REPLACE VIEW vw_cajas_pendientes AS
SELECT fecha_pago AS fecha,
    count(*) AS pagos_vigentes,
    sum(monto) AS total
   FROM pago p
  WHERE ((estado = 'Vigente'::estado_pago) AND (fecha_pago < ((now() AT TIME ZONE 'America/Argentina/Buenos_Aires'::text))::date) AND (fecha_pago >= (((now() AT TIME ZONE 'America/Argentina/Buenos_Aires'::text))::date - fn_parametro('dias_control_cajas_pendientes'::character varying))) AND (NOT (EXISTS ( SELECT 1
           FROM cierre_caja c
          WHERE ((c.fecha = p.fecha_pago) AND (c.estado = 'Cerrada'::estado_cierre_caja))))))
  GROUP BY fecha_pago;

CREATE OR REPLACE VIEW vw_cierre_caja AS
SELECT c.id,
    c.fecha,
    c.estado,
    c.total_registrado,
    c.efectivo_registrado,
    c.efectivo_contado,
    c.diferencia,
    c.observaciones,
    c.cerrado_por,
    (((uc.apellido)::text || ', '::text) || (uc.nombre)::text) AS cerrado_por_nombre,
    c.cerrado_at,
    c.reabierto_por,
    (((ur.apellido)::text || ', '::text) || (ur.nombre)::text) AS reabierto_por_nombre,
    c.reabierto_at,
    c.motivo_reapertura
   FROM ((cierre_caja c
     JOIN usuario uc ON ((uc.id = c.cerrado_por)))
     LEFT JOIN usuario ur ON ((ur.id = c.reabierto_por)));

CREATE OR REPLACE VIEW vw_deuda_clase AS
SELECT t.id AS turno_id,
    t.codigo,
    t.alumno_id,
    t.fecha,
    t.hora_inicio,
    t.materia_id,
    m.nombre AS materia,
    t.profesor_id,
    (((u.apellido)::text || ', '::text) || (u.nombre)::text) AS profesor,
    t.estado,
    t.valor_clase_congelado AS importe,
    GREATEST((((now() AT TIME ZONE 'America/Argentina/Buenos_Aires'::text))::date - t.fecha), 0) AS dias_antiguedad
   FROM (((turno t
     JOIN materia m ON ((m.id = t.materia_id)))
     JOIN profesor p ON ((p.id = t.profesor_id)))
     JOIN usuario u ON ((u.id = p.usuario_id)))
  WHERE (fn_turno_cobrable(t.estado) AND (t.pagado = false));

CREATE OR REPLACE VIEW vw_historial_alumno AS
SELECT t.alumno_id,
    fn_ts_servidor_a_art(t.created_at) AS fecha_hora,
    1 AS orden_evento,
    'Reservado'::text AS tipo,
    t.materia_id,
    (m.nombre)::text AS materia,
    t.profesor_id,
    (((up.apellido)::text || ', '::text) || (up.nombre)::text) AS profesor,
    ((((((('Clase '::text || to_char((t.fecha)::timestamp with time zone, 'DD/MM/YYYY'::text)) || ' '::text) || to_char((t.hora_inicio)::interval, 'HH24:MI'::text)) || '-'::text) || to_char((t.hora_fin)::interval, 'HH24:MI'::text)) || ' · '::text) || (COALESCE(t.codigo, ''::character varying))::text) AS detalle,
    NULL::text AS observaciones,
    false AS cancelacion_tardia,
    NULL::text AS responsable,
    t.usuario_id,
    (((uu.apellido)::text || ', '::text) || (uu.nombre)::text) AS usuario,
    t.id AS turno_id,
    t.fecha AS fecha_clase,
    t.hora_inicio AS hora_clase
   FROM ((((turno t
     JOIN materia m ON ((m.id = t.materia_id)))
     JOIN profesor p ON ((p.id = t.profesor_id)))
     JOIN usuario up ON ((up.id = p.usuario_id)))
     LEFT JOIN usuario uu ON ((uu.id = t.usuario_id)))
UNION ALL
 SELECT t.alumno_id,
    fn_ts_servidor_a_art(a.fecha_hora) AS fecha_hora,
    2 AS orden_evento,
    'Modificado'::text AS tipo,
    t.materia_id,
    (m.nombre)::text AS materia,
    ((a.valores_nuevos ->> 'profesor_id'::text))::integer AS profesor_id,
    (((unp.apellido)::text || ', '::text) || (unp.nombre)::text) AS profesor,
    (((((((((((('Reprogramado: '::text || to_char((((a.valores_anteriores ->> 'fecha'::text))::date)::timestamp with time zone, 'DD/MM/YYYY'::text)) || ' '::text) || to_char((((a.valores_anteriores ->> 'hora_inicio'::text))::time without time zone)::interval, 'HH24:MI'::text)) || '-'::text) || to_char((((a.valores_anteriores ->> 'hora_fin'::text))::time without time zone)::interval, 'HH24:MI'::text)) || ' → '::text) || to_char((((a.valores_nuevos ->> 'fecha'::text))::date)::timestamp with time zone, 'DD/MM/YYYY'::text)) || ' '::text) || to_char((((a.valores_nuevos ->> 'hora_inicio'::text))::time without time zone)::interval, 'HH24:MI'::text)) || '-'::text) || to_char((((a.valores_nuevos ->> 'hora_fin'::text))::time without time zone)::interval, 'HH24:MI'::text)) ||
        CASE
            WHEN ((a.valores_anteriores ->> 'profesor_id'::text) IS DISTINCT FROM (a.valores_nuevos ->> 'profesor_id'::text)) THEN (((' · Profesor: '::text || (((uap.apellido)::text || ', '::text) || (uap.nombre)::text)) || ' → '::text) || (((unp.apellido)::text || ', '::text) || (unp.nombre)::text))
            ELSE ''::text
        END) AS detalle,
    NULL::text AS observaciones,
    false AS cancelacion_tardia,
    NULL::text AS responsable,
    a.usuario_id,
    (((ua.apellido)::text || ', '::text) || (ua.nombre)::text) AS usuario,
    t.id AS turno_id,
    ((a.valores_nuevos ->> 'fecha'::text))::date AS fecha_clase,
    ((a.valores_nuevos ->> 'hora_inicio'::text))::time without time zone AS hora_clase
   FROM (((((((auditoria a
     JOIN turno t ON ((t.id = a.registro_id)))
     JOIN materia m ON ((m.id = t.materia_id)))
     JOIN profesor pn ON ((pn.id = ((a.valores_nuevos ->> 'profesor_id'::text))::integer)))
     JOIN usuario unp ON ((unp.id = pn.usuario_id)))
     JOIN profesor pa ON ((pa.id = ((a.valores_anteriores ->> 'profesor_id'::text))::integer)))
     JOIN usuario uap ON ((uap.id = pa.usuario_id)))
     LEFT JOIN usuario ua ON ((ua.id = a.usuario_id)))
  WHERE (((a.tabla)::text = 'turno'::text) AND (a.operacion = 'UPDATE'::tipo_operacion_auditoria) AND (((((a.valores_anteriores ->> 'fecha'::text) IS DISTINCT FROM (a.valores_nuevos ->> 'fecha'::text)) OR ((a.valores_anteriores ->> 'hora_inicio'::text) IS DISTINCT FROM (a.valores_nuevos ->> 'hora_inicio'::text))) OR ((a.valores_anteriores ->> 'hora_fin'::text) IS DISTINCT FROM (a.valores_nuevos ->> 'hora_fin'::text))) OR ((a.valores_anteriores ->> 'profesor_id'::text) IS DISTINCT FROM (a.valores_nuevos ->> 'profesor_id'::text))))
UNION ALL
 SELECT t.alumno_id,
    t.fecha_cancelacion AS fecha_hora,
    3 AS orden_evento,
    'Cancelado'::text AS tipo,
    t.materia_id,
    (m.nombre)::text AS materia,
    t.profesor_id,
    (((up.apellido)::text || ', '::text) || (up.nombre)::text) AS profesor,
    (((((('Motivo: '::text || (mc.nombre)::text) || COALESCE((' — '::text || NULLIF(btrim((t.detalle_cancelacion)::text), ''::text)), ''::text)) || ' · Clase '::text) || to_char((t.fecha)::timestamp with time zone, 'DD/MM/YYYY'::text)) || ' '::text) || to_char((t.hora_inicio)::interval, 'HH24:MI'::text)) AS detalle,
    NULL::text AS observaciones,
    t.cancelacion_tardia,
    (mc.responsable)::text AS responsable,
    c.usuario_id,
    (((uc.apellido)::text || ', '::text) || (uc.nombre)::text) AS usuario,
    t.id AS turno_id,
    t.fecha AS fecha_clase,
    t.hora_inicio AS hora_clase
   FROM ((((((turno t
     JOIN materia m ON ((m.id = t.materia_id)))
     JOIN profesor p ON ((p.id = t.profesor_id)))
     JOIN usuario up ON ((up.id = p.usuario_id)))
     JOIN motivo_cancelacion mc ON ((mc.id = t.motivo_cancelacion_id)))
     LEFT JOIN LATERAL ( SELECT a.usuario_id
           FROM auditoria a
          WHERE (((a.tabla)::text = 'turno'::text) AND (a.registro_id = t.id) AND (a.operacion = 'UPDATE'::tipo_operacion_auditoria) AND ((a.valores_nuevos ->> 'estado'::text) = 'Cancelado'::text) AND ((a.valores_anteriores ->> 'estado'::text) <> 'Cancelado'::text))
          ORDER BY a.id DESC
         LIMIT 1) c ON (true))
     LEFT JOIN usuario uc ON ((uc.id = c.usuario_id)))
  WHERE (t.estado = 'Cancelado'::estado_turno)
UNION ALL
 SELECT t.alumno_id,
    (s.registrado_at AT TIME ZONE 'America/Argentina/Buenos_Aires'::text) AS fecha_hora,
    4 AS orden_evento,
        CASE
            WHEN s.presente THEN 'Asistió'::text
            ELSE 'Ausente'::text
        END AS tipo,
    t.materia_id,
    (m.nombre)::text AS materia,
    t.profesor_id,
    (((up.apellido)::text || ', '::text) || (up.nombre)::text) AS profesor,
    ((((('Clase '::text || to_char((t.fecha)::timestamp with time zone, 'DD/MM/YYYY'::text)) || ' '::text) || to_char((t.hora_inicio)::interval, 'HH24:MI'::text)) || '-'::text) || to_char((t.hora_fin)::interval, 'HH24:MI'::text)) AS detalle,
    (s.observaciones)::text AS observaciones,
    false AS cancelacion_tardia,
    NULL::text AS responsable,
    s.usuario_id,
    (((us.apellido)::text || ', '::text) || (us.nombre)::text) AS usuario,
    t.id AS turno_id,
    t.fecha AS fecha_clase,
    t.hora_inicio AS hora_clase
   FROM (((((asistencia s
     JOIN turno t ON ((t.id = s.turno_id)))
     JOIN materia m ON ((m.id = t.materia_id)))
     JOIN profesor p ON ((p.id = t.profesor_id)))
     JOIN usuario up ON ((up.id = p.usuario_id)))
     JOIN usuario us ON ((us.id = s.usuario_id)))
UNION ALL
 SELECT n.alumno_id,
    (n.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires'::text) AS fecha_hora,
    5 AS orden_evento,
    'Nota'::text AS tipo,
    NULL::integer AS materia_id,
    NULL::text AS materia,
    NULL::integer AS profesor_id,
    NULL::text AS profesor,
    (n.texto)::text AS detalle,
    NULL::text AS observaciones,
    false AS cancelacion_tardia,
    NULL::text AS responsable,
    n.usuario_id,
    (((un.apellido)::text || ', '::text) || (un.nombre)::text) AS usuario,
    NULL::integer AS turno_id,
    NULL::date AS fecha_clase,
    NULL::time without time zone AS hora_clase
   FROM (nota_alumno n
     JOIN usuario un ON ((un.id = n.usuario_id)));

CREATE OR REPLACE VIEW vw_historial_asistencia AS
SELECT t.id AS turno_id,
    t.codigo,
    t.alumno_id,
    t.fecha,
    t.hora_inicio,
    t.materia_id,
    m.nombre AS materia,
    t.profesor_id,
    (((u.apellido)::text || ', '::text) || (u.nombre)::text) AS profesor,
    t.estado,
    a.tema_trabajado
   FROM ((((turno t
     JOIN materia m ON ((m.id = t.materia_id)))
     JOIN profesor p ON ((p.id = t.profesor_id)))
     JOIN usuario u ON ((u.id = p.usuario_id)))
     LEFT JOIN asistencia a ON ((a.turno_id = t.id)))
  WHERE (t.estado = ANY (ARRAY['Asistió'::estado_turno, 'Ausente'::estado_turno, 'Cancelado'::estado_turno]));

CREATE OR REPLACE VIEW vw_huecos_disponibles AS
WITH fechas AS (
         SELECT (generate_series((((now() AT TIME ZONE 'America/Argentina/Buenos_Aires'::text))::date)::timestamp with time zone, ((((now() AT TIME ZONE 'America/Argentina/Buenos_Aires'::text))::date + 60))::timestamp with time zone, '1 day'::interval))::date AS fecha
        ), franjas_fecha AS (
         SELECT ap.id AS agenda_profesional_id,
            ap.profesor_id,
            ap.hora_inicio AS franja_inicio,
            ap.hora_fin AS franja_fin,
            d.fecha
           FROM ((agenda_profesional ap
             JOIN agenda_semanal ags ON ((ags.id = ap.agenda_semanal_id)))
             JOIN fechas d ON (((EXTRACT(isodow FROM d.fecha))::smallint = ags.dia_semana)))
          WHERE ((ap.estado = 'activo'::estado_activo_inactivo) AND (ags.estado = 'activo'::estado_activo_inactivo) AND (NOT (EXISTS ( SELECT 1
                   FROM bloqueo_fecha b
                  WHERE ((b.estado = 'activo'::estado_activo_inactivo) AND ((d.fecha >= b.fecha_desde) AND (d.fecha <= b.fecha_hasta)) AND ((b.profesor_id IS NULL) OR (b.profesor_id = ap.profesor_id)))))))
        ), turnos_bordes AS (
         SELECT ff.agenda_profesional_id,
            ff.profesor_id,
            ff.fecha,
            ff.franja_inicio,
            ff.franja_fin,
            t.hora_inicio,
            t.hora_fin,
            lag(t.hora_fin) OVER (PARTITION BY ff.agenda_profesional_id, ff.fecha ORDER BY t.hora_inicio) AS fin_anterior
           FROM (franjas_fecha ff
             LEFT JOIN turno t ON (((t.profesor_id = ff.profesor_id) AND (t.fecha = ff.fecha) AND (t.hora_inicio >= ff.franja_inicio) AND (t.hora_fin <= ff.franja_fin) AND (t.estado <> 'Cancelado'::estado_turno))))
        )
 SELECT turnos_bordes.agenda_profesional_id,
    turnos_bordes.profesor_id,
    turnos_bordes.fecha,
    COALESCE(turnos_bordes.fin_anterior, turnos_bordes.franja_inicio) AS hueco_inicio,
    COALESCE(turnos_bordes.hora_inicio, turnos_bordes.franja_fin) AS hueco_fin
   FROM turnos_bordes
  WHERE (COALESCE(turnos_bordes.fin_anterior, turnos_bordes.franja_inicio) < COALESCE(turnos_bordes.hora_inicio, turnos_bordes.franja_fin))
UNION ALL
 SELECT ff.agenda_profesional_id,
    ff.profesor_id,
    ff.fecha,
    max(t.hora_fin) AS hueco_inicio,
    ff.franja_fin AS hueco_fin
   FROM (franjas_fecha ff
     JOIN turno t ON (((t.profesor_id = ff.profesor_id) AND (t.fecha = ff.fecha) AND (t.hora_inicio >= ff.franja_inicio) AND (t.hora_fin <= ff.franja_fin) AND (t.estado <> 'Cancelado'::estado_turno))))
  GROUP BY ff.agenda_profesional_id, ff.profesor_id, ff.fecha, ff.franja_fin
 HAVING (max(t.hora_fin) < ff.franja_fin);

CREATE OR REPLACE VIEW vw_mis_turnos AS
SELECT t.alumno_id,
    t.id AS turno_id,
    t.codigo,
    t.fecha,
    t.hora_inicio,
    t.hora_fin,
    t.materia_id,
    m.nombre AS materia,
    t.profesor_id,
    (((u.apellido)::text || ', '::text) || (u.nombre)::text) AS profesor,
    t.estado,
    t.origen,
    ((t.fecha + t.hora_fin) >= (now() AT TIME ZONE 'America/Argentina/Buenos_Aires'::text)) AS es_proximo
   FROM (((turno t
     JOIN materia m ON ((m.id = t.materia_id)))
     JOIN profesor p ON ((p.id = t.profesor_id)))
     JOIN usuario u ON ((u.id = p.usuario_id)));

CREATE OR REPLACE VIEW vw_pago_medio AS
SELECT pfp.id AS pago_forma_pago_id,
    p.id AS pago_id,
    p.comprobante,
    p.alumno_id,
    p.fecha_pago,
    p.estado,
    p.usuario_id,
    fp.id AS forma_pago_id,
    fp.nombre AS medio,
    fp.es_efectivo,
    pfp.nro_operacion,
    COALESCE(pfp.monto, p.monto) AS monto_medio
   FROM ((pago p
     JOIN pago_forma_pago pfp ON ((pfp.pago_id = p.id)))
     JOIN forma_pago fp ON ((fp.id = pfp.forma_pago_id)));


-- =========================================================
-- FUNCIONES
-- =========================================================

CREATE OR REPLACE FUNCTION public.cash_dist(money, money)
 RETURNS money
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$cash_dist$function$
;

CREATE OR REPLACE FUNCTION public.date_dist(date, date)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$date_dist$function$
;

CREATE OR REPLACE FUNCTION public.float4_dist(real, real)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$float4_dist$function$
;

CREATE OR REPLACE FUNCTION public.float8_dist(double precision, double precision)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$float8_dist$function$
;

CREATE OR REPLACE FUNCTION public.fn_agenda_profesional_validar_rango()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_fr_inicio       time;
  v_fr_fin          time;
  v_fr_estado       estado_activo_inactivo;
  v_academia_agenda integer;
  v_academia_prof   integer;
BEGIN
  IF NEW.estado <> 'activo' THEN
    RETURN NEW;
  END IF;

  SELECT ags.hora_inicio, ags.hora_fin, ags.estado, a.academia_id
    INTO v_fr_inicio, v_fr_fin, v_fr_estado, v_academia_agenda
  FROM agenda_semanal ags
  JOIN agenda a ON a.id = ags.agenda_id
  WHERE ags.id = NEW.agenda_semanal_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La franja semanal indicada (id=%) no existe.', NEW.agenda_semanal_id;
  END IF;

  IF v_fr_estado <> 'activo' THEN
    RAISE EXCEPTION 'La franja semanal indicada (id=%) está inactiva.', NEW.agenda_semanal_id;
  END IF;

  IF NEW.hora_inicio < v_fr_inicio OR NEW.hora_fin > v_fr_fin THEN
    RAISE EXCEPTION 'El bloque (% - %) debe estar dentro del horario de atención de la academia (% - %).',
      NEW.hora_inicio, NEW.hora_fin, v_fr_inicio, v_fr_fin;
  END IF;

  SELECT u.academia_id INTO v_academia_prof
  FROM profesor p
  JOIN usuario u ON u.id = p.usuario_id
  WHERE p.id = NEW.profesor_id;

  IF v_academia_prof IS DISTINCT FROM v_academia_agenda THEN
    RAISE EXCEPTION 'El profesor (id=%) no pertenece a la academia de la franja indicada.', NEW.profesor_id;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_alumno_baja_cuenta_portal()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE usuario
     SET estado             = 'inactivo',
         motivo_baja_id     = (SELECT id FROM motivo_baja
                               WHERE lower(btrim(nombre)) = 'baja del alumno' LIMIT 1),
         detalle_motivo_baja = NULL,
         fecha_baja         = now()
   WHERE id = NEW.usuario_id
     AND estado = 'activo';

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_alumno_de_usuario(p_usuario_id integer)
 RETURNS integer
 LANGUAGE sql
 STABLE
AS $function$
  SELECT a.id
  FROM alumno a
  WHERE a.usuario_id = p_usuario_id
    AND a.estado = 'activo';
$function$
;

CREATE OR REPLACE FUNCTION public.fn_alumno_materia_interes_validar_materia()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_estado estado_activo_inactivo;
BEGIN
  SELECT estado INTO v_estado FROM materia WHERE id = NEW.materia_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La materia indicada (id=%) no existe.', NEW.materia_id;
  END IF;

  IF v_estado <> 'activo' THEN
    RAISE EXCEPTION 'La materia (id=%) está inactiva y no puede elegirse como materia de interés.', NEW.materia_id;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_alumno_validar_acceso_portal()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_actor       integer := fn_usuario_id_actual();
  v_rol_actor   text;
  v_rol_cuenta  text;
  v_email       text;
  v_old_estado  estado_activo_inactivo;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'No se identificó al usuario que habilita el acceso (app.usuario_id).';
  END IF;

  v_rol_actor := fn_rol_usuario(v_actor);
  IF v_rol_actor IS NULL OR v_rol_actor NOT IN ('gerente', 'mesa de entrada') THEN
    RAISE EXCEPTION 'Solo Mesa de Entrada o el Gerente pueden habilitar el acceso al portal.';
  END IF;

  -- Cambiar o quitar una cuenta ya vinculada: solo si la anterior está inactiva.
  IF OLD.usuario_id IS NOT NULL THEN
    SELECT estado INTO v_old_estado FROM usuario WHERE id = OLD.usuario_id;
    IF v_old_estado = 'activo' THEN
      RAISE EXCEPTION 'La ficha ya tiene una cuenta activa en el portal (una sola cuenta por ficha).';
    END IF;
  END IF;

  IF NEW.usuario_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.estado <> 'activo' THEN
    RAISE EXCEPTION 'La ficha del alumno está inactiva: no se puede habilitar el acceso al portal.';
  END IF;

  IF NEW.email IS NULL OR btrim(NEW.email) = '' THEN
    RAISE EXCEPTION 'El alumno no tiene Email cargado: es obligatorio para habilitar el acceso al portal.';
  END IF;

  SELECT lower(r.nombre), lower(u.email)
    INTO v_rol_cuenta, v_email
  FROM usuario u
  JOIN rol r ON r.id = u.rol_id
  WHERE u.id = NEW.usuario_id AND u.estado = 'activo';

  IF v_rol_cuenta IS NULL THEN
    RAISE EXCEPTION 'La cuenta indicada (id=%) no existe o está inactiva.', NEW.usuario_id;
  END IF;

  IF v_rol_cuenta <> 'alumno' THEN
    RAISE EXCEPTION 'La cuenta (id=%) tiene rol "%": solo una cuenta con rol Alumno puede vincularse a una ficha.',
      NEW.usuario_id, v_rol_cuenta;
  END IF;

  IF v_email <> lower(NEW.email) THEN
    RAISE EXCEPTION 'El email de la cuenta no coincide con el Email de la ficha del alumno.';
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_alumnos_activos_al(p_fecha date, p_nivel nivel_materia DEFAULT NULL::nivel_materia)
 RETURNS bigint
 LANGUAGE sql
 STABLE
AS $function$
  SELECT count(*)
  FROM alumno a
  WHERE fn_ts_servidor_a_art(a.created_at)::date <= p_fecha
    AND (p_nivel IS NULL OR a.nivel_educativo = p_nivel)
    AND CASE
          WHEN p_fecha >= (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
            THEN a.estado = 'activo'
          ELSE COALESCE((
                 SELECT x.valores_nuevos->>'estado'
                 FROM auditoria x
                 WHERE x.tabla = 'alumno'
                   AND x.registro_id = a.id
                   AND x.operacion = 'UPDATE'
                   AND (x.valores_anteriores->>'estado') IS DISTINCT FROM (x.valores_nuevos->>'estado')
                   AND fn_ts_servidor_a_art(x.fecha_hora)::date <= p_fecha
                 ORDER BY x.id DESC
                 LIMIT 1), 'activo') = 'activo'
        END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_asistencia_resumen(p_alumno_id integer, p_desde date DEFAULT NULL::date, p_hasta date DEFAULT NULL::date, p_materia_id integer DEFAULT NULL::integer, p_profesor_id integer DEFAULT NULL::integer)
 RETURNS TABLE(clases_asistio bigint, clases_ausente bigint, clases_canceladas bigint, porcentaje_asistencia numeric)
 LANGUAGE sql
 STABLE
AS $function$
  SELECT s.a, s.b, s.c,
         CASE WHEN s.a + s.b = 0 THEN NULL
              ELSE round(100.0 * s.a / (s.a + s.b), 1) END
  FROM (
    SELECT count(*) FILTER (WHERE t.estado = 'Asistió')   AS a,
           count(*) FILTER (WHERE t.estado = 'Ausente')   AS b,
           count(*) FILTER (WHERE t.estado = 'Cancelado') AS c
    FROM turno t
    WHERE t.alumno_id = p_alumno_id
      AND (p_desde       IS NULL OR t.fecha >= p_desde)
      AND (p_hasta       IS NULL OR t.fecha <= p_hasta)
      AND (p_materia_id  IS NULL OR t.materia_id  = p_materia_id)
      AND (p_profesor_id IS NULL OR t.profesor_id = p_profesor_id)
  ) s;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_asistencia_sincronizar_turno()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_nuevo estado_turno := CASE WHEN NEW.presente THEN 'Asistió'::estado_turno
                               ELSE 'Ausente'::estado_turno END;
BEGIN
  UPDATE turno
     SET estado = v_nuevo
   WHERE id = NEW.turno_id
     AND estado IS DISTINCT FROM v_nuevo;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_asistencia_validar()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_actor       integer := fn_usuario_id_actual();
  v_rol         text;
  v_prof_actor  integer;
  v_t           turno%ROWTYPE;
  v_ahora       timestamp := (now() AT TIME ZONE 'America/Argentina/Buenos_Aires');
  v_desde       timestamp;
  v_hasta       timestamp;
  v_fin_jornada time;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'No se identificó al usuario que registra la asistencia (app.usuario_id).';
  END IF;

  v_rol := fn_rol_usuario(v_actor);
  IF v_rol IS NULL THEN
    RAISE EXCEPTION 'El usuario (id=%) no existe o está inactivo.', v_actor;
  END IF;

  SELECT * INTO v_t FROM turno WHERE id = NEW.turno_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El turno indicado (id=%) no existe.', NEW.turno_id;
  END IF;

  SELECT p.id INTO v_prof_actor
  FROM profesor p
  WHERE p.usuario_id = v_actor AND p.estado = 'activo';

  -- ---------------- ALTA ----------------
  IF TG_OP = 'INSERT' THEN
    IF v_rol <> 'profesor' THEN
      RAISE EXCEPTION 'Solo el Profesor puede registrar la asistencia.';
    END IF;

    IF v_prof_actor IS DISTINCT FROM v_t.profesor_id THEN
      RAISE EXCEPTION 'El Profesor solo puede registrar la asistencia de sus propios turnos (turno %).', v_t.codigo;
    END IF;

    IF v_t.estado <> 'Reservado' THEN
      RAISE EXCEPTION 'El turno % está en estado "%": solo se registra asistencia sobre turnos Reservados.', v_t.codigo, v_t.estado;
    END IF;

    -- Ventana: desde N minutos antes del inicio hasta el final de la jornada
    -- (fin del horario de atención de ese día de la semana).
    v_fin_jornada := COALESCE((
      SELECT max(ags.hora_fin)
      FROM agenda_semanal ags
      WHERE ags.dia_semana = EXTRACT(isodow FROM v_t.fecha)::smallint
        AND ags.estado = 'activo'
    ), v_t.hora_fin);

    v_desde := (v_t.fecha + v_t.hora_inicio)
               - make_interval(mins => fn_parametro('minutos_antes_asistencia'));
    v_hasta := v_t.fecha + GREATEST(v_fin_jornada, v_t.hora_fin);

    IF v_ahora < v_desde OR v_ahora > v_hasta THEN
      RAISE EXCEPTION 'La asistencia del turno % solo puede registrarse entre % y %.', v_t.codigo, v_desde, v_hasta;
    END IF;

    NEW.usuario_id        := v_actor;
    NEW.registrado_at     := now();
    NEW.modificado_at     := NULL;
    NEW.modificado_por    := NULL;
    NEW.motivo_correccion := NULL;
    RETURN NEW;
  END IF;

  -- ---------------- CORRECCIÓN ----------------
  IF NEW.turno_id      IS DISTINCT FROM OLD.turno_id
  OR NEW.usuario_id    IS DISTINCT FROM OLD.usuario_id
  OR NEW.registrado_at IS DISTINCT FROM OLD.registrado_at THEN
    RAISE EXCEPTION 'El turno, el usuario y la fecha de registro de la asistencia no son editables.';
  END IF;

  IF v_rol = 'profesor' THEN
    IF v_prof_actor IS DISTINCT FROM v_t.profesor_id THEN
      RAISE EXCEPTION 'El Profesor solo puede corregir la asistencia de sus propios turnos (turno %).', v_t.codigo;
    END IF;

    IF now() > OLD.registrado_at + make_interval(hours => fn_parametro('horas_correccion_asistencia')) THEN
      RAISE EXCEPTION 'Pasó el plazo de % horas para corregir la asistencia del turno %; solo el Gerente puede modificarla.',
        fn_parametro('horas_correccion_asistencia'), v_t.codigo;
    END IF;

    NEW.motivo_correccion := OLD.motivo_correccion;   -- el motivo es del Gerente

  ELSIF v_rol = 'gerente' THEN
    IF now() > OLD.registrado_at + make_interval(hours => fn_parametro('horas_correccion_asistencia')) THEN
      IF btrim(coalesce(NEW.motivo_correccion, '')) = ''
         OR NEW.motivo_correccion IS NOT DISTINCT FROM OLD.motivo_correccion THEN
        RAISE EXCEPTION 'Fuera del plazo de corrección, el Gerente debe indicar el motivo de la modificación.';
      END IF;
    END IF;

  ELSE
    RAISE EXCEPTION 'Solo el Profesor (dentro del plazo) o el Gerente pueden modificar la asistencia.';
  END IF;

  NEW.modificado_at  := now();
  NEW.modificado_por := v_actor;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_auditoria()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_usuario_id int;
BEGIN
  v_usuario_id := NULLIF(current_setting('app.usuario_id', true), '')::int;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO auditoria (tabla, operacion, registro_id, usuario_id, valores_anteriores, valores_nuevos)
    VALUES (TG_TABLE_NAME, 'INSERT', NEW.id, v_usuario_id, NULL, to_jsonb(NEW));
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO auditoria (tabla, operacion, registro_id, usuario_id, valores_anteriores, valores_nuevos)
    VALUES (TG_TABLE_NAME, 'UPDATE', NEW.id, v_usuario_id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO auditoria (tabla, operacion, registro_id, usuario_id, valores_anteriores, valores_nuevos)
    VALUES (TG_TABLE_NAME, 'DELETE', OLD.id, v_usuario_id, to_jsonb(OLD), NULL);
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_bloquear_modificacion_auditoria()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  RAISE EXCEPTION 'La tabla % es de solo lectura/inserción: no se permite %.',
      TG_TABLE_NAME, TG_OP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_bloqueo_fecha_validar()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_actor  integer := fn_usuario_id_actual();
  v_estado estado_activo_inactivo;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'No se identificó al usuario que opera el bloqueo (app.usuario_id).';
  END IF;

  IF fn_rol_usuario(v_actor) IS DISTINCT FROM 'gerente' THEN
    RAISE EXCEPTION 'Solo el Gerente puede cargar o dar de baja bloqueos de fechas.';
  END IF;

  -- ---------------- ALTA ----------------
  IF TG_OP = 'INSERT' THEN
    IF NEW.profesor_id IS NOT NULL THEN
      SELECT estado INTO v_estado FROM profesor WHERE id = NEW.profesor_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'El profesor indicado (id=%) no existe.', NEW.profesor_id;
      END IF;

      IF v_estado <> 'activo' THEN
        RAISE EXCEPTION 'El profesor (id=%) está inactivo; no se le puede cargar un bloqueo.', NEW.profesor_id;
      END IF;
    END IF;

    NEW.estado          := 'activo';
    NEW.usuario_id      := v_actor;
    NEW.created_at      := now();
    NEW.fecha_baja      := NULL;
    NEW.usuario_baja_id := NULL;
    RETURN NEW;
  END IF;

  -- ---------------- BAJA LÓGICA (único UPDATE permitido) ----------------
  IF OLD.estado = 'inactivo' THEN
    RAISE EXCEPTION 'El bloqueo (id=%) ya fue dado de baja y no admite cambios.', OLD.id;
  END IF;

  IF NEW.estado <> 'inactivo'
     OR NEW.fecha_desde IS DISTINCT FROM OLD.fecha_desde
     OR NEW.fecha_hasta IS DISTINCT FROM OLD.fecha_hasta
     OR NEW.profesor_id IS DISTINCT FROM OLD.profesor_id
     OR NEW.motivo      IS DISTINCT FROM OLD.motivo
     OR NEW.usuario_id  IS DISTINCT FROM OLD.usuario_id
     OR NEW.created_at  IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Un bloqueo no se modifica: solo puede darse de baja. Para cambiarlo, dar de baja y cargar uno nuevo.';
  END IF;

  NEW.fecha_baja      := now();
  NEW.usuario_baja_id := v_actor;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_caja_cerrada(p_fecha date)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  SELECT EXISTS (SELECT 1 FROM cierre_caja WHERE fecha = p_fecha AND estado = 'Cerrada');
$function$
;

CREATE OR REPLACE FUNCTION public.fn_caja_detalle(p_fecha date)
 RETURNS TABLE(pago_id integer, comprobante character varying, alumno_id integer, alumno text, forma_pago_id integer, medio character varying, monto numeric, usuario_id integer, usuario text, estado estado_pago, motivo_anulacion character varying)
 LANGUAGE sql
 STABLE
AS $function$
  SELECT vm.pago_id, vm.comprobante, vm.alumno_id,
         (al.apellido || ', ' || al.nombre),
         vm.forma_pago_id, vm.medio, vm.monto_medio,
         vm.usuario_id, (us.apellido || ', ' || us.nombre),
         vm.estado, pg.motivo_anulacion
  FROM vw_pago_medio vm
  JOIN pago    pg ON pg.id = vm.pago_id
  JOIN alumno  al ON al.id = vm.alumno_id
  JOIN usuario us ON us.id = vm.usuario_id
  WHERE vm.fecha_pago = p_fecha
  ORDER BY vm.medio, vm.comprobante;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_caja_lock(p_fecha date)
 RETURNS void
 LANGUAGE sql
AS $function$
  SELECT pg_advisory_xact_lock(7001, (p_fecha - DATE '2000-01-01'));
$function$
;

CREATE OR REPLACE FUNCTION public.fn_caja_resumen(p_fecha date)
 RETURNS TABLE(forma_pago_id integer, medio character varying, cantidad_comprobantes bigint, subtotal numeric)
 LANGUAGE sql
 STABLE
AS $function$
  SELECT fp.id, fp.nombre,
         count(DISTINCT vm.pago_id),
         COALESCE(sum(vm.monto_medio), 0)
  FROM forma_pago fp
  LEFT JOIN vw_pago_medio vm
         ON vm.forma_pago_id = fp.id
        AND vm.fecha_pago = p_fecha
        AND vm.estado = 'Vigente'
  GROUP BY fp.id, fp.nombre, fp.estado
  HAVING fp.estado = 'activo' OR count(vm.pago_id) > 0
  ORDER BY fp.nombre;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_cierre_caja_validar()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_actor integer := fn_usuario_id_actual();
  v_rol   text;
  v_hoy   date    := (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'No se identificó al usuario que opera la caja (app.usuario_id).';
  END IF;

  v_rol := fn_rol_usuario(v_actor);

  -- ---------------- CIERRE ----------------
  IF TG_OP = 'INSERT' THEN
    IF v_rol IS NULL OR v_rol NOT IN ('gerente', 'mesa de entrada') THEN
      RAISE EXCEPTION 'Solo el Gerente o Mesa de Entrada pueden cerrar la caja.';
    END IF;

    IF NEW.fecha > v_hoy THEN
      RAISE EXCEPTION 'No se puede cerrar la caja de una fecha futura (%).', NEW.fecha;
    END IF;

    PERFORM fn_caja_lock(NEW.fecha);

    IF fn_caja_cerrada(NEW.fecha) THEN
      RAISE EXCEPTION 'La caja del % ya está cerrada.', NEW.fecha;
    END IF;

    SELECT COALESCE(SUM(p.monto), 0)
      INTO NEW.total_registrado
    FROM pago p
    WHERE p.fecha_pago = NEW.fecha AND p.estado = 'Vigente';

    SELECT COALESCE(SUM(vm.monto_medio), 0)
      INTO NEW.efectivo_registrado
    FROM vw_pago_medio vm
    WHERE vm.fecha_pago = NEW.fecha AND vm.estado = 'Vigente' AND vm.es_efectivo;

    NEW.diferencia        := NEW.efectivo_contado - NEW.efectivo_registrado;
    NEW.estado            := 'Cerrada';
    NEW.cerrado_por       := v_actor;
    NEW.cerrado_at        := now();
    NEW.reabierto_por     := NULL;
    NEW.reabierto_at      := NULL;
    NEW.motivo_reapertura := NULL;
    RETURN NEW;
  END IF;

  -- ---------------- REAPERTURA (único UPDATE permitido) ----------------
  IF v_rol IS DISTINCT FROM 'gerente' THEN
    RAISE EXCEPTION 'Solo el Gerente puede reabrir una caja cerrada.';
  END IF;

  IF OLD.estado <> 'Cerrada' THEN
    RAISE EXCEPTION 'La caja del % ya fue reabierta.', OLD.fecha;
  END IF;

  IF NEW.estado <> 'Reabierta'
     OR NEW.fecha               IS DISTINCT FROM OLD.fecha
     OR NEW.total_registrado    IS DISTINCT FROM OLD.total_registrado
     OR NEW.efectivo_registrado IS DISTINCT FROM OLD.efectivo_registrado
     OR NEW.efectivo_contado    IS DISTINCT FROM OLD.efectivo_contado
     OR NEW.diferencia          IS DISTINCT FROM OLD.diferencia
     OR NEW.observaciones       IS DISTINCT FROM OLD.observaciones
     OR NEW.cerrado_por         IS DISTINCT FROM OLD.cerrado_por
     OR NEW.cerrado_at          IS DISTINCT FROM OLD.cerrado_at THEN
    RAISE EXCEPTION 'Un cierre de caja no se modifica: solo puede reabrirse.';
  END IF;

  IF btrim(coalesce(NEW.motivo_reapertura, '')) = '' THEN
    RAISE EXCEPTION 'El motivo de la reapertura es obligatorio.';
  END IF;

  PERFORM fn_caja_lock(OLD.fecha);

  NEW.reabierto_por := v_actor;
  NEW.reabierto_at  := now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_deuda_al(p_fecha date, p_materia_id integer DEFAULT NULL::integer, p_profesor_id integer DEFAULT NULL::integer, p_nivel nivel_materia DEFAULT NULL::nivel_materia)
 RETURNS numeric
 LANGUAGE sql
 STABLE
AS $function$
  SELECT COALESCE(sum(t.valor_clase_congelado), 0)
  FROM turno t
  JOIN materia m ON m.id = t.materia_id
  WHERE fn_ts_servidor_a_art(t.created_at)::date <= p_fecha
    AND NOT (t.estado = 'Cancelado'
             AND COALESCE(t.fecha_cancelacion::date, p_fecha) <= p_fecha)
    AND NOT EXISTS (
          SELECT 1
          FROM pago_turno pt
          JOIN pago pg ON pg.id = pt.pago_id
          WHERE pt.turno_id = t.id
            AND pg.fecha_pago <= p_fecha
            AND (pg.estado = 'Vigente'
                 OR (pg.anulado_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date > p_fecha))
    AND (p_materia_id  IS NULL OR t.materia_id  = p_materia_id)
    AND (p_profesor_id IS NULL OR t.profesor_id = p_profesor_id)
    AND (p_nivel       IS NULL OR m.nivel       = p_nivel);
$function$
;

CREATE OR REPLACE FUNCTION public.fn_deudores(p_materia_id integer DEFAULT NULL::integer, p_profesor_id integer DEFAULT NULL::integer, p_dias_min integer DEFAULT NULL::integer, p_dias_max integer DEFAULT NULL::integer, p_buscar text DEFAULT NULL::text)
 RETURNS TABLE(alumno_id integer, legajo character varying, apellido character varying, nombre character varying, dni character varying, clases_adeudadas bigint, monto_adeudado numeric, fecha_mas_antigua date, dias_antiguedad integer, semaforo text, total_general numeric)
 LANGUAGE sql
 STABLE
AS $function$
  WITH q AS (
    SELECT CASE
             WHEN p_buscar IS NULL OR btrim(p_buscar) = '' THEN NULL
             ELSE '%' || replace(replace(replace(btrim(p_buscar), '\', '\\'), '%', '\%'), '_', '\_') || '%'
           END AS pat
  ),
  d AS (
    SELECT dc.alumno_id        AS aid,
           count(*)            AS n,
           sum(dc.importe)     AS monto,
           min(dc.fecha)       AS antigua,
           max(dc.dias_antiguedad) AS dias
    FROM vw_deuda_clase dc
    WHERE (p_materia_id  IS NULL OR dc.materia_id  = p_materia_id)
      AND (p_profesor_id IS NULL OR dc.profesor_id = p_profesor_id)
    GROUP BY dc.alumno_id
  ),
  f AS (
    SELECT a.id AS aid, a.legajo AS legajo, a.apellido AS apellido, a.nombre AS nombre, a.dni AS dni,
           d.n, d.monto, d.antigua, d.dias
    FROM d
    JOIN alumno a ON a.id = d.aid
    CROSS JOIN q
    WHERE d.monto > 0
      AND (p_dias_min IS NULL OR d.dias >= p_dias_min)
      AND (p_dias_max IS NULL OR d.dias <= p_dias_max)
      AND (q.pat IS NULL
           OR a.nombre   ILIKE q.pat
           OR a.apellido ILIKE q.pat
           OR (a.nombre   || ' ' || a.apellido) ILIKE q.pat
           OR (a.apellido || ' ' || a.nombre)   ILIKE q.pat
           OR a.dni      ILIKE q.pat
           OR coalesce(a.legajo, '') ILIKE q.pat)
  )
  SELECT f.aid,
         f.legajo,
         f.apellido,
         f.nombre,
         f.dni,
         f.n,
         f.monto,
         f.antigua,
         f.dias,
         CASE WHEN f.dias <= 30 THEN 'amarillo'
              WHEN f.dias <= 60 THEN 'naranja'
              ELSE 'rojo' END,
         sum(f.monto) OVER ()
  FROM f
  ORDER BY f.monto DESC, f.apellido, f.nombre;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_eliminar_usuario_cascade(p_usuario_id integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_profesor_id integer;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM usuario WHERE id = p_usuario_id) THEN
        RAISE EXCEPTION 'El usuario (id=%) no existe.', p_usuario_id;
    END IF;
 
    -- ¿Este usuario tiene ficha de profesor?
    SELECT id INTO v_profesor_id FROM profesor WHERE usuario_id = p_usuario_id;
 
    IF v_profesor_id IS NOT NULL THEN
        -- precio_clase depende de profesor_materia
        DELETE FROM precio_clase
        WHERE profesor_materia_id IN (
            SELECT id FROM profesor_materia WHERE profesor_id = v_profesor_id
        );
 
        DELETE FROM profesor_materia WHERE profesor_id = v_profesor_id;
 
        DELETE FROM agenda_profesional WHERE profesor_id = v_profesor_id;
 
        -- turnos donde este usuario es EL PROFESOR
        DELETE FROM turno WHERE profesor_id = v_profesor_id;
 
        DELETE FROM profesor WHERE id = v_profesor_id;
    END IF;
 
    -- turnos donde este usuario fue quien hizo la reserva
    -- (ej: Mesa de Entrada o Gerente reservando para un alumno/profesor)
    DELETE FROM turno WHERE usuario_id = p_usuario_id;
 
    -- auditoria / auditoria_sesion: no requieren DELETE manual, tienen
    -- ON DELETE SET NULL en usuario_id. PERO esas dos tablas tienen un
    -- trigger que bloquea cualquier UPDATE (incluso el que dispara la
    -- propia FK al poner usuario_id = NULL). Hay que desactivar esos
    -- triggers justo antes del DELETE final y reactivarlos después,
    -- pase lo que pase (por eso el BEGIN/EXCEPTION).
    ALTER TABLE auditoria         DISABLE TRIGGER trg_auditoria_bloquear_cambios;
    ALTER TABLE auditoria_sesion  DISABLE TRIGGER trg_auditoria_sesion_bloquear_cambios;
 
    BEGIN
        DELETE FROM usuario WHERE id = p_usuario_id;
    EXCEPTION WHEN OTHERS THEN
        ALTER TABLE auditoria         ENABLE TRIGGER trg_auditoria_bloquear_cambios;
        ALTER TABLE auditoria_sesion  ENABLE TRIGGER trg_auditoria_sesion_bloquear_cambios;
        RAISE;
    END;
 
    ALTER TABLE auditoria         ENABLE TRIGGER trg_auditoria_bloquear_cambios;
    ALTER TABLE auditoria_sesion  ENABLE TRIGGER trg_auditoria_sesion_bloquear_cambios;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_estado_cuenta(p_alumno_id integer)
 RETURNS TABLE(fecha date, hora time without time zone, tipo text, referencia_id integer, referencia character varying, detalle text, estado text, cargo numeric, credito numeric, afecta_saldo boolean, saldo_acumulado numeric)
 LANGUAGE sql
 STABLE
AS $function$
  WITH mov AS (
    SELECT t.fecha                      AS f,
           t.hora_inicio                AS h,
           'Clase'::text                AS tp,
           0                            AS orden,
           t.id                         AS rid,
           t.codigo                     AS ref,
           (m.nombre || ' - ' || u.apellido || ', ' || u.nombre) AS det,
           t.estado::text               AS est,
           t.valor_clase_congelado::numeric AS cg,
           0::numeric                   AS cr,
           (t.estado <> 'Cancelado') AS afecta
    FROM turno t
    JOIN materia  m ON m.id = t.materia_id
    JOIN profesor p ON p.id = t.profesor_id
    JOIN usuario  u ON u.id = p.usuario_id
    WHERE t.alumno_id = p_alumno_id
      AND (t.estado = 'Cancelado'
           OR fn_turno_cobrable(t.estado))

    UNION ALL

    SELECT pg.fecha_pago,
           (pg.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::time,
           'Pago'::text,
           1,
           pg.id,
           pg.comprobante,
           coalesce((SELECT string_agg(fp.nombre, ' + ' ORDER BY fp.nombre)
                     FROM pago_forma_pago pfp
                     JOIN forma_pago fp ON fp.id = pfp.forma_pago_id
                     WHERE pfp.pago_id = pg.id), ''),
           pg.estado::text,
           0::numeric,
           pg.monto::numeric,
           (pg.estado = 'Vigente')
    FROM pago pg
    WHERE pg.alumno_id = p_alumno_id
  )
  SELECT mov.f, mov.h, mov.tp, mov.rid, mov.ref, mov.det, mov.est, mov.cg, mov.cr, mov.afecta,
         sum(CASE WHEN mov.afecta THEN mov.cg - mov.cr ELSE 0 END)
           OVER (ORDER BY mov.f, mov.orden, mov.h, mov.rid
                 ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
  FROM mov
  ORDER BY mov.f, mov.orden, mov.h, mov.rid;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_historial_resumen(p_alumno_id integer)
 RETURNS TABLE(clases_asistidas bigint, ausencias bigint, cancelaciones bigint, porcentaje_asistencia numeric, fecha_ultima_clase date)
 LANGUAGE sql
 STABLE
AS $function$
  SELECT r.clases_asistio,
         r.clases_ausente,
         r.clases_canceladas,
         r.porcentaje_asistencia,
         (SELECT max(t.fecha) FROM turno t
           WHERE t.alumno_id = p_alumno_id AND t.estado = 'Asistió')
  FROM fn_asistencia_resumen(p_alumno_id) r;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_ind_direccion_valores(p_desde date, p_hasta date, p_materia_id integer DEFAULT NULL::integer, p_profesor_id integer DEFAULT NULL::integer, p_nivel nivel_materia DEFAULT NULL::nivel_materia)
 RETURNS TABLE(clave text, valor numeric)
 LANGUAGE plpgsql
 STABLE
AS $function$
#variable_conflict use_column
DECLARE
  v_corte date := LEAST(p_hasta, (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date);
  v_gen   bigint;
  v_can   bigint;
  v_asi   bigint;
  v_aus   bigint;
  v_res   numeric;
  v_disp  numeric;
  v_ing   numeric;
  v_act   bigint;
  v_alt   bigint;
  v_deu   numeric;
BEGIN
  SELECT count(*),
         count(*) FILTER (WHERE t.estado = 'Cancelado'),
         count(*) FILTER (WHERE t.estado = 'Asistió'),
         count(*) FILTER (WHERE t.estado = 'Ausente')
    INTO v_gen, v_can, v_asi, v_aus
  FROM turno t
  JOIN materia m ON m.id = t.materia_id
  WHERE t.fecha BETWEEN p_desde AND p_hasta
    AND (p_materia_id  IS NULL OR t.materia_id  = p_materia_id)
    AND (p_profesor_id IS NULL OR t.profesor_id = p_profesor_id)
    AND (p_nivel       IS NULL OR m.nivel       = p_nivel);

  SELECT COALESCE(sum(oc.horas_reservadas), 0), COALESCE(sum(oc.horas_disponibles), 0)
    INTO v_res, v_disp
  FROM fn_ocupacion(p_desde, p_hasta, p_profesor_id, p_materia_id, p_nivel) oc;

  SELECT COALESCE(sum(pt.importe), 0)
    INTO v_ing
  FROM pago_turno pt
  JOIN pago    pg ON pg.id = pt.pago_id AND pg.estado = 'Vigente'
  JOIN turno   t  ON t.id  = pt.turno_id
  JOIN materia m  ON m.id  = t.materia_id
  WHERE pt.vigente
    AND pg.fecha_pago BETWEEN p_desde AND p_hasta
    AND (p_materia_id  IS NULL OR t.materia_id  = p_materia_id)
    AND (p_profesor_id IS NULL OR t.profesor_id = p_profesor_id)
    AND (p_nivel       IS NULL OR m.nivel       = p_nivel);

  v_act := fn_alumnos_activos_al(v_corte, p_nivel);

  SELECT count(*) INTO v_alt
  FROM alumno a
  WHERE fn_ts_servidor_a_art(a.created_at)::date BETWEEN p_desde AND p_hasta
    AND (p_nivel IS NULL OR a.nivel_educativo = p_nivel);

  v_deu := fn_deuda_al(v_corte, p_materia_id, p_profesor_id, p_nivel);

  RETURN QUERY
  SELECT v.k, v.v
  FROM (VALUES
    ('turnos_generados'::text,
       v_gen::numeric),
    ('porcentaje_cancelaciones',
       CASE WHEN v_gen = 0 THEN NULL ELSE round(100.0 * v_can / v_gen, 1) END),
    ('porcentaje_ocupacion',
       CASE WHEN v_disp = 0 THEN NULL ELSE round(100.0 * v_res / v_disp, 1) END),
    ('porcentaje_asistencia',
       CASE WHEN v_asi + v_aus = 0 THEN NULL ELSE round(100.0 * v_asi / (v_asi + v_aus), 1) END),
    ('alumnos_activos',
       v_act::numeric),
    ('altas_alumnos',
       v_alt::numeric),
    ('ingresos_cobrados',
       v_ing),
    ('deuda_pendiente_total',
       v_deu)
  ) AS v(k, v);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_ind_mapa_calor(p_desde date, p_hasta date, p_materia_id integer DEFAULT NULL::integer, p_profesor_id integer DEFAULT NULL::integer, p_nivel nivel_materia DEFAULT NULL::nivel_materia, p_hora_desde time without time zone DEFAULT NULL::time without time zone, p_hora_hasta time without time zone DEFAULT NULL::time without time zone)
 RETURNS TABLE(materia_id integer, materia character varying, franja_hora integer, franja text, turnos bigint)
 LANGUAGE plpgsql
 STABLE
AS $function$
#variable_conflict use_column
BEGIN
  PERFORM fn_validar_periodo(p_desde, p_hasta);

  RETURN QUERY
  SELECT m.id,
         m.nombre,
         EXTRACT(hour FROM t.hora_inicio)::integer,
         (lpad(EXTRACT(hour FROM t.hora_inicio)::integer::text, 2, '0') || ':00-'
            || lpad((EXTRACT(hour FROM t.hora_inicio)::integer + 1)::text, 2, '0') || ':00'),
         count(*)
  FROM turno t
  JOIN materia m ON m.id = t.materia_id
  WHERE t.estado <> 'Cancelado'
    AND t.fecha BETWEEN p_desde AND p_hasta
    AND (p_materia_id  IS NULL OR t.materia_id  = p_materia_id)
    AND (p_profesor_id IS NULL OR t.profesor_id = p_profesor_id)
    AND (p_nivel       IS NULL OR m.nivel       = p_nivel)
    AND (p_hora_desde  IS NULL OR t.hora_inicio >= p_hora_desde)
    AND (p_hora_hasta  IS NULL OR t.hora_inicio <  p_hora_hasta)
  GROUP BY m.id, m.nombre, EXTRACT(hour FROM t.hora_inicio)::integer
  ORDER BY m.nombre, EXTRACT(hour FROM t.hora_inicio)::integer;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_ind_top_materias_demanda(p_desde date, p_hasta date, p_materia_id integer DEFAULT NULL::integer, p_profesor_id integer DEFAULT NULL::integer, p_nivel nivel_materia DEFAULT NULL::nivel_materia)
 RETURNS TABLE(materia_id integer, materia character varying, turnos bigint, horas_dictadas numeric)
 LANGUAGE plpgsql
 STABLE
AS $function$
#variable_conflict use_column
BEGIN
  PERFORM fn_validar_periodo(p_desde, p_hasta);

  RETURN QUERY
  SELECT m.id,
         m.nombre,
         count(*),
         round(COALESCE(sum(EXTRACT(epoch FROM (t.hora_fin - t.hora_inicio)) / 3600.0), 0)::numeric, 2)
  FROM turno t
  JOIN materia m ON m.id = t.materia_id
  WHERE t.estado <> 'Cancelado'
    AND t.fecha BETWEEN p_desde AND p_hasta
    AND (p_materia_id  IS NULL OR t.materia_id  = p_materia_id)
    AND (p_profesor_id IS NULL OR t.profesor_id = p_profesor_id)
    AND (p_nivel       IS NULL OR m.nivel       = p_nivel)
  GROUP BY m.id, m.nombre
  ORDER BY count(*) DESC, 4 DESC, m.nombre
  LIMIT 5;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_ind_top_materias_ingresos(p_desde date, p_hasta date, p_materia_id integer DEFAULT NULL::integer, p_profesor_id integer DEFAULT NULL::integer, p_nivel nivel_materia DEFAULT NULL::nivel_materia)
 RETURNS TABLE(materia_id integer, materia character varying, ingresos numeric, turnos bigint)
 LANGUAGE plpgsql
 STABLE
AS $function$
#variable_conflict use_column
BEGIN
  PERFORM fn_validar_periodo(p_desde, p_hasta);

  RETURN QUERY
  SELECT m.id,
         m.nombre,
         sum(pt.importe),
         count(DISTINCT t.id)
  FROM pago_turno pt
  JOIN pago    pg ON pg.id = pt.pago_id AND pg.estado = 'Vigente'
  JOIN turno   t  ON t.id  = pt.turno_id
  JOIN materia m  ON m.id  = t.materia_id
  WHERE pt.vigente
    AND pg.fecha_pago BETWEEN p_desde AND p_hasta
    AND (p_materia_id  IS NULL OR t.materia_id  = p_materia_id)
    AND (p_profesor_id IS NULL OR t.profesor_id = p_profesor_id)
    AND (p_nivel       IS NULL OR m.nivel       = p_nivel)
  GROUP BY m.id, m.nombre
  ORDER BY sum(pt.importe) DESC, count(DISTINCT t.id) DESC, m.nombre
  LIMIT 5;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_ind_top_profesores(p_desde date, p_hasta date, p_materia_id integer DEFAULT NULL::integer, p_profesor_id integer DEFAULT NULL::integer, p_nivel nivel_materia DEFAULT NULL::nivel_materia)
 RETURNS TABLE(profesor_id integer, profesor text, clases_dictadas bigint, horas_dictadas numeric)
 LANGUAGE plpgsql
 STABLE
AS $function$
#variable_conflict use_column
BEGIN
  PERFORM fn_validar_periodo(p_desde, p_hasta);

  RETURN QUERY
  SELECT p.id,
         (u.apellido || ', ' || u.nombre),
         count(*),
         round(sum(EXTRACT(epoch FROM (t.hora_fin - t.hora_inicio)) / 3600.0)::numeric, 2)
  FROM turno t
  JOIN materia  m ON m.id = t.materia_id
  JOIN profesor p ON p.id = t.profesor_id
  JOIN usuario  u ON u.id = p.usuario_id
  WHERE t.estado = 'Asistió'
    AND t.fecha BETWEEN p_desde AND p_hasta
    AND (p_materia_id  IS NULL OR t.materia_id  = p_materia_id)
    AND (p_profesor_id IS NULL OR t.profesor_id = p_profesor_id)
    AND (p_nivel       IS NULL OR m.nivel       = p_nivel)
  GROUP BY p.id, u.apellido, u.nombre
  ORDER BY count(*) DESC, u.apellido, u.nombre
  LIMIT 5;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_ind_turnos_por_semana(p_desde date, p_hasta date, p_materia_id integer DEFAULT NULL::integer, p_profesor_id integer DEFAULT NULL::integer, p_nivel nivel_materia DEFAULT NULL::nivel_materia)
 RETURNS TABLE(semana_inicio date, semana_fin date, turnos bigint, cancelados bigint)
 LANGUAGE plpgsql
 STABLE
AS $function$
#variable_conflict use_column
BEGIN
  PERFORM fn_validar_periodo(p_desde, p_hasta);

  RETURN QUERY
  SELECT s.ini::date,
         (s.ini::date + 6),
         count(t.id),
         count(t.id) FILTER (WHERE t.estado = 'Cancelado')
  FROM generate_series(date_trunc('week', p_desde::timestamp), p_hasta::timestamp, interval '7 days') AS s(ini)
  LEFT JOIN (
        SELECT tt.id, tt.fecha, tt.estado
        FROM turno tt
        JOIN materia mm ON mm.id = tt.materia_id
        WHERE tt.fecha BETWEEN p_desde AND p_hasta
          AND (p_materia_id  IS NULL OR tt.materia_id  = p_materia_id)
          AND (p_profesor_id IS NULL OR tt.profesor_id = p_profesor_id)
          AND (p_nivel       IS NULL OR mm.nivel       = p_nivel)
      ) t
         ON t.fecha BETWEEN s.ini::date AND (s.ini::date + 6)
  GROUP BY s.ini
  ORDER BY s.ini;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_indicadores_direccion(p_desde date, p_hasta date, p_materia_id integer DEFAULT NULL::integer, p_profesor_id integer DEFAULT NULL::integer, p_nivel nivel_materia DEFAULT NULL::nivel_materia)
 RETURNS TABLE(clave text, etiqueta text, unidad text, valor numeric, valor_anterior numeric, variacion_porcentual numeric, mejora boolean, menor_es_mejor boolean)
 LANGUAGE plpgsql
 STABLE
AS $function$
#variable_conflict use_column
DECLARE
  v_dias        integer;
  v_prev_hasta  date;
  v_prev_desde  date;
BEGIN
  PERFORM fn_validar_periodo(p_desde, p_hasta);

  v_dias       := p_hasta - p_desde + 1;
  v_prev_hasta := p_desde - 1;
  v_prev_desde := v_prev_hasta - (v_dias - 1);

  RETURN QUERY
  WITH act AS (
    SELECT * FROM fn_ind_direccion_valores(p_desde, p_hasta, p_materia_id, p_profesor_id, p_nivel)
  ),
  ant AS (
    SELECT * FROM fn_ind_direccion_valores(v_prev_desde, v_prev_hasta, p_materia_id, p_profesor_id, p_nivel)
  ),
  def AS (
    SELECT * FROM (VALUES
      (1, 'turnos_generados'::text,        'Turnos generados'::text,          'cantidad'::text,    false),
      (2, 'porcentaje_cancelaciones',      '% de cancelaciones',              'porcentaje',        true),
      (3, 'porcentaje_ocupacion',          '% de ocupación',                  'porcentaje',        false),
      (4, 'porcentaje_asistencia',         '% de asistencia global',          'porcentaje',        false),
      (5, 'alumnos_activos',               'Alumnos activos',                 'cantidad',          false),
      (6, 'altas_alumnos',                 'Altas de alumnos',                'cantidad',          false),
      (7, 'ingresos_cobrados',             'Ingresos cobrados',               'pesos',             false),
      (8, 'deuda_pendiente_total',         'Deuda pendiente total',           'pesos',             true)
    ) AS d(orden, clave, etiqueta, unidad, menor)
  )
  SELECT d.clave,
         d.etiqueta,
         d.unidad,
         a.valor,
         b.valor,
         CASE WHEN a.valor IS NULL OR b.valor IS NULL OR b.valor = 0 THEN NULL
              ELSE round(100.0 * (a.valor - b.valor) / b.valor, 1) END,
         CASE WHEN a.valor IS NULL OR b.valor IS NULL OR a.valor = b.valor THEN NULL
              WHEN d.menor THEN a.valor < b.valor
              ELSE a.valor > b.valor END,
         d.menor
  FROM def d
  JOIN act a ON a.clave = d.clave
  JOIN ant b ON b.clave = d.clave
  ORDER BY d.orden;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_indicadores_profesor(p_profesor_id integer, p_desde date, p_hasta date, p_materia_id integer DEFAULT NULL::integer)
 RETURNS TABLE(hay_datos boolean, clases_dictadas bigint, alumnos_atendidos bigint, horas_dictadas numeric, porcentaje_asistencia numeric, porcentaje_cancelaciones numeric, porcentaje_ocupacion numeric, total_turnos bigint, turnos_ausentes bigint, turnos_cancelados bigint, cancelados_por_alumno bigint, cancelados_por_profesor bigint, cancelados_por_centro bigint, horas_reservadas numeric, horas_disponibles numeric)
 LANGUAGE plpgsql
 STABLE
AS $function$
#variable_conflict use_column
BEGIN
  PERFORM fn_validar_periodo(p_desde, p_hasta);

  RETURN QUERY
  WITH x AS (
    SELECT tu.alumno_id AS al, tu.estado AS est, tu.hora_inicio AS hi, tu.hora_fin AS hf,
           mc.responsable AS resp
    FROM turno tu
    LEFT JOIN motivo_cancelacion mc ON mc.id = tu.motivo_cancelacion_id
    WHERE tu.profesor_id = p_profesor_id
      AND tu.fecha BETWEEN p_desde AND p_hasta
      AND (p_materia_id IS NULL OR tu.materia_id = p_materia_id)
  ),
  c AS (
    SELECT count(*) FILTER (WHERE est = 'Asistió')                       AS dict,
           count(DISTINCT al) FILTER (WHERE est = 'Asistió')             AS alu,
           COALESCE(sum(EXTRACT(epoch FROM (hf - hi)) / 3600.0)
                    FILTER (WHERE est = 'Asistió'), 0)                   AS horas,
           count(*) FILTER (WHERE est = 'Ausente')                       AS aus,
           count(*) FILTER (WHERE est = 'Cancelado')                     AS can,
           count(*) FILTER (WHERE est = 'Cancelado' AND resp = 'Alumno')   AS can_al,
           count(*) FILTER (WHERE est = 'Cancelado' AND resp = 'Profesor') AS can_pr,
           count(*) FILTER (WHERE est = 'Cancelado' AND resp = 'Centro')   AS can_ce,
           count(*)                                                      AS tot
    FROM x
  ),
  o AS (
    SELECT COALESCE(sum(oc.horas_reservadas), 0)  AS res,
           COALESCE(sum(oc.horas_disponibles), 0) AS disp
    FROM fn_ocupacion(p_desde, p_hasta, p_profesor_id, p_materia_id) oc
  )
  SELECT c.tot > 0,
         c.dict,
         c.alu,
         round(c.horas::numeric, 2),
         CASE WHEN c.dict + c.aus = 0 THEN NULL
              ELSE round(100.0 * c.dict / (c.dict + c.aus), 1) END,
         CASE WHEN c.tot = 0 THEN NULL
              ELSE round(100.0 * c.can / c.tot, 1) END,
         CASE WHEN o.disp = 0 THEN NULL
              ELSE round(100.0 * o.res / o.disp, 1) END,
         c.tot,
         c.aus,
         c.can,
         c.can_al,
         c.can_pr,
         c.can_ce,
         o.res,
         o.disp
  FROM c CROSS JOIN o;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_nota_alumno_validar()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_actor  integer := fn_usuario_id_actual();
  v_rol    text;
  v_estado estado_activo_inactivo;
  v_prof   integer;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'No se identificó al usuario que agrega la nota (app.usuario_id).';
  END IF;

  v_rol := fn_rol_usuario(v_actor);
  IF v_rol IS NULL OR v_rol NOT IN ('gerente', 'mesa de entrada', 'profesor') THEN
    RAISE EXCEPTION 'Solo Mesa de Entrada, Gerente o Profesor pueden agregar notas al historial.';
  END IF;

  SELECT estado INTO v_estado FROM alumno WHERE id = NEW.alumno_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El alumno indicado (id=%) no existe.', NEW.alumno_id;
  END IF;

  -- El historial de un alumno inactivo es de solo lectura.
  IF v_estado <> 'activo' THEN
    RAISE EXCEPTION 'El alumno (id=%) está inactivo: su historial es de solo lectura.', NEW.alumno_id;
  END IF;

  IF v_rol = 'profesor' THEN
    SELECT p.id INTO v_prof
    FROM profesor p
    WHERE p.usuario_id = v_actor AND p.estado = 'activo';

    IF v_prof IS NULL OR NOT fn_profesor_atiende_alumno(v_prof, NEW.alumno_id) THEN
      RAISE EXCEPTION 'El Profesor solo puede agregar notas de los alumnos que atiende.';
    END IF;
  END IF;

  NEW.usuario_id := v_actor;
  NEW.created_at := now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_ocupacion(p_desde date, p_hasta date, p_profesor_id integer DEFAULT NULL::integer, p_materia_id integer DEFAULT NULL::integer, p_nivel nivel_materia DEFAULT NULL::nivel_materia)
 RETURNS TABLE(profesor_id integer, fecha date, horas_disponibles numeric, horas_reservadas numeric, porcentaje_ocupacion numeric, semaforo text, bloqueado boolean)
 LANGUAGE sql
 STABLE
AS $function$
  WITH dias AS (
    SELECT g::date AS dia
    FROM generate_series(p_desde::timestamp, p_hasta::timestamp, interval '1 day') g
  ),
  disp AS (
    SELECT ap.profesor_id AS prof, d.dia,
           sum(EXTRACT(epoch FROM (ap.hora_fin - ap.hora_inicio)) / 3600.0) AS horas
    FROM dias d
    JOIN agenda_semanal     ags ON ags.dia_semana = EXTRACT(isodow FROM d.dia)::smallint
                               AND ags.estado = 'activo'
    JOIN agenda_profesional ap  ON ap.agenda_semanal_id = ags.id
                               AND ap.estado = 'activo'
    JOIN profesor           pr  ON pr.id = ap.profesor_id
                               AND pr.estado = 'activo'
    WHERE (p_profesor_id IS NULL OR ap.profesor_id = p_profesor_id)
      AND (p_materia_id IS NULL OR ap.profesor_id IN (
             SELECT pm.profesor_id FROM profesor_materia pm
             WHERE pm.materia_id = p_materia_id))
      AND (p_nivel IS NULL OR ap.profesor_id IN (
             SELECT pm.profesor_id FROM profesor_materia pm
             JOIN materia mm ON mm.id = pm.materia_id
             WHERE mm.nivel = p_nivel))
    GROUP BY ap.profesor_id, d.dia
  ),
  tur AS (
    SELECT t.id, t.profesor_id AS prof, t.fecha AS dia, t.hora_inicio, t.hora_fin,
           max(t.hora_fin) OVER (
             PARTITION BY t.profesor_id, t.fecha
             ORDER BY t.hora_inicio, t.hora_fin, t.id
             ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS fin_previo
    FROM turno t
    WHERE t.fecha BETWEEN p_desde AND p_hasta
      AND t.estado <> 'Cancelado'
      AND (p_profesor_id IS NULL OR t.profesor_id = p_profesor_id)
      AND (p_materia_id  IS NULL OR t.materia_id  = p_materia_id)
      AND (p_nivel IS NULL OR t.materia_id IN (
             SELECT mm.id FROM materia mm WHERE mm.nivel = p_nivel))
  ),
  islas AS (
    SELECT prof, dia, hora_inicio, hora_fin,
           sum(CASE WHEN fin_previo IS NULL OR hora_inicio > fin_previo THEN 1 ELSE 0 END)
             OVER (PARTITION BY prof, dia
                   ORDER BY hora_inicio, hora_fin, id
                   ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS isla
    FROM tur
  ),
  res AS (
    SELECT prof, dia,
           sum(EXTRACT(epoch FROM (fin - ini)) / 3600.0) AS horas
    FROM (
      SELECT prof, dia, isla, min(hora_inicio) AS ini, max(hora_fin) AS fin
      FROM islas
      GROUP BY prof, dia, isla
    ) x
    GROUP BY prof, dia
  ),
  base AS (
    SELECT COALESCE(d.prof, r.prof) AS prof,
           COALESCE(d.dia,  r.dia)  AS dia,
           COALESCE(d.horas, 0)     AS disp_bruta,
           COALESCE(r.horas, 0)     AS res
    FROM disp d
    FULL JOIN res r ON r.prof = d.prof AND r.dia = d.dia
  ),
  calc AS (
    SELECT b.prof, b.dia, b.res,
           EXISTS (SELECT 1 FROM bloqueo_fecha bl
                   WHERE bl.estado = 'activo'
                     AND b.dia BETWEEN bl.fecha_desde AND bl.fecha_hasta
                     AND (bl.profesor_id IS NULL OR bl.profesor_id = b.prof)) AS bloq,
           b.disp_bruta
    FROM base b
  ),
  fin AS (
    SELECT c.prof, c.dia, c.bloq, c.res,
           CASE WHEN c.bloq THEN 0 ELSE c.disp_bruta END AS disp
    FROM calc c
  )
  SELECT f.prof,
         f.dia,
         round(f.disp::numeric, 2),
         round(f.res::numeric, 2),
         CASE WHEN f.disp = 0 THEN NULL
              ELSE round(100.0 * f.res / f.disp, 1) END,
         CASE WHEN f.disp = 0 THEN NULL
              WHEN 100.0 * f.res / f.disp < 50 THEN 'verde'
              WHEN 100.0 * f.res / f.disp <= 80 THEN 'amarillo'
              ELSE 'rojo' END,
         f.bloq
  FROM fin f
  ORDER BY f.dia, f.prof;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_pago_anular_liberar_turnos()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE pago_turno
     SET vigente = false
   WHERE pago_id = NEW.id AND vigente;

  UPDATE turno
     SET pagado = false
   WHERE id IN (SELECT turno_id FROM pago_turno WHERE pago_id = NEW.id)
     AND pagado;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_pago_forma_pago_validar()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_nombre   varchar;
  v_estado   estado_activo_inactivo;
  v_requiere boolean;
BEGIN
  SELECT nombre, estado, requiere_nro_operacion
    INTO v_nombre, v_estado, v_requiere
  FROM forma_pago WHERE id = NEW.forma_pago_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La forma de pago indicada (id=%) no existe.', NEW.forma_pago_id;
  END IF;

  IF v_estado <> 'activo' THEN
    RAISE EXCEPTION 'La forma de pago "%" está inactiva.', v_nombre;
  END IF;

  IF v_requiere AND btrim(coalesce(NEW.nro_operacion, '')) = '' THEN
    RAISE EXCEPTION 'La forma de pago "%" requiere N° de operación o referencia.', v_nombre;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_pago_turno_marcar_pagado()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE turno SET pagado = true WHERE id = NEW.turno_id;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_pago_turno_proteger()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF OLD.vigente
     AND NOT NEW.vigente
     AND NEW.pago_id  = OLD.pago_id
     AND NEW.turno_id = OLD.turno_id
     AND NEW.importe  = OLD.importe
     AND EXISTS (SELECT 1 FROM pago WHERE id = OLD.pago_id AND estado = 'Anulado') THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Las clases de un pago registrado no pueden modificarse; el pago solo puede anularse.';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_pago_turno_validar()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_alumno_pago  integer;
  v_t            turno%ROWTYPE;
BEGIN
  SELECT alumno_id INTO v_alumno_pago FROM pago WHERE id = NEW.pago_id;
  SELECT * INTO v_t FROM turno WHERE id = NEW.turno_id FOR UPDATE;

  IF v_t.alumno_id <> v_alumno_pago THEN
    RAISE EXCEPTION 'El turno % no pertenece al alumno del pago.', v_t.codigo;
  END IF;

  IF v_t.estado = 'Cancelado' THEN
    RAISE EXCEPTION 'El turno % está cancelado y no puede abonarse.', v_t.codigo;
  END IF;

  IF NOT fn_turno_cobrable(v_t.estado) THEN
    RAISE EXCEPTION 'El turno % (estado "%") no puede cobrarse.', v_t.codigo, v_t.estado;
  END IF;

  IF v_t.pagado THEN
    RAISE EXCEPTION 'El turno % ya fue pagado.', v_t.codigo;
  END IF;

  NEW.importe := v_t.valor_clase_congelado;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_pago_validar_alumno()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_estado estado_activo_inactivo;
BEGIN
  SELECT estado INTO v_estado FROM alumno WHERE id = NEW.alumno_id;

  IF v_estado IS DISTINCT FROM 'activo' THEN
    RAISE EXCEPTION 'El alumno (id=%) no existe o está inactivo; no se puede registrar el pago.', NEW.alumno_id;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_pago_validar_anulacion()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_actor integer := fn_usuario_id_actual();
  v_rol   text;
BEGIN
  IF OLD.estado = 'Anulado' THEN
    RAISE EXCEPTION 'El pago % ya está anulado y no admite cambios.', OLD.comprobante;
  END IF;

  IF NEW.estado <> 'Anulado'
     OR NEW.alumno_id     IS DISTINCT FROM OLD.alumno_id
     OR NEW.monto         IS DISTINCT FROM OLD.monto
     OR NEW.fecha_pago    IS DISTINCT FROM OLD.fecha_pago
     OR NEW.observaciones IS DISTINCT FROM OLD.observaciones
     OR NEW.usuario_id    IS DISTINCT FROM OLD.usuario_id
     OR NEW.created_at    IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Los pagos registrados no pueden modificarse, solo anularse (pago %).', OLD.comprobante;
  END IF;

  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'No se identificó al usuario que anula el pago (app.usuario_id).';
  END IF;

  v_rol := fn_rol_usuario(v_actor);
  IF v_rol IS NULL OR v_rol NOT IN ('gerente', 'mesa de entrada') THEN
    RAISE EXCEPTION 'Solo el Gerente o Mesa de Entrada pueden anular pagos.';
  END IF;

  IF btrim(coalesce(NEW.motivo_anulacion, '')) = '' THEN
    RAISE EXCEPTION 'El motivo de la anulación es obligatorio.';
  END IF;

  NEW.anulado_at  := now();
  NEW.anulado_por := v_actor;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_pago_validar_caja()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  PERFORM fn_caja_lock(NEW.fecha_pago);

  IF fn_caja_cerrada(NEW.fecha_pago) THEN
    RAISE EXCEPTION 'La caja del % está cerrada: no se pueden registrar ni anular pagos de esa fecha.', NEW.fecha_pago;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_pago_validar_consistencia()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_suma_turnos  numeric(12,2);
  v_formas       integer;
  v_suma_formas  numeric(12,2);
  v_sin_monto    integer;
  v_monto_unico  numeric(12,2);
BEGIN
  SELECT COALESCE(SUM(importe), 0) INTO v_suma_turnos FROM pago_turno WHERE pago_id = NEW.id;

  SELECT COUNT(*),
         COALESCE(SUM(monto), 0),
         COUNT(*) FILTER (WHERE monto IS NULL),
         MAX(monto)
    INTO v_formas, v_suma_formas, v_sin_monto, v_monto_unico
  FROM pago_forma_pago WHERE pago_id = NEW.id;

  IF v_suma_turnos <> NEW.monto THEN
    RAISE EXCEPTION 'El monto del pago (%) no coincide con la suma de las clases seleccionadas (%).', NEW.monto, v_suma_turnos;
  END IF;

  IF v_formas = 0 THEN
    RAISE EXCEPTION 'El pago debe tener al menos una forma de pago.';
  END IF;

  IF v_formas = 1 THEN
    IF v_monto_unico IS NOT NULL AND v_monto_unico <> NEW.monto THEN
      RAISE EXCEPTION 'El monto de la forma de pago (%) no coincide con el monto del pago (%).', v_monto_unico, NEW.monto;
    END IF;
  ELSE
    IF v_sin_monto > 0 THEN
      RAISE EXCEPTION 'Cuando el pago se divide en varios medios, cada uno debe indicar su monto.';
    END IF;

    IF v_suma_formas <> NEW.monto THEN
      RAISE EXCEPTION 'La suma de los montos por medio de pago (%) no coincide con el monto del pago (%).', v_suma_formas, NEW.monto;
    END IF;
  END IF;

  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_parametro(p_clave character varying)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  v_valor integer;
BEGIN
  SELECT valor INTO v_valor FROM parametro WHERE clave = p_clave;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El parámetro "%" no está configurado.', p_clave;
  END IF;

  RETURN v_valor;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_profesor_atiende_alumno(p_profesor_id integer, p_alumno_id integer)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM turno t
    WHERE t.profesor_id = p_profesor_id
      AND t.alumno_id   = p_alumno_id
      AND t.estado <> 'Cancelado'
  );
$function$
;

CREATE OR REPLACE FUNCTION public.fn_profesor_clases_por_materia(p_profesor_id integer, p_desde date, p_hasta date, p_materia_id integer DEFAULT NULL::integer)
 RETURNS TABLE(materia_id integer, materia character varying, clases bigint)
 LANGUAGE plpgsql
 STABLE
AS $function$
#variable_conflict use_column
BEGIN
  PERFORM fn_validar_periodo(p_desde, p_hasta);

  RETURN QUERY
  SELECT m.id, m.nombre, count(*)
  FROM turno t
  JOIN materia m ON m.id = t.materia_id
  WHERE t.profesor_id = p_profesor_id
    AND t.estado = 'Asistió'
    AND t.fecha BETWEEN p_desde AND p_hasta
    AND (p_materia_id IS NULL OR t.materia_id = p_materia_id)
  GROUP BY m.id, m.nombre
  ORDER BY count(*) DESC, m.nombre;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_profesor_clases_por_semana(p_profesor_id integer, p_desde date, p_hasta date, p_materia_id integer DEFAULT NULL::integer)
 RETURNS TABLE(semana_inicio date, semana_fin date, clases bigint)
 LANGUAGE plpgsql
 STABLE
AS $function$
#variable_conflict use_column
BEGIN
  PERFORM fn_validar_periodo(p_desde, p_hasta);

  RETURN QUERY
  SELECT s.ini::date,
         (s.ini::date + 6),
         count(t.id)
  FROM generate_series(date_trunc('week', p_desde::timestamp), p_hasta::timestamp, interval '7 days') AS s(ini)
  LEFT JOIN turno t
         ON t.profesor_id = p_profesor_id
        AND t.estado = 'Asistió'
        AND t.fecha BETWEEN s.ini::date AND (s.ini::date + 6)
        AND t.fecha BETWEEN p_desde AND p_hasta
        AND (p_materia_id IS NULL OR t.materia_id = p_materia_id)
  GROUP BY s.ini
  ORDER BY s.ini;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_profesor_id_actual()
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    select p.id
    from public.profesor p
    join public.usuario u on u.id = p.usuario_id
    where u.auth_id = auth.uid()
      and u.estado  = 'activo'
      and p.estado  = 'activo'
    limit 1;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_profesor_materia_validar_materia()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_estado estado_activo_inactivo;
BEGIN
  SELECT estado INTO v_estado FROM materia WHERE id = NEW.materia_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La materia indicada (id=%) no existe.', NEW.materia_id;
  END IF;

  IF v_estado <> 'activo' THEN
    RAISE EXCEPTION 'La materia (id=%) está inactiva y no puede asignarse a un profesor.', NEW.materia_id;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_profesor_sincronizar_telefono()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE usuario
     SET telefono = NEW.telefono
   WHERE id = NEW.usuario_id
     AND telefono IS DISTINCT FROM NEW.telefono;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_profesor_top_ausencias(p_profesor_id integer, p_desde date, p_hasta date, p_materia_id integer DEFAULT NULL::integer)
 RETURNS TABLE(alumno_id integer, alumno text, ausencias bigint)
 LANGUAGE plpgsql
 STABLE
AS $function$
#variable_conflict use_column
BEGIN
  PERFORM fn_validar_periodo(p_desde, p_hasta);

  RETURN QUERY
  SELECT a.id,
         (a.apellido || ', ' || a.nombre),
         count(*)
  FROM turno t
  JOIN alumno a ON a.id = t.alumno_id
  WHERE t.profesor_id = p_profesor_id
    AND t.estado = 'Ausente'
    AND t.fecha BETWEEN p_desde AND p_hasta
    AND (p_materia_id IS NULL OR t.materia_id = p_materia_id)
  GROUP BY a.id, a.apellido, a.nombre
  ORDER BY count(*) DESC, a.apellido, a.nombre
  LIMIT 5;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_profesor_validar_usuario()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_rol      text;
  v_estado   estado_activo_inactivo;
  v_academia integer;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.usuario_id = OLD.usuario_id THEN
    RETURN NEW;
  END IF;

  SELECT r.nombre, u.estado, u.academia_id
    INTO v_rol, v_estado, v_academia
  FROM usuario u
  JOIN rol r ON r.id = u.rol_id
  WHERE u.id = NEW.usuario_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El usuario indicado (id=%) no existe.', NEW.usuario_id;
  END IF;

  IF lower(v_rol) <> 'profesor' THEN
    RAISE EXCEPTION 'El usuario (id=%) no puede tener ficha de profesor: su rol es "%".', NEW.usuario_id, v_rol;
  END IF;

  IF v_estado <> 'activo' THEN
    RAISE EXCEPTION 'El usuario (id=%) está inactivo.', NEW.usuario_id;
  END IF;

  IF v_academia IS NULL THEN
    RAISE EXCEPTION 'El usuario (id=%) no tiene academia asignada.', NEW.usuario_id;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_rendicion_detalle(p_profesor_id integer, p_desde date, p_hasta date, p_materia_id integer DEFAULT NULL::integer)
 RETURNS TABLE(turno_id integer, fecha_clase date, alumno_id integer, alumno text, materia_id integer, materia character varying, importe_cobrado numeric, medio_pago text, comprobante character varying, fecha_pago date, estado_clase estado_turno)
 LANGUAGE plpgsql
 STABLE
AS $function$
#variable_conflict use_column
BEGIN
  PERFORM fn_validar_periodo(p_desde, p_hasta);

  RETURN QUERY
  SELECT t.id,
         t.fecha,
         t.alumno_id,
         (al.apellido || ', ' || al.nombre),
         t.materia_id,
         m.nombre,
         pt.importe,
         coalesce((SELECT string_agg(fp.nombre, ' + ' ORDER BY fp.nombre)
                   FROM pago_forma_pago pfp
                   JOIN forma_pago fp ON fp.id = pfp.forma_pago_id
                   WHERE pfp.pago_id = pg.id), ''),
         pg.comprobante,
         pg.fecha_pago,
         t.estado
  FROM pago_turno pt
  JOIN pago   pg ON pg.id = pt.pago_id AND pg.estado = 'Vigente'
  JOIN turno  t  ON t.id  = pt.turno_id
  JOIN alumno al ON al.id = t.alumno_id
  JOIN materia m ON m.id  = t.materia_id
  WHERE pt.vigente
    AND t.profesor_id = p_profesor_id
    AND t.estado <> 'Cancelado'
    AND pg.fecha_pago BETWEEN p_desde AND p_hasta
    AND (p_materia_id IS NULL OR t.materia_id = p_materia_id)
  ORDER BY m.nombre, t.fecha, t.hora_inicio;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_rendicion_pendientes(p_profesor_id integer, p_desde date, p_hasta date, p_materia_id integer DEFAULT NULL::integer)
 RETURNS TABLE(turno_id integer, fecha_clase date, alumno_id integer, alumno text, materia_id integer, materia character varying, importe_pendiente numeric, estado_clase estado_turno)
 LANGUAGE plpgsql
 STABLE
AS $function$
#variable_conflict use_column
BEGIN
  PERFORM fn_validar_periodo(p_desde, p_hasta);

  RETURN QUERY
  -- Misma definición de deuda que el listado de deudores (vw_deuda_clase).
  SELECT dc.turno_id,
         dc.fecha,
         dc.alumno_id,
         (al.apellido || ', ' || al.nombre),
         dc.materia_id,
         dc.materia,
         dc.importe,
         dc.estado
  FROM vw_deuda_clase dc
  JOIN alumno al ON al.id = dc.alumno_id
  WHERE dc.profesor_id = p_profesor_id
    AND dc.fecha BETWEEN p_desde AND p_hasta
    AND (p_materia_id IS NULL OR dc.materia_id = p_materia_id)
  ORDER BY dc.materia, dc.fecha, dc.hora_inicio;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_rendicion_resumen(p_profesor_id integer, p_desde date, p_hasta date, p_materia_id integer DEFAULT NULL::integer)
 RETURNS TABLE(materia_id integer, materia character varying, clases bigint, subtotal numeric)
 LANGUAGE plpgsql
 STABLE
AS $function$
#variable_conflict use_column
BEGIN
  RETURN QUERY
  SELECT d.materia_id, d.materia, count(*), sum(d.importe_cobrado)
  FROM fn_rendicion_detalle(p_profesor_id, p_desde, p_hasta, p_materia_id) d
  GROUP BY d.materia_id, d.materia
  ORDER BY d.materia;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_rol_usuario(p_usuario_id integer)
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  SELECT lower(r.nombre)
  FROM usuario u
  JOIN rol r ON r.id = u.rol_id
  WHERE u.id = p_usuario_id
    AND u.estado = 'activo';
$function$
;

CREATE OR REPLACE FUNCTION public.fn_touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_ts_servidor_a_art(p_ts timestamp without time zone)
 RETURNS timestamp without time zone
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT (p_ts AT TIME ZONE 'UTC') AT TIME ZONE 'America/Argentina/Buenos_Aires';
$function$
;

CREATE OR REPLACE FUNCTION public.fn_turno_bloquear_cambio_alumno_materia()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  RAISE EXCEPTION 'No se puede cambiar el alumno ni la materia del turno %.', OLD.codigo;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_turno_bloquear_cambios_alumno()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF fn_rol_usuario(fn_usuario_id_actual()) = 'alumno' THEN
    RAISE EXCEPTION 'Desde el portal el alumno solo puede reservar y consultar turnos.';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_turno_cobrable(p_estado estado_turno)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT p_estado IN ('Reservado', 'Asistió', 'Ausente');
$function$
;

CREATE OR REPLACE FUNCTION public.fn_turno_proteger_derivados()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.cantidad_modificaciones IS DISTINCT FROM OLD.cantidad_modificaciones THEN
    RAISE EXCEPTION 'cantidad_modificaciones lo actualiza el sistema al modificar el turno %.', OLD.codigo;
  END IF;

  IF NEW.estado = OLD.estado AND (
       NEW.fecha_cancelacion  IS DISTINCT FROM OLD.fecha_cancelacion
    OR NEW.cancelacion_tardia IS DISTINCT FROM OLD.cancelacion_tardia) THEN
    RAISE EXCEPTION 'Los datos de cancelación del turno % los fija el sistema al cancelarlo.', OLD.codigo;
  END IF;

  IF OLD.estado = 'Cancelado' AND (
       NEW.motivo_cancelacion_id IS DISTINCT FROM OLD.motivo_cancelacion_id
    OR NEW.detalle_cancelacion   IS DISTINCT FROM OLD.detalle_cancelacion) THEN
    RAISE EXCEPTION 'El motivo de cancelación del turno % ya no puede modificarse.', OLD.codigo;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_turno_proteger_pagado()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.pagado IS DISTINCT FROM EXISTS (
       SELECT 1 FROM pago_turno WHERE turno_id = NEW.id AND vigente) THEN
    RAISE EXCEPTION 'turno.pagado no se modifica manualmente: lo determina el pago vigente (turno id=%).', NEW.id;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_turno_validar_bloqueo()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_motivo varchar;
  v_desde  date;
  v_hasta  date;
BEGIN
  SELECT b.motivo, b.fecha_desde, b.fecha_hasta
    INTO v_motivo, v_desde, v_hasta
  FROM bloqueo_fecha b
  WHERE b.estado = 'activo'
    AND NEW.fecha BETWEEN b.fecha_desde AND b.fecha_hasta
    AND (b.profesor_id IS NULL OR b.profesor_id = NEW.profesor_id)
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'La fecha % está bloqueada (% al %): %. No admite reservas ni modificaciones.',
      NEW.fecha, v_desde, v_hasta, v_motivo;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_turno_validar_cancelacion()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_ahora       timestamp := (now() AT TIME ZONE 'America/Argentina/Buenos_Aires');
  v_inicio      timestamp;
  v_nombre      varchar;
  v_estado      estado_activo_inactivo;
  v_requiere    boolean;
  v_responsable responsable_cancelacion;
BEGIN
  IF OLD.estado = 'Cancelado' THEN
    RAISE EXCEPTION 'El turno % está cancelado y no puede reactivarse; debe generarse una nueva reserva.', OLD.codigo;
  END IF;

  IF NEW.estado IN ('Asistió', 'Ausente') THEN
    IF NOT EXISTS (
      SELECT 1 FROM asistencia a
      WHERE a.turno_id = OLD.id
        AND a.presente = (NEW.estado = 'Asistió')
    ) THEN
      RAISE EXCEPTION 'El estado del turno % lo fija el registro de asistencia.', OLD.codigo;
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.estado <> 'Reservado' THEN
    RAISE EXCEPTION 'El turno % ya tiene asistencia registrada y no puede cancelarse ni volver a Reservado.', OLD.codigo;
  END IF;

  IF NEW.estado = 'Cancelado' THEN
    v_inicio := OLD.fecha + OLD.hora_inicio;

    IF v_inicio <= v_ahora THEN
      RAISE EXCEPTION 'Solo se pueden cancelar turnos con inicio futuro (turno %).', OLD.codigo;
    END IF;

    IF NEW.motivo_cancelacion_id IS NULL THEN
      RAISE EXCEPTION 'Debe indicar el motivo de la cancelación.';
    END IF;

    SELECT nombre, estado, requiere_detalle, responsable
      INTO v_nombre, v_estado, v_requiere, v_responsable
    FROM motivo_cancelacion WHERE id = NEW.motivo_cancelacion_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'El motivo de cancelación indicado (id=%) no existe.', NEW.motivo_cancelacion_id;
    END IF;

    IF v_estado <> 'activo' THEN
      RAISE EXCEPTION 'El motivo de cancelación "%" está inactivo.', v_nombre;
    END IF;

    IF v_requiere AND btrim(coalesce(NEW.detalle_cancelacion, '')) = '' THEN
      RAISE EXCEPTION 'El motivo de cancelación "%" requiere un detalle.', v_nombre;
    END IF;

    NEW.fecha_cancelacion  := v_ahora;
    NEW.cancelacion_tardia := v_responsable = 'Alumno'
      AND (v_inicio - v_ahora) < make_interval(hours => fn_parametro('horas_cancelacion_tardia'));
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_turno_validar_modificacion()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_ahora   timestamp := (now() AT TIME ZONE 'America/Argentina/Buenos_Aires');
  v_anticip interval  := make_interval(hours => fn_parametro('horas_anticipacion_turno'));
  v_max     integer   := fn_parametro('max_modificaciones_turno');
BEGIN
  IF OLD.estado <> 'Reservado' THEN
    RAISE EXCEPTION 'Solo se pueden modificar turnos en estado Reservado (turno %).', OLD.codigo;
  END IF;

  IF NEW.estado <> OLD.estado THEN
    RAISE EXCEPTION 'No se puede modificar y cambiar de estado un turno en la misma operación.';
  END IF;

  IF (OLD.fecha + OLD.hora_inicio) < v_ahora + v_anticip THEN
    RAISE EXCEPTION 'El turno % no admite modificaciones: falta menos de la anticipación mínima para su inicio.', OLD.codigo;
  END IF;

  IF (NEW.fecha + NEW.hora_inicio) < v_ahora + v_anticip THEN
    RAISE EXCEPTION 'El nuevo horario no cumple la anticipación mínima de % horas.', fn_parametro('horas_anticipacion_turno');
  END IF;

  IF OLD.cantidad_modificaciones >= v_max THEN
    RAISE EXCEPTION 'El turno % alcanzó el máximo de % modificaciones; debe cancelarlo y reservar nuevamente.', OLD.codigo, v_max;
  END IF;

  NEW.cantidad_modificaciones := OLD.cantidad_modificaciones + 1;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_turno_validar_portal()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_actor    integer := fn_usuario_id_actual();
  v_rol      text;
  v_alumno   integer;
  v_futuros  integer;
  v_max      integer;
  v_ahora    timestamp := (now() AT TIME ZONE 'America/Argentina/Buenos_Aires');
BEGIN
  IF v_actor IS NULL THEN
    RETURN NEW;                       -- operación sin sesión (carga directa)
  END IF;

  v_rol := fn_rol_usuario(v_actor);

  IF v_rol IS DISTINCT FROM 'alumno' THEN
    NEW.origen := 'Centro';
    RETURN NEW;
  END IF;

  v_alumno := fn_alumno_de_usuario(v_actor);

  IF v_alumno IS NULL THEN
    RAISE EXCEPTION 'La cuenta no está asociada a una ficha de alumno activa.';
  END IF;

  IF NEW.alumno_id <> v_alumno THEN
    RAISE EXCEPTION 'Desde el portal el alumno solo puede reservar turnos para sí mismo.';
  END IF;

  NEW.origen     := 'Portal del Alumno';
  NEW.usuario_id := v_actor;

  PERFORM pg_advisory_xact_lock(7002, NEW.alumno_id);

  v_max := fn_parametro('max_turnos_futuros_alumno');

  SELECT count(*) INTO v_futuros
  FROM turno t
  WHERE t.alumno_id = NEW.alumno_id
    AND t.estado = 'Reservado'
    AND (t.fecha + t.hora_inicio) > v_ahora;

  IF v_futuros >= v_max THEN
    RAISE EXCEPTION 'Alcanzó el límite de % turnos futuros reservados. Cancelá o esperá a que se dicte uno para reservar otro.', v_max;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_turnos_en_bloqueo(p_desde date, p_hasta date, p_profesor_id integer DEFAULT NULL::integer)
 RETURNS TABLE(turno_id integer, codigo character varying, fecha date, hora_inicio time without time zone, hora_fin time without time zone, alumno_id integer, alumno text, profesor_id integer, profesor text, materia_id integer, materia character varying)
 LANGUAGE sql
 STABLE
AS $function$
  SELECT t.id, t.codigo, t.fecha, t.hora_inicio, t.hora_fin,
         t.alumno_id,   (al.apellido || ', ' || al.nombre),
         t.profesor_id, (u.apellido  || ', ' || u.nombre),
         t.materia_id,  m.nombre
  FROM turno t
  JOIN alumno   al ON al.id = t.alumno_id
  JOIN profesor p  ON p.id  = t.profesor_id
  JOIN usuario  u  ON u.id  = p.usuario_id
  JOIN materia  m  ON m.id  = t.materia_id
  WHERE t.estado = 'Reservado'
    AND t.fecha BETWEEN p_desde AND p_hasta
    AND (p_profesor_id IS NULL OR t.profesor_id = p_profesor_id)
  ORDER BY t.fecha, t.hora_inicio, t.profesor_id;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_usuario_id_actual()
 RETURNS integer
 LANGUAGE sql
 STABLE
AS $function$
  SELECT NULLIF(current_setting('app.usuario_id', true), '')::int;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_usuario_telefono_manda_profesor()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_tel varchar;
BEGIN
  SELECT telefono INTO v_tel FROM profesor WHERE usuario_id = NEW.id;

  IF FOUND AND NEW.telefono IS DISTINCT FROM v_tel THEN
    RAISE EXCEPTION 'El teléfono de un Profesor se modifica desde su ficha de profesor.';
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_usuario_validar_baja()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_actual  integer;
  v_rol     text;
BEGIN
  IF OLD.estado = 'activo' AND NEW.estado = 'inactivo' THEN
    v_actual := NULLIF(current_setting('app.usuario_id', true), '')::int;

    IF v_actual IS NOT NULL AND v_actual = NEW.id THEN
      RAISE EXCEPTION 'No puede desactivar su propio usuario.';
    END IF;

    SELECT r.nombre INTO v_rol FROM rol r WHERE r.id = OLD.rol_id;

    IF lower(v_rol) = 'gerente' AND NOT EXISTS (
         SELECT 1
         FROM usuario u
         JOIN rol r ON r.id = u.rol_id
         WHERE u.id <> NEW.id
           AND u.estado = 'activo'
           AND lower(r.nombre) = 'gerente'
    ) THEN
      RAISE EXCEPTION 'No se puede desactivar al último Gerente activo del sistema.';
    END IF;
  END IF;

  IF OLD.estado = 'inactivo' AND NEW.estado = 'activo' THEN
    NEW.motivo_baja_id      := NULL;
    NEW.detalle_motivo_baja := NULL;
    NEW.fecha_baja          := NULL;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_usuario_validar_motivo_baja()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_nombre   varchar;
  v_estado   estado_activo_inactivo;
  v_requiere boolean;
BEGIN
  IF NEW.estado = 'inactivo' AND NEW.motivo_baja_id IS NOT NULL THEN
    SELECT nombre, estado, requiere_detalle
      INTO v_nombre, v_estado, v_requiere
    FROM motivo_baja WHERE id = NEW.motivo_baja_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'El motivo de baja indicado (id=%) no existe.', NEW.motivo_baja_id;
    END IF;

    -- solo se exige que esté activo cuando el motivo se está asignando o cambiando
    IF v_estado <> 'activo'
       AND (TG_OP = 'INSERT' OR NEW.motivo_baja_id IS DISTINCT FROM OLD.motivo_baja_id) THEN
      RAISE EXCEPTION 'El motivo de baja "%" está inactivo.', v_nombre;
    END IF;

    IF v_requiere AND btrim(coalesce(NEW.detalle_motivo_baja, '')) = '' THEN
      RAISE EXCEPTION 'El motivo de baja "%" requiere un detalle.', v_nombre;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_validar_periodo(p_desde date, p_hasta date, p_max_meses integer DEFAULT 12)
 RETURNS void
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
BEGIN
  IF p_desde IS NULL OR p_hasta IS NULL THEN
    RAISE EXCEPTION 'El período requiere fecha desde y fecha hasta.';
  END IF;

  IF p_hasta < p_desde THEN
    RAISE EXCEPTION 'La fecha hasta (%) no puede ser anterior a la fecha desde (%).', p_hasta, p_desde;
  END IF;

  IF p_hasta > (p_desde + make_interval(months => p_max_meses))::date THEN
    RAISE EXCEPTION 'El período no puede superar % meses.', p_max_meses;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.gbt_bit_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_bit_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_bit_consistent(internal, bit, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_bit_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_bit_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_bit_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gbt_bit_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_bit_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gbt_bit_same(gbtreekey_var, gbtreekey_var, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_bit_same$function$
;

CREATE OR REPLACE FUNCTION public.gbt_bit_union(internal, internal)
 RETURNS gbtreekey_var
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_bit_union$function$
;

CREATE OR REPLACE FUNCTION public.gbt_bool_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gist', $function$gbt_bool_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_bool_consistent(internal, boolean, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gist', $function$gbt_bool_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_bool_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gist', $function$gbt_bool_fetch$function$
;

CREATE OR REPLACE FUNCTION public.gbt_bool_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gist', $function$gbt_bool_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gbt_bool_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gist', $function$gbt_bool_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gbt_bool_same(gbtreekey2, gbtreekey2, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gist', $function$gbt_bool_same$function$
;

CREATE OR REPLACE FUNCTION public.gbt_bool_union(internal, internal)
 RETURNS gbtreekey2
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gist', $function$gbt_bool_union$function$
;

CREATE OR REPLACE FUNCTION public.gbt_bpchar_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_bpchar_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_bpchar_consistent(internal, character, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_bpchar_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_bytea_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_bytea_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_bytea_consistent(internal, bytea, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_bytea_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_bytea_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_bytea_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gbt_bytea_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_bytea_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gbt_bytea_same(gbtreekey_var, gbtreekey_var, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_bytea_same$function$
;

CREATE OR REPLACE FUNCTION public.gbt_bytea_union(internal, internal)
 RETURNS gbtreekey_var
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_bytea_union$function$
;

CREATE OR REPLACE FUNCTION public.gbt_cash_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_cash_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_cash_consistent(internal, money, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_cash_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_cash_distance(internal, money, smallint, oid, internal)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_cash_distance$function$
;

CREATE OR REPLACE FUNCTION public.gbt_cash_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_cash_fetch$function$
;

CREATE OR REPLACE FUNCTION public.gbt_cash_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_cash_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gbt_cash_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_cash_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gbt_cash_same(gbtreekey16, gbtreekey16, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_cash_same$function$
;

CREATE OR REPLACE FUNCTION public.gbt_cash_union(internal, internal)
 RETURNS gbtreekey16
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_cash_union$function$
;

CREATE OR REPLACE FUNCTION public.gbt_date_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_date_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_date_consistent(internal, date, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_date_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_date_distance(internal, date, smallint, oid, internal)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_date_distance$function$
;

CREATE OR REPLACE FUNCTION public.gbt_date_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_date_fetch$function$
;

CREATE OR REPLACE FUNCTION public.gbt_date_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_date_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gbt_date_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_date_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gbt_date_same(gbtreekey8, gbtreekey8, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_date_same$function$
;

CREATE OR REPLACE FUNCTION public.gbt_date_union(internal, internal)
 RETURNS gbtreekey8
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_date_union$function$
;

CREATE OR REPLACE FUNCTION public.gbt_decompress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_decompress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_enum_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_enum_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_enum_consistent(internal, anyenum, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_enum_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_enum_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_enum_fetch$function$
;

CREATE OR REPLACE FUNCTION public.gbt_enum_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_enum_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gbt_enum_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_enum_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gbt_enum_same(gbtreekey8, gbtreekey8, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_enum_same$function$
;

CREATE OR REPLACE FUNCTION public.gbt_enum_union(internal, internal)
 RETURNS gbtreekey8
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_enum_union$function$
;

CREATE OR REPLACE FUNCTION public.gbt_float4_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_float4_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_float4_consistent(internal, real, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_float4_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_float4_distance(internal, real, smallint, oid, internal)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_float4_distance$function$
;

CREATE OR REPLACE FUNCTION public.gbt_float4_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_float4_fetch$function$
;

CREATE OR REPLACE FUNCTION public.gbt_float4_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_float4_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gbt_float4_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_float4_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gbt_float4_same(gbtreekey8, gbtreekey8, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_float4_same$function$
;

CREATE OR REPLACE FUNCTION public.gbt_float4_union(internal, internal)
 RETURNS gbtreekey8
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_float4_union$function$
;

CREATE OR REPLACE FUNCTION public.gbt_float8_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_float8_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_float8_consistent(internal, double precision, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_float8_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_float8_distance(internal, double precision, smallint, oid, internal)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_float8_distance$function$
;

CREATE OR REPLACE FUNCTION public.gbt_float8_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_float8_fetch$function$
;

CREATE OR REPLACE FUNCTION public.gbt_float8_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_float8_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gbt_float8_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_float8_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gbt_float8_same(gbtreekey16, gbtreekey16, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_float8_same$function$
;

CREATE OR REPLACE FUNCTION public.gbt_float8_union(internal, internal)
 RETURNS gbtreekey16
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_float8_union$function$
;

CREATE OR REPLACE FUNCTION public.gbt_inet_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_inet_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_inet_consistent(internal, inet, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_inet_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_inet_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_inet_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gbt_inet_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_inet_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gbt_inet_same(gbtreekey16, gbtreekey16, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_inet_same$function$
;

CREATE OR REPLACE FUNCTION public.gbt_inet_union(internal, internal)
 RETURNS gbtreekey16
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_inet_union$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int2_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int2_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int2_consistent(internal, smallint, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int2_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int2_distance(internal, smallint, smallint, oid, internal)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int2_distance$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int2_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int2_fetch$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int2_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int2_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int2_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int2_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int2_same(gbtreekey4, gbtreekey4, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int2_same$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int2_union(internal, internal)
 RETURNS gbtreekey4
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int2_union$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int4_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int4_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int4_consistent(internal, integer, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int4_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int4_distance(internal, integer, smallint, oid, internal)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int4_distance$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int4_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int4_fetch$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int4_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int4_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int4_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int4_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int4_same(gbtreekey8, gbtreekey8, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int4_same$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int4_union(internal, internal)
 RETURNS gbtreekey8
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int4_union$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int8_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int8_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int8_consistent(internal, bigint, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int8_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int8_distance(internal, bigint, smallint, oid, internal)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int8_distance$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int8_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int8_fetch$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int8_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int8_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int8_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int8_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int8_same(gbtreekey16, gbtreekey16, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int8_same$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int8_union(internal, internal)
 RETURNS gbtreekey16
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int8_union$function$
;

CREATE OR REPLACE FUNCTION public.gbt_intv_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_intv_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_intv_consistent(internal, interval, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_intv_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_intv_decompress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_intv_decompress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_intv_distance(internal, interval, smallint, oid, internal)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_intv_distance$function$
;

CREATE OR REPLACE FUNCTION public.gbt_intv_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_intv_fetch$function$
;

CREATE OR REPLACE FUNCTION public.gbt_intv_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_intv_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gbt_intv_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_intv_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gbt_intv_same(gbtreekey32, gbtreekey32, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_intv_same$function$
;

CREATE OR REPLACE FUNCTION public.gbt_intv_union(internal, internal)
 RETURNS gbtreekey32
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_intv_union$function$
;

CREATE OR REPLACE FUNCTION public.gbt_macad8_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_macad8_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_macad8_consistent(internal, macaddr8, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_macad8_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_macad8_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_macad8_fetch$function$
;

CREATE OR REPLACE FUNCTION public.gbt_macad8_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_macad8_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gbt_macad8_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_macad8_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gbt_macad8_same(gbtreekey16, gbtreekey16, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_macad8_same$function$
;

CREATE OR REPLACE FUNCTION public.gbt_macad8_union(internal, internal)
 RETURNS gbtreekey16
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_macad8_union$function$
;

CREATE OR REPLACE FUNCTION public.gbt_macad_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_macad_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_macad_consistent(internal, macaddr, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_macad_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_macad_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_macad_fetch$function$
;

CREATE OR REPLACE FUNCTION public.gbt_macad_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_macad_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gbt_macad_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_macad_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gbt_macad_same(gbtreekey16, gbtreekey16, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_macad_same$function$
;

CREATE OR REPLACE FUNCTION public.gbt_macad_union(internal, internal)
 RETURNS gbtreekey16
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_macad_union$function$
;

CREATE OR REPLACE FUNCTION public.gbt_numeric_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_numeric_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_numeric_consistent(internal, numeric, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_numeric_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_numeric_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_numeric_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gbt_numeric_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_numeric_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gbt_numeric_same(gbtreekey_var, gbtreekey_var, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_numeric_same$function$
;

CREATE OR REPLACE FUNCTION public.gbt_numeric_union(internal, internal)
 RETURNS gbtreekey_var
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_numeric_union$function$
;

CREATE OR REPLACE FUNCTION public.gbt_oid_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_oid_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_oid_consistent(internal, oid, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_oid_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_oid_distance(internal, oid, smallint, oid, internal)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_oid_distance$function$
;

CREATE OR REPLACE FUNCTION public.gbt_oid_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_oid_fetch$function$
;

CREATE OR REPLACE FUNCTION public.gbt_oid_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_oid_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gbt_oid_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_oid_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gbt_oid_same(gbtreekey8, gbtreekey8, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_oid_same$function$
;

CREATE OR REPLACE FUNCTION public.gbt_oid_union(internal, internal)
 RETURNS gbtreekey8
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_oid_union$function$
;

CREATE OR REPLACE FUNCTION public.gbt_text_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_text_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_text_consistent(internal, text, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_text_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_text_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_text_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gbt_text_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_text_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gbt_text_same(gbtreekey_var, gbtreekey_var, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_text_same$function$
;

CREATE OR REPLACE FUNCTION public.gbt_text_union(internal, internal)
 RETURNS gbtreekey_var
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_text_union$function$
;

CREATE OR REPLACE FUNCTION public.gbt_time_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_time_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_time_consistent(internal, time without time zone, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_time_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_time_distance(internal, time without time zone, smallint, oid, internal)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_time_distance$function$
;

CREATE OR REPLACE FUNCTION public.gbt_time_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_time_fetch$function$
;

CREATE OR REPLACE FUNCTION public.gbt_time_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_time_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gbt_time_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_time_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gbt_time_same(gbtreekey16, gbtreekey16, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_time_same$function$
;

CREATE OR REPLACE FUNCTION public.gbt_time_union(internal, internal)
 RETURNS gbtreekey16
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_time_union$function$
;

CREATE OR REPLACE FUNCTION public.gbt_timetz_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_timetz_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_timetz_consistent(internal, time with time zone, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_timetz_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_ts_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_ts_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_ts_consistent(internal, timestamp without time zone, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_ts_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_ts_distance(internal, timestamp without time zone, smallint, oid, internal)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_ts_distance$function$
;

CREATE OR REPLACE FUNCTION public.gbt_ts_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_ts_fetch$function$
;

CREATE OR REPLACE FUNCTION public.gbt_ts_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_ts_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gbt_ts_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_ts_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gbt_ts_same(gbtreekey16, gbtreekey16, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_ts_same$function$
;

CREATE OR REPLACE FUNCTION public.gbt_ts_union(internal, internal)
 RETURNS gbtreekey16
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_ts_union$function$
;

CREATE OR REPLACE FUNCTION public.gbt_tstz_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_tstz_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_tstz_consistent(internal, timestamp with time zone, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_tstz_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_tstz_distance(internal, timestamp with time zone, smallint, oid, internal)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_tstz_distance$function$
;

CREATE OR REPLACE FUNCTION public.gbt_uuid_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_uuid_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_uuid_consistent(internal, uuid, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_uuid_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_uuid_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_uuid_fetch$function$
;

CREATE OR REPLACE FUNCTION public.gbt_uuid_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_uuid_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gbt_uuid_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_uuid_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gbt_uuid_same(gbtreekey32, gbtreekey32, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_uuid_same$function$
;

CREATE OR REPLACE FUNCTION public.gbt_uuid_union(internal, internal)
 RETURNS gbtreekey32
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_uuid_union$function$
;

CREATE OR REPLACE FUNCTION public.gbt_var_decompress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_var_decompress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_var_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_var_fetch$function$
;

CREATE OR REPLACE FUNCTION public.gbtreekey16_in(cstring)
 RETURNS gbtreekey16
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbtreekey_in$function$
;

CREATE OR REPLACE FUNCTION public.gbtreekey16_out(gbtreekey16)
 RETURNS cstring
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbtreekey_out$function$
;

CREATE OR REPLACE FUNCTION public.gbtreekey2_in(cstring)
 RETURNS gbtreekey2
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbtreekey_in$function$
;

CREATE OR REPLACE FUNCTION public.gbtreekey2_out(gbtreekey2)
 RETURNS cstring
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbtreekey_out$function$
;

CREATE OR REPLACE FUNCTION public.gbtreekey32_in(cstring)
 RETURNS gbtreekey32
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbtreekey_in$function$
;

CREATE OR REPLACE FUNCTION public.gbtreekey32_out(gbtreekey32)
 RETURNS cstring
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbtreekey_out$function$
;

CREATE OR REPLACE FUNCTION public.gbtreekey4_in(cstring)
 RETURNS gbtreekey4
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbtreekey_in$function$
;

CREATE OR REPLACE FUNCTION public.gbtreekey4_out(gbtreekey4)
 RETURNS cstring
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbtreekey_out$function$
;

CREATE OR REPLACE FUNCTION public.gbtreekey8_in(cstring)
 RETURNS gbtreekey8
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbtreekey_in$function$
;

CREATE OR REPLACE FUNCTION public.gbtreekey8_out(gbtreekey8)
 RETURNS cstring
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbtreekey_out$function$
;

CREATE OR REPLACE FUNCTION public.gbtreekey_var_in(cstring)
 RETURNS gbtreekey_var
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbtreekey_in$function$
;

CREATE OR REPLACE FUNCTION public.gbtreekey_var_out(gbtreekey_var)
 RETURNS cstring
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbtreekey_out$function$
;

CREATE OR REPLACE FUNCTION public.int2_dist(smallint, smallint)
 RETURNS smallint
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$int2_dist$function$
;

CREATE OR REPLACE FUNCTION public.int4_dist(integer, integer)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$int4_dist$function$
;

CREATE OR REPLACE FUNCTION public.int8_dist(bigint, bigint)
 RETURNS bigint
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$int8_dist$function$
;

CREATE OR REPLACE FUNCTION public.interval_dist(interval, interval)
 RETURNS interval
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$interval_dist$function$
;

CREATE OR REPLACE FUNCTION public.oid_dist(oid, oid)
 RETURNS oid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$oid_dist$function$
;

CREATE OR REPLACE FUNCTION public.time_dist(time without time zone, time without time zone)
 RETURNS interval
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$time_dist$function$
;

CREATE OR REPLACE FUNCTION public.ts_dist(timestamp without time zone, timestamp without time zone)
 RETURNS interval
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$ts_dist$function$
;

CREATE OR REPLACE FUNCTION public.tstz_dist(timestamp with time zone, timestamp with time zone)
 RETURNS interval
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$tstz_dist$function$
;

CREATE OR REPLACE FUNCTION public.unaccent(text)
 RETURNS text
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/unaccent', $function$unaccent_dict$function$
;

CREATE OR REPLACE FUNCTION public.unaccent(regdictionary, text)
 RETURNS text
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/unaccent', $function$unaccent_dict$function$
;

CREATE OR REPLACE FUNCTION public.unaccent_init(internal)
 RETURNS internal
 LANGUAGE c
 PARALLEL SAFE
AS '$libdir/unaccent', $function$unaccent_init$function$
;

CREATE OR REPLACE FUNCTION public.unaccent_lexize(internal, internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 PARALLEL SAFE
AS '$libdir/unaccent', $function$unaccent_lexize$function$
;


-- =========================================================
-- TRIGGERS
-- =========================================================

CREATE TRIGGER trg_academia_updated_at BEFORE UPDATE ON public.academia FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();
CREATE TRIGGER trg_agenda_profesional_validar_rango BEFORE INSERT OR UPDATE ON public.agenda_profesional FOR EACH ROW EXECUTE FUNCTION fn_agenda_profesional_validar_rango();
CREATE TRIGGER trg_auditoria_agenda_profesional AFTER INSERT OR DELETE OR UPDATE ON public.agenda_profesional FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_alumno_baja_cuenta_portal AFTER UPDATE OF estado ON public.alumno FOR EACH ROW WHEN (((old.estado = 'activo'::estado_activo_inactivo) AND (new.estado = 'inactivo'::estado_activo_inactivo) AND (new.usuario_id IS NOT NULL))) EXECUTE FUNCTION fn_alumno_baja_cuenta_portal();
CREATE TRIGGER trg_alumno_updated_at BEFORE UPDATE ON public.alumno FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();
CREATE TRIGGER trg_alumno_validar_acceso_portal BEFORE UPDATE OF usuario_id ON public.alumno FOR EACH ROW WHEN ((old.usuario_id IS DISTINCT FROM new.usuario_id)) EXECUTE FUNCTION fn_alumno_validar_acceso_portal();
CREATE TRIGGER trg_auditoria_alumno AFTER INSERT OR DELETE OR UPDATE ON public.alumno FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_alumno_materia_interes_validar_materia BEFORE INSERT OR UPDATE OF materia_id ON public.alumno_materia_interes FOR EACH ROW EXECUTE FUNCTION fn_alumno_materia_interes_validar_materia();
CREATE TRIGGER trg_auditoria_alumno_materia_interes AFTER INSERT OR DELETE OR UPDATE ON public.alumno_materia_interes FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_asistencia_bloquear_borrado BEFORE DELETE ON public.asistencia FOR EACH ROW EXECUTE FUNCTION fn_bloquear_modificacion_auditoria();
CREATE TRIGGER trg_asistencia_sincronizar_turno AFTER INSERT OR UPDATE OF presente ON public.asistencia FOR EACH ROW EXECUTE FUNCTION fn_asistencia_sincronizar_turno();
CREATE TRIGGER trg_asistencia_validar BEFORE INSERT OR UPDATE ON public.asistencia FOR EACH ROW EXECUTE FUNCTION fn_asistencia_validar();
CREATE TRIGGER trg_auditoria_asistencia AFTER INSERT OR UPDATE ON public.asistencia FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_auditoria_bloquear_cambios BEFORE DELETE OR UPDATE ON public.auditoria FOR EACH ROW EXECUTE FUNCTION fn_bloquear_modificacion_auditoria();
CREATE TRIGGER trg_auditoria_sesion_bloquear_cambios BEFORE DELETE OR UPDATE ON public.auditoria_sesion FOR EACH ROW EXECUTE FUNCTION fn_bloquear_modificacion_auditoria();
CREATE TRIGGER trg_auditoria_bloqueo_fecha AFTER INSERT OR UPDATE ON public.bloqueo_fecha FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_bloqueo_fecha_bloquear_borrado BEFORE DELETE ON public.bloqueo_fecha FOR EACH ROW EXECUTE FUNCTION fn_bloquear_modificacion_auditoria();
CREATE TRIGGER trg_bloqueo_fecha_validar BEFORE INSERT OR UPDATE ON public.bloqueo_fecha FOR EACH ROW EXECUTE FUNCTION fn_bloqueo_fecha_validar();
CREATE TRIGGER trg_auditoria_cierre_caja AFTER INSERT OR UPDATE ON public.cierre_caja FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_cierre_caja_bloquear_borrado BEFORE DELETE ON public.cierre_caja FOR EACH ROW EXECUTE FUNCTION fn_bloquear_modificacion_auditoria();
CREATE TRIGGER trg_cierre_caja_validar BEFORE INSERT OR UPDATE ON public.cierre_caja FOR EACH ROW EXECUTE FUNCTION fn_cierre_caja_validar();
CREATE TRIGGER trg_auditoria_forma_pago AFTER INSERT OR DELETE OR UPDATE ON public.forma_pago FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_forma_pago_updated_at BEFORE UPDATE ON public.forma_pago FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();
CREATE TRIGGER trg_auditoria_materia AFTER INSERT OR DELETE OR UPDATE ON public.materia FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_materia_updated_at BEFORE UPDATE ON public.materia FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();
CREATE TRIGGER trg_auditoria_motivo_baja AFTER INSERT OR DELETE OR UPDATE ON public.motivo_baja FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_motivo_baja_updated_at BEFORE UPDATE ON public.motivo_baja FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();
CREATE TRIGGER trg_auditoria_motivo_cancelacion AFTER INSERT OR DELETE OR UPDATE ON public.motivo_cancelacion FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_motivo_cancelacion_updated_at BEFORE UPDATE ON public.motivo_cancelacion FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();
CREATE TRIGGER trg_auditoria_nota_alumno AFTER INSERT ON public.nota_alumno FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_nota_alumno_bloquear_cambios BEFORE DELETE OR UPDATE ON public.nota_alumno FOR EACH ROW EXECUTE FUNCTION fn_bloquear_modificacion_auditoria();
CREATE TRIGGER trg_nota_alumno_validar BEFORE INSERT ON public.nota_alumno FOR EACH ROW EXECUTE FUNCTION fn_nota_alumno_validar();
CREATE TRIGGER trg_auditoria_pago AFTER INSERT OR DELETE OR UPDATE ON public.pago FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_pago_anular_liberar_turnos AFTER UPDATE ON public.pago FOR EACH ROW WHEN (((old.estado = 'Vigente'::estado_pago) AND (new.estado = 'Anulado'::estado_pago))) EXECUTE FUNCTION fn_pago_anular_liberar_turnos();
CREATE TRIGGER trg_pago_bloquear_borrado BEFORE DELETE ON public.pago FOR EACH ROW EXECUTE FUNCTION fn_bloquear_modificacion_auditoria();
CREATE TRIGGER trg_pago_validar_alumno BEFORE INSERT ON public.pago FOR EACH ROW EXECUTE FUNCTION fn_pago_validar_alumno();
CREATE TRIGGER trg_pago_validar_anulacion BEFORE UPDATE ON public.pago FOR EACH ROW EXECUTE FUNCTION fn_pago_validar_anulacion();
CREATE TRIGGER trg_pago_validar_caja_anulacion BEFORE UPDATE ON public.pago FOR EACH ROW WHEN (((old.estado = 'Vigente'::estado_pago) AND (new.estado = 'Anulado'::estado_pago))) EXECUTE FUNCTION fn_pago_validar_caja();
CREATE TRIGGER trg_pago_validar_caja_ins BEFORE INSERT ON public.pago FOR EACH ROW EXECUTE FUNCTION fn_pago_validar_caja();
CREATE CONSTRAINT TRIGGER trg_pago_validar_consistencia AFTER INSERT ON public.pago DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION fn_pago_validar_consistencia();
CREATE TRIGGER trg_auditoria_pago_forma_pago AFTER INSERT OR DELETE OR UPDATE ON public.pago_forma_pago FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_pago_forma_pago_bloquear_cambios BEFORE DELETE OR UPDATE ON public.pago_forma_pago FOR EACH ROW EXECUTE FUNCTION fn_bloquear_modificacion_auditoria();
CREATE TRIGGER trg_pago_forma_pago_validar BEFORE INSERT OR UPDATE ON public.pago_forma_pago FOR EACH ROW EXECUTE FUNCTION fn_pago_forma_pago_validar();
CREATE TRIGGER trg_auditoria_pago_turno AFTER INSERT OR DELETE OR UPDATE ON public.pago_turno FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_pago_turno_bloquear_borrado BEFORE DELETE ON public.pago_turno FOR EACH ROW EXECUTE FUNCTION fn_bloquear_modificacion_auditoria();
CREATE TRIGGER trg_pago_turno_marcar_pagado AFTER INSERT ON public.pago_turno FOR EACH ROW EXECUTE FUNCTION fn_pago_turno_marcar_pagado();
CREATE TRIGGER trg_pago_turno_proteger BEFORE UPDATE ON public.pago_turno FOR EACH ROW EXECUTE FUNCTION fn_pago_turno_proteger();
CREATE TRIGGER trg_pago_turno_validar BEFORE INSERT ON public.pago_turno FOR EACH ROW EXECUTE FUNCTION fn_pago_turno_validar();
CREATE TRIGGER trg_auditoria_parametro AFTER INSERT OR DELETE OR UPDATE ON public.parametro FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_parametro_updated_at BEFORE UPDATE ON public.parametro FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();
CREATE TRIGGER trg_auditoria_profesor AFTER INSERT OR DELETE OR UPDATE ON public.profesor FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_profesor_sincronizar_telefono AFTER INSERT OR UPDATE OF telefono, usuario_id ON public.profesor FOR EACH ROW EXECUTE FUNCTION fn_profesor_sincronizar_telefono();
CREATE TRIGGER trg_profesor_updated_at BEFORE UPDATE ON public.profesor FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();
CREATE TRIGGER trg_profesor_validar_usuario BEFORE INSERT OR UPDATE OF usuario_id ON public.profesor FOR EACH ROW EXECUTE FUNCTION fn_profesor_validar_usuario();
CREATE TRIGGER trg_auditoria_profesor_materia AFTER INSERT OR DELETE OR UPDATE ON public.profesor_materia FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_profesor_materia_validar_materia BEFORE INSERT ON public.profesor_materia FOR EACH ROW EXECUTE FUNCTION fn_profesor_materia_validar_materia();
CREATE TRIGGER trg_auditoria_turno_ins_del AFTER INSERT OR DELETE ON public.turno FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_auditoria_turno_upd AFTER UPDATE ON public.turno FOR EACH ROW WHEN (((to_jsonb(old.*) - 'pagado'::text) IS DISTINCT FROM (to_jsonb(new.*) - 'pagado'::text))) EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_turno_bloquear_cambio_alumno_materia BEFORE UPDATE OF alumno_id, materia_id ON public.turno FOR EACH ROW WHEN (((old.alumno_id IS DISTINCT FROM new.alumno_id) OR (old.materia_id IS DISTINCT FROM new.materia_id))) EXECUTE FUNCTION fn_turno_bloquear_cambio_alumno_materia();
CREATE TRIGGER trg_turno_bloquear_cambios_alumno BEFORE DELETE OR UPDATE ON public.turno FOR EACH ROW EXECUTE FUNCTION fn_turno_bloquear_cambios_alumno();
CREATE TRIGGER trg_turno_proteger_derivados BEFORE UPDATE OF cantidad_modificaciones, fecha_cancelacion, cancelacion_tardia, motivo_cancelacion_id, detalle_cancelacion ON public.turno FOR EACH ROW EXECUTE FUNCTION fn_turno_proteger_derivados();
CREATE TRIGGER trg_turno_proteger_pagado BEFORE INSERT OR UPDATE OF pagado ON public.turno FOR EACH ROW EXECUTE FUNCTION fn_turno_proteger_pagado();
CREATE TRIGGER trg_turno_validar_bloqueo_ins BEFORE INSERT ON public.turno FOR EACH ROW WHEN ((new.estado = 'Reservado'::estado_turno)) EXECUTE FUNCTION fn_turno_validar_bloqueo();
CREATE TRIGGER trg_turno_validar_bloqueo_upd BEFORE UPDATE OF profesor_id, fecha, hora_inicio, hora_fin ON public.turno FOR EACH ROW WHEN (((new.estado = 'Reservado'::estado_turno) AND ((old.profesor_id IS DISTINCT FROM new.profesor_id) OR (old.fecha IS DISTINCT FROM new.fecha) OR (old.hora_inicio IS DISTINCT FROM new.hora_inicio) OR (old.hora_fin IS DISTINCT FROM new.hora_fin)))) EXECUTE FUNCTION fn_turno_validar_bloqueo();
CREATE TRIGGER trg_turno_validar_cancelacion BEFORE UPDATE OF estado ON public.turno FOR EACH ROW WHEN ((old.estado IS DISTINCT FROM new.estado)) EXECUTE FUNCTION fn_turno_validar_cancelacion();
CREATE TRIGGER trg_turno_validar_modificacion BEFORE UPDATE OF profesor_id, fecha, hora_inicio, hora_fin ON public.turno FOR EACH ROW WHEN (((((old.profesor_id IS DISTINCT FROM new.profesor_id) OR (old.fecha IS DISTINCT FROM new.fecha)) OR (old.hora_inicio IS DISTINCT FROM new.hora_inicio)) OR (old.hora_fin IS DISTINCT FROM new.hora_fin))) EXECUTE FUNCTION fn_turno_validar_modificacion();
CREATE TRIGGER trg_turno_validar_portal BEFORE INSERT ON public.turno FOR EACH ROW EXECUTE FUNCTION fn_turno_validar_portal();
CREATE TRIGGER trg_auditoria_usuario_ins_del AFTER INSERT OR DELETE ON public.usuario FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_auditoria_usuario_upd AFTER UPDATE ON public.usuario FOR EACH ROW WHEN ((((((((((((old.rol_id IS DISTINCT FROM new.rol_id) OR (old.academia_id IS DISTINCT FROM new.academia_id)) OR ((old.nombre)::text IS DISTINCT FROM (new.nombre)::text)) OR ((old.apellido)::text IS DISTINCT FROM (new.apellido)::text)) OR ((old.dni)::text IS DISTINCT FROM (new.dni)::text)) OR ((old.email)::text IS DISTINCT FROM (new.email)::text)) OR ((old.telefono)::text IS DISTINCT FROM (new.telefono)::text)) OR (old.estado IS DISTINCT FROM new.estado)) OR (old.motivo_baja_id IS DISTINCT FROM new.motivo_baja_id)) OR ((old.detalle_motivo_baja)::text IS DISTINCT FROM (new.detalle_motivo_baja)::text)) OR (old.fecha_baja IS DISTINCT FROM new.fecha_baja))) EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_usuario_telefono_manda_profesor BEFORE UPDATE OF telefono ON public.usuario FOR EACH ROW EXECUTE FUNCTION fn_usuario_telefono_manda_profesor();
CREATE TRIGGER trg_usuario_validar_baja BEFORE UPDATE OF estado ON public.usuario FOR EACH ROW EXECUTE FUNCTION fn_usuario_validar_baja();
CREATE TRIGGER trg_usuario_validar_motivo_baja BEFORE INSERT OR UPDATE OF estado, motivo_baja_id, detalle_motivo_baja ON public.usuario FOR EACH ROW EXECUTE FUNCTION fn_usuario_validar_motivo_baja();
