"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import KineticGrid from "@/components/ui/kinetic-grid";
import BlurText from "@/components/ui/blur-text";
import RadialSocialMenu from "@/components/ui/radial-social-menu";
import SparkleBurst from "@/components/ui/sparkle-burst";
import TiltedCard from "@/components/ui/tilted-card";
import SplitText from "@/components/ui/split-text";
import VerticalMarqueeDemo from "@/components/ui/marquee-03";
import CircularCarousel from "@/components/ui/circular-carousel";
import { Users, Award, GraduationCap, BookOpen, Building2, ArrowRight } from "lucide-react";

const items = [
  {
    src: '/InteligenciaArtificial.png',
    alt: 'Inteligencia Artificial',
    title: 'Inteligencia Artificial',
    subtitle: 'Machine Learning & Algoritmos',
    link: '/login'
  },
  {
    src: '/FisicaUniversitaria.png',
    alt: 'Fisica Universitaria',
    title: 'Fisica Universitaria',
    subtitle: 'Ciencias Exactas & Nivelación',
    link: '/login'
  },
  {
    src: '/CalculoDiferencial.png',
    alt: 'Cálculo Diferencial',
    title: 'Cálculo Diferencial',
    subtitle: 'Ciencias Exactas & Nivelación',
    link: '/login'
  }
];



interface MetricItem {
  id: string;
  title: string;
  icon: React.ReactNode;
  to: number;
  prefix?: string;
  suffix?: string;
  separator?: string;
  description: string;
}

const METRICS_DATA: MetricItem[] = [
  {
    id: "estudiantes",
    title: "Estudiantes",
    icon: <Users className="w-5 h-5" />,
    to: 1500,
    prefix: "+",
    separator: ".",
    description: "Alumnos activos cursando materias este ciclo."
  },
  {
    id: "aprobacion",
    title: "Aprobación",
    icon: <Award className="w-5 h-5" />,
    to: 94,
    suffix: "%",
    description: "Tasa promedio de aprobación en parciales y finales."
  },
  {
    id: "docentes",
    title: "Cuerpo Docente",
    icon: <GraduationCap className="w-5 h-5" />,
    to: 48,
    prefix: "+",
    description: "Profesores universitarios especialistas y tutores."
  },
  {
    id: "materias",
    title: "Oferta Académica",
    icon: <BookOpen className="w-5 h-5" />,
    to: 45,
    prefix: "+",
    description: "Más de 45 materias y programas activos para cursar."
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

  // Conteo rápido cuando pasa a active (el primero un poco más corto, los siguientes más veloces)
  useEffect(() => {
    if (status === "active") {
      const startTime = performance.now();
      const duration = countDuration;

      const updateCount = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Easing out cubic para frenado suave al final
        const ease = 1 - Math.pow(1 - progress, 3);
        const currentVal = Math.floor(ease * item.to);

        setDisplayValue(item.separator ? currentVal.toLocaleString("es-AR") : currentVal.toString());

        if (progress < 1) {
          requestAnimationFrame(updateCount);
        } else {
          setDisplayValue(item.separator ? item.to.toLocaleString("es-AR") : item.to.toString());
          setIsSlammed(true);
          onFinishedRef.current();
        }
      };

      requestAnimationFrame(updateCount);
    }
  }, [status, item.to, item.separator, countDuration]);

  return (
    <div className="bg-white/[0.08] backdrop-blur-md rounded-2xl border border-white/20 p-5 sm:p-6 flex flex-col gap-2 hover:bg-white/[0.12] transition-colors relative overflow-visible">
      <div className="flex items-center justify-between">
        <span className="text-white/60 text-xs font-semibold uppercase tracking-wider">{item.title}</span>
        <div className="p-2 rounded-xl bg-white/10 text-white">
          {item.icon}
        </div>
      </div>

      <div className="relative inline-flex items-baseline gap-1 text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
        {item.prefix && <span>{item.prefix}</span>}
        {/* Wrapper relativo SOLO sobre los dígitos: el destello nace encima del número */}
        <span className="relative inline-block">
          <span
            className={
              isSlammed
                ? "animate-stamp-slam inline-block"
                : status === "waiting"
                ? "opacity-60 inline-block font-mono blur-[0.3px]"
                : "inline-block"
            }
          >
            {status === "idle" ? "0" : displayValue}
          </span>
          {isSlammed && <SparkleBurst count={22} />}
        </span>
        {item.suffix && <span>{item.suffix}</span>}
      </div>

      <p className="text-white/80 text-xs sm:text-sm font-medium">{item.description}</p>
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
    // Pausa corta entre métricas: alcanza para notar el impacto sin frenar la cascada
    setTimeout(() => {
      setActiveStep((prev) => Math.max(prev, stepIndex + 1));
    }, 40);
  };

  const getStatus = (index: number) => {
    if (activeStep === -1) return "idle";
    if (activeStep > index) return "settled";
    if (activeStep === index) return "active";
    return "waiting";
  };

  return (
    <div ref={containerRef} className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
      {METRICS_DATA.map((item, index) => (
        <CascadingMetricCard
          key={item.id}
          item={item}
          status={getStatus(index)}
          countDuration={index === 0 ? 450 : 260}
          onFinished={() => handleStepFinished(index)}
        />
      ))}
    </div>
  );
}

