"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";

// BACKEND: Reemplazar con GET /api/testimonios o /api/experiencias/aprobadas
export interface ExperienciaEstudiante {
  id: number;
  nombre: string;
  carrera: string;
  materia: string;
  primerParcial: number;
  notaFinal: number;
  quotePre: string;
  quoteHighlight: string;
  quotePost: string;
  semanas: string;
  foto: string;
}

const EXPERIENCIAS_DATA: ExperienciaEstudiante[] = [
  {
    id: 1,
    nombre: "Lucía Fernández",
    carrera: "Ingeniería en Sistemas",
    materia: "Análisis Matemático I",
    primerParcial: 3,
    notaFinal: 9,
    quotePre: "Había recursado dos veces. ",
    quoteHighlight: "Con las clases de repaso y los simulacros entendí por qué se hacía cada paso",
    quotePost: ", no solo cómo memorizar fórmulas.",
    semanas: "6 semanas",
    foto: "/Chica1.png"
  },
  {
    id: 2,
    nombre: "Mateo Ríos",
    carrera: "Licenciatura en Química",
    materia: "Química General",
    primerParcial: 4,
    notaFinal: 8,
    quotePre: "Estequiometría me parecía un idioma aparte. ",
    quoteHighlight: "Mi tutor me la explicó con ejercicios de parcial y llegué tranquilo al examen",
    quotePost: ".",
    semanas: "5 semanas",
    foto: "/Chico1.png"
  },
  {
    id: 3,
    nombre: "Camila Torres",
    carrera: "Ingeniería Industrial",
    materia: "Física I",
    primerParcial: 2,
    notaFinal: 10,
    quotePre: "Trabajo de día y estudio de noche. ",
    quoteHighlight: "Poder repasar cuando yo podía fue lo que me salvó la cursada",
    quotePost: " y me dio la confianza para ir a final.",
    semanas: "8 semanas",
    foto: "/Chica2.png"
  },
  {
    id: 4,
    nombre: "Joaquín Medina",
    carrera: "Licenciatura en Economía",
    materia: "Probabilidad y Estadística",
    primerParcial: 4,
    notaFinal: 8,
    quotePre: "Me dieron casos reales en vez de fórmulas sueltas. ",
    quoteHighlight: "En el examen final ya reconocía cada tipo de problema",
    quotePost: " al primer golpe de vista.",
    semanas: "4 semanas",
    foto: "/Chico2.png"
  },
  {
    id: 5,
    nombre: "Valentina Cruz",
    carrera: "Ciencias de la Computación",
    materia: "Algoritmos y Estructuras",
    primerParcial: 5,
    notaFinal: 10,
    quotePre: "Escribir código con feedback en cada entrega cambió todo. ",
    quoteHighlight: "Promocioné con 10 y hoy ayudo a mis propios compañeros",
    quotePost: " de cursada.",
    semanas: "7 semanas",
    foto: "/Chica3.png"
  }
];

const ROTATIONS = [-1.5, 2, -2, 1.5, -1];

