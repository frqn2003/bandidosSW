// src/funciones/estado-turno.ts
//
// Estado "visible" de un turno para la pantalla de listado (HU-TUR-02).
//
// La base solo conoce 'Reservado' y 'Cancelado'. El estado **Finalizado** no
// existe como columna: es un Reservado cuya fecha de clase ya pasó. Se resuelve
// acá, en el navegador, siempre dentro de un rango de fechas acotado (nunca un
// listado abierto), tal como se decidió en la auditoría de HU-TUR-02.
//
// Regla (decisión 1 del brief): comparación por día de calendario en huso AR —
// un turno de HOY se muestra Reservado (su clase todavía no terminó el día);
// cualquier turno de un día anterior se muestra Finalizado.

import { hoyAR } from "@/contracts/alumno";
import type { EstadoTurno } from "@/contracts/turno";

export type EstadoTurnoVisible = "Reservado" | "Finalizado" | "Cancelado";

/** "Reservado" | "Finalizado" | "Cancelado" — el estado que se muestra. */
export function estadoVisibleDe(turno: { estado: EstadoTurno; fecha: string }): EstadoTurnoVisible {
  if (turno.estado === "Cancelado") return "Cancelado";
  return turno.fecha < hoyAR() ? "Finalizado" : "Reservado";
}