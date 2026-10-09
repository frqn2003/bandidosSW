"use client";

import React, { useEffect, useRef, useState } from "react";
import { MessageCircle, LogIn, BookOpen, Award, Star, ArrowUp, X } from "lucide-react";
import { cn } from "@/lib/utils";
import LiveOrb from "@/components/ui/live-orb";

export interface RadialSocialMenuProps {
  className?: string;
}

interface MenuItem {
  icon: React.ReactNode;
  label: string;
  href: string;
  isExternal?: boolean;
  accentColor?: string;
}

export default function RadialSocialMenu({ className }: RadialSocialMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [angleOffset, setAngleOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showSpeechBubble, setShowSpeechBubble] = useState(false);
  const [bubbleMessage, setBubbleMessage] = useState("Podés desplazarte hacia abajo para explorar");

  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const lastAngleRef = useRef(0);
  const lastTimeRef = useRef(0);
  const angularVelocityRef = useRef(0.0015);
  const totalDragMovementRef = useRef(0);
  const bubbleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const materiasTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasLeftHeroRef = useRef(false);

  const triggerBubble = (text: string, durationMs: number = 5000) => {
    setBubbleMessage(text);
    setShowSpeechBubble(true);
    if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
    bubbleTimerRef.current = setTimeout(() => {
      setShowSpeechBubble(false);
    }, durationMs);
  };

  const menuItems: MenuItem[] = [
    {
      icon: <MessageCircle className="w-5 h-5 text-white" />,
      label: "WhatsApp Oficial",
      href: "https://wa.me/5493870000000?text=Hola%20Nexo%20Acad%C3%A9mico,%20quiero%20m%C3%A1s%20informaci%C3%B3n%20sobre%20las%20materias",
      isExternal: true,
      accentColor: "hover:border-white/60 hover:shadow-white/20",
    },
    {
      icon: <LogIn className="w-5 h-5 text-white" />,
      label: "Iniciar Sesión",
      href: "/login",
      accentColor: "hover:border-white/60 hover:shadow-white/20",
    },
    {
      icon: <BookOpen className="w-5 h-5 text-white" />,
      label: "Plan de Estudios",
      href: "#materias-destacadas",
      accentColor: "hover:border-white/60 hover:shadow-white/20",
    },
    {
      icon: <Award className="w-5 h-5 text-white" />,
      label: "¿Por qué elegirnos?",
      href: "#por-que-elegirnos",
      accentColor: "hover:border-white/60 hover:shadow-white/20",
    },
    {
      icon: <Star className="w-5 h-5 text-white" />,
      label: "Testimonios",
      href: "#testimonios",
      accentColor: "hover:border-white/60 hover:shadow-white/20",
    },
    {
      icon: <ArrowUp className="w-5 h-5 text-white" />,
      label: "Subir al Inicio",
      href: "#inicio",
      accentColor: "hover:border-white/60 hover:shadow-white/20",
    },
  ];

  const radius = 125;

  // Cálculo del ángulo desde el centro del botón hacia las coordenadas del puntero
  const getAngle = (clientX: number, clientY: number) => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    return Math.atan2(clientY - centerY, clientX - centerX);
  };

  // Inercia y rotación física continua
  useEffect(() => {
    if (!isOpen) return;
    let animationFrame: number;

    const animate = () => {
      if (!isDraggingRef.current) {
        if (Math.abs(angularVelocityRef.current) > 0.0018) {
          setAngleOffset((prev) => prev + angularVelocityRef.current);
          angularVelocityRef.current *= 0.95; // Fricción suave
        } else {
          angularVelocityRef.current = 0.0015; // Velocidad basal en reposo
          setAngleOffset((prev) => prev + 0.0015);
        }
      }
      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [isOpen]);

  // Mensaje al inicio de la landing: exactamente 4 segundos después de iniciar la página
  useEffect(() => {
    let startTimer: NodeJS.Timeout | null = null;
    
    // Solo inicia el temporizador de 4 segundos si estamos en el inicio
    if (typeof window !== "undefined" && window.scrollY < 200) {
      startTimer = setTimeout(() => {
        if (window.scrollY < 200) {
          triggerBubble("Podés desplazarte hacia abajo para explorar", 5000);
        }
      }, 4000);
    }

    const handleScroll = () => {
      // Si el usuario empieza a scrollear antes de los 4 segundos, cancelamos para no interrumpir
      if (window.scrollY > 150 && startTimer) {
        clearTimeout(startTimer);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      if (startTimer) clearTimeout(startTimer);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Al llegar a la sección de materias o volver al inicio tras haber navegado
  useEffect(() => {
    const materiasTarget = document.getElementById("materias-destacadas");
    const inicioTarget = document.getElementById("inicio");

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target.id === "materias-destacadas") {
            if (entry.isIntersecting) {
              hasLeftHeroRef.current = true;
              if (materiasTimerRef.current) clearTimeout(materiasTimerRef.current);
              materiasTimerRef.current = setTimeout(() => {
                triggerBubble("Apoyá el cursor sobre una materia para ver detalles", 5000);
              }, 3000);
            } else {
              if (materiasTimerRef.current) clearTimeout(materiasTimerRef.current);
              setShowSpeechBubble(false);
            }
          } else if (entry.target.id === "inicio") {
            if (!entry.isIntersecting) {
              // El usuario bajó y dejó la sección de inicio
              hasLeftHeroRef.current = true;
            } else if (hasLeftHeroRef.current && window.scrollY < 150) {
              // Solo vuelve a disparar si el usuario navegó hacia abajo y regresó después
              triggerBubble("Podés desplazarte hacia abajo para explorar", 4000);
            }
          }
        }
      },
      {
        threshold: 0.2,
      }
    );

    if (materiasTarget) observer.observe(materiasTarget);
    if (inicioTarget) observer.observe(inicioTarget);

    return () => {
      observer.disconnect();
      if (materiasTimerRef.current) clearTimeout(materiasTimerRef.current);
    };
  }, []);

  // Manejo de eventos globales de arrastre
  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;

      const currentAngle = getAngle(e.clientX, e.clientY);
      let delta = currentAngle - lastAngleRef.current;

      // Normalización de salto de cuadrante (-π a π)
      if (delta > Math.PI) delta -= 2 * Math.PI;
      if (delta < -Math.PI) delta += 2 * Math.PI;

      totalDragMovementRef.current += Math.abs(delta);
      setAngleOffset((prev) => prev + delta);

      const now = performance.now();
      const dt = now - lastTimeRef.current;
      if (dt > 0) {
        // Cálculo de velocidad instantánea
        angularVelocityRef.current = Math.max(-0.15, Math.min(0.15, (delta / dt) * 16));
      }

      lastAngleRef.current = currentAngle;
      lastTimeRef.current = now;
    };

    const onPointerUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setIsDragging(false);
      }
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isOpen) return;
    isDraggingRef.current = true;
    setIsDragging(true);
    lastAngleRef.current = getAngle(e.clientX, e.clientY);
    lastTimeRef.current = performance.now();
    angularVelocityRef.current = 0;
    totalDragMovementRef.current = 0;
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!isOpen) return;
    e.stopPropagation();
    const delta = e.deltaY * 0.0015;
    setAngleOffset((prev) => prev + delta);
    angularVelocityRef.current = Math.max(-0.1, Math.min(0.1, delta * 0.4));
  };

  const handleItemClick = (e: React.MouseEvent<HTMLAnchorElement>, item: MenuItem) => {
    // Si el usuario arrastró la rueda, ignorar el clic accidental
    if (totalDragMovementRef.current > 0.06) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    if (!item.isExternal && item.href.startsWith("#")) {
      e.preventDefault();
      setIsOpen(false);
      const targetElement = document.querySelector(item.href);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: "smooth" });
      }
    } else if (!item.isExternal) {
      setIsOpen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      className={cn("relative flex items-center justify-center select-none pointer-events-auto", className)}
    >
      {/* Globito de conversación que surge del globo con ojos (fondo blanco translúcido con blur) */}
      {showSpeechBubble && !isOpen && (
        <div
          role="status"
          aria-live="polite"
          onClick={() => {
            if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
            if (materiasTimerRef.current) clearTimeout(materiasTimerRef.current);
            setShowSpeechBubble(false);
          }}
          className="absolute bottom-full right-0 mb-4 z-30 w-56 sm:w-64 px-4 py-3 rounded-2xl bg-white/85 backdrop-blur-md border border-slate-200/80 shadow-2xl shadow-slate-900/15 text-xs sm:text-sm cursor-pointer animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-300 hover:scale-[1.02] transition-transform select-none"
        >
          <p className="leading-snug text-slate-950 font-normal">
            {bubbleMessage}
          </p>
          {/* Pico triangular limpio sin superposición interna de transparencias */}
          <div
            aria-hidden="true"
            className="absolute top-full -mt-[1px] right-7 sm:right-9 w-3.5 h-2 pointer-events-none"
          >
            <svg
              className="w-full h-full overflow-visible"
              viewBox="0 0 14 8"
              fill="none"
            >
              <path
                d="M0 0 L7 7 L14 0"
                fill="rgba(255, 255, 255, 0.85)"
                stroke="rgba(226, 232, 240, 0.8)"
                strokeWidth="1"
              />
            </svg>
          </div>
        </div>
      )}

      {/* Botón Central Disparador con Live Orb 3D */}
      <button
        onClick={() => {
          if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
          if (materiasTimerRef.current) clearTimeout(materiasTimerRef.current);
          setShowSpeechBubble(false);
          setIsOpen(!isOpen);
        }}
        aria-label="Abrir menú de navegación y accesos"
        className="relative z-20 flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-900/70 backdrop-blur-2xl shadow-2xl border border-white/30 text-white transition-all duration-300 hover:scale-105 hover:shadow-blue-500/40 focus:outline-none cursor-pointer overflow-visible group"
      >
        {isOpen ? (
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white/15 backdrop-blur-md border border-white/25">
            <X className="w-7 h-7 text-white transition-transform duration-300 rotate-90" />
          </div>
        ) : (
          <LiveOrb size={70} className="transition-transform duration-300 group-hover:scale-110" />
        )}
      </button>

      {/* Anillo y Botones Satélites Giratorios con área de captura completa (320px) */}
      <div
        onPointerDown={handlePointerDown}
        className={cn(
          "absolute -inset-32 sm:-inset-36 rounded-full flex items-center justify-center transition-all duration-500 touch-none",
          isOpen
            ? "opacity-100 scale-100 pointer-events-auto cursor-grab"
            : "opacity-0 scale-50 pointer-events-none",
          isDragging && "cursor-grabbing"
        )}
      >
        {/* Guía circular interactiva con mayor visibilidad y glow */}
        <div
          className={cn(
            "absolute rounded-full border-2 border-dashed transition-all duration-300 pointer-events-none bg-white/[0.03] backdrop-blur-[1px]",
            isDragging
              ? "border-blue-400/80 shadow-[0_0_25px_rgba(59,130,246,0.35)] scale-105 bg-blue-500/[0.05]"
              : "border-white/50 shadow-[0_0_18px_rgba(255,255,255,0.15)]"
          )}
          style={{
            width: `${radius * 2}px`,
            height: `${radius * 2}px`,
          }}
        />

        {/* Íconos circulares satélites con Tooltips */}
        {menuItems.map((item, index) => {
          const angle = (index / menuItems.length) * 2 * Math.PI + angleOffset;
          const x = (radius * Math.cos(angle)).toFixed(2);
          const y = (radius * Math.sin(angle)).toFixed(2);

          return (
            <div
              key={index}
              suppressHydrationWarning
              className="absolute z-10 flex items-center justify-center"
              style={{
                transform: `translate(${x}px, ${y}px)`,
              }}
            >
              <a
                href={item.href}
                onClick={(e) => handleItemClick(e, item)}
                target={item.isExternal ? "_blank" : undefined}
                rel={item.isExternal ? "noopener noreferrer" : undefined}
                aria-label={item.label}
                className={cn(
                  "group/sat relative flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-slate-900/80 backdrop-blur-xl border border-white/20 shadow-xl text-white transition-all duration-300 hover:scale-125 hover:bg-slate-800/90 active:scale-95",
                  item.accentColor
                )}
              >
                {item.icon}

                {/* Tooltip flotante al hacer Hover (oculto durante arrastre para evitar interferencia visual) */}
                <span
                  className={cn(
                    "absolute bottom-full mb-2.5 hidden sm:block opacity-0 group-hover/sat:opacity-100 pointer-events-none transition-all duration-200 transform translate-y-1 group-hover/sat:translate-y-0 px-2.5 py-1 rounded-lg text-[11px] font-semibold tracking-wide whitespace-nowrap bg-slate-950/90 text-white border border-white/20 shadow-2xl backdrop-blur-md",
                    isDragging && "hidden opacity-0"
                  )}
                >
                  {item.label}
                </span>
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}