export default function LandingPage() {
  const [activeSubject, setActiveSubject] = useState<{ src: string; alt?: string; title?: string; subtitle?: string; link?: string } | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isDetailHoveredRef = useRef(false);

  const handleActiveItemChange = (item: { src: string; alt?: string; title?: string; subtitle?: string; link?: string } | null) => {
    if (item) {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      setActiveSubject(item);
    } else {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = setTimeout(() => {
        if (!isDetailHoveredRef.current) {
          setActiveSubject(null);
        }
      }, 1000);
    }
  };

  return (
    <KineticGrid>
      {/* Logo Nexo Académico (Arriba a la Izquierda) */}
      <div className="absolute top-6 left-6 sm:top-8 sm:left-10 z-30 pointer-events-auto">
        <Link href="/" className="inline-block transition-transform hover:scale-105">
          <img
            src="/LogoBlanco.png"
            alt="Logo Nexo Académico"
            className="h-10 sm:h-12 md:h-14 w-auto object-contain drop-shadow-lg"
          />
        </Link>
      </div>

      {/* Botones de Acción (Arriba a la Derecha) con animación de relleno deslizante azul eléctrico (#0000FF) */}
      <div className="absolute top-6 right-6 sm:top-8 sm:right-10 z-30 flex items-center gap-3 pointer-events-auto">
        <Link
          href="/login"
          className="group relative overflow-hidden px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold tracking-wide border border-white bg-white text-slate-950 shadow-lg transition-all duration-300 hover:border-[#0000FF] hover:shadow-xl hover:shadow-blue-600/30 hover:-translate-y-0.5 active:translate-y-0"
        >
          {/* Fondo deslizante azul eléctrico */}
          <span className="absolute inset-0 w-0 bg-[#0000FF] transition-all duration-300 ease-out group-hover:w-full" />
          <span className="relative z-10 transition-colors duration-300 group-hover:text-white">
            Iniciar sesión
          </span>
        </Link>
        <Link
          href="/login"
          className="group relative overflow-hidden px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold tracking-wide border border-white/80 text-white bg-transparent backdrop-blur-sm transition-all duration-300 hover:border-[#0000FF] hover:shadow-xl hover:shadow-blue-600/30 hover:-translate-y-0.5 active:translate-y-0"
        >
          {/* Fondo deslizante azul eléctrico */}
          <span className="absolute inset-0 w-0 bg-[#0000FF] transition-all duration-300 ease-out group-hover:w-full" />
          <span className="relative z-10 transition-colors duration-300 group-hover:text-white">
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

          {/* Lado derecho: Tarjetas transparentes en paralelo horizontal con Pop-Out con espacio respecto a botones */}
          <div className="lg:col-span-7 flex flex-row items-end justify-center lg:justify-end gap-6 sm:gap-10 -mt-2 lg:-mt-6 pt-8 lg:pt-14">
            
            {/* Card del Niño (pop de entrada, brillo diagonal) */}
            <div className="relative w-56 sm:w-72 h-72 sm:h-96 translate-y-2 sm:translate-y-4 rounded-3xl bg-white/[0.06] backdrop-blur-xl border border-white/20 shadow-2xl overflow-visible flex flex-col justify-end animate-card-intro">
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-56 sm:w-72 pointer-events-none z-10 overflow-hidden rounded-3xl">
                <img
                  src="/nuevoniño.png"
                  alt="Estudiante niño feliz con auriculares"
                  className="block w-full h-auto object-contain drop-shadow-2xl"
                />
                {/* Haz de luz diagonal 45° que cruza de abajo-izq a arriba-der cada 5s */}
                <div aria-hidden="true" className="animate-shimmer-diagonal" />
              </div>
            </div>

            {/* Card de la Mujer / Profesora (elevada sutilmente, pop de entrada, brillo diagonal) */}
            <div className="relative w-64 sm:w-80 h-[340px] sm:h-[440px] -translate-y-4 sm:-translate-y-6 rounded-3xl bg-white/[0.06] backdrop-blur-xl border border-white/20 shadow-2xl overflow-visible flex flex-col justify-end animate-card-intro [animation-delay:150ms]">
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 sm:w-80 pointer-events-none z-10 overflow-hidden rounded-3xl">
                <img
                  src="/nuevamujer.png"
                  alt="Estudiante adulta trabajando en notebook"
                  className="block w-full h-auto object-contain drop-shadow-2xl"
                />
                {/* Haz de luz diagonal 45° que cruza de abajo-izq a arriba-der cada 5s */}
                <div aria-hidden="true" className="animate-shimmer-diagonal [animation-delay:250ms]" />
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* ── Transición: Pestaña/Solapa de Archivo conectando con Sección Azul #0000FF ── */}
      <section id="por-que-elegirnos" className="relative w-full bg-[#0000FF] min-h-screen text-white mt-16 rounded-tr-[36px] shadow-2xl scroll-mt-6">
        {/* Contenedor de las pestañas escalonadas de carpeta física con papeles asomando */}
        <div className="absolute bottom-full left-0 w-full h-16 pointer-events-none select-none">
          {/* Pestaña trasera 3 (Azul Marino #00236f, z-1) */}
          <div
            className="absolute bottom-0 left-80 sm:left-[450px] md:left-[510px] w-32 sm:w-40 h-8 rounded-t-2xl bg-[#00236f]/85 border-t border-x border-white/15 backdrop-blur-md z-1 shadow-[-2px_-4px_10px_rgba(0,0,0,0.3)]"
          />

          {/* Pestaña media 2 (Azul Marino #00236f con elevación, z-3) */}
          <div
            className="absolute bottom-0 left-52 sm:left-[260px] md:left-[300px] w-40 sm:w-48 h-11 rounded-t-2xl bg-[#00236f]/95 border-t border-x border-white/20 backdrop-blur-md z-3 shadow-[-3px_-4px_12px_rgba(0,0,0,0.35)]"
          />

          {/* Papel 1: Hoja de Examen Blanca con Calificación 10/10 (Más ancha horizontalmente, -2.5deg) */}
          <div
            className="absolute -bottom-8 sm:-bottom-10 right-40 sm:right-56 md:right-64 w-48 sm:w-64 md:w-72 h-20 sm:h-24 -rotate-[2.5deg] rounded-t-lg bg-slate-50 border-t border-x border-slate-300 shadow-[-2px_-3px_8px_rgba(0,0,0,0.2)] -z-10 flex flex-col justify-start pt-1.5 px-3.5"
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

          {/* Papel 2: Ficha Kraft / Manila con Datos de Expediente (Más ancha horizontalmente, +3.5deg) */}
          <div
            className="absolute -bottom-6 sm:-bottom-8 right-4 sm:right-8 md:right-12 w-36 sm:w-52 md:w-60 h-16 sm:h-18 rotate-[3.5deg] rounded-t-lg bg-[#F5E6C8] border-t border-x border-amber-800/20 shadow-[-2px_-3px_6px_rgba(0,0,0,0.18)] -z-10 flex flex-col justify-start pt-1 px-3"
            style={{ fontFamily: "var(--font-poppins), sans-serif" }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600/70" />
                <span className="text-[10px] sm:text-[11px] font-bold text-amber-950/80 tracking-tight whitespace-nowrap">
                  Ciclo Académico 2026
                </span>
              </div>
              <span className="hidden sm:inline text-[8px] sm:text-[9px] font-medium text-amber-900/60 uppercase tracking-wider">
                Legajo Activo
              </span>
            </div>
            <span className="text-[8px] sm:text-[9px] font-medium text-amber-900/60 uppercase tracking-wider mt-0.5">
              Acta N° 84 · Aprob. Definitiva
            </span>
          </div>

          {/* Pestaña principal 1: ¿Por qué elegirnos? (Azul #0000FF que se funde con la sección frontal, z-10) */}
          <div
            className="absolute bottom-0 left-0 w-52 sm:w-64 md:w-72 h-14 rounded-t-2xl bg-[#0000FF] border-t border-x border-white/30 z-10 flex items-center justify-start pl-6 sm:pl-8 shadow-[-4px_-4px_14px_rgba(0,0,0,0.4)]"
            style={{ fontFamily: "var(--font-poppins), sans-serif" }}
          >
            <span className="text-white font-bold text-sm sm:text-base md:text-lg tracking-wide whitespace-nowrap">
              ¿Por qué elegirnos?
            </span>
          </div>
        </div>

        {/* Contenido de la sección azul #0000FF con Métricas y Espacio para Imagen Institucional */}
        <div className="w-full min-h-screen flex items-center justify-center px-6 sm:px-12 lg:px-20 py-20">
          <div className="flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-16 w-full max-w-7xl">
            
            {/* Lado Izquierdo: Tarjeta con Imagen de la Institución con perspectiva suave en eje Y */}
            <div className="flex-shrink-0">
              <div className="relative [perspective:900px] h-[380px] sm:h-[480px] lg:h-[540px] aspect-[896/1200] w-auto max-w-full">
                <div
                  className="relative w-full h-full rounded-3xl bg-white/[0.08] backdrop-blur-xl border border-white/25 shadow-2xl overflow-hidden [transform-style:preserve-3d]"
                  style={{
                    transform: 'rotateY(10deg)'
                  }}
                >
                  <img
                    src="/Imagen-Institucional.png"
                    alt="Instalaciones Nexo Académico"
                    className="w-full h-full object-contain object-center"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                  {/* Haz de brillo diagonal periódico */}
                  <div aria-hidden="true" className="animate-shimmer-diagonal [animation-delay:350ms]" />
                </div>
              </div>
            </div>

            {/* Lado Derecho: Header y Grilla de Métricas Atractivas con CountUp */}
            <div className="flex-1 w-full max-w-2xl flex flex-col gap-8">
              <div>
                <span className="inline-block px-3.5 py-1 rounded-full text-xs font-semibold tracking-wider uppercase bg-white/10 border border-white/20 text-white mb-3">
                  Excelencia y Rendimiento
                </span>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
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
              <span className="px-2 py-0.5 rounded-full bg-white text-black text-[11px] sm:text-xs font-black uppercase tracking-wider">3 CUOTAS</span>
              <span>sin interés en todos los cursos</span>
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
              <span className="px-2 py-0.5 rounded-full bg-white text-black text-[11px] sm:text-xs font-black uppercase tracking-wider">3 CUOTAS</span>
              <span>sin interés en todos los cursos</span>
            </span>
            <span className="text-white/40 text-sm select-none">✦</span>
            <span>Inscripciones abiertas · Cupos limitados</span>
            <span className="text-white/40 text-sm select-none">✦</span>
          </div>
        </div>
      </aside>

      {/* ── Sección Blanca: Materias ── */}
      <section
        id="materias-destacadas"
        className="relative w-full bg-white text-slate-900 pt-16 sm:pt-20 pb-20 px-6 md:px-12 lg:px-20 min-h-screen scroll-mt-6 overflow-hidden flex items-center justify-center"
      >
        {/* Viñeta oscura perimetral (laterales y fondo inferior, sin sombreado superior) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_50%_15%,_#ffffff_45%,_rgba(241,245,249,0.85)_70%,_rgba(148,163,184,0.35)_88%,_rgba(30,41,59,0.4)_100%)] shadow-[inset_0_-120px_120px_-40px_rgba(15,23,42,0.35),_inset_80px_0_100px_-40px_rgba(15,23,42,0.22),_inset_-80px_0_100px_-40px_rgba(15,23,42,0.22)]"
        />

        {/* Logo SVG centrado con bordes difuminados y desvanecido como marca de agua */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[240px] sm:w-[320px] md:w-[420px] lg:w-[500px] max-w-none select-none z-0 [mask-image:radial-gradient(ellipse_at_center,_black_30%,_transparent_75%)] opacity-15 transition-opacity"
        >
          <img
            src="/fondo-materias.svg"
            alt=""
            className="w-full h-auto object-contain"
          />
        </div>

        {/* Contenedor con Carrusel Cilíndrico Circular 3D */}
        <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col items-center">
          {/* Título centrado con animación BlurText */}
          <div className="w-full flex justify-center text-center pt-6 sm:pt-10 mb-3 sm:mb-4">
            <h2 id="materias-destacadas-title" className="inline-block">
              <BlurText
                text="¡Las materias más pedidas!"
                delay={180}
                animateBy="words"
                direction="top"
                className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 justify-center text-center drop-shadow-sm"
              />
            </h2>
          </div>

          <div className="-mt-4 sm:-mt-8 md:-mt-12 relative w-full h-[560px]">
            <CircularCarousel
              items={items}
              preset="cylinder"
              intro="rise"
              cardWidth={220}
              aspectRatio={1}
              speed={14}
              captions={false}
              gap={25}
              tilt={-5}
              curve={1}
              perspective={2500}
              autoplay="drift"
              interval={3}
              direction="left"
              momentum={0.6}
              snap
              pauseOnHover
              focusOnClick
              draggable
              parallax={0.3}
              stretch={0.5}
              fadeColor="#000000"
              depthFade
              onActiveItemChange={handleActiveItemChange}
            />
          </div>

          {/* Tarjeta de información interactiva al detener una materia con BlurText y botón Ver más */}
          <div
            className="w-full flex justify-center items-center min-h-[96px] -mt-6 sm:-mt-10 mb-4 z-20"
            onMouseEnter={() => {
              isDetailHoveredRef.current = true;
              if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
            }}
            onMouseLeave={() => {
              isDetailHoveredRef.current = false;
              if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
              hideTimeoutRef.current = setTimeout(() => {
                setActiveSubject(null);
              }, 400);
            }}
          >
            {activeSubject ? (
              <div
                key={activeSubject.title}
                className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-8 px-6 py-4 sm:px-8 sm:py-3.5 rounded-3xl sm:rounded-full bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-[0_20px_50px_rgba(0,0,0,0.08),0_4px_16px_rgba(0,0,0,0.04)] transition-all duration-300 animate-in fade-in zoom-in-95"
              >
                <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
                  {activeSubject.subtitle && (
                    <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-black border border-slate-300/80 mb-1">
                      {activeSubject.subtitle}
                    </span>
                  )}
                  <h3
                    className="inline-block text-xl sm:text-2xl font-extrabold text-black tracking-tight"
                    style={{ fontFamily: "var(--font-poppins), sans-serif" }}
                  >
                    <BlurText
                      text={activeSubject.title || "Materia"}
                      delay={40}
                      stepDuration={0.16}
                      animateBy="words"
                      direction="top"
                      className="text-xl sm:text-2xl font-extrabold text-black tracking-tight"
                    />
                  </h3>
                </div>

                <Link
                  href="/login"
                  className="group inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-black hover:bg-[#0000FF] text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-xl hover:shadow-blue-600/30 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 shrink-0"
                >
                  <span>Ver más</span>
                  <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* ── Sección de Testimonios: Marquee Vertical Multi-Columna (marquee-03) ── */}
      <section id="testimonios" className="relative w-full bg-slate-950 text-white py-24 px-6 md:px-12 lg:px-20 border-t border-white/10 overflow-hidden scroll-mt-6">
        <div className="max-w-7xl mx-auto flex flex-col gap-10">
          <div className="text-center max-w-2xl mx-auto">
            <span className="inline-block px-3.5 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-white/10 text-blue-300 border border-white/15 mb-3">
              Comunidad Académica
            </span>
            <h2
              className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight"
              style={{ fontFamily: "var(--font-poppins), sans-serif" }}
            >
              Lo que dicen nuestros estudiantes
            </h2>
            <p className="text-slate-400 text-base sm:text-lg mt-3 font-normal">
              Historias reales de alumnos que potenciaron su carrera universitaria con Nexo Académico.
            </p>
          </div>

          <VerticalMarqueeDemo />
        </div>
      </section>

      {/* Menú Radial Circular con LiveOrb permanente en la Esquina Inferior Derecha */}
      <div className="fixed bottom-8 right-8 z-50">
        <RadialSocialMenu />
      </div>
    </KineticGrid>
  );
}
