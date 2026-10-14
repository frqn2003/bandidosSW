"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { DatosCuentaBloqueada, ErrorAuth, LoginBody } from "@/contracts/auth";
import { ApiError, mensajeDeError } from "@/lib/api-client";
import { Icon } from "@/components/ui/Icon";
import NetworkCanvas from "@/components/ui/network-canvas";
import { login } from "@/data/auth";
import { inicioDe } from "@/funciones/permisos";
import { useSesion } from "@/funciones/sesion";

/** mm:ss a partir de segundos, para la cuenta regresiva del bloqueo. */
function mmss(segundos: number): string {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function LoginPage() {
  const router = useRouter();
  const { sesion, cargando, establecer, motivoSalida, limpiarMotivo } = useSesion();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  /** Timestamp hasta el que la cuenta está bloqueada (ms), o null. */
  const [bloqueadoHasta, setBloqueadoHasta] = useState<number | null>(null);
  const [restante, setRestante] = useState(0);

  // Ya hay sesión: no tiene sentido mostrar el login.
  useEffect(() => {
    if (cargando || !sesion) return;
    if (sesion.debeCambiarContrasena) {
      router.replace("/cambiar-contrasena");
      return;
    }
    const destino = inicioDe(sesion.usuario.rol.nombre);
    router.replace(destino ? destino.href : "/inicio");
  }, [cargando, sesion, router]);

  // Cuenta regresiva del bloqueo: se actualiza sola y devuelve el formulario
  // cuando llega a cero. Un texto fijo ("15 minutos") obliga a adivinar cuándo volver a probar.
  useEffect(() => {
    if (bloqueadoHasta === null) return;
    const tick = () => {
      const seg = Math.ceil((bloqueadoHasta - Date.now()) / 1000);
      if (seg <= 0) {
        setBloqueadoHasta(null);
        setRestante(0);
        setError(null);
      } else {
        setRestante(seg);
      }
    };
    tick();
    const intervalo = window.setInterval(tick, 1000);
    return () => window.clearInterval(intervalo);
  }, [bloqueadoHasta]);

  const bloqueada = bloqueadoHasta !== null;

  const ingresar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bloqueada) return;

    setEnviando(true);
    setError(null);
    limpiarMotivo();
    try {
      // BACKEND: POST /api/auth/login (contrato src/contracts/auth.ts).
      const body: LoginBody = { email: email.trim().toLowerCase(), password };
      const nueva = await login(body);
      establecer(nueva);

      if (nueva.debeCambiarContrasena) {
        router.replace("/cambiar-contrasena");
        return;
      }
      const destino = inicioDe(nueva.usuario.rol.nombre);
      router.replace(destino ? destino.href : "/inicio");
    } catch (err) {
      const codigo = (err instanceof ApiError ? err.codigo : undefined) as ErrorAuth | undefined;
      if (codigo === "CUENTA_BLOQUEADA") {
        const datos = err instanceof ApiError ? (err.datos as DatosCuentaBloqueada | undefined) : undefined;
        if (datos?.bloqueadoHasta) setBloqueadoHasta(new Date(datos.bloqueadoHasta).getTime());
        setError(mensajeDeError(err));
      } else {
        setError(mensajeDeError(err));
      }
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="relative min-h-[100svh] flex flex-col items-center justify-center bg-[#101012] text-white p-5 sm:p-8 overflow-x-hidden selection:bg-[#fdef8a] selection:text-[#101012]">
      {/* Fondo orgánico con red de nodos y conexiones interactivas */}
      <NetworkCanvas />

      {/* Tarjeta física con look de papel Manila y cinta adhesiva */}
      <main
        role="main"
        className="relative z-10 w-full max-w-[440px] bg-[#efe0c4] text-[#1b1a17] rounded-[18px] p-7 sm:p-10 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.7),0_0_0_1px_rgba(0,0,0,0.4)] rotate-0 sm:-rotate-[0.6deg]"
      >
        {/* Cinta adhesiva semi-transparente en la parte superior */}
        <span
          aria-hidden="true"
          className="absolute -top-3.5 left-1/2 -translate-x-1/2 -rotate-2 w-28 h-6 bg-[#fdef8a]/85 shadow-[0_2px_6px_rgba(0,0,0,0.25)] pointer-events-none"
        />

        {/* Brandmark: Logo oficial e identidad */}
        <div className="flex flex-col items-center gap-2 mb-6 text-center">
          <Link href="/" className="transition-transform hover:scale-105 inline-block">
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
            Nexo Académico
          </h1>
          <p className="m-0 text-sm font-medium text-[#5b5950]">
            Ingresá con tu cuenta del centro
          </p>
        </div>

        {/* Aviso de sesión cerrada por inactividad */}
        {motivoSalida === "inactividad" && (
          <p
            role="status"
            className="flex items-start gap-2 rounded-lg border border-[#3b82f6]/40 bg-[#3b82f6]/10 px-3 py-2.5 text-xs sm:text-sm font-semibold text-[#1e40af] mb-4"
          >
            <Icon name="schedule" size={16} className="mt-0.5 shrink-0" />
            Tu sesión se cerró por inactividad. Volvé a ingresar.
          </p>
        )}

        {/* Formulario de Login */}
        <form onSubmit={ingresar} noValidate className="flex flex-col">
          {error && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-[#e5484d]/40 bg-[#e5484d]/10 px-3 py-2.5 text-xs sm:text-sm font-semibold text-[#b91c1c] mb-4"
            >
              <Icon name={bloqueada ? "lock" : "error"} size={16} className="mt-0.5 shrink-0" />
              {error}
            </p>
          )}

          {bloqueada ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <p className="text-sm font-medium text-[#5b5950]">
                Vas a poder intentar de nuevo en
              </p>
              <p
                className="text-4xl font-extrabold tabular-nums text-[#101012]"
                aria-live="polite"
              >
                {mmss(restante)}
              </p>
            </div>
          ) : (
            <>
              {/* Campo Email */}
              <div className="mb-4">
                <label
                  htmlFor="email"
                  className="block font-bold text-xs sm:text-sm text-[#101012] mb-1.5"
                >
                  Email <span className="text-[#e5484d]" aria-hidden="true">*</span>
                </label>
                <div className="relative">
                  <input
                    id="email"
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
              </div>

              {/* Campo Contraseña con botón de mostrar/ocultar */}
              <div className="mb-4">
                <label
                  htmlFor="password"
                  className="block font-bold text-xs sm:text-sm text-[#101012] mb-1.5"
                >
                  Contraseña <span className="text-[#e5484d]" aria-hidden="true">*</span>
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={mostrarPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    placeholder="Tu contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-3.5 pr-11 py-3 text-sm sm:text-base font-normal bg-white text-[#101012] border border-black/15 rounded-[10px] placeholder:text-[#9a978c] transition-all focus:border-[#101012] focus:ring-4 focus:ring-[#fdef8a]/60 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarPassword(!mostrarPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-[#5b5950] hover:text-[#101012] rounded-md transition-colors cursor-pointer"
                    aria-label={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    aria-pressed={mostrarPassword}
                  >
                    <Icon name={mostrarPassword ? "visibility_off" : "visibility"} size={20} />
                  </button>
                </div>
              </div>

              {/* Botón de Enviar */}
              <button
                type="submit"
                disabled={enviando}
                className="w-full mt-2 flex items-center justify-center gap-2 py-3.5 px-5 rounded-[10px] bg-[#101012] text-white font-bold text-sm sm:text-base cursor-pointer hover:bg-[#1f1f24] hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 shadow-md"
              >
                <Icon
                  name={enviando ? "progress_activity" : "login"}
                  size={18}
                  className={enviando ? "animate-spin" : ""}
                />
                {enviando ? "Ingresando…" : "Iniciar sesión"}
              </button>
            </>
          )}

          {/* Enlace de recuperación */}
          <Link
            href="/recuperar-contrasena"
            className="block text-center mt-4 font-semibold text-sm text-[#101012] underline decoration-black/25 underline-offset-4 hover:decoration-[#101012] transition-colors"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </form>

        {/* Post-it manuscrito en la esquina inferior */}
        <span
          aria-hidden="true"
          className="hidden sm:block absolute -bottom-4 -right-3 bg-white text-[#101012] px-3.5 py-1.5 rounded-2xl rounded-bl-sm shadow-[0_6px_18px_rgba(0,0,0,0.35)] rotate-3 pointer-events-none select-none text-base font-semibold"
          style={{ fontFamily: "var(--font-caveat), Caveat, cursive" }}
        >
          ¡Nos vemos adentro!
        </span>
      </main>

      {/* Pie institucional */}
      <footer className="mt-8 text-center text-xs text-[#a3a3ad] z-10">
        © 2026 Nexo Académico ·{" "}
        <Link href="/" className="text-[#d8d8de] hover:text-[#fdef8a] transition-colors">
          Inicio
        </Link>{" "}
        ·{" "}
        <Link href="/#testimonios" className="text-[#d8d8de] hover:text-[#fdef8a] transition-colors">
          Experiencias
        </Link>
      </footer>
    </div>
  );
}
