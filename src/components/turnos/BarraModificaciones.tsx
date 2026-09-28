"use client";

// Barra de modificaciones de un turno (HU-TUR-02, paso 1 de EditarTurnoModal).
//
// Por qué segmentada y no circular: el skill `ui-ux-pro-max` ubica el gauge
// circular en "Performance vs Target — single KPI against a target, dashboard
// summary context" y exige el valor numérico al lado; para progreso en un
// proceso la guía dice "step indicators or progress bar". Acá el dato NO es un
// porcentaje contra un target sino un conteo discreto de unidades, y como el
// tope viene de `parametro.max_modificaciones_turno` (hoy 2, mañana 3), una
// barra de N segmentos escala sola: cada segmento es una modificación usada.
// Con tope 2 la barra es literalmente el grafico de pasos (1 de 2 = 1 llena).
//
// Reglas que respeta:
//  · El texto "Modificaciones: N de M permitidas" es obligatorio y visible: el
//    color nunca es la única señal (WCAG 1.4.1) y el `role="progressbar"` lleva
//    `aria-valuetext` para lectores de pantalla.
//  · `on-surface` para el número (contraste alto) y `on-surface-variant` para
//    la ayuda: nunca sobre `surface-container-high`, que es donde ese token
//    cae a 3.6:1 (ver docs/errores-comunes.md).
//  · Sin fondo propio: vive sobre la superficie del modal y no inventa un
//    contenedor nuevo.

interface BarraModificacionesProps {
  /** Modificaciones ya usadas (viene del turno: `cantidadModificaciones`). */
  cantidad: number;
  /** Tope del sistema (`max_modificaciones_turno`). */
  maxModificaciones: number;
  /** Texto de la leyenda de abajo. Si se omite, no se muestra leyenda. */
  leyenda?: string;
}

export function BarraModificaciones({
  cantidad,
  maxModificaciones,
  leyenda,
}: BarraModificacionesProps) {
  const topadas = Math.min(cantidad, maxModificaciones);
  const alLimite = cantidad >= maxModificaciones;
  const restantes = maxModificaciones - cantidad;
  const ayuda = alLimite
    ? `Este turno ya alcanzó el máximo de ${maxModificaciones} modificaciones. Cancelá el turno y reservá uno nuevo.`
    : (leyenda ?? "");

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <p
          className={`text-xs font-bold ${alLimite ? "text-status-danger-strong" : "text-on-surface"}`}
        >
          Modificaciones: {cantidad} de {maxModificaciones} permitidas
        </p>
        <p className="text-xs font-medium text-on-surface-variant">
          {alLimite
            ? "Sin modificaciones disponibles"
            : `Te ${restantes === 1 ? "queda" : "quedan"} ${restantes}`}
        </p>
      </div>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={maxModificaciones}
        aria-valuenow={topadas}
        aria-valuetext={`${cantidad} de ${maxModificaciones} modificaciones permitidas${
          alLimite ? ", máximo alcanzado" : `, quedan ${restantes}`
        }`}
        aria-label="Modificaciones usadas"
        className="flex h-2 w-full gap-1"
      >
        {Array.from({ length: maxModificaciones }, (_, i) => (
          <span
            key={i}
            aria-hidden="true"
            className={`h-full flex-1 rounded-full ${
              i < topadas
                ? alLimite
                  ? "bg-status-danger-strong"
                  : "bg-primary"
                : "bg-surface-container-high"
            }`}
          />
        ))}
      </div>

      {ayuda !== "" && (
        <p className="text-xs font-medium text-on-surface-variant">{ayuda}</p>
      )}
    </div>
  );
}
