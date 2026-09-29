// src/funciones/fechas-calendario.ts
//
// Helper de fechas del calendario (HU-CAL-02). Vive en `funciones/` y NO en
// `data/` porque es lógica de presentación pura: no hace fetch, no conoce tipos
// de contrato. `data/calendario.ts` reexporta los que ya se usaban desde ahí
// (`aISO`, `lunesDe`, `sumarDias`) para no romper imports de otros componentes.
//
// Regla de la casa: el calendario es LUNES a SÁBADO (tabla `agenda_semanal` con
// CHECK `dia_semana BETWEEN 1 AND 6`). Por eso `lunesDe` y `celdasDelMes` arrancan
// el lunes, y el domingo se trata como día sin atención.

export const MESES_CORTOS = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
] as const;

export const MESES_LARGOS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
] as const;

export const DIAS_SEMANA_CORTOS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;

export const DIAS_SEMANA_LARGOS = [
  "lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo",
] as const;

/** `Date` → `"2026-10-05"`. Local, sin `toISOString()` (que UTC-correa el día). */
export function aISO(fecha: Date): string {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const d = String(fecha.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** `"2026-10-05"` → `Date` a medianoche local. */
export function aDate(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

/** Suma días a un ISO. Negativo para retroceder. */
export function sumarDias(iso: string, dias: number): string {
  const f = aDate(iso);
  f.setDate(f.getDate() + dias);
  return aISO(f);
}

/** Lunes de la semana de `iso` (semana ISO: lunes = 1). */
export function lunesDe(iso: string): string {
  const f = aDate(iso);
  const dow = f.getDay() === 0 ? 7 : f.getDay();
  return sumarDias(iso, 1 - dow);
}

/** `"15:30"` → 930. Para ordenar y comparar franjas. */
export function aMin(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

/** 930 → `"15:30"`. Inverso de `aMin`, para pintar el encabezado de la grilla. */
export function minAHora(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

/** Últimos 6 dígitos, sin guiones ni letras: el código de turno se ve `TUR-482913`. */
export function codigoCorto(fecha: string, id: number): string {
  return `TUR-${fecha.replace(/-/g, "").slice(2)}${String(id).padStart(2, "0")}`;
}

/** `"2026-10-05"` → `"Lun 5 Oct"`. Encabezado de columna de la grilla semanal. */
export function diaCorto(iso: string): string {
  const f = aDate(iso);
  return `${DIAS_SEMANA_CORTOS[(f.getDay() + 6) % 7]} ${f.getDate()} ${MESES_CORTOS[f.getMonth()]}`;
}

/** `"2026-10-05"` → `"5 de octubre de 2026"`. Títulos y printing. */
export function fechaLarga(iso: string): string {
  const f = aDate(iso);
  return `${f.getDate()} de ${MESES_LARGOS[f.getMonth()]} de ${f.getFullYear()}`;
}

/** `"2026-10-05"` → `"lunes 5/10"`. Rango del encabezado de impresión. */
export function diaNumerico(iso: string): string {
  const f = aDate(iso);
  return `${DIAS_SEMANA_LARGOS[(f.getDay() + 6) % 7]} ${f.getDate()}/${f.getMonth() + 1}`;
}

/** `"2026-10-05"` → `"octubre de 2026"`. Título de la vista Mes. */
export function mesLargo(anio: number, mes1a12: number): string {
  return `${MESES_LARGOS[mes1a12 - 1]} de ${anio}`;
}

/** ISO del primer día del mes. */
export function primerDiaDelMes(anio: number, mes1a12: number): string {
  return `${anio}-${String(mes1a12).padStart(2, "0")}-01`;
}

/**
 * Celdas de la vista Mes: 6 semanas de lunes a domingo que cubren el mes.
 * Se devuelven 42 siempre (no 35) para que la grilla no cambie de alto al pasar
 * de un mes de 5 filas a uno de 6 — si el alto salta, el layout "salta".
 * `enMes: false` marca los días de relleno, que se muestran apagados.
 */
export function celdasDelMes(anio: number, mes1a12: number): { fecha: string; enMes: boolean }[] {
  const primero = primerDiaDelMes(anio, mes1a12);
  const inicio = lunesDe(primero);
  const celdas: { fecha: string; enMes: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const fecha = sumarDias(inicio, i);
    celdas.push({ fecha, enMes: aDate(fecha).getMonth() === mes1a12 - 1 });
  }
  return celdas;
}

/** ¿Hoy es domingo? El calendario no muestra atención los domingos. */
export function esDomingo(iso: string): boolean {
  return aDate(iso).getDay() === 0;
}

/** ¿La fecha ya pasó? Se usa para no ofrecer reservar/reservas en el pasado. */
export function esPasado(iso: string, hoy: string): boolean {
  return iso < hoy;
}

/**
 * ¿Esta franja libre todavía se puede reservar? Regla: **de ahora en adelante**.
 *
 * El corte va por la hora de INICIO, no por la de fin. Con `horaFin` una franja
 * en curso seguía offered: a las 10:15 se podía abrir el modal de un
 * "Disponible 10:00 - 11:00" y crear un turno que arrancaba en el pasado. Hoy
 * el modal solo comparaba fechas (`esPasado`), así que un turno empezado
 * hace diez minutos pasaba el control entero.
 *
 * Se decide por el INICIO y no por el fin a propósito: una franja que empieza
 * exactamente ahora todavía se puede tomar.
 */
export function franjaReservable(
  fecha: string,
  horaInicio: string,
  hoy: string,
  minutoAhora: number,
): boolean {
  if (fecha < hoy) return false;
  if (fecha > hoy) return true;
  return aMin(horaInicio) > minutoAhora;
}
