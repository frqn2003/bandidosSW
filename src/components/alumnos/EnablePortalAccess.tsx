// src/components/alumnos/EnablePortalAccess.tsx
//
// Componente "Habilitar acceso al portal" (HU-POR-01).
// Ubicado en la Ficha del Alumno (Panel de Administración).
// Visible para Mesa de Entrada y Gerente.
//
// Validaciones del diagrama de flujo:
// 1. Verifica si el alumno tiene Email cargado. Si no: muestra "Notificación: requiere Email cargado".
// 2. Verifica si ya tiene cuenta asociada. Si ya tiene: avisa que ya posee acceso activo.
// 3. Muestra ventana de confirmación.
// 4. Crea el usuario con rol "Alumno" y envía la contraseña temporal.
// 5. Notificación de acción exitosa.

"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useSesion } from "@/funciones/sesion";
import { habilitarAccesoPortal } from "@/data/portal";
import type { StudentUI } from "@/modules/alumnos/types";

interface EnablePortalAccessProps {
  student: StudentUI;
  onSuccess?: () => void;
}

export function EnablePortalAccess({ student, onSuccess }: EnablePortalAccessProps) {
  const { sesion } = useSesion();
  const { showToast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalEmailRequeridoOpen, setModalEmailRequeridoOpen] = useState(false);
  const [habilitando, setHabilitando] = useState(false);
  const [accesoHabilitadoLocal, setAccesoHabilitadoLocal] = useState(Boolean(student.accesoPortal));

  const rol = sesion?.usuario.rol.nombre;
  const tienePermiso = rol === "Gerente" || rol === "Mesa de Entrada";

  // Solo visible para Mesa de Entrada y Gerente
  if (!tienePermiso) return null;

  // Si el alumno está inactivo, no se puede habilitar el portal
  const esInactivo = student.estado === "inactivo";

  const handleClickHabilitar = () => {
    // 1. Validación de Email
    const emailLimpio = student.email?.trim();
    if (!emailLimpio) {
      showToast("error", "Notificación: requiere Email cargado para habilitar el portal.");
      setModalEmailRequeridoOpen(true);
      return;
    }

    // 2. Validación de cuenta ya existente
    if (accesoHabilitadoLocal || student.accesoPortal) {
      showToast("error", "El alumno ya posee una cuenta activa vinculada al portal.");
      return;
    }

    // 3. Abrir ventana de confirmación
    setModalOpen(true);
  };

  const handleConfirmar = async () => {
    setHabilitando(true);
    try {
      await habilitarAccesoPortal(student.id);
      setAccesoHabilitadoLocal(true);
      setModalOpen(false);
      showToast(
        "success",
        `Acceso habilitado con éxito. Se envió la contraseña temporal a ${student.email}.`
      );
      onSuccess?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al habilitar acceso al portal.";
      showToast("error", msg);
    } finally {
      setHabilitando(false);
    }
  };

  if (accesoHabilitadoLocal) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-sm bg-status-success-strong/10 border border-status-success-strong/20 px-3 py-1.5 text-xs font-bold text-status-success-strong">
        <Icon name="check_circle" size={16} />
        Portal habilitado
      </span>
    );
  }

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        type="button"
        disabled={esInactivo || habilitando}
        onClick={handleClickHabilitar}
        className="gap-1.5 bg-secondary text-on-secondary hover:bg-secondary/90"
        title={
          esInactivo
            ? "Un alumno inactivo no puede acceder al portal"
            : "Habilitar cuenta de acceso para el portal del alumno"
        }
      >
        <Icon name="key" size={16} />
        Habilitar acceso al portal
      </Button>

      {/* Modal de Advertencia: Requiere Email */}
      <Modal
        open={modalEmailRequeridoOpen}
        onClose={() => setModalEmailRequeridoOpen(false)}
        title="Email obligatorio para el portal"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs text-on-surface">
          <div className="flex items-start gap-3 rounded-md bg-status-warning-strong/10 p-3.5 border border-status-warning-strong/30">
            <Icon name="warning" size={20} className="text-status-warning-strong shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-on-surface">Notificación: requiere Email cargado</p>
              <p className="mt-1 text-on-surface-variant">
                Para habilitar el portal, es obligatorio que la ficha del alumno tenga una dirección
                de correo electrónico registrada para el envío de la contraseña temporal.
              </p>
            </div>
          </div>
          <p className="text-on-surface-variant">
            Por favor, edite la ficha de <strong>{student.nombre} {student.apellido}</strong> y
            agregue un email de contacto antes de continuar.
          </p>
          <div className="flex justify-end pt-2">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => setModalEmailRequeridoOpen(false)}
            >
              Entendido
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de Confirmación de Creación de Cuenta Alumno */}
      <Modal
        open={modalOpen}
        onClose={() => !habilitando && setModalOpen(false)}
        title="Confirmar acceso al portal"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs text-on-surface">
          <p className="text-on-surface-variant">
            Estás a punto de habilitar la cuenta de autoservicio en el portal para el alumno:
          </p>

          <div className="rounded-md border border-outline-variant bg-surface-container-low p-3.5 space-y-2">
            <div className="flex justify-between">
              <span className="font-bold text-on-surface-variant">Alumno:</span>
              <span className="font-bold text-on-surface">
                {student.nombre} {student.apellido}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-on-surface-variant">Legajo / DNI:</span>
              <span className="font-mono text-on-surface">
                {student.legajo} · {student.dni}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-on-surface-variant">Email destinatario:</span>
              <span className="font-mono font-bold text-primary">
                {student.email}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-on-surface-variant">Rol asignado:</span>
              <span className="font-bold text-secondary">Alumno</span>
            </div>
          </div>

          <div className="rounded-sm bg-surface-container-high p-3 text-[11px] text-on-surface-variant">
            <p>
              El sistema generará una <strong>contraseña temporal</strong> que será enviada
              automáticamente al email registrado. En su primer ingreso, el alumno deberá
              cambiarla obligatoriamente.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-outline-variant">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              disabled={habilitando}
              onClick={() => setModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="button"
              disabled={habilitando}
              onClick={handleConfirmar}
              className="gap-1.5"
            >
              <Icon
                name={habilitando ? "progress_activity" : "send"}
                size={16}
                className={habilitando ? "animate-spin" : ""}
              />
              {habilitando ? "Habilitando..." : "Habilitar y enviar contraseña"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
