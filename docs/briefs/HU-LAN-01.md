# HU-LAN-01: Portal Institucional & Landing Page Interactiva de Nexo Académico

> **Historia de Usuario:** `HU-LAN-01` — Landing Page Institucional y Catálogo Público  
> **Módulo:** Portal Público / Landing & Onboarding  
> **Ruta:** `/` (Home / Landing)  
> **Estado:** En desarrollo e iteración activa  

---

## 1. Contexto y Propósito

- **Ruta:** `/`
- **Público objetivo:** Alumnos potenciales, estudiantes regulares, docentes y visitantes interesados en la oferta académica.
- **Objetivo:** Presentar una propuesta de valor de alto impacto visual ("WOW factor"), transmitiendo excelencia académica, tecnología moderna e invitando a la conversión (registro, inicio de sesión y exploración del plan de estudios).
- **Relacionada con:** 
  - `HU-SIS-01` / `HU-AUTH-01` (Autenticación, Login y Registro)
  - Opcional, pero por el momento estático: `HU-MAT-01` (Catálogo y Detalle de Materias)
  - Opcional, pero por el momento estático: `HU-PRO-01` (Cuerpo Docente y Cátedras)

---

## 2. Wireframe y Arquitectura de Secciones

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [Logo Nexo Académico (h-10 a h-14)]           [Iniciar sesión] [Registrarme] │
│                                               (Liquid Slide-in Azul #0000FF) │
├──────────────────────────────────────────────────────────────────────────────┤
│ SECTION: #inicio (Hero Interactivo KineticGrid - LERP 0.28 / 60-120 FPS)     │
│                                                                              │
│  "Tu ritmo, tus objetivos."                ┌───────────┐   ┌───────────┐     │
│   Nexo Académico                           │ Estudiante│   │ Estudiante│     │
│   (BlurText animado)                       │   Niño    │   │   Mujer   │     │
│                                            │ (Pop-Out) │   │ (Pop-Out) │     │
│                                            └───────────┘   └───────────┘     │
│                                [↓ Desplazate]                                │
├──────────────────────────────────────────────────────────────────────────────┤
│ SECTION: #por-que-elegirnos                                                  │
│ [¿Por qué elegirnos? ▾] (Solapa escalonada azul #0000FF)                     │
│                                                                              │
│  ┌──────────────────────┐   Excelencia y Rendimiento                         │
│  │ Imagen Institucional │   Resultados que transforman tu trayectoria        │
│  │ con haz de brillo    │   ┌───────────────┐ ┌───────────────┐              │
│  │ diagonal             │   │ +1.500 Alumnos│ │ 94% Aprobación│              │
│  └──────────────────────┘   ├───────────────┤ ├───────────────┤              │
│                             │ +48 Docentes  │ │ +85 Materias  │              │
│                             └───────────────┘ └───────────────┘              │
├──────────────────────────────────────────────────────────────────────────────┤
│ SECTION: #materias-destacadas                                                │
│  Plan de Estudios — Materias Destacadas                 [Deslizá →]          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐         │
│  │ PlaceCard #1 │ │ PlaceCard #2 │ │ PlaceCard #3 │ │ PlaceCard #4 │ ...     │
│  │ (Prog. Web)  │ │ (IA Aplicada)│ │ (Cálculo)    │ │ (Algoritmos) │         │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘         │
├──────────────────────────────────────────────────────────────────────────────┤
│ SECTION: #testimonios                                                        │
│  Comunidad Académica — Lo que dicen nuestros estudiantes                     │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ [Marquee Vertical Multi-Columna con Testimonios y Reseñas Reales]      │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│                                 [ (✦) Radial Menu: Drag-to-Spin & Tooltips ] │
├──────────────────────────────────────────────────────────────────────────────┤
│  FOOTER INSTITUCIONAL (Planificado / Promesa de diseño)                      │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ [Logo Nexo]       • Académico      • Institucional     • Contacto &    │  │
│  │ Tu ritmo,         - Materias       - Sobre nosotros      Sedes         │  │
│  │ tus objetivos.    - Profesores     - Sedes y Aulas     - Salta, Arg.   │  │
│  │                   - Turnos         - Certificaciones   - wsp / mail    │  │
│  │ ────────────────────────────────────────────────────────────────────── │  │
│  │ © 2026 Nexo Académico · Términos · Privacidad · Portal Interno         │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Registro de Decisiones de Diseño & Arquitectura

En esta sección se asientan todas las decisiones visuales, de UX y técnicas tomadas durante el desarrollo:

| Área / Elemento | Decisión Tomada | Justificación / Rationale |
|---|---|---|
| **Favicon e Icono de Pestaña** | Declaración centralizada en `src/app/layout.tsx` apuntando a `/LogoNegro.png`. | Proporciona identidad institucional nítida en la barra de pestañas y marcadores del navegador. |
| **Logo de Cabecera** | Dimensionamiento a `h-10 sm:h-12 md:h-14` con `drop-shadow-lg` sobre `/LogoBlanco.png`. | Mayor jerarquía visual y presencia institucional sin interferir con los botones de acción. |
| **Fondo Global del Hero (`KineticGrid`)** | Canvas 2D interactivo ultra-optimizado (60–120 FPS): `LERP_SPEED = 0.28`, *Offscreen Canvas* para textura estática, *Path Batching* de trazos (reducción de 1.400 a 2 draw calls) y paleta en **azul eléctrico luminoso** (`rgb(60, 130, 255)` / `rgb(75, 145, 255)`). | Brinda reactividad inmediata al movimiento del ratón sin retardo ni sobrecarga de CPU/GPU. |
| **Tipografía de Títulos** | `Poppins` (Google Font) vía variable `--font-poppins` combinada con `Inter` para cuerpos de texto. | Poppins aporta modernidad, geometría limpia y carácter institucional premium para headings. |
| **Hero Copy Animado** | `BlurText` de React Bits con animación de desenfoque por palabras de arriba hacia abajo. | Captura la atención en los primeros 3 segundos de carga de la página. |
| **Composición Visual del Hero** | Tarjetas con efecto Glassmorphism (`backdrop-blur-xl`, `bg-white/[0.06]`) y figuras recortadas en pop-out (`nuevoniño.png` y `nuevamujer.png`), con elevación optimizada (`-mt-8 lg:-mt-16 pt-2 lg:pt-6`, `-translate-y-3 sm:-translate-y-5` en niño y `-translate-y-10 sm:-translate-y-16` en mujer) para un balance visual y proximidad áurea en el viewport. | Humaniza la plataforma mostrando tanto nivel inicial/secundario como universitario/adulto, manteniendo armonía, presencia y legibilidad en la cabecera. |
| **Efecto de Haz de Luz (Shimmer)** | Animación CSS diagonal a 45° (`animate-shimmer-diagonal`) cada 5 segundos. | Otorga brillo premium y textura visual interactiva sin dependencias pesadas. |
| **Transición de Secciones** | Diseño de **solapas escalonadas de carpeta física** en azul `#0000FF` y `#00236f`, integrando **dos documentos sutiles que asoman en el extremo derecho**: una hoja de examen blanco marfil con calificación **`10/10 ★`** y una ficha manila/kraft con datos de acta (**`Ciclo 2026 · Acta N° 84`**), con inclinaciones orgánicas (-2.5° y +3.5°) y sombras de papel por detrás del bloque azul eléctrico principal. | Refuerza la metáfora táctil de expediente y legajo académico de forma verosímil y elegante. |
| **Tarjeta de Imagen Institucional** | Tarjeta con perspectiva 3D suave en el eje Y (`perspective: 900px`, `rotateY(10deg)`), bordes glass (`backdrop-blur-xl`, `border-white/25`), sombra profunda y haz de brillo diagonal continuo (`animate-shimmer-diagonal`). | Logra profundidad visual moderna y jerarquía sin movimiento descontrolado ni sobrecarga de GPU. |
| **Cinta de Transición de Descuentos (Ticker Banner)** | Cinta horizontal continua (`bg-black`, borde `border-white/15`, tipografía blanca bold con badges destacados) ubicada entre la sección de métricas y materias destacadas (`animate-ticker` a 60 FPS con pausa en hover y soporte `prefers-reduced-motion`). Destaca beneficios inmediatos: *20% OFF en primera materia*, *Matrícula 100% bonificada 2026*, *3 cuotas sin interés* y *cupos limitados*. | Genera un corte visual de alto impacto que conecta de forma atractiva las métricas de excelencia con la oferta académica. |
| **Métricas en Notas Adhesivas Post-it (Cascada Rápida)** | Cuatro notas adhesivas tipo Post-it con cinta scotch translúcida (`bg-white/60`), paleta pastel de oficina (amarillo `#FEF08A`, celeste `#BAE6FD`, verde menta `#BBF7D0` y melón `#FED7AA`), rotación orgánica (-1.5° a +1.8°) y títulos manuscritos en tipografía `Caveat`. Sistema secuencial encadenado en 4 pasos (**Estudiantes 450ms → Aprobación 220ms → Docentes 170ms → Materias 170ms**). Cada tarjeta cuenta con un **Master Timeline en GSAP**: elevación ágil, conteo numérico con curva `power2.out`, brillo azul eléctrico (`#0047FF`), impacto en seco de estampa física de goma (`y: 4-6, scale: 0.96`), disparo inmediato de la siguiente métrica al estampar (35ms) y asentamiento elástico. | Brinda una experiencia táctil y gamificada de alta fidelidad ("Level Up / Achievement") con sensación de velocidad instantánea y máximo rendimiento técnico. (+1500 alumnos, 94% aprobación, +48 docentes, +45 materias). |
| **Catálogo de Materias con Entrada Cinematográfica 3D (GSAP ScrollTrigger)** | Componente 3D `CircularCarousel` sincronizado mediante un Master Timeline en GSAP ScrollTrigger (`y: 110`, `scale: 0.82`, `rotateX: 20°` hacia estado final con easing `power3.out`) con un impulso de rotación dinámica (`velocity = speed * 2.8`) al emerger en el viewport. Rotación cilíndrica desacoplada de re-renders de React, aceleración en GPU y suspensión automática mediante `IntersectionObserver`. | Presenta los cursos con una experiencia espacial 3D inmersiva y táctil de alta gama que emerge flotando cinematográficamente al hacer scroll. |
| **Botones de Cabecera (Hover)** | **Relleno Deslizante Azul Eléctrico (`#0047FF`)**. Al pasar el mouse, ambos botones deslizan una capa del azul eléctrico institucional con sombra luminosa (`hover:shadow-blue-600/30`) y micro-elevación (`-translate-y-0.5`). | Mantiene coherencia cromática con la identidad visual y la solapa de sección, atrayendo la atención del usuario de forma armónica. |
| **Menú Radial Orbital (`RadialSocialMenu`)** | Sistema de rueda satelital con **rotación por arrastre (Drag-to-Spin 1:1)**, soporte para rueda del ratón (`wheel`), inercia física con desaceleración exponencial, disco táctil completo de **320px**, aro con resplandor visible (`border-2 border-white/50 shadow-[0_0_18px]`), iconos en blanco puro (`text-white`), tooltips flotantes en hover y 6 accesos (WhatsApp, Iniciar sesión, Plan de estudios, ¿Por qué elegirnos?, Testimonios y Subir al inicio). | Centraliza la navegación y contacto en un elemento interactivo, táctil y de rápida respuesta desde cualquier parte de la landing. |
| **Estabilidad SSR e Hidratación** | Formateo estricto de coordenadas angulares a 2 decimales (`toFixed(2)`) y `suppressHydrationWarning`. | Elimina discrepancias de punto flotante entre el servidor y el cliente React. |
| **Sección de Testimonios** | `VerticalMarqueeDemo` (Marquee vertical multi-columna con pausa en hover). | Muestra feedback social dinámico y continuo sin requerir clics manuales del usuario. |
| **Animaciones & Orquestación con GSAP** | Integración de `gsap`, `@gsap/react` y `ScrollTrigger` centralizada en `src/lib/gsap.ts` con alcance seguro `useGSAP`. | Permite timelimes cinematográficas, micro-animaciones orgánicas a 60-120 FPS y control ligado al scroll sin sobrecarga de renders en React. |
| **Entrada y Micro-Flotación del Hero** | Reemplazo de keyframes CSS estáticos por timeline GSAP con elasticidad suave (`back.out(1.25)`) y flotación sinusoidal continua (`yoyo: true`, `sine.inOut`) desfasada entre el niño y la mujer. | Aporta dinamismo orgánico y tridimensional a los personajes sin recargar el hilo principal de la CPU. |
| **Interacción Física de Carpeta (ScrollTrigger Scrub)** | Los documentos asomando (examen `10/10 ★` y legajo manila `Ciclo 2026`) se desplazan verticalmente con `scrub: 1.2` conforme el usuario scrollea hacia `#por-que-elegirnos`. | Simula con alto realismo táctil que los papeles emergen de la carpeta física de expediente. |
| **Perspectiva 3D Institucional con ScrollTrigger** | Animación de entrada con rotación espacial (`rotateY`, `scale`, `opacity`, `power3.out`) disparada al ingresar la sección al viewport. | Acentúa la profundidad y jerarquía de las instalaciones del centro académico. |
| **Explosión Física y Estampa Gamificada con GSAP** | Componente `SparkleBurst` con física real de partículas en GSAP (36 elementos: confeti 3D, rombos y chispas multicolores, doble onda de choque expansiva y destello estelar de impacto). | Explosión con alto contraste y visibilidad contra los tonos pastel del papel, sincronizada milimétricamente con el slam de estampa. |
| **Footer Institucional** *(Promesa / Pendiente)* | Footer en bloque oscuro (`bg-slate-950` / `bg-[#00236f]`) con 4 columnas (Brand & lema, Accesos académicos, Institucional / Sedes, Legales y copyright). | Cierre de página con navegación secundaria, respaldo institucional y accesibilidad legal. |

---

## 4. Componentes UI Involucrados

Los componentes modulares utilizados se encuentran en `src/components/ui/`:

1. **`KineticGrid`** (`src/components/ui/kinetic-grid.tsx`): Canvas de grilla cinética de fondo optimizado para 60–120 FPS.
2. **`BlurText`** (`src/components/ui/blur-text.tsx`): Tipografía animada con desenfoque progresivo.
3. **`SplitText`** (`src/components/ui/split-text.tsx`): Títulos con revelación carácter por carácter al ingresar al viewport.
4. **`CountUp`** (`src/components/ui/count-up.tsx`): Animación numérica de incremento para estadísticas.
5. **`SparkleBurst`** (`src/components/ui/sparkle-burst.tsx`): Emisor de micro-partículas físicas y onda de choque para cierre de conteo de métricas.
6. **`PlaceCard`** (`src/components/ui/card-22.tsx`): Tarjeta de cursos/materias con tags, rating, galería de fotos y CTA.
7. **`VerticalMarqueeDemo`** (`src/components/ui/marquee-03.tsx`): Scroll infinito vertical para testimonios.
8. **`RadialSocialMenu`** (`src/components/ui/radial-social-menu.tsx`): Menú radial con Drag-to-Spin, inercia, tooltips y LiveOrb 3D.
9. **`GSAP Engine`** (`src/lib/gsap.ts`): Orquestador centralizado de ScrollTrigger, timelines y micro-física visual.

---

## 5. Bitácora de Cambios y Decisiones en Desarrollo

### Fase 1: Estructura Base y Hero (Completada)
- Implementación del canvas interactivo `KineticGrid`.
- Inclusión del isotipo y logotipo institucional en SVG/PNG con enlace a inicio.
- Botones de acceso rápido a autenticación (`/login`).
- Integración de los personajes en tarjetas flotantes con efecto pop-out y destello de luz periódico.

### Fase 2: Sección de Valor y Estadísticas (Completada)
- Construcción de la solapa de transición en azul vibrante `#0000FF`.
- Integración de fotografía de instalaciones institucionales con tarjeta de alta fidelidad.
- Grilla de 4 indicadores clave con iconos de Lucide React y animación `CountUp`.

### Fase 3: Catálogo Interactivo de Materias (Completada)
- Conexión de materias destacadas (Programación Web, IA, Cálculo, Algoritmos, Bases de Datos, UX/UI, Física).
- Integración de desplazamiento horizontal controlado con la rueda del ratón (`onWheel`).

### Fase 4: Prueba Social y Feedback (Completada)
- Incorporación del Marquee vertical con testimonios estudiantiles y valoraciones.

### Fase 5: Optimización de Rendimiento, Interacciones y Menú Radial (Completada)
- Refactorización de `KineticGrid` para eliminar cuellos de botella de CPU y Garbage Collection (60-120 FPS fluidos).
- Ajuste de color del canvas a azul eléctrico claro (`rgb(60, 130, 255)`).
- Implementación de animación de relleno deslizante azul eléctrico en botones de cabecera.
- Reconfiguración del Menú Radial con 6 accesos (WhatsApp, Login, anclas `#inicio`, `#por-que-elegirnos`, `#materias-destacadas`, `#testimonios`), rotación libre por arrastre (Drag-to-Spin), inercia física, soporte de rueda del mouse, área táctil completa de 320px e iconos blancos.
- Corrección del error de hidratación SSR mediante redondeo decimal `.toFixed(2)`.

### Fase 6: Orquestación Cinematográfica con GSAP & ScrollTrigger (Completada)
- Instalación de `gsap` y `@gsap/react` con configuración centralizada y segura para SSR en `src/lib/gsap.ts`.
- Entrada coordinada del header (logo y botones) con easing `power3.out`.
- Entrada con rebote elástico (`back.out(1.25)`) y micro-flotación continua flotante desfasada en las tarjetas del niño y la mujer.
- ScrollTrigger con modo `scrub` interactivo en los documentos asomando de la carpeta (examen `10/10 ★` y legajo manila).
- Revelado con rotación espacial 3D de la tarjeta institucional al ingresar a `#por-que-elegirnos`.
- Migración del conteo numérico de métricas a tweens nativos de GSAP (`power2.out`), coordinando con precisión el slam y las partículas monocromáticas.
- Revelado cinemático con ScrollTrigger en las cabeceras de `#materias-destacadas` y `#testimonios`.
- Verificación técnica exhaustiva con TypeScript (`tsc --noEmit`) y ESLint (`npm run lint`) con 0 advertencias o errores.

### Fase 7: Estética Táctil de Carpeta Manila en Métricas (Completada)
- Aplicación de fondo cálido de papel/cartulina de carpeta de archivo Manila (`#F2E4CB`) a toda la sección institucional `#por-que-elegirnos`.
- Solapa principal en `#F2E4CB` con pestañas escalonadas posteriores en tonos complementarios Manila (`#E5D4B6` y `#D7C4A3`).
- **Rótulo Manuscrito:** Integración de la tipografía manuscrita de Google Fonts `Caveat` (`--font-caveat`) en la solapa de carpeta *"¿Por qué elegirnos?"* con micro-inclinación orgánica (`-rotate-[1.5deg]`), evocando un rotulado artesanal a pluma/birome de secretaría académica.
- **Post-it Adhesivo "Excelencia y Rendimiento":** Reemplazo del badge genérico por una nota adhesiva Post-it amarilla clásica (`#FEF08A`) sujeta con un trozo de cinta scotch translúcida en la parte superior, sombra realista de papel despegado y texto en tipografía manuscrita `Caveat`.
- **Métricas como Notas Adhesivas Post-it:** Transformación integral de las 4 tarjetas de estadísticas (`CascadingMetricCard`) en Post-its realistas con paleta pastel de oficina:
  - *Estudiantes:* Amarillo canario clásico (`#FEF08A`, micro-giro `-1.5°`, cinta `-1°`).
  - *Aprobación:* Celeste cielo pastel (`#BAE6FD`, micro-giro `+1.8°`, cinta `+1.5°`).
  - *Cuerpo Docente:* Verde menta pastel (`#BBF7D0`, micro-giro `-1.2°`, cinta `-2°`).
  - *Oferta Académica:* Melón pastel (`#FED7AA`, micro-giro `+1.4°`, cinta `+1°`).
  - Cada Post-it cuenta con su trozo de cinta adhesiva translúcida superior (`bg-white/60 backdrop-blur-[1px]`), sombra tridimensional de despegue de papel, título rotulado a mano con tipografía `Caveat` y micro-alineación orgánica al pasar el cursor (`hover:rotate-0 hover:-translate-y-1`).
- Adaptación tipográfica de alto contraste con tonos oscuros (`text-stone-900` y `text-stone-800`).
- Retiro definitivo del widget flotante de evaluación de paletas.

### Próximas Mejoras / Backlog
- [ ] Conectar las tarjetas de materias con el modal o página de detalle de materia (`/materias/:id`).
- [ ] Integrar botón "Ver todas las materias" con redirección al catálogo filtrable.
- [ ] Implementar footer institucional expandido con enlaces de acreditación, sedes y preguntas frecuentes (FAQ).
- [ ] Optimización de assets WebP para tiempos de carga < 1.2s.

---

## 6. Criterios de Aceptación

- [x] **Identidad visual:** La paleta respeta los tokens del design system con contrastes adecuados en modo oscuro y claro.
- [x] **Responsividad:** El diseño se adapta fluidamente en móviles (360px+), tablets y desktops (1080p, 2K).
- [x] **Performance:** Las animaciones corren a 60 FPS mediante aceleración por hardware (`will-change`, `transform`, `opacity`).
- [x] **Navegación:** Los enlaces hacia login, WhatsApp y anclas de sección dirigen correctamente a los destinos.
- [x] **Accesibilidad:** Textos alternativos (`alt`) en todas las imágenes e índices de contraste legibles.
