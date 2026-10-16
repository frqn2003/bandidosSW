import { Marquee } from "@/components/ui/marquee-03-utils/marquee";
import { CheckCircle2, Star, Quote } from "lucide-react";

type Review = {
  name: string;
  career: string;
  tag?: string;
  body: string;
  profile: string;
  rating?: number;
};

const reviews: Review[] = [
  {
    name: "Sofía Martínez",
    career: "Ing. Informática",
    tag: "Promoción Directa",
    body: "“El acompañamiento personalizado fue clave para que pudiera promocionar materias difíciles. La plataforma es intuitiva y me ordenó todo el semestre.”",
    profile: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
    rating: 5,
  },
  {
    name: "Lucas Benítez",
    career: "Lic. en Sistemas",
    tag: "Final Aprobado",
    body: "“Empecé con dudas en materias numéricas, pero los tutores te explican con paciencia y casos reales. El seguimiento individual marca una diferencia enorme.”",
    profile: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=120&auto=format&fit=crop&q=80",
    rating: 5,
  },
  {
    name: "Camila Rodríguez",
    career: "Diseño UX/UI",
    tag: "Portfolio Listo",
    body: "“Los proyectos prácticos y las correcciones en vivo me permitieron armar un portfolio profesional mientras cursaba. 100% recomendado.”",
    profile: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80",
    rating: 5,
  },
  {
    name: "Mateo Fernández",
    career: "Ciencia de Datos",
    tag: "Cursada Regular",
    body: "“Pude avanzar a mi propio ritmo con clases grabadas y consultas en directo. La mejor inversión para compatibilizar la facultad con mi trabajo.”",
    profile: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80",
    rating: 5,
  },
  {
    name: "Valentina Gómez",
    career: "Contador Público",
    tag: "2 Finales en 1ª Mesa",
    body: "“El material de estudio es clarísimo y los docentes responden todas las consultas al instante. Aprobé mis dos finales en la primera mesa.”",
    profile: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80",
    rating: 5,
  },
  {
    name: "Nicolás Rossi",
    career: "Ing. Industrial",
    tag: "Examen Promocionado",
    body: "“La metodología de resolución de exámenes de años anteriores te da una seguridad tremenda para rendir. Muy agradecido con el equipo de Nexo.”",
    profile: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80",
    rating: 5,
  },
  {
    name: "Julieta Álvarez",
    career: "Bioquímica",
    tag: "Tutorías Grupales",
    body: "“Las tutorías grupales y los resúmenes interactivos me salvaron el cuatrimestre. La calidad humana y técnica de los profes es insuperable.”",
    profile: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=120&auto=format&fit=crop&q=80",
    rating: 5,
  },
  {
    name: "Tomás Herrera",
    career: "Lic. en Administración",
    tag: "Nota 10 en Parcial",
    body: "“Increíble experiencia de aprendizaje. Las clases son dinámicas, concisas y van directo a los puntos que toman en los parciales.”",
    profile: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=120&auto=format&fit=crop&q=80",
    rating: 5,
  },
  {
    name: "Florencia Díaz",
    career: "Medicina",
    tag: "Nivelación Exitosa",
    body: "“El cronograma organizado y las autoevaluaciones me permitieron llegar al examen con todos los temas afianzados. No duden en sumarse.”",
    profile: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80",
    rating: 5,
  },
];

const ReviewCard = ({ profile, name, career, tag, body, rating = 5 }: Review) => {
  return (
    <div className="group relative w-full max-w-sm cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.08] via-white/[0.04] to-white/[0.02] p-5 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition-all duration-300 hover:-translate-y-1.5 hover:border-blue-400/50 hover:bg-white/[0.09] hover:shadow-[0_16px_40px_rgba(30,70,255,0.25)]">
      {/* Línea de resplandor superior sutil en hover */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      {/* Ícono de comilla decorativo de fondo */}
      <Quote className="pointer-events-none absolute top-3.5 right-4 h-8 w-8 text-white/[0.04] transition-colors duration-300 group-hover:text-blue-400/15" />

      <div className="flex flex-col gap-3">
        {/* Cabecera con Avatar, Nombre, Verificado y Carrera */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <img
                className="h-10 w-10 rounded-full object-cover ring-2 ring-blue-500/30 transition-all duration-300 group-hover:ring-blue-400/70"
                width="40"
                height="40"
                alt={name}
                src={profile}
              />
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 ring-2 ring-[#060b1e]">
                <CheckCircle2 className="h-2.5 w-2.5 text-white" />
              </span>
            </div>
            <div className="flex flex-col min-w-0">
              <p className="text-sm font-bold text-white tracking-tight leading-tight truncate">{name}</p>
              <span className="text-[11px] font-semibold text-blue-300 tracking-wide mt-0.5 truncate">
                {career}
              </span>
            </div>
          </div>

          {/* Pastilla de estado o logro */}
          {tag && (
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/15 text-blue-200 border border-blue-400/30 shrink-0">
              {tag}
            </span>
          )}
        </div>

        {/* Estrellas doradas */}
        <div className="flex items-center gap-1">
          {Array.from({ length: rating }).map((_, i) => (
            <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          ))}
          <span className="ml-1 text-[11px] font-bold text-amber-300/90">5.0</span>
        </div>

        {/* Cuerpo de la reseña */}
        <p className="text-sm text-slate-200/90 leading-relaxed font-normal">
          {body}
        </p>
      </div>
    </div>
  );
};

const VerticalMarqueeDemo = () => {
  return (
    <div className="relative flex h-[560px] w-full flex-row items-center justify-center overflow-hidden">
      <div className="flex flex-row items-center justify-center w-full gap-5 px-4 h-full">
        {/* Columna 1 */}
        <div className="comunidad-marquee-col h-full flex-1 hidden sm:flex">
          <Marquee
            pauseOnHover
            vertical
            className="[--duration:26s] h-full w-full"
          >
            {reviews
              .filter((_, i) => i % 3 === 0)
              .map((review, idx) => (
                <ReviewCard key={idx} {...review} />
              ))}
          </Marquee>
        </div>

        {/* Columna 2 (Reversa) */}
        <div className="comunidad-marquee-col h-full flex-1 hidden sm:flex">
          <Marquee
            reverse
            pauseOnHover
            vertical
            className="[--duration:26s] h-full w-full"
          >
            {reviews
              .filter((_, i) => i % 3 === 1)
              .map((review, idx) => (
                <ReviewCard key={idx} {...review} />
              ))}
          </Marquee>
        </div>

        {/* Columna 3 */}
        <div className="comunidad-marquee-col h-full flex-1 hidden lg:flex">
          <Marquee
            pauseOnHover
            vertical
            className="[--duration:26s] h-full w-full"
          >
            {reviews
              .filter((_, i) => i % 3 === 2)
              .map((review, idx) => (
                <ReviewCard key={idx} {...review} />
              ))}
          </Marquee>
        </div>

        {/* Vista Móvil */}
        <div className="comunidad-marquee-col h-full flex-1 sm:hidden flex">
          <Marquee
            pauseOnHover
            vertical
            className="[--duration:26s] h-full w-full"
          >
            {reviews.map((review, idx) => (
              <ReviewCard key={idx} {...review} />
            ))}
          </Marquee>
        </div>
      </div>

      {/* Máscaras de desvanecimiento superior e inferior perfectamente integradas */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#060b1e] via-[#060b1e]/80 to-transparent z-10" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#060b1e] via-[#060b1e]/80 to-transparent z-10" />
    </div>
  );
};

export default VerticalMarqueeDemo;
export { VerticalMarqueeDemo, ReviewCard };
