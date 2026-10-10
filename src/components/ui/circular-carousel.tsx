'use client';

import React, { useRef, useState, useEffect, useMemo, useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {};

export interface CarouselItem {
  src: string;
  alt?: string;
  title?: string;
  subtitle?: string;
  link?: string;
}

export interface CircularCarouselProps {
  items: CarouselItem[];
  preset?: 'cylinder' | 'orbit' | 'wheel';
  intro?: 'rise' | 'assemble' | 'spin' | 'none';
  cardWidth?: number;
  aspectRatio?: number;
  speed?: number;
  captions?: boolean;
  gap?: number;
  tilt?: number;
  curve?: number;
  perspective?: number;
  autoplay?: 'drift' | 'snap' | 'off';
  interval?: number;
  direction?: 'left' | 'right';
  momentum?: number;
  snap?: boolean;
  pauseOnHover?: boolean;
  focusOnClick?: boolean;
  draggable?: boolean;
  parallax?: number;
  stretch?: number;
  fadeColor?: string;
  depthFade?: boolean;
  bend?: boolean;
  innerShade?: number;
  cornerRadius?: number;
  disableFrontAnimation?: boolean;
  onActiveItemChange?: (item: CarouselItem | null) => void;
  className?: string;
}

export default function CircularCarousel({
  items = [],
  preset: _preset = 'cylinder',
  intro = 'rise',
  cardWidth = 220,
  aspectRatio = 1,
  speed = 14,
  captions = false,
  gap = 25,
  tilt = -5,
  curve = 1,
  perspective = 2500,
  autoplay = 'drift',
  interval: _interval = 3,
  direction = 'left',
  momentum = 0.6,
  snap: _snap = false,
  pauseOnHover = true,
  focusOnClick: _focusOnClick = false,
  draggable: _draggable = true,
  parallax = 0.3,
  stretch: _stretch = 0.5,
  fadeColor: _fadeColor = '#000000',
  depthFade = true,
  bend = true,
  innerShade = 0.8,
  cornerRadius = 24,
  disableFrontAnimation = false,
  onActiveItemChange,
  className = ''
}: CircularCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cylinderRef = useRef<HTMLDivElement>(null);
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [isIntroComplete, setIsIntroComplete] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isVisibleRef = useRef(false);

  // Estados mutables para el ciclo continuo de animación rAF
  const animState = useRef({
    angle: 0,
    velocity: 0,
    isDragging: false,
    startX: 0,
    lastX: 0,
    lastTime: 0,
    rafId: 0
  });

  // Cada materia aparece de forma única sin duplicaciones artificiales
  const displayItems = useMemo(() => {
    if (!items || items.length === 0) return [];
    return items;
  }, [items]);

  const count = displayItems.length;
  const stepAngle = 360 / (count || 1);
  const cardHeight = Math.round(cardWidth / aspectRatio);

  // Radio del cilindro calculado por circunferencia
  const radius = useMemo(() => {
    const perimeter = count * (cardWidth + gap);
    return Math.max(260, Math.round((perimeter / (2 * Math.PI)) * curve));
  }, [count, cardWidth, gap, curve]);

  // Velocidad base de rotación automática (grados por segundo)
  const baseAngularSpeed = useMemo(() => {
    if (autoplay === 'off') return 0;
    const dirMult = direction === 'right' ? -1 : 1;
    return speed * 0.28 * dirMult;
  }, [speed, autoplay, direction]);

  // Bucle de animación continuo a 60-120 FPS sin re-renders de React
  useEffect(() => {
    const state = animState.current;
    state.lastTime = performance.now();

    const loop = (time: number) => {
      if (!isVisibleRef.current) return;

      const dt = Math.min((time - state.lastTime) / 1000, 0.1);
      state.lastTime = time;

      if (!state.isDragging) {
        if (pauseOnHover && isHovered) {
          state.velocity = state.velocity * 0.82;
        } else {
          const friction = Math.pow(Math.max(0.1, Math.min(0.98, momentum)), dt * 60);
          state.velocity = state.velocity * friction + baseAngularSpeed * (1 - friction);
        }
        state.angle = (state.angle + state.velocity * dt) % 360;
      }

      // Actualización directa del DOM con aceleración por hardware (CERO re-renders)
      if (cylinderRef.current) {
        cylinderRef.current.style.transform = `rotateX(${tilt}deg) rotateY(${state.angle.toFixed(2)}deg)`;
      }

      state.rafId = requestAnimationFrame(loop);
    };

    let hasHadInitialSpin = false;
    const startLoop = () => {
      if (!state.rafId) {
        if (!hasHadInitialSpin) {
          hasHadInitialSpin = true;
          // Impulso inicial de giro cinematográfico al emerger en pantalla
          state.velocity = baseAngularSpeed * 2.8;
        }
        state.lastTime = performance.now();
        state.rafId = requestAnimationFrame(loop);
      }
    };

    const stopLoop = () => {
      if (state.rafId) {
        cancelAnimationFrame(state.rafId);
        state.rafId = 0;
      }
    };

    // IntersectionObserver para pausar el bucle cuando no está visible en pantalla
    const el = containerRef.current;
    if (el) {
      const observer = new IntersectionObserver(
        (entries) => {
          const visible = entries[0].isIntersecting;
          isVisibleRef.current = visible;
          if (visible) {
            startLoop();
          } else {
            stopLoop();
          }
        },
        { threshold: 0.05 }
      );
      observer.observe(el);

      return () => {
        stopLoop();
        observer.disconnect();
      };
    }

    return () => {
      stopLoop();
    };
  }, [baseAngularSpeed, momentum, pauseOnHover, isHovered, tilt]);

  // Animación de entrada ("rise")
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsIntroComplete(true);
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  // Handlers para pausar SOLO al apoyar el cursor sobre una tarjeta y reportar la materia activa
  const handleCardPointerEnter = (item: CarouselItem) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setIsHovered(true);
    onActiveItemChange?.(item);
  };

  const handleCardPointerLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      if (!animState.current.isDragging) {
        setIsHovered(false);
        onActiveItemChange?.(null);
      }
    }, 80);
  };

  // Interacción táctil y con cursor (Drag con momentum)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const state = animState.current;
    state.isDragging = true;
    state.startX = e.clientX;
    state.lastX = e.clientX;
    state.velocity = 0;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const state = animState.current;
    if (!state.isDragging) return;

    const deltaX = e.clientX - state.lastX;
    state.lastX = e.clientX;

    // Convertimos movimiento en píxeles a grados angulares
    const deltaAngle = (deltaX / radius) * (180 / Math.PI);
    state.angle = (state.angle + deltaAngle) % 360;
    state.velocity = deltaAngle * 35; // Impulso inicial para el release

    if (cylinderRef.current) {
      cylinderRef.current.style.transform = `rotateX(${tilt}deg) rotateY(${state.angle.toFixed(2)}deg)`;
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const state = animState.current;
    state.isDragging = false;
    try {
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignorar si el pointer ya no está capturado
    }
  };

  if (!mounted) {
    return (
      <div
        className={`relative w-full h-full flex items-center justify-center select-none overflow-hidden ${className}`}
        suppressHydrationWarning
      />
    );
  }

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onMouseLeave={() => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        if (!animState.current.isDragging) {
          setIsHovered(false);
          onActiveItemChange?.(null);
        }
      }}
      className={`relative w-full h-full flex items-center justify-center select-none cursor-grab active:cursor-grabbing overflow-hidden ${className}`}
      style={{
        perspective: `${perspective}px`
      }}
      suppressHydrationWarning
    >
      {/* Contenedor cilíndrico en el espacio 3D manipulado directamente en DOM */}
      <div
        ref={cylinderRef}
        className="relative w-0 h-0 [transform-style:preserve-3d] will-change-transform"
        style={{
          transform: `rotateX(${tilt}deg) rotateY(0deg)`
        }}
      >
        {displayItems.map((item, index) => {
          // Ángulo relativo base fijo de esta tarjeta sobre la circunferencia del cilindro
          const itemAngle = (index * stepAngle) % 360;

          // Slices para curvatura 3D cilíndrica (bent cards)
          const slicesCount = bend ? 7 : 1;
          const sliceWidth = cardWidth / slicesCount;

          // Efecto de intro "rise"
          const showIntro = intro === 'rise' && !isIntroComplete && !disableFrontAnimation;
          const introTransform = showIntro
            ? 'translateY(160px) scale(0.7)'
            : 'translateY(0) scale(1)';

          const transitionClass = showIntro
            ? 'transition-transform duration-700 ease-out'
            : 'transition-opacity duration-300';

          return (
            <React.Fragment key={`${item.src}-${index}`}>
              {Array.from({ length: slicesCount }).map((_, k) => {
                // Offset horizontal del centro de este slice respecto al centro de la tarjeta (en px)
                const sliceCenterOffsetPx = (k - (slicesCount - 1) / 2) * sliceWidth;
                
                // Ángulo sub-incremental de este slice a lo largo del cilindro (en grados)
                const sliceAngleOffset = (sliceCenterOffsetPx / radius) * (180 / Math.PI);
                const sliceAngle = (itemAngle + sliceAngleOffset) % 360;
                
                const sliceRad = (sliceAngle * Math.PI) / 180;

                // Border radius en los extremos exterior izquierdo (k=0) y derecho (k=N-1)
                const isLeft = k === 0;
                const isRight = k === slicesCount - 1;
                const sliceBorderRadius = bend
                  ? `${isLeft ? cornerRadius : 0}px ${isRight ? cornerRadius : 0}px ${isRight ? cornerRadius : 0}px ${isLeft ? cornerRadius : 0}px`
                  : `${cornerRadius}px`;

                return (
                  <div
                    key={`slice-${k}`}
                    onPointerEnter={() => handleCardPointerEnter(item)}
                    onPointerLeave={handleCardPointerLeave}
                    className={`absolute left-1/2 top-1/2 [transform-style:preserve-3d] ${transitionClass} will-change-transform`}
                    style={{
                      width: `${sliceWidth + 0.5}px`,
                      height: `${cardHeight}px`,
                      marginLeft: `-${sliceWidth / 2}px`,
                      marginTop: `-${cardHeight / 2}px`,
                      transform: `rotateY(${sliceAngle}deg) translateZ(${radius}px) ${introTransform}`,
                      opacity: showIntro ? 0 : 1
                    }}
                  >
                    {/* Cara Frontal (visible al girar hacia el frente) */}
                    <div
                      className="absolute inset-0 overflow-hidden shadow-xl bg-white [backface-visibility:hidden]"
                      style={{
                        borderRadius: sliceBorderRadius,
                        borderLeft: isLeft ? '1px solid rgba(0, 0, 0, 0.08)' : 'none',
                        borderRight: isRight ? '1px solid rgba(0, 0, 0, 0.08)' : 'none',
                        borderTop: '1px solid rgba(0, 0, 0, 0.08)',
                        borderBottom: '1px solid rgba(0, 0, 0, 0.08)'
                      }}
                    >
                      {/* Imagen offset para componer la tarjeta completa sin distorsión de escala ni capas oscuras */}
                      <img
                        src={item.src}
                        alt={item.alt || item.title || 'Materia'}
                        className="h-full object-cover transition-transform duration-100 ease-out will-change-transform pointer-events-none brightness-100"
                        style={{
                          width: `${cardWidth}px`,
                          maxWidth: 'none',
                          transform: `translateX(-${k * sliceWidth}px)`
                        }}
                        suppressHydrationWarning
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.src = '/Imagen-Institucional.png';
                        }}
                      />

                      {/* Pie de foto (captions) */}
                      {captions && (item.title || item.subtitle) && (
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent pointer-events-none flex flex-col justify-end text-white overflow-hidden">
                          <div
                            className="p-5"
                            style={{
                              width: `${cardWidth}px`,
                              transform: `translateX(-${k * sliceWidth}px)`
                            }}
                          >
                            {item.subtitle && (
                              <span className="text-[11px] sm:text-xs font-semibold tracking-wider uppercase text-blue-300/90 mb-1 block whitespace-nowrap">
                                {item.subtitle}
                              </span>
                            )}
                            {item.title && (
                              <h4 className="text-base sm:text-lg font-bold tracking-tight text-white line-clamp-1 leading-snug whitespace-nowrap">
                                {item.title}
                              </h4>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Cara Trasera (visible cuando la tarjeta orbita al fondo del cilindro) */}
                    <div
                      className="absolute inset-0 overflow-hidden shadow-xl bg-white [backface-visibility:hidden]"
                      style={{
                        transform: 'rotateY(180deg)',
                        borderRadius: bend
                          ? `${isRight ? cornerRadius : 0}px ${isLeft ? cornerRadius : 0}px ${isLeft ? cornerRadius : 0}px ${isRight ? cornerRadius : 0}px`
                          : `${cornerRadius}px`,
                        borderLeft: isRight ? '1px solid rgba(0, 0, 0, 0.08)' : 'none',
                        borderRight: isLeft ? '1px solid rgba(0, 0, 0, 0.08)' : 'none',
                        borderTop: '1px solid rgba(0, 0, 0, 0.08)',
                        borderBottom: '1px solid rgba(0, 0, 0, 0.08)'
                      }}
                    >
                      <img
                        src={item.src}
                        alt={item.alt || item.title || 'Materia'}
                        className="h-full object-cover transition-transform duration-100 ease-out will-change-transform pointer-events-none brightness-100"
                        style={{
                          width: `${cardWidth}px`,
                          maxWidth: 'none',
                          transform: `translateX(-${(slicesCount - 1 - k) * sliceWidth}px)`
                        }}
                        suppressHydrationWarning
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.src = '/Imagen-Institucional.png';
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
