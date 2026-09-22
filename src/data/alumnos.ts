// Capa de datos de Alumnos (HU-ALU-01) — front hardcodeado.
//
// La pantalla NO ve este array: habla con las funciones de abajo, que ya tienen
// la firma final (async, tipos del contrato, errores del contrato). El día que
// el back publique `/api/alumnos`, el cuerpo de cada función pasa a una línea de
// `apiGet`/`apiSend` y la pantalla no se toca — es lo que ya pasó con
// `src/data/materias.ts`.
//
// Patrón y checklist: docs/capa-de-datos-front.md
// Contrato: src/contracts/alumno.ts · Guía de uso: docs/contratos/alumno.md

import {
  RUTA,
  RUTA_POSIBLES_DUPLICADOS,
  rutaAlumno,
  type AlumnoResponse,
  type CrearAlumnoBody,
  type ListarAlumnosQuery,
  type NivelEducativo,
  type PosiblesDuplicadosQuery,
} from "@/contracts/alumno";
import { ApiError } from "@/lib/api-client";
import { edadEnAnios } from "@/lib/formato";

export type { AlumnoResponse, NivelEducativo };
export type EstadoAlumno = AlumnoResponse["estado"];

// Las rutas del contrato se re-exportan para que la pantalla no las importe de
// dos lados distintos.
export { RUTA, RUTA_POSIBLES_DUPLICADOS, rutaAlumno };


// ─── Helpers de dominio ──────────────────────────────────────────────────

/** Niveles del enum `nivel_materia`, que `alumno.nivel_educativo` reutiliza. */
export const NIVELES_EDUCATIVOS: NivelEducativo[] = [
  "Primario",
  "Secundario",
  "Universitario",
];

/** Un alumno es menor si no cumplió 18: define si el responsable es obligatorio. */
export const esMenorDeEdad = (fechaNacimiento: string) =>
  edadEnAnios(fechaNacimiento) < 18;

/** "Acosta, Julieta" — el orden con el que se lista y se ordena. */
export const nombreCompleto = (a: Pick<AlumnoResponse, "nombre" | "apellido">) =>
  `${a.apellido}, ${a.nombre}`;


// ─── Fixture: lo único que desaparece el día del back ────────────────────
//
// Se comporta como el servidor (ver docs/capa-de-datos-front.md): asigna el
// `id` y el `legajo`, aplica el default `estado = 'activo'`, valida el UNIQUE
// del DNI y devuelve copias.

/** `alumno.legajo` es GENERATED STORED: `'ALU-' || lpad(id, 6, '0')`. */
const legajoDe = (id: number) => `ALU-${String(id).padStart(6, "0")}`;

type FilaFixture = Omit<AlumnoResponse, "legajo" | "fechaActualizacion"> & {
  fechaActualizacion?: string;
};

const fila = (f: FilaFixture): AlumnoResponse => ({
  ...f,
  legajo: legajoDe(f.id),
  fechaActualizacion: f.fechaActualizacion ?? f.fechaCreacion,
});

const alta = (dia: number) =>
  `2026-03-${String(dia).padStart(2, "0")}T12:00:00.000Z`;

