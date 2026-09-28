// src/modules/alumnos/useStudents.ts
//
// Custom hook `useStudents` para la gestión completa de alumnos e historial
// (HU-ALU-02). Simula el CRUD en frontend con estado reactivo y aplica
// estrictamente las reglas de negocio acordadas en contratos de API:
//
// 1. Unicidad de DNI en alumnos activos (creación, edición y reactivación).
// 2. Bloqueo de baja si posee turnos futuros reservados (ALUMNO_CON_TURNOS_FUTUROS).
// 3. Advertencia de deuda pendiente al inactivar (ALUMNO_CON_DEUDA) con confirmación explícita.
// 4. Registro continuo en bitácora de auditoría (Alta, Modificación, Baja, Reactivación).

import { useState, useCallback } from "react";
import type {
  StudentUI,
  StudentAuditLog,
} from "./types";
import { INITIAL_STUDENTS_MOCK, INITIAL_AUDIT_LOGS_MOCK } from "./mock-students";

export interface DeactivateResult {
  success: boolean;
  code?: "ALUMNO_CON_TURNOS_FUTUROS" | "ALUMNO_CON_DEUDA" | "NO_ENCONTRADO";
  message?: string;
  turnosFuturos?: StudentUI["turnosFuturos"];
  detalleDeuda?: StudentUI["detalleDeuda"];
}

export interface ReactivateResult {
  success: boolean;
  code?: "DNI_DUPLICADO" | "NO_ENCONTRADO";
  message?: string;
  conflictStudent?: StudentUI;
}

