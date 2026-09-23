"use client";

import { useEffect, useState } from "react";
import { RequiereSesion } from "@/components/auth/RequiereSesion";
import { Sidebar } from "@/components/layout/Sidebar";
import { CalendarioTurnos } from "@/components/calendario/CalendarioTurnos";
import { listarProfesoresActivos, profesorDeUsuario, type ProfesorCalendario } from "@/data/calendario";
import { useSesion } from "@/lib/sesion";

function CalendarioContent() {
  const { sesion } = useSesion();
  const [profesores, setProfesores] = useState<ProfesorCalendario[]>([]);
  const [cargandoProfs, setCargandoProfs] = useState(true);
  const [profesorFijo, setProfesorFijo] = useState<ProfesorCalendario | null>(null);

  // El rol Profesor entra con el filtro bloqueado a SU ficha: la grilla no le
  // ofrece elegir (HU-CAL-01). BACKEND: GET /api/profesores?usuarioId=<id>.
  const esProfesor = sesion?.usuario.rol.nombre === "Profesor";

  useEffect(() => {
    let cancelado = false;
    listarProfesoresActivos()
      .then((lista) => {
        if (cancelado) return;
        setProfesores(lista);
        setCargandoProfs(false);
      })
      .catch(() => {
        if (!cancelado) setCargandoProfs(false);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    if (!esProfesor || !sesion) return;
    let cancelado = false;
    profesorDeUsuario(sesion.usuario.id)
      .then((profe) => {
        if (cancelado) return;
        setProfesorFijo(profe);
      })
      .catch(() => {
        // El rol Profesor sin ficha no puede armar calendario: queda el mensaje
        // de selección y el combo bloqueado. La ficha la carga el back real.
      });
    return () => {
      cancelado = true;
    };
  }, [esProfesor, sesion]);

  return (
    <div className="flex min-h-screen bg-surface">
      <div className="print:hidden">
        <Sidebar />
      </div>

      <main className="flex-1 px-6 py-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-5">
          {cargandoProfs ? (
            <div
              role="status"
              aria-live="polite"
              className="flex min-h-[20rem] items-center justify-center rounded-md border border-outline-variant bg-surface-container-lowest"
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-on-surface-variant">
                <span className="h-2 w-2 animate-pulse rounded-full bg-secondary" aria-hidden="true" />
                Cargando calendario…
              </span>
            </div>
          ) : (
            <CalendarioTurnos profesores={profesores} profesorFijo={profesorFijo} />
          )}
        </div>
      </main>
    </div>
  );
}

export default function CalendarioPage() {
  return (
    <RequiereSesion>
      <CalendarioContent />
    </RequiereSesion>
  );
}