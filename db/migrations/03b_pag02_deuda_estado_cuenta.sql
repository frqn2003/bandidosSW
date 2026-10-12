-- =========================================================
-- HU-PAG-02 (2/4) — Deuda, listado de deudores y estado de cuenta
-- =========================================================
-- Requiere 03a. Solo lectura: vistas y funciones, ninguna tabla nueva.
--
-- DEFINICIÓN DE DEUDA (única fuente de verdad; la usa también HU-IND-03):
--   toda clase Reservado, Asistió o Ausente SIN pago vigente, sin importar la
--   fecha (fn_turno_cobrable). Las Canceladas nunca generan deuda.
--   Es la misma regla con la que se permite cobrar.
--   turno.pagado == "tiene pago vigente" (lo garantiza el trigger
--   fn_turno_proteger_pagado), por eso se usa pagado = false.
-- =========================================================

BEGIN;

-- ---------------------------------------------------------
-- 1. Clases adeudadas (una fila por clase impaga)
-- ---------------------------------------------------------
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
       -- Una clase futura aún no tiene antigüedad: se muestra como 0 días.
       GREATEST((now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date - t.fecha, 0) AS dias_antiguedad
FROM turno t
JOIN materia  m ON m.id = t.materia_id
JOIN profesor p ON p.id = t.profesor_id
JOIN usuario  u ON u.id = p.usuario_id
WHERE fn_turno_cobrable(t.estado)
  AND t.pagado = false;


-- ---------------------------------------------------------
-- 2. Listado de deudores
-- ---------------------------------------------------------
-- Filtros (todos combinables, todos opcionales):
--   p_materia_id / p_profesor_id: se aplican a las CLASES antes de sumar, así
--     el monto y la cantidad reflejan solo lo filtrado.
--   p_dias_min / p_dias_max: rango de "días de antigüedad" del alumno (su clase
--     impaga más antigua, ya filtrada). El front manda:
--       0-30 → (0, 30) · 31-60 → (31, 60) · más de 60 → (61, NULL)
--   p_buscar: coincidencia parcial, sin distinguir mayúsculas, sobre nombre,
--     apellido, "nombre apellido", "apellido nombre", DNI y legajo.
-- Solo alumnos con deuda > 0, ordenados por monto desc.
-- total_general = suma de monto_adeudado de TODAS las filas filtradas (se
-- repite en cada fila; coherente con los filtros aunque se pagine).
-- Semáforo: hasta 30 días amarillo · 31-60 naranja · más de 60 rojo.
-- Incluye alumnos inactivos: la deuda sigue existiendo.
CREATE OR REPLACE FUNCTION public.fn_deudores(
  p_materia_id  integer DEFAULT NULL,
  p_profesor_id integer DEFAULT NULL,
  p_dias_min    integer DEFAULT NULL,
  p_dias_max    integer DEFAULT NULL,
  p_buscar      text    DEFAULT NULL
)
 RETURNS TABLE (
   alumno_id          integer,
   legajo             character varying,
   apellido           character varying,
   nombre             character varying,
   dni                character varying,
   clases_adeudadas   bigint,
   monto_adeudado     numeric,
   fecha_mas_antigua  date,
   dias_antiguedad    integer,
   semaforo           text,
   total_general      numeric
 )
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
$function$;


-- ---------------------------------------------------------
-- 3. Estado de cuenta del alumno (lectura)
-- ---------------------------------------------------------
-- Movimientos en orden cronológico (más viejo primero):
--   * Clase  → cargo = valor de la clase congelado. Son cargo (suman al saldo)
--              las clases Reservado, Asistió y Ausente (fn_turno_cobrable), la
--              misma regla de vw_deuda_clase, sin importar la fecha. Las
--              Canceladas se muestran pero no suman.
--   * Pago   → crédito = monto, con su comprobante y medio(s) de pago.
--              Estados: Vigente (suma) y Anulado (se muestra, no suma).
-- saldo_acumulado > 0 = el alumno debe. El saldo final coincide con la suma de
-- vw_deuda_clase del alumno.
-- afecta_saldo = false marca lo que el front debe distinguir visualmente.
-- En un mismo día, la clase va antes que el pago.
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
$function$;

COMMIT;
