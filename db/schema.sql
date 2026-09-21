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
CREATE SEQUENCE IF NOT EXISTS auditoria_id_seq;
CREATE SEQUENCE IF NOT EXISTS auditoria_sesion_id_seq;
CREATE SEQUENCE IF NOT EXISTS materia_id_seq;
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
  updated_at timestamp without time zone DEFAULT now() NOT NULL
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
  updated_at timestamp without time zone DEFAULT now() NOT NULL
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
  created_at timestamp without time zone DEFAULT now() NOT NULL
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
  bloqueado_hasta timestamp without time zone,
  fecha_creacion timestamp without time zone DEFAULT now() NOT NULL
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
ALTER TABLE alumno ADD CONSTRAINT ck_alumno_fecha_nacimiento CHECK ((fecha_nacimiento <= CURRENT_DATE));
ALTER TABLE alumno ADD CONSTRAINT ck_alumno_responsable_dni CHECK (((responsable_dni IS NULL) OR ((responsable_dni)::text ~ '^[0-9]{7,8}$'::text)));
ALTER TABLE alumno ADD CONSTRAINT ck_alumno_responsable_menor CHECK (((age((fecha_nacimiento)::timestamp with time zone) >= '18 years'::interval) OR ((responsable_nombre IS NOT NULL) AND (responsable_dni IS NOT NULL) AND (responsable_telefono IS NOT NULL))));
ALTER TABLE alumno ADD CONSTRAINT ck_alumno_responsable_tel CHECK (((responsable_telefono IS NULL) OR ((responsable_telefono)::text ~ '^[0-9]{10,11}$'::text)));
ALTER TABLE alumno ADD CONSTRAINT ck_alumno_telefono CHECK (((telefono)::text ~ '^[0-9]{10,11}$'::text));
ALTER TABLE alumno ADD CONSTRAINT alumno_pkey PRIMARY KEY (id);
ALTER TABLE auditoria ADD CONSTRAINT ck_auditoria_valores CHECK ((((operacion = 'INSERT'::tipo_operacion_auditoria) AND (valores_anteriores IS NULL) AND (valores_nuevos IS NOT NULL)) OR ((operacion = 'UPDATE'::tipo_operacion_auditoria) AND (valores_anteriores IS NOT NULL) AND (valores_nuevos IS NOT NULL)) OR ((operacion = 'DELETE'::tipo_operacion_auditoria) AND (valores_anteriores IS NOT NULL) AND (valores_nuevos IS NULL))));
ALTER TABLE auditoria ADD CONSTRAINT auditoria_pkey PRIMARY KEY (id);
ALTER TABLE auditoria_sesion ADD CONSTRAINT auditoria_sesion_pkey PRIMARY KEY (id);
ALTER TABLE materia ADD CONSTRAINT ck_materia_duracion CHECK ((duracion_clase_minutos = ANY (ARRAY[30, 45, 60, 90, 120])));
ALTER TABLE materia ADD CONSTRAINT ck_materia_nombre CHECK ((btrim((nombre)::text) <> ''::text));
ALTER TABLE materia ADD CONSTRAINT ck_materia_valor CHECK ((valor_clase > (0)::numeric));
ALTER TABLE materia ADD CONSTRAINT materia_pkey PRIMARY KEY (id);
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
ALTER TABLE turno ADD CONSTRAINT ck_turno_rango CHECK ((hora_fin > hora_inicio));
ALTER TABLE turno ADD CONSTRAINT ck_turno_valor CHECK ((valor_clase_congelado > (0)::numeric));
ALTER TABLE turno ADD CONSTRAINT turno_pkey PRIMARY KEY (id);
ALTER TABLE turno ADD CONSTRAINT ex_turno_alumno_sin_superposicion EXCLUDE USING gist (alumno_id WITH =, tsrange((fecha + hora_inicio), (fecha + hora_fin)) WITH &&) WHERE ((estado = 'Reservado'::estado_turno));
ALTER TABLE usuario ADD CONSTRAINT ck_usuario_intentos_fallidos CHECK (((intentos_fallidos >= 0) AND (intentos_fallidos <= 5)));
ALTER TABLE usuario ADD CONSTRAINT usuario_pkey PRIMARY KEY (id);
ALTER TABLE usuario ADD CONSTRAINT usuario_auth_id_key UNIQUE (auth_id);


-- =========================================================
-- CLAVES FORÁNEAS
-- =========================================================

