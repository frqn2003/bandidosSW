// src/components/pagos/PaymentsPage.tsx
//
// Vista Principal del Módulo "Gestión de Pagos" Unificado (HU-PAG-01 + HU-PAG-02).
// Arquitectura completa:
//  · Control de acceso por rol:
//      - Profesor: accede exclusivamente a "Rendición por Profesor" en modo lectura.
//      - Gerente y Mesa de Entrada: acceden a todas las pestañas.
//  · Sistema de Pestañas Unificado:
//      1. "Cobros y Deudores" (ancho completo con métricas, filtros y modal de cobro).
//      2. "Historial de pagos" (listado de comprobantes, reimpresión y anulación).
//      3. "Cierre de Caja" (conciliación diaria, arqueo y reapertura para Gerente).
//      4. "Rendición por Profesor" (liquidaciones y detalle de alumnos por docente).
//  · Modales:
//      - RegisterPaymentModal: cobro de clases enfocado sin quitar espacio a la tabla.
//      - AccountStatementModal: movimientos y saldo histórico del alumno.
//      - PaymentConfirmModal: confirmación previa al alta del cobro.
//      - AnnulPaymentModal: anulación con validación estricta de caja del día abierta.
//      - ReceiptView: visualización estilo ticket para impresión o descarga.

"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Sidebar } from "@/components/layout/Sidebar";
import { RequiereSesion } from "@/components/auth/RequiereSesion";
import { useToast } from "@/components/ui/Toast";
import { useSesion } from "@/funciones/sesion";
import { usePayments } from "@/modules/pagos/usePayments";
import type { PaymentReceipt, StudentPaymentSummary, PaymentsTab } from "@/modules/pagos/types";
import { UnifiedDebtorsTab } from "./UnifiedDebtorsTab";
import { RegisterPaymentModal } from "./RegisterPaymentModal";
import { PaymentConfirmModal } from "./PaymentConfirmModal";
import { ReceiptView } from "./ReceiptView";
import { PaymentHistoryTab } from "./PaymentHistoryTab";
import { AnnulPaymentModal } from "./AnnulPaymentModal";
import { AccountStatementModal } from "./deudores/AccountStatementModal";
import { DailyCashRegister } from "./deudores/DailyCashRegister";
import { ProfessorRendition } from "./deudores/ProfessorRendition";
import { obtenerCajaDelDia } from "@/data/caja";
import { anularPago } from "@/data/pagos";
import { mensajeDeError } from "@/lib/api-client";
import type { PagoResponse } from "@/contracts/pago";
import type { PaymentFormData } from "./PaymentForm";