export default function ExperienciasAlumnos() {
  const containerRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const sheetRefs = useRef<(HTMLElement | null)[]>([]);
  const stampRefs = useRef<(HTMLElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const currentIndexRef = useRef(0);

  const showStudent = (targetIdx: number, syncScroll: boolean = false) => {
    if (targetIdx < 0 || targetIdx >= EXPERIENCIAS_DATA.length) return;
    currentIndexRef.current = targetIdx;
    setActiveIndex(targetIdx);

    const sheets = sheetRefs.current.filter(Boolean) as HTMLElement[];
    const stamps = stampRefs.current.filter(Boolean) as HTMLElement[];
    if (!sheets.length) return;

    if (window.innerWidth > 820) {
      sheets.forEach((sheet, i) => {
        gsap.killTweensOf(sheet);
        if (i < targetIdx) {
          // Hojas anteriores: descartadas hacia la izquierda
          gsap.to(sheet, {
            xPercent: -125,
            rotation: -18,
            y: 50,
            opacity: 0,
            zIndex: 5 + i,
            duration: 0.45,
            ease: "power2.inOut"
          });
        } else if (i === targetIdx) {
          // Hoja activa: en el centro, al frente con zIndex superior
          gsap.to(sheet, {
            xPercent: 0,
            rotation: ROTATIONS[targetIdx % ROTATIONS.length],
            y: 0,
            scale: 1,
            opacity: 1,
            zIndex: 40,
            duration: 0.45,
            ease: "power2.out"
          });

          // Impacto enérgico del sello
          const stamp = stamps[targetIdx];
          if (stamp) {
            gsap.killTweensOf(stamp);
            gsap.fromTo(
              stamp,
              { scale: 2.3, opacity: 0, rotation: -24 },
              { scale: 1, opacity: 1, rotation: -12, duration: 0.35, ease: "power4.out" }
            );
          }
        } else {
          // Hojas posteriores: esperando detrás apiladas
          gsap.to(sheet, {
            xPercent: 0,
            rotation: ROTATIONS[i % ROTATIONS.length],
            y: (i - targetIdx) * 10,
            scale: Math.max(0.92, 1 - (i - targetIdx) * 0.03),
            opacity: 1,
            zIndex: 30 - (i - targetIdx),
            duration: 0.45,
            ease: "power2.out"
          });
        }
      });
    } else {
      sheets[targetIdx]?.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    if (syncScroll) {
      const st = ScrollTrigger.getById?.("testimonios-st") || ScrollTrigger.getAll().find((s) => s.trigger === pinRef.current);
      if (st && st.start && st.end) {
        const targetScroll = st.start + (targetIdx / (EXPERIENCIAS_DATA.length - 1)) * (st.end - st.start);
        window.scrollTo({ top: targetScroll, behavior: "smooth" });
      }
    }
  };

  useGSAP(
    () => {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const sheets = sheetRefs.current.filter(Boolean) as HTMLElement[];
      const stamps = stampRefs.current.filter(Boolean) as HTMLElement[];
      const total = sheets.length;

      if (!sheets.length || !pinRef.current) return;

      const mm = gsap.matchMedia();

      // Escritorio (min-width: 821px): Pinned deck con paso de hojas físicas tipo examen
      mm.add("(min-width: 821px)", () => {
        sheets.forEach((sheet, idx) => {
          gsap.set(sheet, {
            xPercent: 0,
            y: idx === 0 ? 0 : idx * 10,
            scale: idx === 0 ? 1 : Math.max(0.92, 1 - idx * 0.03),
            opacity: 1,
            zIndex: idx === 0 ? 40 : 30 - idx,
            rotation: ROTATIONS[idx % ROTATIONS.length]
          });
        });

        if (stamps[0] && !reduceMotion) {
          gsap.from(stamps[0], {
            scale: 2.4,
            opacity: 0,
            rotation: -24,
            duration: 0.4,
            ease: "power4.in",
            scrollTrigger: {
              trigger: stageRef.current,
              start: "top 70%",
              once: true
            }
          });
        }

        ScrollTrigger.create({
          id: "testimonios-st",
          trigger: pinRef.current,
          pin: true,
          start: "top top",
          end: () => `+=${(total - 1) * window.innerHeight * 0.75}`,
          onUpdate: (self) => {
            const step = 1 / (total - 1);
            const targetIdx = Math.min(total - 1, Math.max(0, Math.round(self.progress / step)));
            if (targetIdx !== currentIndexRef.current) {
              showStudent(targetIdx, false);
            }
          }
        });
      });

      // Móvil / Tablet (max-width: 820px): Hojas apiladas verticalmente
      mm.add("(max-width: 820px)", () => {
        sheets.forEach((sheet, idx) => {
          gsap.set(sheet, { rotation: ROTATIONS[idx % ROTATIONS.length], opacity: 1, xPercent: 0 });
        });
      });
    },
    { scope: containerRef }
  );

  return (
    <section
      ref={containerRef}
      id="testimonios"
      aria-labelledby="t-exp"
      className="relative text-[#1b1a17] rounded-t-[44px] sm:rounded-t-[48px] overflow-hidden select-none scroll-mt-6"
      style={{ backgroundColor: "#efe0c4" }}
    >
      <div
        ref={pinRef}
        className="min-h-0 md:min-h-screen max-w-[1380px] mx-auto grid grid-cols-1 md:grid-cols-[1.1fr_1.3fr] gap-8 lg:gap-14 items-center px-6 sm:px-10 lg:px-16 py-16 md:py-24"
      >
        {/* Columna Izquierda: Título y Lista interactiva de alumnos */}
        <div className="max-w-xl">
          <h2
            id="t-exp"
            className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-extrabold tracking-tight leading-[1.05] text-[#1b1a17] mb-5"
          >
            Materias que parecían imposibles, aprobadas
          </h2>
          <p className="text-[#5b5649] text-base sm:text-lg lg:text-xl leading-relaxed max-w-[46ch] mb-8 font-normal">
            Estudiantes que llegaron con un parcial desaprobado y terminaron promocionando. Esto cuentan de su paso por Nexo Académico.
          </p>

          {/* Lista de selección de alumnos (oculta en móviles, visible en desktop) */}
          <ul className="hidden md:grid gap-2 list-none p-0 m-0 max-w-xl">
            {EXPERIENCIAS_DATA.map((exp, idx) => {
              const isSelected = activeIndex === idx;
              return (
                <li key={exp.id}>
                  <button
                    type="button"
                    onClick={() => showStudent(idx, true)}
                    aria-current={isSelected}
                    className={`group w-full flex items-center gap-3.5 py-3 px-3.5 border-b border-dashed border-[#1b1a17]/25 text-left transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? "text-[#1b1a17] font-bold"
                        : "text-[#5b5649] hover:text-[#1b1a17] font-medium"
                    }`}
                  >
                    <span
                      className="text-2xl sm:text-3xl group-hover:text-4xl w-8 shrink-0 leading-none transition-all duration-200 group-hover:text-[#c8321e] group-hover:scale-110 origin-center"
                      style={{ fontFamily: "var(--font-caveat), Caveat, cursive" }}
                    >
                      {idx + 1}
                    </span>
                    <b
                      className={`transition-all duration-200 origin-left inline-block ${
                        isSelected
                          ? "text-xl sm:text-2xl font-bold text-[#1b1a17] bg-gradient-to-b from-transparent from-60% to-[#fdef8a] to-60%"
                          : "text-base sm:text-lg group-hover:text-xl sm:group-hover:text-2xl group-hover:text-[#1b1a17] group-hover:translate-x-1"
                      }`}
                    >
                      {exp.nombre}
                    </b>
                    <small className="ml-auto text-xs sm:text-sm group-hover:text-sm text-[#5b5649] group-hover:text-[#1b1a17] font-normal transition-all duration-200 truncate max-w-[160px]">
                      {exp.materia}
                    </small>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Columna Derecha: Tarjetas de examen físico (stage) */}
        <div
          ref={stageRef}
          className="relative h-auto md:h-[620px] lg:h-[660px] min-h-0 md:min-h-[520px] flex items-center justify-center w-full"
        >
          {EXPERIENCIAS_DATA.map((exp, idx) => (
            <article
              key={exp.id}
              ref={(el) => {
                sheetRefs.current[idx] = el;
              }}
              style={{ zIndex: 10 - idx }}
              aria-label={`Experiencia de ${exp.nombre}`}
              className="relative md:absolute inset-auto md:inset-0 m-auto w-full max-w-[560px] lg:max-w-[620px] h-auto md:h-full bg-[#fffdf6] rounded-md p-7 sm:p-9 lg:p-10 flex flex-col justify-start shadow-[0_22px_50px_rgba(60,40,10,0.22)] mb-8 md:mb-0 border border-amber-900/10 overflow-hidden"
            >
              {/* Agujeros de carpeta escolar (3 perforaciones clásicas con profundidad) */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 sm:left-4 inset-y-0 flex flex-col justify-between py-12 sm:py-16 z-20"
              >
                {[0, 1, 2].map((holeIdx) => (
                  <div
                    key={holeIdx}
                    className="w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full bg-[#efe0c4] border border-[#cfbe9e] shadow-[inset_0_2px_4px_rgba(40,30,15,0.45),0_1px_0_rgba(255,255,255,0.85)]"
                  />
                ))}
              </div>

              {/* Línea vertical roja continua de margen de hoja escolar (z-20 ininterrumpida) */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-14 sm:left-16 top-0 bottom-0 w-[2px] bg-[#c8321e]/35 z-20"
              />

              {/* Cinta adhesiva semi-transparente fijada al centro superior */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-3 left-1/2 -translate-x-1/2 w-[90px] h-[26px] bg-[#fdef8a]/85 -rotate-2 shadow-sm z-30"
              />

              {/* Renglones azules rayados de cuaderno que inician debajo del nombre y carrera */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 top-[140px] sm:top-[148px] z-0 opacity-45"
                style={{
                  backgroundImage: "repeating-linear-gradient(transparent 0 35px, #cfe0f1 35px 36px)",
                  backgroundPosition: "0 0"
                }}
              />

              {/* Espacio limpio superior: Encabezado del examen y datos del alumno */}
              <div className="relative z-10 pl-10 sm:pl-12">
                <div className="flex justify-between items-center text-xs sm:text-sm text-[#5b5649] pb-0.5">
                  <span className="font-semibold tracking-wide uppercase">Examen final</span>
                  <span className="font-medium text-[#1b1a17]">{exp.materia}</span>
                </div>
                <div className="pt-1 pb-1">
                  <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight text-[#1b1a17] m-0">
                    {exp.nombre}
                  </h3>
                  <small className="block font-medium text-xs sm:text-sm text-[#5b5649] mt-0.5">
                    {exp.carrera}
                  </small>
                </div>
              </div>

              {/* Comentario escrito a mano con lapicera azul directamente en el primer renglón */}
              <div className="relative z-10 pl-10 sm:pl-12 mt-6 sm:mt-7 mb-2 py-0">
                <p
                  className="text-xl sm:text-2xl lg:text-[25px] font-semibold text-[#16325c] tracking-normal m-0"
                  style={{
                    fontFamily: "var(--font-caveat), Caveat, cursive",
                    lineHeight: "36px"
                  }}
                >
                  “{exp.quotePre}
                  <mark className="bg-[#fef08a]/90 text-[#16325c] px-1 py-0.5 rounded-sm font-bold box-decoration-clone shadow-[0_0_8px_rgba(254,240,138,0.6)]">
                    {exp.quoteHighlight}
                  </mark>
                  {exp.quotePost}”
                </p>
              </div>

              {/* Mini foto del alumno pegada con cinta, entre el comentario y las notas */}
              <div className="relative z-10 flex-1 flex items-center justify-center pl-10 sm:pl-12 min-h-[100px]">
                <div className="relative bg-white p-1.5 pb-4 shadow-[0_6px_14px_rgba(60,40,10,0.28)] rotate-[3deg] border border-black/5">
                  <span
                    aria-hidden="true"
                    className="absolute -top-2 left-1/2 -translate-x-1/2 w-10 h-3.5 bg-[#fdef8a]/85 -rotate-3 shadow-sm"
                  />
                  <Image
                    src={exp.foto}
                    alt={`Foto de ${exp.nombre}`}
                    width={300}
                    height={300}
                    className="w-32 h-32 sm:w-40 sm:h-40 lg:w-44 lg:h-44 object-cover object-top"
                  />
                </div>
              </div>

              {/* Calificaciones y Sello: Primer parcial -> Nota final (en verde con círculo centrado) y Sello con Preparación */}
              <div className="relative z-10 pl-10 sm:pl-12 flex items-center justify-between mt-auto pt-4 sm:pt-6 pb-6 sm:pb-8">
                {/* Lado izquierdo: Notas con progreso */}
                <div className="flex items-center gap-3">
                  <div
                    className="text-4xl sm:text-5xl font-extrabold text-[#c8321e] leading-none text-center"
                    style={{ fontFamily: "var(--font-caveat), Caveat, cursive" }}
                  >
                    {exp.primerParcial}
                    <small className="block font-sans font-medium text-xs text-[#5b5649] tracking-normal mt-0.5">
                      Primer parcial
                    </small>
                  </div>

                  <span className="text-xl sm:text-2xl text-[#5b5649] px-1 font-bold select-none">→</span>

                  {/* Círculo verde con el número y 'Nota final' perfectamente centrados */}
                  <div className="w-[72px] h-[72px] sm:w-[80px] sm:h-[80px] rounded-full border-2 border-[#16a34a] flex flex-col items-center justify-center -rotate-6 shadow-sm text-center">
                    <span
                      className="text-3xl sm:text-4xl font-extrabold text-[#16a34a] leading-none"
                      style={{ fontFamily: "var(--font-caveat), Caveat, cursive" }}
                    >
                      {exp.notaFinal}
                    </span>
                    <span className="font-sans font-bold text-[9px] sm:text-[10px] text-[#16a34a] uppercase tracking-wider leading-none mt-0.5">
                      Nota final
                    </span>
                  </div>
                </div>

                {/* Lado derecho: Sello 'Promocionó' y justo debajo 'Preparación {semanas}' */}
                <div className="flex flex-col items-center sm:items-end justify-center pr-1 sm:pr-3">
                  <div
                    ref={(el) => {
                      stampRefs.current[idx] = el;
                    }}
                    className="border-4 border-[#c8321e] text-[#c8321e] rounded-lg px-3 sm:px-3.5 py-0.5 text-xl sm:text-2xl lg:text-3xl font-extrabold -rotate-12 tracking-wide bg-[#fffdf6]/90 shadow-md pointer-events-none origin-center"
                    style={{ fontFamily: "var(--font-caveat), Caveat, cursive" }}
                  >
                    Promocionó
                  </div>
                  <div className="text-center sm:text-right text-xs sm:text-sm text-[#5b5649] font-medium mt-1.5">
                    <span className="block text-[10px] sm:text-[11px] opacity-75 uppercase tracking-wider">Preparación</span>
                    <b className="block text-[#1b1a17] font-bold text-xs sm:text-sm leading-tight">{exp.semanas}</b>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
