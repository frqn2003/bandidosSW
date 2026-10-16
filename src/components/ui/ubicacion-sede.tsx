"use client";

import React, { useEffect, useRef, useState } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

// BACKEND: datos de la sede y horarios → GET /api/sede (dirección, teléfonos, horarios por día)
const SEDE = {
  direccion: "Caseros 468, A4400 Salta",
  detalle: "Planta baja y 1.º piso · Entrada por la calle lateral.",
  telefono: "+54 387 431 2345",
  telefonoHref: "tel:+543874312345",
  whatsapp: "+54 9 387 555 1234",
  whatsappHref: "https://wa.me/549387555123?text=Hola%20Nexo%20Acad%C3%A9mico%2C%20quiero%20hacer%20una%20consulta",
  email: "hola@nexoacademico.com",
  mapsHref: "https://www.google.com/maps/search/?api=1&query=Caseros+468+Salta+Argentina"
};

// Horario por día de la semana (0 = domingo). null = cerrado.
const HORARIOS: Record<number, [number, number] | null> = {
  1: [8, 21],
  2: [8, 21],
  3: [8, 21],
  4: [8, 21],
  5: [8, 21],
  6: [9, 13],
  0: null
};

const FILAS_HORARIO = [
  { dias: [1, 2, 3, 4, 5], label: "Lun a Vie", horas: "8 a 21 h" },
  { dias: [6], label: "Sábado", horas: "9 a 13 h" },
  { dias: [0], label: "Domingo", horas: "Cerrado" }
];

const ROTACIONES = [-1.5, 1.5, -1, 1.2];

