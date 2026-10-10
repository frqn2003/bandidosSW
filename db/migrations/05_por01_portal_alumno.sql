-- =========================================================
-- HU-POR-01 — Portal del alumno: reserva y consulta de turnos
-- =========================================================
-- Requiere 01a y 01b (helpers fn_usuario_id_actual / fn_rol_usuario).
-- No depende de 02, 03 ni 04.
-- Una sola transacción.
--
-- Qué resuelve la base:
--   * Rol "Alumno" y vínculo 1 a 1 con la ficha (alumno.usuario_id).
--   * Un alumno inactivo no puede iniciar sesión: al dar de baja la ficha, su
--     usuario del portal se desactiva solo.
--   * El alumno solo puede reservar para sí mismo; el origen de la reserva
--     (turno.origen) queda en la bitácora.
--   * Tope de turnos futuros Reservados (parámetro editable por el Gerente).
--   * Vista "Mis turnos".
--
-- Lo que sigue a cargo del backend (la base no puede hacerlo):
--   * Crear la cuenta en Supabase Auth, generar y enviar la contraseña temporal.
--   * Menú limitado y "Acceso denegado" por URL, con su registro en
--     auditoria_sesion (evento 'acceso_denegado'). Cada inicio de sesión también
--     va a auditoria_sesion (evento 'login').
--   * Resto de validaciones de HU-TUR-01 (cupos, anticipación mínima, etc.).
--
-- Importante: el backend debe fijar app.usuario_id = id del usuario Alumno en la
-- transacción de la reserva, igual que con el resto de los roles.
-- =========================================================

BEGIN;

-- ---------------------------------------------------------
-- 1. Rol "Alumno" y motivo de baja del sistema
-- ---------------------------------------------------------
SELECT setval('rol_id_seq',
              COALESCE((SELECT MAX(id) FROM rol), 1),
              (SELECT COUNT(*) > 0 FROM rol));

INSERT INTO rol (id, nombre)
SELECT nextval('rol_id_seq'), 'Alumno'
WHERE NOT EXISTS (SELECT 1 FROM rol WHERE lower(nombre) = 'alumno');

-- Cuando se da de baja la ficha, el usuario del portal queda inactivo con este
-- motivo (usuario exige motivo de baja al pasar a inactivo).
SELECT setval('motivo_baja_id_seq',
              COALESCE((SELECT MAX(id) FROM motivo_baja), 1),
              (SELECT COUNT(*) > 0 FROM motivo_baja));

INSERT INTO motivo_baja (id, nombre, requiere_detalle)
SELECT nextval('motivo_baja_id_seq'), 'Baja del alumno', false
WHERE NOT EXISTS (SELECT 1 FROM motivo_baja WHERE lower(btrim(nombre)) = 'baja del alumno');


-- ---------------------------------------------------------
-- 2. Vínculo ficha ↔ cuenta del portal (una sola cuenta por ficha)
-- ---------------------------------------------------------
ALTER TABLE alumno ADD COLUMN usuario_id integer;

ALTER TABLE alumno ADD CONSTRAINT alumno_usuario_id_fkey
  FOREIGN KEY (usuario_id) REFERENCES usuario(id);

-- Una cuenta pertenece a una sola ficha y una ficha tiene una sola cuenta.
CREATE UNIQUE INDEX uq_alumno_usuario ON alumno (usuario_id) WHERE usuario_id IS NOT NULL;

-- Ficha de un usuario del portal; NULL si no tiene ficha o la ficha está inactiva.
CREATE OR REPLACE FUNCTION public.fn_alumno_de_usuario(p_usuario_id integer)
 RETURNS integer
 LANGUAGE sql
 STABLE
AS $function$
  SELECT a.id
  FROM alumno a
  WHERE a.usuario_id = p_usuario_id
    AND a.estado = 'activo';
$function$;

