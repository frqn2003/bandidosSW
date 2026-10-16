"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";

// BACKEND: Reemplazar con GET /api/materias/destacadas o /api/indicadores/materias-mas-pedidas
export interface MateriaItem {
  id: number;
  puesto: number;
  badge?: string;
  nombre: string;
  descripcion: string;
  alumnosCursando: number;
  aprobacionPorcentaje: number;
  bg: string;
  rotateDeg: number;
  offsetMargin: boolean;
  link: string;
}

const MATERIAS_DATA: MateriaItem[] = [
  {
    id: 1,
    puesto: 1,
    badge: "Más elegida",
    nombre: "Análisis Matemático III",
    descripcion: "Cálculo vectorial, integrales múltiples y ecuaciones diferenciales con apoyo de tutores.",
    alumnosCursando: 45,
    aprobacionPorcentaje: 93,
    bg: "#fdef8a", // Post-it amarillo
    rotateDeg: -2,
    offsetMargin: false,
    link: "/login"
  },
  {
    id: 2,
    puesto: 2,
    nombre: "Algoritmos y Estructuras",
    descripcion: "Pensamiento lógico y práctica de código desde la primera semana.",
    alumnosCursando: 38,
    aprobacionPorcentaje: 91,
    bg: "#b9e3fb", // Post-it celeste
    rotateDeg: 1.5,
    offsetMargin: true,
    link: "/login"
  },
  {
    id: 3,
    puesto: 3,
    nombre: "Física I",
    descripcion: "Mecánica y cinemática con problemas guiados y simulacros de parcial.",
    alumnosCursando: 32,
    aprobacionPorcentaje: 95,
    bg: "#b8f3cf", // Post-it verde menta
    rotateDeg: -1,
    offsetMargin: false,
    link: "/login"
  },
  {
    id: 4,
    puesto: 4,
    nombre: "Álgebra y Geometría",
    descripcion: "Matrices, vectores y espacios vectoriales explicados paso a paso.",
    alumnosCursando: 28,
    aprobacionPorcentaje: 96,
    bg: "#fdd3a6", // Post-it melón
    rotateDeg: 2,
    offsetMargin: true,
    link: "/login"
  },
  {
    id: 5,
    puesto: 5,
    nombre: "Química General",
    descripcion: "Teoría, estequiometría y trabajo práctico con evaluaciones frecuentes.",
    alumnosCursando: 24,
    aprobacionPorcentaje: 94,
    bg: "#f7c3d9", // Post-it rosa pastel
    rotateDeg: -1.5,
    offsetMargin: false,
    link: "/login"
  },
  {
    id: 6,
    puesto: 6,
    nombre: "Probabilidad y Estadística",
    descripcion: "Del azar a la inferencia, con casos reales y apoyo de tutores.",
    alumnosCursando: 19,
    aprobacionPorcentaje: 92,
    bg: "#d9ccfa", // Post-it lila pastel
    rotateDeg: 1,
    offsetMargin: true,
    link: "/login"
  }
];

