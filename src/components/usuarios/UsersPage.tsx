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

export function UsersPage() {
  const {
    users,
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
    addUser,
    updateUser,
    deactivateUser,
    checkDuplicate
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

  const [createdUserAuth, setCreatedUserAuth] = useState<{ email: string; tempPass: string } | null>(null);

  const handleLimpiarFiltros = () => {
    setSearchTerm("");
    setRoleFilter("Todos");
    setStatusFilter("Activo");
    setPage(1);
  };

  const handleExportExcel = () => {
    const csv = usuariosACsv(users);
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

  const handleNewUser = () => {
    setFormModal({ open: true, modo: "INSERCION", user: null });
  };

  const handleSaveUser = (userData: Omit<User, "id" | "status">) => {
    if (formModal.modo === "INSERCION") {
      addUser({ ...userData, status: "Activo" });
      const tempPass = Math.random().toString(36).slice(-8).toUpperCase();
      setCreatedUserAuth({ email: userData.email, tempPass });
    } else if (formModal.modo === "EDICION" && formModal.user) {
      updateUser(formModal.user.id, userData);
    }
    setFormModal({ open: false, modo: "INSERCION", user: null });
  };

  const handleConfirmDeactivate = (motivo: string, detalle: string) => {
    if (deactivateModal.user) {
      deactivateUser(deactivateModal.user.id);
      console.log("Motivo de baja:", motivo, "Detalle:", detalle);
    }
    setDeactivateModal({ open: false, user: null });
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
                <h1 className="font-display text-2xl font-bold text-on-surface print:text-xl print:text-black">Usuarios del sistema</h1>
                <p className="text-sm font-medium text-on-surface-variant print:text-black/70">
                  Listado completo del personal.
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

          {/* Filtros */}
          <div className="rounded-md border border-outline-variant bg-surface-container-lowest p-4 shadow-card print:hidden">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex flex-1 flex-col gap-1 min-w-[240px]">
                <label htmlFor="search" className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
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
                <label htmlFor="role" className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
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
                  <option value="Profesor">Profesor</option>
                  <option value="Gerente">Gerente</option>
                  <option value="Mesa de Entrada">Mesa de Entrada</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="status" className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
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
                  <option value="Todos">Todos</option>
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
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
          />
        </div>
      </main>

      <UserFormModal
        open={formModal.open}
        modo={formModal.modo}
        user={formModal.user}
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
      />

      <Modal
        open={createdUserAuth !== null}
        onClose={() => setCreatedUserAuth(null)}
        title="Usuario creado exitosamente"
        maxWidth="max-w-md"
        icon={
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-status-success-strong/10 text-status-success-strong">
            <Icon name="check_circle" size={24} />
          </div>
        }
        footer={
          <Button type="button" variant="primary" onClick={() => setCreatedUserAuth(null)}>
            Entendido
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-on-surface-variant">
            Como el envío de correos aún no está implementado, copiá la contraseña temporal para compartirla con el usuario <strong>{createdUserAuth?.email}</strong>.
          </p>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Contraseña temporal
            </span>
            <div className="flex items-center justify-between rounded-md border border-outline-variant bg-surface-container-low p-4">
              <span className="font-mono text-xl font-bold tracking-widest text-on-surface">
                {createdUserAuth?.tempPass}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (createdUserAuth?.tempPass) {
                    navigator.clipboard.writeText(createdUserAuth.tempPass);
                  }
                }}
                className="flex items-center gap-2 rounded-sm px-3 py-1.5 text-sm font-bold text-secondary transition-colors hover:bg-secondary/10"
              >
                <Icon name="content_copy" size={18} />
                Copiar
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
