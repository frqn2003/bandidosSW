"use client";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { useSesion } from "@/funciones/sesion";

/**
 * Aviso previo al cierre por inactividad (HU-SIS-01).
 *
 * Por qué existe: la sesión expira a los 30 minutos sin actividad. Si venciera
 * de una, el usuario que estaba a mitad de un alta de alumno perdería todo lo
 * cargado sin haber tenido forma de evitarlo. El aviso aparece un minuto antes
 * y se resuelve con un click.
 *
 * Deliberadamente **no** se cancela con el mouse: moverse no alcanza, hay que
 * apretar "Seguir conectado". Si bastara con un roce del mouse, el aviso se
 * cerraría solo sin que nadie lo lea y volvería a aparecer sin explicación.
 */
export function AvisoInactividad() {
  const { segundosParaExpirar, renovar, cerrar } = useSesion();
  const visible = segundosParaExpirar !== null;

  return (
    <Modal
      open={visible}
      onClose={renovar}
      title="Tu sesión está por expirar"
      icon={<Icon name="schedule" size={20} className="text-status-warning-strong" />}
      maxWidth="max-w-md"
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => void cerrar()}>
            Cerrar sesión
          </Button>
          <Button type="button" onClick={renovar}>
            Seguir conectado
          </Button>
        </>
      }
    >
      <p className="text-sm text-on-surface-variant">
        Por seguridad, la sesión se cierra tras un rato sin actividad. Se cerrará en{" "}
        <strong className="tabular-nums text-on-surface" aria-live="polite">
          {segundosParaExpirar ?? 0} segundos
        </strong>
        .
      </p>
    </Modal>
  );
}