-- "Habilitar acceso al portal": reglas del vínculo.
CREATE OR REPLACE FUNCTION public.fn_alumno_validar_acceso_portal()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_actor       integer := fn_usuario_id_actual();
  v_rol_actor   text;
  v_rol_cuenta  text;
  v_email       text;
  v_old_estado  estado_activo_inactivo;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'No se identificó al usuario que habilita el acceso (app.usuario_id).';
  END IF;

  v_rol_actor := fn_rol_usuario(v_actor);
  IF v_rol_actor IS NULL OR v_rol_actor NOT IN ('gerente', 'mesa de entrada') THEN
    RAISE EXCEPTION 'Solo Mesa de Entrada o el Gerente pueden habilitar el acceso al portal.';
  END IF;

  -- Cambiar o quitar una cuenta ya vinculada: solo si la anterior está inactiva.
  IF OLD.usuario_id IS NOT NULL THEN
    SELECT estado INTO v_old_estado FROM usuario WHERE id = OLD.usuario_id;
    IF v_old_estado = 'activo' THEN
      RAISE EXCEPTION 'La ficha ya tiene una cuenta activa en el portal (una sola cuenta por ficha).';
    END IF;
  END IF;

  IF NEW.usuario_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.estado <> 'activo' THEN
    RAISE EXCEPTION 'La ficha del alumno está inactiva: no se puede habilitar el acceso al portal.';
  END IF;

  IF NEW.email IS NULL OR btrim(NEW.email) = '' THEN
    RAISE EXCEPTION 'El alumno no tiene Email cargado: es obligatorio para habilitar el acceso al portal.';
  END IF;

  SELECT lower(r.nombre), lower(u.email)
    INTO v_rol_cuenta, v_email
  FROM usuario u
  JOIN rol r ON r.id = u.rol_id
  WHERE u.id = NEW.usuario_id AND u.estado = 'activo';

  IF v_rol_cuenta IS NULL THEN
    RAISE EXCEPTION 'La cuenta indicada (id=%) no existe o está inactiva.', NEW.usuario_id;
  END IF;

  IF v_rol_cuenta <> 'alumno' THEN
    RAISE EXCEPTION 'La cuenta (id=%) tiene rol "%": solo una cuenta con rol Alumno puede vincularse a una ficha.',
      NEW.usuario_id, v_rol_cuenta;
  END IF;

  IF v_email <> lower(NEW.email) THEN
    RAISE EXCEPTION 'El email de la cuenta no coincide con el Email de la ficha del alumno.';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_alumno_validar_acceso_portal
  BEFORE UPDATE OF usuario_id ON public.alumno
  FOR EACH ROW
  WHEN (OLD.usuario_id IS DISTINCT FROM NEW.usuario_id)
  EXECUTE FUNCTION fn_alumno_validar_acceso_portal();

-- Un alumno inactivo no puede iniciar sesión: se desactiva su cuenta.
-- (Si la ficha se reactiva, la cuenta NO se reactiva sola: se hace desde la
-- gestión de usuarios.)
CREATE OR REPLACE FUNCTION public.fn_alumno_baja_cuenta_portal()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE usuario
     SET estado             = 'inactivo',
         motivo_baja_id     = (SELECT id FROM motivo_baja
                               WHERE lower(btrim(nombre)) = 'baja del alumno' LIMIT 1),
         detalle_motivo_baja = NULL,
         fecha_baja         = now()
   WHERE id = NEW.usuario_id
     AND estado = 'activo';

  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_alumno_baja_cuenta_portal
  AFTER UPDATE OF estado ON public.alumno
  FOR EACH ROW
  WHEN (OLD.estado = 'activo' AND NEW.estado = 'inactivo' AND NEW.usuario_id IS NOT NULL)
  EXECUTE FUNCTION fn_alumno_baja_cuenta_portal();


-- ---------------------------------------------------------
-- 3. Origen de la reserva
-- ---------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'origen_turno') THEN
    CREATE TYPE origen_turno AS ENUM ('Centro', 'Portal del Alumno');
  END IF;
END
$$;

-- 'Centro' = reservado por personal (Mesa de Entrada, Gerente). Los turnos
-- existentes quedan como 'Centro'.
ALTER TABLE turno ADD COLUMN origen origen_turno NOT NULL DEFAULT 'Centro';


-- ---------------------------------------------------------
-- 4. Límite de turnos futuros (parametrizable por el Gerente)
-- ---------------------------------------------------------
SELECT setval('parametro_id_seq',
              COALESCE((SELECT MAX(id) FROM parametro), 1),
              (SELECT COUNT(*) > 0 FROM parametro));

INSERT INTO parametro (id, clave, valor, unidad, descripcion)
SELECT nextval('parametro_id_seq'), 'max_turnos_futuros_alumno', 5, 'turnos',
       'Máximo de turnos futuros en estado Reservado que un alumno puede tener reservados desde el portal'
WHERE NOT EXISTS (SELECT 1 FROM parametro WHERE clave = 'max_turnos_futuros_alumno');


