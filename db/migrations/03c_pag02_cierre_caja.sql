-- =========================================================
-- HU-PAG-02 (3/4) — Cierre de caja diario
-- =========================================================
-- Requiere 03a y 03b. Una sola transacción.
--
-- Modelo:
--   * Cada CIERRE es una fila de cierre_caja. Una fecha puede tener varias
--     filas a lo largo del tiempo (cierre → reapertura → nuevo cierre), pero a
--     lo sumo UNA en estado 'Cerrada'.
--   * La fecha está cerrada si tiene una fila 'Cerrada'. Mientras tanto no se
--     registran ni anulan pagos con esa fecha_pago.
--   * El cierre es MANUAL: el usuario informa el efectivo contado; la base
--     calcula total, efectivo registrado y diferencia.
--
-- Pago dividido en varios medios (HU-PAG-01 permite elegir varios):
--   pago_forma_pago.monto indica cuánto va por cada medio. Con UN solo medio
--   puede quedar NULL (vale el monto del pago). Con más de uno es obligatorio
--   y la suma debe dar el monto del pago.
-- =========================================================

BEGIN;

-- ---------------------------------------------------------
-- 1. Monto por medio de pago
-- ---------------------------------------------------------
ALTER TABLE pago_forma_pago
  ADD COLUMN monto numeric(12,2),
  ADD CONSTRAINT ck_pago_forma_pago_monto CHECK (monto IS NULL OR monto > 0);

-- Efectivo identificado por un flag del catálogo, no por el nombre.
ALTER TABLE forma_pago ADD COLUMN es_efectivo boolean NOT NULL DEFAULT false;
UPDATE forma_pago SET es_efectivo = true WHERE lower(btrim(nombre)) = 'efectivo';

-- Consistencia del pago al confirmar la transacción (ya era diferida).
CREATE OR REPLACE FUNCTION public.fn_pago_validar_consistencia()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_suma_turnos  numeric(12,2);
  v_formas       integer;
  v_suma_formas  numeric(12,2);
  v_sin_monto    integer;
  v_monto_unico  numeric(12,2);
BEGIN
  SELECT COALESCE(SUM(importe), 0) INTO v_suma_turnos FROM pago_turno WHERE pago_id = NEW.id;

  SELECT COUNT(*),
         COALESCE(SUM(monto), 0),
         COUNT(*) FILTER (WHERE monto IS NULL),
         MAX(monto)
    INTO v_formas, v_suma_formas, v_sin_monto, v_monto_unico
  FROM pago_forma_pago WHERE pago_id = NEW.id;

  IF v_suma_turnos <> NEW.monto THEN
    RAISE EXCEPTION 'El monto del pago (%) no coincide con la suma de las clases seleccionadas (%).', NEW.monto, v_suma_turnos;
  END IF;

  IF v_formas = 0 THEN
    RAISE EXCEPTION 'El pago debe tener al menos una forma de pago.';
  END IF;

  IF v_formas = 1 THEN
    IF v_monto_unico IS NOT NULL AND v_monto_unico <> NEW.monto THEN
      RAISE EXCEPTION 'El monto de la forma de pago (%) no coincide con el monto del pago (%).', v_monto_unico, NEW.monto;
    END IF;
  ELSE
    IF v_sin_monto > 0 THEN
      RAISE EXCEPTION 'Cuando el pago se divide en varios medios, cada uno debe indicar su monto.';
    END IF;

    IF v_suma_formas <> NEW.monto THEN
      RAISE EXCEPTION 'La suma de los montos por medio de pago (%) no coincide con el monto del pago (%).', v_suma_formas, NEW.monto;
    END IF;
  END IF;

  RETURN NULL;
END;
$function$;

-- Una fila por (pago, medio) con el monto efectivo de ese medio.
CREATE OR REPLACE VIEW vw_pago_medio AS
SELECT pfp.id                         AS pago_forma_pago_id,
       p.id                           AS pago_id,
       p.comprobante,
       p.alumno_id,
       p.fecha_pago,
       p.estado,
       p.usuario_id,
       fp.id                          AS forma_pago_id,
       fp.nombre                      AS medio,
       fp.es_efectivo,
       pfp.nro_operacion,
       COALESCE(pfp.monto, p.monto)   AS monto_medio
FROM pago p
JOIN pago_forma_pago pfp ON pfp.pago_id = p.id
JOIN forma_pago      fp  ON fp.id = pfp.forma_pago_id;


