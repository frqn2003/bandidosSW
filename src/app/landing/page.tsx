"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import KineticGrid from "@/components/ui/kinetic-grid";
import BlurText from "@/components/ui/blur-text";
import RadialSocialMenu from "@/components/ui/radial-social-menu";
import SparkleBurst from "@/components/ui/sparkle-burst";
import ExperienciasAlumnos from "@/components/ui/experiencias-alumnos";
import MateriasMasPedidas from "@/components/ui/materias-mas-pedidas";
import FooterLanding from "@/components/ui/footer-landing";
import UbicacionSede from "@/components/ui/ubicacion-sede";
import { Users, Award, GraduationCap, BookOpen } from "lucide-react";
import { gsap, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";

interface MetricItem {
  id: string;
  title: string;
  icon: React.ReactNode;
  to: number;
  prefix?: string;
  suffix?: string;
  separator?: string;
  description: string;
  bgPostIt: string;
  borderPostIt: string;
  rotateClass: string;
  tapeRotate: string;
}

const METRICS_DATA: MetricItem[] = [
  {
    id: "estudiantes",
    title: "Estudiantes",
    icon: <Users className="w-5 h-5" />,
    to: 1500,
    prefix: "+",
    separator: ".",
    description: "Alumnos activos cursando materias este ciclo.",
    bgPostIt: "bg-[#FEF08A]", // Amarillo canario clásico
    borderPostIt: "border-amber-300/80",
    rotateClass: "-rotate-[1.5deg]",
    tapeRotate: "rotate-[-1deg]",
  },
  {
    id: "aprobacion",
    title: "Aprobación",
    icon: <Award className="w-5 h-5" />,
    to: 94,
    suffix: "%",
    description: "Tasa promedio de aprobación en parciales y finales.",
    bgPostIt: "bg-[#BAE6FD]", // Celeste cielo pastel
    borderPostIt: "border-sky-300/80",
    rotateClass: "rotate-[1.8deg]",
    tapeRotate: "rotate-[1.5deg]",
  },
  {
    id: "docentes",
    title: "Cuerpo Docente",
    icon: <GraduationCap className="w-5 h-5" />,
    to: 48,
    prefix: "+",
    description: "Profesores universitarios especialistas y tutores.",
    bgPostIt: "bg-[#BBF7D0]", // Verde menta pastel
    borderPostIt: "border-emerald-300/80",
    rotateClass: "-rotate-[1.2deg]",
    tapeRotate: "rotate-[-2deg]",
  },
  {
    id: "materias",
    title: "Oferta Académica",
    icon: <BookOpen className="w-5 h-5" />,
    to: 45,
    prefix: "+",
    description: "Más de 45 materias y programas activos para cursar.",
    bgPostIt: "bg-[#FED7AA]", // Melón pastel
    borderPostIt: "border-orange-300/80",
    rotateClass: "rotate-[1.4deg]",
    tapeRotate: "rotate-[1deg]",
  }
];

function CascadingMetricCard({
  item,
  status,
  countDuration,
  onFinished
}: {
  item: MetricItem;
  status: "idle" | "waiting" | "active" | "settled";
  countDuration: number;
  onFinished: () => void;
}) {
  const [displayValue, setDisplayValue] = useState<string>("0");
  const [isSlammed, setIsSlammed] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const numberRef = useRef<HTMLSpanElement>(null);
  const tapeRef = useRef<HTMLSpanElement>(null);
  const onFinishedRef = useRef(onFinished);
  useEffect(() => {
    onFinishedRef.current = onFinished;
  });

  // Simulación de ticker numérico rápido mientras espera su turno
  useEffect(() => {
    if (status === "waiting") {
      const interval = setInterval(() => {
        const randomNum = Math.floor(Math.random() * (item.to * 1.15 || 99));
        setDisplayValue(item.separator ? randomNum.toLocaleString("es-AR") : randomNum.toString());
      }, 45);
      return () => clearInterval(interval);
    }
  }, [status, item.to, item.separator]);

  // Limpieza total garantizada cuando la métrica queda asentada (settled)
  useEffect(() => {
    if (status === "settled") {
      if (cardRef.current) gsap.set(cardRef.current, { clearProps: "boxShadow,y,scale" });
      if (numberRef.current) gsap.set(numberRef.current, { clearProps: "color,filter,scale" });
      if (tapeRef.current) gsap.set(tapeRef.current, { clearProps: "rotation" });
    }
  }, [status]);

  // Conteo dinámico y estampe elástico de alto impacto con GSAP
  useEffect(() => {
    if (status === "active") {
      const counterObj = { val: 0 };
      const cardEl = cardRef.current;
      const numEl = numberRef.current;
      const tapeEl = tapeRef.current;
      const isFast = countDuration < 400;

      const tl = gsap.timeline();

      // 1. Fase de Anticipación y Carga:
      // Elevación ágil del Post-it con sombra natural de papel (limpia, sin azul)
      if (cardEl) {
        tl.to(
          cardEl,
          {
            y: isFast ? -4 : -7,
            scale: isFast ? 1.02 : 1.035,
            boxShadow: "0 12px 24px rgba(0,0,0,0.15), 0 3px 6px rgba(0,0,0,0.08)",
            duration: isFast ? 0.08 : 0.16,
            ease: "power2.out"
          },
          0
        );
      }

      // Conteo numérico dinámico fluido (ultra-rápido para métricas 2, 3 y 4)
      tl.to(
        counterObj,
        {
          val: item.to,
          duration: countDuration / 1000,
          ease: isFast ? "power2.out" : "power2.inOut",
          onUpdate: () => {
            const currentVal = Math.floor(counterObj.val);
            setDisplayValue(item.separator ? currentVal.toLocaleString("es-AR") : currentVal.toString());
          }
        },
        0
      );

      // Efecto tacómetro en los números: destello en Azul Eléctrico durante la carga activa
      if (numEl) {
        tl.to(
          numEl,
          {
            color: "#0047FF",
            scale: isFast ? 1.08 : 1.12,
            duration: countDuration / 2000,
            yoyo: true,
            repeat: 1,
            ease: "sine.inOut"
          },
          0
        );
      }

      // 2. EL ESTAMPE (SLAM) AL IMPACTAR EL NÚMERO OBJETIVO:
      // Golpe seco de estampa física contra el papel Manila
      if (cardEl) {
        tl.to(cardEl, {
          y: isFast ? 4 : 6,
          scale: 0.96,
          duration: 0.06,
          ease: "power4.in"
        });
      }

      if (numEl) {
        tl.to(
          numEl,
          {
            scale: 1.35,
            color: "#18181B",
            filter: "none",
            duration: 0.06,
            ease: "power4.in",
            onStart: () => {
              setDisplayValue(item.separator ? item.to.toLocaleString("es-AR") : item.to.toString());
              setIsSlammed(true);
              // Desencadena el siguiente paso de inmediato al estampar, sin esperar el rebote
              setTimeout(() => {
                onFinishedRef.current();
              }, isFast ? 25 : 45);
            }
          },
          "<"
        );
      }

      // Inercia vibratoria en la cinta scotch al recibir el impacto
      if (tapeEl) {
        tl.to(
          tapeEl,
          {
            rotation: "+=3",
            yoyo: true,
            repeat: 3,
            duration: 0.04,
            ease: "sine.inOut"
          },
          "<"
        );
      }

      // 3. Rebote elástico de asentamiento del papel (Elastic Settle)
      if (cardEl) {
        tl.to(cardEl, {
          y: 0,
          scale: 1,
          boxShadow: "3px 6px 16px rgba(0,0,0,0.13), 0 1px 3px rgba(0,0,0,0.07)",
          duration: isFast ? 0.35 : 0.5,
          ease: "elastic.out(1.2, 0.4)",
          onComplete: () => {
            gsap.set(cardEl, { clearProps: "boxShadow,y,scale" });
          }
        });
      }

      if (numEl) {
        tl.to(
          numEl,
          {
            scale: 1,
            color: "#18181B",
            filter: "none",
            duration: isFast ? 0.3 : 0.45,
            ease: "elastic.out(1.4, 0.45)",
            onComplete: () => {
              gsap.set(numEl, { clearProps: "color,filter,scale" });
            }
          },
          "<"
        );
      }

      return () => {
        tl.kill();
        if (cardEl) gsap.set(cardEl, { clearProps: "boxShadow" });
        if (numEl) gsap.set(numEl, { clearProps: "color,filter" });
      };
    }
  }, [status, item.to, item.separator, countDuration]);

  return (
    <div
      ref={cardRef}
      className={cn(
        "relative rounded-sm p-5 sm:p-6 flex flex-col gap-2.5 transition-shadow duration-300 shadow-[3px_6px_16px_rgba(0,0,0,0.13),0_1px_3px_rgba(0,0,0,0.07)] border-b-2 border-r-2 border-black/10 hover:rotate-0 hover:-translate-y-1 hover:shadow-xl cursor-default overflow-visible select-none",
        item.bgPostIt,
        item.borderPostIt,
        item.rotateClass
      )}
    >
      {/* Cinta adhesiva translúcida pegada en la parte superior del Post-it */}
      <span
        ref={tapeRef}
        aria-hidden="true"
        className={cn(
          "absolute -top-2 left-1/2 -translate-x-1/2 w-12 h-4 bg-white/60 backdrop-blur-[1px] border border-white/50 shadow-[0_1px_2px_rgba(0,0,0,0.06)] pointer-events-none z-20 origin-center",
          item.tapeRotate
        )}
      />

      <div className="flex items-center justify-between">
        <span
          className="text-stone-900 text-xl sm:text-2xl font-bold leading-none tracking-wide"
          style={{ fontFamily: "var(--font-caveat), cursive" }}
        >
          {item.title}
        </span>
        <div className="p-1.5 rounded-lg bg-black/5 text-stone-900 border border-black/5">
          {item.icon}
        </div>
      </div>

      <div className="relative inline-flex items-baseline gap-1 text-4xl sm:text-5xl font-extrabold text-stone-900 tracking-tight">
        {item.prefix && <span>{item.prefix}</span>}
        {/* Wrapper relativo SOLO sobre los dígitos: el destello nace en el centro exacto del número */}
        <span className="relative inline-block">
          <span
            ref={numberRef}
            className={
              status === "waiting"
                ? "opacity-60 inline-block font-mono blur-[0.3px]"
                : "inline-block font-extrabold origin-center"
            }
          >
            {status === "idle" ? "0" : displayValue}
          </span>
          {isSlammed && <SparkleBurst count={36} />}
        </span>
        {item.suffix && <span>{item.suffix}</span>}
      </div>

      <p className="text-stone-800 text-xs sm:text-sm font-medium leading-snug">{item.description}</p>
    </div>
  );
}

function CascadingMetricsGrid() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState<number>(-1); // -1 = idle

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && activeStep === -1) {
          setActiveStep(0); // Inicia el primer paso (Estudiantes)
        }
      },
      { threshold: 0.2 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [activeStep]);

  const handleStepFinished = (stepIndex: number) => {
    // Encadenamiento instantáneo entre métricas para máxima sensación de alto rendimiento
    setTimeout(() => {
      setActiveStep((prev) => Math.max(prev, stepIndex + 1));
    }, 35);
  };

  const getStatus = (index: number) => {
    if (activeStep === -1) return "idle";
    if (activeStep > index) return "settled";
    if (activeStep === index) return "active";
    return "waiting";
  };

  const getDuration = (index: number) => {
    switch (index) {
      case 0:
        return 450; // Estudiantes (+1.500): impactante pero ágil
      case 1:
        return 220; // Aprobación (94%): ultra-rápido (< 0.25s)
      case 2:
        return 170; // Cuerpo Docente (+48): ultra-rápido (< 0.2s)
      case 3:
        return 170; // Oferta Académica (+45): ultra-rápido (< 0.2s)
      default:
        return 170;
    }
  };

  return (
    <div ref={containerRef} className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6 pt-3">
      {METRICS_DATA.map((item, index) => (
        <CascadingMetricCard
          key={item.id}
          item={item}
          status={getStatus(index)}
          countDuration={getDuration(index)}
          onFinished={() => handleStepFinished(index)}
        />
      ))}
    </div>
  );
}

