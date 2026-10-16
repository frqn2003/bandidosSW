'use client';

import React, { useRef, useEffect, useCallback } from 'react';

interface TiltImageCardProps {
  children: React.ReactNode;
  className?: string;
  maxRotateX?: number;
  maxRotateY?: number;
}

export default function TiltImageCard({
  children,
  className = '',
  maxRotateX = 14,
  maxRotateY = 16
}: TiltImageCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Estados mutables para el loop de animación rAF
  const stateRef = useRef({
    targetX: 0.5,
    targetY: 0.5,
    currentX: 0.9, // Arranca en esquina para animación inicial
    currentY: 0.1,
    tau: 0.35, // tau inicial para la transición de entrada (~1.2s)
    isHovered: false,
    hasEntered: false,
    rafId: 0,
    lastTime: 0
  });

  const updateCssVars = useCallback((x: number, y: number) => {
    const el = containerRef.current;
    if (!el) return;

    // x, y están normalizados entre 0 y 1
    const xPercent = (x * 100).toFixed(2);
    const yPercent = (y * 100).toFixed(2);

    const fromLeft = x.toFixed(4);
    const fromTop = y.toFixed(4);

    const dx = x - 0.5; // -0.5 a 0.5
    const dy = y - 0.5;

    const fromCenter = Math.min(1, Math.hypot(dx, dy) * 2).toFixed(4);

    // Rotación 3D: inclinar hacia el cursor
    // Si el cursor va arriba (dy < 0), rotateX positivo eleva la base y baja el tope
    const rotX = (-dy * maxRotateX * 2).toFixed(2);
    const rotY = (dx * maxRotateY * 2).toFixed(2);

    el.style.setProperty('--pointer-x', `${xPercent}%`);
    el.style.setProperty('--pointer-y', `${yPercent}%`);
    el.style.setProperty('--pointer-from-center', fromCenter);
    el.style.setProperty('--pointer-from-left', fromLeft);
    el.style.setProperty('--pointer-from-top', fromTop);
    el.style.setProperty('--background-x', `${xPercent}%`);
    el.style.setProperty('--background-y', `${yPercent}%`);
    el.style.setProperty('--rotate-x', `${rotX}deg`);
    el.style.setProperty('--rotate-y', `${rotY}deg`);
  }, [maxRotateX, maxRotateY]);

  const startAnimationLoop = useCallback(() => {
    if (stateRef.current.rafId) return;

    stateRef.current.lastTime = performance.now();

    const loop = (time: number) => {
      const state = stateRef.current;
      const dt = Math.min((time - state.lastTime) / 1000, 0.1);
      state.lastTime = time;

      // Interpolación exponencial: 1 - exp(-dt / tau)
      const k = 1 - Math.exp(-dt / state.tau);
      state.currentX += (state.targetX - state.currentX) * k;
      state.currentY += (state.targetY - state.currentY) * k;

      updateCssVars(state.currentX, state.currentY);

      const diff = Math.hypot(state.targetX - state.currentX, state.targetY - state.currentY);

      // Si no hay hover y la animación convergió al centro, frenamos rAF para no consumir recursos
      if (!state.isHovered && diff < 0.0005 && state.hasEntered) {
        state.currentX = state.targetX;
        state.currentY = state.targetY;
        updateCssVars(state.currentX, state.currentY);
        state.rafId = 0;
        return;
      }

      state.rafId = requestAnimationFrame(loop);
    };

    stateRef.current.rafId = requestAnimationFrame(loop);
  }, [updateCssVars]);

  // Manejo de eventos de puntero
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    const state = stateRef.current;
    state.targetX = Math.max(0, Math.min(1, x));
    state.targetY = Math.max(0, Math.min(1, y));
    state.tau = 0.14; // tau ≈ 0.14 s para seguimiento suave
    state.isHovered = true;
    state.hasEntered = true;

    startAnimationLoop();
  };

  const handlePointerEnter = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    stateRef.current.isHovered = true;
    stateRef.current.tau = 0.14;
    startAnimationLoop();
  };

  const handlePointerLeave = () => {
    const state = stateRef.current;
    state.isHovered = false;
    state.targetX = 0.5;
    state.targetY = 0.5;
    state.tau = 0.22; // retorno suave al centro
    startAnimationLoop();
  };

  // Animación inicial al entrar en viewport (~1.2s desde esquina hacia el centro)
  useEffect(() => {
    const node = containerRef.current;
    const state = stateRef.current;
    if (!node) return;

    let timer: NodeJS.Timeout;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          // Arranca en una esquina (currentX = 0.9, currentY = 0.1) y viaja al centro (0.5, 0.5)
          state.targetX = 0.5;
          state.targetY = 0.5;
          state.tau = 0.38; // En ~1.2s (3 * tau) converge al centro
          startAnimationLoop();

          timer = setTimeout(() => {
            state.hasEntered = true;
          }, 1200);

          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
      clearTimeout(timer);
      if (state.rafId) {
        cancelAnimationFrame(state.rafId);
      }
    };
  }, [startAnimationLoop]);

  return (
    <div
      ref={containerRef}
      onPointerEnter={handlePointerEnter}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={`relative [perspective:500px] select-none ${className}`}
      style={
        {
          '--pointer-x': '50%',
          '--pointer-y': '50%',
          '--pointer-from-center': '0',
          '--pointer-from-left': '0.5',
          '--pointer-from-top': '0.5',
          '--background-x': '50%',
          '--background-y': '50%',
          '--rotate-x': '0deg',
          '--rotate-y': '0deg'
        } as React.CSSProperties
      }
    >
      <div
        ref={cardRef}
        className="w-full h-full [transform-style:preserve-3d] will-change-transform"
        style={{
          transform: 'rotateX(var(--rotate-x)) rotateY(var(--rotate-y))'
        }}
      >
        {children}
      </div>
    </div>
  );
}
