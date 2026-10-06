"use client";

import { useRef } from "react";
import Link from "next/link";
import KineticGrid from "@/components/ui/kinetic-grid";
import BlurText from "@/components/ui/blur-text";
import RadialSocialMenu from "@/components/ui/radial-social-menu";
import CountUp from "@/components/ui/count-up";
import TiltedCard from "@/components/ui/tilted-card";
import SplitText from "@/components/ui/split-text";
import VerticalMarqueeDemo from "@/components/ui/marquee-03";
import { PlaceCard } from "@/components/ui/card-22";
import { Users, Award, GraduationCap, BookOpen, Building2 } from "lucide-react";

const materiasDestacadas = [
  {
    id: 1,
    title: "Programación Web & Cloud",
    tags: ["Informática", "1° Año"],
    rating: 4.9,
    dateRange: "16 Semanas",
    hostType: "Prof. Titular",
    isTopRated: true,
    description: "Desarrollo frontend y backend moderno con React, Node.js y arquitecturas escalables en la nube.",
    images: [
      "/nino.jpg",
      "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=80"
    ],
    pricePerNight: 45000,
    actionText: "Ver Programa"
  },
  {
    id: 2,
    title: "Inteligencia Artificial Aplicada",
    tags: ["Ciencia de Datos", "2° Año"],
    rating: 5.0,
    dateRange: "18 Semanas",
    hostType: "Esp. en Machine Learning",
    isTopRated: true,
    description: "Modelos predictivos, redes neuronales, visión artificial y automatización con Python.",
    images: [
      "/mujer.jpg",
      "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80"
    ],
    pricePerNight: 48000,
    actionText: "Ver Programa"
  },
  {
    id: 3,
    title: "Cálculo y Álgebra Lineal",
    tags: ["Ciencias Básicas", "1° Año"],
    rating: 4.8,
    dateRange: "16 Semanas",
    hostType: "Cátedra Matemática",
    isTopRated: false,
    description: "Fundamentos matemáticos para ciencias de la computación, análisis numérico y optimización.",
    images: [
      "/Imagen-Institucional.png",
      "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&auto=format&fit=crop&q=80",
      "/nino.jpg"
    ],
    pricePerNight: 42000,
    actionText: "Ver Programa"
  },
  {
    id: 4,
    title: "Estructuras de Datos & Algoritmos",
    tags: ["Informática", "2° Año"],
    rating: 4.9,
    dateRange: "16 Semanas",
    hostType: "Prof. Adjunto",
    isTopRated: true,
    description: "Diseño de algoritmos avanzados, análisis de complejidad, árboles, grafos y estructuras óptimas.",
    images: [
      "/nino.jpg",
      "https://images.unsplash.com/photo-1516116211227-bbc13c6ff099?w=600&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=600&auto=format&fit=crop&q=80"
    ],
    pricePerNight: 46000,
    actionText: "Ver Programa"
  },
  {
    id: 5,
    title: "Bases de Datos & SQL",
    tags: ["Sistemas", "1° Año"],
    rating: 4.7,
    dateRange: "14 Semanas",
    hostType: "Especialista DBA",
    isTopRated: false,
    description: "Modelado relacional, consultas SQL complejas, normalización e integridad transaccional.",
    images: [
      "/mujer.jpg",
      "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=600&auto=format&fit=crop&q=80",
      "/Imagen-Institucional.png"
    ],
    pricePerNight: 42000,
    actionText: "Ver Programa"
  },
  {
    id: 6,
    title: "Diseño de Experiencia (UX/UI)",
    tags: ["Diseño Digital", "2° Año"],
    rating: 5.0,
    dateRange: "16 Semanas",
    hostType: "Lead Product Designer",
    isTopRated: true,
    description: "Investigación de usuarios, diseño de interfaces modernas, prototipado interactivo y accesibilidad.",
    images: [
      "/Imagen-Institucional.png",
      "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=600&auto=format&fit=crop&q=80",
      "/mujer.jpg"
    ],
    pricePerNight: 45000,
    actionText: "Ver Programa"
  },
  {
    id: 7,
    title: "Física y Electromagnetismo",
    tags: ["Ciencias Básicas", "2° Año"],
    rating: 4.8,
    dateRange: "16 Semanas",
    hostType: "Cátedra de Física",
    isTopRated: false,
    description: "Principios físicos de la computación, circuitos, ondas electromagnéticas y aplicaciones tecnológicas.",
    images: [
      "/nino.jpg",
      "https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=600&auto=format&fit=crop&q=80",
      "/Imagen-Institucional.png"
    ],
    pricePerNight: 42000,
    actionText: "Ver Programa"
  }
];

