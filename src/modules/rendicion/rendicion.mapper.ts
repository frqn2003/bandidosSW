import type {
  EstadoClaseRendicion,
  RendicionItemResponse,
  RendicionMateriaResponse,
  RendicionResponse,
} from "@/contracts/rendicion";
import type { ProfesorRow, RendicionDetalleRow, RendicionPendienteRow } from "./rendicion.types";

/** Suma en centavos para no arrastrar error de punto flotante. */
const sumar = (valores: number[]) => Math.round(valores.reduce((a, v) => a + v * 100, 0)) / 100;

function itemToApi(r: RendicionDetalleRow): RendicionItemResponse {
  return {
    turnoId: r.turno_id,
    fechaClase: r.fecha_clase.slice(0, 10),
    alumno: { id: r.alumno_id, nombre: r.alumno_nombre, apellido: r.alumno_apellido },
    importeCobrado: Number(r.importe_cobrado),
    medioPago: r.medio_pago,
    comprobante: r.comprobante ?? "",
    fechaPago: r.fecha_pago.slice(0, 10),
    estadoClase: r.estado_clase as EstadoClaseRendicion,
  };
}

/** Agrupa por materia (ya vienen ordenadas por nombre) con subtotal y total rendido. */
export function rendicionToApi(
  profesor: ProfesorRow,
  desde: string,
  hasta: string,
  detalle: RendicionDetalleRow[],
  pendientes: RendicionPendienteRow[],
): RendicionResponse {
  const porMateria = new Map<number, RendicionMateriaResponse>();
  for (const r of detalle) {
    let grupo = porMateria.get(r.materia_id);
    if (!grupo) {
      grupo = { materia: { id: r.materia_id, nombre: r.materia }, clases: 0, subtotal: 0, items: [] };
      porMateria.set(r.materia_id, grupo);
    }
    grupo.items.push(itemToApi(r));
  }

  const materias = [...porMateria.values()].map((g) => ({
    ...g,
    clases: g.items.length,
    subtotal: sumar(g.items.map((i) => i.importeCobrado)),
  }));

  const listaPendientes = pendientes.map((r) => ({
    turnoId: r.turno_id,
    fechaClase: r.fecha_clase.slice(0, 10),
    alumno: { id: r.alumno_id, nombre: r.alumno_nombre, apellido: r.alumno_apellido },
    materia: { id: r.materia_id, nombre: r.materia },
    importePendiente: Number(r.importe_pendiente),
    estadoClase: r.estado_clase as EstadoClaseRendicion,
  }));

  return {
    profesor: { id: profesor.id, nombre: profesor.nombre, apellido: profesor.apellido },
    desde,
    hasta,
    materias,
    totalRendido: sumar(materias.map((m) => m.subtotal)),
    pendientes: listaPendientes,
    totalPendiente: sumar(listaPendientes.map((p) => p.importePendiente)),
  };
}