type PaletteOption = "A" | "B" | "C";

const PALETTES = {
  A: {
    id: "A" as const,
    name: "Opción A: Tríada Cohesiva",
    badge: "Recomendada",
    description: "Azul Eléctrico (#0047FF) en sección + Celeste (#4B91FF) en botones y puntos del fondo",
    sectionBg: "#0047FF",
    sectionTab: "#0047FF",
    accentCyan: "#4B91FF",
    buttonBg: "#0047FF",
    buttonHoverGlow: "shadow-blue-500/50",
    buttonBorder: "border-[#4B91FF]",
    nodeRgb: "253, 239, 138",
    lineRgb: "253, 239, 138",
  },
  B: {
    id: "B" as const,
    name: "Opción B: Celeste Puro Tech",
    badge: "Celeste de los Puntos",
    description: "Celeste de los puntos (#4B91FF / #0284C7) en toda la sección, botones y halos",
    sectionBg: "#0369A1",
    sectionTab: "#0284C7",
    accentCyan: "#38BDF8",
    buttonBg: "#0284C7",
    buttonHoverGlow: "shadow-sky-500/50",
    buttonBorder: "border-[#38BDF8]",
    nodeRgb: "56, 189, 248",
    lineRgb: "14, 165, 233",
  },
  C: {
    id: "C" as const,
    name: "Opción C: Azul Eléctrico Puro",
    badge: "Saturado #0000FF",
    description: "Azul saturado (#0000FF) uniforme en toda la web y en los puntos del Hero",
    sectionBg: "#0000FF",
    sectionTab: "#0000FF",
    accentCyan: "#0000FF",
    buttonBg: "#0000FF",
    buttonHoverGlow: "shadow-blue-600/50",
    buttonBorder: "border-[#0000FF]",
    nodeRgb: "30, 70, 255",
    lineRgb: "20, 50, 255",
  },
};

