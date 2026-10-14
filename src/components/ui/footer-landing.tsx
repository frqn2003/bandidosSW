"use client";

import React, { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { gsap, useGSAP } from "@/lib/gsap";

const WORDMARK_TEXT = "Nexo Académico";

export default function FooterLanding() {
  const footerRef = useRef<HTMLElement>(null);
  const markRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      // Animación del logo de la marca al entrar a la sección
      if (logoRef.current && !reduceMotion) {
        gsap.from(logoRef.current, {
          y: 30,
          opacity: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: logoRef.current,
            start: "top 90%",
            once: true
          }
        });
      }

      // Animación del wordmark gigante detrás del footer
      const letters = markRef.current?.querySelectorAll<HTMLElement>(".mark-letter");
      if (letters && letters.length) {
        if (reduceMotion) {
          gsap.set(letters, { color: "#ffffff", opacity: 0.08 });
          return;
        }

        // 1. Las letras emergen escalonadamente desde abajo
        gsap.fromTo(
          letters,
          { yPercent: 110, opacity: 0 },
          {
            yPercent: 0,
            opacity: 1,
            duration: 1,
            stagger: 0.04,
            ease: "power4.out",
            scrollTrigger: {
              trigger: footerRef.current,
              start: "top 85%",
              once: true
            }
          }
        );

        // 2. Transición de color al scrollear hacia el fondo
        gsap.fromTo(
          letters,
          { color: "#1c1c20" },
          {
            color: "#ffffff",
            stagger: 0.04,
            ease: "none",
            scrollTrigger: {
              trigger: markRef.current,
              start: "top 95%",
              end: "bottom 100%",
              scrub: 0.6
            }
          }
        );
      }
    },
    { scope: footerRef }
  );


  return (
    <footer
      ref={footerRef}
      id="footer"
      className="relative overflow-hidden bg-[#101012] text-white pt-16 sm:pt-24 lg:pt-28 px-5 sm:px-10 lg:px-16"
      style={{
        backgroundImage: `
          linear-gradient(rgba(255, 255, 255, 0.07) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.07) 1px, transparent 1px)
        `,
        backgroundSize: "34px 34px"
      }}
    >
      {/* Wordmark gigante DETRÁS del footer, ocupando todo el ancho */}
      <div
        ref={markRef}
        aria-hidden="true"
        className="pointer-events-none absolute left-0 right-0 bottom-0 select-none flex justify-center overflow-hidden font-extrabold tracking-tighter leading-[0.82] text-[clamp(4rem,18vw,20rem)] whitespace-nowrap z-0 pb-[0.02em]"
      >
        {WORDMARK_TEXT.split("").map((ch, idx) => {
          if (ch === " ") {
            return <span key={idx} className="inline-block w-[0.24em]" />;
          }
          return (
            <span
              key={idx}
              className="mark-letter inline-block will-change-transform text-[#1c1c20] opacity-15"
              style={{
                WebkitTextStroke: "1px rgba(255, 255, 255, 0.08)"
              }}
            >
              {ch}
            </span>
          );
        })}
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* CTA principal */}
        <div className="pb-12 sm:pb-16 border-b border-white/10">
          <h2 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[0.98] text-white max-w-[14ch] m-0">
            Empieza hoy, a tu ritmo.
          </h2>
        </div>

        {/* Columnas de navegación y marca */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,1fr)] gap-10 py-12 sm:py-16">
          {/* Columna Marca y Logo */}
          <div ref={logoRef} className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="inline-block transition-transform hover:scale-105">
              <Image
                src="/LogoBlanco.png"
                alt="Logo Nexo Académico"
                width={160}
                height={48}
                className="h-10 sm:h-12 w-auto object-contain mb-4 drop-shadow-md"
              />
            </Link>
            <p className="text-[#a3a3ad] text-sm sm:text-base leading-relaxed max-w-[32ch] mb-4">
              Cursos universitarios con docentes especialistas y tutores, para que cursar sea más claro.
            </p>
            <a
              href="mailto:hola@nexoacademico.com"
              className="font-bold text-sm sm:text-base text-white hover:text-[#fdef8a] transition-colors inline-block"
            >
              hola@nexoacademico.com
            </a>
          </div>

          {/* Columna: Estudiar */}
          <nav aria-label="Estudiar">
            <h3
              className="text-2xl font-bold text-[#fdef8a] mb-4"
              style={{ fontFamily: "var(--font-caveat), Caveat, cursive" }}
            >
              Estudiar
            </h3>
            <ul className="grid gap-2.5 list-none p-0 m-0">
              <li>
                <a
                  href="#materias-destacadas"
                  className="text-sm sm:text-base text-[#d8d8de] hover:text-white transition-colors relative inline-block after:absolute after:left-0 after:right-0 after:-bottom-0.5 after:h-[1px] after:bg-current after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:origin-left"
                >
                  Materias más pedidas
                </a>
              </li>
              <li>
                <a
                  href="#testimonios"
                  className="text-sm sm:text-base text-[#d8d8de] hover:text-white transition-colors relative inline-block after:absolute after:left-0 after:right-0 after:-bottom-0.5 after:h-[1px] after:bg-current after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:origin-left"
                >
                  Experiencias de alumnos
                </a>
              </li>
              <li>
                <Link
                  href="/login"
                  className="text-sm sm:text-base text-[#d8d8de] hover:text-white transition-colors relative inline-block after:absolute after:left-0 after:right-0 after:-bottom-0.5 after:h-[1px] after:bg-current after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:origin-left"
                >
                  Iniciar sesión
                </Link>
              </li>
            </ul>
          </nav>

          {/* Columna: Nexo */}
          <nav aria-label="Nexo">
            <h3
              className="text-2xl font-bold text-[#fdef8a] mb-4"
              style={{ fontFamily: "var(--font-caveat), Caveat, cursive" }}
            >
              Nexo
            </h3>
            <ul className="grid gap-2.5 list-none p-0 m-0">
              <li>
                <a
                  href="#inicio"
                  className="text-sm sm:text-base text-[#d8d8de] hover:text-white transition-colors relative inline-block after:absolute after:left-0 after:right-0 after:-bottom-0.5 after:h-[1px] after:bg-current after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:origin-left"
                >
                  Inicio
                </a>
              </li>
              <li>
                <a
                  href="#por-que-elegirnos"
                  className="text-sm sm:text-base text-[#d8d8de] hover:text-white transition-colors relative inline-block after:absolute after:left-0 after:right-0 after:-bottom-0.5 after:h-[1px] after:bg-current after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:origin-left"
                >
                  ¿Por qué elegirnos?
                </a>
              </li>
              <li>
                <a
                  href="#ubicacion"
                  className="text-sm sm:text-base text-[#d8d8de] hover:text-white transition-colors relative inline-block after:absolute after:left-0 after:right-0 after:-bottom-0.5 after:h-[1px] after:bg-current after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:origin-left"
                >
                  Dónde estamos
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/5493870000000?text=Hola%20Nexo%20Acad%C3%A9mico,%20quiero%20hacer%20una%20consulta"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm sm:text-base text-[#d8d8de] hover:text-white transition-colors relative inline-block after:absolute after:left-0 after:right-0 after:-bottom-0.5 after:h-[1px] after:bg-current after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:origin-left"
                >
                  Contacto directo
                </a>
              </li>
            </ul>
          </nav>

          {/* Columna: Seguinos */}
          <nav aria-label="Seguinos">
            <h3
              className="text-2xl font-bold text-[#fdef8a] mb-4"
              style={{ fontFamily: "var(--font-caveat), Caveat, cursive" }}
            >
              Seguinos
            </h3>
            <ul className="grid gap-2.5 list-none p-0 m-0">
              <li>
                <a
                  href="https://wa.me/5493870000000?text=Hola%20Nexo%20Acad%C3%A9mico"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm sm:text-base text-[#d8d8de] hover:text-white transition-colors relative inline-block after:absolute after:left-0 after:right-0 after:-bottom-0.5 after:h-[1px] after:bg-current after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:origin-left"
                >
                  WhatsApp
                </a>
              </li>
              <li>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm sm:text-base text-[#d8d8de] hover:text-white transition-colors relative inline-block after:absolute after:left-0 after:right-0 after:-bottom-0.5 after:h-[1px] after:bg-current after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:origin-left"
                >
                  Instagram
                </a>
              </li>
              <li>
                <a
                  href="https://youtube.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm sm:text-base text-[#d8d8de] hover:text-white transition-colors relative inline-block after:absolute after:left-0 after:right-0 after:-bottom-0.5 after:h-[1px] after:bg-current after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:origin-left"
                >
                  YouTube
                </a>
              </li>
              <li>
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm sm:text-base text-[#d8d8de] hover:text-white transition-colors relative inline-block after:absolute after:left-0 after:right-0 after:-bottom-0.5 after:h-[1px] after:bg-current after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:origin-left"
                >
                  LinkedIn
                </a>
              </li>
            </ul>
          </nav>
        </div>

        {/* Barra legal */}
        <div className="flex flex-wrap items-center justify-between gap-4 py-6 border-t border-white/10 text-xs sm:text-sm text-[#a3a3ad]">
          <span>© 2026 Nexo Académico. Todos los derechos reservados.</span>
          <nav aria-label="Secciones" className="flex items-center gap-6 flex-wrap">
            <a href="#inicio" className="hover:text-white transition-colors">
              Inicio
            </a>
            <a href="#materias-destacadas" className="hover:text-white transition-colors">
              Materias
            </a>
            <a href="#testimonios" className="hover:text-white transition-colors">
              Experiencias
            </a>
            <a href="#ubicacion" className="hover:text-white transition-colors">
              Dónde estamos
            </a>
            <Link href="/login" className="text-white font-semibold hover:text-[#fdef8a] transition-colors">
              Iniciar sesión
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
