import { useState, useMemo } from 'react';

export type Role = 'Profesor' | 'Gerente' | 'Mesa de Entrada';
export type Status = 'Activo' | 'Inactivo';

export interface User {
  id: number;
  firstName: string;
  lastName: string;
  dni: string;
  email: string;
  phone: string;
  role: Role;
  status: Status;
}

const mockUsers: User[] = [
  { id: 1, firstName: 'Lucía', lastName: 'Acosta', dni: '32456789', email: 'lacosta@centro.edu.ar', phone: '3874123456', role: 'Profesor', status: 'Activo' },
  { id: 2, firstName: 'Carlos', lastName: 'Benítez', dni: '28991203', email: 'cbenitez@centro.edu.ar', phone: '3871558812', role: 'Gerente', status: 'Activo' },
  { id: 3, firstName: 'Mariana', lastName: 'Castro', dni: '35120448', email: 'mcastro@centro.edu.ar', phone: '', role: 'Mesa de Entrada', status: 'Activo' },
  { id: 4, firstName: 'Tomás', lastName: 'Díaz', dni: '40233517', email: 'tdiaz@centro.edu.ar', phone: '3874990021', role: 'Profesor', status: 'Activo' },
  { id: 5, firstName: 'Sofía', lastName: 'Fernández', dni: '37645120', email: 'sfernandez@centro.edu.ar', phone: '3876104477', role: 'Profesor', status: 'Activo' },
  { id: 6, firstName: 'Laura', lastName: 'Gómez', dni: '33307899', email: 'lgomez@centro.edu.ar', phone: '3874332100', role: 'Mesa de Entrada', status: 'Activo' },
  { id: 7, firstName: 'Federico', lastName: 'Luna', dni: '33678214', email: 'fluna@centro.edu.ar', phone: '', role: 'Profesor', status: 'Activo' },
  { id: 8, firstName: 'Andrés', lastName: 'Pérez', dni: '29540332', email: 'aperez@centro.edu.ar', phone: '3875017789', role: 'Profesor', status: 'Activo' },
];

export function useUsers() {
  const [users, setUsers] = useState<User[]>(mockUsers);
  
  // Search and filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | 'Todos'>('Todos');
  const [statusFilter, setStatusFilter] = useState<Status | 'Todos'>('Activo');

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Derived state: filtered and sorted users
  const filteredUsers = useMemo(() => {
    return users
      .filter((user) => {
        const matchesSearch = 
          user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.dni.includes(searchTerm);
        
        const matchesRole = roleFilter === 'Todos' || user.role === roleFilter;
        const matchesStatus = statusFilter === 'Todos' || user.status === statusFilter;

        return matchesSearch && matchesRole && matchesStatus;
      })
      .sort((a, b) => {
        const nameA = `${a.lastName} ${a.firstName}`.toLowerCase();
        const nameB = `${b.lastName} ${b.firstName}`.toLowerCase();
        return nameA.localeCompare(nameB);
      });
  }, [users, searchTerm, roleFilter, statusFilter]);

  // Pagination calculations
  const totalItems = filteredUsers.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedUsers = filteredUsers.slice((page - 1) * pageSize, page * pageSize);
  const pageStart = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const pageEnd = Math.min(page * pageSize, totalItems);

  // CRUD actions
  const addUser = (user: Omit<User, 'id'>) => {
    const newUser = { ...user, id: Math.max(0, ...users.map(u => u.id)) + 1 };
    setUsers([...users, newUser]);
  };

  const updateUser = (id: number, data: Partial<User>) => {
    setUsers(users.map(u => u.id === id ? { ...u, ...data } : u));
  };

  const deactivateUser = (id: number) => {
    updateUser(id, { status: 'Inactivo' });
  };

  // Validations
  const checkDuplicate = (dni: string, email: string, currentId?: number) => {
    const activeUsers = users.filter(u => u.status === 'Activo' && u.id !== currentId);
    return {
      dniExists: activeUsers.some(u => u.dni === dni),
      emailExists: activeUsers.some(u => u.email.toLowerCase() === email.toLowerCase())
    };
  };

  return {
    users: paginatedUsers,
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
  };
}