const FIXTURE: AlumnoResponse[] = [
  fila({ id: 1, nombre: "Julieta", apellido: "Acosta", dni: "45111222", fechaNacimiento: "2010-05-14", telefono: "3874556677", email: null, nivelEducativo: "Secundario", responsable: { nombre: "Marta Acosta", dni: "27333444", telefono: "3874556688" }, estado: "activo", fechaCreacion: alta(1) }),
  fila({ id: 2, nombre: "Mateo", apellido: "Benítez", dni: "48333444", fechaNacimiento: "2014-08-02", telefono: "3874112233", email: "familia.benitez@mail.com", nivelEducativo: "Primario", responsable: { nombre: "Laura Benítez", dni: "30111222", telefono: "3874112244" }, estado: "activo", fechaCreacion: alta(2) }),
  fila({ id: 3, nombre: "Lucía", apellido: "Cabrera", dni: "42555666", fechaNacimiento: "2001-11-20", telefono: "3874998877", email: "lucia.cabrera@mail.com", nivelEducativo: "Universitario", responsable: null, estado: "activo", fechaCreacion: alta(3) }),
  fila({ id: 4, nombre: "Tomás", apellido: "Díaz", dni: "47222111", fechaNacimiento: "2011-02-09", telefono: "3875443322", email: null, nivelEducativo: "Secundario", responsable: { nombre: "Sergio Díaz", dni: "28444555", telefono: "3875443311" }, estado: "activo", fechaCreacion: alta(4) }),
  fila({ id: 5, nombre: "Valentina", apellido: "Escobar", dni: "40888999", fechaNacimiento: "1998-06-30", telefono: "3874667788", email: "valen.escobar@mail.com", nivelEducativo: "Universitario", responsable: null, estado: "activo", fechaCreacion: alta(5) }),
  fila({ id: 6, nombre: "Bruno", apellido: "Ferreyra", dni: "49111000", fechaNacimiento: "2015-01-25", telefono: "3874221100", email: null, nivelEducativo: "Primario", responsable: { nombre: "Carla Ferreyra", dni: "31222333", telefono: "3874221155" }, estado: "activo", fechaCreacion: alta(6) }),
  fila({ id: 7, nombre: "Camila", apellido: "Gómez", dni: "46333222", fechaNacimiento: "2009-09-17", telefono: "3874556611", email: "cami.gomez@mail.com", nivelEducativo: "Secundario", responsable: { nombre: "Ana Gómez", dni: "29555666", telefono: "3874556622" }, estado: "activo", fechaCreacion: alta(7) }),
  fila({ id: 8, nombre: "Ignacio", apellido: "Herrera", dni: "43777888", fechaNacimiento: "2003-04-08", telefono: "3875112233", email: null, nivelEducativo: "Universitario", responsable: null, estado: "activo", fechaCreacion: alta(8) }),
  fila({ id: 9, nombre: "Delfina", apellido: "Ibarra", dni: "48555111", fechaNacimiento: "2013-12-03", telefono: "3874334455", email: "ibarra.flia@mail.com", nivelEducativo: "Primario", responsable: { nombre: "Nadia Ibarra", dni: "32111444", telefono: "3874334466" }, estado: "activo", fechaCreacion: alta(9) }),
  fila({ id: 10, nombre: "Santiago", apellido: "Juárez", dni: "45999000", fechaNacimiento: "2010-07-21", telefono: "3874778899", email: null, nivelEducativo: "Secundario", responsable: { nombre: "Pablo Juárez", dni: "27888999", telefono: "3874778800" }, estado: "activo", fechaCreacion: alta(10) }),
  fila({ id: 11, nombre: "Renata", apellido: "López", dni: "41222333", fechaNacimiento: "2000-03-12", telefono: "3875667788", email: "renata.lopez@mail.com", nivelEducativo: "Universitario", responsable: null, estado: "activo", fechaCreacion: alta(11) }),
  fila({ id: 12, nombre: "Thiago", apellido: "Maldonado", dni: "49333777", fechaNacimiento: "2016-10-05", telefono: "3874990011", email: null, nivelEducativo: "Primario", responsable: { nombre: "Belén Maldonado", dni: "33444555", telefono: "3874990022" }, estado: "activo", fechaCreacion: alta(12) }),
  fila({ id: 13, nombre: "Emilia", apellido: "Navarro", dni: "46777444", fechaNacimiento: "2008-11-28", telefono: "3874556699", email: "emi.navarro@mail.com", nivelEducativo: "Secundario", responsable: { nombre: "Gustavo Navarro", dni: "28999111", telefono: "3874556690" }, estado: "activo", fechaCreacion: alta(13) }),
  fila({ id: 14, nombre: "Bautista", apellido: "Ortiz", dni: "44111555", fechaNacimiento: "2005-02-14", telefono: "3875223344", email: null, nivelEducativo: "Secundario", responsable: { nombre: "Silvia Ortiz", dni: "29111222", telefono: "3875223355" }, estado: "activo", fechaCreacion: alta(14) }),
  fila({ id: 15, nombre: "Martina", apellido: "Paz", dni: "42999111", fechaNacimiento: "2002-08-19", telefono: "3874445566", email: "martina.paz@mail.com", nivelEducativo: "Universitario", responsable: null, estado: "activo", fechaCreacion: alta(15) }),
  fila({ id: 16, nombre: "Joaquín", apellido: "Quiroga", dni: "47555888", fechaNacimiento: "2012-05-07", telefono: "3874667700", email: null, nivelEducativo: "Primario", responsable: { nombre: "Diego Quiroga", dni: "30555777", telefono: "3874667711" }, estado: "activo", fechaCreacion: alta(16) }),
  fila({ id: 17, nombre: "Isabella", apellido: "Ramírez", dni: "45444333", fechaNacimiento: "2009-01-30", telefono: "3874112299", email: "isa.ramirez@mail.com", nivelEducativo: "Secundario", responsable: { nombre: "Noelia Ramírez", dni: "28333444", telefono: "3874112288" }, estado: "activo", fechaCreacion: alta(17) }),
  fila({ id: 18, nombre: "Lautaro", apellido: "Sosa", dni: "43111999", fechaNacimiento: "2004-06-23", telefono: "3875889900", email: null, nivelEducativo: "Universitario", responsable: null, estado: "activo", fechaCreacion: alta(18) }),
  fila({ id: 19, nombre: "Abril", apellido: "Torres", dni: "48999222", fechaNacimiento: "2013-03-11", telefono: "3874556644", email: "torres.flia@mail.com", nivelEducativo: "Primario", responsable: { nombre: "Romina Torres", dni: "31666888", telefono: "3874556655" }, estado: "activo", fechaCreacion: alta(19) }),
  fila({ id: 20, nombre: "Felipe", apellido: "Urquiza", dni: "46111777", fechaNacimiento: "2008-09-04", telefono: "3874778811", email: null, nivelEducativo: "Secundario", responsable: { nombre: "Marcos Urquiza", dni: "29777888", telefono: "3874778822" }, estado: "activo", fechaCreacion: alta(20) }),
  fila({ id: 21, nombre: "Catalina", apellido: "Vega", dni: "41777222", fechaNacimiento: "1999-12-15", telefono: "3874334477", email: "cata.vega@mail.com", nivelEducativo: "Universitario", responsable: null, estado: "activo", fechaCreacion: alta(21) }),
  // Inactivos: no aparecen en el listado por defecto (filtro Estado = Activos).
  fila({ id: 22, nombre: "Nahuel", apellido: "Wilson", dni: "44888111", fechaNacimiento: "2006-04-27", telefono: "3875445566", email: null, nivelEducativo: "Secundario", responsable: { nombre: "Elena Wilson", dni: "27999333", telefono: "3875445577" }, estado: "inactivo", fechaCreacion: alta(2), fechaActualizacion: alta(25) }),
  fila({ id: 23, nombre: "Zoe", apellido: "Yañez", dni: "47999444", fechaNacimiento: "2011-08-16", telefono: "3874221133", email: "zoe.yanez@mail.com", nivelEducativo: "Primario", responsable: { nombre: "Paula Yañez", dni: "32888111", telefono: "3874221144" }, estado: "inactivo", fechaCreacion: alta(3), fechaActualizacion: alta(26) }),
  fila({ id: 24, nombre: "Emanuel", apellido: "Zalazar", dni: "40333888", fechaNacimiento: "1997-10-09", telefono: "3874990033", email: null, nivelEducativo: "Universitario", responsable: null, estado: "inactivo", fechaCreacion: alta(4), fechaActualizacion: alta(27) }),
];

