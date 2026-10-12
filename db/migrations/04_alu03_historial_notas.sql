-- =========================================================
-- HU-ALU-03 — Historial del alumno: línea de tiempo y notas
-- =========================================================
-- Requiere 01a y 01b (asistencia, motivo_cancelacion.responsable, helpers de
-- sesión). No depende de las migraciones 02 ni 03.
-- Una sola transacción.
--
-- ANTES DE CORRER: verificá la zona horaria de la base con
--     SHOW timezone;
-- Este archivo asume 'UTC' (lo habitual en Supabase) para convertir a hora de
-- Buenos Aires los timestamps "sin zona" que escribe now() (turno.created_at,
-- auditoria.fecha_hora). Si devuelve otra zona, cambiá SOLO la función
-- fn_ts_servidor_a_art() de la sección 1.
--
-- Qué es la "Fecha y hora" de cada evento (hora de Buenos Aires):
--   Reservado   → cuándo se hizo la reserva
--   Modificado  → cuándo se reprogramó
--   Cancelado   → cuándo se canceló
--   Asistió / Ausente → cuándo se registró la asistencia
--   Nota        → cuándo se escribió
-- La fecha y hora de la CLASE viajan aparte (fecha_clase, hora_clase).
--
-- Quién puede ver qué (Mesa de Entrada / Gerente: cualquier alumno; Profesor:
-- solo alumnos que atiende; Alumno: nada de esto) lo aplica el backend con
-- fn_profesor_atiende_alumno().
-- =========================================================

BEGIN;

-- ---------------------------------------------------------
-- 1. Helpers
-- ---------------------------------------------------------
-- Un único lugar donde se decide en qué zona escribe la base.
CREATE OR REPLACE FUNCTION public.fn_ts_servidor_a_art(p_ts timestamp)
 RETURNS timestamp
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT (p_ts AT TIME ZONE 'UTC') AT TIME ZONE 'America/Argentina/Buenos_Aires';
$function$;

-- "Alumno que atiende": el profesor tiene o tuvo con él al menos un turno no
-- cancelado.
CREATE OR REPLACE FUNCTION public.fn_profesor_atiende_alumno(
  p_profesor_id integer,
  p_alumno_id   integer
)
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
$function$;


-- ---------------------------------------------------------
-- 2. Notas del historial (solo se agregan; una corrección es una nota nueva)
-- ---------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS nota_alumno_id_seq;

CREATE TABLE nota_alumno (
  id integer NOT NULL DEFAULT nextval('nota_alumno_id_seq'),
  alumno_id integer NOT NULL,
  texto character varying(500) NOT NULL,
  usuario_id integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT nota_alumno_pkey PRIMARY KEY (id),
  CONSTRAINT ck_nota_alumno_texto CHECK (btrim(texto) <> ''),
  CONSTRAINT nota_alumno_alumno_id_fkey  FOREIGN KEY (alumno_id)  REFERENCES alumno(id),
  CONSTRAINT nota_alumno_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuario(id)
);

ALTER SEQUENCE nota_alumno_id_seq OWNED BY nota_alumno.id;

CREATE INDEX idx_nota_alumno_alumno ON nota_alumno (alumno_id, created_at DESC);

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
$function$;

CREATE TRIGGER trg_nota_alumno_validar
  BEFORE INSERT ON public.nota_alumno
  FOR EACH ROW EXECUTE FUNCTION fn_nota_alumno_validar();

-- Una nota no se edita ni se borra: se corrige con otra nota.
CREATE TRIGGER trg_nota_alumno_bloquear_cambios
  BEFORE UPDATE OR DELETE ON public.nota_alumno
  FOR EACH ROW EXECUTE FUNCTION fn_bloquear_modificacion_auditoria();

-- Bitácora: usuario, fecha/hora y texto.
CREATE TRIGGER trg_auditoria_nota_alumno
  AFTER INSERT ON public.nota_alumno
  FOR EACH ROW EXECUTE FUNCTION fn_auditoria();


