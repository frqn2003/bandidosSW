// src/components/alumnos/StudentPagosTab.tsx
//
// Pestaña "Pagos" en la Ficha del Alumno (Modo LECTURA).
// Conecta directamente con la capa de datos de pagos (HU-PAG-01 / HU-PAG-02)
// y muestra el estado de deuda del alumno y el historial de comprobantes emitidos.

"use client";

import React, { useState, useEffect } from "react";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PaymentHistoryTab } from "@/components/pagos/PaymentHistoryTab";
import { ReceiptView } from "@/components/pagos/ReceiptView";
import {
  listarPagos,
  listarClasesPendientes,
  formatearImporte,
  type PagoResponse,
  type ClasePendientePagoResponse,
} from "@/data/pagos";
import type { StudentUI } from "@/modules/alumnos/types";

interface StudentPagosTabProps {
  student: StudentUI;
}

export function StudentPagosTab({ student }: StudentPagosTabProps) {
  const [pagos, setPagos] = useState<PagoResponse[]>([]);
  const [clasesPendientes, setClasesPendientes] = useState<ClasePendientePagoResponse[]>([]);
  const [cargando, setCargando] = useState(true);
  const [receiptSeleccionado, setReceiptSeleccionado] = useState<PagoResponse | null>(null);

  useEffect(() => {
    let cancelado = false;

    Promise.all([
      listarPagos({ alumnoId: student.id }).catch(() => []),
      listarClasesPendientes(student.id).catch(() => []),
    ])
      .then(([pagosRes, pendientesRes]) => {
        if (cancelado) return;
        setPagos(pagosRes);
        setClasesPendientes(pendientesRes);
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [student.id]);

  // Cálculo de deuda
  const tieneDeudaFixture = Boolean(student.hasPendingDebt || student.deudaPendiente);
  const detalleDeuda = student.detalleDeuda;
  const clasesAdeudadas = detalleDeuda?.clasesSinPagar ?? clasesPendientes.length;
  const montoAdeudado =
    detalleDeuda?.montoTotal ??
    clasesPendientes.reduce((acc, c) => acc + (c.importe ?? 0), 0);
  const tieneDeuda = tieneDeudaFixture || clasesAdeudadas > 0 || montoAdeudado > 0;

  // Total histórico pagado (excluyendo anulados)
  const totalPagado = pagos
    .filter((p) => p.estado !== "Anulado")
    .reduce((acc, p) => acc + p.monto, 0);

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-on-surface-variant">
        <Icon name="progress_activity" size={28} className="animate-spin text-secondary mb-2" />
        <p className="text-xs font-medium">Cargando información contable de {student.nombre}...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Resumen del Estado de Cuenta */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Tarjeta de Estado de Deuda */}
        <div
          className={`rounded-md border p-4 shadow-xs transition-colors ${
            tieneDeuda
              ? "border-status-warning-strong/40 bg-status-warning-strong/5"
              : "border-status-success-strong/40 bg-status-success-strong/5"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-on-surface-variant">Estado de Cuenta</span>
            <StatusBadge
              variant={tieneDeuda ? "warning" : "success"}
              icon={tieneDeuda ? "warning" : "check_circle"}
              label={tieneDeuda ? "Deuda pendiente" : "Al día"}
            />
          </div>
          <p className="font-display text-xl font-bold text-on-surface">
            {tieneDeuda ? formatearImporte(montoAdeudado) : "$ 0,00"}
          </p>
          <p className="text-xs text-on-surface-variant mt-1">
            {tieneDeuda
              ? `${clasesAdeudadas} clase${clasesAdeudadas === 1 ? "" : "s"} sin abonar`
              : "Sin pagos pendientes"}
          </p>
        </div>

        {/* Tarjeta Total Pagado Histórico */}
        <div className="rounded-md border border-outline-variant bg-surface-container-low p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-on-surface-variant">Total Abonado</span>
            <Icon name="payments" size={18} className="text-primary" />
          </div>
          <p className="font-display text-xl font-bold text-on-surface">
            {formatearImporte(totalPagado)}
          </p>
          <p className="text-xs text-on-surface-variant mt-1">
            En {pagos.filter((p) => p.estado !== "Anulado").length} pago(s) confirmados
          </p>
        </div>

        {/* Tarjeta Comprobantes Emitidos */}
        <div className="rounded-md border border-outline-variant bg-surface-container-low p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-on-surface-variant">Comprobantes</span>
            <Icon name="receipt_long" size={18} className="text-secondary" />
          </div>
          <p className="font-display text-xl font-bold text-on-surface">
            {pagos.length}
          </p>
          <p className="text-xs text-on-surface-variant mt-1">
            Tickets y recibos registrados
          </p>
        </div>
      </div>

      {/* Detalle si tiene deuda pendiente */}
      {tieneDeuda && (
        <div className="flex items-start gap-3 rounded-md border border-status-warning-strong/30 bg-status-warning-strong/10 p-3.5 text-xs text-on-surface">
          <Icon name="info" size={18} className="text-status-warning-strong shrink-0 mt-0.5" />
          <div>
            <strong className="block font-bold mb-0.5">Saldo pendiente de cobro</strong>
            <p className="text-on-surface-variant">
              {detalleDeuda?.descripcion ||
                `El alumno registra un saldo pendiente de ${formatearImporte(
                  montoAdeudado
                )}. Podés registrar el cobro desde el módulo de Pagos.`}
            </p>
          </div>
        </div>
      )}

      {/* Historial de Comprobantes del Alumno */}
      <div className="rounded-md border border-outline-variant bg-surface-container-lowest p-4 shadow-card">
        <div className="mb-4 flex items-center justify-between border-b border-outline-variant/60 pb-3">
          <div>
            <h3 className="font-display text-sm font-bold text-on-surface">
              Historial de Comprobantes de Pago
            </h3>
            <p className="text-xs text-on-surface-variant">
              Registro cronológico de pagos emitidos y comprobantes
            </p>
          </div>
          <span className="text-xs font-bold text-on-surface-variant">
            {pagos.length} comprobante(s)
          </span>
        </div>

        <PaymentHistoryTab
          history={pagos}
          selectedStudentName={`${student.nombre} ${student.apellido}`}
          onSelectReceipt={(receipt) => setReceiptSeleccionado(receipt)}
        />
      </div>

      {/* Modal para visualizar el recibo / ticket completo */}
      {receiptSeleccionado && (
        <Modal
          open={Boolean(receiptSeleccionado)}
          onClose={() => setReceiptSeleccionado(null)}
          title={`Comprobante ${receiptSeleccionado.comprobante}`}
          maxWidth="max-w-2xl"
        >
          <ReceiptView
            receipt={receiptSeleccionado}
            onVolver={() => setReceiptSeleccionado(null)}
          />
        </Modal>
      )}
    </div>
  );
}
