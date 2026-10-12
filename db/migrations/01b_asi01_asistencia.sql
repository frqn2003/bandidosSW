-- =========================================================
-- HU-ASI-01 (2/2) — Registro de asistencia e historial del alumno
-- =========================================================
-- Requiere haber corrido antes 01a_asi01_enum_estado_turno.sql.
-- Corre en una sola transacción: si algo falla, no queda nada a medias.
--
-- Incluye además (transversal, pedido por el equipo):
--   * motivo_cancelacion.responsable (Alumno | Profesor | Centro), default 'Alumno'.
--   * cancelacion_tardia solo aplica cuando el responsable es el Alumno.
-- =========================================================

BEGIN;

-- ---------------------------------------------------------
-- 1. Parámetros
-- ---------------------------------------------------------
-- La secuencia puede estar desfasada si se sembraron ids a mano.
SELECT setval('parametro_id_seq',
              COALESCE((SELECT MAX(id) FROM parametro), 1),
              (SELECT COUNT(*) > 0 FROM parametro));

INSERT INTO parametro (id, clave, valor, unidad, descripcion)
SELECT nextval('parametro_id_seq'), v.clave, v.valor, v.unidad, v.descripcion
FROM (VALUES
  ('minutos_antes_asistencia', 15, 'minutos',
   'Minutos antes del inicio del turno desde los que se habilita registrar la asistencia'),
  ('horas_correccion_asistencia', 24, 'horas',
   'Horas desde el registro durante las que el Profesor puede corregir la asistencia')
) AS v(clave, valor, unidad, descripcion)
WHERE NOT EXISTS (SELECT 1 FROM parametro p WHERE p.clave = v.clave);


-- ---------------------------------------------------------
-- 2. Responsable de la cancelación (en el catálogo de motivos)
-- ---------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'responsable_cancelacion') THEN
    CREATE TYPE responsable_cancelacion AS ENUM ('Alumno', 'Profesor', 'Centro');
  END IF;
END
$$;

ALTER TABLE motivo_cancelacion
  ADD COLUMN IF NOT EXISTS responsable responsable_cancelacion NOT NULL DEFAULT 'Alumno';


-- ---------------------------------------------------------
-- 3. Helpers de sesión (el backend fija app.usuario_id por transacción)
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_usuario_id_actual()
 RETURNS integer
 LANGUAGE sql
 STABLE
AS $function$
  SELECT NULLIF(current_setting('app.usuario_id', true), '')::int;
$function$;

-- Rol (en minúsculas) de un usuario ACTIVO; NULL si no existe o está inactivo.
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
$function$;


-- ---------------------------------------------------------
-- 4. Tabla asistencia
-- ---------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS asistencia_id_seq;

CREATE TABLE asistencia (
  id integer NOT NULL DEFAULT nextval('asistencia_id_seq'),
  turno_id integer NOT NULL,
  presente boolean NOT NULL,
  tema_trabajado character varying(250),
  observaciones character varying(500),
  usuario_id integer NOT NULL,                              -- quién la registró
  registrado_at timestamptz NOT NULL DEFAULT now(),         -- autogenerado, no editable
  modificado_at timestamptz,
  modificado_por integer,
  motivo_correccion character varying(250),                 -- solo Gerente fuera del plazo
  CONSTRAINT asistencia_pkey PRIMARY KEY (id),
  CONSTRAINT uq_asistencia_turno UNIQUE (turno_id),
  CONSTRAINT ck_asistencia_tema CHECK (NOT presente OR btrim(coalesce(tema_trabajado, '')) <> ''),
  CONSTRAINT ck_asistencia_motivo CHECK (motivo_correccion IS NULL OR btrim(motivo_correccion) <> ''),
  CONSTRAINT asistencia_turno_id_fkey FOREIGN KEY (turno_id) REFERENCES turno(id),
  CONSTRAINT asistencia_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuario(id),
  CONSTRAINT asistencia_modificado_por_fkey FOREIGN KEY (modificado_por) REFERENCES usuario(id)
);

ALTER SEQUENCE asistencia_id_seq OWNED BY asistencia.id;

CREATE INDEX idx_asistencia_usuario ON asistencia (usuario_id);


-- ---------------------------------------------------------
-- 5. Ajustes en turno para los nuevos estados
-- ---------------------------------------------------------
-- 5.a) ck_turno_cancelacion solo conocía Reservado y Cancelado.
--      Se mantiene NOT VALID como estaba (no revalida filas históricas).
ALTER TABLE turno DROP CONSTRAINT ck_turno_cancelacion;
ALTER TABLE turno ADD CONSTRAINT ck_turno_cancelacion CHECK (
     (estado IN ('Reservado', 'Asistió', 'Ausente')
        AND motivo_cancelacion_id IS NULL
        AND detalle_cancelacion IS NULL
        AND fecha_cancelacion IS NULL
        AND cancelacion_tardia = false)
  OR (estado = 'Cancelado'
        AND motivo_cancelacion_id IS NOT NULL
        AND fecha_cancelacion IS NOT NULL)
) NOT VALID;