-- ---------------------------------------------------------
-- 3. Línea de tiempo del alumno (lectura)
-- ---------------------------------------------------------
-- El backend filtra y ordena sobre esta vista:
--   WHERE alumno_id = $1
--     [AND fecha_hora >= $desde AND fecha_hora < $hasta_mas_1_dia]
--     [AND tipo = $tipo] [AND materia_id = $m] [AND profesor_id = $p]
--   ORDER BY fecha_hora DESC, orden_evento DESC
-- Las notas no tienen materia ni profesor: al filtrar por alguno de los dos,
-- las notas quedan afuera (es lo esperable).
--
-- tipo: 'Reservado' | 'Modificado' | 'Cancelado' | 'Asistió' | 'Ausente' | 'Nota'
-- responsable: solo en Cancelado (Alumno | Profesor | Centro), para distinguir
--   quién originó la cancelación.
-- observaciones: solo en Asistió/Ausente (visibles para Mesa de Entrada,
--   Gerente y Profesor, que son los roles con acceso al historial).
CREATE OR REPLACE VIEW vw_historial_alumno AS

-- Reservado
SELECT t.alumno_id,
       fn_ts_servidor_a_art(t.created_at)        AS fecha_hora,
       1                                         AS orden_evento,
       'Reservado'::text                         AS tipo,
       t.materia_id,
       m.nombre::text                            AS materia,
       t.profesor_id,
       (up.apellido || ', ' || up.nombre)::text  AS profesor,
       ('Clase ' || to_char(t.fecha, 'DD/MM/YYYY') || ' '
          || to_char(t.hora_inicio, 'HH24:MI') || '-' || to_char(t.hora_fin, 'HH24:MI')
          || ' · ' || coalesce(t.codigo, ''))::text AS detalle,
       NULL::text                                AS observaciones,
       false                                     AS cancelacion_tardia,
       NULL::text                                AS responsable,
       t.usuario_id,
       (uu.apellido || ', ' || uu.nombre)::text  AS usuario,
       t.id                                      AS turno_id,
       t.fecha                                   AS fecha_clase,
       t.hora_inicio                             AS hora_clase
FROM turno t
JOIN materia  m  ON m.id  = t.materia_id
JOIN profesor p  ON p.id  = t.profesor_id
JOIN usuario  up ON up.id = p.usuario_id
LEFT JOIN usuario uu ON uu.id = t.usuario_id

UNION ALL

-- Modificado (reprogramación: cambió fecha, horario o profesor), tomado de la
-- bitácora del turno.
SELECT t.alumno_id,
       fn_ts_servidor_a_art(a.fecha_hora),
       2,
       'Modificado'::text,
       t.materia_id,
       m.nombre::text,
       (a.valores_nuevos->>'profesor_id')::int,
       (unp.apellido || ', ' || unp.nombre)::text,
       ('Reprogramado: '
          || to_char((a.valores_anteriores->>'fecha')::date, 'DD/MM/YYYY') || ' '
          || to_char((a.valores_anteriores->>'hora_inicio')::time, 'HH24:MI') || '-'
          || to_char((a.valores_anteriores->>'hora_fin')::time, 'HH24:MI')
          || ' → '
          || to_char((a.valores_nuevos->>'fecha')::date, 'DD/MM/YYYY') || ' '
          || to_char((a.valores_nuevos->>'hora_inicio')::time, 'HH24:MI') || '-'
          || to_char((a.valores_nuevos->>'hora_fin')::time, 'HH24:MI')
          || CASE WHEN a.valores_anteriores->>'profesor_id' IS DISTINCT FROM a.valores_nuevos->>'profesor_id'
                  THEN ' · Profesor: ' || (uap.apellido || ', ' || uap.nombre)
                       || ' → ' || (unp.apellido || ', ' || unp.nombre)
                  ELSE '' END
       )::text,
       NULL::text,
       false,
       NULL::text,
       a.usuario_id,
       (ua.apellido || ', ' || ua.nombre)::text,
       t.id,
       (a.valores_nuevos->>'fecha')::date,
       (a.valores_nuevos->>'hora_inicio')::time
FROM auditoria a
JOIN turno    t   ON t.id = a.registro_id
JOIN materia  m   ON m.id = t.materia_id
JOIN profesor pn  ON pn.id = (a.valores_nuevos->>'profesor_id')::int
JOIN usuario  unp ON unp.id = pn.usuario_id
JOIN profesor pa  ON pa.id = (a.valores_anteriores->>'profesor_id')::int
JOIN usuario  uap ON uap.id = pa.usuario_id
LEFT JOIN usuario ua ON ua.id = a.usuario_id
WHERE a.tabla = 'turno'
  AND a.operacion = 'UPDATE'
  AND ( a.valores_anteriores->>'fecha',      a.valores_anteriores->>'hora_inicio',
        a.valores_anteriores->>'hora_fin',   a.valores_anteriores->>'profesor_id' )
      IS DISTINCT FROM
      ( a.valores_nuevos->>'fecha',          a.valores_nuevos->>'hora_inicio',
        a.valores_nuevos->>'hora_fin',       a.valores_nuevos->>'profesor_id' )

