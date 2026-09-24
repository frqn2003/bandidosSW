"use client";

// Contexto de sesión del front (HU-SIS-01).
//
// Resuelve tres cosas para toda la app:
//   1. Quién está logueado (y si hay que esperar a saberlo).
//   2. El cierre de sesión, manual o por inactividad.
//   3. El aviso previo al vencimiento, para no tirarle el trabajo al usuario.
//
// ⚠️ Es UX, no seguridad: el estado vive en el navegador. La autorización real
// la hace el back en cada endpoint.

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { MINUTOS_INACTIVIDAD, type SesionResponse } from "@/contracts/auth";
import { logout as apiLogout, sesionActual } from "@/data/auth";

/** Motivo por el que se volvió al login; la pantalla lo muestra como aviso. */
export type MotivoSalida = "inactividad" | null;

type ContextoSesion = {
  sesion: SesionResponse | null;
  /** true mientras se resuelve la sesión guardada (evita el parpadeo login → contenido). */
  cargando: boolean;
  motivoSalida: MotivoSalida;
  /** Guarda la sesión recién obtenida del login o del cambio de contraseña. */
  establecer: (sesion: SesionResponse) => void;
  cerrar: () => Promise<void>;
  limpiarMotivo: () => void;
  /** Segundos que faltan para que expire, o null si no está por expirar. */
  segundosParaExpirar: number | null;
  /** "Seguir conectado": reinicia el contador de inactividad. */
  renovar: () => void;
};

const Contexto = createContext<ContextoSesion | null>(null);

export function useSesion(): ContextoSesion {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error("useSesion debe usarse dentro de <SesionProvider>");
  return ctx;
}

/**
 * `?demo=inactividad` acorta la expiración a 30 segundos (con aviso a los 15)
 * para poder probarla sin esperar media hora. Mismo espíritu que `?demo=error`.
 */
function config() {
  const demo =
    typeof window !== "undefined" && window.location.search.includes("demo=inactividad");
  return demo
    ? { totalMs: 30_000, avisoMs: 15_000 }
    : { totalMs: MINUTOS_INACTIVIDAD * 60_000, avisoMs: 60_000 };
}

const EVENTOS_ACTIVIDAD = ["mousedown", "keydown", "scroll", "touchstart"] as const;

export function SesionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [sesion, setSesion] = useState<SesionResponse | null>(null);
  const [cargando, setCargando] = useState(true);
  const [motivoSalida, setMotivoSalida] = useState<MotivoSalida>(null);
  const [segundosParaExpirar, setSegundosParaExpirar] = useState<number | null>(null);
  // 0 = "todavía sin marcar". No se inicializa con Date.now() porque el
  // inicializador de useRef corre DURANTE el render, y ahí no se pueden llamar
  // funciones impuras (regla react-hooks/purity): dos renders darían valores
  // distintos. Se marca al montar, dentro del efecto.
  const ultimaActividad = useRef<number>(0);

  // Sesión guardada. El estado se toca solo dentro del `.then()`, nunca en el
  // cuerpo del efecto (regla react-hooks/set-state-in-effect).
  useEffect(() => {
    let cancelado = false;
    sesionActual()
      .then((guardada) => {
        if (cancelado) return;
        setSesion(guardada);
        setCargando(false);
      })
      .catch(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const establecer = useCallback((nueva: SesionResponse) => {
    ultimaActividad.current = Date.now();
    setSegundosParaExpirar(null);
    setMotivoSalida(null);
    setSesion(nueva);
  }, []);

  const cerrar = useCallback(async () => {
    // BACKEND: POST /api/auth/logout invalida el token y registra el evento
    // `logout` en auditoria_sesion.
    await apiLogout();
    setSesion(null);
    setSegundosParaExpirar(null);
    router.replace("/");
  }, [router]);

  const renovar = useCallback(() => {
    ultimaActividad.current = Date.now();
    setSegundosParaExpirar(null);
  }, []);

  const limpiarMotivo = useCallback(() => setMotivoSalida(null), []);

  // Expiración por inactividad. El efecto solo registra listeners y un
  // intervalo: el estado se toca dentro de los callbacks.
  useEffect(() => {
    if (!sesion) return;
    const { totalMs, avisoMs } = config();
    // Primera marca: acá sí, el efecto corre después del render.
    ultimaActividad.current = Date.now();

    const marcarActividad = () => {
      // Mientras el aviso está en pantalla, moverse no alcanza: el usuario
      // tiene que decir explícitamente "seguir conectado". Si no, cualquier
      // roce del mouse cancelaría un aviso que no llegó a leer.
      ultimaActividad.current = Date.now();
    };
    for (const evento of EVENTOS_ACTIVIDAD) {
      window.addEventListener(evento, marcarActividad, { passive: true });
    }

    const intervalo = window.setInterval(() => {
      const inactivoMs = Date.now() - ultimaActividad.current;
      const restanteMs = totalMs - inactivoMs;

      if (restanteMs <= 0) {
        setSesion(null);
        setSegundosParaExpirar(null);
        setMotivoSalida("inactividad");
        // BACKEND: la sesión real la corta el server; cualquier endpoint
        // devuelve NO_AUTENTICADO (401) y el front redirige igual que acá.
        void apiLogout();
        router.replace("/");
        return;
      }
      setSegundosParaExpirar(restanteMs <= avisoMs ? Math.ceil(restanteMs / 1000) : null);
    }, 1000);

    return () => {
      for (const evento of EVENTOS_ACTIVIDAD) {
        window.removeEventListener(evento, marcarActividad);
      }
      window.clearInterval(intervalo);
    };
  }, [sesion, router]);

  const valor = useMemo(
    () => ({
      sesion,
      cargando,
      motivoSalida,
      establecer,
      cerrar,
      limpiarMotivo,
      segundosParaExpirar,
      renovar,
    }),
    [sesion, cargando, motivoSalida, establecer, cerrar, limpiarMotivo, segundosParaExpirar, renovar],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}