-- ---------------------------------------------------------
-- 5. Reglas de la reserva hecha por el alumno
-- ---------------------------------------------------------
-- * El alumno solo reserva para su propia ficha (activa).
-- * El origen se fija solo: 'Portal del Alumno' si reserva un usuario con rol
--   Alumno; 'Centro' si reserva personal. El backend no puede falsearlo.
-- * El tope de turnos futuros Reservados se controla solo para reservas del
--   portal: Mesa de Entrada y Gerente pueden reservar por encima del tope.
--   Se serializa por alumno para que dos reservas simultáneas no lo excedan.
CREATE OR REPLACE FUNCTION public.fn_turno_validar_portal()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_actor    integer := fn_usuario_id_actual();
  v_rol      text;
  v_alumno   integer;
  v_futuros  integer;
  v_max      integer;
  v_ahora    timestamp := (now() AT TIME ZONE 'America/Argentina/Buenos_Aires');
BEGIN
  IF v_actor IS NULL THEN
    RETURN NEW;                       -- operación sin sesión (carga directa)
  END IF;

  v_rol := fn_rol_usuario(v_actor);

  IF v_rol IS DISTINCT FROM 'alumno' THEN
    NEW.origen := 'Centro';
    RETURN NEW;
  END IF;

  v_alumno := fn_alumno_de_usuario(v_actor);

  IF v_alumno IS NULL THEN
    RAISE EXCEPTION 'La cuenta no está asociada a una ficha de alumno activa.';
  END IF;

  IF NEW.alumno_id <> v_alumno THEN
    RAISE EXCEPTION 'Desde el portal el alumno solo puede reservar turnos para sí mismo.';
  END IF;

  NEW.origen     := 'Portal del Alumno';
  NEW.usuario_id := v_actor;

  PERFORM pg_advisory_xact_lock(7002, NEW.alumno_id);

  v_max := fn_parametro('max_turnos_futuros_alumno');

  SELECT count(*) INTO v_futuros
  FROM turno t
  WHERE t.alumno_id = NEW.alumno_id
    AND t.estado = 'Reservado'
    AND (t.fecha + t.hora_inicio) > v_ahora;

  IF v_futuros >= v_max THEN
    RAISE EXCEPTION 'Alcanzó el límite de % turnos futuros reservados. Cancelá o esperá a que se dicte uno para reservar otro.', v_max;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_turno_validar_portal
  BEFORE INSERT ON public.turno
  FOR EACH ROW EXECUTE FUNCTION fn_turno_validar_portal();

-- Defensa: desde el portal el alumno solo reserva y consulta. Modificar, cancelar
-- o borrar turnos no está habilitado en este incremento (la cancelación propia
-- es un criterio opcional; si se implementa, se relaja esta regla).
CREATE OR REPLACE FUNCTION public.fn_turno_bloquear_cambios_alumno()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF fn_rol_usuario(fn_usuario_id_actual()) = 'alumno' THEN
    RAISE EXCEPTION 'Desde el portal el alumno solo puede reservar y consultar turnos.';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_turno_bloquear_cambios_alumno
  BEFORE UPDATE OR DELETE ON public.turno
  FOR EACH ROW EXECUTE FUNCTION fn_turno_bloquear_cambios_alumno();


-- ---------------------------------------------------------
-- 6. "Mis turnos"
-- ---------------------------------------------------------
-- El backend obtiene la ficha con fn_alumno_de_usuario(<usuario de la sesión>)
-- y consulta:
--   WHERE alumno_id = <ficha>
--     [AND es_proximo]          -- por defecto: próximos
--   ORDER BY fecha, hora_inicio -- ascendente
-- El filtro "Ver historial" quita es_proximo.
-- Sin datos de pagos ni de otros alumnos. estado trae los mismos valores que el
-- calendario (Reservado, Cancelado, Asistió, Ausente) para los colores.
CREATE OR REPLACE VIEW vw_mis_turnos AS
SELECT t.alumno_id,
       t.id          AS turno_id,
       t.codigo,
       t.fecha,
       t.hora_inicio,
       t.hora_fin,
       t.materia_id,
       m.nombre      AS materia,
       t.profesor_id,
       (u.apellido || ', ' || u.nombre) AS profesor,
       t.estado,
       t.origen,
       ((t.fecha + t.hora_fin) >= (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')) AS es_proximo
FROM turno t
JOIN materia  m ON m.id = t.materia_id
JOIN profesor p ON p.id = t.profesor_id
JOIN usuario  u ON u.id = p.usuario_id;

COMMIT;
