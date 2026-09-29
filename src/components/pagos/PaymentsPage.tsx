// src/components/pagos/PaymentsPage.tsx
//
// Vista Principal del Módulo "Gestión de Pagos" (HU-PAG-01).
// Implementa:
//  · Control de acceso por rol (Profesor no accede → Acceso Denegado).
//  · Navegación por pestañas: "Registrar pago" e "Historial del alumno".
//  · Buscador de alumnos con tarjeta de resumen de deuda.
//  · Layout de 2 columnas: PendingClassesTable a la izquierda y PaymentForm a la derecha.
//  · Modal de confirmación (PaymentConfirmModal) con fondo oscuro y botón verde Confirmar.
//  · Comprobante estilo ticket (ReceiptView) tras el registro con banner de éxito.
//  · Pestaña Historial en modo solo lectura ordenada por fecha descendente.

"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Sidebar } from "@/components/layout/Sidebar";
import { RequiereSesion } from "@/components/auth/RequiereSesion";
import { useToast } from "@/components/ui/Toast";
import { useSesion } from "@/funciones/sesion";
import { usePayments } from "@/modules/pagos/usePayments";
import type { PaymentReceipt } from "@/modules/pagos/types";
import { StudentSearch } from "./StudentSearch";
import { PendingClassesTable } from "./PendingClassesTable";
import { PendingStudentsList } from "./PendingStudentsList";
import { PaymentForm, type PaymentFormData } from "./PaymentForm";
import { PaymentConfirmModal } from "./PaymentConfirmModal";
import { ReceiptView } from "./ReceiptView";
import { PaymentHistoryTab } from "./PaymentHistoryTab";

