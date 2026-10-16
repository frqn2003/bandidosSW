-- =========================================================
-- HU-PAG-02 (1/4) — Anulación de pagos
-- =========================================================
-- Requiere 01a y 01b (usa fn_usuario_id_actual / fn_rol_usuario y los estados
-- Asistió/Ausente).
--
-- Reglas que implementa:
--   * Un pago registrado NO se modifica: solo puede anularse.
--   * Anula Gerente o Mesa de Entrada, con motivo obligatorio.
--   * El comprobante REC queda en el pago anulado y no se reutiliza
--     (los pagos no se borran y comprobante es UNIQUE sobre todas las filas).
--   * Al anular, la deuda vuelve al estado anterior: las clases quedan
--     impagas y de nuevo cobrables.
--   * Cobro de clases: regla única fn_turno_cobrable (ver sección 4): toda clase
--     Reservado, Asistió o Ausente impaga, sin importar la fecha.
--   * La regla "no anular en caja cerrada" se agrega en 03c.
-- Una sola transacción.
-- =========================================================

BEGIN;

-- ---------------------------------------------------------
-- 1. Estado del pago
-- ---------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_pago') THEN
    CREATE TYPE estado_pago AS ENUM ('Vigente', 'Anulado');
  END IF;
END
$$;

ALTER TABLE pago
  ADD COLUMN estado estado_pago NOT NULL DEFAULT 'Vigente',
  ADD COLUMN anulado_at timestamptz,
  ADD COLUMN anulado_por integer,
  ADD COLUMN motivo_anulacion character varying(250);

ALTER TABLE pago ADD CONSTRAINT pago_anulado_por_fkey
  FOREIGN KEY (anulado_por) REFERENCES usuario(id);

ALTER TABLE pago ADD CONSTRAINT ck_pago_anulacion CHECK (
     (estado = 'Vigente' AND anulado_at IS NULL AND anulado_por IS NULL AND motivo_anulacion IS NULL)
  OR (estado = 'Anulado' AND anulado_at IS NOT NULL AND anulado_por IS NOT NULL
                         AND btrim(coalesce(motivo_anulacion, '')) <> '')
);

CREATE INDEX idx_pago_vigente_fecha ON pago (fecha_pago) WHERE estado = 'Vigente';


-- ---------------------------------------------------------
-- 2. pago_turno: una clase puede volver a cobrarse tras anular su pago
-- ---------------------------------------------------------
-- Las filas de un pago anulado se conservan (historial) pero dejan de estar
-- vigentes; la unicidad pasa a aplicar solo a las vigentes.
ALTER TABLE pago_turno ADD COLUMN vigente boolean NOT NULL DEFAULT true;

ALTER TABLE pago_turno DROP CONSTRAINT uq_pago_turno_turno;
CREATE UNIQUE INDEX uq_pago_turno_vigente ON pago_turno (turno_id) WHERE vigente;


-- ---------------------------------------------------------
-- 3. turno.pagado ahora refleja "tiene un pago VIGENTE"
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_turno_proteger_pagado()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.pagado IS DISTINCT FROM EXISTS (
       SELECT 1 FROM pago_turno WHERE turno_id = NEW.id AND vigente) THEN
    RAISE EXCEPTION 'turno.pagado no se modifica manualmente: lo determina el pago vigente (turno id=%).', NEW.id;
  END IF;

  RETURN NEW;
END;
$function$;


-- ---------------------------------------------------------
-- 4. Cobro de clases
-- ---------------------------------------------------------
-- REGLA ÚNICA de "clase cobrable / que genera deuda" (la usan la validación del
-- cobro, vw_deuda_clase y fn_estado_cuenta):
--   * Asistió y Ausente            → sí (clases dictadas o inasistencias computadas).
--   * Reservado y Cancelado        → nunca (no generan deuda).
-- Lo que sigue impago de esas clases dictadas es la deuda.
CREATE OR REPLACE FUNCTION public.fn_turno_cobrable(p_estado estado_turno)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT p_estado IN ('Asistió', 'Ausente');
$function$;

