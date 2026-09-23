// Módulos del sistema y qué rol ve cada uno (HU-SIS-01).
//
// Una sola tabla para dos consumidores que NO se pueden desincronizar:
//   · el Sidebar, que muestra los módulos del rol;
//   · el guard `RequiereSesion`, que decide si una URL escrita a mano se
//     responde con la pantalla o con "Acceso denegado".
//
// Si cada uno tuviera su lista, tarde o temprano el menú escondería algo que la
// ruta igual deja entrar (o al revés).
//
// ⚠️ Esto es UX, no seguridad. Esconder un ítem del menú no protege ningún
// dato: cualquiera lo saltea desde las devtools. Quien autoriza de verdad es el
// back — `requireSession()` corre en cada endpoint y registra el intento
// rechazado como `acceso_denegado` en `auditoria_sesion`.
//
// BACKEND: la matriz de permisos vive acá porque hoy no hay tabla que la
// describa. Si mañana se modela (ej. `rol_permiso`), este archivo pasa a
// leerla y la forma de las funciones no cambia.

import type { NombreRol } from "@/contracts/rol";

export type ModuloId =
  | "dashboard"
  | "sedes"
  | "turnos"
  | "calendario"
  | "alumnos"
  | "profesores"
  | "mi-ficha"
  | "materias"
  | "cobranzas"
  | "usuarios"
  | "reportes";

export type Modulo = {
  id: ModuloId;
  label: string;
  /** Ruta real, o `"#"` si el módulo todavía no se construyó. */
  href: string;
  /** Ligadura de Material Symbols Outlined. */
  icon: string;
  /** false ⇒ se muestra deshabilitado con el chip "Próx.". */
  construido: boolean;
};

/** El orden de este array es el orden del menú. */
export const MODULOS: Modulo[] = [
  { id: "dashboard", label: "Dashboard", href: "#", icon: "dashboard", construido: false },
  { id: "sedes", label: "Sedes", href: "#", icon: "location_city", construido: false },
  { id: "turnos", label: "Turnos y Agenda", href: "#", icon: "calendar_month", construido: false },
  {
    id: "calendario",
    label: "Calendario",
    href: "/calendario",
    icon: "calendar_view_month",
    construido: true,
  },
  { id: "alumnos", label: "Alumnos", href: "/alumnos", icon: "group", construido: true },
  { id: "profesores", label: "Cuerpo Docente", href: "/profesores", icon: "groups", construido: true },
  // Solo para el rol Profesor: su propia ficha en modo LECTURA. Todavía no
  // existe como pantalla, así que no navega a ningún lado (chip "Próx.").
  { id: "mi-ficha", label: "Mi ficha", href: "#", icon: "badge", construido: false },
  { id: "materias", label: "Materias", href: "/materias", icon: "menu_book", construido: true },
  { id: "cobranzas", label: "Cobranzas", href: "#", icon: "receipt_long", construido: false },
  { id: "usuarios", label: "Usuarios", href: "#", icon: "school", construido: false },
  { id: "reportes", label: "Reportes", href: "#", icon: "settings", construido: false },
];

/**
 * Qué módulos ve cada rol, según el criterio de aceptación de HU-SIS-01.
 *
 * Nota sobre **Profesor**: el criterio dice "su ficha en modo LECTURA", no el
 * ABM del cuerpo docente. Por eso NO tiene `profesores` (que es el listado con
 * alta y baja) sino `mi-ficha`.
 */
export const PERMISOS_POR_ROL: Record<NombreRol, ModuloId[]> = {
  // "Gerente: todos los módulos."
  Gerente: MODULOS.map((m) => m.id).filter((id) => id !== "mi-ficha"),
  // "Mesa de Entrada: alumnos, turnos, calendarios y pagos
  //  (sin usuarios ni indicadores de dirección)."
  "Mesa de Entrada": ["turnos", "calendario", "alumnos", "cobranzas"],
  // "Profesor: su calendario, su ficha en modo LECTURA, asistencia de sus
  //  clases e indicadores propios."
  Profesor: ["calendario", "turnos", "mi-ficha", "reportes"],
};

/** Los módulos que le corresponden al rol, en el orden del menú. */
export function modulosDe(rol: NombreRol): Modulo[] {
  const permitidos = PERMISOS_POR_ROL[rol] ?? [];
  return MODULOS.filter((m) => permitidos.includes(m.id));
}

export function puedeVer(rol: NombreRol, modulo: ModuloId): boolean {
  return (PERMISOS_POR_ROL[rol] ?? []).includes(modulo);
}

/**
 * El módulo al que pertenece una ruta. `undefined` para las rutas que no son de
 * un módulo (login, cambio de contraseña, recuperación): esas no pasan por el
 * control de permisos.
 */
export function moduloDeRuta(pathname: string): Modulo | undefined {
  return MODULOS.find((m) => m.construido && pathname.startsWith(m.href));
}

/**
 * A dónde mandar al usuario cuando entra, o cuando rebota de un módulo que no
 * le corresponde: el primer módulo **construido** que su rol puede ver.
 *
 * Un rol sin ningún módulo construido (hoy, Profesor) se queda sin destino:
 * devuelve `null` y la pantalla muestra el aviso en vez de redirigir a un
 * bucle.
 */
export function inicioDe(rol: NombreRol): Modulo | null {
  return modulosDe(rol).find((m) => m.construido) ?? null;
}
