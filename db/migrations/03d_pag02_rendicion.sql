-- =========================================================
-- HU-PAG-02 (4/4) — Rendición por profesor
-- =========================================================
-- Requiere 03a, 03b y 03c. Solo lectura: funciones, ninguna tabla nueva.
--
-- Qué se rinde: las clases del profesor COBRADAS con un pago VIGENTE cuya
-- fecha_pago cae en el período (sea cual sea su estado de asistencia, salvo
-- Cancelado, que no puede cobrarse; estado_clase permite distinguirlas). Se computa lo efectivamente
-- cobrado: pago_turno.importe. Las clases dictadas aún sin cobrar se informan
-- aparte y no suman.
--
-- Coherencia con HU-IND-03: la suma de la rendición de todos los profesores en
-- un período == ingresos cobrados (pagos vigentes por fecha_pago) del período.
--
-- Permisos (Gerente: cualquier profesor · Profesor: solo el suyo): backend.
-- =========================================================

BEGIN;

-- Período: obligatorio, desde <= hasta y máximo 12 meses.
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

-- Clases cobradas en el período (una fila por clase).
CREATE OR REPLACE FUNCTION public.fn_rendicion_detalle(
  p_profesor_id integer,
  p_desde       date,
  p_hasta       date,
  p_materia_id  integer DEFAULT NULL
)
 RETURNS TABLE (
   turno_id        integer,
   fecha_clase     date,
   alumno_id       integer,
   alumno          text,
   materia_id      integer,
   materia         character varying,
   importe_cobrado numeric,
   medio_pago      text,
   comprobante     character varying,
   fecha_pago      date,
   estado_clase    estado_turno
 )
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
$function$;

-- Subtotal por materia. Total rendido = suma de subtotal.
CREATE OR REPLACE FUNCTION public.fn_rendicion_resumen(
  p_profesor_id integer,
  p_desde       date,
  p_hasta       date,
  p_materia_id  integer DEFAULT NULL
)
 RETURNS TABLE (
   materia_id integer,
   materia    character varying,
   clases     bigint,
   subtotal   numeric
 )
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
$function$;

-- Clases ya transcurridas (por fecha de la clase) todavía sin cobrar, según la
-- misma definición de deuda de vw_deuda_clase. Informativo: no suma al total
-- rendido.
CREATE OR REPLACE FUNCTION public.fn_rendicion_pendientes(
  p_profesor_id integer,
  p_desde       date,
  p_hasta       date,
  p_materia_id  integer DEFAULT NULL
)
 RETURNS TABLE (
   turno_id          integer,
   fecha_clase       date,
   alumno_id         integer,
   alumno            text,
   materia_id        integer,
   materia           character varying,
   importe_pendiente numeric,
   estado_clase      estado_turno
 )
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
$function$;

COMMIT;
