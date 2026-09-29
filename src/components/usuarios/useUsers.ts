import { useState, useMemo, useEffect, useCallback } from "react";
import {
  listarUsuarios,
  crearUsuario,
  editarUsuario,
  inactivarUsuario,
  reactivarUsuario,
  listarRoles,
  listarMotivosBaja,
  type UsuarioResponse,
  type RolResponse,
  type MotivoBajaResponse,
  type CrearUsuarioBody,
  type EditarUsuarioBody,
} from "@/data/usuarios";
import { sesionActual } from "@/data/auth";

export type Role = "Profesor" | "Gerente" | "Mesa de Entrada";
export type Status = "Activo" | "Inactivo";

export interface User {
  id: number;
  firstName: string;
  lastName: string;
  dni: string;
  email: string;
  phone: string;
  role: Role;
  roleId: number;
  status: Status;
  academiaId: number | null;
  academiaNombre?: string | null;
  bloqueadoHasta?: string | null;
  fechaCreacion?: string;
  motivoBaja?: { id: number; nombre: string } | null;
  detalleMotivoBaja?: string | null;
  fechaBaja?: string | null;
  passwordTemporal?: string;
}

function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function aUser(resp: UsuarioResponse): User {
  return {
    id: resp.id,
    firstName: resp.nombre,
    lastName: resp.apellido,
    dni: resp.dni,
    email: resp.email,
    phone: resp.telefono ?? "",
    role: resp.rol.nombre as Role,
    roleId: resp.rol.id,
    status: resp.estado === "activo" ? "Activo" : "Inactivo",
    academiaId: resp.academia?.id ?? null,
    academiaNombre: resp.academia?.nombre ?? null,
    bloqueadoHasta: resp.bloqueadoHasta,
    fechaCreacion: resp.fechaCreacion,
    motivoBaja: resp.motivoBaja ?? null,
    detalleMotivoBaja: resp.detalleMotivoBaja ?? null,
    fechaBaja: resp.fechaBaja ?? null,
    passwordTemporal: resp.passwordTemporal,
  };
}

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<RolResponse[]>([]);
  const [motivosBaja, setMotivosBaja] = useState<MotivoBajaResponse[]>([]);
  const [currentSessionUser, setCurrentSessionUser] = useState<{ id: number; email: string; rol: string } | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search and filters state
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "Todos">("Todos");
  const [statusFilter, setStatusFilter] = useState<Status | "Todos">("Activo");

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Carga inicial y recarga
  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usuariosRes, rolesRes, motivosRes, sesionRes] = await Promise.all([
        listarUsuarios({ verInactivos: true }),
        listarRoles(),
        listarMotivosBaja(),
        sesionActual(),
      ]);

      setUsers(usuariosRes.map(aUser));
      setRoles(rolesRes);
      setMotivosBaja(motivosRes);
      if (sesionRes) {
        setCurrentSessionUser({
          id: sesionRes.usuario.id,
          email: sesionRes.usuario.email,
          rol: sesionRes.usuario.rol.nombre,
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al cargar usuarios.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelado = false;
    Promise.all([
      listarUsuarios({ verInactivos: true }),
      listarRoles(),
      listarMotivosBaja(),
      sesionActual(),
    ])
      .then(([usuariosRes, rolesRes, motivosRes, sesionRes]) => {
        if (cancelado) return;
        setUsers(usuariosRes.map(aUser));
        setRoles(rolesRes);
        setMotivosBaja(motivosRes);
        if (sesionRes?.usuario) {
          setCurrentSessionUser({
            id: sesionRes.usuario.id,
            email: sesionRes.usuario.email,
            rol: sesionRes.usuario.rol.nombre,
          });
        }
        setLoading(false);
      })
      .catch((e) => {
        if (cancelado) return;
        const msg = e instanceof Error ? e.message : "Error al cargar usuarios.";
        setError(msg);
        setLoading(false);
      });

    return () => {
      cancelado = true;
    };
  }, []);

  // Derived state: filtered and sorted users
  // Criterios:
  // - Por defecto activos
  // - Ordenado alfabéticamente por Apellido y luego por Nombre (A-Z)
  // - Filtros combinables simultáneos por Rol y Estado
  // - Buscador por Nombre, Apellido o DNI insensible a mayúsculas/minúsculas y acentos
  const filteredUsers = useMemo(() => {
    const term = normalizarTexto(searchTerm.trim());

    return users
      .filter((user) => {
        const fullName = `${user.lastName} ${user.firstName}`;
        const matchesSearch =
          term === "" ||
          normalizarTexto(user.firstName).includes(term) ||
          normalizarTexto(user.lastName).includes(term) ||
          normalizarTexto(fullName).includes(term) ||
          user.dni.includes(term);

        const matchesRole = roleFilter === "Todos" || user.role === roleFilter;
        const matchesStatus = statusFilter === "Todos" || user.status === statusFilter;

        return matchesSearch && matchesRole && matchesStatus;
      })
      .sort((a, b) => {
        const compApellido = a.lastName.localeCompare(b.lastName, "es", { sensitivity: "base" });
        if (compApellido !== 0) return compApellido;
        return a.firstName.localeCompare(b.firstName, "es", { sensitivity: "base" });
      });
  }, [users, searchTerm, roleFilter, statusFilter]);

  // Pagination calculations
  const totalItems = filteredUsers.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedUsers = filteredUsers.slice((page - 1) * pageSize, page * pageSize);
  const pageStart = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const pageEnd = Math.min(page * pageSize, totalItems);

  // CRUD actions conectados al backend
  const addUser = async (userData: {
    firstName: string;
    lastName: string;
    dni: string;
    email: string;
    phone: string;
    role: Role;
    roleId?: number;
    academiaId?: number | null;
  }) => {
    const matchedRol = roles.find((r) => r.nombre === userData.role);
    const rolId = userData.roleId ?? matchedRol?.id ?? (userData.role === "Gerente" ? 1 : userData.role === "Profesor" ? 2 : 3);

    const body: CrearUsuarioBody = {
      nombre: userData.firstName.trim(),
      apellido: userData.lastName.trim(),
      dni: userData.dni.trim(),
      email: userData.email.trim().toLowerCase(),
      telefono: userData.phone.trim() ? userData.phone.trim() : null,
      rolId,
      // Si el rol es Profesor, la base/service exige academiaId (default 1 si no se proveyó)
      academiaId: userData.role === "Profesor" ? (userData.academiaId ?? 1) : null,
    };

    const creado = await crearUsuario(body);
    const nuevoUser = aUser(creado);
    setUsers((prev) => [nuevoUser, ...prev]);
    return nuevoUser;
  };

  const updateUser = async (
    id: number,
    data: {
      firstName: string;
      lastName: string;
      dni: string;
      email: string;
      phone: string;
      role: Role;
      roleId?: number;
      academiaId?: number | null;
    },
  ) => {
    const matchedRol = roles.find((r) => r.nombre === data.role);
    const rolId = data.roleId ?? matchedRol?.id ?? (data.role === "Gerente" ? 1 : data.role === "Profesor" ? 2 : 3);

    const body: EditarUsuarioBody = {
      nombre: data.firstName.trim(),
      apellido: data.lastName.trim(),
      dni: data.dni.trim(),
      email: data.email.trim().toLowerCase(),
      telefono: data.phone.trim() ? data.phone.trim() : null,
      rolId,
      academiaId: data.role === "Profesor" ? (data.academiaId ?? 1) : null,
    };

    const actualizado = await editarUsuario(id, body);
    const userActualizado = aUser(actualizado);
    setUsers((prev) => prev.map((u) => (u.id === id ? userActualizado : u)));
    return userActualizado;
  };

  const deactivateUser = async (id: number, motivoBajaId: number, detalleMotivoBaja?: string) => {
    const inactivado = await inactivarUsuario(id, {
      motivoBajaId,
      detalleMotivoBaja: detalleMotivoBaja?.trim() ? detalleMotivoBaja.trim() : null,
    });
    const userInactivado = aUser(inactivado);
    setUsers((prev) => prev.map((u) => (u.id === id ? userInactivado : u)));
    return userInactivado;
  };

  const reactivateUserAction = async (id: number) => {
    const reactivado = await reactivarUsuario(id);
    const userReactivado = aUser(reactivado);
    setUsers((prev) => prev.map((u) => (u.id === id ? userReactivado : u)));
    return userReactivado;
  };

  // Validaciones locales rápidas
  const checkDuplicate = (dni: string, email: string, currentId?: number) => {
    const activeUsers = users.filter((u) => u.status === "Activo" && u.id !== currentId);
    return {
      dniExists: activeUsers.some((u) => u.dni === dni.trim()),
      emailExists: activeUsers.some((u) => u.email.toLowerCase() === email.trim().toLowerCase()),
    };
  };

  // Contar gerentes activos para validación de UI
  const activeGerentesCount = useMemo(() => {
    return users.filter((u) => u.status === "Activo" && u.role === "Gerente").length;
  }, [users]);

  return {
    users: paginatedUsers,
    allUsers: users,
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
    reload: cargarDatos,
    roles,
    motivosBaja,
    currentSessionUser,
    activeGerentesCount,
    addUser,
    updateUser,
    deactivateUser,
    reactivateUser: reactivateUserAction,
    checkDuplicate,
  };
}
