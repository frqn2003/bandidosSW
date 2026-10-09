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
CREATE TYPE estado_turno AS ENUM ('Reservado', 'Cancelado');
CREATE TYPE modo_abm AS ENUM ('INSERCION', 'EDICION', 'LECTURA');
CREATE TYPE nivel_materia AS ENUM ('Primario', 'Secundario', 'Universitario');
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
CREATE SEQUENCE IF NOT EXISTS auditoria_id_seq;
CREATE SEQUENCE IF NOT EXISTS auditoria_sesion_id_seq;
CREATE SEQUENCE IF NOT EXISTS forma_pago_id_seq;
CREATE SEQUENCE IF NOT EXISTS materia_id_seq;
CREATE SEQUENCE IF NOT EXISTS motivo_baja_id_seq;
CREATE SEQUENCE IF NOT EXISTS motivo_cancelacion_id_seq;
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
  observaciones_generales character varying(250)
);

CREATE TABLE alumno_materia_interes (
  id integer(32,0) NOT NULL,
  alumno_id integer(32,0) NOT NULL,
  materia_id integer(32,0) NOT NULL
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

CREATE TABLE forma_pago (
  id integer(32,0) NOT NULL,
  nombre character varying(50) NOT NULL,
  requiere_nro_operacion boolean DEFAULT true NOT NULL,
  estado estado_activo_inactivo DEFAULT 'activo'::estado_activo_inactivo NOT NULL,
  created_at timestamp without time zone DEFAULT now() NOT NULL,
  updated_at timestamp without time zone DEFAULT now() NOT NULL
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
  updated_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE pago (
  id integer(32,0) NOT NULL,
  comprobante character varying(20),
  alumno_id integer(32,0) NOT NULL,
  monto numeric(12,2) NOT NULL,
  fecha_pago date DEFAULT ((now() AT TIME ZONE 'America/Argentina/Buenos_Aires'::text))::date NOT NULL,
  observaciones character varying(200),
  usuario_id integer(32,0) NOT NULL,
  created_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE pago_forma_pago (
  id integer(32,0) NOT NULL,
  pago_id integer(32,0) NOT NULL,
  forma_pago_id integer(32,0) NOT NULL,
  nro_operacion character varying(30)
);

CREATE TABLE pago_turno (
  id integer(32,0) NOT NULL,
  pago_id integer(32,0) NOT NULL,
  turno_id integer(32,0) NOT NULL,
  importe numeric(12,2) NOT NULL
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
  pagado boolean DEFAULT false NOT NULL
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
ALTER TABLE auditoria ADD CONSTRAINT ck_auditoria_valores CHECK ((((operacion = 'INSERT'::tipo_operacion_auditoria) AND (valores_anteriores IS NULL) AND (valores_nuevos IS NOT NULL)) OR ((operacion = 'UPDATE'::tipo_operacion_auditoria) AND (valores_anteriores IS NOT NULL) AND (valores_nuevos IS NOT NULL)) OR ((operacion = 'DELETE'::tipo_operacion_auditoria) AND (valores_anteriores IS NOT NULL) AND (valores_nuevos IS NULL))));
ALTER TABLE auditoria ADD CONSTRAINT auditoria_pkey PRIMARY KEY (id);
ALTER TABLE auditoria_sesion ADD CONSTRAINT auditoria_sesion_pkey PRIMARY KEY (id);
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
ALTER TABLE pago ADD CONSTRAINT ck_pago_fecha_futura CHECK ((fecha_pago <= ((now() AT TIME ZONE 'America/Argentina/Buenos_Aires'::text))::date));
ALTER TABLE pago ADD CONSTRAINT ck_pago_monto CHECK ((monto > (0)::numeric));
ALTER TABLE pago ADD CONSTRAINT pago_pkey PRIMARY KEY (id);
ALTER TABLE pago ADD CONSTRAINT trg_pago_validar_consistencia TRIGGER DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE pago ADD CONSTRAINT uq_pago_comprobante UNIQUE (comprobante);
ALTER TABLE pago_forma_pago ADD CONSTRAINT ck_pago_forma_pago_nro CHECK (((nro_operacion IS NULL) OR ((nro_operacion)::text ~ '^[A-Za-z0-9]{1,30}$'::text)));
ALTER TABLE pago_forma_pago ADD CONSTRAINT pago_forma_pago_pkey PRIMARY KEY (id);
ALTER TABLE pago_forma_pago ADD CONSTRAINT uq_pago_forma_pago UNIQUE (pago_id, forma_pago_id);
ALTER TABLE pago_turno ADD CONSTRAINT ck_pago_turno_importe CHECK ((importe > (0)::numeric));
ALTER TABLE pago_turno ADD CONSTRAINT pago_turno_pkey PRIMARY KEY (id);
ALTER TABLE pago_turno ADD CONSTRAINT uq_pago_turno_turno UNIQUE (turno_id);
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
ALTER TABLE turno ADD CONSTRAINT ck_turno_cancelacion CHECK ((((estado = 'Reservado'::estado_turno) AND (motivo_cancelacion_id IS NULL) AND (detalle_cancelacion IS NULL) AND (fecha_cancelacion IS NULL) AND (cancelacion_tardia = false)) OR ((estado = 'Cancelado'::estado_turno) AND (motivo_cancelacion_id IS NOT NULL) AND (fecha_cancelacion IS NOT NULL)))) NOT VALID;
ALTER TABLE turno ADD CONSTRAINT ck_turno_modificaciones CHECK ((cantidad_modificaciones >= 0));
ALTER TABLE turno ADD CONSTRAINT ck_turno_rango CHECK ((hora_fin > hora_inicio));
ALTER TABLE turno ADD CONSTRAINT ck_turno_valor CHECK ((valor_clase_congelado > (0)::numeric));
ALTER TABLE turno ADD CONSTRAINT turno_pkey PRIMARY KEY (id);
ALTER TABLE turno ADD CONSTRAINT ex_turno_alumno_sin_superposicion EXCLUDE USING gist (alumno_id WITH =, tsrange((fecha + hora_inicio), (fecha + hora_fin)) WITH &&) WHERE ((estado = 'Reservado'::estado_turno));
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
ALTER TABLE alumno_materia_interes ADD CONSTRAINT alumno_materia_interes_alumno_id_fkey FOREIGN KEY (alumno_id) REFERENCES alumno(id);
ALTER TABLE alumno_materia_interes ADD CONSTRAINT alumno_materia_interes_materia_id_fkey FOREIGN KEY (materia_id) REFERENCES materia(id);
ALTER TABLE auditoria ADD CONSTRAINT auditoria_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE SET NULL;
ALTER TABLE auditoria_sesion ADD CONSTRAINT auditoria_sesion_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE SET NULL;
ALTER TABLE pago ADD CONSTRAINT pago_alumno_id_fkey FOREIGN KEY (alumno_id) REFERENCES alumno(id);
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
CREATE INDEX idx_alumno_materia_interes_materia ON public.alumno_materia_interes USING btree (materia_id);
CREATE INDEX idx_auditoria_fecha ON public.auditoria USING btree (fecha_hora DESC);
CREATE INDEX idx_auditoria_tabla_registro ON public.auditoria USING btree (tabla, registro_id);
CREATE INDEX idx_auditoria_usuario ON public.auditoria USING btree (usuario_id);
CREATE INDEX idx_auditoria_sesion_fecha ON public.auditoria_sesion USING btree (fecha_hora DESC);
CREATE INDEX idx_auditoria_sesion_usuario ON public.auditoria_sesion USING btree (usuario_id);
CREATE UNIQUE INDEX uq_forma_pago_nombre ON public.forma_pago USING btree (lower(btrim((nombre)::text)));
CREATE INDEX idx_materia_nivel_estado ON public.materia USING btree (nivel, estado);
CREATE UNIQUE INDEX uq_materia_nombre_activa ON public.materia USING btree (lower(btrim((nombre)::text))) WHERE (estado = 'activo'::estado_activo_inactivo);
CREATE UNIQUE INDEX uq_motivo_baja_nombre ON public.motivo_baja USING btree (lower(btrim((nombre)::text)));
CREATE UNIQUE INDEX uq_motivo_cancelacion_nombre ON public.motivo_cancelacion USING btree (lower(btrim((nombre)::text)));
CREATE INDEX idx_pago_alumno_fecha ON public.pago USING btree (alumno_id, fecha_pago DESC);
CREATE INDEX idx_pago_fecha ON public.pago USING btree (fecha_pago);
CREATE INDEX idx_pago_forma_pago_forma ON public.pago_forma_pago USING btree (forma_pago_id);
CREATE INDEX idx_pago_turno_pago ON public.pago_turno USING btree (pago_id);
CREATE INDEX idx_precio_clase_profesor_materia ON public.precio_clase USING btree (profesor_materia_id);
CREATE INDEX idx_profesor_estado ON public.profesor USING btree (estado);
CREATE INDEX idx_profesor_materia_materia ON public.profesor_materia USING btree (materia_id);
CREATE INDEX idx_turno_alumno ON public.turno USING btree (alumno_id);
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
          WHERE ((ap.estado = 'activo'::estado_activo_inactivo) AND (ags.estado = 'activo'::estado_activo_inactivo))
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

  IF (v_t.fecha + v_t.hora_inicio) > (now() AT TIME ZONE 'America/Argentina/Buenos_Aires') THEN
    RAISE EXCEPTION 'El turno % aún no se dictó; solo se cobran clases ya transcurridas.', v_t.codigo;
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

CREATE OR REPLACE FUNCTION public.fn_pago_validar_consistencia()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_suma   numeric(12,2);
  v_formas integer;
BEGIN
  SELECT COALESCE(SUM(importe), 0) INTO v_suma FROM pago_turno WHERE pago_id = NEW.id;
  SELECT COUNT(*) INTO v_formas FROM pago_forma_pago WHERE pago_id = NEW.id;

  IF v_suma <> NEW.monto THEN
    RAISE EXCEPTION 'El monto del pago (%) no coincide con la suma de las clases seleccionadas (%).', NEW.monto, v_suma;
  END IF;

  IF v_formas = 0 THEN
    RAISE EXCEPTION 'El pago debe tener al menos una forma de pago.';
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

CREATE OR REPLACE FUNCTION public.fn_turno_bloquear_cambio_alumno_materia()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  RAISE EXCEPTION 'No se puede cambiar el alumno ni la materia del turno %.', OLD.codigo;
END;
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
  IF NEW.pagado IS DISTINCT FROM EXISTS (SELECT 1 FROM pago_turno WHERE turno_id = NEW.id) THEN
    RAISE EXCEPTION 'turno.pagado no se modifica manualmente: lo determina el pago registrado (turno id=%).', NEW.id;
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
  v_ahora    timestamp := (now() AT TIME ZONE 'America/Argentina/Buenos_Aires');
  v_inicio   timestamp;
  v_nombre   varchar;
  v_estado   estado_activo_inactivo;
  v_requiere boolean;
BEGIN
  IF OLD.estado = 'Cancelado' THEN
    RAISE EXCEPTION 'El turno % está cancelado y no puede reactivarse; debe generarse una nueva reserva.', OLD.codigo;
  END IF;

  IF NEW.estado = 'Cancelado' THEN
    v_inicio := OLD.fecha + OLD.hora_inicio;

    IF v_inicio <= v_ahora THEN
      RAISE EXCEPTION 'Solo se pueden cancelar turnos con inicio futuro (turno %).', OLD.codigo;
    END IF;

    IF NEW.motivo_cancelacion_id IS NULL THEN
      RAISE EXCEPTION 'Debe indicar el motivo de la cancelación.';
    END IF;

    SELECT nombre, estado, requiere_detalle
      INTO v_nombre, v_estado, v_requiere
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
    NEW.cancelacion_tardia := (v_inicio - v_ahora) < make_interval(hours => fn_parametro('horas_cancelacion_tardia'));
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

CREATE OR REPLACE FUNCTION public.unaccent(regdictionary, text)
 RETURNS text
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/unaccent', $function$unaccent_dict$function$
;

CREATE OR REPLACE FUNCTION public.unaccent(text)
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
CREATE TRIGGER trg_alumno_updated_at BEFORE UPDATE ON public.alumno FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();
CREATE TRIGGER trg_auditoria_alumno AFTER INSERT OR DELETE OR UPDATE ON public.alumno FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_alumno_materia_interes_validar_materia BEFORE INSERT OR UPDATE OF materia_id ON public.alumno_materia_interes FOR EACH ROW EXECUTE FUNCTION fn_alumno_materia_interes_validar_materia();
CREATE TRIGGER trg_auditoria_alumno_materia_interes AFTER INSERT OR DELETE OR UPDATE ON public.alumno_materia_interes FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_auditoria_bloquear_cambios BEFORE DELETE OR UPDATE ON public.auditoria FOR EACH ROW EXECUTE FUNCTION fn_bloquear_modificacion_auditoria();
CREATE TRIGGER trg_auditoria_sesion_bloquear_cambios BEFORE DELETE OR UPDATE ON public.auditoria_sesion FOR EACH ROW EXECUTE FUNCTION fn_bloquear_modificacion_auditoria();
CREATE TRIGGER trg_auditoria_forma_pago AFTER INSERT OR DELETE OR UPDATE ON public.forma_pago FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_forma_pago_updated_at BEFORE UPDATE ON public.forma_pago FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();
CREATE TRIGGER trg_auditoria_materia AFTER INSERT OR DELETE OR UPDATE ON public.materia FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_materia_updated_at BEFORE UPDATE ON public.materia FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();
CREATE TRIGGER trg_auditoria_motivo_baja AFTER INSERT OR DELETE OR UPDATE ON public.motivo_baja FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_motivo_baja_updated_at BEFORE UPDATE ON public.motivo_baja FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();
CREATE TRIGGER trg_auditoria_motivo_cancelacion AFTER INSERT OR DELETE OR UPDATE ON public.motivo_cancelacion FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_motivo_cancelacion_updated_at BEFORE UPDATE ON public.motivo_cancelacion FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();
CREATE TRIGGER trg_auditoria_pago AFTER INSERT OR DELETE OR UPDATE ON public.pago FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_pago_validar_alumno BEFORE INSERT ON public.pago FOR EACH ROW EXECUTE FUNCTION fn_pago_validar_alumno();
CREATE CONSTRAINT TRIGGER trg_pago_validar_consistencia AFTER INSERT ON public.pago DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION fn_pago_validar_consistencia();
CREATE TRIGGER trg_auditoria_pago_forma_pago AFTER INSERT OR DELETE OR UPDATE ON public.pago_forma_pago FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_pago_forma_pago_validar BEFORE INSERT OR UPDATE ON public.pago_forma_pago FOR EACH ROW EXECUTE FUNCTION fn_pago_forma_pago_validar();
CREATE TRIGGER trg_auditoria_pago_turno AFTER INSERT OR DELETE OR UPDATE ON public.pago_turno FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_pago_turno_marcar_pagado AFTER INSERT ON public.pago_turno FOR EACH ROW EXECUTE FUNCTION fn_pago_turno_marcar_pagado();
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
CREATE TRIGGER trg_turno_proteger_derivados BEFORE UPDATE OF cantidad_modificaciones, fecha_cancelacion, cancelacion_tardia, motivo_cancelacion_id, detalle_cancelacion ON public.turno FOR EACH ROW EXECUTE FUNCTION fn_turno_proteger_derivados();
CREATE TRIGGER trg_turno_proteger_pagado BEFORE INSERT OR UPDATE OF pagado ON public.turno FOR EACH ROW EXECUTE FUNCTION fn_turno_proteger_pagado();
CREATE TRIGGER trg_turno_validar_cancelacion BEFORE UPDATE OF estado ON public.turno FOR EACH ROW WHEN ((old.estado IS DISTINCT FROM new.estado)) EXECUTE FUNCTION fn_turno_validar_cancelacion();
CREATE TRIGGER trg_turno_validar_modificacion BEFORE UPDATE OF profesor_id, fecha, hora_inicio, hora_fin ON public.turno FOR EACH ROW WHEN (((((old.profesor_id IS DISTINCT FROM new.profesor_id) OR (old.fecha IS DISTINCT FROM new.fecha)) OR (old.hora_inicio IS DISTINCT FROM new.hora_inicio)) OR (old.hora_fin IS DISTINCT FROM new.hora_fin))) EXECUTE FUNCTION fn_turno_validar_modificacion();
CREATE TRIGGER trg_auditoria_usuario_ins_del AFTER INSERT OR DELETE ON public.usuario FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_auditoria_usuario_upd AFTER UPDATE ON public.usuario FOR EACH ROW WHEN ((((((((((((old.rol_id IS DISTINCT FROM new.rol_id) OR (old.academia_id IS DISTINCT FROM new.academia_id)) OR ((old.nombre)::text IS DISTINCT FROM (new.nombre)::text)) OR ((old.apellido)::text IS DISTINCT FROM (new.apellido)::text)) OR ((old.dni)::text IS DISTINCT FROM (new.dni)::text)) OR ((old.email)::text IS DISTINCT FROM (new.email)::text)) OR ((old.telefono)::text IS DISTINCT FROM (new.telefono)::text)) OR (old.estado IS DISTINCT FROM new.estado)) OR (old.motivo_baja_id IS DISTINCT FROM new.motivo_baja_id)) OR ((old.detalle_motivo_baja)::text IS DISTINCT FROM (new.detalle_motivo_baja)::text)) OR (old.fecha_baja IS DISTINCT FROM new.fecha_baja))) EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_usuario_telefono_manda_profesor BEFORE UPDATE OF telefono ON public.usuario FOR EACH ROW EXECUTE FUNCTION fn_usuario_telefono_manda_profesor();
CREATE TRIGGER trg_usuario_validar_baja BEFORE UPDATE OF estado ON public.usuario FOR EACH ROW EXECUTE FUNCTION fn_usuario_validar_baja();
CREATE TRIGGER trg_usuario_validar_motivo_baja BEFORE INSERT OR UPDATE OF estado, motivo_baja_id, detalle_motivo_baja ON public.usuario FOR EACH ROW EXECUTE FUNCTION fn_usuario_validar_motivo_baja();
