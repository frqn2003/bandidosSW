"use client";

// Contador de modificaciones de un turno (HU-TUR-02).
// Formato `cantidad/máximo` directo (ej. 0/2, 1/2, 2/2). El valor accesible
// describe la fracción; el máximo llega del back/fixture.
//
// Al llegar al tope, la fracción pasa a `status-danger-strong` (#dc2626, 4.83:1
// sobre `surface-container-lowest`): el `-strong` es la variante de texto sobre
// claro, el `status-danger` pelado se queda en 3.7:1 y no alcanza para 14 px.
// El rojo no puede ser la única señal, por eso el `aria-label` suma
// "máximo alcanzado" (WCAG 1.4.1).
interface ContadorModificacionesProps {
  cantidad: number;
  /** Tope del sistema (máximo de modificaciones por turno). */
  maxModificaciones: number;
}

export function ContadorModificaciones({ cantidad, maxModificaciones }: ContadorModificacionesProps) {
  const alLimite = cantidad >= maxModificaciones;
  return (
    <span
      className={`text-sm font-semibold tabular-nums ${alLimite ? "text-status-danger-strong" : "text-on-surface"}`}
      title={`${cantidad} de ${maxModificaciones} ${maxModificaciones === 1 ? "modificación" : "modificaciones"}${alLimite ? " — máximo alcanzado" : ""}`}
      aria-label={`${cantidad} de ${maxModificaciones} modificaciones${alLimite ? ", máximo alcanzado" : ""}`}
    >
      {cantidad}/{maxModificaciones}
    </span>
  );
}