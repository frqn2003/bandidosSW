-- =========================================================
-- HU-IND-03 — Corrección: Deuda pendiente total sincronizada con HU-PAG-02
-- =========================================================
-- Requiere: 07 (fn_deuda_al), 09 (fn_turno_cobrable).
--
-- Problema corregido:
--   En HU-PAG-02 (migración 09), se corrigió que solo las clases dictadas
--   o inasistencias ('Asistió' y 'Ausente') generan deuda (fn_turno_cobrable),
--   excluyendo clases 'Reservado'.
--   Sin embargo, fn_deuda_al en HU-IND-03 continuaba computando turnos
--   en estado 'Reservado' porque solo filtraba t.estado <> 'Cancelado'.
--   Esto provocaba que el tablero de indicadores mostrara una deuda total
--   inflada respecto al módulo de cobranzas (vw_deuda_clase / fn_deudores).
--
-- Con esta corrección:
--   * fn_deuda_al aplica fn_turno_cobrable(t.estado) y t.fecha <= p_fecha.
--   * A la fecha de corte actual coincide exactamente con vw_deuda_clase de cobranzas.
-- =========================================================

BEGIN;

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

COMMIT;
