// Helpers compartidos del módulo Cuerpo Docente (HU-PRO-01).
// Conversión franjas ↔ bloquesPorDia, cálculos de carga horaria y utilidades
// de presentación que reutilizan la tabla, la ficha, el form y la agenda.

import type { Profesor } from "@/data/profesores";

/**
 * Franja horaria del formulario de disponibilidad. `dia` es 1-6 (ISO, Lun-Sáb).
 *
 * `desde` y `hasta` arrancan en "" (sin elegir): el orden de carga es
 * obligatorio — primero la hora de inicio y recién después la de fin, que solo
 * ofrece horarios posteriores. Ver `horariosHasta`.
 */
export interface FranjaForm {
  id: number;
  dia: string; // "1".."6"
  desde: string; // "" | "HH:MM"
  hasta: string; // "" | "HH:MM"
}

let siguienteIdFranja = 1;

export function nuevoIdFranja(): number {
  return siguienteIdFranja++;
}

/** Franja vacía para agregar a la lista: el día viene puesto, las horas no. */
export function nuevaFranja(dia = "1"): FranjaForm {
  return { id: nuevoIdFranja(), dia, desde: "", hasta: "" };
}

/** Horarios cada 30 min, de 08:00 a 19:30 (rango de atención de la sede). */
export const HORARIOS_OPCIONES: string[] = Array.from({ length: 24 }, (_, i) => {
  const h = 8 + Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
});

export const DIAS_SEMANA_LARGOS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

export const DIAS_SEMANA_CORTOS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export const DIAS_SEMANA_SELECT = [
  { value: "1", label: "Lunes" },
  { value: "2", label: "Martes" },
  { value: "3", label: "Miércoles" },
  { value: "4", label: "Jueves" },
  { value: "5", label: "Viernes" },
  { value: "6", label: "Sábado" },
];

export function aMin(h: string): number {
  const [hh, mm] = h.split(":").map(Number);
  return hh * 60 + mm;
}

/**
 * Horarios válidos para la hora de FIN de una franja: solo los posteriores a la
 * de inicio. Sin inicio elegido no hay opciones — el select queda deshabilitado.
 */
export function horariosHasta(desde: string): string[] {
  if (!desde) return [];
  return HORARIOS_OPCIONES.filter((h) => aMin(h) > aMin(desde));
}

/** Horas de una franja (1 decimal). 0 si está incompleta o al revés. */
export function horasEntre(desde: string, hasta: string): number {
  if (!desde || !hasta) return 0;
  const diff = (aMin(hasta) - aMin(desde)) / 60;
  return diff > 0 ? Math.round(diff * 10) / 10 : 0;
}

export function horaMasMin(h: string, minutos: number): string {
  const total = aMin(h) + minutos;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** Horas de un rango "HH:MM-HH:MM" (diferencia en horas, 1 decimal). */
export function horasDeRango(rango: string): number {
  const [desde, hasta] = rango.split("-");
  const diff = (aMin(hasta) - aMin(desde)) / 60;
  return Math.round(diff * 10) / 10;
}

/** Carga horaria semanal TOTAL del profesor (suma de todos sus rangos). */
export function cargaHorariaSemanal(p: Profesor): number {
  const total = Object.values(p.bloquesPorDia)
    .flat()
    .reduce((acc, r) => acc + horasDeRango(r), 0);
  return Math.round(total * 10) / 10;
}

/** Días distintos con al menos un bloque activo. */
export function jornadasConBloques(p: Profesor): number {
  return Object.values(p.bloquesPorDia).filter((rangos) => rangos.length > 0).length;
}

/** Capacidad global del profesor: el front usa profesor_materia.capacidad_maxima. */
export function capacidadMaxDe(p: Profesor): number {
  if (p.materias.length === 0) return 4;
  return Math.max(...p.materias.map((m) => m.capacidadMaxima));
}

/** "1155555555" → "11-5555-5555" (últimos 8 dígitos partidos 4-4). */
export function formatearTelefono(tel: string): string {
  if (tel.length < 10) return tel;
  const cabeza = tel.slice(0, tel.length - 8);
  const m1 = tel.slice(tel.length - 8, tel.length - 4);
  const m2 = tel.slice(tel.length - 4);
  return `${cabeza}-${m1}-${m2}`;
}

/** "2024-03-15" → "15/03/2024". */
export function formatearFecha(fechaIso: string): string {
  const d = new Date(`${fechaIso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return fechaIso;
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** bloquesPorDia ("HH:MM-HH:MM") → franjas del form. */
export function franjasDesdeBloques(bloques: Record<number, string[]>): FranjaForm[] {
  const franjas: FranjaForm[] = [];
  for (const [dia, rangos] of Object.entries(bloques)) {
    for (const rango of rangos) {
      const [desde, hasta] = rango.split("-");
      franjas.push({ id: nuevoIdFranja(), dia, desde, hasta });
    }
  }
  return franjas;
}

/**
 * Validación de franjas: horas completas, fin posterior al inicio y sin
 * superposición por día. Una franja a medias se señala sola y no entra en el
 * chequeo de superposición (no hay con qué compararla).
 */
export function validarFranjas(franjas: FranjaForm[]): Record<string, string> {
  const errores: Record<string, string> = {};
  for (const f of franjas) {
    if (!f.desde) {
      errores[f.id] = "Elegí la hora de inicio";
    } else if (!f.hasta) {
      errores[f.id] = "Elegí la hora de fin";
    } else if (aMin(f.hasta) <= aMin(f.desde)) {
      errores[f.id] = "La hora de fin debe ser posterior al inicio";
    }
  }
  const completas = franjas.filter((f) => f.desde && f.hasta);
  for (let i = 0; i < completas.length; i++) {
    const f = completas[i];
    if (errores[f.id]) continue;
    for (let j = 0; j < completas.length; j++) {
      if (i === j) continue;
      const g = completas[j];
      if (f.dia === g.dia && aMin(f.desde) < aMin(g.hasta) && aMin(f.hasta) > aMin(g.desde)) {
        errores[f.id] = "Se superpone con otra franja";
        break;
      }
    }
  }
  return errores;
}

/** franjas del form → bloquesPorDia ("HH:MM-HH:MM"). */
export function bloquesDesdeFranjas(franjas: Array<Omit<FranjaForm, "id">>): Record<number, string[]> {
  const bloques: Record<number, string[]> = {};
  for (const f of franjas) {
    if (!f.desde || !f.hasta) continue; // franja a medias: la validación ya la frenó
    const dia = Number(f.dia);
    if (!bloques[dia]) bloques[dia] = [];
    bloques[dia].push(`${f.desde}-${f.hasta}`);
  }
  return bloques;
}

export function inicialesDe(nombre: string, apellido: string): string {
  return `${nombre.trim().charAt(0)}${apellido.trim().charAt(0)}`.toUpperCase();
}

// Tonos de avatar: tonalidades del tema (fondo /20 + texto del color fuerte).
export const TONOS_AVATAR = [
  "bg-primary/20 text-primary",
  "bg-secondary/20 text-on-secondary-fixed-variant",
  "bg-tertiary/20 text-on-tertiary-container",
  "bg-status-success/20 text-status-success-strong",
  "bg-status-warning/20 text-status-warning-strong",
  "bg-status-danger/20 text-status-danger-strong",
];

export function tonoAvatarDe(id: number): string {
  return TONOS_AVATAR[(id - 1) % TONOS_AVATAR.length];
}