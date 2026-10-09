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
| **Composición Visual del Hero** | Tarjetas con efecto Glassmorphism (`backdrop-blur-xl`, `bg-white/[0.06]`) y figuras recortadas en pop-out (`nuevoniño.png` y `nuevamujer.png`), con espaciado vertical calibrado (`-mt-2 lg:-mt-6 pt-8 lg:pt-14`) para dejar respiro holgado debajo de los botones de cabecera. | Humaniza la plataforma mostrando tanto nivel inicial/secundario como universitario/adulto, manteniendo armonía y legibilidad en la cabecera. |
| **Efecto de Haz de Luz (Shimmer)** | Animación CSS diagonal a 45° (`animate-shimmer-diagonal`) cada 5 segundos. | Otorga brillo premium y textura visual interactiva sin dependencias pesadas. |
| **Transición de Secciones** | Diseño de **solapas escalonadas de carpeta física** en azul `#0000FF` y `#00236f`, integrando **dos documentos sutiles que asoman en el extremo derecho**: una hoja de examen blanco marfil con calificación **`10/10 ★`** y una ficha manila/kraft con datos de acta (**`Ciclo 2026 · Acta N° 84`**), con inclinaciones orgánicas (-2.5° y +3.5°) y sombras de papel por detrás del bloque azul eléctrico principal. | Refuerza la metáfora táctil de expediente y legajo académico de forma verosímil y elegante. |
| **Tarjeta de Imagen Institucional** | Tarjeta con perspectiva 3D suave en el eje Y (`perspective: 900px`, `rotateY(10deg)`), bordes glass (`backdrop-blur-xl`, `border-white/25`), sombra profunda y haz de brillo diagonal continuo (`animate-shimmer-diagonal`). | Logra profundidad visual moderna y jerarquía sin movimiento descontrolado ni sobrecarga de GPU. |
| **Cinta de Transición de Descuentos (Ticker Banner)** | Cinta horizontal continua (`bg-black`, borde `border-white/15`, tipografía blanca bold con badges destacados) ubicada entre la sección de métricas y materias destacadas (`animate-ticker` a 60 FPS con pausa en hover y soporte `prefers-reduced-motion`). Destaca beneficios inmediatos: *20% OFF en primera materia*, *Matrícula 100% bonificada 2026*, *3 cuotas sin interés* y *cupos limitados*. | Genera un corte visual de alto impacto que conecta de forma atractiva las métricas de excelencia con la oferta académica. |
| **Métricas Institucionales Gamificadas (Cascada Rápida)** | Sistema secuencial encadenado en 4 pasos (**Estudiantes → Aprobación → Docentes → Materias**). Conteo ultra-rápido (450 ms el primero, 260 ms los siguientes) para máxima sensación de performance. Mientras una métrica cuenta, las siguientes simulan procesamiento activo con un **ticker numérico digital en tiempo real**. Al culminar cada conteo, el número se proyecta con un **rebote elástico de estampa (`animate-stamp-slam`)** y dispara un destello de **22 pelotitas blancas monocromáticas que nacen en la base del número y caen por gravedad (`animate-white-gravity-spark`)**. | Brinda una experiencia gamificada cinematográfica ("Level Up / Achievement") con cero penalización en FPS o memoria gracias a rAF y aceleración por GPU. (+1500 alumnos, 94% aprobación, +48 docentes, +45 materias). |
| **Catálogo de Materias** | Componente 3D `CircularCarousel` (`preset="cylinder"`, `intro="rise"`, `perspective=2600`, `tilt=-7`, `momentum=0.73`) con arrastre interactivo, sombreado de profundidad interior (`innerShade`) y captions integrados. | Presenta los cursos con una experiencia espacial 3D inmersiva y táctil de alta gama. |
| **Botones de Cabecera (Hover)** | **Relleno Deslizante Azul Eléctrico (`#0000FF`)**. Al pasar el mouse, ambos botones deslizan una capa del azul eléctrico institucional con sombra luminosa (`hover:shadow-blue-600/30`) y micro-elevación (`-translate-y-0.5`). | Mantiene coherencia cromática con la identidad visual y la solapa de sección, atrayendo la atención del usuario de forma armónica. |
| **Menú Radial Orbital (`RadialSocialMenu`)** | Sistema de rueda satelital con **rotación por arrastre (Drag-to-Spin 1:1)**, soporte para rueda del ratón (`wheel`), inercia física con desaceleración exponencial, disco táctil completo de **320px**, aro con resplandor visible (`border-2 border-white/50 shadow-[0_0_18px]`), iconos en blanco puro (`text-white`), tooltips flotantes en hover y 6 accesos (WhatsApp, Iniciar sesión, Plan de estudios, ¿Por qué elegirnos?, Testimonios y Subir al inicio). | Centraliza la navegación y contacto en un elemento interactivo, táctil y de rápida respuesta desde cualquier parte de la landing. |
| **Estabilidad SSR e Hidratación** | Formateo estricto de coordenadas angulares a 2 decimales (`toFixed(2)`) y `suppressHydrationWarning`. | Elimina discrepancias de punto flotante entre el servidor y el cliente React. |
| **Sección de Testimonios** | `VerticalMarqueeDemo` (Marquee vertical multi-columna con pausa en hover). | Muestra feedback social dinámico y continuo sin requerir clics manuales del usuario. |
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