UNION ALL

-- Cancelado (con motivo, marca de cancelación tardía y responsable).
-- fecha_cancelacion ya se guarda en hora de Buenos Aires.
SELECT t.alumno_id,
       t.fecha_cancelacion,
       3,
       'Cancelado'::text,
       t.materia_id,
       m.nombre::text,
       t.profesor_id,
       (up.apellido || ', ' || up.nombre)::text,
       ('Motivo: ' || mc.nombre
          || coalesce(' — ' || nullif(btrim(t.detalle_cancelacion), ''), '')
          || ' · Clase ' || to_char(t.fecha, 'DD/MM/YYYY') || ' '
          || to_char(t.hora_inicio, 'HH24:MI'))::text,
       NULL::text,
       t.cancelacion_tardia,
       mc.responsable::text,
       c.usuario_id,
       (uc.apellido || ', ' || uc.nombre)::text,
       t.id,
       t.fecha,
       t.hora_inicio
FROM turno t
JOIN materia            m  ON m.id  = t.materia_id
JOIN profesor           p  ON p.id  = t.profesor_id
JOIN usuario            up ON up.id = p.usuario_id
JOIN motivo_cancelacion mc ON mc.id = t.motivo_cancelacion_id
LEFT JOIN LATERAL (
  SELECT a.usuario_id
  FROM auditoria a
  WHERE a.tabla = 'turno'
    AND a.registro_id = t.id
    AND a.operacion = 'UPDATE'
    AND a.valores_nuevos->>'estado'      = 'Cancelado'
    AND a.valores_anteriores->>'estado' <> 'Cancelado'
  ORDER BY a.id DESC
  LIMIT 1
) c ON true
LEFT JOIN usuario uc ON uc.id = c.usuario_id
WHERE t.estado = 'Cancelado'

UNION ALL

-- Asistió / Ausente
SELECT t.alumno_id,
       (s.registrado_at AT TIME ZONE 'America/Argentina/Buenos_Aires'),
       4,
       CASE WHEN s.presente THEN 'Asistió' ELSE 'Ausente' END,
       t.materia_id,
       m.nombre::text,
       t.profesor_id,
       (up.apellido || ', ' || up.nombre)::text,
       ('Clase ' || to_char(t.fecha, 'DD/MM/YYYY') || ' '
          || to_char(t.hora_inicio, 'HH24:MI') || '-' || to_char(t.hora_fin, 'HH24:MI'))::text,
       s.observaciones::text,
       false,
       NULL::text,
       s.usuario_id,
       (us.apellido || ', ' || us.nombre)::text,
       t.id,
       t.fecha,
       t.hora_inicio
FROM asistencia s
JOIN turno    t  ON t.id  = s.turno_id
JOIN materia  m  ON m.id  = t.materia_id
JOIN profesor p  ON p.id  = t.profesor_id
JOIN usuario  up ON up.id = p.usuario_id
JOIN usuario  us ON us.id = s.usuario_id

UNION ALL

-- Nota
SELECT n.alumno_id,
       (n.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires'),
       5,
       'Nota'::text,
       NULL::int,
       NULL::text,
       NULL::int,
       NULL::text,
       n.texto::text,
       NULL::text,
       false,
       NULL::text,
       n.usuario_id,
       (un.apellido || ', ' || un.nombre)::text,
       NULL::int,
       NULL::date,
       NULL::time
FROM nota_alumno n
JOIN usuario un ON un.id = n.usuario_id;


-- ---------------------------------------------------------
-- 4. Resumen superior de la ficha
-- ---------------------------------------------------------
-- clases asistidas, ausencias, cancelaciones, % de asistencia (un decimal;
-- NULL si Asistió + Ausente = 0, que el front muestra como "—") y fecha de la
-- última clase dictada (la más reciente en estado Asistió; NULL si ninguna).
-- Reutiliza fn_asistencia_resumen (HU-ASI-01) para que el % sea el mismo en
-- toda la aplicación.
CREATE OR REPLACE FUNCTION public.fn_historial_resumen(p_alumno_id integer)
 RETURNS TABLE (
   clases_asistidas      bigint,
   ausencias             bigint,
   cancelaciones         bigint,
   porcentaje_asistencia numeric,
   fecha_ultima_clase    date
 )
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
$function$;

COMMIT;
