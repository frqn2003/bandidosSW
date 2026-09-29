// src/modules/alumnos/useStudents.ts
//
// Custom hook `useStudents` para la gestión completa de alumnos e historial
// (HU-ALU-02). Conecta con la API mediante los contratos oficiales y proporciona
// fallback reactivo para desarrollo. Aplica estrictamente las reglas de negocio:
//
// 1. Unicidad de DNI en alumnos activos (creación, edición y reactivación).
// 2. Bloqueo de baja si posee turnos futuros reservados (ALUMNO_CON_TURNOS_FUTUROS).
// 3. Advertencia de deuda pendiente al inactivar (ALUMNO_CON_DEUDA) con confirmación explícita.
// 4. Registro continuo en bitácora de auditoría (Alta, Modificación, Baja, Reactivación).

import { useState, useCallback, useEffect } from "react";
import type {
  StudentUI,
  StudentAuditLog,
} from "./types";
import {
  listarAlumnos,
  crearAlumno,
  editarAlumno,
  inactivarAlumno,
  reactivarAlumno,
  type AlumnoResponse,
  type CrearAlumnoBody,
  type EditarAlumnoBody,
} from "@/data/alumnos";
import { listarMaterias } from "@/data/materias";
import { sesionActual } from "@/data/auth";
import { ApiError } from "@/lib/api-client";

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

function toStudentUI(resp: AlumnoResponse, existing?: StudentUI): StudentUI {
  return {
    ...resp,
    futureTurnsCount: existing?.futureTurnsCount ?? 0,
    hasPendingDebt: resp.deudaPendiente ?? existing?.hasPendingDebt ?? false,
    turnosFuturos: existing?.turnosFuturos ?? [],
    detalleDeuda: existing?.detalleDeuda,
  };
}