export default function LandingPage() {
  const currentPalette = PALETTES.A;
  const mainContainerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // 1. Entrada fluida del Header (Logo y Botones de Acción)
      gsap.from(".hero-header-logo", {
        y: -22,
        opacity: 0,
        duration: 0.9,
        ease: "power3.out",
        delay: 0.1
      });

      gsap.from(".hero-header-actions", {
        y: -22,
        opacity: 0,
        duration: 0.9,
        ease: "power3.out",
        delay: 0.2
      });

      // 2. Entrada elástica orgánica de las Tarjetas del Hero (Niño y Mujer)
      const tlHero = gsap.timeline({ defaults: { ease: "back.out(1.25)" } });
      tlHero
        .from(".hero-card-boy", {
          y: 65,
          scale: 0.9,
          opacity: 0,
          duration: 1.05,
          delay: 0.15
        })
        .from(
          ".hero-card-woman",
          {
            y: 80,
            scale: 0.9,
            opacity: 0,
            duration: 1.05
          },
          "-=0.75"
        );

      // 3. Micro-flotación continua orgánica (desfasada entre sí)
      gsap.to(".hero-card-boy", {
        y: "-=8",
        duration: 3.2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut"
      });

      gsap.to(".hero-card-woman", {
        y: "-=9",
        duration: 3.8,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        delay: 0.35
      });

      // 4. ScrollTrigger Scrub: Papeles físicos asomando en la carpeta escalonada
      gsap.fromTo(
        ".folder-paper-exam",
        { y: 36, rotate: -4.5 },
        {
          y: -10,
          rotate: -2.5,
          ease: "power2.out",
          scrollTrigger: {
            trigger: "#por-que-elegirnos",
            start: "top 92%",
            end: "top 45%",
            scrub: 1.2
          }
        }
      );

      gsap.fromTo(
        ".folder-paper-manila",
        { y: 44, rotate: 6.5 },
        {
          y: -8,
          rotate: 3.5,
          ease: "power2.out",
          scrollTrigger: {
            trigger: "#por-que-elegirnos",
            start: "top 92%",
            end: "top 45%",
            scrub: 1.2
          }
        }
      );

      // 5. ScrollTrigger: Tarjeta Institucional 3D con perspectiva al ingresar al viewport
      gsap.from(".institutional-card-3d", {
        scrollTrigger: {
          trigger: "#por-que-elegirnos",
          start: "top 72%",
          toggleActions: "play none none none"
        },
        opacity: 0,
        x: -45,
        rotateY: 28,
        scale: 0.92,
        duration: 1.2,
        ease: "power3.out"
      });




    },
    { scope: mainContainerRef }
  );

  return (
    <KineticGrid nodeColorRgb={currentPalette.nodeRgb} lineColorRgb={currentPalette.lineRgb}>
      <div ref={mainContainerRef} className="relative w-full">
        {/* Logo Nexo Académico (Arriba a la Izquierda) */}
        <div className="hero-header-logo absolute top-6 left-6 sm:top-8 sm:left-10 z-30 pointer-events-auto">
          <Link href="/landing" className="inline-block transition-transform hover:scale-105">
            <img
              src="/LogoBlanco.png"
              alt="Logo Nexo Académico"
              className="h-10 sm:h-12 md:h-14 w-auto object-contain drop-shadow-lg"
            />
          </Link>
        </div>

        {/* Botones de Acción (Arriba a la Derecha) con animación de relleno deslizante azul eléctrico (#0000FF) */}
        <div className="hero-header-actions absolute top-6 right-6 sm:top-8 sm:right-10 z-30 flex items-center gap-3 pointer-events-auto">
          <Link
            href="/login"
            className="group relative overflow-hidden px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold tracking-wide border border-white bg-white text-slate-950 shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
          >
            {/* Fondo deslizante de acento */}
            <span
              className="absolute inset-0 w-0 transition-all duration-300 ease-out group-hover:w-full"
              style={{ backgroundColor: "#fdef8a" }}
            />
            <span className="relative z-10 transition-colors duration-300 group-hover:text-slate-950">
              Iniciar sesión
            </span>
          </Link>
          <Link
            href="/login"
            className="group relative overflow-hidden px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold tracking-wide border border-white/80 text-white bg-transparent backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
          >
            {/* Fondo deslizante de acento */}
            <span
              className="absolute inset-0 w-0 transition-all duration-300 ease-out group-hover:w-full"
              style={{ backgroundColor: "#fdef8a" }}
            />
            <span className="relative z-10 transition-colors duration-300 group-hover:text-slate-950">
              Registrarme
            </span>
          </Link>
        </div>

        <div id="inicio" className="relative flex min-h-screen items-center justify-center px-6 md:px-12 lg:px-20 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center w-full max-w-7xl">

            {/* Lado izquierdo: Frase animada con BlurText */}
            <div className="lg:col-span-5 flex flex-col items-start text-left select-none pointer-events-none">
              <h1
                className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-extrabold tracking-tight text-white drop-shadow-2xl leading-[1.05]"
                style={{ fontFamily: "var(--font-poppins), sans-serif" }}
              >
                <BlurText
                  text="Tu ritmo, tus objetivos."
                  delay={180}
                  animateBy="words"
                  direction="top"
                  className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-extrabold tracking-tight text-white drop-shadow-2xl leading-[1.05]"
                />
              </h1>
              <div className="mt-6">
                <BlurText
                  text="Nexo Académico"
                  delay={220}
                  animateBy="words"
                  direction="top"
                  className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-wide text-white/90 drop-shadow-lg"
                />
              </div>
            </div>

            {/* Lado derecho: Tarjetas transparentes en paralelo horizontal elevadas con Pop-Out */}
            <div className="lg:col-span-7 flex flex-row items-end justify-center lg:justify-end gap-6 sm:gap-10 -mt-8 lg:-mt-36 pt-2 lg:pt-6">

              {/* Card del Niño (posición más arriba, entrada elástica GSAP, micro-flotación, brillo diagonal) */}
              <div className="hero-card-boy relative w-56 sm:w-72 h-72 sm:h-96 -translate-y-3 sm:-translate-y-5 rounded-3xl bg-white/[0.06] backdrop-blur-xl border border-white/20 shadow-2xl overflow-visible flex flex-col justify-end will-change-transform [transform:translateZ(0)]">
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-56 sm:w-72 pointer-events-none z-10 overflow-hidden rounded-3xl">
                  <img
                    src="/nuevoniño.png"
                    alt="Estudiante niño feliz con auriculares"
                    decoding="async"
                    className="block w-full h-auto object-contain drop-shadow-2xl"
                  />
                  {/* Haz de luz diagonal 45° que cruza de abajo-izq a arriba-der cada 5s */}
                  <div aria-hidden="true" className="animate-shimmer-diagonal" />
                </div>
              </div>

              {/* Card de la Mujer / Profesora (más arriba, entrada elástica GSAP, micro-flotación, brillo diagonal) */}
              <div className="hero-card-woman relative w-64 sm:w-80 h-[340px] sm:h-[440px] -translate-y-10 sm:-translate-y-16 rounded-3xl bg-white/[0.06] backdrop-blur-xl border border-white/20 shadow-2xl overflow-visible flex flex-col justify-end will-change-transform [transform:translateZ(0)]">
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 sm:w-80 pointer-events-none z-10 overflow-hidden rounded-3xl">
                  <img
                    src="/nuevamujer.png"
                    alt="Estudiante adulta trabajando en notebook"
                    decoding="async"
                    className="block w-full h-auto object-contain drop-shadow-2xl"
                  />
                  {/* Haz de luz diagonal 45° que cruza de abajo-izq a arriba-der cada 5s */}
                  <div aria-hidden="true" className="animate-shimmer-diagonal [animation-delay:250ms]" />
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* ── Transición: Pestaña/Solapa de Archivo conectando con Sección de Métricas ── */}
        <section
          id="por-que-elegirnos"
          className="relative w-full min-h-screen text-stone-900 mt-16 rounded-tr-[36px] bg-[#F2E4CB] shadow-2xl scroll-mt-6 border-t border-[#D8C7A8]"
        >
          {/* Contenedor de las pestañas escalonadas de carpeta física con papeles asomando */}
          <div className="absolute bottom-full left-0 w-full h-16 pointer-events-none select-none">
            {/* Pestaña trasera 3 (Tono Manila profundo de carpeta, z-1) */}
            <div
              className="absolute bottom-0 left-80 sm:left-[450px] md:left-[510px] w-32 sm:w-40 h-8 rounded-t-2xl bg-[#D7C4A3] border-t border-x border-[#BEA883] backdrop-blur-md z-1 shadow-[-2px_-4px_10px_rgba(0,0,0,0.15)]"
            />

            {/* Pestaña media 2 (Tono Manila medio con elevación, z-3) */}
            <div
              className="absolute bottom-0 left-52 sm:left-[260px] md:left-[300px] w-40 sm:w-48 h-11 rounded-t-2xl bg-[#E5D4B6] border-t border-x border-[#CBB895] backdrop-blur-md z-3 shadow-[-3px_-4px_12px_rgba(0,0,0,0.18)]"
            />

            {/* Papel 1: Hoja de Examen Blanca con Calificación 10/10 (con ScrollTrigger Scrub reactivo) */}
            <div
              className="folder-paper-exam absolute -bottom-8 sm:-bottom-10 right-40 sm:right-56 md:right-64 w-48 sm:w-64 md:w-72 h-20 sm:h-24 -rotate-[2.5deg] rounded-t-lg bg-white border-t border-x border-slate-300 shadow-[-2px_-3px_8px_rgba(0,0,0,0.15)] -z-10 flex flex-col justify-start pt-1.5 px-3.5"
              style={{ fontFamily: "var(--font-poppins), sans-serif" }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-800 uppercase tracking-tight">
                    Examen Final
                  </span>
                  <span className="hidden sm:inline text-[9px] font-medium text-slate-400">
                    · Algoritmos y Estructuras
                  </span>
                </div>
                <span className="px-1.5 py-0.5 rounded-md text-[10px] sm:text-[11px] font-extrabold bg-red-100 text-red-600 border border-red-200 leading-none">
                  10/10 ★
                </span>
              </div>
              {/* Líneas simuladas de renglón de examen más anchas */}
              <div className="mt-1.5 flex flex-col gap-1 w-full opacity-40">
                <div className="h-0.5 bg-slate-400 rounded-full w-4/5" />
                <div className="h-0.5 bg-slate-300 rounded-full w-3/5" />
              </div>
            </div>

            {/* Papel 2: Ficha Kraft / Manila con Datos de Expediente (con ScrollTrigger Scrub reactivo) */}
            <div
              className="folder-paper-manila absolute -bottom-6 sm:-bottom-8 right-4 sm:right-8 md:right-12 w-36 sm:w-52 md:w-60 h-16 sm:h-18 rotate-[3.5deg] rounded-t-lg bg-white border-t border-x border-[#D8C7A8] shadow-[-2px_-3px_6px_rgba(0,0,0,0.12)] -z-10 flex flex-col justify-start pt-1 px-3"
              style={{ fontFamily: "var(--font-poppins), sans-serif" }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0047ff]" />
                  <span className="text-[10px] sm:text-[11px] font-bold text-stone-900 tracking-tight whitespace-nowrap">
                    Ciclo Académico 2026
                  </span>
                </div>
                <span className="hidden sm:inline text-[8px] sm:text-[9px] font-medium text-stone-600 uppercase tracking-wider">
                  Legajo Activo
                </span>
              </div>
              <span className="text-[8px] sm:text-[9px] font-medium text-stone-600 uppercase tracking-wider mt-0.5">
                Acta N° 84 · Aprob. Definitiva
              </span>
            </div>

            {/* Pestaña principal 1: ¿Por qué elegirnos? (Funde con el fondo de la carpeta manila, z-10) */}
            <div
              className="absolute bottom-0 left-0 w-56 sm:w-68 md:w-80 h-14 rounded-t-2xl border-t border-x border-[#D8C7A8] z-10 flex items-center justify-start pl-6 sm:pl-8 shadow-[-4px_-4px_14px_rgba(0,0,0,0.18)] bg-[#F2E4CB]"
              style={{
                fontFamily: "var(--font-caveat), cursive",
              }}
            >
              <span className="text-stone-900 font-bold text-2xl sm:text-3xl md:text-[32px] tracking-wide whitespace-nowrap -rotate-[1.5deg] drop-shadow-sm select-none">
                ¿Por qué elegirnos?
              </span>
            </div>
          </div>

          {/* Contenido de la sección de carpeta Manila con Métricas y Espacio para Imagen Institucional */}
          <div className="w-full min-h-screen flex items-center justify-center px-6 sm:px-12 lg:px-20 py-20">
            <div className="flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-16 w-full max-w-7xl">

              {/* Lado Izquierdo: Tarjeta con Imagen de la Institución con perspectiva suave en eje Y y ScrollTrigger */}
              <div className="flex-shrink-0">
                <div className="relative [perspective:900px] h-[380px] sm:h-[480px] lg:h-[540px] aspect-[896/1200] w-auto max-w-full">
                  <div
                    className="institutional-card-3d relative w-full h-full rounded-3xl bg-white/70 backdrop-blur-xl border border-stone-300/80 shadow-2xl overflow-hidden [transform-style:preserve-3d] will-change-transform"
                    style={{
                      transform: 'rotateY(10deg)'
                    }}
                  >
                    <img
                      src="/Imagen-Institucional.png"
                      alt="Instalaciones Nexo Académico"
                      decoding="async"
                      className="w-full h-full object-contain object-center"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-900/30 via-transparent to-transparent pointer-events-none" />
                    {/* Haz de brillo diagonal periódico */}
                    <div aria-hidden="true" className="animate-shimmer-diagonal [animation-delay:350ms]" />
                  </div>
                </div>
              </div>

              {/* Lado Derecho: Header y Grilla de Métricas Atractivas con CountUp */}
              <div className="flex-1 w-full max-w-2xl flex flex-col gap-8">
                <div>
                  {/* Post-it Adhesivo Pegado */}
                  <div className="relative inline-block mb-3 pt-1.5">
                    <div
                      className="relative inline-flex items-center justify-center px-4 py-2 bg-[#FEF08A] text-stone-900 font-bold text-lg sm:text-xl shadow-[2px_5px_12px_rgba(0,0,0,0.14),0_1px_3px_rgba(0,0,0,0.08)] -rotate-2 hover:rotate-0 hover:-translate-y-0.5 transition-all duration-300 rounded-[2px] border-b border-r border-amber-300/80 cursor-default select-none"
                      style={{
                        fontFamily: "var(--font-caveat), cursive",
                      }}
                    >
                      {/* Cinta scotch adhesiva translúcida en la parte superior */}
                      <span
                        aria-hidden="true"
                        className="absolute -top-2 left-1/2 -translate-x-1/2 w-12 h-4 bg-white/60 backdrop-blur-[1px] border border-white/50 rotate-[-1deg] shadow-[0_1px_2px_rgba(0,0,0,0.06)] pointer-events-none"
                      />
                      <span className="relative z-10 leading-none tracking-wide text-stone-900 drop-shadow-[0_0.5px_0_rgba(255,255,255,0.8)]">
                        Excelencia y Rendimiento
                      </span>
                    </div>
                  </div>
                  <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-stone-900 leading-tight">
                    Resultados que transforman tu trayectoria
                  </h2>
                </div>

                {/* Grilla de Métricas en Cascada con Ticker y Slam Estampa */}
                <CascadingMetricsGrid />
              </div>

            </div>
          </div>
        </section>

        {/* ── Cinta de Transición: Descuentos y Beneficios Exclusivos ── */}
        <aside aria-label="Beneficios y descuentos destacados" className="relative z-20 w-full bg-black border-y border-white/10 py-2 sm:py-2.5 overflow-hidden select-none shadow-xl">
          <div className="animate-ticker flex items-center">
            {/* Bloque 1 */}
            <div className="flex items-center gap-8 sm:gap-12 pr-8 sm:pr-12 shrink-0 text-white/90 font-medium text-xs sm:text-sm tracking-wide">
              <span className="flex items-center gap-2.5">
                <span className="px-2 py-0.5 rounded-full bg-white text-black text-[11px] sm:text-xs font-black uppercase tracking-wider">20% OFF</span>
                <span>en tu primera materia</span>
              </span>
              <span className="text-white/40 text-sm select-none">✦</span>
              <span>Matrícula 100% bonificada ciclo 2026</span>
              <span className="text-white/40 text-sm select-none">✦</span>
              <span className="flex items-center gap-2.5">
                <span className="px-2 py-0.5 rounded-full bg-white text-black text-[11px] sm:text-xs font-black uppercase tracking-wider">PROMO AMIGOS</span>
                <span>15% OFF cursando con un compañero</span>
              </span>
              <span className="text-white/40 text-sm select-none">✦</span>
              <span>Inscripciones abiertas · Cupos limitados</span>
              <span className="text-white/40 text-sm select-none">✦</span>
            </div>

            {/* Bloque 2 (Duplicado para loop infinito continuo) */}
            <div aria-hidden="true" className="flex items-center gap-8 sm:gap-12 pr-8 sm:pr-12 shrink-0 text-white/90 font-medium text-xs sm:text-sm tracking-wide">
              <span className="flex items-center gap-2.5">
                <span className="px-2 py-0.5 rounded-full bg-white text-black text-[11px] sm:text-xs font-black uppercase tracking-wider">20% OFF</span>
                <span>en tu primera materia</span>
              </span>
              <span className="text-white/40 text-sm select-none">✦</span>
              <span>Matrícula 100% bonificada ciclo 2026</span>
              <span className="text-white/40 text-sm select-none">✦</span>
              <span className="flex items-center gap-2.5">
                <span className="px-2 py-0.5 rounded-full bg-white text-black text-[11px] sm:text-xs font-black uppercase tracking-wider">PROMO AMIGOS</span>
                <span>15% OFF cursando con un compañero</span>
              </span>
              <span className="text-white/40 text-sm select-none">✦</span>
              <span>Inscripciones abiertas · Cupos limitados</span>
              <span className="text-white/40 text-sm select-none">✦</span>
            </div>
          </div>
        </aside>

        {/* ── Sección: Las materias más pedidas este ciclo ── */}
        <MateriasMasPedidas />

        {/* ── Sección de Experiencias de Alumnos: Historias Reales con Hojas de Examen Físico ── */}
        <ExperienciasAlumnos />

        {/* ── Sección: Dónde estamos ── */}
        <UbicacionSede />

        {/* ── Footer Institucional de Nexo Académico ── */}
        <FooterLanding />

        {/* Menú Radial Circular con LiveOrb permanente en la Esquina Inferior Derecha */}
        <div className="fixed bottom-8 right-8 z-50">
          <RadialSocialMenu />
        </div>
      </div>
    </KineticGrid>
  );
}
