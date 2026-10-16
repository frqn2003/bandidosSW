-- =========================================================
-- HU-IND-03 — Tablero completo de indicadores de dirección
-- =========================================================
-- Requiere: 01a/01b (asistencia), 02 (bloqueo_fecha), 03a (pago.estado,
-- pago_turno.vigente, anulado_at), 04 (fn_ts_servidor_a_art) y 06
-- (fn_ocupacion con filtros, fn_validar_periodo).
-- Solo lectura: funciones, ninguna tabla nueva. Una sola transacción.
-- Acceso exclusivo del Gerente: lo controla el backend.
--
-- Conserva los indicadores y filtros de HU-IND-01 y agrega:
--   * filtro NIVEL (materia.nivel; para alumnos, alumno.nivel_educativo),
--     combinable con período, materia y profesor;
--   * % de asistencia global, deuda pendiente total, ingresos cobrados sin
--     pagos anulados;
--   * variación contra el período inmediato anterior de igual duración;
--   * ranking de profesores y mapa de calor de demanda.
--
-- Filtros de Materia y Profesor NO aplican a Alumnos activos ni a Altas de
-- alumnos (regla de HU-IND-01). Nivel sí aplica (por nivel educativo del alumno).
--
-- Una sola fuente de verdad para las cifras:
--   * Deuda  = misma definición de PAG-02 (clases Asistió/Ausente con
--              fn_turno_cobrable sin pago vigente).
--   * Ingresos = pagos VIGENTES por fecha de pago, igual que cierre de caja y
--              rendición.
--   * Ocupación = fn_ocupacion (la misma del calendario y de IND-02).
-- =========================================================

BEGIN;

-- ---------------------------------------------------------
-- 1. Alumnos activos a una fecha
-- ---------------------------------------------------------
-- Para hoy (o fechas futuras) usa el estado actual. Para fechas pasadas
-- reconstruye el estado con la bitácora de alumno: el último cambio de estado
-- hasta esa fecha; si no hubo ninguno, estaba activo. Se usa para comparar
-- contra el período anterior.
CREATE OR REPLACE FUNCTION public.fn_alumnos_activos_al(
  p_fecha date,
  p_nivel nivel_materia DEFAULT NULL
)
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
$function$;


-- ---------------------------------------------------------
-- 2. Deuda pendiente a una fecha
-- ---------------------------------------------------------
-- Clases Asistió/Ausente (fn_turno_cobrable) dictadas hasta esa fecha y sin pago
-- vigente a esa fecha. Un pago cuenta si su fecha_pago es <= la fecha y no
-- estaba anulado todavía. Para hoy coincide con la suma de vw_deuda_clase.
CREATE OR REPLACE FUNCTION public.fn_deuda_al(
  p_fecha       date,
  p_materia_id  integer       DEFAULT NULL,
  p_profesor_id integer       DEFAULT NULL,
  p_nivel       nivel_materia DEFAULT NULL
)
 RETURNS numeric
 LANGUAGE sql
 STABLE
AS $function$
  SELECT COALESCE(sum(t.valor_clase_congelado), 0)
  FROM turno t
  JOIN materia m ON m.id = t.materia_id
  WHERE fn_ts_servidor_a_art(t.created_at)::date <= p_fecha
    AND t.fecha <= p_fecha
    AND fn_turno_cobrable(t.estado)
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
$function$;


-- ---------------------------------------------------------
-- 3. Valores del tablero para UN período (uso interno)
-- ---------------------------------------------------------
-- Alumnos activos y deuda son "foto" y se evalúan a la fecha de corte:
-- el fin del período, sin pasar de hoy.
CREATE OR REPLACE FUNCTION public.fn_ind_direccion_valores(
  p_desde       date,
  p_hasta       date,
  p_materia_id  integer       DEFAULT NULL,
  p_profesor_id integer       DEFAULT NULL,
  p_nivel       nivel_materia DEFAULT NULL
)
 RETURNS TABLE (
   clave text,
   valor numeric
 )
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
$function$;