export function useStudents() {
  const [students, setStudents] = useState<StudentUI[]>([]);
  const [auditLogs, setAuditLogs] = useState<StudentAuditLog[]>([]);
  const [materiasActivas, setMateriasActivas] = useState<{ id: number; nombre: string }[]>([]);
  const [currentUserName, setCurrentUserName] = useState<string>("Sistema");
  const [loading, setLoading] = useState(true);
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
   * Carga inicial desde la API mediante los contratos de backend.
   */
  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [alumnosRes, materiasRes, sesionRes] = await Promise.all([
        listarAlumnos({ verInactivos: true }),
        listarMaterias({ estado: "activo" }).catch(() => []),
        sesionActual().catch(() => null),
      ]);

      if (alumnosRes) {
        setStudents((prev) => {
          const prevMap = new Map(prev.map((s) => [s.id, s]));
          return alumnosRes.map((r) => toStudentUI(r, prevMap.get(r.id)));
        });
      }

      if (materiasRes) {
        setMateriasActivas(materiasRes.map((m) => ({ id: m.id, nombre: m.nombre })));
      }

      if (sesionRes?.usuario) {
        const u = sesionRes.usuario;
        setCurrentUserName(u.nombre ? `${u.nombre} ${u.apellido}` : u.email);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al cargar alumnos.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelado = false;
    Promise.all([
      listarAlumnos({ verInactivos: true }),
      listarMaterias({ estado: "activo" }).catch(() => []),
      sesionActual().catch(() => null),
    ])
      .then(([alumnosRes, materiasRes, sesionRes]) => {
        if (cancelado) return;
        if (alumnosRes) {
          setStudents((prev) => {
            const prevMap = new Map(prev.map((s) => [s.id, s]));
            return alumnosRes.map((r) => toStudentUI(r, prevMap.get(r.id)));
          });
        }
        if (materiasRes) {
          setMateriasActivas(materiasRes.map((m) => ({ id: m.id, nombre: m.nombre })));
        }
        if (sesionRes?.usuario) {
          const u = sesionRes.usuario;
          setCurrentUserName(u.nombre ? `${u.nombre} ${u.apellido}` : u.email);
        }
        setLoading(false);
      })
      .catch((e) => {
        if (cancelado) return;
        const msg = e instanceof Error ? e.message : "Error al cargar alumnos.";
        setError(msg);
        setLoading(false);
      });

    return () => {
      cancelado = true;
    };
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
   * Alta de nuevo alumno conectada a POST /api/alumnos.
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

      const conflictLocal = checkDniDuplicate(data.dni);
      if (conflictLocal) {
        setLoading(false);
        const msg = `Ya existe un alumno activo con el DNI ${data.dni} (${conflictLocal.apellido}, ${conflictLocal.nombre} - ${conflictLocal.legajo}).`;
        setError(msg);
        throw new Error(msg);
      }

      const body: CrearAlumnoBody = {
        nombre: data.nombre.trim(),
        apellido: data.apellido.trim(),
        dni: data.dni.trim(),
        fechaNacimiento: data.fechaNacimiento,
        telefono: data.telefono.trim(),
        email: data.email?.trim() || null,
        nivelEducativo: data.nivelEducativo,
        responsableNombre: data.responsable?.nombre?.trim() || null,
        responsableDni: data.responsable?.dni?.trim() || null,
        responsableTelefono: data.responsable?.telefono?.trim() || null,
        institucionOrigen: data.institucionOrigen?.trim() || null,
        observacionesGenerales: data.observacionesGenerales?.trim() || null,
        materiasInteresIds: data.materiasInteres?.map((m) => m.id) ?? [],
      };

      let newStudent: StudentUI;
      const { fecha, hora, iso } = getNowAR();

      try {
        const created = await crearAlumno(body);
        newStudent = toStudentUI(created);
      } catch (err) {
        if (err instanceof ApiError) {
          setLoading(false);
          if (err.codigo === "DNI_DUPLICADO") {
            const msg = `Ya existe un alumno activo con el DNI ${data.dni}.`;
            setError(msg);
            throw new Error(msg);
          }
          setError(err.message);
          throw err;
        }

        // Fallback local si el servidor no está disponible
        const nextId = students.length > 0 ? Math.max(...students.map((s) => s.id)) + 1 : 1;
        const legajoNum = (150 + nextId).toString().padStart(4, "0");
        const legajo = `A-${legajoNum}`;

        newStudent = {
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
      }

      setStudents((prev) => [newStudent, ...prev]);

      // Registrar en Bitácora
      const newLog: StudentAuditLog = {
        id: Date.now(),
        alumnoId: newStudent.id,
        fecha,
        hora,
        responsable: currentUserName,
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
    [checkDniDuplicate, currentUserName, getNowAR, students]
  );

  /**
   * Edición de alumno conectada a PUT /api/alumnos/:id.
   */
  const updateStudent = useCallback(
    async (id: number, data: Partial<StudentUI>): Promise<StudentUI> => {
      setLoading(true);
      setError(null);

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

      const body: EditarAlumnoBody = {
        nombre: (data.nombre ?? current.nombre).trim(),
        apellido: (data.apellido ?? current.apellido).trim(),
        dni: (data.dni ?? current.dni).trim(),
        fechaNacimiento: data.fechaNacimiento ?? current.fechaNacimiento,
        telefono: (data.telefono ?? current.telefono).trim(),
        email: data.email !== undefined ? (data.email?.trim() || null) : current.email,
        nivelEducativo: data.nivelEducativo ?? current.nivelEducativo,
        responsableNombre:
          data.responsable !== undefined
            ? data.responsable?.nombre?.trim() || null
            : current.responsable?.nombre ?? null,
        responsableDni:
          data.responsable !== undefined
            ? data.responsable?.dni?.trim() || null
            : current.responsable?.dni ?? null,
        responsableTelefono:
          data.responsable !== undefined
            ? data.responsable?.telefono?.trim() || null
            : current.responsable?.telefono ?? null,
        institucionOrigen:
          data.institucionOrigen !== undefined
            ? data.institucionOrigen?.trim() || null
            : current.institucionOrigen,
        observacionesGenerales:
          data.observacionesGenerales !== undefined
            ? data.observacionesGenerales?.trim() || null
            : current.observacionesGenerales,
        materiasInteresIds:
          data.materiasInteres !== undefined
            ? data.materiasInteres.map((m) => m.id)
            : current.materiasInteres?.map((m) => m.id) ?? [],
      };

      let updatedStudent: StudentUI;
      const { fecha, hora, iso } = getNowAR();

      try {
        const updated = await editarAlumno(id, body);
        updatedStudent = toStudentUI(updated, current);
      } catch (err) {
        if (err instanceof ApiError) {
          setLoading(false);
          if (err.codigo === "DNI_DUPLICADO") {
            const msg = `Ya existe otro alumno activo con el DNI ${data.dni}.`;
            setError(msg);
            throw new Error(msg);
          }
          setError(err.message);
          throw err;
        }

        // Fallback local
        updatedStudent = {
          ...current,
          ...data,
          id: current.id,
          legajo: current.legajo, // Inmutable
          fechaCreacion: current.fechaCreacion, // Inmutable
          fechaActualizacion: iso,
        };
      }

      setStudents((prev) => prev.map((s) => (s.id === id ? updatedStudent : s)));

      // Detectar cambios clave y registrar en bitácora
      const logsToAdd: StudentAuditLog[] = [];
      if (data.materiasInteres) {
        const oldMat = current.materiasInteres?.map((m) => m.nombre).join(", ") || "";
        const newMat = data.materiasInteres.map((m) => m.nombre).join(", ");
        if (oldMat !== newMat) {
          logsToAdd.push({
            id: Date.now() + 1,
            alumnoId: id,
            fecha,
            hora,
            responsable: currentUserName,
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
          responsable: currentUserName,
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
          responsable: currentUserName,
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
          responsable: currentUserName,
          accion: "Modificación",
          campo: "Datos personales",
          valorAnterior: "Ficha anterior",
          valorNuevo: "Ficha actualizada",
          operacion: "UPDATE",
        });
      }

      setAuditLogs((prev) => [...logsToAdd, ...prev]);

      setLoading(false);
      return updatedStudent;
    },
    [checkDniDuplicate, currentUserName, getNowAR, students]
  );

  /**
   * Baja lógica de alumno conectada a POST /api/alumnos/:id/inactivar.
   *
   * Reglas de negocio:
   * - Caso A (Bloqueo): turnos futuros reservados
   * - Caso B (Advertencia): deuda pendiente sin confirmar
   */
  const deactivateStudent = useCallback(
    async (
      id: number,
      options?: { confirmarConDeuda?: boolean }
    ): Promise<DeactivateResult> => {
      setLoading(true);
      setError(null);

      const student = students.find((s) => s.id === id);
      if (!student) {
        setLoading(false);
        return { success: false, code: "NO_ENCONTRADO", message: "Alumno no encontrado." };
      }

      // Prechequeo rápido en cliente si ya se conocen turnos o deudas
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

      const { fecha, hora, iso } = getNowAR();

      try {
        const inactivado = await inactivarAlumno(id, {
          confirmarConDeuda: Boolean(options?.confirmarConDeuda),
        });
        const updated = toStudentUI(inactivado, student);
        setStudents((prev) => prev.map((s) => (s.id === id ? updated : s)));
      } catch (err) {
        if (err instanceof ApiError) {
          setLoading(false);
          if (err.codigo === "ALUMNO_CON_TURNOS_FUTUROS") {
            const cantidad =
              (err.datos as { cantidadTurnosFuturos?: number } | undefined)
                ?.cantidadTurnosFuturos ?? 1;
            return {
              success: false,
              code: "ALUMNO_CON_TURNOS_FUTUROS",
              message: `Tiene ${cantidad} turnos futuros en estado Reservado. Cancelalos antes de continuar con la baja.`,
              turnosFuturos: student.turnosFuturos ?? [],
            };
          }
          if (err.codigo === "ALUMNO_CON_DEUDA") {
            return {
              success: false,
              code: "ALUMNO_CON_DEUDA",
              message:
                student.detalleDeuda?.descripcion ??
                "El alumno posee deuda pendiente. Podés continuar con la baja; la deuda queda registrada.",
              detalleDeuda: student.detalleDeuda,
            };
          }
          return { success: false, message: err.message };
        }

        // Fallback local
        setStudents((prev) =>
          prev.map((s) =>
            s.id === id ? { ...s, estado: "inactivo", fechaActualizacion: iso } : s
          )
        );
      }

      // Registrar en Bitácora
      const logBaja: StudentAuditLog = {
        id: Date.now(),
        alumnoId: id,
        fecha,
        hora,
        responsable: currentUserName,
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
    [currentUserName, getNowAR, students]
  );

  /**
   * Reactivación de alumno inactivo conectada a POST /api/alumnos/:id/reactivar.
   */
  const reactivateStudent = useCallback(
    async (id: number): Promise<ReactivateResult> => {
      setLoading(true);
      setError(null);

      const student = students.find((s) => s.id === id);
      if (!student) {
        setLoading(false);
        return { success: false, code: "NO_ENCONTRADO", message: "Alumno no encontrado." };
      }

      const { fecha, hora, iso } = getNowAR();

      try {
        const reactivado = await reactivarAlumno(id);
        const updated = toStudentUI(reactivado, student);
        setStudents((prev) => prev.map((s) => (s.id === id ? updated : s)));
      } catch (err) {
        if (err instanceof ApiError) {
          setLoading(false);
          if (err.codigo === "DNI_DUPLICADO") {
            return {
              success: false,
              code: "DNI_DUPLICADO",
              message:
                err.message ||
                `No se puede reactivar: ya existe un alumno activo con el DNI ${student.dni}.`,
            };
          }
          return { success: false, message: err.message };
        }

        // Fallback local
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

        setStudents((prev) =>
          prev.map((s) =>
            s.id === id ? { ...s, estado: "activo", fechaActualizacion: iso } : s
          )
        );
      }

      // Registrar en Bitácora
      const logReactivar: StudentAuditLog = {
        id: Date.now(),
        alumnoId: id,
        fecha,
        hora,
        responsable: currentUserName,
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
    [checkDniDuplicate, currentUserName, getNowAR, students]
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
    materiasActivas,
    loading,
    error,
    reload: cargarDatos,
    createStudent,
    updateStudent,
    deactivateStudent,
    reactivateStudent,
    getStudentById,
    getAuditLogsForStudent,
    checkDniDuplicate,
  };
}
