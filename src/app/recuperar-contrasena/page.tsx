"use client";

import Link from "next/link";
import { useState } from "react";
import { recuperarBody, type RecuperarBody } from "@/contracts/auth";
import { mensajeDeError } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { recuperarContrasena } from "@/data/auth";

/**
 * Recuperación de contraseña (HU-SIS-01).
 *
 * La confirmación **no dice si el email existe**: si dijera "no encontramos esa
 * cuenta", la pantalla sería un detector de emails registrados en el centro.
 * Por eso el mensaje final es condicional ("si corresponde a una cuenta…") y el
 * contrato define que el endpoint devuelve 204 siempre.
 *
 * El enlace de un solo uso con validez de 1 hora lo genera y lo envía el
 * backend (Supabase Auth); el front solo pide el envío.
 */
export default function RecuperarContrasenaPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const body: RecuperarBody = { email: email.trim().toLowerCase() };
    const resultado = recuperarBody.safeParse(body);
    if (!resultado.success) {
      setError(resultado.error.issues[0]?.message ?? "Revisá el email ingresado.");
      return;
    }

    setEnviando(true);
    try {
      // BACKEND: POST /api/auth/recuperar (contrato src/contracts/auth.ts).
      await recuperarContrasena(body);
      setEnviado(true);
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-surface px-4 py-10">
      <div className="flex w-full max-w-md flex-col gap-6">
        <header className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-md bg-primary">
            <Icon name={enviado ? "mark_email_read" : "help"} size={32} className="text-on-primary" />
          </span>
          <h1 className="font-display text-2xl font-bold text-on-surface">
            {enviado ? "Revisá tu correo" : "Recuperar contraseña"}
          </h1>
        </header>

        {enviado ? (
          <section
            role="status"
            className="flex flex-col gap-3 rounded-md border border-outline-variant bg-surface-container-lowest p-6 text-center shadow-card"
          >
            <p className="text-sm font-medium text-on-surface-variant">
              Si <strong className="text-on-surface">{email.trim().toLowerCase()}</strong>{" "}
              corresponde a una cuenta del centro, le enviamos un enlace para definir una
              contraseña nueva.
            </p>
            <p className="text-xs font-medium text-on-surface-variant">
              El enlace vence en 1 hora y se puede usar una sola vez. Puede tardar unos minutos en
              llegar; si no aparece, revisá también el correo no deseado.
            </p>
            <Link
              href="/"
              className="mx-auto inline-flex h-11 min-h-11 items-center justify-center gap-2 rounded-sm bg-secondary px-5 text-sm font-bold text-on-secondary transition-all duration-fast ease-out hover:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              <Icon name="arrow_back" size={16} />
              Volver al inicio de sesión
            </Link>
          </section>
        ) : (
          <form
            onSubmit={enviar}
            className="flex flex-col gap-4 rounded-md border border-outline-variant bg-surface-container-lowest p-6 shadow-card"
          >
            <p className="text-sm font-medium text-on-surface-variant">
              Ingresá tu email y te enviamos un enlace para definir una contraseña nueva.
            </p>
            <Input
              id="recuperar-email"
              label="Email"
              requiredMark
              type="email"
              autoComplete="username"
              autoFocus
              maxLength={120}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={error ?? undefined}
              placeholder="tu.cuenta@academia.edu.ar"
            />
            <Button type="submit" disabled={enviando}>
              <Icon name={enviando ? "progress_activity" : "send"} size={16} />
              {enviando ? "Enviando…" : "Enviar enlace"}
            </Button>
            <Link
              href="/"
              className="self-center rounded-sm px-2 py-1 text-sm font-semibold text-secondary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
            >
              Volver al inicio de sesión
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
