// src/modules/pagos/usePayments.ts
//
// Custom Hook para el módulo de Gestión de Pagos (HU-PAG-01).
// Conectado directamente a la capa de datos real (PostgreSQL / API).
// Gestiona el estado reactivo del flujo de cobro, selección de clases impagas,
// cálculo dinámico de totales, registro de comprobantes e historial del alumno.

"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { ApiError } from "@/lib/api-client";
import { listarAlumnos } from "@/data/alumnos";
import {
  listarPagos,
  registrarPago,
  listarClasesPendientes,
  listarFormasPago,
} from "@/data/pagos";
import type {
  ClasePendientePagoResponse,
  FormaPagoResponse,
  PagoResponse,
  PaymentReceipt,
  StudentPaymentSummary,
  PaymentsTab,
  ErrorPago,
} from "./types";

export interface RegisterPaymentParams {
  formasPago: {
    formaPagoId: number;
    nroOperacion: string | null;
  }[];
  fechaPago: string;
  observaciones?: string | null;
}

export interface RegisterPaymentResult {
  success: boolean;
  receipt?: PaymentReceipt;
  errorCode?: ErrorPago;
  errorMessage?: string;
}

export function usePayments() {
  // Pestaña activa: "registrar" | "historial"
  const [activeTab, setActiveTab] = useState<PaymentsTab>("registrar");

  // Alumnos y clases pendientes en estado reactivo
  const [students, setStudents] = useState<StudentPaymentSummary[]>([]);
  const [pendingClassesByStudent, setPendingClassesByStudent] = useState<
    Record<number, ClasePendientePagoResponse[]>
  >({});

  // Historial global de comprobantes
  const [paymentHistory, setPaymentHistory] = useState<PagoResponse[]>([]);

  // Catálogo de formas de pago
  const [formasPagoCatalogo, setFormasPagoCatalogo] = useState<FormaPagoResponse[]>([]);

  // Alumno actualmente seleccionado
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);

  // Turnos seleccionados para cobrar en la tabla
  const [selectedClassIds, setSelectedClassIds] = useState<number[]>([]);

  // Comprobante emitido tras confirmar el pago (para mostrar en ReceiptView)
  const [lastReceipt, setLastReceipt] = useState<PaymentReceipt | null>(null);

  // Carga inicial de datos desde la API
  useEffect(() => {
    let cancelado = false;

    Promise.all([
      listarAlumnos({ estado: "activo" }),
      listarClasesPendientes(),
      listarFormasPago(),
      listarPagos(),
    ])
      .then(([alus, pendientes, fp, historial]) => {
        if (cancelado) return;

        // Indexar clases pendientes por alumno
        const pendientesPorAlumno: Record<number, ClasePendientePagoResponse[]> = {};
        for (const c of pendientes) {
          const aid = c.alumnoId ?? c.alumno?.id;
          if (aid) {
            if (!pendientesPorAlumno[aid]) pendientesPorAlumno[aid] = [];
            pendientesPorAlumno[aid].push(c);
          }
        }

        // Construir resumen con deuda real calculada de los turnos impagos
        const studentSummaries: StudentPaymentSummary[] = alus.map((a) => {
          const clasesDelAlumno = pendientesPorAlumno[a.id] ?? [];
          const totalDeuda = clasesDelAlumno.reduce((sum, cl) => sum + cl.importe, 0);
          return {
            id: a.id,
            legajo: a.legajo,
            nombre: a.nombre,
            apellido: a.apellido,
            dni: a.dni,
            totalDeudaPendiente: totalDeuda,
            clasesPendientesCount: clasesDelAlumno.length,
          };
        });

        setStudents(studentSummaries);
        setPendingClassesByStudent(pendientesPorAlumno);
        setFormasPagoCatalogo(fp);
        setPaymentHistory(historial);
      })
      .catch((err) => {
        console.error("Error al cargar datos iniciales de pagos:", err);
      });

    return () => {
      cancelado = true;
    };
  }, []);

  // Alumno seleccionado actual
  const selectedStudent = useMemo(() => {
    if (!selectedStudentId) return null;
    return students.find((s) => s.id === selectedStudentId) ?? null;
  }, [students, selectedStudentId]);

  // Clases pendientes del alumno seleccionado (solo las no pagadas)
  const pendingClasses = useMemo(() => {
    if (!selectedStudentId) return [];
    const classes = pendingClassesByStudent[selectedStudentId] ?? [];
    return classes.filter((c) => !c.pagado);
  }, [pendingClassesByStudent, selectedStudentId]);

  // Total autocalculado de las clases seleccionadas
  const selectedTotal = useMemo(() => {
    return pendingClasses
      .filter((c) => selectedClassIds.includes(c.id))
      .reduce((acc, curr) => acc + curr.importe, 0);
  }, [pendingClasses, selectedClassIds]);

  const selectedCount = selectedClassIds.length;

  // Historial de pagos filtrado para el alumno seleccionado o completo
  const studentPaymentHistory = useMemo(() => {
    const list = selectedStudentId
      ? paymentHistory.filter((p) => p.alumno.id === selectedStudentId)
      : paymentHistory;

    // Ordenado por fecha descendente
    return [...list].sort((a, b) => {
      const fechaDiff = b.fechaPago.localeCompare(a.fechaPago);
      if (fechaDiff !== 0) return fechaDiff;
      return b.fechaCreacion.localeCompare(a.fechaCreacion);
    });
  }, [paymentHistory, selectedStudentId]);

  // Seleccionar o deseleccionar alumno
  const selectStudent = useCallback((studentId: number | null) => {
    setSelectedStudentId(studentId);
    setSelectedClassIds([]);
    setLastReceipt(null);

    if (studentId) {
      listarClasesPendientes(studentId)
        .then((clases) => {
          setPendingClassesByStudent((prev) => ({
            ...prev,
            [studentId]: clases,
          }));
        })
        .catch(console.error);
    }
  }, []);

  // Alternar selección de una clase individual
  const toggleSelectClass = useCallback((classId: number) => {
    setSelectedClassIds((prev) =>
      prev.includes(classId)
        ? prev.filter((id) => id !== classId)
        : [...prev, classId]
    );
  }, []);

  // Seleccionar todas las clases pendientes disponibles
  const selectAllClasses = useCallback(() => {
    setSelectedClassIds(pendingClasses.map((c) => c.id));
  }, [pendingClasses]);

  // Desmarcar todas las clases
  const clearClassSelection = useCallback(() => {
    setSelectedClassIds([]);
  }, []);

  // Buscador de alumnos (por DNI, Nombre, Apellido o Legajo)
  const searchStudents = useCallback(
    (query: string): StudentPaymentSummary[] => {
      const q = query.trim().toLowerCase();
      if (!q) return [];
      return students.filter((s) => {
        const fullSearch = `${s.legajo} ${s.dni} ${s.nombre} ${s.apellido} ${s.apellido}, ${s.nombre}`.toLowerCase();
        return fullSearch.includes(q);
      });
    },
    [students]
  );

  // Registrar pago llamando a la API real
  const registerPayment = useCallback(
    async (params: RegisterPaymentParams): Promise<RegisterPaymentResult> => {
      if (!selectedStudent) {
        return {
          success: false,
          errorCode: "ALUMNO_NO_ENCONTRADO",
          errorMessage: "Debe seleccionar un alumno para procesar el pago.",
        };
      }

      if (selectedClassIds.length === 0) {
        return {
          success: false,
          errorCode: "SIN_CLASES_SELECCIONADAS",
          errorMessage: "Debe seleccionar al menos una clase para cobrar.",
        };
      }

      try {
        const nuevoPago = await registrarPago({
          alumnoId: selectedStudent.id,
          turnoIds: selectedClassIds,
          formasPago: params.formasPago,
          fechaPago: params.fechaPago,
          observaciones: params.observaciones ?? null,
        });

        // Actualizar comprobante emitido
        setLastReceipt(nuevoPago);

        // Incorporar al historial de comprobantes
        setPaymentHistory((prev) => [nuevoPago, ...prev.filter((p) => p.id !== nuevoPago.id)]);

        // Eliminar las clases abonadas del listado pendiente
        setPendingClassesByStudent((prev) => {
          const studentClasses = prev[selectedStudent.id] ?? [];
          return {
            ...prev,
            [selectedStudent.id]: studentClasses.filter((c) => !selectedClassIds.includes(c.id)),
          };
        });

        // Actualizar totales y contadores del alumno en memoria
        setStudents((prev) =>
          prev.map((s) => {
            if (s.id !== selectedStudent.id) return s;
            const nuevaDeuda = Math.max(0, s.totalDeudaPendiente - nuevoPago.monto);
            const nuevoCount = Math.max(0, s.clasesPendientesCount - nuevoPago.clases.length);
            return {
              ...s,
              totalDeudaPendiente: nuevaDeuda,
              clasesPendientesCount: nuevoCount,
            };
          })
        );

        setSelectedClassIds([]);

        return {
          success: true,
          receipt: nuevoPago,
        };
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : "Error de comunicación al procesar el pago.";
        const code = (err instanceof ApiError ? err.codigo : "ERROR_DESCONOCIDO") as ErrorPago;
        return {
          success: false,
          errorCode: code,
          errorMessage: msg,
        };
      }
    },
    [selectedStudent, selectedClassIds]
  );

  const clearLastReceipt = useCallback(() => {
    setLastReceipt(null);
  }, []);

  return {
    activeTab,
    setActiveTab,
    students,
    selectedStudent,
    selectStudent,
    pendingClasses,
    selectedClassIds,
    toggleSelectClass,
    selectAllClasses,
    clearClassSelection,
    selectedTotal,
    selectedCount,
    formasPagoCatalogo,
    paymentHistory: studentPaymentHistory,
    searchStudents,
    registerPayment,
    lastReceipt,
    clearLastReceipt,
  };
}
