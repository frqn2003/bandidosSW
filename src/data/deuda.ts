// src/data/deuda.ts
//
// Capa de datos para HU-PAG-02: Listado de Deudores y Estado de Cuenta.
// Conecta con los endpoints del contrato src/contracts/deuda.ts y provee
// datos de prueba (fixtures) según docs/capa-de-datos-front.md y docs/contratos/cobranza.md.

import {
  RUTA_DEUDORES,
  rutaEstadoCuenta,
  type DeudoresResponse,
  type EstadoCuentaResponse,
  type ListarDeudoresQuery,
} from "@/contracts/deuda";
import { apiGet } from "@/lib/api-client";

export { RUTA_DEUDORES, rutaEstadoCuenta };
export type { DeudoresResponse, EstadoCuentaResponse, ListarDeudoresQuery };

// ─── Fixtures de prueba para desarrollo front ─────────────────────────────

const FIXTURE_DEUDORES: DeudoresResponse = {
  items: [
    {
      alumno: {
        id: 1,
        legajo: "ALU-000001",
        nombre: "Sofía",
        apellido: "Ramírez",
        dni: "40111222",
      },
      clasesAdeudadas: 4,
      montoAdeudado: 32000,
      fechaClaseMasAntigua: "2026-07-15",
      diasAntiguedad: 89,
      semaforo: "rojo",
    },
    {
      alumno: {
        id: 2,
        legajo: "ALU-000002",
        nombre: "Mateo",
        apellido: "Fernández",
        dni: "42333444",
      },
      clasesAdeudadas: 2,
      montoAdeudado: 18000,
      fechaClaseMasAntigua: "2026-08-20",
      diasAntiguedad: 53,
      semaforo: "naranja",
    },
    {
      alumno: {
        id: 3,
        legajo: "ALU-000003",
        nombre: "Valentina",
        apellido: "Gómez",
        dni: "43555666",
      },
      clasesAdeudadas: 1,
      montoAdeudado: 9500,
      fechaClaseMasAntigua: "2026-09-28",
      diasAntiguedad: 14,
      semaforo: "amarillo",
    },
    {
      alumno: {
        id: 4,
        legajo: "ALU-000004",
        nombre: "Lucas",
        apellido: "Álvarez",
        dni: "39888999",
      },
      clasesAdeudadas: 3,
      montoAdeudado: 24500,
      fechaClaseMasAntigua: "2026-08-10",
      diasAntiguedad: 63,
      semaforo: "rojo",
    },
    {
      alumno: {
        id: 5,
        legajo: "ALU-000005",
        nombre: "Camila",
        apellido: "Torres",
        dni: "41222333",
      },
      clasesAdeudadas: 1,
      montoAdeudado: 8000,
      fechaClaseMasAntigua: "2026-10-01",
      diasAntiguedad: 11,
      semaforo: "amarillo",
    },
  ],
  totalGeneral: 92000,
};

