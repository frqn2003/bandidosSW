import { User } from "./useUsers";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Icon } from "@/components/ui/Icon";
import { Pagination } from "@/components/ui/Pagination";

interface UsersTableProps {
  users: User[];
  page: number;
  totalPages: number;
  totalItems: number;
  pageStart: number;
  pageEnd: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onView: (user: User) => void;
  onEdit: (user: User) => void;
  onDeactivate: (user: User) => void;
}

export function UsersTable({
  users,
  page,
  totalPages,
  totalItems,
  pageStart,
  pageEnd,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onView,
  onEdit,
  onDeactivate,
}: UsersTableProps) {
  const getBadgeVariant = (status: string) => (status === "Activo" ? "success" : "neutral");
  const getBadgeIcon = (status: string) => (status === "Activo" ? "check_circle" : "cancel");

  return (
    <div className="flex flex-col rounded-md border border-outline-variant bg-surface-container-lowest shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-outline-variant bg-surface-container-low text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
              <th className="px-4 py-3">Apellido y Nombre</th>
              <th className="px-4 py-3">DNI</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Teléfono</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right print:hidden">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/60">
            {users.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-on-surface-variant">
                  No se encontraron usuarios.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="text-sm transition-colors hover:bg-surface-container-low/50">
                  <td className="px-4 py-3 font-semibold text-on-surface">
                    {user.lastName}, {user.firstName}
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant">{user.dni}</td>
                  <td className="px-4 py-3 text-on-surface-variant">{user.email}</td>
                  <td className="px-4 py-3 text-on-surface-variant">{user.phone || "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-sm font-bold ${
                        user.role === "Profesor"
                          ? "bg-purple-100 text-purple-700"
                          : user.role === "Gerente"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-teal-100 text-teal-700"
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      variant={getBadgeVariant(user.status)}
                      icon={getBadgeIcon(user.status)}
                      label={user.status}
                    />
                  </td>
                  <td className="px-4 py-3 text-right print:hidden">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onView(user)}
                        aria-label="Ver usuario"
                        className="flex h-8 w-8 items-center justify-center rounded-md text-secondary transition-colors hover:bg-primary/10 hover:text-primary focus:outline-none"
                      >
                        <Icon name="visibility" size={20} />
                      </button>
                      <button
                        onClick={() => onEdit(user)}
                        aria-label="Editar usuario"
                        className="flex h-8 w-8 items-center justify-center rounded-md text-secondary transition-colors hover:bg-primary/10 hover:text-primary focus:outline-none"
                      >
                        <Icon name="edit" size={20} />
                      </button>
                      <button
                        onClick={() => onDeactivate(user)}
                        aria-label="Dar de baja usuario"
                        disabled={user.status === "Inactivo"}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-error transition-colors hover:bg-error/10 hover:text-error focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Icon name="delete" size={20} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {users.length > 0 && (
        <div className="border-t border-outline-variant print:hidden">
          <Pagination
            page={page}
            totalPages={totalPages}
            totalItems={totalItems}
            pageStart={pageStart}
            pageEnd={pageEnd}
            pageSize={pageSize}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            itemLabel="usuarios"
          />
        </div>
      )}
    </div>
  );
}
