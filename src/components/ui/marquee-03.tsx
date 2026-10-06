import { Card, CardContent } from "@/components/ui/card";
import { Marquee } from "@/components/ui/marquee-03-utils/marquee";

type Review = {
  name: string;
  username: string;
  body: string;
  profile: string;
};

const reviews: Review[] = [
  {
    name: "Sofía Martínez",
    username: "@smartinez • Ing. Informática",
    body: "“El acompañamiento personalizado fue clave para que pudiera promocionar materias difíciles. La plataforma es intuitiva y me ordenó todo el semestre.”",
    profile: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
  },
  {
    name: "Lucas Benítez",
    username: "@lbenitez • Lic. en Sistemas",
    body: "“Empecé con dudas en materias numéricas, pero los tutores te explican con paciencia y casos reales. El seguimiento individual marca una diferencia enorme.”",
    profile: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&auto=format&fit=crop&q=80",
  },
  {
    name: "Camila Rodríguez",
    username: "@crodriguez • Diseño UX/UI",
    body: "“Los proyectos prácticos y las correcciones en vivo me permitieron armar un portfolio profesional mientras cursaba. 100% recomendado.”",
    profile: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80",
  },
  {
    name: "Mateo Fernández",
    username: "@mfernandez • Ciencia de Datos",
    body: "“Pude avanzar a mi propio ritmo con clases grabadas y consultas en directo. La mejor inversión para compatibilizar la facultad con mi trabajo.”",
    profile: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
  },
  {
    name: "Valentina Gómez",
    username: "@vgomez • Contador Público",
    body: "“El material de estudio es clarísimo y los docentes responden todas las consultas al instante. Aprobé mis dos finales en la primera mesa.”",
    profile: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80",
  },
  {
    name: "Nicolás Rossi",
    username: "@nrossi • Ing. Industrial",
    body: "“La metodología de resolución de exámenes de años anteriores te da una seguridad tremenda para rendir. Muy agradecido con el equipo de Nexo.”",
    profile: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80",
  },
  {
    name: "Julieta Álvarez",
    username: "@jalvarez • Bioquímica",
    body: "“Las tutorías grupales y los resúmenes interactivos me salvaron el cuatrimestre. La calidad humana y técnica de los profes es insuperable.”",
    profile: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=100&auto=format&fit=crop&q=80",
  },
  {
    name: "Tomás Herrera",
    username: "@therrera • Lic. en Administración",
    body: "“Increíble experiencia de aprendizaje. Las clases son dinámicas, concisas y van directo a los puntos que toman en los parciales.”",
    profile: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&auto=format&fit=crop&q=80",
  },
  {
    name: "Florencia Díaz",
    username: "@fdiaz • Medicina",
    body: "“El cronograma organizado y las autoevaluaciones me permitieron llegar al examen con todos los temas afianzados. No duden en sumarse.”",
    profile: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80",
  },
];

const ReviewCard = ({ profile, name, username, body }: Review) => {
  return (
    <Card className="relative w-full max-w-sm cursor-pointer overflow-hidden border border-white/10 bg-slate-900/90 text-white shadow-lg p-5 rounded-2xl transition-all duration-300 hover:border-white/25 hover:bg-slate-800/90">
      <CardContent className="p-0 flex flex-col gap-2.5">
        <div className="flex flex-row items-center gap-3">
          <img
            className="rounded-full w-9 h-9 object-cover border border-white/20"
            width="36"
            height="36"
            alt={name}
            src={profile}
          />
          <div className="flex flex-col">
            <p className="text-sm font-semibold text-white leading-tight">{name}</p>
            <p className="text-xs text-blue-300 font-medium leading-tight mt-0.5">
              {username}
            </p>
          </div>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed font-normal">{body}</p>
      </CardContent>
    </Card>
  );
};

const VerticalMarqueeDemo = () => {
  return (
    <div className="relative flex h-[520px] w-full flex-row items-center justify-center overflow-hidden">
      <div className="flex flex-row items-center justify-center w-full gap-5 px-4 h-full">
        {/* Columna 1 */}
        <Marquee
          pauseOnHover
          vertical
          className="[--duration:24s] h-full sm:flex hidden flex-1"
        >
          {reviews
            .filter((_, i) => i % 3 === 0)
            .map((review, idx) => (
              <ReviewCard key={idx} {...review} />
            ))}
        </Marquee>
        
        {/* Columna 2 (Reversa) */}
        <Marquee
          reverse
          pauseOnHover
          vertical
          className="[--duration:24s] h-full hidden sm:flex flex-1"
        >
          {reviews
            .filter((_, i) => i % 3 === 1)
            .map((review, idx) => (
              <ReviewCard key={idx} {...review} />
            ))}
        </Marquee>
        
        {/* Columna 3 */}
        <Marquee
          pauseOnHover
          vertical
          className="[--duration:24s] h-full hidden lg:flex flex-1"
        >
          {reviews
            .filter((_, i) => i % 3 === 2)
            .map((review, idx) => (
              <ReviewCard key={idx} {...review} />
            ))}
        </Marquee>
        
        {/* Vista Móvil */}
        <Marquee
          pauseOnHover
          vertical
          className="[--duration:24s] h-full sm:hidden flex flex-1"
        >
          {reviews.map((review, idx) => (
            <ReviewCard key={idx} {...review} />
          ))}
        </Marquee>
      </div>
      
      {/* Máscaras de desvanecimiento superior e inferior */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-slate-950 to-transparent z-10"></div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-slate-950 to-transparent z-10"></div>
    </div>
  );
};

export default VerticalMarqueeDemo;
export { VerticalMarqueeDemo, ReviewCard };