const FIXTURES_ESTADO_CUENTA: Record<number, EstadoCuentaResponse> = {
  1: {
    alumno: {
      id: 1,
      legajo: "ALU-000001",
      nombre: "Sofía",
      apellido: "Ramírez",
      dni: "40111222",
    },
    saldo: 32000,
    movimientos: [
      {
        tipo: "Clase",
        referenciaId: 101,
        referencia: "TUR-000101",
        fecha: "2026-07-15",
        hora: "15:00",
        detalle: "Matemática discreta - Prof. Gómez",
        cargo: 8000,
        credito: 0,
        afectaSaldo: true,
        saldoAcumulado: 8000,
        estado: "Asistió",
      },
      {
        tipo: "Clase",
        referenciaId: 102,
        referencia: "TUR-000102",
        fecha: "2026-07-22",
        hora: "15:00",
        detalle: "Matemática discreta - Prof. Gómez",
        cargo: 8000,
        credito: 0,
        afectaSaldo: true,
        saldoAcumulado: 16000,
        estado: "Asistió",
      },
      {
        tipo: "Pago",
        referenciaId: 501,
        referencia: "REC-000050",
        fecha: "2026-07-25",
        hora: "10:30",
        detalle: "Efectivo",
        cargo: 0,
        credito: 8000,
        afectaSaldo: false,
        saldoAcumulado: 16000,
        estado: "Anulado",
      },
      {
        tipo: "Clase",
        referenciaId: 103,
        referencia: "TUR-000103",
        fecha: "2026-08-05",
        hora: "16:00",
        detalle: "Álgebra - Prof. López",
        cargo: 8000,
        credito: 0,
        afectaSaldo: false,
        saldoAcumulado: 16000,
        estado: "Cancelado",
      },
      {
        tipo: "Clase",
        referenciaId: 104,
        referencia: "TUR-000104",
        fecha: "2026-08-12",
        hora: "16:00",
        detalle: "Álgebra - Prof. López",
        cargo: 8000,
        credito: 0,
        afectaSaldo: true,
        saldoAcumulado: 24000,
        estado: "Asistió",
      },
      {
        tipo: "Clase",
        referenciaId: 105,
        referencia: "TUR-000105",
        fecha: "2026-09-02",
        hora: "15:00",
        detalle: "Física I - Prof. Martínez",
        cargo: 8000,
        credito: 0,
        afectaSaldo: true,
        saldoAcumulado: 32000,
        estado: "Reservado",
      },
    ],
  },
  2: {
    alumno: {
      id: 2,
      legajo: "ALU-000002",
      nombre: "Mateo",
      apellido: "Fernández",
      dni: "42333444",
    },
    saldo: 18000,
    movimientos: [
      {
        tipo: "Clase",
        referenciaId: 201,
        referencia: "TUR-000201",
        fecha: "2026-08-20",
        hora: "17:00",
        detalle: "Química General - Prof. Rodríguez",
        cargo: 9000,
        credito: 0,
        afectaSaldo: true,
        saldoAcumulado: 9000,
        estado: "Asistió",
      },
      {
        tipo: "Clase",
        referenciaId: 202,
        referencia: "TUR-000202",
        fecha: "2026-09-10",
        hora: "17:00",
        detalle: "Química General - Prof. Rodríguez",
        cargo: 9000,
        credito: 0,
        afectaSaldo: true,
        saldoAcumulado: 18000,
        estado: "Asistió",
      },
    ],
  },
  3: {
    alumno: {
      id: 3,
      legajo: "ALU-000003",
      nombre: "Valentina",
      apellido: "Gómez",
      dni: "43555666",
    },
    saldo: 9500,
    movimientos: [
      {
        tipo: "Clase",
        referenciaId: 301,
        referencia: "TUR-000301",
        fecha: "2026-09-28",
        hora: "14:00",
        detalle: "Inglés Técnico - Prof. Smith",
        cargo: 9500,
        credito: 0,
        afectaSaldo: true,
        saldoAcumulado: 9500,
        estado: "Asistió",
      },
    ],
  },
};

// ─── Funciones asincrónicas de consumo ─────────────────────────────────────

/**
 * Consulta el listado de deudores y el total general según filtros aplicados.
 */
export async function listarDeudores(
  filtros: ListarDeudoresQuery = {}
): Promise<DeudoresResponse> {
  const params = new URLSearchParams();
  if (filtros.busqueda) params.set("busqueda", filtros.busqueda);
  if (filtros.antiguedad) params.set("antiguedad", filtros.antiguedad);
  if (filtros.materiaId) params.set("materiaId", String(filtros.materiaId));
  if (filtros.profesorId) params.set("profesorId", String(filtros.profesorId));

  const qs = params.toString();
  const url = qs ? `${RUTA_DEUDORES}?${qs}` : RUTA_DEUDORES;

  try {
    // BACKEND: cuando el endpoint /api/deudores esté conectado
    return await apiGet<DeudoresResponse>(url);
  } catch {
    // Fixture en memoria simulado respetando los filtros para el front
    let items = [...FIXTURE_DEUDORES.items];

    if (filtros.antiguedad) {
      if (filtros.antiguedad === "0-30") {
        items = items.filter((i) => i.semaforo === "amarillo");
      } else if (filtros.antiguedad === "31-60") {
        items = items.filter((i) => i.semaforo === "naranja");
      } else if (filtros.antiguedad === "mas-60") {
        items = items.filter((i) => i.semaforo === "rojo");
      }
    }

    if (filtros.busqueda) {
      const q = filtros.busqueda.toLowerCase().trim();
      items = items.filter(
        (i) =>
          i.alumno.nombre.toLowerCase().includes(q) ||
          i.alumno.apellido.toLowerCase().includes(q) ||
          i.alumno.dni.includes(q) ||
          i.alumno.legajo.toLowerCase().includes(q)
      );
    }

    const totalGeneral = items.reduce((sum, i) => sum + i.montoAdeudado, 0);
    return { items, totalGeneral };
  }
}

/**
 * Consulta el estado de cuenta y movimientos cronológicos de un alumno.
 */
export async function obtenerEstadoCuenta(
  alumnoId: number
): Promise<EstadoCuentaResponse> {
  try {
    // BACKEND: cuando /api/alumnos/:id/estado-cuenta esté conectado
    return await apiGet<EstadoCuentaResponse>(rutaEstadoCuenta(alumnoId));
  } catch {
    const fixture = FIXTURES_ESTADO_CUENTA[alumnoId];
    if (fixture) {
      return fixture;
    }
    // Fallback genérico para alumnos sin fixture específico
    return {
      alumno: {
        id: alumnoId,
        legajo: `ALU-${String(alumnoId).padStart(6, "0")}`,
        nombre: "Alumno",
        apellido: "Registrado",
        dni: "12345678",
      },
      saldo: 0,
      movimientos: [],
    };
  }
}
