'use client';

import { useEffect, useState } from 'react';

interface Particle {
  id: number;
  tx: number;        // Desplazamiento horizontal (-45px a +45px)
  tyPeak: number;    // Salto hacia arriba en el pico inicial (-20px a -55px)
  tyFall: number;    // Caída final hacia abajo (+25px a +60px)
  size: number;      // Diámetro de la pelotita (2.5px a 7px)
  opacity: number;   // Opacidad aleatoria (0.35 a 1.0)
  delay: number;     // Micro delay (0 a 0.06s)
  duration: number;  // Duración de la caída (0.6s a 0.85s)
}

interface SparkleBurstProps {
  active?: boolean;
  count?: number;
  onComplete?: () => void;
}

export default function SparkleBurst({ active = true, count = 20, onComplete }: SparkleBurstProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      return;
    }

    const generated: Particle[] = Array.from({ length: count }, (_, i) => {
      // Dispersión horizontal simétrica en abanico
      const angle = (i / count) * Math.PI * 2;
      const spreadX = Math.cos(angle) * (20 + Math.random() * 40);
      
      // Impulso inicial hacia arriba y caída libre hacia abajo
      const tyPeak = -15 - Math.random() * 40;
      const tyFall = 25 + Math.random() * 45;
      
      const size = 2.5 + Math.random() * 4.5; // 2.5px a 7px
      const opacity = 0.35 + Math.random() * 0.65; // 0.35 a 1.0
      const delay = Math.random() * 0.05;
      const duration = 0.65 + Math.random() * 0.2;

      return {
        id: i,
        tx: spreadX,
        tyPeak,
        tyFall,
        size,
        opacity,
        delay,
        duration
      };
    });

    setParticles(generated);
    setVisible(true);

    const timer = setTimeout(() => {
      setVisible(false);
      if (onComplete) onComplete();
    }, 900);

    return () => clearTimeout(timer);
  }, [active, count, onComplete]);

  if (!visible || particles.length === 0) return null;

  return (
    <div className="absolute left-0 right-0 bottom-[0.18em] h-0 pointer-events-none flex items-center justify-center overflow-visible z-30">
      {/* Destello / Onda de choque central blanca (nace en la base del número) */}
      <div
        className="absolute rounded-full border border-white/80 animate-spark-ring"
        style={{
          width: '20px',
          height: '20px',
          boxShadow: '0 0 12px rgba(255,255,255,0.9)'
        }}
      />

      {/* Pelotitas blancas monocromáticas con gravedad */}
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute rounded-full bg-white animate-white-gravity-spark"
          style={{
            width: `${p.size}px`,
            height: `${p.size}px`,
            boxShadow: `0 0 ${Math.max(3, p.size * 1.5)}px rgba(255, 255, 255, ${p.opacity})`,
            // @ts-expect-error Custom CSS variables for gravity animation
            '--tx': `${p.tx.toFixed(1)}px`,
            '--ty-peak': `${p.tyPeak.toFixed(1)}px`,
            '--ty-fall': `${p.tyFall.toFixed(1)}px`,
            '--init-op': p.opacity.toFixed(2),
            animationDuration: `${p.duration.toFixed(2)}s`,
            animationDelay: `${p.delay.toFixed(2)}s`,
          }}
        />
      ))}
    </div>
  );
}
