// src/components/pagos/deudores/DeudoresModuleLayout.tsx
//
// Layout Principal para HU-PAG-02:
// "Estado de Cuenta, Listado de Deudores, Cierre de Caja y Rendición por Profesor".
//
// Reglas de negocio y control de acceso:
//  · Gerente y Mesa de Entrada: acceden a todas las pestañas ("Deudores", "Cierre de Caja", "Rendición por Profesor").
//  · Profesor: deniega el acceso a "Deudores" y "Cierre de Caja", y muestra directamente su propia "Rendición por Profesor" en modo solo lectura.

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Sidebar } from "@/components/layout/Sidebar";
import { RequiereSesion } from "@/components/auth/RequiereSesion";
import { useSesion } from "@/funciones/sesion";
import { DebtorsList } from "./DebtorsList";
import { DailyCashRegister } from "./DailyCashRegister";
import { ProfessorRendition } from "./ProfessorRendition";

export type DeudoresTab = "deudores" | "cierre-caja" | "rendicion-profesor";

interface DeudoresModuleLayoutProps {
  initialTab?: DeudoresTab;
}

export function DeudoresModuleLayout({ initialTab = "deudores" }: DeudoresModuleLayoutProps) {
  const { sesion } = useSesion();
  const rol = sesion?.usuario.rol.nombre;

  const esProfesor = rol === "Profesor";
  const esGerente = rol === "Gerente";
  const esGerenteOMesa = rol === "Gerente" || rol === "Mesa de Entrada";

  // Si es profesor, la única pestaña permitida y activa es "rendicion-profesor"
  const [activeTab, setActiveTab] = useState<DeudoresTab>(
    esProfesor ? "rendicion-profesor" : initialTab
  );

  // Pestañas disponibles según rol
  const tabs: { id: DeudoresTab; label: string; icon: string; visible: boolean }[] = [
    {
      id: "deudores",
      label: "Listado de Deudores",
      icon: "person_alert",
      visible: esGerenteOMesa,
    },
    {
      id: "cierre-caja",
      label: "Cierre de Caja Diario",
      icon: "point_of_sale",
      visible: esGerenteOMesa,
    },
    {
      id: "rendicion-profesor",
      label: esProfesor ? "Mi Rendición de Clases" : "Rendición por Profesor",
      icon: "receipt_long",
      visible: esGerente || esProfesor,
    },
  ];

  const handleTabChange = (tabId: DeudoresTab) => {
    if (esProfesor && tabId !== "rendicion-profesor") {
      return; // Acceso denegado a otras pestañas
    }
    setActiveTab(tabId);
  };

  return (
    <RequiereSesion>
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <main className="flex-1 p-6 lg:p-8 flex flex-col gap-6 max-w-7xl mx-auto w-full">
          {/* Header principal */}
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                <Link
                  href="/pagos"
                  className="hover:text-blue-600 transition-colors flex items-center gap-1"
                >
                  <Icon name="receipt" size={14} />
                  Cobranzas
                </Link>
                <span>/</span>
                <span className="text-slate-800">Estado de Cuenta y Deudores</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {esProfesor ? "Rendición Docente" : "Estado de Cuenta y Gestión de Deuda"}
              </h1>
              <p className="text-sm text-slate-600 mt-0.5">
                {esProfesor
                  ? "Consulta el balance de tus clases dictadas, cobros vigentes y pendientes de liquidación."
                  : "Supervisión de alumnos morosos, conciliación de caja diaria y liquidaciones a profesores."}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/pagos"
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
              >
                <Icon name="arrow_back" size={16} />
                Volver a Cobros
              </Link>
            </div>
          </header>

          {/* Sistema de Pestañas (Tabs) */}
          <div className="border-b border-slate-200">
            <nav className="flex space-x-2" aria-label="Pestañas de gestión" role="tablist">
              {tabs
                .filter((t) => t.visible)
                .map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => handleTabChange(tab.id)}
                      className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all cursor-pointer ${isActive
                          ? "border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-md"
                          : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
                        }`}
                    >
                      <Icon
                        name={tab.icon}
                        size={18}
                        className={isActive ? "text-blue-600" : "text-slate-400"}
                      />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
            </nav>
          </div>

          {/* Contenido de la pestaña activa */}
          <section className="flex-1">
            {activeTab === "deudores" && <DebtorsList />}

            {activeTab === "cierre-caja" && <DailyCashRegister />}

            {activeTab === "rendicion-profesor" && <ProfessorRendition />}
          </section>
        </main>
      </div>
    </RequiereSesion>
  );
}
