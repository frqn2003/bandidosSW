"use client";

import { useState } from "react";
import { User } from "./useUsers";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

interface DeactivateUserModalProps {
  open: boolean;
  user: User | null;
  onClose: () => void;
  onConfirm: (motivo: string, detalle: string) => void;
}

export function DeactivateUserModal({ open, user, onClose, onConfirm }: DeactivateUserModalProps) {
  const [motivo, setMotivo] = useState("");
  const [detalle, setDetalle] = useState("");
  const [confirmado, setConfirmado] = useState(false);
  // Simulación de errores
  const isSelf = user?.id === 2; // Supongamos que el usuario actual es ID 2 (Carlos Benítez)
  const isLastActiveManager = user?.id === 3; // Supongamos que el ID 3 es el único gerente activo

  if (isSelf || isLastActiveManager) {
    return (
      <Modal 
        open={open} 
        onClose={onClose} 
        title="No se puede dar de baja" 
        maxWidth="max-w-md" 
        icon={
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-error/10 text-error">
            <Icon name="warning" size={24} />
          </div>
        } 
        footer={
          <Button variant="primary" onClick={onClose}>
            Entendido
          </Button>
        }
      >
        <div className="flex flex-col gap-2 pt-2">
          {isSelf ? (
            <>
              <p className="text-sm font-bold text-error">No podés desactivar tu propio usuario.</p>
              <p className="text-sm text-on-surface-variant">Pedile a otro Gerente activo que realice la baja.</p>
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-error">{user?.firstName} {user?.lastName} es el último Gerente activo del sistema.</p>
              <p className="text-sm text-on-surface-variant">Asigná el rol Gerente a otro usuario antes de continuar.</p>
            </>
          )}
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Dar de baja a ${user?.firstName} ${user?.lastName}`}
      subtitle="La baja es lógica: se conservan sus datos y su historial de auditoría. El usuario pasará a Inactivo, no podrá iniciar sesión y no aparecerá en combos ni listas de otros módulos."
      maxWidth="max-w-xl"
      icon={
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-error/10 text-error">
          <Icon name="person_remove" size={24} />
        </div>
      }
      footer={
        <>
          <Button type="button" variant="secondary" className="bg-surface-container-high text-on-surface hover:bg-surface-container-highest" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!motivo || (motivo === "Otro" && !detalle) || !confirmado}
            onClick={() => onConfirm(motivo, detalle)}
          >
            Confirmar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5 pt-2">
        <div className="grid grid-cols-3 gap-4 rounded-md bg-surface-container-lowest border border-outline-variant p-4 shadow-sm">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-on-surface-variant">DNI</span>
            <span className="text-sm font-bold text-on-surface">{user?.dni}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-on-surface-variant">Rol</span>
            <span className="text-sm font-bold text-on-surface">{user?.role}</span>
          </div>
          <div className="flex flex-col truncate">
            <span className="text-xs font-semibold text-on-surface-variant">Email</span>
            <span className="text-sm font-bold text-on-surface truncate" title={user?.email}>{user?.email}</span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="motivo" className="text-sm font-bold text-on-surface-variant">
            Motivo de baja <span className="text-error">*</span>
          </label>
          <select
            id="motivo"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="h-11 rounded-sm border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface focus:border-secondary focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary/20"
          >
            <option value="" disabled>Seleccioná un motivo</option>
            <option value="Enfermedad">Enfermedad</option>
            <option value="Retiro">Retiro</option>
            <option value="Renuncia">Renuncia</option>
            <option value="Otro">Otro</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="detalle" className="text-sm font-bold text-on-surface-variant">
              Detalle del motivo <span className="text-error">*</span>
            </label>
            <span className="text-xs text-on-surface-variant">{detalle.length}/200</span>
          </div>
          <textarea
            id="detalle"
            value={detalle}
            onChange={(e) => setDetalle(e.target.value)}
            maxLength={200}
            className="min-h-[100px] rounded-sm border border-outline-variant bg-surface-container-lowest p-3 text-sm text-on-surface focus:border-secondary focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary/20"
          />
          <p className="text-xs text-on-surface-variant">Obligatorio solo cuando el motivo es &quot;Otro&quot;.</p>
        </div>

        <label className="flex items-center gap-3 mt-1 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmado}
            onChange={(e) => setConfirmado(e.target.checked)}
            className="h-4 w-4 rounded-sm border-outline-variant text-primary focus:ring-secondary"
          />
          <span className="text-sm text-on-surface-variant font-medium">
            Confirmo que quiero dar de baja a este usuario.
          </span>
        </label>
      </div>
    </Modal>
  );
}
