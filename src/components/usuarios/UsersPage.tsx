"use client";

import { useState } from "react";
import { useUsers, User, Role, Status } from "./useUsers";
import { UsersTable } from "./UsersTable";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Sidebar } from "@/components/layout/Sidebar";
import { UserFormModal, ModoUserForm } from "./UserFormModal";
import { DeactivateUserModal } from "./DeactivateUserModal";
import { usuariosACsv, descargarCsv } from "./exportar";
import { ApiError, mensajeDeError } from "@/lib/api-client";

export function UsersPage() {
  const {
    users,
    allUsers,
    totalItems,
    totalPages,
    pageStart,
    pageEnd,
    page,
    pageSize,
    setPage,
    setPageSize,
    searchTerm,
    setSearchTerm,
    roleFilter,
    setRoleFilter,
    statusFilter,
    setStatusFilter,
    loading,
    error,
    reload,
    roles,
    motivosBaja,
    currentSessionUser,
    activeGerentesCount,
    addUser,
    updateUser,
    deactivateUser,
    reactivateUser,
    checkDuplicate,
  } = useUsers();

  const [formModal, setFormModal] = useState<{ open: boolean; modo: ModoUserForm; user: User | null }>({
    open: false,
    modo: "INSERCION",
    user: null,
  });

  const [deactivateModal, setDeactivateModal] = useState<{ open: boolean; user: User | null }>({
    open: false,
    user: null,
  });

  const [reactivateModal, setReactivateModal] = useState<{ open: boolean; user: User | null }>({
    open: false,
    user: null,
  });

  const [createdUserSuccess, setCreatedUserSuccess] = useState<{
    email: string;
    nombreCompleto?: string;
    passwordTemporal?: string;
  } | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [reactivating, setReactivating] = useState(false);

  const showFeedback = (type: "success" | "error", text: string) => {
    setFeedbackMessage({ type, text });
    setTimeout(() => {
      setFeedbackMessage((prev) => (prev?.text === text ? null : prev));
    }, 5000);
  };

  const handleLimpiarFiltros = () => {
    setSearchTerm("");
    setRoleFilter("Todos");
    setStatusFilter("Activo");
    setPage(1);
  };

  const handleExportExcel = () => {
    const csv = usuariosACsv(allUsers);
    descargarCsv(csv, "usuarios.csv");
  };

  const handleExportPDF = () => {
    window.print();
  };

  const handleView = (user: User) => {
    setFormModal({ open: true, modo: "LECTURA", user });
  };

  const handleEdit = (user: User) => {
    setFormModal({ open: true, modo: "EDICION", user });
  };

  const handleDeactivate = (user: User) => {
    setDeactivateModal({ open: true, user });
  };

  const handleReactivatePrompt = (user: User) => {
    setReactivateModal({ open: true, user });
  };

  const handleNewUser = () => {
    setFormModal({ open: true, modo: "INSERCION", user: null });
  };

  const handleSaveUser = async (userData: {
    firstName: string;
    lastName: string;
    dni: string;
    email: string;
    phone: string;
    role: Role;
  }) => {
    if (formModal.modo === "INSERCION") {
      const nuevo = await addUser(userData);
      setFormModal({ open: false, modo: "INSERCION", user: null });
      setCreatedUserSuccess({
        email: userData.email,
        nombreCompleto: `${userData.firstName} ${userData.lastName}`,
        passwordTemporal: nuevo?.passwordTemporal,
      });
      showFeedback("success", `Usuario ${userData.firstName} ${userData.lastName} dado de alta con éxito.`);
    } else if (formModal.modo === "EDICION" && formModal.user) {
      await updateUser(formModal.user.id, userData);
      setFormModal({ open: false, modo: "INSERCION", user: null });
      showFeedback("success", `Datos del usuario ${userData.firstName} ${userData.lastName} actualizados.`);
    }
  };

  const handleConfirmDeactivate = async (motivoBajaId: number, detalle: string) => {
    if (deactivateModal.user) {
      const targetUser = deactivateModal.user;
      await deactivateUser(targetUser.id, motivoBajaId, detalle);
      showFeedback("success", `El usuario ${targetUser.firstName} ${targetUser.lastName} fue dado de baja lógica.`);
    }
    setDeactivateModal({ open: false, user: null });
  };

  const handleConfirmReactivate = async () => {
    if (!reactivateModal.user) return;
    setReactivating(true);
    try {
      await reactivateUser(reactivateModal.user.id);
      showFeedback("success", `El usuario ${reactivateModal.user.firstName} ${reactivateModal.user.lastName} fue reactivado con éxito.`);
      setReactivateModal({ open: false, user: null });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : mensajeDeError(err);
      showFeedback("error", msg);
    } finally {
      setReactivating(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-surface print:block print:bg-white">
      <div className="print:hidden">
        <Sidebar />
      </div>

      <main className="flex-1 px-6 py-6 lg:px-8 print:p-0">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 print:max-w-none print:gap-4">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-md bg-primary-container/30 print:hidden">
                <Icon name="manage_accounts" size={24} className="text-primary" />
              </span>
              <div>
                <h1 className="font-display text-2xl font-bold text-on-surface print:text-xl print:text-black">
                  Usuarios del sistema
                </h1>
                <p className="text-sm font-medium text-on-surface-variant print:text-black/70">
                  Gestión integral del personal y credenciales de acceso (HU-SIS-00).
                </p>
              </div>
            </div>
            <div className="flex gap-2 print:hidden">
              <Button variant="outline" type="button" onClick={handleExportExcel}>
                <Icon name="download" size={18} />
                Exportar Excel
              </Button>
              <Button variant="outline" type="button" onClick={handleExportPDF}>
                <Icon name="picture_as_pdf" size={18} />
                Exportar PDF
              </Button>
              <Button variant="primary" type="button" onClick={handleNewUser}>
                <Icon name="add" size={18} />
                Nuevo usuario
              </Button>
            </div>
          </header>

          {feedbackMessage && (
            <div
              className={`flex items-center justify-between rounded-md p-4 text-sm font-medium shadow-sm transition-all print:hidden ${
                feedbackMessage.type === "success"
                  ? "border border-status-success-strong/30 bg-status-success-strong/10 text-status-success-strong"
                  : "border border-error/30 bg-error/10 text-error"
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon name={feedbackMessage.type === "success" ? "check_circle" : "error"} size={20} />
                <span>{feedbackMessage.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setFeedbackMessage(null)}
                className="text-on-surface-variant hover:text-on-surface"
              >
                <Icon name="close" size={16} />
              </button>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-between rounded-md border border-error/30 bg-error/10 p-4 text-sm text-error print:hidden">
              <div className="flex items-center gap-2">
                <Icon name="error" size={20} />
                <span>{error}</span>
              </div>
              <Button size="sm" variant="outline" onClick={reload}>
                Reintentar
              </Button>
            </div>
          )}

          {/* Filtros */}
          <div className="rounded-md border border-outline-variant bg-surface-container-lowest p-4 shadow-card print:hidden">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex min-w-[240px] flex-1 flex-col gap-1">
                <label htmlFor="search" className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  Buscar
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-on-surface-variant">
                    <Icon name="search" size={18} />
                  </span>
                  <input
                    id="search"
                    type="text"
                    placeholder="Nombre, apellido o DNI (sin distinguir mayúsculas ni acentos)"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setPage(1);
                    }}
                    className="h-11 w-full rounded-sm border border-outline-variant bg-surface-container-low pl-10 pr-3 text-sm text-on-surface focus:border-secondary focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary/20"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="role" className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  Rol
                </label>
                <select
                  id="role"
                  value={roleFilter}
                  onChange={(e) => {
                    setRoleFilter(e.target.value as Role | "Todos");
                    setPage(1);
                  }}
                  className="h-11 rounded-sm border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface focus:border-secondary focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary/20"
                >
                  <option value="Todos">Todos los roles</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.nombre}>
                      {r.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="status" className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  Estado
                </label>
                <select
                  id="status"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as Status | "Todos");
                    setPage(1);
                  }}
                  className="h-11 rounded-sm border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface focus:border-secondary focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary/20"
                >
                  <option value="Activo">Activo (por defecto)</option>
                  <option value="Inactivo">Inactivo</option>
                  <option value="Todos">Todos los estados</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleLimpiarFiltros}
                className="flex h-11 cursor-pointer items-center gap-2 rounded-sm border border-secondary bg-white px-3.5 text-sm font-bold text-secondary shadow-xs transition-colors hover:bg-secondary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
              >
                <Icon name="filter_alt_off" size={18} className="text-secondary" />
                Limpiar filtros
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-md border border-outline-variant bg-surface-container-lowest p-12">
              <Icon name="progress_activity" size={32} className="animate-spin text-primary" />
              <p className="text-sm font-medium text-on-surface-variant">Cargando usuarios del sistema…</p>
            </div>
          ) : (
            <UsersTable
              users={users}
              page={page}
              totalPages={totalPages}
              totalItems={totalItems}
              pageStart={pageStart}
              pageEnd={pageEnd}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              onView={handleView}
              onEdit={handleEdit}
              onDeactivate={handleDeactivate}
              onReactivate={handleReactivatePrompt}
            />
          )}
        </div>
      </main>

      <UserFormModal
        open={formModal.open}
        modo={formModal.modo}
        user={formModal.user}
        roles={roles}
        onClose={() => setFormModal({ ...formModal, open: false })}
        onGuardar={handleSaveUser}
        checkDuplicate={checkDuplicate}
        onEditClick={handleEdit}
        onDeactivateClick={handleDeactivate}
      />

      <DeactivateUserModal
        open={deactivateModal.open}
        user={deactivateModal.user}
        onClose={() => setDeactivateModal({ ...deactivateModal, open: false })}
        onConfirm={handleConfirmDeactivate}
        motivos={motivosBaja}
        currentUser={currentSessionUser}
        activeGerentesCount={activeGerentesCount}
      />

      {/* Modal de confirmación para Reactivar usuario */}
      <Modal
        open={reactivateModal.open}
        onClose={() => setReactivateModal({ open: false, user: null })}
        title={`Reactivar a ${reactivateModal.user?.firstName} ${reactivateModal.user?.lastName}`}
        maxWidth="max-w-md"
        icon={
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-status-success-strong/10 text-status-success-strong">
            <Icon name="restore" size={24} />
          </div>
        }
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setReactivateModal({ open: false, user: null })}
              disabled={reactivating}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleConfirmReactivate}
              disabled={reactivating}
            >
              <Icon name={reactivating ? "progress_activity" : "check_circle"} size={18} className={reactivating ? "animate-spin" : ""} />
              {reactivating ? "Reactivando…" : "Confirmar reactivación"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-on-surface-variant">
          El usuario pasará a estado <strong>Activo</strong>. Podrá volver a iniciar sesión y ser seleccionado en turnos y asignaciones de otros módulos.
        </p>
      </Modal>

      {/* Modal de alta exitosa de usuario */}
      <Modal
        open={createdUserSuccess !== null}
        onClose={() => {
          setCreatedUserSuccess(null);
          setCopiado(false);
        }}
        title="Usuario dado de alta exitosamente"
        maxWidth="max-w-md"
        icon={
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-status-success-strong/10 text-status-success-strong">
            <Icon name="check_circle" size={24} />
          </div>
        }
        footer={
          <Button
            type="button"
            variant="primary"
            onClick={() => {
              setCreatedUserSuccess(null);
              setCopiado(false);
            }}
          >
            Entendido
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-on-surface">
            Se ha creado la cuenta para{" "}
            <strong>
              {createdUserSuccess?.nombreCompleto
                ? `${createdUserSuccess.nombreCompleto} (${createdUserSuccess.email})`
                : createdUserSuccess?.email}
            </strong>
            .
          </p>

          {createdUserSuccess?.passwordTemporal && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                Contraseña temporal
              </label>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-outline-variant bg-surface-container-low px-3.5 py-2.5">
                <code className="select-all font-mono text-base font-bold tracking-wider text-on-surface">
                  {createdUserSuccess.passwordTemporal}
                </code>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    if (!createdUserSuccess?.passwordTemporal) return;
                    try {
                      await navigator.clipboard.writeText(createdUserSuccess.passwordTemporal);
                      setCopiado(true);
                      setTimeout(() => setCopiado(false), 2000);
                    } catch {
                      // sin permiso de portapapeles
                    }
                  }}
                  className="shrink-0"
                >
                  <Icon name={copiado ? "check" : "content_copy"} size={16} />
                  {copiado ? "Copiada" : "Copiar"}
                </Button>
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 rounded-md border border-status-warning/40 bg-status-warning/10 p-3 text-xs text-on-surface">
            <Icon name="warning" size={18} className="mt-0.5 shrink-0 text-status-warning-strong" />
            <p>
              <strong>Atención:</strong> La función de envío por email aún no está implementada. Por favor, copia y entrega esta contraseña temporal al usuario. Deberá cambiarla obligatoriamente en su primer inicio de sesión.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
