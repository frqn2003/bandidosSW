"use client";

import React, { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";

export default function NetworkCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = window.innerWidth;
    let H = window.innerHeight;

    const NODE_COUNT = 44;
    const MAX_DIST = 180;
    const LINE_ALPHA = 0.2;
    const BLUE = "59,130,246";
    const DOT_DARK = "22,22,26";
    const DOT_GREY = "120,120,128";

    interface NodeItem {
      x: number;
      y: number;
      r: number;
      baseR: number;
      grey: boolean;
      vx: number;
      vy: number;
      phase: number;
      pulse: number;
    }

    let nodes: NodeItem[] = [];

    function resize() {
      if (!canvas || !ctx) return;
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function makeNodes() {
      nodes = [];
      for (let i = 0; i < NODE_COUNT; i++) {
        const baseR = 1.4 + Math.random() * 2.8;
        nodes.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: baseR,
          baseR,
          grey: Math.random() > 0.5,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,
          phase: Math.random() * Math.PI * 2,
          pulse: 0.6 + Math.random() * 0.8
        });
      }
    }

    function startGsapExtras() {
      nodes.forEach((n) => {
        gsap.to(n, {
          vx: n.vx + (Math.random() - 0.5) * 0.25,
          vy: n.vy + (Math.random() - 0.5) * 0.25,
          duration: 10 + Math.random() * 8,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true
        });
      });
    }

    resize();
    makeNodes();
    startGsapExtras();

    let animId: number;
    let last = performance.now();

    function loop(now: number) {
      if (!ctx) return;
      const dt = Math.min((now - last) / 16.67, 3);
      last = now;

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        n.x += n.vx * dt;
        n.y += n.vy * dt;

        // rebote en bordes
        if (n.x < 0) {
          n.x = 0;
          n.vx *= -1;
        }
        if (n.x > W) {
          n.x = W;
          n.vx *= -1;
        }
        if (n.y < 0) {
          n.y = 0;
          n.vy *= -1;
        }
        if (n.y > H) {
          n.y = H;
          n.vy *= -1;
        }

        // latido del radio
        n.phase += 0.012 * dt;
        n.r = n.baseR * (1 + Math.sin(n.phase) * 0.28);
      }

      ctx.clearRect(0, 0, W, H);

      // líneas azules conectando nodos cercanos
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < MAX_DIST * MAX_DIST) {
            const d = Math.sqrt(d2);
            const alpha = (1 - d / MAX_DIST) * LINE_ALPHA;
            ctx.strokeStyle = `rgba(${BLUE},${alpha.toFixed(3)})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // puntos/nodos
      for (let k = 0; k < nodes.length; k++) {
        const n = nodes[k];
        const color = n.grey ? DOT_GREY : DOT_DARK;

        // halo azul tenue en los oscuros
        if (!n.grey) {
          ctx.beginPath();
          ctx.fillStyle = `rgba(${BLUE},0.10)`;
          ctx.arc(n.x, n.y, n.r * 3, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.beginPath();
        ctx.fillStyle = `rgba(${color},${n.grey ? 0.55 : 0.9})`;
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      }

      animId = requestAnimationFrame(loop);
    }

    animId = requestAnimationFrame(loop);

    let resizeTimer: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        resize();
        nodes.forEach((n) => {
          n.x = Math.min(n.x, W);
          n.y = Math.min(n.y, H);
        });
      }, 150);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      clearTimeout(resizeTimer);
      nodes.forEach((n) => gsap.killTweensOf(n));
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      id="net"
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none w-full h-full block"
    />
  );
}
