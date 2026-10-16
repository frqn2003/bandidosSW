-- =========================================================
-- HU-PAG-02 — Corrección: Clases que generan deuda y cargos en estado de cuenta
-- =========================================================
-- Criterio de aceptación:
--   "Generan deuda las clases en estado 'Asistió' y 'Ausente' que no tengan un pago vigente asociado"
--   "clases con cargo, en estado 'Asistió' o 'Ausente', como cargos"
--
-- Problema corregido:
--   Anteriormente, fn_turno_cobrable incluía 'Reservado'. Esto hacía que clases futuras
--   o reservadas que aún no fueron dictadas generasen deuda y se computasen como cargo
--   en el estado de cuenta.
--
-- Con esta corrección:
--   * fn_turno_cobrable retorna true ÚNICAMENTE para 'Asistió' y 'Ausente'.
--   * vw_deuda_clase solo lista clases impagas que hayan sido dictadas o computadas como inasistencia.
--   * fn_deudores solo totaliza y computa deuda por clases 'Asistió' y 'Ausente'.
--   * fn_estado_cuenta solo computa cargos que afecten el saldo para 'Asistió' y 'Ausente'.
-- =========================================================

BEGIN;

-- 1. Redefinición de la función de cobrabilidad / generadora de deuda
CREATE OR REPLACE FUNCTION public.fn_turno_cobrable(p_estado estado_turno)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT p_estado IN ('Asistió', 'Ausente');
$function$;

-- 2. Actualización de vw_deuda_clase
CREATE OR REPLACE VIEW vw_deuda_clase AS
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
       t.valor_clase_congelado AS importe,
       GREATEST((now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date - t.fecha, 0) AS dias_antiguedad
FROM turno t
JOIN materia  m ON m.id = t.materia_id
JOIN profesor p ON p.id = t.profesor_id
JOIN usuario  u ON u.id = p.usuario_id
WHERE fn_turno_cobrable(t.estado)
  AND t.pagado = false;

-- 3. Actualización de fn_estado_cuenta
CREATE OR REPLACE FUNCTION public.fn_estado_cuenta(p_alumno_id integer)
 RETURNS TABLE (
   fecha           date,
   hora            time,
   tipo            text,
   referencia_id   integer,
   referencia      character varying,
   detalle         text,
   estado          text,
   cargo           numeric,
   credito         numeric,
   afecta_saldo    boolean,
   saldo_acumulado numeric
 )
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
           fn_turno_cobrable(t.estado)  AS afecta
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
$function$;

COMMIT;