ALTER TABLE agenda ADD CONSTRAINT agenda_academia_id_fkey FOREIGN KEY (academia_id) REFERENCES academia(id);
ALTER TABLE agenda_profesional ADD CONSTRAINT agenda_profesional_agenda_semanal_id_fkey FOREIGN KEY (agenda_semanal_id) REFERENCES agenda_semanal(id);
ALTER TABLE agenda_profesional ADD CONSTRAINT agenda_profesional_profesor_id_fkey FOREIGN KEY (profesor_id) REFERENCES profesor(id);
ALTER TABLE agenda_semanal ADD CONSTRAINT agenda_semanal_agenda_id_fkey FOREIGN KEY (agenda_id) REFERENCES agenda(id);
ALTER TABLE auditoria ADD CONSTRAINT auditoria_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE SET NULL;
ALTER TABLE auditoria_sesion ADD CONSTRAINT auditoria_sesion_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE SET NULL;
ALTER TABLE precio_clase ADD CONSTRAINT precio_clase_profesor_materia_id_fkey FOREIGN KEY (profesor_materia_id) REFERENCES profesor_materia(id);
ALTER TABLE profesor ADD CONSTRAINT profesor_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuario(id);
ALTER TABLE profesor_materia ADD CONSTRAINT profesor_materia_materia_id_fkey FOREIGN KEY (materia_id) REFERENCES materia(id);
ALTER TABLE profesor_materia ADD CONSTRAINT profesor_materia_profesor_id_fkey FOREIGN KEY (profesor_id) REFERENCES profesor(id);
ALTER TABLE turno ADD CONSTRAINT turno_alumno_id_fkey FOREIGN KEY (alumno_id) REFERENCES alumno(id);
ALTER TABLE turno ADD CONSTRAINT turno_materia_id_fkey FOREIGN KEY (materia_id) REFERENCES materia(id);
ALTER TABLE turno ADD CONSTRAINT turno_profesor_id_fkey FOREIGN KEY (profesor_id) REFERENCES profesor(id);
ALTER TABLE turno ADD CONSTRAINT turno_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuario(id);
ALTER TABLE usuario ADD CONSTRAINT usuario_academia_id_fkey FOREIGN KEY (academia_id) REFERENCES academia(id);
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
CREATE INDEX idx_auditoria_fecha ON public.auditoria USING btree (fecha_hora DESC);
CREATE INDEX idx_auditoria_tabla_registro ON public.auditoria USING btree (tabla, registro_id);
CREATE INDEX idx_auditoria_usuario ON public.auditoria USING btree (usuario_id);
CREATE INDEX idx_auditoria_sesion_fecha ON public.auditoria_sesion USING btree (fecha_hora DESC);
CREATE INDEX idx_auditoria_sesion_usuario ON public.auditoria_sesion USING btree (usuario_id);
CREATE INDEX idx_materia_nivel_estado ON public.materia USING btree (nivel, estado);
CREATE UNIQUE INDEX uq_materia_nombre_activa ON public.materia USING btree (lower(btrim((nombre)::text))) WHERE (estado = 'activo'::estado_activo_inactivo);
CREATE INDEX idx_precio_clase_profesor_materia ON public.precio_clase USING btree (profesor_materia_id);
CREATE INDEX idx_profesor_estado ON public.profesor USING btree (estado);
CREATE INDEX idx_profesor_materia_materia ON public.profesor_materia USING btree (materia_id);
CREATE INDEX idx_turno_alumno ON public.turno USING btree (alumno_id);
CREATE INDEX idx_turno_estado ON public.turno USING btree (estado);
CREATE INDEX idx_turno_materia ON public.turno USING btree (materia_id);
CREATE INDEX idx_turno_profesor_fecha ON public.turno USING btree (profesor_id, fecha, hora_inicio);
CREATE INDEX idx_usuario_academia ON public.usuario USING btree (academia_id);
CREATE INDEX idx_usuario_rol ON public.usuario USING btree (rol_id);
CREATE UNIQUE INDEX uq_usuario_dni_activo ON public.usuario USING btree (dni) WHERE (estado = 'activo'::estado_activo_inactivo);
CREATE UNIQUE INDEX uq_usuario_email_activo ON public.usuario USING btree (lower((email)::text)) WHERE (estado = 'activo'::estado_activo_inactivo);


-- =========================================================
-- VISTAS
-- =========================================================

CREATE OR REPLACE VIEW vw_huecos_disponibles AS
WITH fechas AS (
         SELECT (generate_series((CURRENT_DATE)::timestamp with time zone, ((CURRENT_DATE + 60))::timestamp with time zone, '1 day'::interval))::date AS fecha
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


-- =========================================================
-- TRIGGERS
-- =========================================================

CREATE TRIGGER trg_academia_updated_at BEFORE UPDATE ON public.academia FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();
CREATE TRIGGER trg_agenda_profesional_validar_rango BEFORE INSERT OR UPDATE ON public.agenda_profesional FOR EACH ROW EXECUTE FUNCTION fn_agenda_profesional_validar_rango();
CREATE TRIGGER trg_auditoria_agenda_profesional AFTER INSERT OR DELETE OR UPDATE ON public.agenda_profesional FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_auditoria_alumno AFTER INSERT OR DELETE OR UPDATE ON public.alumno FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_auditoria_bloquear_cambios BEFORE DELETE OR UPDATE ON public.auditoria FOR EACH ROW EXECUTE FUNCTION fn_bloquear_modificacion_auditoria();
CREATE TRIGGER trg_auditoria_sesion_bloquear_cambios BEFORE DELETE OR UPDATE ON public.auditoria_sesion FOR EACH ROW EXECUTE FUNCTION fn_bloquear_modificacion_auditoria();
CREATE TRIGGER trg_auditoria_materia AFTER INSERT OR DELETE OR UPDATE ON public.materia FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_materia_updated_at BEFORE UPDATE ON public.materia FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();
CREATE TRIGGER trg_auditoria_profesor AFTER INSERT OR DELETE OR UPDATE ON public.profesor FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_profesor_updated_at BEFORE UPDATE ON public.profesor FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();
CREATE TRIGGER trg_profesor_validar_usuario BEFORE INSERT OR UPDATE OF usuario_id ON public.profesor FOR EACH ROW EXECUTE FUNCTION fn_profesor_validar_usuario();
CREATE TRIGGER trg_auditoria_profesor_materia AFTER INSERT OR DELETE OR UPDATE ON public.profesor_materia FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_profesor_materia_validar_materia BEFORE INSERT ON public.profesor_materia FOR EACH ROW EXECUTE FUNCTION fn_profesor_materia_validar_materia();
CREATE TRIGGER trg_auditoria_turno AFTER INSERT OR DELETE OR UPDATE ON public.turno FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
