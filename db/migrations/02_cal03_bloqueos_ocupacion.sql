-- =========================================================
-- HU-CAL-03 — Bloqueo de fechas e indicador de ocupación del calendario
-- =========================================================
-- Requiere haber corrido 01a y 01b (usa fn_usuario_id_actual / fn_rol_usuario).
-- Una sola transacción: si algo falla, no queda nada a medias.
--
-- Qué NO necesita cambios de base:
--   * Estados de asistencia en el calendario: turno.estado ya trae
--     Asistió/Ausente (HU-ASI-01); el calendario solo los lee.
-- =========================================================

BEGIN;

-- ---------------------------------------------------------
-- 1. Tabla bloqueo_fecha (baja lógica, nunca se borra)
-- ---------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS bloqueo_fecha_id_seq;

CREATE TABLE bloqueo_fecha (
  id integer NOT NULL DEFAULT nextval('bloqueo_fecha_id_seq'),
  fecha_desde date NOT NULL,
  fecha_hasta date NOT NULL,
  profesor_id integer,                                   -- NULL = "Todos"
  motivo character varying(100) NOT NULL,
  estado estado_activo_inactivo NOT NULL DEFAULT 'activo',
  usuario_id integer NOT NULL,                           -- quién lo cargó
  created_at timestamptz NOT NULL DEFAULT now(),
  fecha_baja timestamptz,
  usuario_baja_id integer,
  CONSTRAINT bloqueo_fecha_pkey PRIMARY KEY (id),
  CONSTRAINT ck_bloqueo_rango CHECK (fecha_hasta >= fecha_desde),
  CONSTRAINT ck_bloqueo_motivo CHECK (btrim(motivo) <> ''),
  CONSTRAINT ck_bloqueo_baja CHECK (
       (estado = 'activo'   AND fecha_baja IS NULL     AND usuario_baja_id IS NULL)
    OR (estado = 'inactivo' AND fecha_baja IS NOT NULL AND usuario_baja_id IS NOT NULL)
  ),
  CONSTRAINT bloqueo_fecha_profesor_id_fkey    FOREIGN KEY (profesor_id)     REFERENCES profesor(id),
  CONSTRAINT bloqueo_fecha_usuario_id_fkey     FOREIGN KEY (usuario_id)      REFERENCES usuario(id),
  CONSTRAINT bloqueo_fecha_usuario_baja_fkey   FOREIGN KEY (usuario_baja_id) REFERENCES usuario(id)
);

ALTER SEQUENCE bloqueo_fecha_id_seq OWNED BY bloqueo_fecha.id;

-- Búsqueda de "¿esta fecha está bloqueada?" (solo bloqueos vigentes).
CREATE INDEX idx_bloqueo_vigente_rango ON bloqueo_fecha (fecha_desde, fecha_hasta) WHERE estado = 'activo';
CREATE INDEX idx_bloqueo_profesor      ON bloqueo_fecha (profesor_id) WHERE profesor_id IS NOT NULL;


-- ---------------------------------------------------------
-- 2. Reglas de bloqueo_fecha: solo el Gerente; la baja es lo único editable
-- ---------------------------------------------------------
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
$function$;

CREATE TRIGGER trg_bloqueo_fecha_validar
  BEFORE INSERT OR UPDATE ON public.bloqueo_fecha
  FOR EACH ROW EXECUTE FUNCTION fn_bloqueo_fecha_validar();

-- Sin borrado físico.
CREATE TRIGGER trg_bloqueo_fecha_bloquear_borrado
  BEFORE DELETE ON public.bloqueo_fecha
  FOR EACH ROW EXECUTE FUNCTION fn_bloquear_modificacion_auditoria();

-- Bitácora: alta y baja con usuario, fecha/hora y datos del bloqueo.
CREATE TRIGGER trg_auditoria_bloqueo_fecha
  AFTER INSERT OR UPDATE ON public.bloqueo_fecha
  FOR EACH ROW EXECUTE FUNCTION fn_auditoria();


-- ---------------------------------------------------------
-- 3. Las fechas bloqueadas no admiten reservas ni modificaciones hacia ellas
-- ---------------------------------------------------------
-- Solo se evalúa sobre turnos que quedan Reservados: cancelar, marcar asistencia
-- o mover un turno FUERA de una fecha bloqueada siguen permitidos.
-- Los turnos ya existentes dentro del rango no se tocan (los resuelve el usuario).
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
$function$;

CREATE TRIGGER trg_turno_validar_bloqueo_ins
  BEFORE INSERT ON public.turno
  FOR EACH ROW
  WHEN (NEW.estado = 'Reservado')
  EXECUTE FUNCTION fn_turno_validar_bloqueo();