export default function LandingPage() {
  const carouselRef = useRef<HTMLDivElement>(null);

  const handleCarouselWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (carouselRef.current) {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        carouselRef.current.scrollLeft += e.deltaY * 1.3;
      }
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
            className="h-8 sm:h-9 w-auto object-contain drop-shadow-md"
          />
        </Link>
      </div>

      {/* Botones de Acción (Arriba a la Derecha) */}
      <div className="absolute top-6 right-6 sm:top-8 sm:right-10 z-30 flex items-center gap-3 pointer-events-auto">
        <Link
          href="/login"
          className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold tracking-wide bg-white hover:bg-white/90 text-slate-950 shadow-lg transition-all duration-300 hover:scale-105"
        >
          Iniciar sesión
        </Link>
        <Link
          href="/login"
          className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold tracking-wide border border-white text-white bg-transparent hover:bg-white/10 backdrop-blur-sm transition-all duration-300 hover:scale-105"
        >
          Registrarme
        </Link>
      </div>

      <div className="relative flex min-h-screen items-center justify-center px-6 md:px-12 lg:px-20 py-16">
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

          {/* Lado derecho: Tarjetas transparentes en paralelo horizontal con Pop-Out desplazadas hacia arriba */}
          <div className="lg:col-span-7 flex flex-row items-end justify-center lg:justify-end gap-6 sm:gap-10 -mt-12 lg:-mt-24 pt-0">
            
            {/* Card del Niño (elevada, pop de entrada, brillo diagonal) */}
            <div className="relative w-56 sm:w-72 h-72 sm:h-96 -mb-12 sm:-mb-16 rounded-3xl bg-white/[0.06] backdrop-blur-xl border border-white/20 shadow-2xl overflow-visible flex flex-col justify-end animate-card-intro">
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

            {/* Card de la Mujer (pop de entrada, brillo diagonal) */}
            <div className="relative w-64 sm:w-80 h-[340px] sm:h-[440px] rounded-3xl bg-white/[0.06] backdrop-blur-xl border border-white/20 shadow-2xl overflow-visible flex flex-col justify-end animate-card-intro [animation-delay:150ms]">
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

        {/* Indicador suave de Scroll hacia abajo */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/40 text-xs font-medium tracking-widest uppercase animate-bounce pointer-events-none select-none">
          <span>Desplazate</span>
          <span className="text-base">↓</span>
        </div>
      </div>

      {/* ── Transición: Pestaña/Solapa de Archivo conectando con Sección Azul #0000FF ── */}
      <section className="relative w-full bg-[#0000FF] min-h-screen text-white mt-16 rounded-tr-[36px] shadow-2xl">
        {/* Contenedor de las pestañas escalonadas (alineado a la izquierda) */}
        <div className="absolute bottom-full left-0 w-full max-w-lg h-14 pointer-events-none select-none">
          {/* Pestaña trasera */}
          <div className="absolute bottom-0 left-28 sm:left-36 w-32 sm:w-40 h-7 rounded-t-2xl bg-blue-900/60 backdrop-blur-md z-1" />

          {/* Pestaña media */}
          <div className="absolute bottom-0 left-10 sm:left-14 w-40 sm:w-48 h-10 rounded-t-2xl bg-blue-700/60 backdrop-blur-md z-2" />

          {/* Pestaña principal (Azul #0000FF que se funde con la sección) */}
          <div
            className="absolute bottom-0 left-0 w-60 sm:w-72 h-14 rounded-t-2xl bg-[#0000FF] z-10 flex items-center justify-start pl-6 sm:pl-8 shadow-[-2px_-4px_12px_rgba(0,0,0,0.2)]"
            style={{ fontFamily: "var(--font-poppins), sans-serif" }}
          >
            <span className="text-white font-bold text-base sm:text-lg tracking-wide whitespace-nowrap">
              ¿Por qué elegirnos?
            </span>
          </div>
        </div>

        {/* Contenido de la sección azul #0000FF con Métricas y Espacio para Imagen Institucional */}
        <div className="w-full min-h-screen flex items-center justify-center px-6 sm:px-12 lg:px-20 py-20">
          <div className="flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-16 w-full max-w-7xl">
            
            {/* Lado Izquierdo: Tarjeta con Imagen de la Institución */}
            <div className="flex-shrink-0">
              <div className="relative w-72 sm:w-96 lg:w-[460px] h-[380px] sm:h-[480px] lg:h-[540px] rounded-3xl bg-white/[0.08] backdrop-blur-xl border border-white/25 shadow-2xl overflow-hidden group transition-all duration-300 hover:border-white/40">
                <img
                  src="/Imagen-Institucional.png"
                  alt="Instalaciones Nexo Académico"
                  className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                {/* Haz de brillo diagonal periódico */}
                <div aria-hidden="true" className="animate-shimmer-diagonal [animation-delay:350ms]" />
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
                <p className="text-white/80 text-sm sm:text-base mt-2 max-w-xl font-normal">
                  Acompañamos a cada estudiante desde su primer día con tutorías personalizadas, docentes destacados y una plataforma ágil.
                </p>
              </div>

              {/* Grilla de Métricas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                
                {/* 1. Alumnos Activos */}
                <div className="bg-white/[0.08] backdrop-blur-md rounded-2xl border border-white/20 p-5 sm:p-6 flex flex-col gap-2 hover:bg-white/[0.12] transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 text-xs font-semibold uppercase tracking-wider">Estudiantes</span>
                    <div className="p-2 rounded-xl bg-white/10 text-white">
                      <Users className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1 text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
                    <span>+</span>
                    <CountUp to={1500} duration={2.2} separator="." />
                  </div>
                  <p className="text-white/80 text-xs sm:text-sm font-medium">Alumnos activos cursando materias este ciclo.</p>
                </div>

                {/* 2. Tasa de Aprobación */}
                <div className="bg-white/[0.08] backdrop-blur-md rounded-2xl border border-white/20 p-5 sm:p-6 flex flex-col gap-2 hover:bg-white/[0.12] transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 text-xs font-semibold uppercase tracking-wider">Aprobación</span>
                    <div className="p-2 rounded-xl bg-white/10 text-white">
                      <Award className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1 text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
                    <CountUp to={94} duration={2.4} />
                    <span>%</span>
                  </div>
                  <p className="text-white/80 text-xs sm:text-sm font-medium">Tasa promedio de aprobación en parciales y finales.</p>
                </div>

                {/* 3. Docentes Universitarios */}
                <div className="bg-white/[0.08] backdrop-blur-md rounded-2xl border border-white/20 p-5 sm:p-6 flex flex-col gap-2 hover:bg-white/[0.12] transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 text-xs font-semibold uppercase tracking-wider">Cuerpo Docente</span>
                    <div className="p-2 rounded-xl bg-white/10 text-white">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1 text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
                    <span>+</span>
                    <CountUp to={48} duration={2.0} />
                  </div>
                  <p className="text-white/80 text-xs sm:text-sm font-medium">Profesores universitarios especialistas y tutores.</p>
                </div>

                {/* 4. Materias Disponibles */}
                <div className="bg-white/[0.08] backdrop-blur-md rounded-2xl border border-white/20 p-5 sm:p-6 flex flex-col gap-2 hover:bg-white/[0.12] transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 text-xs font-semibold uppercase tracking-wider">Oferta Académica</span>
                    <div className="p-2 rounded-xl bg-white/10 text-white">
                      <BookOpen className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1 text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
                    <span>+</span>
                    <CountUp to={85} duration={2.2} />
                  </div>
                  <p className="text-white/80 text-xs sm:text-sm font-medium">Materias y programas disponibles para cursar.</p>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Sección Blanca: Catálogo de Materias con TiltedCard ── */}
      <section className="relative w-full bg-white text-slate-900 py-24 px-6 md:px-12 lg:px-20 min-h-screen">
        <div className="max-w-7xl mx-auto flex flex-col gap-12">
          
          {/* Header de la sección */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 pb-8">
            <div className="max-w-2xl">
              <span className="inline-block px-3.5 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-black text-white border border-black mb-3">
                Plan de Estudios
              </span>
              <div style={{ fontFamily: "var(--font-poppins), sans-serif" }}>
                <SplitText
                  text="Materias Destacadas"
                  tag="h2"
                  className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-950 leading-tight block"
                  delay={45}
                  duration={0.6}
                  splitType="chars"
                  from={{ opacity: 0, y: 35 }}
                  to={{ opacity: 1, y: 0 }}
                  threshold={0.15}
                />
              </div>
              <p className="text-slate-600 text-base sm:text-lg mt-3 font-normal">
                ¡Descubrí algunos de nuestros cursos más solicitados!
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider select-none">
              <span>Deslizá para explorar</span>
              <span className="text-base font-bold text-slate-900">→</span>
            </div>
          </div>

          {/* Carrusel Desplazable Horizontalmente con rueda y sin barra de scroll visible */}
          <div
            ref={carouselRef}
            onWheel={handleCarouselWheel}
            className="flex gap-8 overflow-x-auto pb-12 pt-4 px-2 snap-x snap-mandatory select-none scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            {materiasDestacadas.map((materia) => (
              <div
                key={materia.id}
                className="flex-shrink-0 w-[300px] sm:w-[340px] snap-start"
              >
                <PlaceCard
                  images={materia.images}
                  tags={materia.tags}
                  rating={materia.rating}
                  title={materia.title}
                  dateRange={materia.dateRange}
                  hostType={materia.hostType}
                  isTopRated={materia.isTopRated}
                  description={materia.description}
                  pricePerNight={materia.pricePerNight}
                  actionText={materia.actionText}
                />
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── Sección de Testimonios: Marquee Vertical Multi-Columna (marquee-03) ── */}
      <section className="relative w-full bg-slate-950 text-white py-24 px-6 md:px-12 lg:px-20 border-t border-white/10 overflow-hidden">
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