-- ---------------------------------------------------------
-- 2. Tabla cierre_caja
-- ---------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_cierre_caja') THEN
    CREATE TYPE estado_cierre_caja AS ENUM ('Cerrada', 'Reabierta');
  END IF;
END
$$;

CREATE SEQUENCE IF NOT EXISTS cierre_caja_id_seq;

CREATE TABLE cierre_caja (
  id integer NOT NULL DEFAULT nextval('cierre_caja_id_seq'),
  fecha date NOT NULL,
  estado estado_cierre_caja NOT NULL DEFAULT 'Cerrada',
  total_registrado numeric(12,2) NOT NULL,         -- pagos vigentes de la fecha
  efectivo_registrado numeric(12,2) NOT NULL,      -- parte en efectivo
  efectivo_contado numeric(12,2) NOT NULL,         -- lo informa el usuario
  diferencia numeric(12,2) NOT NULL,               -- contado - efectivo_registrado
  observaciones character varying(250),
  cerrado_por integer NOT NULL,
  cerrado_at timestamptz NOT NULL DEFAULT now(),
  reabierto_por integer,
  reabierto_at timestamptz,
  motivo_reapertura character varying(250),
  CONSTRAINT cierre_caja_pkey PRIMARY KEY (id),
  CONSTRAINT ck_cierre_contado CHECK (efectivo_contado >= 0),
  CONSTRAINT ck_cierre_observaciones CHECK (diferencia = 0 OR btrim(coalesce(observaciones, '')) <> ''),
  CONSTRAINT ck_cierre_reapertura CHECK (
       (estado = 'Cerrada'   AND reabierto_por IS NULL AND reabierto_at IS NULL AND motivo_reapertura IS NULL)
    OR (estado = 'Reabierta' AND reabierto_por IS NOT NULL AND reabierto_at IS NOT NULL
                             AND btrim(coalesce(motivo_reapertura, '')) <> '')
  ),
  CONSTRAINT cierre_caja_cerrado_por_fkey   FOREIGN KEY (cerrado_por)   REFERENCES usuario(id),
  CONSTRAINT cierre_caja_reabierto_por_fkey FOREIGN KEY (reabierto_por) REFERENCES usuario(id)
);

ALTER SEQUENCE cierre_caja_id_seq OWNED BY cierre_caja.id;

-- A lo sumo un cierre vigente por fecha.
CREATE UNIQUE INDEX uq_cierre_caja_fecha_cerrada ON cierre_caja (fecha) WHERE estado = 'Cerrada';
CREATE INDEX idx_cierre_caja_fecha ON cierre_caja (fecha DESC);


-- ---------------------------------------------------------
-- 3. ¿Está cerrada la caja de una fecha?
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_caja_cerrada(p_fecha date)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  SELECT EXISTS (SELECT 1 FROM cierre_caja WHERE fecha = p_fecha AND estado = 'Cerrada');
$function$;

-- Serializa "cerrar caja" con "registrar/anular pagos" de la misma fecha, para
-- que el cierre no pierda un pago que está a punto de confirmarse. El lock se
-- libera al terminar la transacción.
CREATE OR REPLACE FUNCTION public.fn_caja_lock(p_fecha date)
 RETURNS void
 LANGUAGE sql
AS $function$
  SELECT pg_advisory_xact_lock(7001, (p_fecha - DATE '2000-01-01'));
$function$;


