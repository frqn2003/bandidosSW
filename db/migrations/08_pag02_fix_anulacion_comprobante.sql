-- =========================================================
-- HU-PAG-02 — Corrección: la anulación de pagos se rechazaba siempre
-- =========================================================
-- Requiere: 03a (fn_pago_validar_anulacion).
--
-- `pago.comprobante` es una columna GENERATED ALWAYS ... STORED
-- ('REC-' || lpad(id, 6, '0')). En un trigger BEFORE UPDATE, Postgres todavía
-- no calculó las columnas generadas: NEW.comprobante llega NULL. La condición
-- `NEW.comprobante IS DISTINCT FROM OLD.comprobante` daba siempre true y toda
-- anulación terminaba en "Los pagos registrados no pueden modificarse".
--
-- Se saca esa comparación. No se pierde ninguna protección: una columna
-- generada no admite UPDATE (Postgres lo rechaza solo), así que el comprobante
-- REC no puede cambiarse ni reutilizarse.
--
-- Una sola transacción. Solo reemplaza la función; el trigger no cambia.
-- =========================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.fn_pago_validar_anulacion()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_actor integer := fn_usuario_id_actual();
  v_rol   text;
BEGIN
  IF OLD.estado = 'Anulado' THEN
    RAISE EXCEPTION 'El pago % ya está anulado y no admite cambios.', OLD.comprobante;
  END IF;

  -- `comprobante` no se compara: es GENERATED (NEW llega NULL en BEFORE UPDATE)
  -- y Postgres ya impide modificarlo.
  IF NEW.estado <> 'Anulado'
     OR NEW.alumno_id     IS DISTINCT FROM OLD.alumno_id
     OR NEW.monto         IS DISTINCT FROM OLD.monto
     OR NEW.fecha_pago    IS DISTINCT FROM OLD.fecha_pago
     OR NEW.observaciones IS DISTINCT FROM OLD.observaciones
     OR NEW.usuario_id    IS DISTINCT FROM OLD.usuario_id
     OR NEW.created_at    IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Los pagos registrados no pueden modificarse, solo anularse (pago %).', OLD.comprobante;
  END IF;

  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'No se identificó al usuario que anula el pago (app.usuario_id).';
  END IF;

  v_rol := fn_rol_usuario(v_actor);
  IF v_rol IS NULL OR v_rol NOT IN ('gerente', 'mesa de entrada') THEN
    RAISE EXCEPTION 'Solo el Gerente o Mesa de Entrada pueden anular pagos.';
  END IF;

  IF btrim(coalesce(NEW.motivo_anulacion, '')) = '' THEN
    RAISE EXCEPTION 'El motivo de la anulación es obligatorio.';
  END IF;

  NEW.anulado_at  := now();
  NEW.anulado_por := v_actor;
  RETURN NEW;
END;
$function$;

COMMIT;
