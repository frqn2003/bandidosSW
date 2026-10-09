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
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [isIntroComplete, setIsIntroComplete] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Para cerrar el cilindro de forma circular armónica, duplicamos los items si hay pocos
  const displayItems = useMemo(() => {
    if (!items || items.length === 0) return [];
    if (items.length < 8) {
      // Duplicamos para tener un anillo de al menos 8-9 tarjetas con fondo visible
      const repeated: CarouselItem[] = [];
      const times = Math.ceil(8 / items.length);
      for (let i = 0; i < times; i++) {
        repeated.push(...items);
      }
      return repeated;
    }
    return items;
  }, [items]);

  const count = displayItems.length;
  const stepAngle = 360 / (count || 1);
  const cardHeight = Math.round(cardWidth / aspectRatio);

  // Radio del cilindro calculado por circunferencia
  const radius = useMemo(() => {
    const perimeter = count * (cardWidth + gap);
    return Math.max(380, Math.round((perimeter / (2 * Math.PI)) * curve));
  }, [count, cardWidth, gap, curve]);

  // Velocidad base de rotación automática (grados por segundo)
  const baseAngularSpeed = useMemo(() => {
    if (autoplay === 'off') return 0;
    const dirMult = direction === 'right' ? -1 : 1;
    return speed * 0.28 * dirMult;
  }, [speed, autoplay, direction]);

  // Bucle de animación continuo a 60fps
  useEffect(() => {
    animState.current.lastTime = performance.now();

    const loop = (time: number) => {
      const state = animState.current;
      const dt = Math.min((time - state.lastTime) / 1000, 0.1);
      state.lastTime = time;

      if (!state.isDragging) {
        if (pauseOnHover && isHovered) {
          // Si el mouse toca una tarjeta, se frena suave y rápidamente
          state.velocity = state.velocity * 0.82;
        } else {
          // Si el mouse no está sobre ninguna tarjeta, gira continuamente
          const friction = Math.pow(Math.max(0.1, Math.min(0.98, momentum)), dt * 60);
          state.velocity = state.velocity * friction + baseAngularSpeed * (1 - friction);
        }
        state.angle = (state.angle + state.velocity * dt) % 360;
      }

      setRotationAngle(state.angle);
      state.rafId = requestAnimationFrame(loop);
    };

    const currentAnimState = animState.current;
    currentAnimState.rafId = requestAnimationFrame(loop);

    return () => {
      if (currentAnimState.rafId) {
        cancelAnimationFrame(currentAnimState.rafId);
      }
    };
  }, [baseAngularSpeed, momentum, pauseOnHover, isHovered]);

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
      {/* Contenedor cilíndrico en el espacio 3D */}
      <div
        className="relative w-0 h-0 [transform-style:preserve-3d] will-change-transform"
        style={{
          transform: `rotateX(${tilt}deg)`
        }}
      >
        {displayItems.map((item, index) => {
          // Ángulo absoluto del centro de esta tarjeta
          const itemAngle = (rotationAngle + index * stepAngle) % 360;
          const cardRad = (itemAngle * Math.PI) / 180;
          const cardSin = Math.sin(cardRad);
          // Parallax sincronizado a nivel de tarjeta completa para evitar desfasaje de rebanadas
          const cardParallaxOffset = cardSin * parallax * -20;

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
                const sliceCos = Math.cos(sliceRad);

                // Opacidad de sombra de profundidad suave (máximo 45% para que la foto siempre se distinga)
                const shadeOpacity = depthFade
                  ? Math.max(0, Math.min(0.45, (-sliceCos + 0.2) * 0.4))
                  : 0;

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
                      className="absolute inset-0 overflow-hidden shadow-2xl bg-slate-900 [backface-visibility:hidden]"
                      style={{
                        borderRadius: sliceBorderRadius,
                        borderLeft: isLeft ? '1px solid rgba(255, 255, 255, 0.2)' : 'none',
                        borderRight: isRight ? '1px solid rgba(255, 255, 255, 0.2)' : 'none',
                        borderTop: '1px solid rgba(255, 255, 255, 0.2)',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
                      }}
                    >
                      {/* Imagen offset para componer la tarjeta completa sin distorsión de escala */}
                      <img
                        src={item.src}
                        alt={item.alt || item.title || 'Materia'}
                        className="h-full object-cover transition-transform duration-100 ease-out will-change-transform pointer-events-none"
                        style={{
                          width: `${cardWidth}px`,
                          maxWidth: 'none',
                          transform: `translateX(-${k * sliceWidth}px) translateX(${cardParallaxOffset}px)`
                        }}
                        suppressHydrationWarning
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.src = '/Imagen-Institucional.png';
                        }}
                      />

                      {/* Sombra de profundidad */}
                      <div
                        className="absolute inset-0 bg-black pointer-events-none transition-opacity duration-75"
                        style={{
                          opacity: shadeOpacity
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
                      className="absolute inset-0 overflow-hidden shadow-2xl bg-slate-900 [backface-visibility:hidden]"
                      style={{
                        transform: 'rotateY(180deg)',
                        borderRadius: bend
                          ? `${isRight ? cornerRadius : 0}px ${isLeft ? cornerRadius : 0}px ${isLeft ? cornerRadius : 0}px ${isRight ? cornerRadius : 0}px`
                          : `${cornerRadius}px`,
                        borderLeft: isRight ? '1px solid rgba(255, 255, 255, 0.15)' : 'none',
                        borderRight: isLeft ? '1px solid rgba(255, 255, 255, 0.15)' : 'none',
                        borderTop: '1px solid rgba(255, 255, 255, 0.15)',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.15)'
                      }}
                    >
                      <img
                        src={item.src}
                        alt={item.alt || item.title || 'Materia'}
                        className="h-full object-cover transition-transform duration-100 ease-out will-change-transform pointer-events-none"
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
                      {/* Sombra suave de profundidad en el fondo */}
                      <div
                        className="absolute inset-0 bg-black pointer-events-none transition-opacity duration-75"
                        style={{
                          opacity: 0.38
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
