"use client";

import React, { useEffect, useState } from "react";
import { Mail, Code, Fingerprint, X, BookOpen, GraduationCap, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import LiveOrb from "@/components/ui/live-orb";

export interface RadialSocialMenuProps {
  className?: string;
}

export default function RadialSocialMenu({ className }: RadialSocialMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [angleOffset, setAngleOffset] = useState(0);

  const icons = [
    { icon: <GraduationCap />, label: "Academia", href: "/inicio" },
    { icon: <BookOpen />, label: "Materias", href: "/materias" },
    { icon: <Globe />, label: "Portal", href: "/inicio" },
    { icon: <Mail />, label: "Email", href: "mailto:contacto@nexoacademico.edu.ar" },
    { icon: <Code />, label: "Sistema", href: "/login" },
    { icon: <Fingerprint />, label: "Acceso Login", href: "/login" },
  ];

  const radius = 120;

  useEffect(() => {
    if (!isOpen) return;
    let animationFrame: number;
    const animate = () => {
      setAngleOffset((prev) => prev + 0.003);
      animationFrame = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animationFrame);
  }, [isOpen]);

  return (
    <div className={cn("relative flex items-center justify-center pointer-events-auto", className)}>
      {/* Botón Central Disparador con Live Orb 3D */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle Radial Menu"
        className="relative z-20 flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-900/60 backdrop-blur-xl shadow-2xl border border-white/30 text-white transition-all duration-300 hover:scale-105 hover:shadow-sky-500/40 focus:outline-none cursor-pointer overflow-visible group"
      >
        {isOpen ? (
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20">
            <X className="w-7 h-7 text-white transition-transform duration-300 rotate-90" />
          </div>
        ) : (
          <LiveOrb size={70} className="transition-transform duration-300 group-hover:scale-110" />
        )}
      </button>

      {/* Anillo y Botones Satélites */}
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center transition-all duration-500 pointer-events-none",
          isOpen ? "opacity-100 scale-100" : "opacity-0 scale-50 pointer-events-none"
        )}
      >
        {/* Guía circular punteada */}
        <div
          className="absolute rounded-full border border-dashed border-white/20 pointer-events-none"
          style={{
            width: `${radius * 2}px`,
            height: `${radius * 2}px`,
          }}
        />

        {/* Íconos circulares satélites */}
        {icons.map((item, index) => {
          const angle = (index / icons.length) * 2 * Math.PI + angleOffset;
          const x = radius * Math.cos(angle);
          const y = radius * Math.sin(angle);

          return (
            <a
              key={index}
              href={item.href}
              aria-label={item.label}
              className={cn(
                "absolute z-10 flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg text-white/90 transition-all duration-300 hover:scale-125 hover:bg-white/25 hover:text-white hover:border-white/40 cursor-pointer pointer-events-auto"
              )}
              style={{
                transform: `translate(${x}px, ${y}px)`,
              }}
            >
              {React.cloneElement(item.icon, { size: 20 })}
            </a>
          );
        })}
      </div>
    </div>
  );
}
