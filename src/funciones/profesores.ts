// Helpers compartidos del módulo Cuerpo Docente (HU-PRO-01).
// Conversión franjas ↔ bloquesPorDia, cálculos de carga horaria y utilidades
// de presentación que reutilizan la tabla, la ficha, el form y la agenda.

import type { Profesor } from "@/data/profesores";

// Utilidades de presentación genéricas: viven en `src/funciones/formato.ts` desde
// HU-ALU-01 (las usan también Alumnos y las próximas pantallas). Se re-exportan
// acá para no tocar a los consumidores que ya las importaban desde este módulo.
export {
  formatearTelefono,
  formatearFecha,
  edadEnAnios,
  inicialesDe,
  TONOS_AVATAR,
  tonoAvatarDe,
} from "@/funciones/formato";

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