export function useStudents() {
  const [students, setStudents] = useState<StudentUI[]>(INITIAL_STUDENTS_MOCK);
  const [auditLogs, setAuditLogs] = useState<StudentAuditLog[]>(INITIAL_AUDIT_LOGS_MOCK);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Helper para formatear fecha y hora actual según huso horario de Argentina.
   */
  const getNowAR = useCallback(() => {
    const now = new Date();
    const fecha = now.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "America/Argentina/Buenos_Aires",
    });
    const hora = now.toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "America/Argentina/Buenos_Aires",
    });
    return { fecha, hora, iso: now.toISOString() };
  }, []);

  /**
   * Valida si un DNI ya pertenece a otro alumno ACTIVO.
   */
  const checkDniDuplicate = useCallback(
    (dni: string, excludeId?: number): StudentUI | undefined => {
      const cleanDni = dni.trim();
      return students.find(
        (s) => s.estado === "activo" && s.dni === cleanDni && s.id !== excludeId
      );
    },
    [students]
  );

  /**
   * Alta de nuevo alumno (simula POST /api/alumnos).
   */
  const createStudent = useCallback(
    async (
      data: Omit<
        StudentUI,
        "id" | "legajo" | "fechaCreacion" | "fechaActualizacion" | "estado"
      >
    ): Promise<StudentUI> => {
      setLoading(true);
      setError(null);

      // Simular latencia de red
      await new Promise((r) => setTimeout(r, 200));

      const conflict = checkDniDuplicate(data.dni);
      if (conflict) {
        setLoading(false);
        const msg = `Ya existe un alumno activo con el DNI ${data.dni} (${conflict.apellido}, ${conflict.nombre} - ${conflict.legajo}).`;
        setError(msg);
        throw new Error(msg);
      }

      const { fecha, hora, iso } = getNowAR();
      const nextId = students.length > 0 ? Math.max(...students.map((s) => s.id)) + 1 : 1;
      const legajoNum = (150 + nextId).toString().padStart(4, "0");
      const legajo = `A-${legajoNum}`;

      const newStudent: StudentUI = {
        ...data,
        id: nextId,
        legajo,
        estado: "activo",
        deudaPendiente: false,
        hasPendingDebt: false,
        futureTurnsCount: 0,
        turnosFuturos: [],
        fechaCreacion: iso,
        fechaActualizacion: iso,
      };

      setStudents((prev) => [newStudent, ...prev]);

      // Registrar en Bitácora
      const newLog: StudentAuditLog = {
        id: Date.now(),
        alumnoId: nextId,
        fecha,
        hora,
        responsable: "Laura Gómez",
        accion: "Alta",
        campo: "Estado",
        valorAnterior: "—",
        valorNuevo: "Activo",
        operacion: "INSERT",
      };
      setAuditLogs((prev) => [newLog, ...prev]);

      setLoading(false);
      return newStudent;
    },
    [checkDniDuplicate, getNowAR, students]
  );

  /**
   * Edición de alumno (simula PUT /api/alumnos/:id).
   */
  const updateStudent = useCallback(
    async (id: number, data: Partial<StudentUI>): Promise<StudentUI> => {
      setLoading(true);
      setError(null);

      await new Promise((r) => setTimeout(r, 200));

      const current = students.find((s) => s.id === id);
      if (!current) {
        setLoading(false);
        throw new Error("Alumno no encontrado.");
      }

      if (data.dni && data.dni !== current.dni) {
        const conflict = checkDniDuplicate(data.dni, id);
        if (conflict) {
          setLoading(false);
          const msg = `Ya existe otro alumno activo con el DNI ${data.dni} (${conflict.apellido}, ${conflict.nombre}).`;
          setError(msg);
          throw new Error(msg);
        }
      }

      const { fecha, hora, iso } = getNowAR();
      const updated: StudentUI = {
        ...current,
        ...data,
        id: current.id,
        legajo: current.legajo, // Inmutable
        fechaCreacion: current.fechaCreacion, // Inmutable
        fechaActualizacion: iso,
      };

      setStudents((prev) => prev.map((s) => (s.id === id ? updated : s)));

      // Detectar cambios clave y registrar en bitácora
      const logsToAdd: StudentAuditLog[] = [];
      if (data.materiasInteres) {
        const oldMat = current.materiasInteres.map((m) => m.nombre).join(", ");
        const newMat = data.materiasInteres.map((m) => m.nombre).join(", ");
        if (oldMat !== newMat) {
          logsToAdd.push({
            id: Date.now() + 1,
            alumnoId: id,
            fecha,
            hora,
            responsable: "Laura Gómez",
            accion: "Modificación",
            campo: "Materias de interés",
            valorAnterior: oldMat || "—",
            valorNuevo: newMat || "—",
            operacion: "UPDATE",
          });
        }
      }

      if (data.institucionOrigen !== undefined && data.institucionOrigen !== current.institucionOrigen) {
        logsToAdd.push({
          id: Date.now() + 2,
          alumnoId: id,
          fecha,
          hora,
          responsable: "Laura Gómez",
          accion: "Modificación",
          campo: "Institución de origen",
          valorAnterior: current.institucionOrigen || "—",
          valorNuevo: data.institucionOrigen || "—",
          operacion: "UPDATE",
        });
      }

      if (data.dni && data.dni !== current.dni) {
        logsToAdd.push({
          id: Date.now() + 3,
          alumnoId: id,
          fecha,
          hora,
          responsable: "Laura Gómez",
          accion: "Modificación",
          campo: "DNI",
          valorAnterior: current.dni,
          valorNuevo: data.dni,
          operacion: "UPDATE",
        });
      }

      if (logsToAdd.length === 0) {
        logsToAdd.push({
          id: Date.now(),
          alumnoId: id,
          fecha,
          hora,
          responsable: "Laura Gómez",
          accion: "Modificación",
          campo: "Datos personales",
          valorAnterior: "Ficha anterior",
          valorNuevo: "Ficha actualizada",
          operacion: "UPDATE",
        });
      }

      setAuditLogs((prev) => [...logsToAdd, ...prev]);

      setLoading(false);
      return updated;
    },
    [checkDniDuplicate, getNowAR, students]
  );

  /**
   * Baja lógica de alumno (simula POST /api/alumnos/:id/inactivar).
   *
   * Aplica reglas de negocio estrictas:
   * - Caso A (Bloqueo): futureTurnsCount > 0
   * - Caso B (Advertencia): hasPendingDebt === true y no confirmó con deuda
   */
  const deactivateStudent = useCallback(
    async (
      id: number,
      options?: { confirmarConDeuda?: boolean }
    ): Promise<DeactivateResult> => {
      setLoading(true);
      setError(null);

      await new Promise((r) => setTimeout(r, 150));

      const student = students.find((s) => s.id === id);
      if (!student) {
        setLoading(false);
        return { success: false, code: "NO_ENCONTRADO", message: "Alumno no encontrado." };
      }

      // CASO A: Bloqueo duro por turnos futuros
      const turnosFuturos = student.futureTurnsCount ?? 0;
      if (turnosFuturos > 0) {
        setLoading(false);
        return {
          success: false,
          code: "ALUMNO_CON_TURNOS_FUTUROS",
          message: `Tiene ${turnosFuturos} turnos futuros en estado Reservado. Cancelalos antes de continuar con la baja.`,
          turnosFuturos: student.turnosFuturos ?? [],
        };
      }

      // CASO B: Advertencia por deuda pendiente
      const tieneDeuda = Boolean(student.hasPendingDebt || student.deudaPendiente);
      if (tieneDeuda && !options?.confirmarConDeuda) {
        setLoading(false);
        return {
          success: false,
          code: "ALUMNO_CON_DEUDA",
          message:
            student.detalleDeuda?.descripcion ??
            "El alumno posee deuda pendiente. Podés continuar con la baja; la deuda queda registrada.",
          detalleDeuda: student.detalleDeuda,
        };
      }

      // Efectuar baja lógica
      const { fecha, hora, iso } = getNowAR();
      setStudents((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, estado: "inactivo", fechaActualizacion: iso } : s
        )
      );

      // Registrar en Bitácora
      const logBaja: StudentAuditLog = {
        id: Date.now(),
        alumnoId: id,
        fecha,
        hora,
        responsable: "Laura Gómez",
        accion: "Baja",
        campo: "Estado",
        valorAnterior: "Activo",
        valorNuevo: "Inactivo",
        operacion: "UPDATE",
      };
      setAuditLogs((prev) => [logBaja, ...prev]);

      setLoading(false);
      return { success: true };
    },
    [getNowAR, students]
  );

  /**
   * Reactivación de alumno inactivo (simula POST /api/alumnos/:id/reactivar).
   *
   * Regla de negocio:
   * - Valida que el DNI del alumno a reactivar NO colisione con otro alumno activo.
   */
  const reactivateStudent = useCallback(
    async (id: number): Promise<ReactivateResult> => {
      setLoading(true);
      setError(null);

      await new Promise((r) => setTimeout(r, 150));

      const student = students.find((s) => s.id === id);
      if (!student) {
        setLoading(false);
        return { success: false, code: "NO_ENCONTRADO", message: "Alumno no encontrado." };
      }

      // Validar choque de DNI con otro alumno ACTIVO
      const conflict = checkDniDuplicate(student.dni, id);
      if (conflict) {
        setLoading(false);
        return {
          success: false,
          code: "DNI_DUPLICADO",
          message: `No se puede reactivar: ya existe un alumno activo con el DNI ${student.dni} (${conflict.apellido}, ${conflict.nombre} - ${conflict.legajo}).`,
          conflictStudent: conflict,
        };
      }

      const { fecha, hora, iso } = getNowAR();
      setStudents((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, estado: "activo", fechaActualizacion: iso } : s
        )
      );

      // Registrar en Bitácora
      const logReactivar: StudentAuditLog = {
        id: Date.now(),
        alumnoId: id,
        fecha,
        hora,
        responsable: "Laura Gómez",
        accion: "Reactivación",
        campo: "Estado",
        valorAnterior: "Inactivo",
        valorNuevo: "Activo",
        operacion: "UPDATE",
      };
      setAuditLogs((prev) => [logReactivar, ...prev]);

      setLoading(false);
      return { success: true };
    },
    [checkDniDuplicate, getNowAR, students]
  );

  /**
   * Obtiene un alumno por su ID.
   */
  const getStudentById = useCallback(
    (id: number): StudentUI | undefined => {
      return students.find((s) => s.id === id);
    },
    [students]
  );

  /**
   * Obtiene la bitácora de auditoría asociada a un alumno.
   */
  const getAuditLogsForStudent = useCallback(
    (alumnoId: number): StudentAuditLog[] => {
      return auditLogs.filter((log) => log.alumnoId === alumnoId);
    },
    [auditLogs]
  );

  return {
    students,
    auditLogs,
    loading,
    error,
    createStudent,
    updateStudent,
    deactivateStudent,
    reactivateStudent,
    getStudentById,
    getAuditLogsForStudent,
    checkDniDuplicate,
  };
}