export function PaymentsPage() {
  const { sesion } = useSesion();
  const rolNombre = sesion?.usuario.rol.nombre;
  const esProfesor = rolNombre === "Profesor";
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
    registerPayment,
    lastReceipt,
    clearLastReceipt,
    recargarDatos,
  } = usePayments();

  // Si el usuario es Profesor, solo puede acceder a "Rendición por Profesor"
  useEffect(() => {
    if (esProfesor) {
      setActiveTab("rendicion");
    } else if (tabParam === "historial" || tabParam === "history") {
      setActiveTab("historial");
    } else if (tabParam === "caja") {
      setActiveTab("caja");
    } else if (tabParam === "rendicion") {
      setActiveTab("rendicion");
    } else if (tabParam === "registrar" || tabParam === "deudores") {
      setActiveTab("registrar");
    }
  }, [esProfesor, tabParam, setActiveTab]);

  // Estados para modales de cobro y deudores
  const [modalCobroOpen, setModalCobroOpen] = useState(false);
  const [studentParaCobrar, setStudentParaCobrar] = useState<StudentPaymentSummary | null>(null);
  const [alumnoParaEstadoCuenta, setAlumnoParaEstadoCuenta] = useState<{
    id: number;
    legajo: string;
    nombre: string;
    apellido: string;
    dni: string;
  } | null>(null);

  // Estado para el modal de confirmación de pago
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<PaymentFormData | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  // Estado para ver comprobante desde el historial o post-pago
  const [historicalReceiptToView, setHistoricalReceiptToView] = useState<PaymentReceipt | null>(null);

  // Estado para anulación de pago (Diagrama 4)
  const [pagoParaAnular, setPagoParaAnular] = useState<PagoResponse | null>(null);

  // Abrir modal de cobro para un alumno específico
  const handleAbrirCobro = (student: StudentPaymentSummary) => {
    setStudentParaCobrar(student);
    selectStudent(student.id);
    setModalCobroOpen(true);
  };

  // Abrir modal de estado de cuenta para un alumno
  const handleAbrirEstadoCuenta = (alumno: {
    id: number;
    legajo: string;
    nombre: string;
    apellido: string;
    dni: string;
  }) => {
    setAlumnoParaEstadoCuenta(alumno);
  };

  // Clases seleccionadas actualmente para el modal de confirmación
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
        setModalCobroOpen(false);
        showToast("success", `Pago registrado con éxito. Comprobante ${result.receipt.comprobante}`);
        setHistoricalReceiptToView(result.receipt);
        recargarDatos();
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

  // DIAGRAMA 4: Validación crítica antes de anular (la caja de esa fecha no debe estar cerrada)
  const handleSolicitarAnulacion = async (pago: PagoResponse) => {
    try {
      const caja = await obtenerCajaDelDia(pago.fechaPago);
      if (caja.cerrada) {
        showToast("error", "No se permite anular pagos de una caja cerrada.");
        return;
      }
      setPagoParaAnular(pago);
    } catch {
      setPagoParaAnular(pago);
    }
  };

  const handleConfirmarAnulacion = async (motivo: string) => {
    if (!pagoParaAnular) return;
    try {
      await anularPago(pagoParaAnular.id, { motivo });
      showToast("success", `Pago ${pagoParaAnular.comprobante} anulado con éxito.`);
      setPagoParaAnular(null);
      recargarDatos();
    } catch (err) {
      // CAJA_CERRADA, PAGO_YA_ANULADO: mensaje del back y recarga.
      showToast("error", mensajeDeError(err));
      recargarDatos();
    }
  };

  // Configuración de pestañas según rol
  const tabsConfig = [
    {
      id: "registrar" as PaymentsTab,
      label: "Cobros y Deudores",
      icon: "add_card",
      visible: !esProfesor,
    },
    {
      id: "historial" as PaymentsTab,
      label: "Historial de pagos",
      icon: "history",
      count: paymentHistory.length,
      visible: !esProfesor,
    },
    {
      id: "caja" as PaymentsTab,
      label: "Cierre de Caja",
      icon: "point_of_sale",
      visible: !esProfesor,
    },
    {
      id: "rendicion" as PaymentsTab,
      label: esProfesor ? "Mi Rendición" : "Rendición por Profesor",
      icon: "person",
      visible: true,
    },
  ];

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
                    {esProfesor
                      ? "Consulta de clases dictadas y liquidaciones vigentes"
                      : "Cobros de clases dictadas, listado de deudores, conciliación de caja y rendiciones"}
                  </p>
                </div>
              </div>

              {/* Sistema de Pestañas (Pill nav style idéntico a captura) */}
              <div className="flex items-center rounded-lg border border-slate-200 bg-white p-1 shadow-sm overflow-x-auto scrollbar-none">
                {tabsConfig
                  .filter((t) => t.visible)
                  .map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          setActiveTab(tab.id);
                          setHistoricalReceiptToView(null);
                        }}
                        className={`flex items-center gap-2 rounded-md px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                          isActive
                            ? "bg-blue-600 text-white shadow-sm"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                        }`}
                      >
                        <Icon name={tab.icon} size={17} />
                        <span>{tab.label}</span>
                        {tab.count !== undefined && tab.count > 0 && (
                          <span
                            className={`ml-0.5 rounded-full px-2 py-0.2 text-[11px] font-bold ${
                              isActive
                                ? "bg-blue-500 text-white"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {tab.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
              </div>
            </header>

            {/* Vista de Comprobante (cuando se emitió o se consulta del historial) */}
            {lastReceipt && activeTab === "registrar" ? (
              <ReceiptView receipt={lastReceipt} onVolver={clearLastReceipt} />
            ) : historicalReceiptToView ? (
              <ReceiptView
                receipt={historicalReceiptToView}
                onVolver={() => setHistoricalReceiptToView(null)}
              />
            ) : (
              <>
                {/* 1. Pestaña: Cobros y Deudores (Ancho completo) */}
                {activeTab === "registrar" && (
                  <UnifiedDebtorsTab
                    students={students}
                    onCobrar={handleAbrirCobro}
                    onVerEstadoCuenta={handleAbrirEstadoCuenta}
                    onRefresh={recargarDatos}
                  />
                )}

                {/* 2. Pestaña: Historial de pagos */}
                {activeTab === "historial" && (
                  <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
                    <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-3.5 flex items-center justify-between">
                      <div>
                        <h2 className="font-bold text-slate-800 text-sm">
                          Historial General de Comprobantes
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Registro cronológico descendente de cobros emitidos y anulados
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
                      onAnularPago={handleSolicitarAnulacion}
                    />
                  </div>
                )}

                {/* 3. Pestaña: Cierre de Caja */}
                {activeTab === "caja" && <DailyCashRegister />}

                {/* 4. Pestaña: Rendición por Profesor */}
                {activeTab === "rendicion" && <ProfessorRendition />}
              </>
            )}
          </div>
        </main>

        {/* Modal de Registro de Cobro Enfocado */}
        {modalCobroOpen && studentParaCobrar && (
          <RegisterPaymentModal
            open={modalCobroOpen}
            student={studentParaCobrar}
            pendingClasses={pendingClasses}
            selectedClassIds={selectedClassIds}
            onToggleSelectClass={toggleSelectClass}
            onSelectAllClasses={selectAllClasses}
            onClearClassSelection={clearClassSelection}
            selectedTotal={selectedTotal}
            selectedCount={selectedCount}
            formasPagoCatalogo={formasPagoCatalogo}
            onIniciarRegistro={handleIniciarRegistro}
            onClose={() => {
              setModalCobroOpen(false);
              setStudentParaCobrar(null);
            }}
          />
        )}

        {/* Modal de Confirmación de Pago */}
        {studentParaCobrar && pendingFormData && (
          <PaymentConfirmModal
            open={confirmModalOpen}
            onClose={() => {
              if (!confirmando) setConfirmModalOpen(false);
            }}
            onConfirm={handleConfirmarPago}
            confirmando={confirmando}
            student={studentParaCobrar}
            selectedClasses={selectedClassesForModal}
            formData={pendingFormData}
            total={selectedTotal}
          />
        )}

        {/* Modal de Estado de Cuenta (Diagrama 1) */}
        {alumnoParaEstadoCuenta && (
          <AccountStatementModal
            alumnoId={alumnoParaEstadoCuenta.id}
            alumnoNombre={`${alumnoParaEstadoCuenta.apellido}, ${alumnoParaEstadoCuenta.nombre}`}
            onClose={() => setAlumnoParaEstadoCuenta(null)}
          />
        )}

        {/* Modal de Anulación de Pago (Diagrama 4) */}
        {pagoParaAnular && (
          <AnnulPaymentModal
            pago={pagoParaAnular}
            onClose={() => setPagoParaAnular(null)}
            onConfirmar={handleConfirmarAnulacion}
          />
        )}
      </div>
    </RequiereSesion>
  );
}

export default PaymentsPage;