export default function UbicacionSede() {
  const containerRef = useRef<HTMLElement>(null);
  const [hoy, setHoy] = useState<number | null>(null);
  const [abierto, setAbierto] = useState<boolean | null>(null);
  const [copiado, setCopiado] = useState(false);

  // Estado "abierto ahora" según la hora del visitante (solo cliente, evita desajuste de hidratación)
  useEffect(() => {
    const ahora = new Date();
    const dia = ahora.getDay();
    const hora = ahora.getHours() + ahora.getMinutes() / 60;
    const tramo = HORARIOS[dia];
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHoy(dia);
    setAbierto(!!tramo && hora >= tramo[0] && hora < tramo[1]);
  }, []);

  const copiarDireccion = async () => {
    try {
      await navigator.clipboard.writeText(SEDE.direccion);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sin permiso de portapapeles: no hacemos nada
    }
  };

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      const root = containerRef.current;
      if (!root) return;

      const calles = gsap.utils.toArray<SVGPathElement>(".calle", root);
      const ruta = root.querySelector<SVGPathElement>("#ubi-ruta");
      const notas = gsap.utils.toArray<HTMLElement>(".ubi-nota", root);
      if (!ruta) return;

      calles.forEach((p) => {
        const l = p.getTotalLength();
        gsap.set(p, { strokeDasharray: l, strokeDashoffset: l });
      });
      const rl = ruta.getTotalLength();
      gsap.set(ruta, { strokeDasharray: "1 11", opacity: 0 });
      gsap.set(["#ubi-pin", "#ubi-sombra", ".ubi-ring", "#ubi-plaza"], { opacity: 0 });
      gsap.set(notas, { rotation: (i: number) => ROTACIONES[i % ROTACIONES.length] });

      const tl = gsap.timeline({
        scrollTrigger: { trigger: "#ubi-plano", start: "top 75%", once: true },
        defaults: { ease: "power3.out" }
      });

      tl.from("#ubi-plano", { y: 80, rotation: 3, opacity: 0, duration: 0.9 })
        .to("#ubi-plaza", { opacity: 1, duration: 0.6 }, 0.3)
        .to(calles, { strokeDashoffset: 0, duration: 0.9, stagger: 0.08, ease: "power2.inOut" }, 0.3)
        .to(ruta, { opacity: 1, duration: 0.1 }, 1.3)
        .fromTo(ruta, { strokeDashoffset: rl }, { strokeDashoffset: 0, duration: 1.1, ease: "power1.inOut" }, 1.3)
        .fromTo("#ubi-pin", { y: -260, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: "bounce.out" }, 2.2)
        .fromTo("#ubi-sombra", { opacity: 0, scale: 0.3, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, duration: 0.5 }, 2.7)
        .add(() => {
          gsap.fromTo(".ubi-ring", { opacity: 0.7, scale: 1 }, { opacity: 0, scale: 4.5, duration: 2, repeat: -1, ease: "power1.out" });
        }, 3.1)
        .fromTo(
          notas,
          { y: 50, opacity: 0, rotation: (i: number) => ROTACIONES[i % ROTACIONES.length] + 7 },
          {
            y: 0,
            opacity: 1,
            rotation: (i: number) => ROTACIONES[i % ROTACIONES.length],
            duration: 0.7,
            stagger: 0.14,
            ease: "back.out(1.5)"
          },
          0.5
        );

      // Título: entrada al llegar a la sección
      gsap.from("#t-ubi", {
        y: 50,
        opacity: 0,
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: { trigger: "#t-ubi", start: "top 88%", once: true }
      });

      // Pestaña "Mapa", texto y botón debajo del mapa
      gsap.from(".ubi-tab", {
        y: 20,
        opacity: 0,
        duration: 0.6,
        ease: "back.out(2)",
        scrollTrigger: { trigger: "#ubi-plano", start: "top 75%", once: true },
        delay: 0.5
      });
      gsap.from(".ubi-cta > *", {
        y: 30,
        opacity: 0,
        duration: 0.7,
        stagger: 0.15,
        ease: "power3.out",
        scrollTrigger: { trigger: ".ubi-cta", start: "top 92%", once: true }
      });

      // Pin: flotación suave una vez que cayó
      tl.add(() => {
        gsap.to("#ubi-pin", { y: -6, duration: 1.2, ease: "sine.inOut", repeat: -1, yoyo: true });
      }, 3.4);

      // Parallax suave del mapa mientras se scrollea la sección
      gsap.fromTo(
        "#ubi-plano",
        { yPercent: 2 },
        {
          yPercent: -2,
          ease: "none",
          scrollTrigger: { trigger: root, start: "top bottom", end: "bottom top", scrub: 0.8 }
        }
      );
    },
    { scope: containerRef }
  );

  // Hover en las notas: se enderezan y se levantan
  const notaHover = (e: React.PointerEvent<HTMLElement>, activa: boolean) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = (e.target as HTMLElement).closest<HTMLElement>(".ubi-nota");
    if (!el) return;
    if (!activa && el.contains(e.relatedTarget as Node | null)) return;
    const todas = Array.from(el.parentElement?.querySelectorAll(".ubi-nota") ?? []);
    const i = Math.max(0, todas.indexOf(el));
    gsap.to(el, {
      rotation: activa ? 0 : ROTACIONES[i % ROTACIONES.length],
      y: activa ? -8 : 0,
      scale: activa ? 1.03 : 1,
      duration: 0.3,
      ease: "power2.out",
      overwrite: "auto"
    });
  };


  const caveat = { fontFamily: "var(--font-caveat), Caveat, cursive" } as const;
  const tapeNota =
    "before:content-[''] before:absolute before:-top-2.5 before:left-1/2 before:-ml-8 before:w-16 before:h-5 before:bg-white/60 before:-rotate-2";

  return (
    <section
      ref={containerRef}
      id="ubicacion"
      aria-labelledby="t-ubi"
      className="relative overflow-hidden bg-[#101012] text-white px-5 sm:px-10 lg:px-16 py-16 sm:py-24 lg:py-28 scroll-mt-6"
      style={{
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)
        `,
        backgroundSize: "34px 34px"
      }}
    >
      <div className="max-w-[1200px] mx-auto">
        <div className="mb-14">
          <h2
            id="t-ubi"
            className="m-0 text-[clamp(2.4rem,5.6vw,4.8rem)] leading-[0.98] tracking-[-0.04em] font-extrabold max-w-[12ch]"
          >
            Vení a conocernos
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_1fr] gap-10 lg:gap-14 items-start">
          {/* Mapa + texto y botón debajo */}
          <div>
          <figure
            id="ubi-plano"
            className="relative m-0 mt-9 lg:mt-0 p-3.5 rounded-md shadow-[0_30px_60px_rgba(0,0,0,0.55)] before:content-[''] before:absolute before:-top-[13px] before:left-1/2 before:-ml-[50px] before:w-[100px] before:h-6 before:bg-[#fdef8a]/85 before:-rotate-2 before:z-[2]"
            style={{ background: "linear-gradient(160deg,#ecd9b2,#dcc392)" }}
          >
            <span
              className="ubi-tab absolute -top-9 left-[18px] bg-[#ecd9b2] text-[#1b1a17] px-5 pt-1 h-[38px] rounded-t-[14px] text-2xl leading-normal font-bold"
              style={caveat}
            >
              Mapa
            </span>
            <svg
              viewBox="0 0 600 440"
              role="img"
              aria-label="Plano con la sede a media cuadra de la Plaza 9 de Julio"
              className="block w-full h-auto rounded-[3px]"
            >
              <rect width="600" height="440" fill="#e6d3ab" />

              {/* Calles secundarias */}
              <path className="calle" d="M0 140 H600" stroke="rgba(255,253,246,.45)" strokeWidth="10" strokeLinecap="round" fill="none" />
              <path className="calle" d="M0 260 H600" stroke="rgba(255,253,246,.45)" strokeWidth="10" strokeLinecap="round" fill="none" />
              <path className="calle" d="M40 0 V440" stroke="rgba(255,253,246,.45)" strokeWidth="10" strokeLinecap="round" fill="none" />
              <path className="calle" d="M520 0 V440" stroke="rgba(255,253,246,.45)" strokeWidth="10" strokeLinecap="round" fill="none" />

              {/* Calles principales */}
              <path className="calle" d="M0 60 H600" stroke="#b0a89e" strokeWidth="18" strokeLinecap="round" fill="none" />
              <path className="calle" d="M0 320 H460" stroke="#b0a89e" strokeWidth="18" strokeLinecap="round" fill="none" />
              <path className="calle" d="M100 0 V440" stroke="#b0a89e" strokeWidth="18" strokeLinecap="round" fill="none" />
              <path className="calle" d="M380 0 V440" stroke="#b0a89e" strokeWidth="18" strokeLinecap="round" fill="none" />
              <path className="calle" d="M480 0 V440" stroke="#b0a89e" strokeWidth="18" strokeLinecap="round" fill="none" />

              {/* Plaza 9 de Julio */}
              <g id="ubi-plaza">
                <rect x="140" y="80" width="200" height="200" rx="8" fill="#b8f3cf" stroke="#9dcdb0" strokeWidth="2" />
                <circle cx="240" cy="180" r="50" fill="none" stroke="#fffdf6" strokeWidth="4" opacity="0.6" />
                <circle cx="240" cy="180" r="20" fill="none" stroke="#fffdf6" strokeWidth="4" opacity="0.6" />
                <path d="M140 80 L340 280" stroke="#fffdf6" strokeWidth="4" opacity="0.6" />
                <path d="M340 80 L140 280" stroke="#fffdf6" strokeWidth="4" opacity="0.6" />
                <path d="M240 80 L240 280" stroke="#fffdf6" strokeWidth="4" opacity="0.6" />
                <path d="M140 180 L340 180" stroke="#fffdf6" strokeWidth="4" opacity="0.6" />
                <text x="240" y="145" textAnchor="middle" fontSize="22" fill="#3d6b52" fontWeight="700" style={caveat}>
                  Plaza 9 de Julio
                </text>
              </g>

              {/* Etiquetas de calles */}
              <text x="300" y="50" textAnchor="middle" fontSize="18" fill="#5b5649" fontWeight="700" style={caveat}>España</text>
              <text x="230" y="338" textAnchor="middle" fontSize="18" fill="#5b5649" fontWeight="700" style={caveat}>Caseros</text>
              <text x="88" y="220" textAnchor="middle" fontSize="18" fill="#5b5649" fontWeight="700" transform="rotate(-90 88 220)" style={caveat}>Bartolomé Mitre</text>
              <text x="392" y="220" textAnchor="middle" fontSize="18" fill="#5b5649" fontWeight="700" transform="rotate(90 392 220)" style={caveat}>Zuviría</text>
              <text x="492" y="220" textAnchor="middle" fontSize="18" fill="#5b5649" fontWeight="700" transform="rotate(-90 492 220)" style={caveat}>Buenos Aires</text>
              <text x="560" y="40" fontSize="22" fill="#5b5649" textAnchor="middle" fontWeight="700" style={caveat}>N ↑</text>

              {/* Ruta desde la plaza hasta la sede */}
              <path id="ubi-ruta" d="M240 180 L430 300" fill="none" stroke="#3b82f6" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 11" />

              {/* Marcador de la sede */}
              <g transform="translate(430 300)">
                <ellipse id="ubi-sombra" cx="0" cy="2" rx="12" ry="4" fill="rgba(0,0,0,.25)" />
                <circle className="ubi-ring" cx="0" cy="0" r="8" fill="none" stroke="#3b82f6" strokeWidth="3" style={{ transformBox: "fill-box", transformOrigin: "center" }} />
                <g id="ubi-pin">
                  <path d="M0 0C-4-10-17-22-17-37a17 17 0 1 1 34 0C17-22 4-10 0 0Z" fill="#1b1a17" />
                  <circle cx="0" cy="-37" r="10" fill="#fff" />
                  <g stroke="#1b1a17" strokeWidth="1.6" strokeLinecap="round">
                    <path d="M0-37L-5-42M0-37L5-42M0-37L-5-32M0-37L5-32" />
                  </g>
                  <g fill="#1b1a17">
                    <circle cx="-5" cy="-42" r="1.8" />
                    <circle cx="5" cy="-42" r="1.8" />
                    <circle cx="-5" cy="-32" r="1.8" />
                    <circle cx="5" cy="-32" r="1.8" />
                    <circle cx="0" cy="-37" r="2.4" />
                  </g>
                </g>
              </g>
            </svg>
          </figure>

          <div className="ubi-cta mt-8 flex flex-col items-start gap-4">
            <p className="m-0 text-[#a3a3ad] leading-relaxed max-w-[44ch]">
              Estamos a media cuadra de la Plaza 9 de Julio, en pleno centro de Salta.
            </p>
            <a
              href={SEDE.mapsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white text-[#101012] rounded-full px-6 py-3 font-bold no-underline transition-transform hover:-translate-y-0.5 focus-visible:outline-3 focus-visible:outline-[#fdef8a] focus-visible:outline-offset-3"
            >
              Abrir en Google Maps ↗
            </a>
          </div>
          </div>

          {/* Notas adhesivas */}
          <div
            onPointerOver={(e) => notaHover(e, true)}
            onPointerOut={(e) => notaHover(e, false)}
            className="grid grid-cols-1 min-[481px]:grid-cols-2 gap-x-5 gap-y-6"
          >
            <article className={`ubi-nota relative col-span-full bg-[#fdef8a] text-[#1b1a17] rounded p-5 shadow-[0_14px_30px_rgba(0,0,0,0.45)] ${tapeNota}`}>
              <h3 className="m-0 mb-2 text-[1.6rem] font-bold" style={caveat}>Dirección</h3>
              <strong className="block text-[1.45rem] tracking-[-0.025em] leading-[1.15] mb-1">{SEDE.direccion}</strong>
              <p className="m-0 text-[0.92rem] leading-normal">{SEDE.detalle}</p>
              <button
                type="button"
                onClick={copiarDireccion}
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold border-b-2 border-current cursor-pointer bg-transparent p-0 focus-visible:outline-3 focus-visible:outline-[#101012] focus-visible:outline-offset-3"
              >
                {copiado ? "¡Dirección copiada!" : "Copiar dirección"}
              </button>
            </article>

            <article className={`ubi-nota relative bg-[#fffdf6] text-[#1b1a17] rounded p-5 shadow-[0_14px_30px_rgba(0,0,0,0.45)] ${tapeNota}`}>
              <h3 className="m-0 mb-2 text-[1.6rem] font-bold" style={caveat}>Horarios</h3>
              <span className="inline-flex items-center gap-1.5 text-[0.78rem] font-bold mb-3 bg-[#1b1a17] text-white px-2.5 py-0.5 rounded-full">
                <i
                  aria-hidden="true"
                  className={`w-2 h-2 rounded-full ${abierto ? "bg-[#3ddc84]" : "bg-[#888]"}`}
                />
                <span>{abierto === null ? "Consultando…" : abierto ? "Abierto ahora" : "Cerrado ahora"}</span>
              </span>
              <ul className="list-none m-0 p-0 grid gap-1.5">
                {FILAS_HORARIO.map((f) => {
                  const esHoy = hoy !== null && f.dias.includes(hoy);
                  return (
                    <li key={f.label} className="flex justify-between gap-2.5 text-[0.88rem]">
                      <b className={esHoy ? "bg-[linear-gradient(transparent_60%,#fdef8a_60%)]" : ""}>{f.label}</b>
                      <span>{f.horas}</span>
                    </li>
                  );
                })}
              </ul>
            </article>

            <article className={`ubi-nota relative bg-[#b9e3fb] text-[#1b1a17] rounded p-5 shadow-[0_14px_30px_rgba(0,0,0,0.45)] ${tapeNota}`}>
              <h3 className="m-0 mb-2 text-[1.6rem] font-bold" style={caveat}>Contacto</h3>
              <ul className="list-none m-0 p-0 grid gap-1.5 text-[0.92rem] leading-normal">
                <li>
                  <a className="font-bold no-underline border-b-2 border-current" href={SEDE.telefonoHref}>{SEDE.telefono}</a>
                </li>
                <li>
                  <a className="font-bold no-underline border-b-2 border-current" href={SEDE.whatsappHref} target="_blank" rel="noopener noreferrer">
                    WhatsApp: {SEDE.whatsapp}
                  </a>
                </li>
                <li>
                  <a className="font-bold no-underline border-b-2 border-current break-all" href={`mailto:${SEDE.email}`}>{SEDE.email}</a>
                </li>
              </ul>
            </article>

            <article className={`ubi-nota relative col-span-full bg-[#b8f3cf] text-[#1b1a17] rounded p-5 shadow-[0_14px_30px_rgba(0,0,0,0.45)] ${tapeNota}`}>
              <h3 className="m-0 mb-2 text-[1.6rem] font-bold" style={caveat}>Cómo llegar</h3>
              <p className="m-0 text-[0.92rem] leading-normal">
                Caminá media cuadra desde la Plaza 9 de Julio. Líneas de colectivo 3, 5 y 12 con parada en la puerta. Hay bicicletero y estacionamiento cercano.
              </p>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
