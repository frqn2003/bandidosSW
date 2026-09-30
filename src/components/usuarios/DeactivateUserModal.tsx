"use client";

import { useState, useEffect } from "react";
import { User } from "./useUsers";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { type MotivoBajaResponse } from "@/data/usuarios";
import { ApiError, mensajeDeError } from "@/lib/api-client";

interface DeactivateUserModalProps {
  open: boolean;
  user: User | null;
  onClose: () => void;
  onConfirm: (motivoBajaId: number, detalle: string) => Promise<void> | void;
  motivos?: MotivoBajaResponse[];
  currentUser?: { id: number; rol: string } | null;
  activeGerentesCount?: number;
}

export function DeactivateUserModal({
  open,
  user,
  onClose,
  onConfirm,
  motivos = [],
  currentUser,
  activeGerentesCount,
}: DeactivateUserModalProps) {
  const [motivoId, setMotivoId] = useState<number | "">("");
  const [detalle, setDetalle] = useState("");
  const [confirmado, setConfirmado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) {
      setMotivoId("");
      setDetalle("");
      setConfirmado(false);
      setGuardando(false);
      setErrorServidor(null);
    }
  }, [open, user]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Validaciones de negocio:
  // 1. Nadie puede darse de baja a sí mismo
  const isSelf = currentUser && user && currentUser.id === user.id;
  // 2. No se puede desactivar al último Gerente activo del sistema
  const isLastActiveManager = user?.role === "Gerente" && (activeGerentesCount !== undefined ? activeGerentesCount <= 1 : false);

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
              <p className="text-sm font-bold text-error">No podés desactivar tu propia cuenta de usuario.</p>
              <p className="text-sm text-on-surface-variant">
                Por motivos de seguridad, otro usuario con rol Gerente debe realizar esta operación.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-error">
                {user?.firstName} {user?.lastName} es el único Gerente activo del sistema.
              </p>
              <p className="text-sm text-on-surface-variant">
                No se puede dejar el sistema sin ningún Gerente activo. Asigná el rol Gerente a otro usuario antes de proceder con la baja.
              </p>
            </>
          )}
        </div>
      </Modal>
    );
  }

  const listaMotivos = motivos;
  const motivoSeleccionado = listaMotivos.find((m) => m.id === Number(motivoId));
  const exigeDetalle = motivoSeleccionado?.requiereDetalle ?? false;

  const handleEjecutarBaja = async () => {
    if (!motivoId || !user || guardando) return;
    if (exigeDetalle && !detalle.trim()) return;
    if (!confirmado) return;

    setGuardando(true);
    setErrorServidor(null);

    try {
      await onConfirm(Number(motivoId), detalle.trim());
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorServidor(err.message);
      } else {
        setErrorServidor(mensajeDeError(err));
      }
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={guardando ? () => {} : onClose}
      title={`Dar de baja a ${user?.firstName} ${user?.lastName}`}
      subtitle="La baja es LÓGICA: se conservan sus datos e historial de auditoría íntegros. El usuario pasará a Inactivo, no podrá iniciar sesión ni ser seleccionado en combos de otros módulos."
      maxWidth="max-w-xl"
      icon={
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-error/10 text-error">
          <Icon name="delete" size={24} />
        </div>
      }
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            className="border border-outline-variant bg-surface-container-high text-on-surface hover:bg-surface-container-highest"
            onClick={onClose}
            disabled={guardando}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!motivoId || (exigeDetalle && !detalle.trim()) || !confirmado || guardando}
            onClick={handleEjecutarBaja}
          >
            <Icon name={guardando ? "progress_activity" : "delete"} size={18} className={guardando ? "animate-spin" : ""} />
            {guardando ? "Procesando…" : "Confirmar"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5 pt-2">
        {errorServidor && (
          <div className="flex items-start gap-2 rounded-sm border border-error/30 bg-error/10 p-3 text-sm text-error">
            <Icon name="error" size={18} className="mt-0.5 shrink-0" />
            <span>{errorServidor}</span>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 rounded-md border border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
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
            <span className="truncate text-sm font-bold text-on-surface" title={user?.email}>
              {user?.email}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="motivo" className="text-sm font-bold text-on-surface-variant">
            Motivo de baja <span className="text-error">*</span>
          </label>
          <select
            id="motivo"
            value={motivoId}
            disabled={guardando}
            onChange={(e) => setMotivoId(Number(e.target.value))}
            className="h-11 rounded-sm border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface focus:border-secondary focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary/20"
          >
            <option value="" disabled>
              Seleccioná un motivo
            </option>
            {listaMotivos.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="detalle" className="text-sm font-bold text-on-surface-variant">
              Detalle del motivo {exigeDetalle && <span className="text-error">*</span>}
            </label>
            <span className="text-xs text-on-surface-variant">{detalle.length}/200</span>
          </div>
          <textarea
            id="detalle"
            value={detalle}
            disabled={guardando}
            onChange={(e) => setDetalle(e.target.value.slice(0, 200))}
            maxLength={200}
            placeholder={exigeDetalle ? "Detalle obligatorio al seleccionar 'Otro' (máx. 200 caracteres)..." : "Detalle opcional (máx. 200 caracteres)..."}
            className="min-h-[100px] rounded-sm border border-outline-variant bg-surface-container-lowest p-3 text-sm text-on-surface focus:border-secondary focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary/20"
          />
          <p className="text-xs text-on-surface-variant">
            {exigeDetalle
              ? "Obligatorio: este motivo requiere un detalle explicativo de hasta 200 caracteres."
              : "Opcional: podés agregar observaciones si lo considerás necesario."}
          </p>
        </div>

        {/* Criterio deseable: Doble confirmación adicional antes de ejecutar la baja */}
        <label className="mt-1 flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={confirmado}
            disabled={guardando}
            onChange={(e) => setConfirmado(e.target.checked)}
            className="h-4 w-4 rounded-sm border-outline-variant text-primary focus:ring-secondary"
          />
          <span className="text-sm font-medium text-on-surface-variant">
            Confirmo que quiero dar de baja a este usuario de manera lógica.
          </span>
        </label>
      </div>
    </Modal>
  );
}