CREATE TRIGGER trg_turno_validar_bloqueo_upd
  BEFORE UPDATE OF profesor_id, fecha, hora_inicio, hora_fin ON public.turno
  FOR EACH ROW
  WHEN (NEW.estado = 'Reservado' AND (
           OLD.profesor_id IS DISTINCT FROM NEW.profesor_id
        OR OLD.fecha       IS DISTINCT FROM NEW.fecha
        OR OLD.hora_inicio IS DISTINCT FROM NEW.hora_inicio
        OR OLD.hora_fin    IS DISTINCT FROM NEW.hora_fin))
  EXECUTE FUNCTION fn_turno_validar_bloqueo();


-- ---------------------------------------------------------
-- 4. vw_huecos_disponibles: no ofrecer huecos en fechas bloqueadas
-- ---------------------------------------------------------
-- Misma definición y mismas columnas que antes; solo se agrega el NOT EXISTS
-- en franjas_fecha.
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
            AND NOT EXISTS (
                  SELECT 1
                  FROM bloqueo_fecha b
                  WHERE b.estado = 'activo'
                    AND d.fecha BETWEEN b.fecha_desde AND b.fecha_hasta
                    AND (b.profesor_id IS NULL OR b.profesor_id = ap.profesor_id))
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


-- ---------------------------------------------------------
-- 5. Listado de bloqueos (para pintar el calendario en gris con rayado)
-- ---------------------------------------------------------
-- El backend filtra por rango visible y estado = 'activo'.
CREATE OR REPLACE VIEW vw_bloqueo_fecha AS
SELECT b.id,
       b.fecha_desde,
       b.fecha_hasta,
       b.profesor_id,
       CASE WHEN b.profesor_id IS NULL THEN 'Todos'
            ELSE (u.apellido || ', ' || u.nombre) END AS profesor,
       b.motivo,
       b.estado,
       b.usuario_id,
       b.created_at,
       b.fecha_baja,
       b.usuario_baja_id
FROM bloqueo_fecha b
LEFT JOIN profesor p ON p.id = b.profesor_id
LEFT JOIN usuario  u ON u.id = p.usuario_id;


-- ---------------------------------------------------------
-- 6. Turnos "Reservado" que caen dentro de un bloqueo
-- ---------------------------------------------------------
-- Se llama con el rango (y profesor) del bloqueo recién cargado — o antes de
-- guardarlo, para previsualizar — y NO modifica nada: el usuario decide si
-- reprograma o cancela cada turno. p_profesor_id NULL = todos los profesores.
CREATE OR REPLACE FUNCTION public.fn_turnos_en_bloqueo(
  p_desde       date,
  p_hasta       date,
  p_profesor_id integer DEFAULT NULL
)
 RETURNS TABLE (
   turno_id    integer,
   codigo      character varying,
   fecha       date,
   hora_inicio time,
   hora_fin    time,
   alumno_id   integer,
   alumno      text,
   profesor_id integer,
   profesor    text,
   materia_id  integer,
   materia     character varying
 )
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
$function$;


-- ---------------------------------------------------------
-- 7. Ocupación = horas reservadas / horas disponibles, por día y por profesor
-- ---------------------------------------------------------
-- * Horas disponibles: bloques activos de agenda_profesional que caen en ese día
--   de la semana. En una fecha bloqueada valen 0 (porcentaje NULL → "—").
-- * Horas reservadas: tiempo ocupado por turnos no cancelados (Reservado,
--   Asistió, Ausente). Si hay varios alumnos en la misma franja (cupos), el
--   tiempo se cuenta UNA vez (unión de intervalos), no una por alumno.
-- * Semáforo: < 50 verde · 50 a 80 amarillo · > 80 rojo.
-- La misma definición debe usarse en HU-IND-02 (% de ocupación del profesor).
-- Semana y Mes: el backend llama con el rango visible; el front pinta.
CREATE OR REPLACE FUNCTION public.fn_ocupacion(
  p_desde       date,
  p_hasta       date,
  p_profesor_id integer DEFAULT NULL
)
 RETURNS TABLE (
   profesor_id           integer,
   fecha                 date,
   horas_disponibles     numeric,
   horas_reservadas      numeric,
   porcentaje_ocupacion  numeric,
   semaforo              text,
   bloqueado             boolean
 )
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
    WHERE p_profesor_id IS NULL OR ap.profesor_id = p_profesor_id
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
$function$;

COMMIT;