/** Copia del fixture que muta en memoria mientras no haya API. */
let memoria: AlumnoResponse[] = FIXTURE.map((a) => ({ ...a }));

/** Latencia simulada, para que los estados de carga se vean de verdad. */
const DEMORA_MS = 300;
const demorar = () => new Promise((r) => setTimeout(r, DEMORA_MS));

/** `?demo=error` fuerza el estado de error del listado, sin backend. */
const fallaForzada = () =>
  typeof window !== "undefined" && window.location.search.includes("demo=error");


// ─── API del módulo (firma final: no cambia cuando entra el back) ────────

/**
 * Listado de alumnos.
 *
 * Orden: Apellido y luego Nombre (A-Z), como pide la HU. Lo hace el back con
 * el índice `(apellido, nombre)`; acá se replica para que la pantalla no tenga
 * que ordenar.
 *
 * BACKEND: `return apiGet<AlumnoResponse[]>(\`${RUTA}?${params}\`)` con los
 * filtros de `listarAlumnosQuery` del contrato.
 */
export async function listarAlumnos(
  filtros: ListarAlumnosQuery = {},
): Promise<AlumnoResponse[]> {
  await demorar();
  if (fallaForzada()) {
    throw new ApiError("ERROR_DESCONOCIDO", "No se pudo cargar el listado.", undefined, 500);
  }

  const busqueda = filtros.busqueda?.trim().toLowerCase() ?? "";
  return memoria
    .filter((a) => {
      if (filtros.estado && a.estado !== filtros.estado) return false;
      if (filtros.nivelEducativo && a.nivelEducativo !== filtros.nivelEducativo) return false;
      // Buscador único: legajo, nombre, apellido o DNI; parcial y sin distinguir
      // mayúsculas/minúsculas.
      if (busqueda) {
        const campos = `${a.legajo} ${a.nombre} ${a.apellido} ${a.dni}`.toLowerCase();
        if (!campos.includes(busqueda)) return false;
      }
      return true;
    })
    .map((a) => ({ ...a }))
    .sort(
      (a, b) =>
        a.apellido.localeCompare(b.apellido, "es-AR") ||
        a.nombre.localeCompare(b.nombre, "es-AR"),
    );
}

/**
 * Detalle de un alumno.
 * BACKEND: `return apiGet<AlumnoResponse>(rutaAlumno(id))`.
 */
export async function verAlumno(id: number): Promise<AlumnoResponse> {
  await demorar();
  return { ...exigirAlumno(id) };
}

