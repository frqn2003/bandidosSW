"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { recuperarBody, type RecuperarBody } from "@/contracts/auth";
import { mensajeDeError } from "@/lib/api-client";
import { Icon } from "@/components/ui/Icon";
import NetworkCanvas from "@/components/ui/network-canvas";
import { recuperarContrasena } from "@/data/auth";

/**
 * Recuperación de contraseña (HU-SIS-01).
 *
 * La confirmación **no dice si el email existe**: si dijera "no encontramos esa
 * cuenta", la pantalla sería un detector de emails registrados en el centro.
 * Por eso el mensaje final es condicional ("si corresponde a una cuenta…") y el
 * contrato define que el endpoint devuelve 204 siempre.
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
    <div className="relative min-h-[100svh] flex flex-col items-center justify-center bg-[#101012] text-white p-5 sm:p-8 overflow-x-hidden selection:bg-[#fdef8a] selection:text-[#101012]">
      {/* Fondo de red de nodos animados */}
      <NetworkCanvas />

      {/* Tarjeta física con textura de papel Manila y cinta adhesiva */}
      <main
        role="main"
        className="relative z-10 w-full max-w-[440px] bg-[#efe0c4] text-[#1b1a17] rounded-[18px] p-7 sm:p-10 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.7),0_0_0_1px_rgba(0,0,0,0.4)] rotate-0 sm:-rotate-[0.6deg]"
      >
        {/* Cinta adhesiva semi-transparente en el encabezado */}
        <span
          aria-hidden="true"
          className="absolute -top-3.5 left-1/2 -translate-x-1/2 -rotate-2 w-28 h-6 bg-[#fdef8a]/85 shadow-[0_2px_6px_rgba(0,0,0,0.25)] pointer-events-none"
        />

        {/* Brandmark: Logo y Título */}
        <div className="flex flex-col items-center gap-2 mb-6 text-center">
          <Link href="/landing" className="transition-transform hover:scale-105 inline-block">
            <Image
              src="/LogoNegro.png"
              alt="Logo Nexo Académico"
              width={56}
              height={56}
              className="h-14 w-14 object-contain"
              priority
            />
          </Link>
          <h1 className="m-0 text-3xl sm:text-[32px] font-extrabold tracking-tight text-[#101012] leading-none">
            {enviado ? "Revisá tu correo" : "Recuperar contraseña"}
          </h1>
          <p className="m-0 text-sm font-medium text-[#5b5950] max-w-[34ch]">
            {enviado
              ? "Te enviamos las instrucciones a tu casilla"
              : "Ingresá tu email institucional y te enviamos un enlace"}
          </p>
        </div>

        {enviado ? (
          <section role="status" className="flex flex-col gap-4 text-center">
            <div className="bg-white/70 border border-black/10 rounded-[10px] p-4 text-left shadow-sm">
              <p className="text-xs sm:text-sm text-[#1b1a17] font-medium leading-relaxed">
                Si <strong className="font-bold text-[#101012]">{email.trim().toLowerCase()}</strong> corresponde a una cuenta registrada, te mandamos un enlace para definir una nueva contraseña.
              </p>
              <p className="text-[11px] sm:text-xs text-[#5b5950] font-normal mt-2 leading-normal">
                El enlace vence en 1 hora. Si no lo ves en tu bandeja de entrada, revisá también la carpeta de spam.
              </p>
            </div>

            <Link
              href="/login"
              className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-[10px] bg-[#101012] text-white font-bold text-sm sm:text-base cursor-pointer hover:bg-[#1f1f24] hover:-translate-y-0.5 active:translate-y-0 transition-all shadow-md"
            >
              <Icon name="arrow_back" size={18} />
              Volver al inicio de sesión
            </Link>
          </section>
        ) : (
          <form onSubmit={enviar} noValidate className="flex flex-col">
            {error && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-[#e5484d]/40 bg-[#e5484d]/10 px-3 py-2.5 text-xs sm:text-sm font-semibold text-[#b91c1c] mb-4"
              >
                <Icon name="error" size={16} className="mt-0.5 shrink-0" />
                {error}
              </p>
            )}

            {/* Campo Email */}
            <div className="mb-4">
              <label
                htmlFor="recuperar-email"
                className="block font-bold text-xs sm:text-sm text-[#101012] mb-1.5"
              >
                Email registrado <span className="text-[#e5484d]" aria-hidden="true">*</span>
              </label>
              <input
                id="recuperar-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                autoFocus
                maxLength={120}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu.cuenta@academia.edu.ar"
                className="w-full px-3.5 py-3 text-sm sm:text-base font-normal bg-white text-[#101012] border border-black/15 rounded-[10px] placeholder:text-[#9a978c] transition-all focus:border-[#101012] focus:ring-4 focus:ring-[#fdef8a]/60 focus:outline-none"
              />
            </div>

            {/* Botón de Enviar */}
            <button
              type="submit"
              disabled={enviando}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3.5 px-5 rounded-[10px] bg-[#101012] text-white font-bold text-sm sm:text-base cursor-pointer hover:bg-[#1f1f24] hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 shadow-md"
            >
              <Icon
                name={enviando ? "progress_activity" : "send"}
                size={18}
                className={enviando ? "animate-spin" : ""}
              />
              {enviando ? "Enviando enlace…" : "Enviar enlace de recuperación"}
            </button>

            {/* Volver al login */}
            <Link
              href="/login"
              className="block text-center mt-4 font-semibold text-sm text-[#101012] underline decoration-black/25 underline-offset-4 hover:decoration-[#101012] transition-colors"
            >
              Volver al inicio de sesión
            </Link>
          </form>
        )}

        {/* Post-it manuscrito en la esquina inferior */}
        <span
          aria-hidden="true"
          className="hidden sm:block absolute -bottom-4 -right-3 bg-white text-[#101012] px-3.5 py-1.5 rounded-2xl rounded-bl-sm shadow-[0_6px_18px_rgba(0,0,0,0.35)] rotate-3 pointer-events-none select-none text-base font-semibold"
          style={{ fontFamily: "var(--font-caveat), Caveat, cursive" }}
        >
          {enviado ? "Revisá tu casilla ✉️" : "Te ayudamos a entrar"}
        </span>
      </main>

      {/* Pie institucional */}
      <footer className="mt-8 text-center text-xs text-[#a3a3ad] z-10">
        © 2026 Nexo Académico ·{" "}
        <Link href="/landing" className="text-[#d8d8de] hover:text-[#fdef8a] transition-colors">
          Inicio
        </Link>{" "}
        ·{" "}
        <Link href="/login" className="text-[#d8d8de] hover:text-[#fdef8a] transition-colors">
          Iniciar sesión
        </Link>
      </footer>
    </div>
  );
}