-- ---------------------------------------------------------
-- 4. Tarjetas con variación contra el período anterior
-- ---------------------------------------------------------
-- Una fila por tarjeta. Período anterior = mismo largo, inmediatamente antes.
--   variacion_porcentual = (actual - anterior) / anterior * 100, un decimal.
--     NULL si el anterior es 0 o no existe (el front muestra "—").
--   mejora: true  → ▲ verde · false → ▼ rojo · NULL → sin cambio o sin dato.
--     Para % de cancelaciones y deuda pendiente, "mejora" significa que BAJAN
--     (menor_es_mejor = true).
-- valor NULL = denominador 0 → "—". Sin datos en el período: el front lo
-- detecta con turnos_generados = 0.
CREATE OR REPLACE FUNCTION public.fn_indicadores_direccion(
  p_desde       date,
  p_hasta       date,
  p_materia_id  integer       DEFAULT NULL,
  p_profesor_id integer       DEFAULT NULL,
  p_nivel       nivel_materia DEFAULT NULL
)
 RETURNS TABLE (
   clave                text,
   etiqueta             text,
   unidad               text,
   valor                numeric,
   valor_anterior       numeric,
   variacion_porcentual numeric,
   mejora               boolean,
   menor_es_mejor       boolean
 )
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
$function$;


-- ---------------------------------------------------------
-- 5. Ranking: Top 5 profesores por clases dictadas (Asistió)
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_ind_top_profesores(
  p_desde       date,
  p_hasta       date,
  p_materia_id  integer       DEFAULT NULL,
  p_profesor_id integer       DEFAULT NULL,
  p_nivel       nivel_materia DEFAULT NULL
)
 RETURNS TABLE (
   profesor_id     integer,
   profesor        text,
   clases_dictadas bigint,
   horas_dictadas  numeric
 )
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
$function$;


-- ---------------------------------------------------------
-- 6. Mapa de calor: demanda por materia y franja horaria
-- ---------------------------------------------------------
-- Demanda = turnos NO cancelados, agrupados por materia y por la hora de
-- inicio (franjas de 1 hora). Devuelve solo celdas con turnos; el front completa
-- con 0. Filtros: profesor, materia, nivel y horario (p_hora_desde inclusive,
-- p_hora_hasta exclusive, sobre la hora de inicio del turno).
CREATE OR REPLACE FUNCTION public.fn_ind_mapa_calor(
  p_desde       date,
  p_hasta       date,
  p_materia_id  integer       DEFAULT NULL,
  p_profesor_id integer       DEFAULT NULL,
  p_nivel       nivel_materia DEFAULT NULL,
  p_hora_desde  time          DEFAULT NULL,
  p_hora_hasta  time          DEFAULT NULL
)
 RETURNS TABLE (
   materia_id   integer,
   materia      character varying,
   franja_hora  integer,
   franja       text,
   turnos       bigint
 )
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
$function$;


-- ---------------------------------------------------------
-- 7. Indicadores de HU-IND-01 que se conservan (con Nivel y sin pagos anulados)
-- ---------------------------------------------------------
-- Gráfico de barras de turnos por semana (lunes a domingo, semanas sin turnos
-- incluidas; turnos generados = incluye cancelados).
CREATE OR REPLACE FUNCTION public.fn_ind_turnos_por_semana(
  p_desde       date,
  p_hasta       date,
  p_materia_id  integer       DEFAULT NULL,
  p_profesor_id integer       DEFAULT NULL,
  p_nivel       nivel_materia DEFAULT NULL
)
 RETURNS TABLE (
   semana_inicio date,
   semana_fin    date,
   turnos        bigint,
   cancelados    bigint
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
$function$;

-- Top 5 de materias más pedidas (turnos no cancelados).
CREATE OR REPLACE FUNCTION public.fn_ind_top_materias_demanda(
  p_desde       date,
  p_hasta       date,
  p_materia_id  integer       DEFAULT NULL,
  p_profesor_id integer       DEFAULT NULL,
  p_nivel       nivel_materia DEFAULT NULL
)
 RETURNS TABLE (
   materia_id     integer,
   materia        character varying,
   turnos         bigint,
   horas_dictadas numeric
 )
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
$function$;

-- Top 5 de materias que más ingresos generaron (solo pagos vigentes).
CREATE OR REPLACE FUNCTION public.fn_ind_top_materias_ingresos(
  p_desde       date,
  p_hasta       date,
  p_materia_id  integer       DEFAULT NULL,
  p_profesor_id integer       DEFAULT NULL,
  p_nivel       nivel_materia DEFAULT NULL
)
 RETURNS TABLE (
   materia_id integer,
   materia    character varying,
   ingresos   numeric,
   turnos     bigint
 )
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
$function$;

COMMIT;