export default function MateriasMasPedidas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);

  useGSAP(
    () => {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const cards = cardRefs.current.filter(Boolean) as HTMLElement[];

      const fillCard = (card: HTMLElement) => {
        const countSpan = card.querySelector<HTMLElement>("[data-count]");
        const barFill = card.querySelector<HTMLElement>("[data-w]");
        if (!countSpan || !barFill) return;

        const endCount = Number(countSpan.dataset.count) || 0;
        const endW = Number(barFill.dataset.w) || 0;

        if (reduceMotion) {
          countSpan.textContent = String(endCount);
          barFill.style.width = `${endW}%`;
          return;
        }

        const obj = { val: 0 };
        gsap.to(obj, {
          val: endCount,
          duration: 1.4,
          ease: "power2.out",
          onUpdate: () => {
            countSpan.textContent = String(Math.round(obj.val));
          }
        });

        gsap.to(barFill, {
          width: `${endW}%`,
          duration: 1.4,
          ease: "power3.out"
        });
      };

      // Animación inicial: todas las barras de aprobación y contadores se cargan al entrar a la sección
      ScrollTrigger.create({
        trigger: containerRef.current,
        start: "top 75%",
        once: true,
        onEnter: () => {
          cards.forEach((card, idx) => {
            setTimeout(() => {
              fillCard(card);
            }, idx * 90);
          });
        }
      });

      const mm = gsap.matchMedia();

      // Escritorio (min-width: 821px): scroll horizontal fijado (pinned track)
      mm.add("(min-width: 821px)", () => {
        const track = trackRef.current;
        if (!track || !containerRef.current) return;

        const getDistance = () => track.scrollWidth - window.innerWidth;

        const horizontalTween = gsap.to(track, {
          x: () => -getDistance(),
          ease: "none",
          scrollTrigger: {
            trigger: containerRef.current,
            pin: true,
            scrub: 0.6,
            start: "top top",
            end: () => `+=${getDistance()}`,
            invalidateOnRefresh: true
          }
        });

        cards.forEach((card) => {
          if (!reduceMotion) {
            gsap.from(card, {
              rotation: "+=6",
              y: 60,
              opacity: 0,
              duration: 0.9,
              ease: "back.out(1.6)",
              scrollTrigger: {
                trigger: card,
                containerAnimation: horizontalTween,
                start: "left 95%",
                toggleActions: "play none none none"
              }
            });
          }
        });
      });

      // Móvil / Tablet (max-width: 820px): tarjetas apiladas verticales
      mm.add("(max-width: 820px)", () => {
        // En móviles la animación de carga inicial ya se cubre con el ScrollTrigger general
      });
    },
    { scope: containerRef }
  );

  return (
    <section
      id="materias-destacadas"
      aria-labelledby="t-materias"
      className="relative text-white overflow-hidden select-none scroll-mt-6 bg-[#0d0d10]"
    >
      <div
        ref={containerRef}
        className="relative z-10 min-h-0 md:min-h-screen flex flex-col justify-center gap-10 py-16 md:py-20 overflow-hidden"
      >
        {/* Fondo cuadriculado estático (anclado al contenedor fijado por ScrollTrigger) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            backgroundColor: "#0d0d10",
            backgroundImage: `
              radial-gradient(circle 1.5px at 0 0, rgba(255, 255, 255, 0.28) 1.5px, transparent 0),
              linear-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255, 255, 255, 0.15) 1px, transparent 1px)
            `,
            backgroundSize: "52px 52px",
            backgroundAttachment: "fixed"
          }}
        />

        {/* Viñeta perimetral de profundidad: oscurece los bordes y crea sensación envolvente estática */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background: "radial-gradient(ellipse 85% 75% at 50% 50%, transparent 15%, rgba(10, 10, 13, 0.45) 50%, rgba(7, 7, 9, 0.85) 80%, #050507 100%)",
            backgroundAttachment: "fixed"
          }}
        />

        {/* Degradados perimetrales superior e inferior para fundido suave */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#0a0a0c] via-[#0a0a0c]/60 to-transparent -z-10"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#060b1e] via-[#060b1e]/70 to-transparent -z-10"
        />
        {/* Cabecera de la sección */}
        <div className="px-5 sm:px-10 lg:px-24 flex flex-wrap items-end justify-between gap-6">
          <div>
            <span
              className="inline-block text-2xl sm:text-3xl font-bold tracking-tight text-[#fdef8a] -rotate-[1.5deg]"
              style={{ fontFamily: "var(--font-caveat), Caveat, cursive" }}
            >
              Lo que más se cursa
            </span>
            <h2
              id="t-materias"
              className="mt-2.5 text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-none max-w-[14ch]"
            >
              Las materias más pedidas este ciclo
            </h2>
          </div>
        </div>

        {/* Pista horizontal con tarjetas estilo Post-it */}
        <div
          ref={trackRef}
          className="flex flex-col md:flex-row gap-8 md:gap-8 px-5 sm:px-10 lg:px-24 py-6 w-full md:w-max items-stretch md:items-center"
        >
          {MATERIAS_DATA.map((materia, idx) => (
            <article
              key={materia.id}
              ref={(el) => {
                cardRefs.current[idx] = el;
              }}
              style={{
                backgroundColor: materia.bg,
                transform: `rotate(${materia.rotateDeg}deg)`
              }}
              className={`relative flex flex-col justify-between p-6 sm:p-7 rounded-md text-[#1b1a17] shadow-[0_18px_40px_rgba(0,0,0,0.45)] w-full md:w-[340px] md:flex-[0_0_340px] min-h-[420px] transition-transform duration-200 hover:scale-[1.02] ${
                materia.offsetMargin ? "md:mt-10" : ""
              }`}
            >
              {/* Cinta adhesiva semi-transparente pegada al borde superior */}
              <div
                aria-hidden="true"
                className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-[84px] h-[26px] bg-white/55 -rotate-2 shadow-sm pointer-events-none"
              />

              {/* Rango de puesto */}
              <div
                className="text-2xl font-bold flex justify-between items-center"
                style={{ fontFamily: "var(--font-caveat), Caveat, cursive" }}
              >
                <span>Puesto {materia.puesto}</span>
                {materia.badge && (
                  <span className="font-sans font-bold text-xs bg-[#1b1a17] text-white rounded-full px-2.5 py-1 tracking-normal">
                    {materia.badge}
                  </span>
                )}
              </div>

              {/* Nombre y descripción */}
              <div className="mt-4 mb-2">
                <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight m-0 mb-2">
                  {materia.nombre}
                </h3>
                <p className="text-sm sm:text-base leading-snug opacity-80 m-0">
                  {materia.descripcion}
                </p>
              </div>

              {/* Métrica de alumnos cursando */}
              <div className="mt-auto pt-4">
                <div className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-none">
                  <span data-count={materia.alumnosCursando}>0</span>
                  <small className="block font-sans font-medium text-xs tracking-normal opacity-75 mt-1">
                    alumnos cursando
                  </small>
                </div>

                {/* Barra de tasa de aprobación */}
                <div className="h-2 rounded-full bg-black/12 my-3 overflow-hidden">
                  <div
                    data-w={materia.aprobacionPorcentaje}
                    className="h-full bg-[#1b1a17] rounded-full transition-all duration-300"
                    style={{ width: "0%" }}
                  />
                </div>

                <div className="flex justify-between text-xs font-semibold">
                  <span>Aprobación</span>
                  <b>{materia.aprobacionPorcentaje}%</b>
                </div>

                {/* Enlace de programa */}
                <div className="mt-4 pt-1">
                  <Link
                    href={materia.link}
                    className="inline-block font-bold text-sm text-[#1b1a17] border-b-2 border-current pb-0.5 hover:opacity-75 focus-visible:outline-3 focus-visible:outline-[#1b1a17] focus-visible:outline-offset-4 transition-opacity"
                  >
                    Ver programa
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
