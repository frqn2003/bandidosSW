'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Star, Quote } from 'lucide-react';

export interface Testimonial {
  id: number;
  nombre: string;
  carrera: string;
  anio: string;
  avatar: string;
  comentario: string;
  calificacion: number;
  materiaAprobada?: string;
}

interface ThreeDTestimonialsProps {
  testimonials?: Testimonial[];
  autoplay?: boolean;
  autoplayInterval?: number;
  className?: string;
}

const defaultTestimonials: Testimonial[] = [
  {
    id: 1,
    nombre: "Sofía Martínez",
    carrera: "Ingeniería en Informática",
    anio: "3° Año",
    avatar: "/nuevamujer.png",
    calificacion: 5,
    materiaAprobada: "Estructuras de Datos & Algoritmos",
    comentario:
      "La calidad de los docentes y el acompañamiento personalizado fueron clave para que pudiera promocionar materias que me resultaban muy difíciles. La plataforma es súper intuitiva y me ordenó todo el semestre."
  },
  {
    id: 2,
    nombre: "Lucas Benítez",
    carrera: "Licenciatura en Sistemas",
    anio: "2° Año",
    avatar: "/nuevoniño.png",
    calificacion: 5,
    materiaAprobada: "Cálculo y Álgebra Lineal",
    comentario:
      "Empecé con muchas dudas y miedos en las materias numéricas, pero los tutores te explican con paciencia y ejemplos reales. El seguimiento individual marca una diferencia enorme frente a las clases tradicionales."
  },
  {
    id: 3,
    nombre: "Camila Rodríguez",
    carrera: "Diseño y Comunicación Digital",
    anio: "4° Año",
    avatar: "/nuevamujer.png",
    calificacion: 5,
    materiaAprobada: "Diseño de Experiencia (UX/UI)",
    comentario:
      "Los proyectos prácticos y las correcciones en vivo me permitieron construir un portfolio profesional mientras cursaba. Recomiendo Nexo Académico a cualquier estudiante que busque superarse."
  },
  {
    id: 4,
    nombre: "Mateo Fernández",
    carrera: "Ciencia de Datos",
    anio: "2° Año",
    avatar: "/nuevoniño.png",
    calificacion: 5,
    materiaAprobada: "Inteligencia Artificial Aplicada",
    comentario:
      "Avanzar a mi propio ritmo con clases grabadas y consultas en vivo me permitió compatibilizar el estudio con mi trabajo. Sin dudas la mejor inversión para mi carrera universitaria."
  }
];