/**
 * Alta.
 * BACKEND: `return apiSend<AlumnoResponse>("POST", RUTA, body)`.
 * La bitácora del alta (usuario responsable, fecha y hora) la escribe el
 * trigger `fn_auditoria()` sobre la tabla `alumno`; el `usuarioId` sale de la
 * sesión, nunca del body.
 */
export async function crearAlumno(body: CrearAlumnoBody): Promise<AlumnoResponse> {
  await demorar();
  exigirDniLibre(body.dni);
  exigirResponsableSiEsMenor(body);

  const id = memoria.reduce((max, a) => Math.max(max, a.id), 0) + 1;
  const ahora = new Date().toISOString();
  const creado: AlumnoResponse = {
    id,
    legajo: legajoDe(id), // GENERATED STORED en la base
    nombre: body.nombre.trim(),
    apellido: body.apellido.trim(),
    dni: body.dni.trim(),
    fechaNacimiento: body.fechaNacimiento,
    telefono: body.telefono.trim(),
    email: body.email?.trim() ? body.email.trim() : null,
    nivelEducativo: body.nivelEducativo,
    responsable: body.responsableNombre
      ? {
          nombre: body.responsableNombre.trim(),
          dni: (body.responsableDni ?? "").trim(),
          telefono: (body.responsableTelefono ?? "").trim(),
        }
      : null,
    estado: "activo", // default de la columna `estado`
    fechaCreacion: ahora,
    fechaActualizacion: ahora,
  };

  memoria = [...memoria, creado];
  return { ...creado };
}

/**
 * Posibles duplicados: mismo nombre + apellido + fecha de nacimiento.
 *
 * NO es un error: es un aviso de UX y el alta se puede confirmar igual (la base
 * no tiene una restricción de unicidad por esos tres campos). Si no hay
 * coincidencias devuelve un array vacío.
 *
 * BACKEND: `return apiGetOpcional<AlumnoResponse[]>(\`${RUTA_POSIBLES_DUPLICADOS}?${params}\`, [])`
 * — opcional a propósito: si el chequeo falla, el alta no se bloquea.
 */
export async function posiblesDuplicados(
  criterio: PosiblesDuplicadosQuery,
): Promise<AlumnoResponse[]> {
  await demorar();
  const nombre = criterio.nombre.trim().toLowerCase();
  const apellido = criterio.apellido.trim().toLowerCase();
  return memoria
    .filter(
      (a) =>
        a.nombre.toLowerCase() === nombre &&
        a.apellido.toLowerCase() === apellido &&
        a.fechaNacimiento === criterio.fechaNacimiento,
    )
    .map((a) => ({ ...a }));
}


// ─── Interno: lo que el día de mañana hace el service del back ───────────

function exigirAlumno(id: number): AlumnoResponse {
  const alumno = memoria.find((a) => a.id === id);
  if (!alumno) {
    throw new ApiError("NO_ENCONTRADO", `No se encontró el alumno con id ${id}.`, undefined, 404);
  }
  return alumno;
}

/**
 * `uq_alumno_dni_activo`: el DNI es único entre alumnos ACTIVOS.
 * El mensaje incluye el legajo del alumno existente, como pide la HU.
 */
function exigirDniLibre(dni: string): void {
  const chocado = memoria.find((a) => a.estado === "activo" && a.dni === dni.trim());
  if (chocado) {
    throw new ApiError(
      "DNI_DUPLICADO",
      `Ya existe el alumno ${chocado.legajo} con ese DNI.`,
      "dni",
      409,
      // `datos` viaja para que la pantalla pueda ofrecer "Ver ficha" sin parsear
      // el mensaje.
      { id: chocado.id, legajo: chocado.legajo },
    );
  }
}

/** ck_alumno_responsable_menor: menor de 18 ⇒ los tres datos del responsable. */
function exigirResponsableSiEsMenor(body: CrearAlumnoBody): void {
  if (!esMenorDeEdad(body.fechaNacimiento)) return;
  const faltante = (
    [
      ["responsableNombre", body.responsableNombre],
      ["responsableDni", body.responsableDni],
      ["responsableTelefono", body.responsableTelefono],
    ] as const
  ).find(([, valor]) => !valor);

  if (faltante) {
    throw new ApiError(
      "RESPONSABLE_REQUERIDO",
      "Un alumno menor de edad necesita los datos del responsable.",
      faltante[0],
      422,
    );
  }
}


// ─── Copys de los estados vacíos ─────────────────────────────────────────

export const VACIO_COPY = {
  sinDatos: {
    title: "Todavía no hay alumnos registrados",
    description:
      "Registrá el primer alumno para poder empezar a reservarle clases de apoyo.",
    cta: "Nuevo alumno",
  },
  sinResultados: {
    title: "Ningún alumno coincide con la búsqueda",
    description:
      "Probá con otro nombre, apellido, DNI o legajo, o mostrá también los inactivos.",
    cta: "Borrar búsqueda",
  },
};
