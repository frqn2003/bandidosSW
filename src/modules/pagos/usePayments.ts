// src/modules/pagos/usePayments.ts
//
// Custom Hook para el módulo de Gestión de Pagos (HU-PAG-01).
// Gestiona el estado reactivo del flujo de cobro, selección de clases impagas,
// cálculo dinámico de totales, registro de comprobantes e historial del alumno.

import { useState, useMemo, useCallback } from "react";
import { hoyAR } from "@/contracts/pago";
import type {
  ClasePendientePagoResponse,
  FormaPagoResponse,
  PagoResponse,
  PaymentReceipt,
  StudentPaymentSummary,
  PaymentsTab,
  ErrorPago,
} from "./types";
import {
  MOCK_FORMAS_PAGO,
  MOCK_STUDENTS,
  INITIAL_PENDING_CLASSES_MOCK,
  INITIAL_PAYMENT_HISTORY_MOCK,
} from "./mock-data";

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
  const [students, setStudents] = useState<StudentPaymentSummary[]>(MOCK_STUDENTS);
  const [pendingClassesByStudent, setPendingClassesByStudent] = useState<
    Record<number, ClasePendientePagoResponse[]>
  >(INITIAL_PENDING_CLASSES_MOCK);

  // Historial global de comprobantes
  const [paymentHistory, setPaymentHistory] = useState<PagoResponse[]>(
    INITIAL_PAYMENT_HISTORY_MOCK
  );

  // Alumno actualmente seleccionado
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);

  // Turnos seleccionados para cobrar en la tabla
  const [selectedClassIds, setSelectedClassIds] = useState<number[]>([]);

  // Comprobante emitido tras confirmar el pago (para mostrar en ReceiptView)
  const [lastReceipt, setLastReceipt] = useState<PaymentReceipt | null>(null);

  // Catálogo de formas de pago
  const formasPagoCatalogo: FormaPagoResponse[] = useMemo(() => MOCK_FORMAS_PAGO, []);

  // Alumno seleccionado actual
  const selectedStudent = useMemo(() => {
    if (!selectedStudentId) return null;
    return students.find((s) => s.id === selectedStudentId) ?? null;
  }, [students, selectedStudentId]);

  // Clases pendientes del alumno seleccionado (solo las que no han sido pagadas)
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

  // Registrar pago simulando transacción de backend
  const registerPayment = useCallback(
    async (params: RegisterPaymentParams): Promise<RegisterPaymentResult> => {
      // BACKEND: POST /api/pagos con CrearPagoBody
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

      // Validar fecha futura
      const fechaActual = hoyAR();
      if (params.fechaPago > fechaActual) {
        return {
          success: false,
          errorCode: "FECHA_PAGO_FUTURA",
          errorMessage: "La fecha de pago no puede ser futura.",
        };
      }

      // Validar medios de pago y N° de operación
      if (!params.formasPago || params.formasPago.length === 0) {
        return {
          success: false,
          errorCode: "FORMA_PAGO_REQUERIDA",
          errorMessage: "Debe indicar al menos una forma de pago.",
        };
      }

      for (const fp of params.formasPago) {
        const catalogoItem = formasPagoCatalogo.find((c) => c.id === fp.formaPagoId);
        if (catalogoItem?.requiereNroOperacion && (!fp.nroOperacion || fp.nroOperacion.trim() === "")) {
          return {
            success: false,
            errorCode: "NRO_OPERACION_REQUERIDO",
            errorMessage: `El medio de pago ${catalogoItem.nombre} requiere N° de operación o referencia.`,
          };
        }
      }

      // Simular latencia de red
      await new Promise((resolve) => setTimeout(resolve, 300));

      const clasesAbonadas = pendingClasses.filter((c) => selectedClassIds.includes(c.id));
      const montoTotalCalculado = clasesAbonadas.reduce((acc, c) => acc + c.importe, 0);

      // Generar secuencia de comprobante
      const nextSequence = paymentHistory.length + 124;
      const comprobante = `REC-${String(nextSequence).padStart(6, "0")}`;
      const nowIso = new Date().toISOString();

      const nuevoPago: PagoResponse = {
        id: nextSequence,
        comprobante,
        alumno: {
          id: selectedStudent.id,
          legajo: selectedStudent.legajo,
          nombre: selectedStudent.nombre,
          apellido: selectedStudent.apellido,
          dni: selectedStudent.dni,
        },
        monto: montoTotalCalculado,
        fechaPago: params.fechaPago,
        observaciones: params.observaciones?.trim() || null,
        formasPago: params.formasPago.map((fp, idx) => {
          const cat = formasPagoCatalogo.find((c) => c.id === fp.formaPagoId);
          return {
            id: idx + 1,
            formaPagoId: fp.formaPagoId,
            nombre: cat?.nombre || "Medio de Pago",
            nroOperacion: fp.nroOperacion || null,
          };
        }),
        clases: clasesAbonadas.map((c) => ({
          turnoId: c.id,
          codigo: c.codigo,
          fecha: c.fecha,
          horaInicio: c.horaInicio,
          horaFin: c.horaFin,
          materiaNombre: c.materia.nombre,
          profesorNombre: `${c.profesor.nombre} ${c.profesor.apellido}`,
          importe: c.importe,
        })),
        registradoPor: {
          id: 2,
          nombre: "Laura",
          apellido: "Gómez",
        },
        fechaCreacion: nowIso,
      };

      // Marcar las clases como pagadas en el estado
      setPendingClassesByStudent((prev) => {
        const studentList = prev[selectedStudent.id] || [];
        return {
          ...prev,
          [selectedStudent.id]: studentList.map((c) =>
            selectedClassIds.includes(c.id) ? { ...c, pagado: true } : c
          ),
        };
      });

      // Actualizar deuda pendiente del alumno en la lista de alumnos
      setStudents((prev) =>
        prev.map((s) => {
          if (s.id !== selectedStudent.id) return s;
          const nuevaDeuda = Math.max(0, s.totalDeudaPendiente - montoTotalCalculado);
          const nuevasClasesCount = Math.max(0, s.clasesPendientesCount - clasesAbonadas.length);
          return {
            ...s,
            totalDeudaPendiente: nuevaDeuda,
            clasesPendientesCount: nuevasClasesCount,
          };
        })
      );

      // Agregar comprobante al historial
      setPaymentHistory((prev) => [nuevoPago, ...prev]);
      setLastReceipt(nuevoPago);
      setSelectedClassIds([]);

      return {
        success: true,
        receipt: nuevoPago,
      };
    },
    [
      selectedStudent,
      selectedClassIds,
      pendingClasses,
      formasPagoCatalogo,
      paymentHistory.length,
    ]
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
