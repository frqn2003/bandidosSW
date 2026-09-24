"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { DatosCuentaBloqueada, ErrorAuth, LoginBody } from "@/contracts/auth";
import { ApiError, mensajeDeError } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { CampoContrasena } from "@/components/auth/CampoContrasena";
import { CREDENCIALES_DEMO, login } from "@/data/auth";
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
  // cuando llega a cero. Un texto fijo ("15 minutos") obliga a adivinar cuándo
  // volver a probar.
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
      // BACKEND: POST /api/auth/login (contrato src/contracts/auth.ts). El
      // evento `login` / `login_fallido` lo registra el back en auditoria_sesion.
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
        // CREDENCIALES_INVALIDAS se muestra tal cual y sin marcar ningún campo:
        // pintar en rojo el input de la contraseña diría que el email estaba bien.
        setError(mensajeDeError(err));
      }
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-surface px-4 py-10">
      <div className="flex w-full max-w-md flex-col gap-6">
        <header className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-md bg-primary">
            <Icon name="school" size={32} className="text-on-primary" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold text-on-surface">Centro Académico</h1>
            <p className="text-sm font-medium text-on-surface-variant">
              Ingresá con tu cuenta del centro
            </p>
          </div>
        </header>

        {/* Aviso de la sesión cerrada por inactividad (viene del provider). */}
        {motivoSalida === "inactividad" && (
          <p
            role="status"
            className="flex items-start gap-2 rounded-sm border border-status-info/40 bg-status-info/10 px-3 py-2 text-sm font-semibold text-status-info-strong"
          >
            <Icon name="schedule" size={16} className="mt-px shrink-0" />
            Tu sesión se cerró por inactividad. Volvé a ingresar.
          </p>
        )}

        <form
          onSubmit={ingresar}
          className="flex flex-col gap-4 rounded-md border border-outline-variant bg-surface-container-lowest p-6 shadow-card"
        >
          {error && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-sm border border-error/40 bg-error/5 px-3 py-2 text-sm font-semibold text-error"
            >
              <Icon name={bloqueada ? "lock" : "error"} size={16} className="mt-px shrink-0" />
              {error}
            </p>
          )}

          {bloqueada ? (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <p className="text-sm font-medium text-on-surface-variant">
                Vas a poder intentar de nuevo en
              </p>
              <p
                className="font-display text-3xl font-bold tabular-nums text-on-surface"
                aria-live="polite"
              >
                {mmss(restante)}
              </p>
            </div>
          ) : (
            <>
              <Input
                id="login-email"
                label="Email"
                requiredMark
                type="email"
                autoComplete="username"
                autoFocus
                maxLength={120}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu.cuenta@academia.edu.ar"
              />
              <CampoContrasena
                id="login-password"
                label="Contraseña"
                requiredMark
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tu contraseña"
              />
              <Button type="submit" disabled={enviando}>
                <Icon name={enviando ? "progress_activity" : "login"} size={16} />
                {enviando ? "Ingresando…" : "Iniciar sesión"}
              </Button>
            </>
          )}

          <Link
            href="/recuperar-contrasena"
            className="self-center rounded-sm px-2 py-1 text-sm font-semibold text-secondary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </form>

        <PanelDemo />
      </div>
    </div>
  );
}

/**
 * Credenciales de prueba.
 *
 * Se renderiza SOLO fuera de producción. Si dependiera de que alguien se
 * acuerde de borrarlo, el día que el login sea real quedaría una lista de
 * usuarios y contraseñas a la vista de cualquiera.
 *
 * BACKEND: este panel entero se borra cuando el login use Supabase Auth.
 */
function PanelDemo() {
  if (process.env.NODE_ENV === "production") return null;

  return (
    <section className="flex flex-col gap-2 rounded-md border border-dashed border-outline-variant bg-surface-container-low p-4">
      <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-on-surface-variant">
        <Icon name="science" size={14} />
        Datos de prueba (demo del front)
      </h2>
      <ul className="flex flex-col gap-1">
        {CREDENCIALES_DEMO.map((c) => (
          <li key={c.email} className="flex flex-wrap items-baseline gap-x-2 text-xs">
            <span className="font-semibold text-on-surface">{c.rol}</span>
            <span className="font-mono text-on-surface-variant">
              {c.email} / {c.password}
            </span>
            {c.nota && (
              <span className="rounded-full bg-status-warning/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-status-warning-strong">
                {c.nota}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