CREATE OR REPLACE FUNCTION public.fn_pago_turno_validar()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_alumno_pago  integer;
  v_t            turno%ROWTYPE;
BEGIN
  SELECT alumno_id INTO v_alumno_pago FROM pago WHERE id = NEW.pago_id;
  SELECT * INTO v_t FROM turno WHERE id = NEW.turno_id FOR UPDATE;

  IF v_t.alumno_id <> v_alumno_pago THEN
    RAISE EXCEPTION 'El turno % no pertenece al alumno del pago.', v_t.codigo;
  END IF;

  IF v_t.estado = 'Cancelado' THEN
    RAISE EXCEPTION 'El turno % está cancelado y no puede abonarse.', v_t.codigo;
  END IF;

  IF NOT fn_turno_cobrable(v_t.estado) THEN
    RAISE EXCEPTION 'El turno % (estado "%") no puede cobrarse.', v_t.codigo, v_t.estado;
  END IF;

  IF v_t.pagado THEN
    RAISE EXCEPTION 'El turno % ya fue pagado.', v_t.codigo;
  END IF;

  NEW.importe := v_t.valor_clase_congelado;
  RETURN NEW;
END;
$function$;


-- ---------------------------------------------------------
-- 5. Los pagos no se modifican ni se borran: solo se anulan
-- ---------------------------------------------------------
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

  IF NEW.estado <> 'Anulado'
     OR NEW.alumno_id     IS DISTINCT FROM OLD.alumno_id
     OR NEW.monto         IS DISTINCT FROM OLD.monto
     OR NEW.comprobante   IS DISTINCT FROM OLD.comprobante
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

CREATE TRIGGER trg_pago_validar_anulacion
  BEFORE UPDATE ON public.pago
  FOR EACH ROW EXECUTE FUNCTION fn_pago_validar_anulacion();

-- Al anular: sus clases dejan de estar pagadas → la deuda vuelve a como estaba.
CREATE OR REPLACE FUNCTION public.fn_pago_anular_liberar_turnos()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE pago_turno
     SET vigente = false
   WHERE pago_id = NEW.id AND vigente;

  UPDATE turno
     SET pagado = false
   WHERE id IN (SELECT turno_id FROM pago_turno WHERE pago_id = NEW.id)
     AND pagado;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_pago_anular_liberar_turnos
  AFTER UPDATE ON public.pago
  FOR EACH ROW
  WHEN (OLD.estado = 'Vigente' AND NEW.estado = 'Anulado')
  EXECUTE FUNCTION fn_pago_anular_liberar_turnos();

-- pago_turno: lo único que puede cambiar es vigente true → false, y solo
-- cuando el pago ya está anulado.
CREATE OR REPLACE FUNCTION public.fn_pago_turno_proteger()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF OLD.vigente
     AND NOT NEW.vigente
     AND NEW.pago_id  = OLD.pago_id
     AND NEW.turno_id = OLD.turno_id
     AND NEW.importe  = OLD.importe
     AND EXISTS (SELECT 1 FROM pago WHERE id = OLD.pago_id AND estado = 'Anulado') THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Las clases de un pago registrado no pueden modificarse; el pago solo puede anularse.';
END;
$function$;

CREATE TRIGGER trg_pago_turno_proteger
  BEFORE UPDATE ON public.pago_turno
  FOR EACH ROW EXECUTE FUNCTION fn_pago_turno_proteger();

-- Sin borrado físico en ninguna de las tres tablas de pago.
CREATE TRIGGER trg_pago_bloquear_borrado
  BEFORE DELETE ON public.pago
  FOR EACH ROW EXECUTE FUNCTION fn_bloquear_modificacion_auditoria();

CREATE TRIGGER trg_pago_turno_bloquear_borrado
  BEFORE DELETE ON public.pago_turno
  FOR EACH ROW EXECUTE FUNCTION fn_bloquear_modificacion_auditoria();

CREATE TRIGGER trg_pago_forma_pago_bloquear_cambios
  BEFORE UPDATE OR DELETE ON public.pago_forma_pago
  FOR EACH ROW EXECUTE FUNCTION fn_bloquear_modificacion_auditoria();

COMMIT;
