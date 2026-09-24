// Utilidades de presentación compartidas por todos los módulos.
//
// Nacieron en `src/lib/profesores.ts` (HU-PRO-01) y se extrajeron acá en
// HU-ALU-01: no tienen nada de Cuerpo Docente, y que Alumnos importara de
// `@/lib/profesores` para formatear un teléfono era acoplar dos módulos que no
// tienen relación. `lib/profesores.ts` las re-exporta, así sus consumidores no
// se enteran del cambio.

/**
 * Teléfono de 10 u 11 dígitos con separadores legibles.
 *
 *   "1155555555"  (10) → "11-5555-555"   ✗  ← lo que hacía antes
 *   "1155555555"  (10) → "115-555-5555"  ✓
 *   "3874556677"  (10) → "387-455-6677"  ✓  (código de área de 3 + 3 + 4)
 *   "11555555555" (11) → "11-5555-5555"  ✓  (móvil: 2 + 4 + 4)
 *
 * El corte 4-4 de los últimos 8 dígitos solo es correcto para los números de
 * 11 dígitos; con 10 partía el número en el lugar equivocado.
 */
export function formatearTelefono(tel: string): string {
  const digitos = tel.replace(/\D/g, "");
  if (digitos.length === 11) {
    return `${digitos.slice(0, 2)}-${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  }
  if (digitos.length === 10) {
    return `${digitos.slice(0, 3)}-${digitos.slice(3, 6)}-${digitos.slice(6)}`;
  }
  return tel;
}

/** "2024-03-15" → "15/03/2024". Acepta fecha o timestamp ISO. */
export function formatearFecha(fechaIso: string): string {
  const soloFecha = fechaIso.slice(0, 10);
  const d = new Date(`${soloFecha}T00:00:00`);
  if (Number.isNaN(d.getTime())) return fechaIso;
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Años cumplidos a la fecha de hoy. Misma cuenta que `age()` en Postgres. */
export function edadEnAnios(fechaNacimiento: string): number {
  const nacimiento = new Date(`${fechaNacimiento.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(nacimiento.getTime())) return Number.NaN;
  const hoy = new Date();
  let anios = hoy.getFullYear() - nacimiento.getFullYear();
  const mes = hoy.getMonth() - nacimiento.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) anios--;
  return anios;
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
