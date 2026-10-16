"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface LiveOrbProps {
  size?: number;
  className?: string;
}

export default function LiveOrb({
  size = 60,
  className,
}: LiveOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const centerPosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const updateCenter = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      centerPosRef.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    };

    updateCenter();
    window.addEventListener("resize", updateCenter, { passive: true });
    window.addEventListener("scroll", updateCenter, { passive: true });

    const handleMouseMove = (e: MouseEvent) => {
      const centerX = centerPosRef.current.x;
      const centerY = centerPosRef.current.y;

      // Cálculo angular directo sin forzar reflow en el DOM
      const rawDx = e.clientX - centerX;
      const rawDy = e.clientY - centerY;
      const dist = Math.sqrt(rawDx * rawDx + rawDy * rawDy);

      if (dist === 0) {
        mouseRef.current = { x: 0, y: 0 };
        return;
      }

      // Proyección circular suave para que no se deforme
      const maxDistance = Math.min(window.innerWidth, window.innerHeight) * 0.4;
      const intensity = Math.min(1, dist / maxDistance);
      const angle = Math.atan2(rawDy, rawDx);

      mouseRef.current = {
        x: Math.cos(angle) * intensity,
        y: Math.sin(angle) * intensity,
      };
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener("resize", updateCenter);
      window.removeEventListener("scroll", updateCenter);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let currentEyeX = 0;
    let currentEyeY = 0;
    let blinkProgress = 0;
    let isBlinking = false;
    let lastBlinkTime = performance.now();

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const render = (time: number) => {
      ctx.clearRect(0, 0, size, size);

      // Parpadeo suave ocasional cada 4-6 segundos
      if (!isBlinking && time - lastBlinkTime > 4000) {
        if (Math.random() < 0.03) {
          isBlinking = true;
          lastBlinkTime = time;
        }
      }

      if (isBlinking) {
        blinkProgress += 0.25;
        if (blinkProgress >= Math.PI) {
          blinkProgress = 0;
          isBlinking = false;
          lastBlinkTime = time;
        }
      }

      const blinkScaleY = isBlinking ? Math.max(0.1, Math.cos(blinkProgress)) : 1;

      // Lectura continua y sin reseteos desde mouseRef
      const targetX = mouseRef.current.x * 10;
      const targetY = mouseRef.current.y * 9;

      // Suavizado rápido y constante hacia el cursor
      currentEyeX += (targetX - currentEyeX) * 0.25;
      currentEyeY += (targetY - currentEyeY) * 0.25;

      const centerX = size / 2;
      const centerY = size / 2;
      const radius = size * 0.44;

      // ── 1. Cuerpo de la Esfera: Blanco Liso Total ──
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      // Borde suave
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
      ctx.stroke();
      ctx.restore();

      // ── 2. Ojos Cápsula Oscuros (Negro/Gris Profundo) ──
      const eyeSpacing = radius * 0.42;
      const eyeWidth = size * 0.09;
      const eyeHeight = size * 0.2 * blinkScaleY;
      const eyeCenterY = centerY - radius * 0.05 + currentEyeY;

      const drawEye = (x: number) => {
        ctx.save();
        ctx.fillStyle = "#0f172a"; // Negro grafito

        ctx.beginPath();
        ctx.roundRect(
          x - eyeWidth / 2,
          eyeCenterY - eyeHeight / 2,
          eyeWidth,
          eyeHeight,
          eyeWidth / 2
        );
        ctx.fill();

        // Destello especular blanco en cada ojo
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(x, eyeCenterY - eyeHeight * 0.25, eyeWidth * 0.32, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      };

      // Dibujar ojo izquierdo y derecho
      drawEye(centerX - eyeSpacing + currentEyeX);
      drawEye(centerX + eyeSpacing + currentEyeX);

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [size]);

  return (
    <div
      className={cn("relative flex items-center justify-center select-none", className)}
      style={{ width: size, height: size }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className="pointer-events-none"
      />
    </div>
  );
}