-- ---------------------------------------------------------
-- 4. Reglas del cierre (alta = cerrar, update = reabrir)
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_cierre_caja_validar()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_actor integer := fn_usuario_id_actual();
  v_rol   text;
  v_hoy   date    := (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'No se identificó al usuario que opera la caja (app.usuario_id).';
  END IF;

  v_rol := fn_rol_usuario(v_actor);

  -- ---------------- CIERRE ----------------
  IF TG_OP = 'INSERT' THEN
    IF v_rol IS NULL OR v_rol NOT IN ('gerente', 'mesa de entrada') THEN
      RAISE EXCEPTION 'Solo el Gerente o Mesa de Entrada pueden cerrar la caja.';
    END IF;

    IF NEW.fecha > v_hoy THEN
      RAISE EXCEPTION 'No se puede cerrar la caja de una fecha futura (%).', NEW.fecha;
    END IF;

    PERFORM fn_caja_lock(NEW.fecha);

    IF fn_caja_cerrada(NEW.fecha) THEN
      RAISE EXCEPTION 'La caja del % ya está cerrada.', NEW.fecha;
    END IF;

    SELECT COALESCE(SUM(p.monto), 0)
      INTO NEW.total_registrado
    FROM pago p
    WHERE p.fecha_pago = NEW.fecha AND p.estado = 'Vigente';

    SELECT COALESCE(SUM(vm.monto_medio), 0)
      INTO NEW.efectivo_registrado
    FROM vw_pago_medio vm
    WHERE vm.fecha_pago = NEW.fecha AND vm.estado = 'Vigente' AND vm.es_efectivo;

    NEW.diferencia        := NEW.efectivo_contado - NEW.efectivo_registrado;
    NEW.estado            := 'Cerrada';
    NEW.cerrado_por       := v_actor;
    NEW.cerrado_at        := now();
    NEW.reabierto_por     := NULL;
    NEW.reabierto_at      := NULL;
    NEW.motivo_reapertura := NULL;
    RETURN NEW;
  END IF;

  -- ---------------- REAPERTURA (único UPDATE permitido) ----------------
  IF v_rol IS DISTINCT FROM 'gerente' THEN
    RAISE EXCEPTION 'Solo el Gerente puede reabrir una caja cerrada.';
  END IF;

  IF OLD.estado <> 'Cerrada' THEN
    RAISE EXCEPTION 'La caja del % ya fue reabierta.', OLD.fecha;
  END IF;

  IF NEW.estado <> 'Reabierta'
     OR NEW.fecha               IS DISTINCT FROM OLD.fecha
     OR NEW.total_registrado    IS DISTINCT FROM OLD.total_registrado
     OR NEW.efectivo_registrado IS DISTINCT FROM OLD.efectivo_registrado
     OR NEW.efectivo_contado    IS DISTINCT FROM OLD.efectivo_contado
     OR NEW.diferencia          IS DISTINCT FROM OLD.diferencia
     OR NEW.observaciones       IS DISTINCT FROM OLD.observaciones
     OR NEW.cerrado_por         IS DISTINCT FROM OLD.cerrado_por
     OR NEW.cerrado_at          IS DISTINCT FROM OLD.cerrado_at THEN
    RAISE EXCEPTION 'Un cierre de caja no se modifica: solo puede reabrirse.';
  END IF;

  IF btrim(coalesce(NEW.motivo_reapertura, '')) = '' THEN
    RAISE EXCEPTION 'El motivo de la reapertura es obligatorio.';
  END IF;

  PERFORM fn_caja_lock(OLD.fecha);

  NEW.reabierto_por := v_actor;
  NEW.reabierto_at  := now();
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_cierre_caja_validar
  BEFORE INSERT OR UPDATE ON public.cierre_caja
  FOR EACH ROW EXECUTE FUNCTION fn_cierre_caja_validar();

CREATE TRIGGER trg_cierre_caja_bloquear_borrado
  BEFORE DELETE ON public.cierre_caja
  FOR EACH ROW EXECUTE FUNCTION fn_bloquear_modificacion_auditoria();

-- Bitácora: cierre y reapertura con usuario, fecha/hora, totales, diferencia y motivo.
CREATE TRIGGER trg_auditoria_cierre_caja
  AFTER INSERT OR UPDATE ON public.cierre_caja
  FOR EACH ROW EXECUTE FUNCTION fn_auditoria();


-- ---------------------------------------------------------
-- 5. Caja cerrada = no se registran ni anulan pagos de esa fecha
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_pago_validar_caja()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  PERFORM fn_caja_lock(NEW.fecha_pago);

  IF fn_caja_cerrada(NEW.fecha_pago) THEN
    RAISE EXCEPTION 'La caja del % está cerrada: no se pueden registrar ni anular pagos de esa fecha.', NEW.fecha_pago;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_pago_validar_caja_ins
  BEFORE INSERT ON public.pago
  FOR EACH ROW EXECUTE FUNCTION fn_pago_validar_caja();

CREATE TRIGGER trg_pago_validar_caja_anulacion
  BEFORE UPDATE ON public.pago
  FOR EACH ROW
  WHEN (OLD.estado = 'Vigente' AND NEW.estado = 'Anulado')
  EXECUTE FUNCTION fn_pago_validar_caja();


-- ---------------------------------------------------------
-- 6. Consultas de la pantalla de caja
-- ---------------------------------------------------------
-- Detalle de pagos de una fecha. Vigentes y Anulados (estado los distingue: el
-- front lista los anulados aparte, en rojo). Un pago dividido en varios medios
-- aparece una vez por medio, con el monto de ese medio.
CREATE OR REPLACE FUNCTION public.fn_caja_detalle(p_fecha date)
 RETURNS TABLE (
   pago_id          integer,
   comprobante      character varying,
   alumno_id        integer,
   alumno           text,
   forma_pago_id    integer,
   medio            character varying,
   monto            numeric,
   usuario_id       integer,
   usuario          text,
   estado           estado_pago,
   motivo_anulacion character varying
 )
 LANGUAGE sql
 STABLE
AS $function$
  SELECT vm.pago_id, vm.comprobante, vm.alumno_id,
         (al.apellido || ', ' || al.nombre),
         vm.forma_pago_id, vm.medio, vm.monto_medio,
         vm.usuario_id, (us.apellido || ', ' || us.nombre),
         vm.estado, pg.motivo_anulacion
  FROM vw_pago_medio vm
  JOIN pago    pg ON pg.id = vm.pago_id
  JOIN alumno  al ON al.id = vm.alumno_id
  JOIN usuario us ON us.id = vm.usuario_id
  WHERE vm.fecha_pago = p_fecha
  ORDER BY vm.medio, vm.comprobante;
$function$;

-- Resumen por medio de pago (solo pagos VIGENTES; los anulados no suman).
-- Incluye los medios activos aunque no tengan movimientos (subtotal 0).
-- Total general = suma de subtotal.
CREATE OR REPLACE FUNCTION public.fn_caja_resumen(p_fecha date)
 RETURNS TABLE (
   forma_pago_id         integer,
   medio                 character varying,
   cantidad_comprobantes bigint,
   subtotal              numeric
 )
 LANGUAGE sql
 STABLE
AS $function$
  SELECT fp.id, fp.nombre,
         count(DISTINCT vm.pago_id),
         COALESCE(sum(vm.monto_medio), 0)
  FROM forma_pago fp
  LEFT JOIN vw_pago_medio vm
         ON vm.forma_pago_id = fp.id
        AND vm.fecha_pago = p_fecha
        AND vm.estado = 'Vigente'
  GROUP BY fp.id, fp.nombre, fp.estado
  HAVING fp.estado = 'activo' OR count(vm.pago_id) > 0
  ORDER BY fp.nombre;
$function$;

-- Historial de cierres (el backend ordena por fecha DESC, id DESC).
CREATE OR REPLACE VIEW vw_cierre_caja AS
SELECT c.id,
       c.fecha,
       c.estado,
       c.total_registrado,
       c.efectivo_registrado,
       c.efectivo_contado,
       c.diferencia,
       c.observaciones,
       c.cerrado_por,
       (uc.apellido || ', ' || uc.nombre) AS cerrado_por_nombre,
       c.cerrado_at,
       c.reabierto_por,
       (ur.apellido || ', ' || ur.nombre) AS reabierto_por_nombre,
       c.reabierto_at,
       c.motivo_reapertura
FROM cierre_caja c
JOIN usuario uc ON uc.id = c.cerrado_por
LEFT JOIN usuario ur ON ur.id = c.reabierto_por;

-- Cajas pendientes de cierre: fechas pasadas con pagos vigentes y sin cierre
-- vigente. Solo mira los últimos N días para no arrastrar el histórico previo a
-- esta función. Es un aviso: no bloquea nada.
SELECT setval('parametro_id_seq',
              COALESCE((SELECT MAX(id) FROM parametro), 1),
              (SELECT COUNT(*) > 0 FROM parametro));

INSERT INTO parametro (id, clave, valor, unidad, descripcion)
SELECT nextval('parametro_id_seq'), 'dias_control_cajas_pendientes', 30, 'días',
       'Cuántos días hacia atrás se controlan las cajas sin cerrar'
WHERE NOT EXISTS (SELECT 1 FROM parametro WHERE clave = 'dias_control_cajas_pendientes');

CREATE OR REPLACE VIEW vw_cajas_pendientes AS
SELECT p.fecha_pago      AS fecha,
       count(*)          AS pagos_vigentes,
       sum(p.monto)      AS total
FROM pago p
WHERE p.estado = 'Vigente'
  AND p.fecha_pago <  (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
  AND p.fecha_pago >= (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
                      - fn_parametro('dias_control_cajas_pendientes')
  AND NOT EXISTS (SELECT 1 FROM cierre_caja c WHERE c.fecha = p.fecha_pago AND c.estado = 'Cerrada')
GROUP BY p.fecha_pago;

COMMIT;