export default function ThreeDTestimonials({
  testimonials = defaultTestimonials,
  autoplay = false,
  autoplayInterval = 6000,
  className = ''
}: ThreeDTestimonialsProps) {
  const [active, setActive] = useState(0);

  const handleNext = useCallback(() => {
    setActive((prev) => (prev + 1) % testimonials.length);
  }, [testimonials.length]);

  const handlePrev = useCallback(() => {
    setActive((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  }, [testimonials.length]);

  useEffect(() => {
    if (!autoplay) return;
    const interval = setInterval(handleNext, autoplayInterval);
    return () => clearInterval(interval);
  }, [autoplay, autoplayInterval, handleNext]);

  const current = testimonials[active];

  return (
    <div className={`w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 ${className}`}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
        
        {/* Columna Izquierda: Tarjetas 3D en Stack Perspectivo */}
        <div className="lg:col-span-6 relative flex items-center justify-center min-h-[380px] sm:min-h-[440px] [perspective:1000px]">
          <div className="relative w-full max-w-sm h-[360px] sm:h-[400px]">
            {testimonials.map((item, index) => {
              const offset = (index - active + testimonials.length) % testimonials.length;
              const isFront = offset === 0;
              const isNext = offset === 1;
              const isPrev = offset === testimonials.length - 1;

              // Calcular transformaciones 3D según la posición en el stack
              let zIndex = 0;
              let scale = 0.85;
              let rotateZ = -6;
              let rotateY = 0;
              let translateY = 20;
              let translateX = -20;
              let opacity = 0;

              if (isFront) {
                zIndex = 30;
                scale = 1;
                rotateZ = 0;
                rotateY = 0;
                translateY = 0;
                translateX = 0;
                opacity = 1;
              } else if (isNext) {
                zIndex = 20;
                scale = 0.94;
                rotateZ = 5;
                rotateY = -4;
                translateY = 12;
                translateX = 24;
                opacity = 0.85;
              } else if (isPrev) {
                zIndex = 10;
                scale = 0.88;
                rotateZ = -8;
                rotateY = 6;
                translateY = 24;
                translateX = -32;
                opacity = 0.6;
              }

              return (
                <motion.div
                  key={item.id}
                  className="absolute inset-0 rounded-3xl bg-slate-900 text-white p-6 sm:p-8 shadow-2xl border border-white/15 flex flex-col justify-between overflow-hidden cursor-pointer select-none"
                  animate={{
                    scale,
                    rotateZ,
                    rotateY,
                    y: translateY,
                    x: translateX,
                    opacity,
                    zIndex
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 24
                  }}
                  onClick={() => setActive(index)}
                  style={{ transformStyle: "preserve-3d" }}
                >
                  {/* Fondo sutil y glow */}
                  <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
                  
                  {/* Encabezado de la tarjeta */}
                  <div className="flex items-center justify-between z-10">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-blue-400/50 bg-slate-800 flex-shrink-0 shadow-md">
                        <img
                          src={item.avatar}
                          alt={item.nombre}
                          className="w-full h-full object-cover object-top"
                        />
                      </div>
                      <div>
                        <h4 className="font-bold text-base text-white leading-tight">
                          {item.nombre}
                        </h4>
                        <p className="text-xs text-blue-300 font-medium">
                          {item.carrera} • {item.anio}
                        </p>
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-white/10 text-blue-300">
                      <Quote className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Comentario en la tarjeta */}
                  <div className="my-auto py-3 z-10">
                    <p className="text-sm sm:text-base text-slate-200 font-normal leading-relaxed line-clamp-4 italic">
                      "{item.comentario}"
                    </p>
                  </div>

                  {/* Pie de tarjeta con estrellas y logro */}
                  <div className="flex items-center justify-between pt-3 border-t border-white/10 z-10">
                    <div className="flex items-center gap-1 text-amber-400">
                      {[...Array(item.calificacion)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    {item.materiaAprobada && (
                      <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                        Aprobó {item.materiaAprobada}
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Columna Derecha: Reseña Detallada Activa y Controles de Navegación */}
        <div className="lg:col-span-6 flex flex-col justify-center gap-6">
          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-blue-50 text-blue-700 border border-blue-200">
              Experiencias de Alumnos
            </span>
            <div className="flex items-center gap-1 text-amber-500 ml-2">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
              ))}
              <span className="text-xs font-bold text-slate-700 ml-1">5.0 / 5.0</span>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="flex flex-col gap-4"
            >
              <h3
                className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-950 tracking-tight leading-snug"
                style={{ fontFamily: "var(--font-poppins), sans-serif" }}
              >
                "{current.comentario}"
              </h3>

              <div className="flex items-center gap-4 mt-2">
                <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-slate-300 shadow-md bg-slate-100 flex-shrink-0">
                  <img
                    src={current.avatar}
                    alt={current.nombre}
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <div>
                  <h4 className="font-extrabold text-lg text-slate-900 leading-tight">
                    {current.nombre}
                  </h4>
                  <p className="text-sm font-medium text-slate-600">
                    {current.carrera} • <span className="text-blue-600 font-semibold">{current.anio}</span>
                  </p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Botones de Navegación 3D */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-200 mt-2">
            {/* Indicadores de Progreso */}
            <div className="flex items-center gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    active === i ? "w-8 bg-blue-600" : "w-2 bg-slate-300 hover:bg-slate-400"
                  }`}
                  aria-label={`Ver testimonio ${i + 1}`}
                />
              ))}
            </div>

            {/* Flechas Anterior / Siguiente */}
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrev}
                className="w-11 h-11 rounded-full border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 flex items-center justify-center shadow-sm transition-all duration-200 hover:scale-105 active:scale-95"
                aria-label="Testimonio anterior"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleNext}
                className="w-11 h-11 rounded-full border border-slate-950 bg-slate-950 hover:bg-slate-800 text-white flex items-center justify-center shadow-md transition-all duration-200 hover:scale-105 active:scale-95"
                aria-label="Testimonio siguiente"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
