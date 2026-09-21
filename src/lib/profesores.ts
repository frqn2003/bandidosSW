// Helpers compartidos del módulo Cuerpo Docente (HU-PRO-01).
// Conversión franjas ↔ bloquesPorDia, cálculos de carga horaria y utilidades
// de presentación que reutilizan la tabla, la ficha, el form y la agenda.

import type { Profesor } from "@/data/profesores";

/** Franja horaria del formulario de disponibilidad. `dia` es 1-6 (ISO, Lun-Sáb). */
export interface FranjaForm {
  id: number;
  dia: string; // "1".."6"
  desde: string; // "HH:MM"
  hasta: string; // "HH:MM"
}

let siguienteIdFranja = 1;

export function nuevoIdFranja(): number {
  return siguienteIdFranja++;
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

/** Validación de franjas: fin posterior a inicio y sin superposición por día. */
export function validarFranjas(franjas: FranjaForm[]): Record<string, string> {
  const errores: Record<string, string> = {};
  for (const f of franjas) {
    if (aMin(f.hasta) <= aMin(f.desde)) {
      errores[f.id] = "La hora de fin debe ser posterior al inicio";
    }
  }
  for (let i = 0; i < franjas.length; i++) {
    const f = franjas[i];
    if (errores[f.id]) continue;
    for (let j = 0; j < franjas.length; j++) {
      if (i === j) continue;
      const g = franjas[j];
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