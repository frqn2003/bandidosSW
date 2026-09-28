"use client";

// Contador de modificaciones de un turno (HU-TUR-02).
// Formato `cantidad/máximo` directo (ej. 0/2, 1/2, 2/2). El valor accesible
// describe la fracción; el máximo llega del back/fixture.
interface ContadorModificacionesProps {
  cantidad: number;
  /** Tope del sistema (máximo de modificaciones por turno). */
  maxModificaciones: number;
}

export function ContadorModificaciones({ cantidad, maxModificaciones }: ContadorModificacionesProps) {
  return (
    <span
      className="text-sm font-semibold tabular-nums text-on-surface"
      title={`${cantidad} de ${maxModificaciones} ${maxModificaciones === 1 ? "modificación" : "modificaciones"}`}
      aria-label={`${cantidad} de ${maxModificaciones} modificaciones`}
    >
      {cantidad}/{maxModificaciones}
    </span>
  );
}