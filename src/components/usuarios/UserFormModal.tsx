"use client";

import { useState, useEffect } from "react";
import { User, Role } from "./useUsers";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ApiError, mensajeDeError } from "@/lib/api-client";

export type ModoUserForm = "INSERCION" | "EDICION" | "LECTURA";

interface UserFormModalProps {
  open: boolean;
  modo: ModoUserForm;
  user: User | null;
  roles?: { id: number; nombre: string }[];
  onClose: () => void;
  onGuardar: (user: {
    firstName: string;
    lastName: string;
    dni: string;
    email: string;
    phone: string;
    role: Role;
  }) => Promise<void> | void;
  checkDuplicate: (dni: string, email: string, currentId?: number) => { dniExists: boolean; emailExists: boolean };
  onEditClick?: (user: User) => void;
  onDeactivateClick?: (user: User) => void;
}

export function UserFormModal({
  open,
  modo,
  user,
  roles = [],
  onClose,
  onGuardar,
  checkDuplicate,
  onEditClick,
  onDeactivateClick,
}: UserFormModalProps) {
  const isRead = modo === "LECTURA";
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dni, setDni] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Role>("Profesor");

  const [dniError, setDniError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [generalError, setGeneralError] = useState("");
  const [guardando, setGuardando] = useState(false);

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
      setPhoneError("");
      setGeneralError("");
      setGuardando(false);
    }
  }, [open, user]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleNameChange = (val: string, setter: (v: string) => void) => {
    // Solo letras y acentos, máximo 50 caracteres (criterio HU-SIS-00)
    const cleaned = val.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, "").slice(0, 50);
    setter(cleaned);
  };

  const handleNumericChange = (val: string, setter: (v: string) => void, maxLen?: number) => {
    const numbers = val.replace(/\D/g, "");
    if (maxLen) {
      setter(numbers.slice(0, maxLen));
    } else {
      setter(numbers);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRead || guardando) return;

    setDniError("");
    setEmailError("");
    setPhoneError("");
    setGeneralError("");

    let hasError = false;

    // Validación Nombre y Apellido
    if (!firstName.trim()) {
      setGeneralError("El nombre es obligatorio.");
      hasError = true;
    }
    if (!lastName.trim()) {
      setGeneralError("El apellido es obligatorio.");
      hasError = true;
    }

    // Validación DNI: 7 u 8 dígitos numéricos
    if (!/^\d{7,8}$/.test(dni.trim())) {
      setDniError("El DNI debe tener 7 u 8 dígitos numéricos.");
      hasError = true;
    }

    // Validación Email: usuario@dominio
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setEmailError("El email debe tener el formato válido (usuario@dominio).");
      hasError = true;
    }

    // Validación Teléfono: opcional, 10 u 11 dígitos si se ingresa
    if (phone.trim() && (phone.trim().length < 10 || phone.trim().length > 11)) {
      setPhoneError("El teléfono debe tener 10 u 11 dígitos numéricos.");
      hasError = true;
    }

    // Validación local de duplicados en usuarios activos
    const dups = checkDuplicate(dni, email, user?.id);
    if (dups.dniExists) {
      setDniError("Ya existe un usuario activo con este DNI.");
      hasError = true;
    }
    if (dups.emailExists && emailRegex.test(email.trim())) {
      setEmailError("Ya existe un usuario activo con este Email.");
      hasError = true;
    }

    if (hasError) return;

    setGuardando(true);
    try {
      await onGuardar({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dni: dni.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        role,
      });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.campo === "dni" || err.codigo === "DNI_DUPLICADO") {
          setDniError(err.message);
        } else if (err.campo === "email" || err.codigo === "EMAIL_DUPLICADO") {
          setEmailError(err.message);
        } else if (err.campo === "telefono") {
          setPhoneError(err.message);
        } else {
          setGeneralError(err.message);
        }
      } else {
        setGeneralError(mensajeDeError(err));
      }
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={guardando ? () => {} : onClose}
      title={isRead ? `Ficha de ${firstName} ${lastName}` : modo === "INSERCION" ? "Nuevo usuario" : "Modificar usuario"}
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
      subtitle={
        isRead && user
          ? `Alta: ${user.fechaCreacion ? new Date(user.fechaCreacion).toLocaleDateString("es-AR") : "—"}`
          : undefined
      }
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
                  disabled={user.status === "Inactivo" || guardando}
                >
                  <Icon name="delete" size={18} />
                  Dar de baja
                </Button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" onClick={onClose} disabled={guardando}>
                Cancelar
              </Button>
              <Button type="button" variant="primary" onClick={handleSubmit} disabled={guardando}>
                <Icon name={guardando ? "progress_activity" : "save"} size={18} className={guardando ? "animate-spin" : ""} />
                {guardando ? "Guardando…" : modo === "EDICION" ? "Guardar cambios" : "Guardar usuario"}
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

      {generalError && (
        <div className="mb-4 flex items-center gap-2 rounded-sm border border-error/30 bg-error/10 p-3 text-sm text-error">
          <Icon name="error" size={18} />
          <span>{generalError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <fieldset className="rounded-md border border-outline-variant p-5">
          <legend className="px-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            Datos personales
          </legend>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="nombre" className="text-sm font-semibold text-on-surface">
                Nombre *
              </label>
              <input
                id="nombre"
                type="text"
                required
                maxLength={50}
                disabled={isRead || guardando}
                value={firstName}
                onChange={(e) => handleNameChange(e.target.value, setFirstName)}
                className="h-11 rounded-sm border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface focus:border-secondary focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:opacity-60 disabled:cursor-not-allowed"
              />
              {!isRead && <span className="text-[11px] text-on-surface-variant">{firstName.length}/50 caracteres</span>}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="apellido" className="text-sm font-semibold text-on-surface">
                Apellido *
              </label>
              <input
                id="apellido"
                type="text"
                required
                maxLength={50}
                disabled={isRead || guardando}
                value={lastName}
                onChange={(e) => handleNameChange(e.target.value, setLastName)}
                className="h-11 rounded-sm border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface focus:border-secondary focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:opacity-60 disabled:cursor-not-allowed"
              />
              {!isRead && <span className="text-[11px] text-on-surface-variant">{lastName.length}/50 caracteres</span>}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="dni" className="text-sm font-semibold text-on-surface">
                DNI *
              </label>
              <input
                id="dni"
                type="text"
                required
                maxLength={8}
                disabled={isRead || guardando}
                value={dni}
                onChange={(e) => handleNumericChange(e.target.value, setDni, 8)}
                placeholder="7 u 8 dígitos numéricos"
                className={`h-11 rounded-sm border bg-surface-container-low px-3 text-sm text-on-surface focus:bg-surface-container-lowest focus:outline-none focus:ring-2 disabled:opacity-60 disabled:cursor-not-allowed ${
                  dniError ? "border-error focus:border-error focus:ring-error/20" : "border-outline-variant focus:border-secondary focus:ring-secondary/20"
                }`}
              />
              {dniError ? (
                <p className="flex items-center gap-1 text-xs font-medium text-error">
                  <Icon name="error" size={14} />
                  {dniError}
                </p>
              ) : (
                !isRead && <span className="text-[11px] text-on-surface-variant">7 u 8 dígitos numéricos, obligatorio y único.</span>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="email" className="text-sm font-semibold text-on-surface">
                Email *
              </label>
              <input
                id="email"
                type="email"
                required
                maxLength={120}
                disabled={isRead || guardando}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@dominio.com"
                className={`h-11 rounded-sm border bg-surface-container-low px-3 text-sm text-on-surface focus:bg-surface-container-lowest focus:outline-none focus:ring-2 disabled:opacity-60 disabled:cursor-not-allowed ${
                  emailError ? "border-error focus:border-error focus:ring-error/20" : "border-outline-variant focus:border-secondary focus:ring-secondary/20"
                }`}
              />
              {emailError ? (
                <p className="flex items-center gap-1 text-xs font-medium text-error">
                  <Icon name="error" size={14} />
                  {emailError}
                </p>
              ) : (
                !isRead && <span className="text-[11px] text-on-surface-variant">Formato usuario@dominio, obligatorio y único.</span>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="telefono" className="text-sm font-semibold text-on-surface">
                Teléfono
              </label>
              <input
                id="telefono"
                type="text"
                maxLength={11}
                disabled={isRead || guardando}
                value={phone}
                onChange={(e) => handleNumericChange(e.target.value, setPhone, 11)}
                placeholder="Ej: 3874123456"
                className={`h-11 rounded-sm border bg-surface-container-low px-3 text-sm text-on-surface focus:bg-surface-container-lowest focus:outline-none focus:ring-2 disabled:opacity-60 disabled:cursor-not-allowed ${
                  phoneError ? "border-error focus:border-error focus:ring-error/20" : "border-outline-variant focus:border-secondary focus:ring-secondary/20"
                }`}
              />
              {phoneError ? (
                <p className="flex items-center gap-1 text-xs font-medium text-error">
                  <Icon name="error" size={14} />
                  {phoneError}
                </p>
              ) : (
                !isRead && <span className="text-[11px] text-on-surface-variant">Opcional — 10 u 11 dígitos numéricos.</span>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="rol" className="text-sm font-semibold text-on-surface">
                Rol *
              </label>
              <select
                id="rol"
                required
                disabled={isRead || guardando}
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="h-11 rounded-sm border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface focus:border-secondary focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {roles.length > 0 ? (
                  roles.map((r) => (
                    <option key={r.id} value={r.nombre}>
                      {r.nombre}
                    </option>
                  ))
                ) : (
                  <option value={role}>{role}</option>
                )}
              </select>
            </div>
          </div>
        </fieldset>

        {modo === "INSERCION" && (
          <div className="flex items-start gap-3 rounded-md bg-primary-container/20 p-4">
            <Icon name="mail" size={20} className="mt-0.5 text-primary" />
            <p className="text-sm font-medium text-primary">
              Al dar de alta, el sistema genera automáticamente una <strong>contraseña temporal alfanumérica</strong> (mínimo 8 caracteres) y la envía al email registrado. El usuario estará obligado a cambiarla en su primer inicio de sesión.
            </p>
          </div>
        )}
      </form>

      {isRead && user && (
        <div className="mt-8">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-on-surface-variant">
            Bitácora de auditoría
          </h3>
          <div className="overflow-x-auto rounded-md border border-outline-variant bg-surface-container-lowest shadow-card">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-outline-variant bg-surface-container-low">
                <tr className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                  <th className="px-4 py-3">Fecha y Hora</th>
                  <th className="px-4 py-3">Responsable</th>
                  <th className="px-4 py-3">Acción</th>
                  <th className="px-4 py-3">Campo modificado</th>
                  <th className="px-4 py-3">Valor anterior</th>
                  <th className="px-4 py-3">Valor nuevo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60">
                {user.status === "Inactivo" && (
                  <tr className="hover:bg-surface-container-low/50">
                    <td className="px-4 py-3 text-on-surface-variant">
                      {user.fechaBaja ? new Date(user.fechaBaja).toLocaleString("es-AR") : "Reciente"}
                    </td>
                    <td className="px-4 py-3 font-semibold">Gerencia</td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-error/10 px-2 py-0.5 text-xs font-bold text-error">
                        Baja lógica
                      </span>
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant">Estado / Motivo</td>
                    <td className="px-4 py-3 text-on-surface-variant">Activo</td>
                    <td className="px-4 py-3 font-medium text-on-surface">
                      Inactivo ({user.motivoBaja?.nombre ?? "Baja registrada"})
                    </td>
                  </tr>
                )}
                <tr className="hover:bg-surface-container-low/50">
                  <td className="px-4 py-3 text-on-surface-variant">
                    {user.fechaCreacion ? new Date(user.fechaCreacion).toLocaleString("es-AR") : "Registro inicial"}
                  </td>
                  <td className="px-4 py-3 font-semibold">Sistema</td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">
                      Alta
                    </span>
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant">Usuario</td>
                  <td className="px-4 py-3 text-on-surface-variant">—</td>
                  <td className="px-4 py-3 font-medium text-on-surface">Creado (Activo)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  );
}
