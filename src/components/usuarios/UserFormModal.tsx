"use client";

import { useState, useEffect } from "react";
import { User, Role } from "./useUsers";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { StatusBadge } from "@/components/ui/StatusBadge";

export type ModoUserForm = "INSERCION" | "EDICION" | "LECTURA";

interface UserFormModalProps {
  open: boolean;
  modo: ModoUserForm;
  user: User | null;
  onClose: () => void;
  onGuardar: (user: Omit<User, "id" | "status">) => void;
  checkDuplicate: (dni: string, email: string, currentId?: number) => { dniExists: boolean; emailExists: boolean };
  onEditClick?: (user: User) => void;
  onDeactivateClick?: (user: User) => void;
}

export function UserFormModal({ open, modo, user, onClose, onGuardar, checkDuplicate, onEditClick, onDeactivateClick }: UserFormModalProps) {
  const isRead = modo === "LECTURA";
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dni, setDni] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Role>("Profesor");

  const [dniError, setDniError] = useState("");
  const [emailError, setEmailError] = useState("");

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) {
      if (user) {
        setFirstName(user.firstName);
        setLastName(user.lastName);
        setDni(user.dni);
        setEmail(user.email);
        setPhone(user.phone);
        setRole(user.role);
      } else {
        setFirstName("");
        setLastName("");
        setDni("");
        setEmail("");
        setPhone("");
        setRole("Profesor");
      }
      setDniError("");
      setEmailError("");
    }
  }, [open, user]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const [phoneError, setPhoneError] = useState("");

  const handleNameChange = (val: string, setter: (v: string) => void) => {
    setter(val.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, ""));
  };

  const handleNumericChange = (val: string, setter: (v: string) => void, maxLen?: number) => {
    const numbers = val.replace(/\D/g, "");
    if (maxLen) {
      setter(numbers.slice(0, maxLen));
    } else {
      setter(numbers);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDniError("");
    setEmailError("");
    setPhoneError("");

    let hasError = false;

    if (phone && (phone.length < 10 || phone.length > 11)) {
      setPhoneError("El teléfono debe tener entre 10 y 11 dígitos.");
      hasError = true;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError("El email debe tener el formato usuario@dominio.com");
      hasError = true;
    }

    const dups = checkDuplicate(dni, email, user?.id);
    if (dups.dniExists) {
      setDniError("Ya existe un usuario activo con este DNI.");
      hasError = true;
    }
    if (dups.emailExists && emailRegex.test(email)) {
      setEmailError("Ya existe un usuario activo con este Email.");
      hasError = true;
    }

    if (hasError) return;

    onGuardar({ firstName, lastName, dni, email, phone, role });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isRead ? `Ficha de ${firstName} ${lastName}` : modo === "INSERCION" ? "Nuevo usuario" : `Modificar usuario`}
      maxWidth={isRead ? "max-w-4xl" : "max-w-2xl"}
      titleExtra={
        isRead && user ? (
          <StatusBadge
            variant={user.status === "Activo" ? "success" : "neutral"}
            icon={user.status === "Activo" ? "check_circle" : "cancel"}
            label={user.status}
          />
        ) : undefined
      }
      subtitle={isRead && user ? `Alta: 03/02/2026 por Carlos Benítez · Última modificación: 14/09/2026` : undefined}
      footer={
        !isRead ? (
          <div className="flex w-full items-center justify-between">
            <div>
              {modo === "EDICION" && user && onDeactivateClick && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    onClose();
                    onDeactivateClick(user);
                  }}
                  disabled={user.status === "Inactivo"}
                >
                  <Icon name="delete" size={18} />
                  Dar de baja
                </Button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="button" variant="primary" onClick={handleSubmit}>
                <Icon name="save" size={18} />
                {modo === "EDICION" ? "Guardar cambios" : "Guardar usuario"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant="outline" onClick={onClose}>
              Cerrar
            </Button>
            {user && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                {onEditClick && (
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => {
                      onClose();
                      onEditClick(user);
                    }}
                  >
                    <Icon name="edit" size={18} />
                    Modificar ficha
                  </Button>
                )}
              </div>
            )}
          </div>
        )
      }
    >
      <div className="mb-4 flex items-center justify-between border-b border-outline-variant pb-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-sm bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
            {modo === "EDICION" && "Modo EDICIÓN"}
            {modo === "LECTURA" && "Modo LECTURA"}
            {modo === "INSERCION" && "Modo INSERCIÓN"}
          </span>
        </div>
        {!isRead && (
          <span className="text-xs font-medium text-on-surface-variant">* Campo obligatorio</span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <fieldset className="rounded-md border border-outline-variant p-5">
          <legend className="px-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            Datos personales
          </legend>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="nombre" className="text-sm font-semibold text-on-surface">Nombre *</label>
              <input
                id="nombre"
                type="text"
                required
                disabled={isRead}
                value={firstName}
                onChange={(e) => handleNameChange(e.target.value, setFirstName)}
                className="h-11 rounded-sm border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface focus:border-secondary focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="apellido" className="text-sm font-semibold text-on-surface">Apellido *</label>
              <input
                id="apellido"
                type="text"
                required
                disabled={isRead}
                value={lastName}
                onChange={(e) => handleNameChange(e.target.value, setLastName)}
                className="h-11 rounded-sm border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface focus:border-secondary focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="dni" className="text-sm font-semibold text-on-surface">DNI *</label>
              <input
                id="dni"
                type="text"
                required
                disabled={isRead}
                value={dni}
                onChange={(e) => handleNumericChange(e.target.value, setDni, 8)}
                className={`h-11 rounded-sm border bg-surface-container-low px-3 text-sm text-on-surface focus:bg-surface-container-lowest focus:outline-none focus:ring-2 disabled:opacity-60 disabled:cursor-not-allowed ${dniError ? 'border-error focus:border-error focus:ring-error/20' : 'border-outline-variant focus:border-secondary focus:ring-secondary/20'}`}
              />
              {dniError && <p className="text-xs text-error font-medium flex items-center gap-1"><Icon name="error" size={14} />{dniError}</p>}
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="email" className="text-sm font-semibold text-on-surface">Email *</label>
              <input
                id="email"
                type="email"
                required
                disabled={isRead}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`h-11 rounded-sm border bg-surface-container-low px-3 text-sm text-on-surface focus:bg-surface-container-lowest focus:outline-none focus:ring-2 disabled:opacity-60 disabled:cursor-not-allowed ${emailError ? 'border-error focus:border-error focus:ring-error/20' : 'border-outline-variant focus:border-secondary focus:ring-secondary/20'}`}
              />
              {emailError ? (
                 <p className="text-xs text-error font-medium flex items-center gap-1"><Icon name="error" size={14} />{emailError}</p>
              ) : (
                !isRead && <p className="text-xs text-on-surface-variant">Formato usuario@dominio. Debe ser único.</p>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="telefono" className="text-sm font-semibold text-on-surface">Teléfono</label>
              <input
                id="telefono"
                type="text"
                disabled={isRead}
                value={phone}
                onChange={(e) => handleNumericChange(e.target.value, setPhone, 11)}
                placeholder="Ej: 3874123456"
                className={`h-11 rounded-sm border bg-surface-container-low px-3 text-sm text-on-surface focus:bg-surface-container-lowest focus:outline-none focus:ring-2 disabled:opacity-60 disabled:cursor-not-allowed ${phoneError ? 'border-error focus:border-error focus:ring-error/20' : 'border-outline-variant focus:border-secondary focus:ring-secondary/20'}`}
              />
              {phoneError ? (
                 <p className="text-xs text-error font-medium flex items-center gap-1"><Icon name="error" size={14} />{phoneError}</p>
              ) : (
                !isRead && <p className="text-xs text-on-surface-variant">Opcional - 10 u 11 dígitos, solo números.</p>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="rol" className="text-sm font-semibold text-on-surface">Rol *</label>
              <select
                id="rol"
                required
                disabled={isRead}
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="h-11 rounded-sm border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface focus:border-secondary focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="Profesor">Profesor</option>
                <option value="Gerente">Gerente</option>
                <option value="Mesa de Entrada">Mesa de Entrada</option>
              </select>
            </div>
          </div>
        </fieldset>

        {modo === "INSERCION" && (
          <div className="flex items-start gap-3 rounded-md bg-primary-container/20 p-4">
            <Icon name="mail" size={20} className="text-primary mt-0.5" />
            <p className="text-sm text-primary font-medium">
              Al guardar se generará una <strong>contraseña temporal</strong> alfanumérica de al menos 8 caracteres y se enviará al email registrado. El usuario deberá cambiarla en su primer inicio de sesión.
            </p>
          </div>
        )}
      </form>

      {isRead && (
        <div className="mt-8">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-on-surface-variant">Bitácora de auditoría</h3>
          <div className="rounded-md border border-outline-variant bg-surface-container-lowest overflow-x-auto shadow-card">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-outline-variant bg-surface-container-low">
                <tr className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Hora</th>
                  <th className="px-4 py-3">Responsable</th>
                  <th className="px-4 py-3">Acción</th>
                  <th className="px-4 py-3">Campo</th>
                  <th className="px-4 py-3">Valor anterior</th>
                  <th className="px-4 py-3">Valor nuevo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60">
                <tr className="hover:bg-surface-container-low/50">
                  <td className="px-4 py-3 text-on-surface-variant">14/09/2026</td>
                  <td className="px-4 py-3 text-on-surface-variant">10:42</td>
                  <td className="px-4 py-3 font-semibold">Carlos Benítez</td>
                  <td className="px-4 py-3"><span className="bg-orange-100 text-orange-700 font-bold px-2 py-0.5 rounded text-xs">Modificación</span></td>
                  <td className="px-4 py-3 text-on-surface-variant">Teléfono</td>
                  <td className="px-4 py-3 text-on-surface-variant">3874000111</td>
                  <td className="px-4 py-3 font-medium text-on-surface">3874123456</td>
                </tr>
                <tr className="hover:bg-surface-container-low/50">
                  <td className="px-4 py-3 text-on-surface-variant">03/02/2026</td>
                  <td className="px-4 py-3 text-on-surface-variant">09:14</td>
                  <td className="px-4 py-3 font-semibold">Carlos Benítez</td>
                  <td className="px-4 py-3"><span className="bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded text-xs">Alta</span></td>
                  <td className="px-4 py-3 text-on-surface-variant">Usuario</td>
                  <td className="px-4 py-3 text-on-surface-variant">—</td>
                  <td className="px-4 py-3 font-medium text-on-surface">Creado</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  );
}
