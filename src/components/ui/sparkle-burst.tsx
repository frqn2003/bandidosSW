'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

interface SparkleBurstProps {
  active?: boolean;
  count?: number;
  onComplete?: () => void;
}

// Paleta de partículas de alto impacto y contraste sobre Post-its pastel
const PARTICLE_COLORS = [
  '#0047FF', // Azul Eléctrico
  '#F59E0B', // Oro cálido
  '#EF4444', // Coral carmesí
  '#10B981', // Esmeralda vivo
  '#8B5CF6', // Violeta intenso
  '#18181B', // Tinta profunda
  '#FFFFFF', // Destello blanco
];

export default function SparkleBurst({ active = true, count = 36, onComplete }: SparkleBurstProps) {
  const [visible, setVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const ring1Ref = useRef<HTMLDivElement>(null);
  const ring2Ref = useRef<HTMLDivElement>(null);
  const flareRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!active || !containerRef.current) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        onComplete: () => {
          setVisible(false);
          if (onComplete) onComplete();
        }
      });

      // 1. Doble anillo de choque expansivo (Shockwave Rings)
      if (ring1Ref.current) {
        tl.fromTo(
          ring1Ref.current,
          { scale: 0.15, opacity: 1 },
          { scale: 3.4, opacity: 0, duration: 0.65, ease: 'power2.out' },
          0
        );
      }

      if (ring2Ref.current) {
        tl.fromTo(
          ring2Ref.current,
          { scale: 0.1, opacity: 0.85 },
          { scale: 2.6, opacity: 0, duration: 0.55, ease: 'power3.out' },
          0.04
        );
      }

      // 2. Destello central en forma de estrella de 4 puntas (Star Flare)
      if (flareRef.current) {
        tl.fromTo(
          flareRef.current,
          { scale: 0.2, rotation: 0, opacity: 1 },
          { scale: 1.8, rotation: 45, opacity: 0.9, duration: 0.15, ease: 'power2.out' },
          0
        ).to(
          flareRef.current,
          { scale: 0, rotation: 90, opacity: 0, duration: 0.25, ease: 'power3.in' },
          0.15
        );
      }

      // 3. Explosión radial física de partículas (Confeti, chispas circulares y rombos)
      const particleElements = containerRef.current?.querySelectorAll<HTMLElement>('.burst-particle');
      if (particleElements && particleElements.length > 0) {
        particleElements.forEach((el, i) => {
          // Ángulo uniforme con dispersión orgánica
          const baseAngle = (i / count) * Math.PI * 2;
          const jitter = (Math.random() - 0.5) * 0.45;
          const angle = baseAngle + jitter;

          // Distancia de explosión radial (35px a 95px)
          const distance = 35 + Math.random() * 65;
          const destX = Math.cos(angle) * distance;
          const destY = Math.sin(angle) * distance;

          // Impulso inicial explosivo hacia arriba (anti-gravedad) y caída posterior
          const upwardJump = -20 - Math.random() * 30;
          const gravityFall = 35 + Math.random() * 55;

          // Timeline individual para cada partícula dentro del timeline maestro
          tl.fromTo(
            el,
            {
              x: 0,
              y: 0,
              scale: 0.3,
              opacity: 1,
              rotation: 0,
              rotationX: 0,
              rotationY: 0,
            },
            {
              x: destX,
              y: destY + upwardJump,
              scale: 1 + Math.random() * 0.4,
              opacity: 1,
              rotation: Math.random() * 360 - 180,
              rotationX: Math.random() * 360,
              rotationY: Math.random() * 360,
              duration: 0.22,
              ease: 'power3.out',
            },
            Math.random() * 0.04
          ).to(
            el,
            {
              x: destX * 1.18,
              y: destY + upwardJump + gravityFall,
              scale: 0.1,
              opacity: 0,
              rotation: `+=${Math.random() * 280 - 140}`,
              duration: 0.55 + Math.random() * 0.2,
              ease: 'power2.in',
            },
            '>-0.05'
          );
        });
      }
    }, containerRef);

    // Timeout de seguridad para limpiar y desmontar completamente la explosión
    const timer = setTimeout(() => {
      setVisible(false);
    }, 750);

    return () => {
      clearTimeout(timer);
      ctx.revert();
    };
  }, [active, count, onComplete]);

  if (!active || !visible) return null;

  // Generar datos estables para las partículas
  const particles = Array.from({ length: count }, (_, i) => {
    const color = PARTICLE_COLORS[i % PARTICLE_COLORS.length];
    const isConfetti = i % 3 === 0;
    const isDiamond = i % 5 === 0;
    const size = isConfetti ? 8 : isDiamond ? 7 : 5 + (i % 4);

    return {
      id: i,
      color,
      isConfetti,
      isDiamond,
      size,
    };
  });

  return (
    <div
      ref={containerRef}
      className="absolute left-1/2 bottom-[0.25em] -translate-x-1/2 w-0 h-0 pointer-events-none overflow-visible z-40 select-none"
    >
      {/* Anillo de onda expansiva 1: Azul Eléctrico institucional */}
      <div
        ref={ring1Ref}
        className="opacity-0 absolute -top-4 -left-4 w-8 h-8 rounded-full border-2 border-[#0047FF] shadow-[0_0_14px_rgba(0,71,255,0.7)] pointer-events-none"
      />

      {/* Anillo de onda expansiva 2: Halo dorado / tinta suave */}
      <div
        ref={ring2Ref}
        className="opacity-0 absolute -top-3 -left-3 w-6 h-6 rounded-full border border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.6)] pointer-events-none"
      />

      {/* Destello estelar de 4 puntas en el centro del impacto */}
      <svg
        ref={flareRef}
        viewBox="0 0 24 24"
        fill="currentColor"
        className="opacity-0 absolute -top-3.5 -left-3.5 w-7 h-7 text-[#0047FF] drop-shadow-[0_0_8px_rgba(0,71,255,0.9)] pointer-events-none"
      >
        <path d="M12 0L14.2 9.8L24 12L14.2 14.2L12 24L9.8 14.2L0 12L9.8 9.8L12 0Z" />
      </svg>

      {/* Chispas y confeti multidimensional */}
      {particles.map((p) => {
        let shapeClass = 'rounded-full';
        let styleObj: React.CSSProperties = {
          backgroundColor: p.color,
          width: `${p.size}px`,
          height: `${p.size}px`,
          boxShadow: `0 0 6px ${p.color}`,
        };

        if (p.isConfetti) {
          shapeClass = 'rounded-[1px]';
          styleObj = {
            backgroundColor: p.color,
            width: `${p.size}px`,
            height: `${Math.round(p.size * 0.5)}px`,
            boxShadow: `0 0 4px ${p.color}`,
          };
        } else if (p.isDiamond) {
          shapeClass = 'rotate-45 rounded-[0.5px]';
          styleObj = {
            backgroundColor: p.color,
            width: `${p.size}px`,
            height: `${p.size}px`,
            boxShadow: `0 0 6px ${p.color}`,
          };
        }

        return (
          <span
            key={p.id}
            className={`burst-particle opacity-0 absolute -top-1 -left-1 block pointer-events-none ${shapeClass}`}
            style={styleObj}
          />
        );
      })}
    </div>
  );
}
