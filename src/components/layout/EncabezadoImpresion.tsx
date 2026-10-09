"use client";

interface EncabezadoImpresionProps {
  titulo: string;
  subtitulo?: string;
  filtrosAplicados?: string[];
}

export function EncabezadoImpresion({
  titulo,
  subtitulo,
  filtrosAplicados = [],
}: EncabezadoImpresionProps) {
  const fechaEmision = new Date().toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="hidden border-b border-outline-variant pb-4 mb-6 print:flex print:items-center print:justify-between">
      <div className="flex items-center gap-3">
        <img
          src="/logo-centro-academico.png"
          alt="Logo Institucional"
          width={48}
          height={48}
          className="h-12 w-12 shrink-0 rounded-sm object-cover"
        />
        <div>
          <h1 className="text-lg font-bold text-primary">Nexo Académico</h1>
          <h2 className="text-base font-semibold text-on-surface">{titulo}</h2>
          {subtitulo && <p className="text-xs text-on-surface-variant">{subtitulo}</p>}
        </div>
      </div>
      <div className="text-right text-xs text-on-surface-variant">
        <p className="font-medium">Emisión: {fechaEmision}</p>
        {filtrosAplicados.length > 0 && (
          <p className="mt-0.5 italic">Filtros: {filtrosAplicados.join(" · ")}</p>
        )}
      </div>
    </div>
  );
}
