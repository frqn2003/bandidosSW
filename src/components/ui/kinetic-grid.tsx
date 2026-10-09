"use client";

import { useEffect, useRef, useCallback, ReactNode } from "react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Point {
  x: number;
  y: number;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  born: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CELL_SIZE = 55; // Grid cell size in px
const INFLUENCE_RADIUS = 280;
const INFLUENCE_RADIUS_SQ = INFLUENCE_RADIUS * INFLUENCE_RADIUS;
const MAX_WARP = 26;
const DOT_SPACING = 28;
const LERP_SPEED = 0.28; // Snappy, immediate follow with smooth tail

const BASE_LINE_STYLE = "rgba(255, 255, 255, 0.13)";
const BASE_NODE_STYLE = "rgba(255, 255, 255, 0.22)";
const NODE_BASE_RADIUS = 1.8;
const NODE_ACTIVE_RADIUS = 3.2;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function lerpN(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function KineticGrid({
  children,
  className,
  globalColor = "default",
}: {
  children?: ReactNode;
  className?: string;
  globalColor?: "default" | "monochrome";
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const mouseRef = useRef<Point>({ x: -9999, y: -9999 });
  const targetMouseRef = useRef<Point>({ x: -9999, y: -9999 });
  const ripplesRef = useRef<Ripple[]>([]);
  const rafRef = useRef<number>(0);
  const sizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });

  // ── Pre-render static background to offscreen canvas ──────────────────────
  const updateBgCanvas = useCallback((w: number, h: number) => {
    if (w === 0 || h === 0) return;
    
    let bgCanvas = bgCanvasRef.current;
    if (!bgCanvas) {
      bgCanvas = document.createElement("canvas");
      bgCanvasRef.current = bgCanvas;
    }
    
    bgCanvas.width = w;
    bgCanvas.height = h;
    const ctx = bgCanvas.getContext("2d");
    if (!ctx) return;

    const theme = {
      default: { bg: "#161618", end: "#08080a" },
      monochrome: { bg: "#000000", end: "#000000" },
    }[globalColor ?? "default"];

    // Radial gradient background
    const radius = Math.max(w, h) * 0.75;
    const bgGrd = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, radius);
    bgGrd.addColorStop(0, theme.bg);
    bgGrd.addColorStop(1, theme.end);
    ctx.fillStyle = bgGrd;
    ctx.fillRect(0, 0, w, h);

    // Static background dot texture (baked once upon resize)
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    ctx.beginPath();
    for (let x = DOT_SPACING / 2; x < w; x += DOT_SPACING) {
      for (let y = DOT_SPACING / 2; y < h; y += DOT_SPACING) {
        ctx.moveTo(x + 0.7, y);
        ctx.arc(x, y, 0.7, 0, Math.PI * 2);
      }
    }
    ctx.fill();
  }, [globalColor]);

  // ── Warp calculation ────────────────────────────────────────────────────────
  const getWarpedPoint = useCallback(
    (
      gx: number,
      gy: number,
      col: number,
      row: number,
      mouse: Point,
      ripples: Ripple[],
      cols: number,
      rows: number,
    ): { pt: Point; proximity: number } => {
      // Edge pin
      const edgeMargin = 1.5;
      const colPin = Math.min(col / edgeMargin, (cols - 1 - col) / edgeMargin, 1);
      const rowPin = Math.min(row / edgeMargin, (rows - 1 - row) / edgeMargin, 1);
      const pinFactor = colPin * colPin * rowPin * rowPin;

      const dx = gx - mouse.x;
      const dy = gy - mouse.y;
      const distSq = dx * dx + dy * dy;

      let rx = 0;
      let ry = 0;

      // Ripple displacement
      for (let i = 0; i < ripples.length; i++) {
        const r = ripples[i];
        const rdx = gx - r.x;
        const rdy = gy - r.y;
        const rdist = Math.sqrt(rdx * rdx + rdy * rdy);
        const waveWidth = 55;
        const diff = rdist - r.radius;
        if (Math.abs(diff) < waveWidth) {
          const strength =
            (1 - Math.abs(diff) / waveWidth) * r.opacity * 18 * pinFactor;
          const angle = Math.atan2(rdy, rdx);
          const sign = diff < 0 ? -1 : 1;
          rx += Math.cos(angle) * strength * sign * -1;
          ry += Math.sin(angle) * strength * sign * -1;
        }
      }

      if (distSq < INFLUENCE_RADIUS_SQ && distSq > 0 && pinFactor > 0) {
        const dist = Math.sqrt(distSq);
        const proximity = Math.max(0, 1 - dist / INFLUENCE_RADIUS) * pinFactor;
        const t = dist / INFLUENCE_RADIUS;
        const eased = t < 0.01 ? 0 : (1 - t) * (1 - t) * Math.min(1, dist / 60);
        const warpAmt = eased * MAX_WARP * pinFactor;
        const angle = Math.atan2(dy, dx);
        return {
          pt: {
            x: gx - Math.cos(angle) * warpAmt + rx,
            y: gy - Math.sin(angle) * warpAmt + ry,
          },
          proximity,
        };
      }

      return { pt: { x: gx + rx, y: gy + ry }, proximity: 0 };
    },
    [],
  );

  // ── Draw ────────────────────────────────────────────────────────────────────
  const draw = useCallback(
    (now: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const { w: W, h: H } = sizeRef.current;
      if (W === 0 || H === 0) return;

      const mouse = mouseRef.current;
      const ripples = ripplesRef.current;

      const theme = {
        default: {
          lineActiveRgb: "60, 130, 255", // Azul eléctrico más claro y luminoso
          nodeActiveRgb: "75, 145, 255", // Puntos con azul claro brillante
          rippleRgb: "90, 160, 255",
        },
        monochrome: {
          lineActiveRgb: "255, 255, 255",
          nodeActiveRgb: "255, 255, 255",
          rippleRgb: "255, 255, 255",
        },
      }[globalColor ?? "default"];

      // 1. Fast blit of pre-rendered background and static dots (1 call!)
      if (bgCanvasRef.current) {
        ctx.drawImage(bgCanvasRef.current, 0, 0);
      } else {
        ctx.fillStyle = "#161618";
        ctx.fillRect(0, 0, W, H);
      }

      // 2. Update ripples
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        const age = (now - r.born) / 1000;
        r.radius = Math.max(0, age * 400);
        r.opacity = Math.max(0, 1 - age * 1.2);
        if (r.opacity <= 0) ripples.splice(i, 1);
      }

      // 3. Build warped grid
      const cols = Math.max(2, Math.ceil(W / CELL_SIZE)) + 1;
      const rows = Math.max(2, Math.ceil(H / CELL_SIZE)) + 1;
      const cellW = W / (cols - 1);
      const cellH = H / (rows - 1);

      const pts: Point[][] = [];
      const prox: number[][] = [];

      for (let row = 0; row < rows; row++) {
        pts[row] = [];
        prox[row] = [];
        for (let col = 0; col < cols; col++) {
          const { pt, proximity } = getWarpedPoint(
            col * cellW,
            row * cellH,
            col,
            row,
            mouse,
            ripples,
            cols,
            rows,
          );
          pts[row][col] = pt;
          prox[row][col] = proximity;
        }
      }

      // 4. Batch drawing of grid lines
      // Pasada 1: Líneas base estándar en un solo Path acumulado
      ctx.beginPath();
      ctx.strokeStyle = BASE_LINE_STYLE;
      ctx.lineWidth = 0.8;
      ctx.lineCap = "butt";

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols - 1; col++) {
          const pr = (prox[row][col] + prox[row][col + 1]) * 0.5;
          if (pr <= 0.05) {
            const p1 = pts[row][col];
            const p2 = pts[row][col + 1];
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
          }
        }
      }

      for (let col = 0; col < cols; col++) {
        for (let row = 0; row < rows - 1; row++) {
          const pr = (prox[row][col] + prox[row + 1][col]) * 0.5;
          if (pr <= 0.05) {
            const p1 = pts[row][col];
            const p2 = pts[row + 1][col];
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
          }
        }
      }
      ctx.stroke();

      // Pasada 2: Segmentos activos iluminados cerca del mouse
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols - 1; col++) {
          const pr = (prox[row][col] + prox[row][col + 1]) * 0.5;
          if (pr > 0.05) {
            const t = pr * pr * (3 - 2 * pr); // smoothstep
            const p1 = pts[row][col];
            const p2 = pts[row][col + 1];
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(${theme.lineActiveRgb}, ${(0.13 + t * 0.77).toFixed(2)})`;
            ctx.lineWidth = 0.8 + t * 0.7;
            ctx.stroke();
          }
        }
      }

      for (let col = 0; col < cols; col++) {
        for (let row = 0; row < rows - 1; row++) {
          const pr = (prox[row][col] + prox[row + 1][col]) * 0.5;
          if (pr > 0.05) {
            const t = pr * pr * (3 - 2 * pr); // smoothstep
            const p1 = pts[row][col];
            const p2 = pts[row + 1][col];
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(${theme.lineActiveRgb}, ${(0.13 + t * 0.77).toFixed(2)})`;
            ctx.lineWidth = 0.8 + t * 0.7;
            ctx.stroke();
          }
        }
      }

      // 5. Intersection nodes (puntos de intersección)
      // Pasada 1: Nodos base en un solo path
      ctx.beginPath();
      ctx.fillStyle = BASE_NODE_STYLE;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          if (prox[row][col] <= 0.05) {
            const p = pts[row][col];
            ctx.moveTo(p.x + NODE_BASE_RADIUS, p.y);
            ctx.arc(p.x, p.y, NODE_BASE_RADIUS, 0, Math.PI * 2);
          }
        }
      }
      ctx.fill();

      // Pasada 2: Nodos activos iluminados
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const pr = prox[row][col];
          if (pr > 0.05) {
            const p = pts[row][col];
            const t = pr * pr * (3 - 2 * pr);
            const r = lerpN(NODE_BASE_RADIUS, NODE_ACTIVE_RADIUS, t);

            // Resplandor exterior suave para nodos muy activos
            if (t > 0.3) {
              const glowR = r + (t - 0.3) * 6;
              ctx.beginPath();
              ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(${theme.nodeActiveRgb}, ${(t * 0.25).toFixed(2)})`;
              ctx.fill();
            }

            // Nodo principal
            ctx.beginPath();
            ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${theme.nodeActiveRgb}, ${(0.22 + t * 0.78).toFixed(2)})`;
            ctx.fill();
          }
        }
      }

      // 6. Ondas de clic (Ripples)
      for (let i = 0; i < ripples.length; i++) {
        const r = ripples[i];
        if (r.radius > 0) {
          ctx.beginPath();
          ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${theme.rippleRgb}, ${(r.opacity * 0.28).toFixed(2)})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }
    },
    [getWarpedPoint, globalColor],
  );

  // ── Animation loop ──────────────────────────────────────────────────────────
  const animateRef = useRef<(now: number) => void>(() => {});

  const drawLoop = useCallback(
    (now: number) => {
      const m = mouseRef.current;
      const t = targetMouseRef.current;

      m.x = lerpN(m.x, t.x, LERP_SPEED);
      m.y = lerpN(m.y, t.y, LERP_SPEED);

      draw(now);
      rafRef.current = requestAnimationFrame((n) => animateRef.current(n));
    },
    [draw],
  );

  useEffect(() => {
    animateRef.current = drawLoop;
  }, [drawLoop]);

  // ── Setup & Listeners ───────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const setSize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
      sizeRef.current = { w, h };
      updateBgCanvas(w, h);

      if (mouseRef.current.x === -9999) {
        mouseRef.current = { x: -9999, y: -9999 };
        targetMouseRef.current = { x: -9999, y: -9999 };
      }
    };

    setSize();
    window.addEventListener("resize", setSize);

    const onMouseMove = (e: MouseEvent) => {
      targetMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const onClick = (e: MouseEvent) => {
      ripplesRef.current.push({
        x: e.clientX,
        y: e.clientY,
        radius: 0,
        opacity: 1,
        born: performance.now(),
      });
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("click", onClick, { passive: true });
    rafRef.current = requestAnimationFrame((n) => animateRef.current(n));

    return () => {
      window.removeEventListener("resize", setSize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("click", onClick);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [updateBgCanvas]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      className={cn(
        "relative w-full min-h-screen overflow-hidden",
        globalColor === "monochrome" ? "bg-[#000000]" : "bg-[#161618]",
        className,
      )}
    >
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full z-0 pointer-events-none"
      />

      <div className="relative z-10 w-full h-full">{children}</div>
    </div>
  );
}
