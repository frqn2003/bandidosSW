import type { MateriaResponse, DuracionClase } from "@/contracts/materia";
import type { MateriaRow } from "./materia.types";

/**
 * Traduce una fila cruda de Postgres al objeto tipado que espera la API / front.
 * 
 * Reglas de conversión:
 *  1. `valor_clase`: numeric(12,2) llega como string desde pg → se convierte con Number().
 *  2. `created_at` / `updated_at`: se convierten a string ISO 8601.
 *  3. `descripcion`: null se preserva como string | null según el contrato.
 */
export function toApi(row: MateriaRow): MateriaResponse {
  return {
    id: row.id,
    nombre: row.nombre,
    nivel: row.nivel,
    descripcion: row.descripcion ?? null,
    duracionClaseMinutos: row.duracion_clase_minutos as DuracionClase,
    valorClase: Number(row.valor_clase),
    estado: row.estado,
    fechaCreacion:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
    fechaActualizacion:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : String(row.updated_at),
  };
}

export function toApiList(rows: MateriaRow[]): MateriaResponse[] {
  return rows.map(toApi);
}