export function PaymentsPage() {
  const { sesion } = useSesion();
  const rolNombre = sesion?.usuario.rol.nombre;
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  const {
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
    paymentHistory,
    searchStudents,
    registerPayment,
    lastReceipt,
    clearLastReceipt,
  } = usePayments();

  useEffect(() => {
    if (tabParam === "historial" || tabParam === "history") {
      setActiveTab("historial");
    } else if (tabParam === "registrar" || tabParam === "register") {
      setActiveTab("registrar");
    }
  }, [tabParam, setActiveTab]);

  // Alumnos que tienen al menos un pago pendiente
  const studentsWithDebt = React.useMemo(() => {
    return students.filter((s) => s.totalDeudaPendiente > 0);
  }, [students]);

  // Estado para el modal de confirmación
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<PaymentFormData | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  // Estado para ver comprobante desde el historial
  const [historicalReceiptToView, setHistoricalReceiptToView] = useState<PaymentReceipt | null>(null);

  // REGLA DE NEGOCIO: Rol Profesor no tiene acceso al módulo de pagos
  if (rolNombre === "Profesor") {
    return (
      <RequiereSesion>
        <div className="flex min-h-screen bg-slate-50">
          <Sidebar />
          <main className="flex-1 p-6 lg:p-8 flex items-center justify-center">
            <div className="max-w-md w-full rounded-lg border border-red-200 bg-white p-8 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600 mb-4">
                <Icon name="shield_person" size={32} />
              </div>
              <h1 className="text-xl font-bold text-slate-900 mb-2">
                Acceso denegado
              </h1>
              <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                El módulo de <span className="font-semibold text-slate-800">Gestión de Pagos</span> está reservado exclusivamente para el personal de Mesa de Entrada y Gerencia. El rol Profesor no posee permisos para consultar ni registrar cobros.
              </p>
              <Link
                href="/calendario"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
              >
                <Icon name="arrow_back" size={16} />
                Ir a mi calendario
              </Link>
            </div>
          </main>
        </div>
      </RequiereSesion>
    );
  }

  // Clases seleccionadas actualmente para el modal
  const selectedClassesForModal = pendingClasses.filter((c) =>
    selectedClassIds.includes(c.id)
  );

  const handleIniciarRegistro = (formData: PaymentFormData) => {
    setPendingFormData(formData);
    setConfirmModalOpen(true);
  };

  const handleConfirmarPago = async () => {
    if (!pendingFormData) return;
    setConfirmando(true);
    try {
      const result = await registerPayment({
        formasPago: pendingFormData.formasPago.map((fp) => ({
          formaPagoId: fp.formaPagoId,
          nroOperacion: fp.nroOperacion,
        })),
        fechaPago: pendingFormData.fechaPago,
        observaciones: pendingFormData.observaciones,
      });

      if (result.success && result.receipt) {
        setConfirmModalOpen(false);
        setPendingFormData(null);
        showToast("success", `Pago registrado con éxito. Comprobante ${result.receipt.comprobante}`);
      } else {
        showToast("error", result.errorMessage ?? "No se pudo registrar el pago.");
      }
    } catch {
      showToast("error", "Error de comunicación al procesar el pago.");
    } finally {
      setConfirmando(false);
    }
  };

  const handleDownloadDirectReceipt = (pago: PaymentReceipt) => {
    setHistoricalReceiptToView(pago);
    const originalTitle = document.title;
    document.title = `${pago.comprobante}_${pago.alumno.apellido}_${pago.alumno.nombre}`;
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.title = originalTitle;
      }, 1000);
    }, 150);
  };

  return (
    <RequiereSesion>
      <div className="flex min-h-screen bg-slate-50 print:bg-white print:min-h-0">
        <div className="print:hidden">
          <Sidebar />
        </div>

        <main className="flex-1 px-6 py-6 lg:px-8 print:p-0 print:m-0 print:w-full">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 print:max-w-none print:w-full print:m-0 print:p-0">
            {/* Header del módulo (Oculto en impresión) */}
            <header className="flex flex-wrap items-center justify-between gap-4 print:hidden">
              <div className="flex items-center gap-3.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
                  <Icon name="payments" size={26} className="text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                    Gestión de Pagos
                  </h1>
                  <p className="text-sm text-slate-500">
                    Registro de cobros de clases dictadas y emisión de comprobantes (HU-PAG-01)
                  </p>
                </div>
              </div>

              {/* Pestañas de navegación */}
              <div className="flex items-center rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("registrar");
                    setHistoricalReceiptToView(null);
                  }}
                  className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-all cursor-pointer ${
                    activeTab === "registrar"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Icon name="add_card" size={18} />
                  Registrar pago
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("historial");
                    setHistoricalReceiptToView(null);
                  }}
                  className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-all cursor-pointer ${
                    activeTab === "historial"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Icon name="history" size={18} />
                  Historial del alumno
                  {paymentHistory.length > 0 && (
                    <span
                      className={`ml-1 rounded-full px-2 py-0.5 text-xs font-bold ${
                        activeTab === "historial"
                          ? "bg-blue-500 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {paymentHistory.length}
                    </span>
                  )}
                </button>
              </div>
            </header>

            {/* Si acabamos de emitir un comprobante o estamos viendo uno desde el historial */}
            {lastReceipt && activeTab === "registrar" ? (
              <ReceiptView
                receipt={lastReceipt}
                onVolver={clearLastReceipt}
              />
            ) : historicalReceiptToView && activeTab === "historial" ? (
              <ReceiptView
                receipt={historicalReceiptToView}
                onVolver={() => setHistoricalReceiptToView(null)}
              />
            ) : (
              <>
                {/* Buscador de Alumno (Oculto en impresión) */}
                <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm print:hidden">
                  <StudentSearch
                    selectedStudent={selectedStudent}
                    onSelectStudent={(student) => selectStudent(student.id)}
                    onClearStudent={() => selectStudent(null)}
                    searchStudents={searchStudents}
                  />
                </section>

                {/* Contenido según pestaña activa */}
                {activeTab === "registrar" ? (
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 print:block">
                    {/* Columna Izquierda: Lista de clases pendientes o Listado de alumnos con deuda */}
                    <div className={`${!selectedStudent ? "lg:col-span-8" : "lg:col-span-7"} flex flex-col gap-4`}>
                      <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
                        <div className="border-b border-slate-200 bg-slate-50/50 px-5 py-3.5 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon name="event_available" size={18} className="text-secondary" />
                            <h2 className="font-bold text-slate-800 text-sm">
                              {selectedStudent
                                ? `Clases pendientes de ${selectedStudent.apellido}, ${selectedStudent.nombre}`
                                : "Alumnos con pagos pendientes"}
                            </h2>
                          </div>
                          {selectedStudent ? (
                            <button
                              type="button"
                              onClick={() => selectStudent(null)}
                              className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                            >
                              ← Ver todos los alumnos
                            </button>
                          ) : (
                            <span className="text-xs text-slate-500 font-medium">
                              {studentsWithDebt.length} {studentsWithDebt.length === 1 ? "alumno con deuda" : "alumnos con deuda"}
                            </span>
                          )}
                        </div>

                        <div className="p-0">
                          {!selectedStudent ? (
                            <PendingStudentsList
                              studentsWithDebt={studentsWithDebt}
                              onSelectStudent={(student) => selectStudent(student.id)}
                            />
                          ) : pendingClasses.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500 p-6">
                              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-3">
                                <Icon name="receipt_long" size={24} />
                              </div>
                              <h3 className="font-bold text-slate-800 text-base">
                                Sin deuda pendiente
                              </h3>
                              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                                El alumno {selectedStudent.apellido}, {selectedStudent.nombre} está al día con sus pagos de clases dictadas.
                              </p>
                              <button
                                type="button"
                                onClick={() => selectStudent(null)}
                                className="mt-4 text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                              >
                                Volver al listado de alumnos con deuda
                              </button>
                            </div>
                          ) : (
                            <PendingClassesTable
                              classes={pendingClasses}
                              selectedIds={selectedClassIds}
                              onToggleSelect={toggleSelectClass}
                              onSelectAll={selectAllClasses}
                              onClearSelection={clearClassSelection}
                              selectedTotal={selectedTotal}
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Columna Derecha: Formulario de Pago */}
                    <div className={`${!selectedStudent ? "lg:col-span-4" : "lg:col-span-5"} flex flex-col gap-4`}>
                      <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
                        <div className="border-b border-slate-200 bg-slate-50/50 px-5 py-3.5 flex items-center justify-between">
                          <h2 className="font-bold text-slate-800 text-sm">
                            Detalle del cobro
                          </h2>
                          {selectedCount > 0 && (
                            <span className="text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                              {selectedCount} {selectedCount === 1 ? "clase seleccionada" : "clases seleccionadas"}
                            </span>
                          )}
                        </div>

                        <div className="p-5">
                          {selectedStudent ? (
                            <PaymentForm
                              montoCalculado={selectedTotal}
                              clasesSeleccionadasCount={selectedCount}
                              formasPagoCatalogo={formasPagoCatalogo}
                              onIniciarRegistro={handleIniciarRegistro}
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400">
                              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
                                <Icon name="payments" size={24} />
                              </div>
                              <h3 className="font-bold text-slate-700 text-sm">
                                Selecciona un alumno para cobrar
                              </h3>
                              <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
                                Haz click en &quot;Cobrar&quot; en cualquier alumno de la lista o búscalo por DNI/nombre arriba para ver sus clases y emitir el pago.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Pestaña: Historial del Alumno */
                  <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="border-b border-slate-200 bg-slate-50/50 px-5 py-3.5 flex items-center justify-between">
                      <div>
                        <h2 className="font-bold text-slate-800 text-sm">
                          {selectedStudent
                            ? `Historial de pagos de ${selectedStudent.apellido}, ${selectedStudent.nombre}`
                            : "Historial general de pagos del centro"}
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Comprobantes de clases dictadas emitidos en orden cronológico descendente
                        </p>
                      </div>
                      <span className="text-xs text-slate-500 font-medium">
                        {paymentHistory.length} comprobantes registrados
                      </span>
                    </div>

                    <PaymentHistoryTab
                      history={paymentHistory}
                      onSelectReceipt={(receipt) => setHistoricalReceiptToView(receipt)}
                      onDownloadReceipt={handleDownloadDirectReceipt}
                      selectedStudentName={
                        selectedStudent
                          ? `${selectedStudent.apellido}, ${selectedStudent.nombre}`
                          : undefined
                      }
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </main>

        {/* Modal de confirmación de pago */}
        {selectedStudent && pendingFormData && (
          <PaymentConfirmModal
            open={confirmModalOpen}
            onClose={() => {
              if (!confirmando) setConfirmModalOpen(false);
            }}
            onConfirm={handleConfirmarPago}
            confirmando={confirmando}
            student={selectedStudent}
            selectedClasses={selectedClassesForModal}
            formData={pendingFormData}
            total={selectedTotal}
          />
        )}
      </div>
    </RequiereSesion>
  );
}

export default PaymentsPage;
