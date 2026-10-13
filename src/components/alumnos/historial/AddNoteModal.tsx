// src/components/alumnos/historial/AddNoteModal.tsx
//
// Modal para agregar una nueva nota al historial del alumno (HU-ALU-03).
// Reglas y criterios:
//  - Textarea con límite de 500 caracteres y contador en tiempo real.
//  - Bloqueo de envío si está vacío, si supera los 500 caracteres o si el alumno está inactivo.
//  - Flujo con ventana/paso de confirmación previa al guardado.
//  - Regla de negocio: las notas no son editables ni eliminables.
//  - Notificación de éxito y actualización automática.

"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { useSesion } from "@/funciones/sesion";
import { agregarNotaAlumno } from "@/data/historial";
import type { NotaResponse } from "@/contracts/historial";
import { StickyNote, AlertTriangle, CheckCircle2, ArrowLeft } from "lucide-react";

const MAX_CARACTERES = 500;

interface AddNoteModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (nuevaNota?: NotaResponse) => void;
  alumnoId: number;
  alumnoNombre: string;
  alumnoInactivo?: boolean;
}

export function AddNoteModal({
  open,
  onClose,
  onSuccess,
  alumnoId,
  alumnoNombre,
  alumnoInactivo = false,
}: AddNoteModalProps) {
  const { sesion } = useSesion();
  const { showToast } = useToast();

  const [texto, setTexto] = useState("");
  const [pasoConfirmacion, setPasoConfirmacion] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  const longitud = texto.length;
  const excedeLimite = longitud > MAX_CARACTERES;
  const estaVacio = texto.trim().length === 0;
  const envioDeshabilitado = estaVacio || excedeLimite || alumnoInactivo || guardando;

  const handleCerrar = () => {
    if (guardando) return;
    setTexto("");
    setPasoConfirmacion(false);
    setErrorEnvio(null);
    onClose();
  };

  const handleIrAConfirmacion = (e: React.FormEvent) => {
    e.preventDefault();
    if (envioDeshabilitado) return;
    setErrorEnvio(null);
    setPasoConfirmacion(true);
  };

  const handleConfirmarGuardado = async () => {
    if (envioDeshabilitado) return;

    setGuardando(true);
    setErrorEnvio(null);

    const sesionCtx = {
      usuarioId: sesion?.usuario.id,
      nombreCompleto: sesion?.usuario
        ? `${sesion.usuario.nombre} ${sesion.usuario.apellido}`.trim()
        : "Usuario de Mesa de Entrada",
      rol: sesion?.usuario.rol.nombre ?? "Mesa de Entrada",
      profesorId: sesion?.usuario.id,
    };

    try {
      const nuevaNota = await agregarNotaAlumno(
        alumnoId,
        { texto: texto.trim() },
        sesionCtx
      );

      showToast("success", "Nota agregada al historial correctamente.");
      onSuccess(nuevaNota);
      handleCerrar();
    } catch (err: unknown) {
      const mensaje =
        err instanceof Error ? err.message : "Error al registrar la nota.";
      setErrorEnvio(mensaje);
      setPasoConfirmacion(false);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleCerrar}
      title={
        pasoConfirmacion ? "Confirmar registro de nota" : "Agregar nota al historial"
      }
      subtitle={`Alumno: ${alumnoNombre}`}
      icon={
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-700">
          <StickyNote className="h-4 w-4" />
        </div>
      }
      maxWidth="max-w-lg"
    >
      {alumnoInactivo ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900">
          <p className="font-bold">Acción bloqueada</p>
          <p className="mt-1">
            El alumno se encuentra inactivo. No se permite agregar nuevas notas a alumnos inactivos.
          </p>
        </div>
      ) : pasoConfirmacion ? (
        /* Paso 2: Ventana de confirmación previa al guardado */
        <div className="space-y-4">
          <div className="rounded-md border border-amber-300 bg-amber-50/70 p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">
                Las notas no se pueden modificar ni eliminar una vez registradas.
              </p>
              <p className="text-amber-800">
                Si cometés un error o necesitás actualizar la información, deberás registrar una nueva nota correctiva.
              </p>
            </div>
          </div>

          <div className="rounded-md border border-outline-variant bg-surface-container-low p-3.5">
            <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Texto de la nota a registrar:
            </span>
            <p className="text-xs text-on-surface whitespace-pre-wrap leading-relaxed italic bg-white p-2.5 rounded-xs border border-slate-200">
              &ldquo;{texto.trim()}&rdquo;
            </p>
          </div>

          {errorEnvio && (
            <p className="text-xs text-error font-semibold">{errorEnvio}</p>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-outline-variant">
            <Button
              variant="outline"
              size="sm"
              type="button"
              disabled={guardando}
              onClick={() => setPasoConfirmacion(false)}
              className="gap-1 text-xs"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Volver a editar
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="button"
              disabled={guardando}
              onClick={handleConfirmarGuardado}
              className="gap-1 text-xs bg-purple-600 hover:bg-purple-700"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {guardando ? "Guardando..." : "Confirmar y registrar"}
            </Button>
          </div>
        </div>
      ) : (
        /* Paso 1: Formulario con textarea y contador de caracteres */
        <form onSubmit={handleIrAConfirmacion} className="space-y-4">
          <div className="space-y-1.5">
            <Textarea
              id="nota-texto"
              label="Contenido de la nota"
              requiredMark
              rows={4}
              value={texto}
              disabled={guardando}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Escribí aquí observaciones, acuerdos o novedades sobre el alumno..."
              error={
                excedeLimite
                  ? `Has superado el límite de ${MAX_CARACTERES} caracteres.`
                  : undefined
              }
            />

            {/* Contador de caracteres en tiempo real */}
            <div className="flex items-center justify-between text-xs px-0.5">
              <span className="text-[11px] text-slate-500">
                Máximo 500 caracteres
              </span>
              <span
                id="contador-caracteres"
                className={`tabular-nums font-bold ${
                  excedeLimite
                    ? "text-error"
                    : longitud > 450
                    ? "text-amber-600"
                    : "text-slate-500"
                }`}
              >
                {longitud} / {MAX_CARACTERES}
              </span>
            </div>
          </div>

          {/* Aviso informativo de regla de negocio */}
          <div className="rounded-sm bg-slate-50 p-2.5 border border-slate-200 text-xs text-slate-600">
            <p className="font-semibold text-slate-700 mb-0.5">Regla de registro:</p>
            <p className="text-[11px] leading-tight text-slate-500">
              No existe la edición de notas. Cualquier aclaración posterior se realiza creando una nueva nota.
            </p>
          </div>

          {errorEnvio && (
            <p className="text-xs text-error font-semibold">{errorEnvio}</p>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-outline-variant">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              disabled={guardando}
              onClick={handleCerrar}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              id="btn-guardar-nota"
              variant="primary"
              size="sm"
              type="submit"
              disabled={envioDeshabilitado}
              className="text-xs bg-purple-600 hover:bg-purple-700"
            >
              Guardar nota
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
