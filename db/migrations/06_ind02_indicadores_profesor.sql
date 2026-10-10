-- =========================================================
-- HU-IND-02 — Indicadores de actividad del profesor
-- =========================================================
-- Requiere 01a, 01b y 02 (usa asistencia, motivo_cancelacion.responsable,
-- bloqueo_fecha y fn_ocupacion). NO requiere 03: fn_validar_periodo se
-- redefine acá, idéntica a la de 03d.
-- Solo lectura: funciones, ninguna tabla nueva. Una sola transacción.
--
-- Todas las funciones reciben p_profesor_id: el BACKEND debe pasar siempre el
-- profesor de la sesión, así cada uno ve únicamente sus datos. Ningún
-- indicador toca pagos.
--
-- Definiciones (período = fecha de la CLASE, no de la reserva):
--   Clases dictadas        turnos en estado Asistió.
--   Alumnos atendidos      alumnos distintos de esas clases.
--   Horas dictadas         suma de la duración (hora_fin - hora_inicio) de ellas.
--   % asistencia           Asistió / (Asistió + Ausente), un decimal; NULL si el
--                          denominador es 0 (el front muestra "—").
--   % cancelaciones        Cancelados / total de turnos del período (todos los
--                          estados, o sea todo lo que se reservó), un decimal.
--   % ocupación            horas reservadas / horas disponibles del período
--                          (misma definición que el calendario, HU-CAL-03).
--   Con filtro de Materia: todo se calcula solo sobre esa materia; en la
--   ocupación, las horas disponibles son las de los profesores que la dictan
--   (criterio de HU-IND-01).
-- =========================================================

BEGIN;

-- ---------------------------------------------------------
-- 1. Validación de período (obligatorio, desde <= hasta, máx. 12 meses)
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_validar_periodo(
  p_desde date,
  p_hasta date,
  p_max_meses integer DEFAULT 12
)
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
$function$;


-- ---------------------------------------------------------
-- 2. fn_ocupacion con filtros opcionales de materia y nivel
-- ---------------------------------------------------------
-- Misma función y mismas columnas que en HU-CAL-03, con dos parámetros
-- opcionales al final. Los llamados existentes con 3 parámetros siguen
-- funcionando (también los de 4).
-- Con materia (o nivel):
--   * horas RESERVADAS: solo las de turnos de esa materia (o de materias de ese
--     nivel);
--   * horas DISPONIBLES: solo las de los profesores que dictan esa materia (o
--     alguna materia de ese nivel), igual que en HU-IND-01.
DROP FUNCTION IF EXISTS public.fn_ocupacion(date, date, integer);
DROP FUNCTION IF EXISTS public.fn_ocupacion(date, date, integer, integer);

CREATE OR REPLACE FUNCTION public.fn_ocupacion(
  p_desde       date,
  p_hasta       date,
  p_profesor_id integer       DEFAULT NULL,
  p_materia_id  integer       DEFAULT NULL,
  p_nivel       nivel_materia DEFAULT NULL
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
$function$;


-- ---------------------------------------------------------
-- 3. Tarjetas numéricas (una fila)
-- ---------------------------------------------------------
-- hay_datos = false → el front muestra "Sin datos para el período seleccionado"
-- (no hay ningún turno del profesor en el período con ese filtro).
-- Los porcentajes con denominador 0 vienen en NULL → "—".
-- Además de los pedidos, se desglosan las cancelaciones por quién las originó
-- (según motivo_cancelacion.responsable) sin alterar la fórmula del %.
CREATE OR REPLACE FUNCTION public.fn_indicadores_profesor(
  p_profesor_id integer,
  p_desde       date,
  p_hasta       date,
  p_materia_id  integer DEFAULT NULL
)
 RETURNS TABLE (
   hay_datos                 boolean,
   clases_dictadas           bigint,
   alumnos_atendidos         bigint,
   horas_dictadas            numeric,
   porcentaje_asistencia     numeric,
   porcentaje_cancelaciones  numeric,
   porcentaje_ocupacion      numeric,
   total_turnos              bigint,
   turnos_ausentes           bigint,
   turnos_cancelados         bigint,
   cancelados_por_alumno     bigint,
   cancelados_por_profesor   bigint,
   cancelados_por_centro     bigint,
   horas_reservadas          numeric,
   horas_disponibles         numeric
 )
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
$function$;


-- ---------------------------------------------------------
-- 4. Gráfico de barras: clases dictadas por semana
-- ---------------------------------------------------------
-- Semanas de lunes a domingo, incluidas las de 0 clases para que el gráfico no
-- tenga huecos. Las semanas de los extremos se recortan al período.
CREATE OR REPLACE FUNCTION public.fn_profesor_clases_por_semana(
  p_profesor_id integer,
  p_desde       date,
  p_hasta       date,
  p_materia_id  integer DEFAULT NULL
)
 RETURNS TABLE (
   semana_inicio date,
   semana_fin    date,
   clases        bigint
 )
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
$function$;


-- ---------------------------------------------------------
-- 5. Distribución de clases dictadas por materia
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_profesor_clases_por_materia(
  p_profesor_id integer,
  p_desde       date,
  p_hasta       date,
  p_materia_id  integer DEFAULT NULL
)
 RETURNS TABLE (
   materia_id integer,
   materia    character varying,
   clases     bigint
 )
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
$function$;


-- ---------------------------------------------------------
-- 6. "Alumnos con más ausencias": los 5 primeros
-- ---------------------------------------------------------
-- Solo alumnos con al menos una ausencia; desempate por apellido y nombre.
CREATE OR REPLACE FUNCTION public.fn_profesor_top_ausencias(
  p_profesor_id integer,
  p_desde       date,
  p_hasta       date,
  p_materia_id  integer DEFAULT NULL
)
 RETURNS TABLE (
   alumno_id integer,
   alumno    text,
   ausencias bigint
 )
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
$function$;

COMMIT;
