"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  cambiarContrasenaBody,
  type CambiarContrasenaBody,
  type ErrorAuth,
} from "@/contracts/auth";
import { ApiError, mensajeDeError } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { CampoContrasena } from "@/components/auth/CampoContrasena";
import { RequisitosContrasena } from "@/components/auth/RequisitosContrasena";
import { cambiarContrasena } from "@/data/auth";
import { inicioDe } from "@/funciones/permisos";
import { useSesion } from "@/funciones/sesion";

type Campos = "actual" | "nueva" | "repetirNueva";

/**
 * Cambio de contraseña del primer ingreso (HU-SIS-01).
 *
 * No se puede saltear: el guard manda acá a cualquier usuario con
 * `debeCambiarContrasena`, y esta pantalla no ofrece salida que no sea
 * completarla (o cerrar sesión).
 */
export default function CambiarContrasenaPage() {
  const router = useRouter();
  const { sesion, cargando, establecer, cerrar } = useSesion();

  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [repetirNueva, setRepetir] = useState("");
  const [errores, setErrores] = useState<Partial<Record<Campos, string>>>({});
  const [errorGlobal, setErrorGlobal] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Sin sesión no hay nada que cambiar.
  useEffect(() => {
    if (!cargando && !sesion) router.replace("/");
  }, [cargando, sesion, router]);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorGlobal(null);

    const body: CambiarContrasenaBody = { actual, nueva, repetirNueva };

    // Se valida con el schema del contrato: la política (8 caracteres,
    // mayúscula, minúscula, número), la coincidencia y el "distinta de la
    // actual" están escritas una sola vez, y el back las revalida con parseBody.
    const resultado = cambiarContrasenaBody.safeParse(body);
    if (!resultado.success) {
      const encontrados: Partial<Record<Campos, string>> = {};
      for (const issue of resultado.error.issues) {
        const campo = issue.path[0] as Campos | undefined;
        if (campo && !encontrados[campo]) encontrados[campo] = issue.message;
      }
      setErrores(encontrados);
      const primero = (["actual", "nueva", "repetirNueva"] as const).find((c) => encontrados[c]);
      if (primero) document.getElementById(`contrasena-${primero}`)?.focus();
      return;
    }

    setErrores({});
    setEnviando(true);
    try {
      // BACKEND: POST /api/auth/cambiar-contrasena (contrato src/contracts/auth.ts).
      const nuevaSesion = await cambiarContrasena(body);
      establecer(nuevaSesion);
      const destino = inicioDe(nuevaSesion.usuario.rol.nombre);
      router.replace(destino ? destino.href : "/inicio");
    } catch (err) {
      const codigo = (err instanceof ApiError ? err.codigo : undefined) as ErrorAuth | undefined;
      if (codigo === "CREDENCIALES_INVALIDAS") {
        setErrores({ actual: "La contraseña actual no es correcta." });
      } else if (codigo === "CONTRASENA_REUSADA") {
        setErrores({ nueva: mensajeDeError(err) });
      } else if (codigo === "CONTRASENA_INSEGURA") {
        setErrores({ nueva: mensajeDeError(err) });
      } else {
        setErrorGlobal(mensajeDeError(err));
      }
    } finally {
      setEnviando(false);
    }
  };

  if (cargando || !sesion) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex min-h-screen flex-1 items-center justify-center bg-surface"
      >
        <span className="text-sm font-semibold text-on-surface-variant">Verificando tu sesión…</span>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-surface px-4 py-10">
      <div className="flex w-full max-w-md flex-col gap-6">
        <header className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-md bg-primary">
            <Icon name="lock_reset" size={32} className="text-on-primary" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold text-on-surface">
              Definí tu contraseña
            </h1>
            <p className="text-sm font-medium text-on-surface-variant">
              Es tu primer ingreso, {sesion.usuario.nombre}: la contraseña temporal no se puede
              seguir usando.
            </p>
          </div>
        </header>

        <form
          onSubmit={guardar}
          className="flex flex-col gap-4 rounded-md border border-outline-variant bg-surface-container-lowest p-6 shadow-card"
        >
          {errorGlobal && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-sm border border-error/40 bg-error/5 px-3 py-2 text-sm font-semibold text-error"
            >
              <Icon name="error" size={16} className="mt-px shrink-0" />
              {errorGlobal}
            </p>
          )}

          <CampoContrasena
            id="contrasena-actual"
            label="Contraseña actual"
            requiredMark
            autoComplete="current-password"
            autoFocus
            value={actual}
            onChange={(e) => setActual(e.target.value)}
            error={errores.actual}
          />

          <div className="flex flex-col gap-2">
            <CampoContrasena
              id="contrasena-nueva"
              label="Contraseña nueva"
              requiredMark
              autoComplete="new-password"
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
              error={errores.nueva}
            />
            {/* Los requisitos se tildan mientras se escribe: nadie tiene que
                descubrir al apretar Guardar que le faltaba un número. */}
            <RequisitosContrasena valor={nueva} actual={actual} />
          </div>

          <CampoContrasena
            id="contrasena-repetirNueva"
            label="Repetir la contraseña nueva"
            requiredMark
            autoComplete="new-password"
            value={repetirNueva}
            onChange={(e) => setRepetir(e.target.value)}
            error={errores.repetirNueva}
          />

          <Button type="submit" disabled={enviando}>
            <Icon name={enviando ? "progress_activity" : "check"} size={16} />
            {enviando ? "Guardando…" : "Guardar y continuar"}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => void cerrar()}
          className="mx-auto flex min-h-11 cursor-pointer items-center gap-2 rounded-sm px-3 text-sm font-semibold text-on-surface-variant hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
        >
          <Icon name="logout" size={16} />
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