-- 5.b) Una clase dictada (o ausente) sigue ocupando el horario del alumno.
ALTER TABLE turno DROP CONSTRAINT ex_turno_alumno_sin_superposicion;
ALTER TABLE turno ADD CONSTRAINT ex_turno_alumno_sin_superposicion
  EXCLUDE USING gist (
    alumno_id WITH =,
    tsrange((fecha + hora_inicio), (fecha + hora_fin)) WITH &&
  ) WHERE (estado <> 'Cancelado');

-- 5.c) Filtro del historial por alumno y fecha.
CREATE INDEX IF NOT EXISTS idx_turno_alumno_fecha ON turno (alumno_id, fecha DESC);


-- ---------------------------------------------------------
-- 6. Cambios de estado del turno: cancelación + asistencia
-- ---------------------------------------------------------
-- Reemplaza la función existente. Cambios:
--   * Asistió/Ausente solo se admiten si hay un registro de asistencia coherente.
--   * Un turno con asistencia no puede cancelarse ni volver a Reservado.
--   * cancelacion_tardia solo aplica si el motivo es de responsabilidad del Alumno.
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
$function$;


-- ---------------------------------------------------------
-- 7. Validación de la asistencia (alta y corrección)
-- ---------------------------------------------------------
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
$function$;

-- El turno refleja siempre lo que dice el registro de asistencia.
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
$function$;


-- ---------------------------------------------------------
-- 8. Triggers de asistencia
-- ---------------------------------------------------------
CREATE TRIGGER trg_asistencia_validar
  BEFORE INSERT OR UPDATE ON public.asistencia
  FOR EACH ROW EXECUTE FUNCTION fn_asistencia_validar();

CREATE TRIGGER trg_asistencia_sincronizar_turno
  AFTER INSERT OR UPDATE OF presente ON public.asistencia
  FOR EACH ROW EXECUTE FUNCTION fn_asistencia_sincronizar_turno();

-- El historial no admite borrado físico.
CREATE TRIGGER trg_asistencia_bloquear_borrado
  BEFORE DELETE ON public.asistencia
  FOR EACH ROW EXECUTE FUNCTION fn_bloquear_modificacion_auditoria();

-- Bitácora: usuario, fecha/hora, valor anterior y nuevo.
CREATE TRIGGER trg_auditoria_asistencia
  AFTER INSERT OR UPDATE ON public.asistencia
  FOR EACH ROW EXECUTE FUNCTION fn_auditoria();


-- ---------------------------------------------------------
-- 9. Historial de asistencia del alumno (lectura)
-- ---------------------------------------------------------
-- Columnas pedidas: Fecha, Hora, Materia, Profesor, Estado, Tema trabajado.
-- El orden (fecha desc), los filtros y el permiso por profesor los aplica el
-- backend sobre esta vista:
--   WHERE alumno_id = $1 [AND fecha BETWEEN ..] [AND materia_id = ..]
--     [AND profesor_id = ..] [AND estado = ..]  ORDER BY fecha DESC, hora_inicio DESC
CREATE OR REPLACE VIEW vw_historial_asistencia AS
SELECT t.id          AS turno_id,
       t.codigo,
       t.alumno_id,
       t.fecha,
       t.hora_inicio,
       t.materia_id,
       m.nombre      AS materia,
       t.profesor_id,
       (u.apellido || ', ' || u.nombre) AS profesor,
       t.estado,
       a.tema_trabajado
FROM turno t
JOIN materia  m ON m.id = t.materia_id
JOIN profesor p ON p.id = t.profesor_id
JOIN usuario  u ON u.id = p.usuario_id
LEFT JOIN asistencia a ON a.turno_id = t.id
WHERE t.estado IN ('Asistió', 'Ausente', 'Cancelado');

-- Porcentaje = Asistió / (Asistió + Ausente), un decimal; NULL si no hay base
-- (el front muestra "—"). Acepta los mismos filtros que el historial.
CREATE OR REPLACE FUNCTION public.fn_asistencia_resumen(
  p_alumno_id   integer,
  p_desde       date    DEFAULT NULL,
  p_hasta       date    DEFAULT NULL,
  p_materia_id  integer DEFAULT NULL,
  p_profesor_id integer DEFAULT NULL
)
 RETURNS TABLE (
   clases_asistio        bigint,
   clases_ausente        bigint,
   clases_canceladas     bigint,
   porcentaje_asistencia numeric
 )
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
$function$;

COMMIT;
