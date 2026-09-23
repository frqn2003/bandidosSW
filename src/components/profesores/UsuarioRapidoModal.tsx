"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { crearCandidatoBody, type CrearCandidatoBody } from "@/contracts/profesor";
import { crearCandidato, type UsuarioSinFicha } from "@/data/profesores";
import { ApiError, mensajeDeError } from "@/lib/api-client";

// Alta rápida de usuario docente (botón + del alta de profesor).
// Dos pasos: 1) datos de la persona → POST /api/profesores/candidatos (el back
// crea la cuenta en Supabase Auth + la fila de `usuario` con rol Profesor);
// 2) muestra la contraseña temporal UNA sola vez para pasársela al profesor.
// Al primer ingreso el sistema le pide cambiarla (/cambiar-contrasena).

type Campo = keyof CrearCandidatoBody;
const VACIO: CrearCandidatoBody = { nombre: "", apellido: "", dni: "", email: "" };

interface UsuarioRapidoModalProps {
  open: boolean;
  onClose: () => void;
  /** Se llama apenas el back confirma el alta (el usuario ya existe aunque se cierre sin copiar). */
  onUsuarioCreado: (usuario: UsuarioSinFicha) => void;
}

export function UsuarioRapidoModal({ open, onClose, onUsuarioCreado }: UsuarioRapidoModalProps) {
  const [datos, setDatos] = useState<CrearCandidatoBody>(VACIO);
  const [errores, setErrores] = useState<Partial<Record<Campo, string>>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [creado, setCreado] = useState<{ usuario: UsuarioSinFicha; passwordTemporal: string } | null>(null);
  const [copiado, setCopiado] = useState(false);

  // Se reinicia cada vez que se abre (mismo patrón que ProfesorFormModal).
  const [inicializado, setInicializado] = useState(false);
  if (open && !inicializado) {
    setDatos(VACIO);
    setErrores({});
    setErrorGeneral(null);
    setCreado(null);
    setCopiado(false);
    setInicializado(true);
  }
  if (!open && inicializado) setInicializado(false);

  const set = (campo: Campo, valor: string) => {
    setDatos((d) => ({ ...d, [campo]: valor }));
    setErrores((e) => ({ ...e, [campo]: undefined }));
    setErrorGeneral(null);
  };

  const guardar = async () => {
    // Mismo schema que valida el back: los mensajes ya vienen en español.
    const validacion = crearCandidatoBody.safeParse(datos);
    if (!validacion.success) {
      const e: Partial<Record<Campo, string>> = {};
      for (const issue of validacion.error.issues) {
        const campo = issue.path[0] as Campo;
        e[campo] ??= issue.message;
      }
      setErrores(e);
      return;
    }

    const body: CrearCandidatoBody = validacion.data;
    setGuardando(true);
    try {
      const resultado = await crearCandidato(body);
      setCreado(resultado);
      onUsuarioCreado(resultado.usuario);
    } catch (e) {
      const campo = e instanceof ApiError ? (e.campo as Campo | undefined) : undefined;
      if (campo && campo in VACIO) setErrores({ [campo]: mensajeDeError(e) });
      else setErrorGeneral(mensajeDeError(e));
    } finally {
      setGuardando(false);
    }
  };

  const copiar = async () => {
    if (!creado) return;
    try {
      await navigator.clipboard.writeText(creado.passwordTemporal);
      setCopiado(true);
    } catch {
      // Sin permiso de portapapeles: la contraseña igual está a la vista.
    }
  };

  const cerrar = () => {
    if (!guardando) onClose();
  };

  return (
    <Modal
      open={open}
      onClose={cerrar}
      title={creado ? "Usuario creado" : "Nuevo usuario docente"}
      subtitle={
        creado
          ? "Pasale la contraseña temporal al profesor."
          : "Registrá a la persona en el sistema para vincularla a la ficha docente."
      }
      labelledBy="usuario-rapido-titulo"
      icon={
        <span className="flex h-11 w-11 items-center justify-center rounded-md bg-primary-container/30">
          <Icon name={creado ? "how_to_reg" : "person_add"} size={22} className="text-primary" />
        </span>
      }
      maxWidth="max-w-md"
      footer={
        creado ? (
          <Button type="button" onClick={onClose}>
            <Icon name="link" size={18} />
            Vincular y continuar
          </Button>
        ) : (
          <>
            <Button type="button" variant="outline" onClick={cerrar} disabled={guardando}>
              Cancelar
            </Button>
            <Button type="submit" form="usuario-rapido-form" disabled={guardando} aria-busy={guardando || undefined}>
              {guardando ? "Creando…" : "Crear usuario"}
            </Button>
          </>
        )
      }
    >
      {creado ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm font-medium text-on-surface">
            <strong className="font-bold">
              {creado.usuario.apellido}, {creado.usuario.nombre}
            </strong>{" "}
            ya puede iniciar sesión con <strong className="font-bold">{creado.usuario.email}</strong> y esta
            contraseña temporal:
          </p>
          <div className="flex flex-wrap items-center gap-3 rounded-sm border border-outline-variant bg-surface-container-low px-4 py-3">
            <code className="flex-1 select-all font-mono text-lg font-bold tracking-wider text-on-surface">
              {creado.passwordTemporal}
            </code>
            <Button type="button" variant="ghost" size="sm" className="min-h-11" onClick={copiar}>
              <Icon name={copiado ? "check" : "content_copy"} size={16} />
              {copiado ? "Copiada" : "Copiar"}
            </Button>
          </div>
          <p
            role="note"
            className="flex items-start gap-2 rounded-sm border border-status-warning/40 bg-status-warning/10 px-3 py-2.5 text-sm font-semibold text-on-surface"
          >
            <Icon name="warning" size={18} className="mt-0.5 shrink-0 text-status-warning-strong" />
            Se muestra una sola vez: no queda guardada en el sistema. En el primer ingreso el profesor va a
            tener que cambiarla.
          </p>
        </div>
      ) : (
        <form
          id="usuario-rapido-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void guardar();
          }}
          className="flex flex-col gap-4"
        >
          {errorGeneral && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-sm border border-error/40 bg-error/5 px-3 py-2 text-sm font-semibold text-status-danger-strong"
            >
              <Icon name="error" size={16} className="mt-px shrink-0" />
              {errorGeneral}
            </p>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              id="usuario-rapido-nombre"
              label="Nombre"
              requiredMark
              maxLength={80}
              value={datos.nombre}
              onChange={(e) => set("nombre", e.target.value)}
              error={errores.nombre}
              autoComplete="off"
            />
            <Input
              id="usuario-rapido-apellido"
              label="Apellido"
              requiredMark
              maxLength={80}
              value={datos.apellido}
              onChange={(e) => set("apellido", e.target.value)}
              error={errores.apellido}
              autoComplete="off"
            />
          </div>
          <Input
            id="usuario-rapido-dni"
            label="DNI"
            requiredMark
            inputMode="numeric"
            maxLength={8}
            placeholder="Ej: 38123456"
            value={datos.dni}
            onChange={(e) => set("dni", e.target.value.replace(/\D/g, ""))}
            error={errores.dni}
            hint="7 u 8 dígitos, sin puntos."
            autoComplete="off"
          />
          <Input
            id="usuario-rapido-email"
            label="Email"
            requiredMark
            type="email"
            maxLength={120}
            placeholder="docente@academia.edu.ar"
            value={datos.email}
            onChange={(e) => set("email", e.target.value)}
            error={errores.email}
            hint="Con este email va a iniciar sesión."
            autoComplete="off"
          />
          <p className="text-xs font-medium text-on-surface-variant">
            Se crea con rol <strong className="font-bold">Profesor</strong>, activo, y una contraseña temporal
            que genera el sistema.
          </p>
        </form>
      )}
    </Modal>
  );
}
